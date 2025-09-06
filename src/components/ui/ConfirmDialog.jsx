import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle, Info, HelpCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from './Button';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText,
  cancelText,
  loading = false
}) {
  const { t } = useLanguage();

  const typeConfig = {
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-400',
      bgColor: 'bg-yellow-100',
      variant: 'warning'
    },
    danger: {
      icon: AlertTriangle,
      iconColor: 'text-red-400',
      bgColor: 'bg-red-100',
      variant: 'danger'
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-100',
      variant: 'primary'
    },
    question: {
      icon: HelpCircle,
      iconColor: 'text-gray-400',
      bgColor: 'bg-gray-100',
      variant: 'secondary'
    }
  };

  const config = typeConfig[type];
  const IconComponent = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <AlertDialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm transition-all duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-[50%] top-[50%] z-50 max-w-sm sm:max-w-md translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg sm:rounded-xl text-left overflow-hidden shadow-2xl transform transition-all duration-300 w-[90%] sm:w-full mx-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="bg-white px-3 pt-4 pb-3 sm:px-4 sm:pt-5 sm:pb-4 lg:p-6 lg:pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full ${config.bgColor} sm:mx-0 lg:h-10 lg:w-10`}>
                <IconComponent className={`h-5 w-5 sm:h-6 sm:w-6 ${config.iconColor}`} aria-hidden="true" />
              </div>
              <div className="mt-2 text-center sm:mt-0 sm:ml-3 lg:ml-4 sm:text-left min-w-0">
                <AlertDialog.Title className="text-base sm:text-lg leading-6 font-medium text-gray-900 truncate">
                  {title}
                </AlertDialog.Title>
                <div className="mt-1 sm:mt-2">
                  <AlertDialog.Description className="text-xs sm:text-sm text-gray-500 break-words">
                    {message}
                  </AlertDialog.Description>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-3 py-3 sm:px-4 sm:py-3 lg:px-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <AlertDialog.Cancel asChild>
              <Button
                type="button"
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                {cancelText || t('បោះបង់', 'Cancel')}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                type="button"
                disabled={loading}
                onClick={handleConfirm}
                variant={config.variant}
                size="sm"
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                {loading && (
                  <div className="animate-spin -ml-1 mr-2 h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full"></div>
                )}
                {confirmText || t('បន្ត', 'Continue')}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}