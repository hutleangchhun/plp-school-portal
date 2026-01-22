import React from 'react';
import { Download, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Reusable Export Progress Modal Component
 * Displays only a progress bar during export processing
 * Auto-closes on success or error (messages shown via toast)
 */
const ExportProgressModal = ({
  isOpen = false,
  progress = 0, // 0-100
  status = 'processing', // 'processing', 'success', 'error'
  onComplete = null
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const isProcessing = status === 'processing';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
        {/* Progress Bar */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-blue-600 animate-pulse" />
            <span className="text-sm font-medium text-gray-700">{t('loadingData', 'Exporting')}</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>

          <div className="text-center">
            <span className="text-xs font-semibold text-gray-900">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportProgressModal;
