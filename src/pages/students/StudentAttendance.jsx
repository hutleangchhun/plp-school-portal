import { useLanguage } from '../../contexts/LanguageContext';

export default function StudentAttendance() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {t('my-attendance') || 'My Attendance'}
          </h1>
          
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('attendance-coming-soon') || 'Attendance Feature Coming Soon'}
            </h3>
            <p className="text-gray-600">
              {t('attendance-description') || 'Here you will be able to view your attendance records, absences, and participation history.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}