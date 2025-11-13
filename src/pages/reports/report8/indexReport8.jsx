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
                  {t('no', '#')}
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
                  {t('age', 'អាយុ')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('ageInYears', 'អាយុជាឆ្នាំ')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('ageInYearsAndMonths', 'អាយុជាឆ្នាំនិងខែ')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('ageInMonths', 'អាយុជាខែ')}
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
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {student.age || ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {student.ageInYears || ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {student.ageInYearsAndMonths || ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {student.ageInMonths || ''}
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
