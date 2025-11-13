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
    sm: 'max-w-lg',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    full: 'w-[95vw] sm:w-[98vw] max-w-[1400px]'
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
          className={`fixed left-1/2 top-1/2 z-50 w-[95vw] sm:w-auto flex flex-col ${sizeClasses[size]} ${heightClasses[height]} ${roundedClass} ${borderClass} ${className} bg-white shadow-xl max-h-[90vh] sm:max-h-[95vh] overflow-hidden`}
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className={`flex-shrink-0 bg-white px-3 pt-3 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b border-gray-200 ${roundedClass}`}>
              <div className="flex items-center justify-between">
                {title && (
                  <Dialog.Title className="text-base sm:text-lg font-medium text-gray-900 pr-2">
                    {title}
                  </Dialog.Title>
                )}
                {showCloseButton && (
                  <Dialog.Close asChild>
                    <button
                      className="rounded-xl text-gray-400 hover:text-gray-600 duration-300 ease-in-out p-1"
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
          {/* Content - Scrollable */}
          <div className={`flex-1 min-h-0 overflow-y-auto bg-white px-3 pt-3 sm:px-6 sm:pt-6 ${footer && stickyFooter ? 'pb-3 sm:pb-4' : 'pb-3 sm:pb-6'}`}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className={`flex-shrink-0 ${roundedClass} bg-white px-3 py-3 sm:px-6 sm:pb-6 ${stickyFooter ? 'border-t border-gray-200' : ''}`}>
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}