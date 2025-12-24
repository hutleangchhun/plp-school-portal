import { createContext, useContext, useState, useCallback } from 'react';
import * as Toast from '@radix-ui/react-toast';
import ToastComponent from '../components/ui/Toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type,
      duration,
      isVisible: true
    };

    // Clear previous toasts and show only the new one
    setToasts([toast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message, duration) => {
    return addToast(message, 'success', duration);
  }, [addToast]);

  const showError = useCallback((message, duration) => {
    return addToast(message, 'error', duration);
  }, [addToast]);

  const showWarning = useCallback((message, duration) => {
    return addToast(message, 'warning', duration);
  }, [addToast]);

  const showInfo = useCallback((message, duration) => {
    return addToast(message, 'info', duration);
  }, [addToast]);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll
  };

  return (
    <ToastContext.Provider value={value}>
      <Toast.Provider swipeDirection="right">
        {children}
        
        {/* Render toasts */}
        {toasts.map((toast) => (
          <ToastComponent
            key={toast.id}
            type={toast.type}
            message={toast.message}
            isVisible={toast.isVisible}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
        
        <Toast.Viewport className="fixed bottom-5 right-0 left-0 sm:right-4 sm:left-auto z-50 w-full max-w-full sm:max-w-md space-y-2 px-4 sm:px-0" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
};