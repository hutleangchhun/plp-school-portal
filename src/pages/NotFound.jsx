import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import notFoundImage from '../assets/404.png';

const NotFound = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <img 
          src={notFoundImage} 
          alt="404 Not Found" 
          className="mx-auto mb-8 max-w-full h-auto"
        />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {t('pageNotFound', 'Page Not Found')}
        </h1>
        <p className="text-gray-600 mb-8">
          {t('thePageYouAreLookingForDoesNotExist', 'ទំព័រដែលអ្នកកំពុងស្វែងរកមិនអាចរកឃើញទេ។')}
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          {t('goBackToDashboard', 'ត្រលប់ទៅទំព័រផ្ទាំងគ្របគ្រង')}
        </button>
      </div>
    </div>
  );
};

export default NotFound;