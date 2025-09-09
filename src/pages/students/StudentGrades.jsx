import { useLanguage } from '../../contexts/LanguageContext';

export default function StudentGrades() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {t('my-grades') || 'My Grades'}
          </h1>
          
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('grades-coming-soon') || 'Grades Feature Coming Soon'}
            </h3>
            <p className="text-gray-600">
              {t('grades-description') || 'Here you will be able to view your academic performance, test scores, and assignment grades.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}