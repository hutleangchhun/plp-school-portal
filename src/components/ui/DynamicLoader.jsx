import React from 'react';
import { LoadingSpinner, LoadingDots, LoadingSkeleton } from './LoadingSpinner';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../utils/cn';

/**
 * DynamicLoader - A flexible loading component that can display different loading states
 *
 * Props:
 * - type: 'spinner' | 'dots' | 'skeleton' | 'overlay' | 'inline'
 * - size: 'xs' | 'sm' | 'default' | 'lg' | 'xl'
 * - variant: 'default' | 'white' | 'primary' | 'secondary'
 * - message: string (optional loading message)
 * - className: string (additional CSS classes)
 * - fullScreen: boolean (for overlay type)
 * - children: ReactNode (content to show alongside loader)
 * - lines: number (for skeleton type)
 */
const DynamicLoader = ({
  type = 'spinner',
  size = 'default',
  variant = 'default',
  message,
  className = '',
  fullScreen = false,
  children,
  lines = 3,
  ...props
}) => {
  const { t } = useLanguage();

  const renderLoader = () => {
    switch (type) {
      case 'spinner':
        return (
          <LoadingSpinner
            size={size}
            variant={variant}
            className={className}
            {...props}
          >
            {children || message}
          </LoadingSpinner>
        );

      case 'dots':
        return (
          <div className={cn('flex items-center space-x-2', className)}>
            <LoadingDots size={size} />
            {(children || message) && (
              <span className="text-sm text-gray-600">
                {children || message}
              </span>
            )}
          </div>
        );

      case 'skeleton':
        return (
          <LoadingSkeleton
            className={className}
            lines={lines}
          />
        );

      case 'overlay':
        return (
          <div className={cn(
            'flex items-center justify-center bg-white bg-opacity-80 rounded-lg',
            fullScreen ? 'fixed inset-0 z-50 bg-black bg-opacity-50' : 'absolute inset-0',
            className
          )}>
            <div className="flex flex-col items-center space-y-4">
              <LoadingSpinner size="lg" variant={variant} />
              {(children || message) && (
                <p className="text-sm text-gray-600 text-center">
                  {children || message || t('loading')}
                </p>
              )}
            </div>
          </div>
        );

      case 'inline':
        return (
          <div className={cn('flex items-center space-x-3 py-4', className)}>
            <LoadingSpinner size={size} variant={variant} />
            <div className="flex-1">
              {children || (
                <p className="text-sm text-gray-600">
                  {message || t('loading')}
                </p>
              )}
            </div>
          </div>
        );

      default:
        return (
          <LoadingSpinner
            size={size}
            variant={variant}
            className={className}
            {...props}
          >
            {children || message}
          </LoadingSpinner>
        );
    }
  };

  return renderLoader();
};

// Convenience components for common use cases
export const PageLoader = ({ message, className, ...props }) => (
  <div className={cn('flex items-center justify-center min-h-screen', className)}>
    <DynamicLoader
      type="spinner"
      size="lg"
      message={message}
      {...props}
    />
  </div>
);

export const ButtonLoader = ({ message, className, ...props }) => (
  <DynamicLoader
    type="spinner"
    size="sm"
    message={message}
    className={cn('inline-flex items-center space-x-2', className)}
    {...props}
  />
);

export const TableLoader = ({ message, className, ...props }) => (
  <DynamicLoader
    type="skeleton"
    lines={5}
    className={cn('w-full', className)}
    {...props}
  />
);

export const CardLoader = ({ message, className, ...props }) => (
  <div className={cn('bg-white rounded-lg border p-6', className)}>
    <DynamicLoader
      type="skeleton"
      lines={4}
      {...props}
    />
  </div>
);

export default DynamicLoader;