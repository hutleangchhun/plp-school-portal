import React from 'react';
import { useLoading } from '../../contexts/LoadingContext';
import { useLanguage } from '../../contexts/LanguageContext';

const GlobalLoadingOverlay = () => {
  const { isGlobalLoading, loadingMessage } = useLoading();
  const { t } = useLanguage();

  if (!isGlobalLoading) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      style={{ 
        willChange: 'transform', 
        transform: 'translateZ(0)' 
      }}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center min-w-[200px]">
        {/* Loading Spinner */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        
        {/* Loading Message - Uses Language Context */}
        <div className="text-center">
          <p className="text-gray-700 font-medium">
            {loadingMessage ? loadingMessage : t('loading')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GlobalLoadingOverlay;