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
  className = '',
  footer = null,
  stickyFooter = false
}) {
  const { t } = useLanguage();

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-7xl',
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
  const borderClass = 'border border-gray-200';
  const roundedClass = 'rounded-lg';

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay 
          className="fixed inset-0 z-50 bg-gray-500/75"
          onClick={closeOnOverlayClick ? onClose : undefined}
        />
        
        <Dialog.Content 
          className={`fixed left-1/2 top-1/2 z-50 w-full flex flex-col ${sizeClasses[size]} ${heightClasses[height]} ${roundedClass} ${borderClass} ${className} bg-white shadow-xl`}
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className={`flex-shrink-0 bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200 ${roundedClass}`}>
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
          <Dialog.Description className="sr-only"></Dialog.Description>
          {/* Content */}
          <div className={`flex-1 overflow-auto bg-white px-4 pt-5 sm:p-6 ${footer && stickyFooter ? 'pb-4' : 'pb-4'}`}>
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className={`flex-shrink-0 ${roundedClass} bg-white px-4 py-4 sm:px-6 sm:pb-6 ${stickyFooter ? 'border-t border-gray-200' : ''}`}>
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}