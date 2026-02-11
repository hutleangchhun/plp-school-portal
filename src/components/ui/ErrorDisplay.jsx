import React from 'react';
import { X, RefreshCw, Wifi, Server, AlertTriangle, Lock, Ban, FileQuestion, Clock, Timer } from 'lucide-react';
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

  // Get HTTP status code from error object
  const statusCode = error.statusCode || error.status || error.response?.status;

  const getErrorIcon = () => {
    // Handle specific HTTP status codes first
    if (statusCode) {
      switch (statusCode) {
        case 401:
          return <Lock className="h-10 w-10 text-orange-500" />;
        case 403:
          return <Ban className="h-10 w-10 text-red-500" />;
        case 404:
          return <FileQuestion className="h-10 w-10 text-blue-500" />;
        case 408:
        case 504:
          return <Clock className="h-10 w-10 text-yellow-500" />;
        case 429:
          return <Timer className="h-10 w-10 text-orange-500" />;
        case 500:
        case 502:
        case 503:
          return <Server className="h-10 w-10 text-red-500" />;
        default:
          break;
      }
    }

    // Fallback to error type
    switch (error.type) {
      case 'network':
        return <Wifi className="h-10 w-10 text-red-500" />;
      case 'server':
        return <Server className="h-10 w-10 text-red-500" />;
      case 'auth':
        return <AlertTriangle className="h-10 w-10 text-orange-500" />;
      default:
        return <X className="h-10 w-10 text-red-500" />;
    }
  };

  const getErrorTitle = () => {
    // Handle specific HTTP status codes first
    if (statusCode) {
      switch (statusCode) {
        case 400:
          return t('badRequest', 'Bad Request');
        case 401:
          return t('unauthorized', 'Unauthorized');
        case 403:
          return t('forbidden', 'Access Forbidden');
        case 404:
          return t('notFound', 'Not Found');
        case 408:
          return t('requestTimeout', 'Request Timeout');
        case 409:
          return t('conflict', 'Conflict');
        case 429:
          return t('tooManyRequests', 'Too Many Requests');
        case 500:
          return t('internalServerError', 'Internal Server Error');
        case 502:
          return t('badGateway', 'Bad Gateway');
        case 503:
          return t('serviceUnavailable', 'Service Unavailable');
        case 504:
          return t('gatewayTimeout', 'Gateway Timeout');
        default:
          return t('httpError', `Error ${statusCode}`);
      }
    }

    // Fallback to error type
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
    // Handle specific HTTP status codes first
    if (statusCode) {
      switch (statusCode) {
        case 400:
          return t('badRequestDesc', 'The request was invalid. Please check your input and try again.');
        case 401:
          return t('unauthorizedDesc', 'Your session has expired or you are not logged in. Please login again.');
        case 403:
          return t('forbiddenDesc', 'You do not have permission to access this resource.');
        case 404:
          return t('notFoundDesc', 'The requested resource could not be found.');
        case 408:
          return t('requestTimeoutDesc', 'The request took too long to complete. Please try again.');
        case 409:
          return t('conflictDesc', 'There was a conflict with the current state. Please refresh and try again.');
        case 429:
          return t('tooManyRequestsDesc', 'Too many requests. Please wait a moment and try again.');
        case 500:
          return t('internalServerErrorDesc', 'An internal server error occurred. Please try again later.');
        case 502:
          return t('badGatewayDesc', 'The server received an invalid response. Please try again later.');
        case 503:
          return t('serviceUnavailableDesc', 'The service is temporarily unavailable. Please try again later.');
        case 504:
          return t('gatewayTimeoutDesc', 'The server took too long to respond. Please try again.');
        default:
          return t('httpErrorDesc', 'An error occurred while processing your request.');
      }
    }

    // Fallback to error type
    switch (error.type) {
      case 'network':
        return t('networkErrorDesc', 'Please check your connection and try again.');
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