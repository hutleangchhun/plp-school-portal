import React from 'react';
import { cn } from '../../utils/cn';

const LoadingSpinner = ({ 
  size = 'default', 
  className = '',
  variant = 'default',
  children 
}) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const variantClasses = {
    default: 'border-gray-200 border-t-blue-600',
    white: 'border-white/20 border-t-white',
    primary: 'border-blue-200 border-t-blue-600',
    secondary: 'border-gray-300 border-t-gray-600'
  };

  if (children) {
    return (
      <div className="flex items-center space-x-2">
        <div className={cn(
          'animate-spin rounded-full border-2',
          sizeClasses[size],
          variantClasses[variant],
          className
        )} />
        <span className="text-sm">{children}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'animate-spin rounded-full border-2',
      sizeClasses[size],
      variantClasses[variant],
      className
    )} />
  );
};

const LoadingDots = ({ className = '', size = 'default' }) => {
  const sizeClasses = {
    sm: 'h-1 w-1',
    default: 'h-2 w-2',
    lg: 'h-3 w-3'
  };

  return (
    <div className={cn('flex space-x-1', className)}>
      <div className={cn(
        'bg-current rounded-full animate-bounce',
        sizeClasses[size]
      )} style={{ animationDelay: '0ms' }} />
      <div className={cn(
        'bg-current rounded-full animate-bounce',
        sizeClasses[size]
      )} style={{ animationDelay: '150ms' }} />
      <div className={cn(
        'bg-current rounded-full animate-bounce',
        sizeClasses[size]
      )} style={{ animationDelay: '300ms' }} />
    </div>
  );
};

const LoadingSkeleton = ({ className = '', lines = 3 }) => {
  return (
    <div className={cn('animate-pulse space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          {i === lines - 1 && (
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          )}
        </div>
      ))}
    </div>
  );
};

export { LoadingSpinner, LoadingDots, LoadingSkeleton };