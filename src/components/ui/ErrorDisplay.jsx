import React from 'react';
import { X, RefreshCw, Wifi, Server, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { useLanguage } from '../../contexts/LanguageContext';

const ErrorDisplay = ({ 
  error, 
  onRetry, 
  showRetry = true,
  size = 'default', 
  className = '' 
}) => {
  const { t } = useLanguage();

  if (!error) return null;

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return <Wifi className="h-10 w-10 text-red-500" />;
      case 'server':
        return <Server className="h-10 w-10 text-red-500" />;
      case 'auth':
        return <AlertTriangle className="h-10 w-10 text-red-500" />;
      default:
        return <X className="h-10 w-10 text-red-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case 'network':
        return t('networkError', 'Network Error');
      case 'server':
        return t('serverError', 'Server Error');
      case 'auth':
        return t('authenticationError', 'Authentication Error');
      default:
        return t('connectionError', 'Connection Error');
    }
  };

  const getErrorDescription = () => {
    switch (error.type) {
      case 'network':
        return t('networkErrorDesc', 'Please check your internet connection and try again.');
      case 'server':
        return t('serverErrorDesc', 'Server is temporarily unavailable. Please try again later.');
      case 'auth':
        return t('authErrorDesc', 'Your session has expired. Please login again.');
      default:
        return t('generalErrorDesc', 'Something went wrong. Please try again.');
    }
  };

  const sizeClasses = {
    sm: 'min-h-[200px]',
    default: 'min-h-[400px]',
    lg: 'min-h-[500px]'
  };

  return (
    <div className={`flex items-center justify-center p-6 ${sizeClasses[size]} ${className}`}>
      <div className="text-center space-y-4 max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          {getErrorIcon()}
        </div>
        <div className="space-y-2">
          <p className="text-lg font-medium text-red-600">
            {getErrorTitle()}
          </p>
          {error.message && (
            <p className="text-sm text-gray-600">
              {error.message}
            </p>
          )}
          <p className="text-xs text-gray-500">
            {getErrorDescription()}
          </p>
        </div>
        {showRetry && error.canRetry && onRetry && (
          <Button
            onClick={onRetry}
            variant="primary"
            size="sm"
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('retry', 'Try Again')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;