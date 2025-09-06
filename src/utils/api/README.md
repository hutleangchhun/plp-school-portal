# API Utils Documentation

This directory contains the restructured API utilities for the Teacher Portal application, following separation of concerns and best practices.

## Structure

```
src/utils/api/
├── config.js              # API configuration and endpoints
├── client.js               # Axios client setup and interceptors
├── services/
│   ├── authService.js      # Authentication API operations
│   └── userService.js      # User API operations
├── index.js                # Main exports
└── README.md               # This documentation
```

## Core Components

### 1. Configuration (`config.js`)
- **API_CONFIG**: Base URL, timeout, and default headers
- **ENDPOINTS**: All API endpoint definitions
- **HTTP_STATUS**: HTTP status code constants

### 2. API Client (`client.js`)
- **apiClient**: Configured axios instance
- **tokenManager**: Token management utilities
- **Interceptors**: Request/response interceptors for auth and error handling
- **handleApiResponse**: Response wrapper for consistent error handling

### 3. Authentication Service (`authService.js`)
- **authService.login()**: User authentication
- **authService.logout()**: User logout
- **authService.refreshToken()**: Token refresh
- **authService.isAuthenticated()**: Check auth status
- **authUtils**: Helper functions for auth operations

### 4. User Service (`userService.js`)
- **userService.getMyAccount()**: Fetch current user data
- **userService.updateProfile()**: Update user profile (PATCH - partial updates)
- **userService.replaceProfile()**: Replace user profile (PUT - complete replacement)
- **userUtils**: Helper functions for user data operations

## Usage Examples

### Authentication
```javascript
import { api, utils } from '../utils/api';

// Login
const response = await api.auth.login({ username, password });
if (response.success) {
  const { user } = response.data;
  // Handle successful login
}

// Logout
await api.auth.logout();

// Check auth status
const isAuth = api.auth.isAuthenticated();
```

### User Operations
```javascript
import { api, utils } from '../utils/api';

// Get user account
const response = await api.user.getMyAccount();
if (response.success) {
  const userData = response.data;
  utils.user.saveUserData(userData);
}

// Update profile (PATCH - partial updates)
const updateResponse = await api.user.updateProfile(formData);
if (updateResponse.success) {
  // Handle successful update
}

// Replace profile (PUT - complete replacement)  
const replaceResponse = await api.user.replaceProfile(completeUserData);

// Utility functions
const displayName = utils.user.getDisplayName(user);
const roleDisplay = utils.user.getRoleDisplay(user, t);
const genderDisplay = utils.user.getGenderDisplay(user, t);
```

### Error Handling
```javascript
import { api, utils } from '../utils/api';

try {
  const response = await api.auth.login(credentials);
  if (!response.success) {
    const errorMessage = utils.auth.getErrorMessage(response, t);
    setError(errorMessage);
  }
} catch (error) {
  const errorMessage = utils.auth.getErrorMessage(error, t);
  setError(errorMessage);
}
```

## Features

### Automatic Token Management
- Tokens are automatically added to requests
- Token expiration handling with automatic logout
- Secure token storage in localStorage

### Error Handling
- Centralized error handling with interceptors
- Localized error messages
- Automatic retry logic for certain errors

### Type Safety
- Consistent response format across all API calls
- Proper error typing and handling

### Internationalization
- Error messages support Khmer/English translation
- User data display utilities with translation support

## Response Format

All API service methods return a consistent response format:

```javascript
// Success response
{
  success: true,
  data: {...},        // API response data
  status: 200         // HTTP status code
}

// Error response
{
  success: false,
  error: "Error message",
  status: 400         // HTTP status code
}
```

## Configuration

### Environment Variables
You can override the default API configuration by setting environment variables:

- `VITE_API_BASE_URL`: Override the base API URL
- `VITE_API_TIMEOUT`: Override the request timeout

### Endpoints
All endpoints are defined in `config.js` and can be easily modified:

```javascript
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout'
  },
  USERS: {
    MY_ACCOUNT: '/users/my-account'
  }
};
```

## Best Practices

1. **Always use the service methods** instead of direct axios calls
2. **Handle both success and error cases** in components
3. **Use utility functions** for consistent data formatting
4. **Leverage the translation functions** for localized messages
5. **Don't store sensitive data** in localStorage beyond what's necessary

## Migration Guide

### Before (Old Pattern)
```javascript
// Old way
const response = await axios.post(`${API_BASE}/auth/login`, data, {
  headers: { Authorization: `Bearer ${token}` }
});
const user = response.data;
localStorage.setItem('user', JSON.stringify(user));
```

### After (New Pattern)
```javascript
// New way
const response = await api.auth.login(data);
if (response.success) {
  const { user } = response.data;
  // Token and user data are automatically handled
}
```

This restructured API system provides better maintainability, consistency, and error handling across the entire application.