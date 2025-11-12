import { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

/**
 * Report 8 Preview Component - BMI Report
 * Displays student BMI data in a table format
 */
export function Report8Preview({ data }) {
  const { t } = useLanguage();

  if (!data || data.length === 0) {
    return null; // Don't show anything when there are no records
  }

  // Calculate BMI statistics
  const bmiStats = data.reduce((acc, student) => {
    if (student.bmi && typeof student.bmi === 'number' && !isNaN(student.bmi)) {
      acc.totalWithBmi++;
      acc.totalBmi += student.bmi;
      
      // Count by category
      const category = student.bmiCategory || 'មិនបានកំណត់';
      acc.categories[category] = (acc.categories[category] || 0) + 1;
      
      // Track min/max
      if (student.bmi < acc.minBmi) acc.minBmi = student.bmi;
      if (student.bmi > acc.maxBmi) acc.maxBmi = student.bmi;
    } else {
      acc.noData++;
    }
    return acc;
  }, {
    totalWithBmi: 0,
    totalBmi: 0,
    noData: 0,
    categories: {},
    minBmi: Infinity,
    maxBmi: -Infinity
  });

  const averageBmi = bmiStats.totalWithBmi > 0 ? (bmiStats.totalBmi / bmiStats.totalWithBmi).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">{t('totalStudents', 'សិស្សទាំងអស់')}</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{data.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">{t('withBmiData', 'មានទិន្នន័យ BMI')}</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{bmiStats.totalWithBmi}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">{t('averageBmi', 'BMI ជាមធ្យម')}</p>
              <p className="text-3xl font-bold text-yellow-900 mt-2">{averageBmi}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">{t('noData', 'គ្មានទិន្នន័យ')}</p>
              <p className="text-3xl font-bold text-red-900 mt-2">{bmiStats.noData}</p>
            </div>
          </div>
        </div>
      </div>

      {/* BMI Categories Distribution */}
      {Object.keys(bmiStats.categories).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-base font-semibold text-gray-900 mb-4">{t('bmiCategoriesDistribution', 'ការចែកចាយតាមប្រភេទ BMI')}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(bmiStats.categories).map(([category, count]) => (
              <div key={category} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{category}</p>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500">
                  {((count / bmiStats.totalWithBmi) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-semibold text-gray-900">
            {t('bmiReportData', 'ទិន្នន័យរបាយការណ៍ BMI')}
          </h4>
          <span className="text-sm text-gray-500">
            {data.length} {t('records', 'កំណត់ត្រា')}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('no', 'លរ')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('studentNumber', 'លេខសិស្ស')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('khmerName', 'ឈ្មោះខ្មែរ')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('gender', 'ភេទ')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('class', 'ថ្នាក់')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('height', 'កម្ពស់ (cm)')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('weight', 'ទម្ងន់ (kg)')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bmi', 'BMI')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bmiCategory', 'ប្រភេទ BMI')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('recordDate', 'កាលបរិច្ឆេទកត់ត្រា')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.slice(0, 50).map((student, index) => (
                <tr key={student.userId || index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {student.studentNumber || ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {student.khmerName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {student.gender || ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {student.class?.name || ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {student.height ? `${student.height} cm` : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {student.weight ? `${student.weight} kg` : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {student.bmi && typeof student.bmi === 'number' ? student.bmi.toFixed(1) : ''}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      student.bmiCategory === 'ធម្មតា' ? 'bg-green-100 text-green-800' :
                      student.bmiCategory === 'ស្គម' ? 'bg-blue-100 text-blue-800' :
                      student.bmiCategory === 'លើសទម្ងន់' ? 'bg-yellow-100 text-yellow-800' :
                      student.bmiCategory === 'ធាត់' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {student.bmiCategory || 'មិនបានកំណត់'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {student.recordDate ? new Date(student.recordDate).toLocaleDateString('km-KH') : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {data.length > 50 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            {t('showingRecords', `បង្ហាញ 50 ក្នុងចំណោម ${data.length} កំណត់ត្រា។ នាំចេញទាំងអស់ដើម្បីមើលទិន្នន័យទាំងអស់។`)}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Custom hook for Report 8 data (BMI Report)
 * This is a placeholder for future use if needed
 */
export function useReport8Data(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // This hook can be expanded in the future if needed
  // For now, the main Reports component handles the data fetching

  return {
    data,
    loading,
    error,
    refetch: () => {
      // Placeholder for refetch functionality
    }
  };
}
