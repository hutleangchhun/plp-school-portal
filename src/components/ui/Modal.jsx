import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  height = 'auto',
  rounded = true,
  showBorder = false,
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = ''
}) {
  const { t } = useLanguage();

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-full'
  };

  const heightClasses = {
    auto: '',
    sm: 'max-h-96',
    md: 'max-h-[32rem]',
    lg: 'max-h-[40rem]',
    xl: 'max-h-[48rem]',
    '2xl': 'max-h-[56rem]',
    full: 'max-h-[90vh]'
  };

  // Dynamic classes based on props
  const borderClass = showBorder || rounded ? 'border-1 border-gray-100' : 'border border-gray-100';
  const roundedClass = rounded ? 'rounded-xl' : 'rounded-xl';

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay 
          className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onClick={closeOnOverlayClick ? onClose : undefined}
        />
        
        <Dialog.Content 
          className={`fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] ${roundedClass} ${borderClass} text-left shadow-xl transform transition-all w-full flex flex-col ${sizeClasses[size]} ${heightClasses[height]} ${className} data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]`}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex-shrink-0 rounded-t-xl bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                {title && (
                  <Dialog.Title className="text-lg font-medium text-gray-900">
                    {title}
                  </Dialog.Title>
                )}
                {showCloseButton && (
                  <Dialog.Close asChild>
                    <button
                      className="rounded-xl text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 p-1"
                      aria-label={t('បិទ', 'Close')}
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </Dialog.Close>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-auto bg-white px-4 pt-5 pb-4 sm:p-6 rounded-b-xl">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}