import { Construction, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function PlaceholderPage({ 
  title, 
  description, 
  icon: Icon = Construction,
  showBackButton = true 
}) {
  const { t } = useLanguage();

  return (
    <div className="flex-1 bg-gray-50 min-h-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {showBackButton && (
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToDashboard') || 'Back to Dashboard'}
          </Link>
        )}

        <div className="text-center">
          <div className="mx-auto h-24 w-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
            <Icon className="h-12 w-12 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {title || t('comingSoon') || 'Coming Soon'}
          </h1>
          
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            {description || t('pageUnderDevelopment') || 'This page is currently under development. We\'re working hard to bring you new features.'}
          </p>

          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <div className="flex items-center justify-center mb-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              {t('stayTuned') || 'Stay tuned for updates!'}
            </p>
          </div>

          <div className="mt-8">
            <Link
              to="/dashboard"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
            >
              {t('returnToDashboard') || 'Return to Dashboard'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}