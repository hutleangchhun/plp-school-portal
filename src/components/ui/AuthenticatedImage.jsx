import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/api/client';

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

        const fetchImage = async () => {
            try {
                setLoading(true);
                setError(false);
                const response = await apiClient.get(src, {
                    responseType: 'blob'
                });

                if (isMounted) {
                    // apiClient interceptor already unwraps response.data
                    const blob = response;

                    // Check if it's an SVG or text disguised as a blob
                    if (blob && (blob.type.includes('svg') || blob.type.includes('text') || blob.type === 'application/octet-stream')) {
                        try {
                            const text = await blob.text();

                            // It's genuinely an SVG string returned
                            if (text.trim().startsWith('<svg') || text.includes('xmlns=')) {
                                const encodedSvg = encodeURIComponent(text.trim());
                                if (isMounted) setImageSrc(`data:image/svg+xml;charset=utf-8,${encodedSvg}`);
                                return;
                            }
                        } catch (e) {
                            console.warn('Failed to parse potential SVG inside AuthenticatedImage, falling back to blob.', e);
                        }
                    }

                    if (isMounted) {
                        objectUrl = URL.createObjectURL(blob);
                        setImageSrc(objectUrl);
                    }
                }
            } catch (err) {
                console.error('Failed to load authenticated image:', err);
                if (isMounted) {
                    setError(true);
                    // Do NOT call onError(err) here because the parent component expects a React SyntheticEvent from an <img> tag (e.target.style...)
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchImage();

        return () => {
            isMounted = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [src, onError]);

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
