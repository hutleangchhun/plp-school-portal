import React from 'react';
import { Download, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Reusable Export Progress Modal Component
 * Displays export progress with a progress bar and status messages
 * No close button to prevent user interruption during export
 */
const ExportProgressModal = ({
  isOpen = false,
  title = 'Exporting Data',
  message = 'Processing your export request...',
  progress = 0, // 0-100
  status = 'processing', // 'processing', 'success', 'error'
  errorMessage = null,
  totalItems = 0,
  processedItems = 0,
  showItemCount = true,
  icon: IconComponent = Download,
  onComplete = null
}) => {
  if (!isOpen) return null;

  const isProcessing = status === 'processing';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  const displayMessage = isError && errorMessage ? errorMessage : message;
  const displayTitle = isSuccess ? 'Export Successful!' : isError ? 'Export Failed' : title;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {isSuccess && (
              <CheckCircle className="h-6 w-6 text-green-500" />
            )}
            {isError && (
              <AlertCircle className="h-6 w-6 text-red-500" />
            )}
            {isProcessing && (
              <IconComponent className="h-6 w-6 text-blue-600 animate-pulse" />
            )}
            <h3 className={`text-lg font-semibold ${
              isSuccess ? 'text-green-900' : isError ? 'text-red-900' : 'text-gray-900'
            }`}>
              {displayTitle}
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* Message */}
          <p className={`text-sm mb-4 ${
            isSuccess ? 'text-green-700' : isError ? 'text-red-700' : 'text-gray-600'
          }`}>
            {displayMessage}
          </p>

          {/* Item Count */}
          {showItemCount && totalItems > 0 && (
            <div className="mb-4 text-sm text-gray-600">
              <p>Processed: <span className="font-semibold">{processedItems}</span> of <span className="font-semibold">{totalItems}</span> items</p>
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">Progress</span>
                <span className="text-xs font-semibold text-gray-900">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-green-800">
                Your export has been completed successfully and is ready for download.
              </p>
            </div>
          )}

          {/* Error Message */}
          {isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-red-800">
                {errorMessage || 'An error occurred during export. Please try again.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer - Only show on success or error */}
        {!isProcessing && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onComplete}
              className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isSuccess
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {isSuccess ? 'Close' : 'Retry'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportProgressModal;
