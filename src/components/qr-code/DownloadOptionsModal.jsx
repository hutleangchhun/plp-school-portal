import React, { useState } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Download, FileText, Images } from 'lucide-react';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export default function DownloadOptionsModal({
  isOpen,
  onClose,
  qrCodes,
  cardType,
  t,
  onDownloadQueued,
  onDownloadPDF,
  onDownloadSingle
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null);

  const handleDownloadSingle = async () => {
    setIsLoading(true);
    setLoadingType('single');
    try {
      await onDownloadSingle();
      // Add a small delay before closing to ensure toast shows
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsLoading(false);
      setLoadingType(null);
      onClose();
    }
  };

  const handleDownloadQueued = async () => {
    setIsLoading(true);
    setLoadingType('queued');
    try {
      await onDownloadQueued();
      // Add a small delay before closing to ensure toast shows
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsLoading(false);
      setLoadingType(null);
      onClose();
    }
  };

  const handleDownloadPDF = async () => {
    setIsLoading(true);
    setLoadingType('pdf');
    try {
      await onDownloadPDF();
      // Add a small delay before closing to ensure toast shows
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsLoading(false);
      setLoadingType(null);
      onClose();
    }
  };

  return (
    <AlertDialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm rounded-lg" />
        <AlertDialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-w-sm sm:max-w-md w-[90%] sm:w-full bg-white rounded-lg border border-gray-200 shadow-2xl"
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          <div className="bg-white px-3 pt-4 pb-3 sm:px-4 sm:pt-5 sm:pb-4 lg:p-6 lg:pb-4 rounded-t-lg">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-100 sm:mx-0">
                <Download className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="mt-2 text-center sm:mt-0 sm:ml-3 lg:ml-4 sm:text-left min-w-0">
                <AlertDialog.Title className="text-base sm:text-lg leading-6 font-medium text-gray-900">
                  {t('downloadQRCodes', 'Download QR Codes')}
                </AlertDialog.Title>
                <div className="mt-1 sm:mt-2">
                  <AlertDialog.Description className="text-xs sm:text-sm text-gray-500">
                    {t('selectDownloadOption', 'Select how you want to download the QR codes')}
                  </AlertDialog.Description>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-3 py-4 sm:px-4 sm:py-4 lg:px-6 space-y-3 rounded-b-lg">
            {/* Option 1: Download Current Page One by One */}
            <Button
              type="button"
              disabled={isLoading}
              onClick={handleDownloadSingle}
              variant="outline"
              size="lg"
              className="w-full justify-start"
            >
              {isLoading && loadingType === 'single' ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Images className="h-4 w-4 mr-2" />
              )}
              <div className="text-left">
                <div className="font-medium text-xs sm:text-sm">
                  {t('downloadCurrent', 'Download Current Page')}
                </div>
              </div>
            </Button>

            {/* Option 2: Download All with Queue */}
            <Button
              type="button"
              disabled={isLoading}
              onClick={handleDownloadQueued}
              variant="outline"
              size="lg"
              className="w-full justify-start"
            >
              {isLoading && loadingType === 'queued' ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Images className="h-4 w-4 mr-2" />
              )}
              <div className="text-left">
                <div className="font-medium text-xs sm:text-sm">
                  {t('downloadAllQueued', 'Download All (Queued)')}
                </div>
              </div>
            </Button>

            {/* Option 3: Download All as PDF */}
            <Button
              type="button"
              disabled={isLoading}
              onClick={handleDownloadPDF}
              variant="outline"
              size="lg"
              className="w-full justify-start"
            >
              {isLoading && loadingType === 'pdf' ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              <div className="text-left">
                <div className="font-medium text-xs sm:text-sm">
                  {t('downloadAllPDF', 'Download as PDF')}
                </div>
              </div>
            </Button>

            {/* Cancel Button */}
            <AlertDialog.Cancel asChild>
              <Button
                type="button"
                disabled={isLoading}
                variant="danger"
                size="sm"
                className="w-full text-xs sm:text-sm"
              >
                {t('cancel', 'Cancel')}
              </Button>
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
