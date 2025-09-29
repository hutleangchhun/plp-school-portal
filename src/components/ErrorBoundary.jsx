import React from 'react';
import ErrorDisplay from './ui/ErrorDisplay';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true, 
      error: {
        message: 'An unexpected error occurred',
        type: 'general',
        canRetry: true
      }
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorDisplay 
          error={this.state.error} 
          onRetry={this.handleRetry}
          size="lg"
          className="min-h-screen bg-gray-50"
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;