import React from 'react';
import { RefreshCw, FileText, ShieldCheck, CloudUpload } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';

/**
 * Reusable Export Progress Modal Component
 * Displays progress and details of background export jobs
 */
const ExportProgressModal = ({
  isOpen = false,
  progress = 0, // 0-100
  status = 'processing', // 'processing', 'success', 'error'
  fileName = 'Data_Export.xlsx',
  onClose = () => { },
  onCancel = () => { },
  onRunInBackground = () => { }
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const isProcessing = status === 'processing';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnOverlayClick={false}
      className="p-2 sm:p-4 rounded-2xl"
    >
      <div className="flex flex-col items-center text-center space-y-6 pt-4">
        {/* Icon Header */}
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-2">
          <RefreshCw className={`h-8 w-8 text-blue-600 ${isProcessing ? 'animate-spin' : ''}`} />
        </div>

        {/* Texts */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-900">
            {t('exportingYourData', 'Exporting Your Data')}
          </h3>
          <p className="text-sm text-gray-500 max-w-[280px] mx-auto">
            {t('exportingDesc', 'This may take a moment depending on the file size.')}
          </p>
        </div>

        {/* Progress Section */}
        <div className="w-full space-y-2 pt-2">
          <div className="flex justify-between items-end px-1">
            <span className="text-sm font-semibold text-gray-700">
              {progress}% {t('complete', 'Complete')}
            </span>
            <span className="text-xs font-medium text-gray-400">
              {/* Fake estimation placeholder, ideally driven by real time updates */}
              {progress < 100 ? t('estimatedTime', 'Estimated: 1m left') : t('finishing', 'Finishing...')}
            </span>
          </div>

          <div className="w-full bg-blue-100/50 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Currently Processing Card */}
        <div className="w-full bg-gray-50/80 border border-gray-100 rounded-xl p-4 flex flex-col items-start text-left mt-2">
          <div className="flex gap-3 w-full items-center">
            <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                {t('currentlyProcessing', 'Currently Processing')}
              </span>
              <span className="text-sm font-semibold text-gray-800 truncate max-w-[200px]" title={fileName}>
                {fileName}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full space-y-2 pt-2">
          <Button
            variant="primary"
            fullWidth
            onClick={onRunInBackground}
            disabled={!isProcessing}
            className="py-6 rounded-xl font-semibold shadow-md shadow-blue-500/20"
          >
            {t('runInBackground', 'Run in Background')}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={onCancel}
            disabled={!isProcessing}
            className="text-gray-500 hover:text-gray-700 font-medium disabled:opacity-50"
          >
            {t('cancelExport', 'Cancel Export')}
          </Button>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-4 pt-4 text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-widest w-full border-t border-gray-50 mt-4">
          <span className="flex items-center gap-1.5"><CloudUpload className="h-3 w-3" /> SECURE TRANSFER</span>
          <span className="text-gray-300">•</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> AUTO-SAVE</span>
        </div>
      </div>
    </Modal>
  );
};

export default ExportProgressModal;
