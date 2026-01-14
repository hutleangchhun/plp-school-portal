/**
 * HTTPS Response Handler
 * Utilities for handling HTTPS/HTTP requests with fallback mechanisms
 */

/**
 * Configuration for HTTPS handling
 */
const getDynamicConfig = () => {
  // 1. Local Development
  if (import.meta.env.MODE === 'development') {
    return { api: 'http://localhost:8080/api/v1', static: 'http://localhost:8080' };
  }

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

  // 2. Physical Server
  if (hostname === 'plp-sms.moeys.gov.kh' || hostname === '192.168.155.89') {
    return { api: '/api', static: '' };
  }

  // 3. Localhost in Production build
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { api: 'http://localhost:8080/api/v1', static: 'http://localhost:8080' };
  }

  // 4. Public / Vercel
  return {
    api: import.meta.env.VITE_API_URL || 'https://plp-api.moeys.gov.kh/api/v1',
    static: import.meta.env.VITE_STATIC_BASE_URL || 'https://plp-api.moeys.gov.kh'
  };
};

const dynamicConfig = getDynamicConfig();

export const HttpsConfig = {
  // Base URLs - Production API
  apiUrls: {
    primary: dynamicConfig.api,
    fallback: dynamicConfig.api,
    static: {
      primary: dynamicConfig.static,
      fallback: dynamicConfig.static
    }
  },

  // Timeout settings
  timeouts: {
    connection: 10000, // 10 seconds
    response: 30000    // 30 seconds
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    delay: 1000, // 1 second
    backoff: 1.5 // Exponential backoff multiplier
  },

  // SSL/TLS settings
  ssl: {
    rejectUnauthorized: false, // For development with self-signed certificates
    checkServerIdentity: false
  }
};

/**
 * Enhanced fetch wrapper with HTTPS fallback
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {boolean} useHttpsFallback - Whether to fallback to HTTP if HTTPS fails
 * @returns {Promise<Response>} - Fetch response
 */
export const securityAwareFetch = async (url, options = {}, useHttpsFallback = true) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    HttpsConfig.timeouts.connection
  );

  const fetchOptions = {
    ...options,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  try {
    // First attempt: Try the original URL
    clearTimeout(timeoutId);
    const response = await fetch(url, fetchOptions);

    if (response.ok) {
      return response;
    }

    // If response is not ok, throw error to trigger fallback
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  } catch (error) {
    clearTimeout(timeoutId);

    // If HTTPS failed and fallback is enabled, try HTTP
    if (useHttpsFallback && url.startsWith('https://')) {
      try {
        const httpUrl = url.replace('https://', 'http://');
        console.warn(`HTTPS request failed, falling back to HTTP: ${httpUrl}`);

        const fallbackController = new AbortController();
        const fallbackTimeoutId = setTimeout(
          () => fallbackController.abort(),
          HttpsConfig.timeouts.connection
        );

        const fallbackResponse = await fetch(httpUrl, {
          ...fetchOptions,
          signal: fallbackController.signal
        });

        clearTimeout(fallbackTimeoutId);
        return fallbackResponse;

      } catch (fallbackError) {
        console.error('Both HTTPS and HTTP requests failed:', {
          httpsError: error.message,
          httpError: fallbackError.message
        });
        throw fallbackError;
      }
    }

    throw error;
  }
};

/**
 * Retry wrapper for failed requests
 * @param {Function} requestFunction - Function that returns a Promise
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {number} delay - Initial delay between retries
 * @returns {Promise} - Result of successful request
 */
export const retryRequest = async (
  requestFunction,
  maxAttempts = HttpsConfig.retry.maxAttempts,
  delay = HttpsConfig.retry.delay
) => {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await requestFunction();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        throw error;
      }

      // Wait before retry with exponential backoff
      const waitTime = delay * Math.pow(HttpsConfig.retry.backoff, attempt - 1);
      console.warn(`Request failed (attempt ${attempt}/${maxAttempts}), retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
};

/**
 * Get the best available base URL for API requests
 * @param {string} endpoint - API endpoint
 * @returns {Promise<string>} - Best available base URL
 */
export const getBestApiUrl = async (endpoint = '') => {
  const testUrl = async (baseUrl) => {
    try {
      const response = await securityAwareFetch(
        `${baseUrl}/api/health`,
        { method: 'GET' },
        false // Don't use fallback for health check
      );
      return response.ok;
    } catch {
      return false;
    }
  };

  // Test HTTPS first
  const httpsWorks = await testUrl(HttpsConfig.apiUrls.primary);
  if (httpsWorks) {
    return HttpsConfig.apiUrls.primary + endpoint;
  }

  // Fallback to HTTP
  console.warn('HTTPS API unavailable, using HTTP fallback');
  return HttpsConfig.apiUrls.fallback + endpoint;
};

/**
 * Enhanced API client with HTTPS handling
 */
export class SecureApiClient {
  constructor(baseUrl = null) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Set authorization header
   * @param {string} token - Auth token
   */
  setAuthToken(token) {
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }

  /**
   * Make a secure request with automatic fallback
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response data
   */
  async request(endpoint, options = {}) {
    const url = this.baseUrl ? `${this.baseUrl}${endpoint}` : await getBestApiUrl(endpoint);

    const requestOptions = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      }
    };

    return retryRequest(async () => {
      const response = await securityAwareFetch(url, requestOptions);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error ${response.status}: ${errorData}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }

      return response.text();
    });
  }

  // Convenience methods
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

/**
 * Static asset URL helper with HTTPS fallback
 * @param {string} assetPath - Path to static asset
 * @returns {string} - Full URL to asset
 */
export const getSecureAssetUrl = (assetPath) => {
  if (!assetPath) return '';

  // If already a full URL, return as-is
  if (assetPath.startsWith('http')) {
    return assetPath;
  }

  // Construct URL with current protocol preference
  const isSecureContext = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const baseUrl = isSecureContext ?
    HttpsConfig.apiUrls.static.primary :
    HttpsConfig.apiUrls.static.fallback;

  // Ensure path starts with /
  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;

  return `${baseUrl}${normalizedPath}`;
};

/**
 * Image loading with fallback support
 * @param {string} imageUrl - Image URL to load
 * @returns {Promise<string>} - Working image URL
 */
export const loadImageWithFallback = (imageUrl) => {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      reject(new Error('No image URL provided'));
      return;
    }

    const img = new Image();

    img.onload = () => resolve(imageUrl);

    img.onerror = () => {
      // If HTTPS image fails, try HTTP version
      if (imageUrl.startsWith('https://')) {
        const httpUrl = imageUrl.replace('https://', 'http://');
        const fallbackImg = new Image();

        fallbackImg.onload = () => resolve(httpUrl);
        fallbackImg.onerror = () => reject(new Error('Image failed to load'));
        fallbackImg.src = httpUrl;
      } else {
        reject(new Error('Image failed to load'));
      }
    };

    img.src = imageUrl;
  });
};

/**
 * Network status monitoring
 */
export class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];

    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  handleOnline() {
    this.isOnline = true;
    this.notifyListeners('online');
  }

  handleOffline() {
    this.isOnline = false;
    this.notifyListeners('offline');
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  notifyListeners(status) {
    this.listeners.forEach(callback => callback(status));
  }

  async checkConnectivity() {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const networkMonitor = new NetworkMonitor();

export default {
  securityAwareFetch,
  retryRequest,
  getBestApiUrl,
  SecureApiClient,
  getSecureAssetUrl,
  loadImageWithFallback,
  NetworkMonitor,
  networkMonitor,
  HttpsConfig
};