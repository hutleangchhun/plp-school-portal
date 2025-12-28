import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader2, User, Filter } from 'lucide-react';
import Modal from '../ui/Modal';
import { useLanguage } from '../../contexts/LanguageContext';

const BulkImportProgressTracker = ({
  isOpen,
  onClose,
  importResults = [],
  isProcessing = false,
  totalStudents = 0,
  processedCount = 0
}) => {
  const { t } = useLanguage();
  const [showFailedOnly, setShowFailedOnly] = useState(false);

  const successCount = importResults.filter(r => r.success).length;
  const failureCount = importResults.filter(r => !r.success).length;
  const progressPercentage = totalStudents > 0 ? (processedCount / totalStudents) * 100 : 0;

  const getStatusIcon = (result) => {
    if (result.processing) {
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    }
    if (result.success) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusText = (result) => {
    if (result.processing) {
      return <span className="text-blue-600 text-sm">{t('processing', 'កំពុងដំណើរការ...')}</span>;
    }
    if (result.success) {
      return <span className="text-green-600 text-sm font-medium">{t('success', 'ជោគជ័យ')}</span>;
    }
    return (
      <div>
        <span className="text-red-600 text-sm font-medium">{t('failed', 'បរាជ័យ')}</span>
        {result.error && (
          <p className="text-xs text-red-500 mt-1">{result.error}</p>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isProcessing ? undefined : onClose}
      title={
        <div className="flex items-center space-x-2">
          <User className="h-5 w-5 text-blue-600" />
          <span>{t('bulkImportProgress', 'ដំណើរការនាំចូលសិស្ស')}</span>
        </div>
      }
      size="lg"
      height="xl"
      closeOnOverlayClick={!isProcessing}
      showCloseButton={!isProcessing}
      footer={
        !isProcessing && (
          <div className="flex justify-between items-center w-full">
            <div className="flex space-x-4 text-sm">
              <span className="text-green-600 font-medium">
                {t('successful', 'ជោគជ័យ')}: {successCount}
              </span>
              <span className="text-red-600 font-medium">
                {t('failed', 'បរាជ័យ')}: {failureCount}
              </span>
              <span className="text-gray-600 font-medium">
                {t('total', 'សរុប')}: {totalStudents}
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {t('close', 'បិទ')}
            </button>
          </div>
        )
      }
      stickyFooter={true}
    >
      <div className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalStudents}</div>
            <div className="text-xs text-gray-600">{t('total', 'សរុប')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{successCount}</div>
            <div className="text-xs text-gray-600">{t('successful', 'ជោគជ័យ')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{failureCount}</div>
            <div className="text-xs text-gray-600">{t('failed', 'បរាជ័យ')}</div>
          </div>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {t('progress', 'ដំណើរការ')}: {processedCount} / {totalStudents}
              </span>
              <span className="text-sm font-medium text-blue-600">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Filter Button - Show only when processing is complete */}
        {!isProcessing && failureCount > 0 && (
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setShowFailedOnly(!showFailedOnly)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                showFailedOnly
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">
                {showFailedOnly
                  ? t('showingFailed', 'បង្ហាញដែលបរាជ័យ') + ` (${failureCount})`
                  : t('showAll', 'បង្ហាញទាំងអស់') + ` (${totalStudents})`}
              </span>
            </button>
          </div>
        )}

        {/* Import Results List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {importResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{t('noResultsYet', 'មិនទាន់មានលទ្ធផលនៅឡើយ')}</p>
            </div>
          ) : (
            importResults
              .filter(result => !showFailedOnly || !result.success)
              .map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    result.processing
                      ? 'bg-blue-50 border-blue-200'
                      : result.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getStatusIcon(result)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {result.studentName || t('unknownStudent', 'មិនស្គាល់ឈ្មោះ')}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {result.studentId && `ID: ${result.studentId}`}
                        {result.studentId && result.username && ' • '}
                        {result.username && `Username: ${result.username}`}
                      </p>
                    </div>
                  </div>
                  <div className="ml-3">
                    {getStatusText(result)}
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Processing Message */}
        {isProcessing && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-800">
                {t('pleaseWait', 'សូមរង់ចាំ...')} {t('importingStudents', 'កំពុងនាំចូលសិស្ស')}
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BulkImportProgressTracker;
