import React, { useState, useEffect } from 'react';
import getApiBaseUrl from '../../utils/api/config';

// Simple memory cache to prevent double-fetching on rapid unmount/remount cycles during React updates
const imageCache = new Map();
// Cache for pending requests to prevent concurrent duplicate fetches during mass renders
const inflightRequests = new Map();

export default function AuthenticatedImage({ src, alt, className, onError, ...props }) {
    const [imageSrc, setImageSrc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let objectUrl = null;
        let isMounted = true;

        if (!src) {
            setLoading(false);
            return;
        }

        // Return from cache immediately if we already fetched this exact image successfully
        if (imageCache.has(src)) {
            setImageSrc(imageCache.get(src));
            setLoading(false);
            return;
        }

        const loadContent = async () => {
            // Declare fetchUrl at async-function scope so `finally` can access it
            let fetchUrl = src;

            try {
                setLoading(true);
                setError(false);

                // Build a proper absolute/relative URL so native fetch doesn't get confused
                if (src.startsWith('/api/files/')) {
                    const baseUrl = getApiBaseUrl();
                    const hostUrl = baseUrl.replace(/\/api(\/v1)?$/, '');
                    fetchUrl = hostUrl ? `${hostUrl}${src}` : src;
                } else if (!src.startsWith('http')) {
                    const baseUrl = getApiBaseUrl();
                    fetchUrl = `${baseUrl}/${src.replace(/^\//, '')}`;
                }

                // If this URL is currently being fetched, wait for that promise instead of starting a new one
                if (inflightRequests.has(fetchUrl)) {
                    console.log('Deduplicating concurrent image request for:', fetchUrl);
                    const finalUrl = await inflightRequests.get(fetchUrl);
                    if (isMounted) {
                        setImageSrc(finalUrl);
                        setLoading(false);
                    }
                    return;
                }

                // Create a fetch promise and store it in the inflight map
                const fetchPromise = (async () => {
                    const token = localStorage.getItem('authToken');
                    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                    const response = await fetch(fetchUrl, { headers });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const blob = await response.blob();

                    // Check if it's an SVG or text disguised as a blob
                    if (blob && (blob.type.includes('svg') || blob.type.includes('text') || blob.type === 'application/octet-stream')) {
                        try {
                            const text = await blob.text();
                            // It's genuinely an SVG string returned
                            if (text.trim().startsWith('<svg') || text.includes('xmlns=')) {
                                const encodedSvg = encodeURIComponent(text.trim());
                                const finalUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
                                imageCache.set(src, finalUrl);
                                return finalUrl;
                            }
                        } catch (e) {
                            console.warn('Failed to parse potential SVG inside AuthenticatedImage, falling back to blob.', e);
                        }
                    }

                    const newObjectUrl = URL.createObjectURL(blob);
                    imageCache.set(src, newObjectUrl);
                    return newObjectUrl;
                })();

                // Register the promise to deduplicate future concurrent requests
                inflightRequests.set(fetchUrl, fetchPromise);

                // Wait for the result and apply it
                const finalUrl = await fetchPromise;

                if (isMounted) {
                    // Only keep track of the objectUrl if we generated one, for cleanup
                    if (finalUrl.startsWith('blob:')) objectUrl = finalUrl;
                    setImageSrc(finalUrl);
                }

            } catch (err) {
                console.error('Failed to load authenticated image:', err);
                if (isMounted) {
                    setError(true);
                }
            } finally {
                // Ensure we remove it from the inflight map so it doesn't get stuck if it fails
                inflightRequests.delete(fetchUrl);

                if (isMounted) setLoading(false);
            }
        };

        loadContent();

        return () => {
            isMounted = false;
            // Never revoke object URLs if we cache them globally!
            // if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [src]); // Removed onError from dependencies to prevent infinite loops when parent uses inline functions

    if (loading) {
        return (
            <div className={`flex items-center justify-center bg-gray-50 border-gray-200 animate-pulse ${className}`} {...props}>
                <span className="text-gray-400">...</span>
            </div>
        );
    }

    if (error || !imageSrc) {
        // If there's a fallback mechanism expecting 'display: none', allow onError to trigger it
        return (
            <img
                src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                alt="Error fallback"
                className={className}
                style={{ display: 'none' }}
                onError={(e) => {
                    if (onError) {
                        // Mock synthetic event to match expected pattern
                        const mockEvent = { target: e.target };
                        onError(mockEvent);
                    }
                }}
                {...props}
            />
        );
    }

    return <img src={imageSrc} alt={alt} className={className} onError={onError} {...props} />;
}
