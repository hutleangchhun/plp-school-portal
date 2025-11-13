import { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import Table from '../../../components/ui/Table';

/**
 * Report 8 Preview Component - BMI Report
 * Displays student BMI data in a table format
 */
export function Report8Preview({ data }) {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  if (!data || data.length === 0) {
    return null; // Don't show anything when there are no records
  }

  // Calculate pagination
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const pagination = {
    page: currentPage,
    pages: totalPages,
    total: data.length,
    limit: itemsPerPage
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Define table columns
  const columns = [
    {
      key: 'no',
      header: t('no', '#'),
      render: (_, index) => startIndex + index + 1,
      cellClassName: 'font-medium'
    },
    {
      key: 'khmerName',
      header: t('khmerName', 'ឈ្មោះខ្មែរ'),
      render: (student) => student.khmerName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || '',
      cellClassName: 'font-medium'
    },
    {
      key: 'gender',
      header: t('gender', 'ភេទ'),
      accessor: 'gender'
    },
    {
      key: 'class',
      header: t('class', 'ថ្នាក់'),
      render: (student) => student.class?.name || ''
    },
    {
      key: 'height',
      header: t('height', 'កម្ពស់ (cm)'),
      render: (student) => student.height ? `${student.height} cm` : ''
    },
    {
      key: 'weight',
      header: t('weight', 'ទម្ងន់ (kg)'),
      render: (student) => student.weight ? `${student.weight} kg` : ''
    },
    {
      key: 'bmi',
      header: t('bmi', 'BMI'),
      render: (student) => student.bmi && typeof student.bmi === 'number' ? student.bmi.toFixed(1) : '',
      cellClassName: 'font-medium'
    },
    {
      key: 'age',
      header: t('age', 'អាយុ'),
      accessor: 'age'
    },
    {
      key: 'ageInYears',
      header: t('ageInYears', 'អាយុជាឆ្នាំ'),
      accessor: 'ageInYears'
    },
    {
      key: 'ageInYearsAndMonths',
      header: t('ageInYearsAndMonths', 'អាយុជាឆ្នាំនិងខែ'),
      accessor: 'ageInYearsAndMonths'
    },
    {
      key: 'ageInMonths',
      header: t('ageInMonths', 'អាយុជាខែ'),
      accessor: 'ageInMonths'
    },
    {
      key: 'bmiCategory',
      header: t('bmiCategory', 'ប្រភេទ BMI'),
      render: (student) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          student.bmiCategory === 'ធម្មតា' ? 'bg-green-100 text-green-800' :
          student.bmiCategory === 'ស្គម' ? 'bg-blue-100 text-blue-800' :
          student.bmiCategory === 'លើសទម្ងន់' ? 'bg-yellow-100 text-yellow-800' :
          student.bmiCategory === 'ធាត់' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {student.bmiCategory || 'មិនបានកំណត់'}
        </span>
      )
    },
    {
      key: 'recordDate',
      header: t('recordDate', 'កាលបរិច្ឆេទកត់ត្រា'),
      render: (student) => student.recordDate ? new Date(student.recordDate).toLocaleDateString('km-KH') : ''
    }
  ];

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-gray-900">
          {t('bmiReportData', 'ទិន្នន័យរបាយការណ៍ BMI')}
        </h4>
        <span className="text-sm text-gray-500">
          {data.length} {t('records', 'កំណត់ត្រា')}
        </span>
      </div>

      {/* Data Table with Pagination */}
      <Table
        columns={columns}
        data={currentData}
        showPagination={true}
        pagination={pagination}
        onPageChange={handlePageChange}
        t={t}
        emptyMessage={t('noDataFound', 'រកមិនឃើញទិន្នន័យ')}
        emptyDescription={t('noStudentData', 'មិនមានទិន្នន័យសិស្សដើម្បីបង្ហាញ')}
        stickyHeader={true}
        dense={false}
        enableSort={true}
      />
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
