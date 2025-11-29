import { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';
import { getFullName } from '../../utils/usernameUtils';

export default function WelcomeAlert({ user, t, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onClose) onClose();
      }, 300); // Wait for fade out animation
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-4 w-full max-w-full sm:max-w-md z-40 pointer-events-none">
      <div className="pointer-events-auto">
        <div 
          className={`
            bg-blue-50 border border-blue-200 text-blue-800
            border rounded-lg shadow-lg p-3 sm:p-4 w-full
            transform transition-all duration-300 ease-in-out
            ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}
          `}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <User className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3 w-0 flex-1 pr-2">
              <p className="text-sm sm:text-base font-medium break-words">
                {t('ស្វាគមន៍', 'Welcome')}, <span className="font-semibold">{getFullName(user, user?.username || '')}</span>!
              </p>
              <p className="text-xs sm:text-sm text-blue-600 mt-1">
                {t('សារនេះនឹងបាត់បង់ក្នុងរយៈពេល ១០ វិនាទី', 'This message will disappear in 10 seconds')}
              </p>
            </div>
            <div className="ml-2 flex-shrink-0 flex">
              <button
                onClick={handleClose}
                className="rounded-full inline-flex text-blue-800 hover:bg-blue-200 hover:text-blue-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-50 focus:ring-blue-600 p-1 border border-transparent hover:border-blue-300"
                title={t('closeWelcomeMessage')}
                aria-label={t('closeWelcomeMessage')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}