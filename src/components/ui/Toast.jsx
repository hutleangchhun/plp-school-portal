import { useEffect } from 'react';
import * as Toast from '@radix-ui/react-toast';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ToastComponent({ 
  type = 'info', 
  message, 
  isVisible, 
  onClose, 
  duration = 5000
}) {
  const { t } = useLanguage();
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const typeConfig = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-400',
      textColor: 'text-green-800'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-400',
      textColor: 'text-red-800'
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-400',
      textColor: 'text-yellow-800'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-400',
      textColor: 'text-blue-800'
    }
  };

  const config = typeConfig[type];
  const IconComponent = config.icon;

  return (
    <Toast.Root
      open={isVisible}
      onOpenChange={(open) => !open && onClose()}
      duration={duration}
      className={`
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        border rounded-sm shadow-lg p-3 sm:p-4 w-full max-w-xs sm:max-w-md pointer-events-auto mx-2 sm:mx-0
        backdrop-blur-sm transition-all duration-500 ease-out
        data-[state=open]:animate-in data-[state=closed]:animate-out
        data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
        data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_300ms_ease-out]
        data-[swipe=end]:animate-out data-[swipe=end]:fade-out-80 data-[swipe=end]:slide-out-to-right-full
        data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=closed]:duration-300
        data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full data-[state=open]:duration-500
        hover:shadow-xl hover:scale-[1.02] hover:border-opacity-80
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <IconComponent className={`h-4 w-4 sm:h-5 sm:w-5 ${config.iconColor}`} />
        </div>
        <div className="ml-2 sm:ml-3 w-0 flex-1 pr-1 sm:pr-2">
          <Toast.Title className="text-xs sm:text-sm font-medium break-words leading-relaxed whitespace-pre-wrap">
            {message}
          </Toast.Title>
        </div>
        <div className="ml-1 sm:ml-2 flex-shrink-0 flex">
          <Toast.Close asChild>
            <button
              className={`rounded-full inline-flex ${config.textColor} hover:scale-150 hover:${config.iconColor} transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 p-0.5 sm:p-1 border border-transparent`}
              title={t('closeNotification')}
              aria-label={t('closeNotification')}
            >
              <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </Toast.Close>
        </div>
      </div>
    </Toast.Root>
  );
}