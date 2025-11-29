import { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import Table from '../../../components/ui/Table';
import { formatClassIdentifier } from '../../../utils/helpers';
import { getFullName } from '../../../utils/usernameUtils';

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
      key: 'Name',
      header: t('name', 'ឈ្មោះ'),
      render: (student) => getFullName(student, student.khmerName || ''),
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
      render: (student) => {
        if (student.class?.gradeLevel !== undefined && student.class?.gradeLevel !== null) {
          const rawGradeLevel = String(student.class.gradeLevel);
          const displayGradeLevel =
            rawGradeLevel === '0'
              ? t('grade0', 'Kindergarten')
              : rawGradeLevel;

          return `${t('class') || 'Class'} ${formatClassIdentifier(displayGradeLevel, student.class.section)}`;
        }

        return student.class?.name || '';
      }
    },
    {
      key: 'height',
      header: t('height', 'កម្ពស់ (cm)'),
      render: (student) => {
        const height = student.height_cm || student.height;
        return height ? `${parseFloat(height).toFixed(1)} cm` : '';
      }
    },
    {
      key: 'weight',
      header: t('weight', 'ទម្ងន់ (kg)'),
      render: (student) => {
        const weight = student.weight_kg || student.weight;
        return weight ? `${parseFloat(weight).toFixed(2)} kg` : '';
      }
    },
    {
      key: 'bmi',
      header: t('bmi', 'BMI'),
      render: (student) => student.bmi && typeof student.bmi === 'number' ? student.bmi.toFixed(1) : '',
      cellClassName: 'font-medium'
    },
    {
      key: 'bmiStatus',
      header: t('bmiStatus', 'ស្ថានភាព BMI'),
      render: (student) => {
        // Determine status based on sd_grade
        let status = 'unknown';
        let categoryKhmer = 'មិនបានកំណត់';

        if (student.sd_grade && typeof student.sd_grade.grade === 'number') {
          const currentGrade = student.sd_grade.grade;

          if (currentGrade <= -3) {
            status = 'thinness_grade_3';
            categoryKhmer = 'ស្គមខ្លាំង';
          } else if (currentGrade === -2) {
            status = 'thinness_grade_2';
            categoryKhmer = 'ស្គម';
          } else if (currentGrade === -1 || currentGrade === 0 || currentGrade === 1) {
            status = 'normal';
            categoryKhmer = 'ទម្ងន់ធម្មតា';
          } else if (currentGrade === 2) {
            status = 'overweight';
            categoryKhmer = 'លើសទម្ងន់';
          } else if (currentGrade >= 3) {
            status = 'obesity';
            categoryKhmer = 'ធាត់';
          }
        }

        const statusColor = {
          'thinness_grade_3': 'bg-purple-100 text-purple-800',
          'thinness_grade_2': 'bg-blue-100 text-blue-800',
          'normal': 'bg-green-100 text-green-800',
          'overweight': 'bg-yellow-100 text-yellow-800',
          'obesity': 'bg-red-100 text-red-800'
        };

        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor[status] || 'bg-gray-100 text-gray-800'}`}>
            {categoryKhmer}
          </span>
        );
      }
    },
    {
      key: 'sdGrade',
      header: t('sdGrade', 'មាត្រដ្ឋាន'),
      render: (student) => {
        if (!student.sd_grade) return '';
        const { grade, bmiAtGrade } = student.sd_grade;
        return `${grade}SD`;
      }
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
      key: 'recordDate',
      header: t('recordDate', 'កាលបរិច្ឆេទកត់ត្រា'),
      render: (student) => {
        const dateField = student.recorded_at || student.recordDate;
        return dateField ? new Date(dateField).toLocaleDateString('km-KH') : '';
      }
    }
  ];

  // Calculate BMI statistics
  const bmiStats = data.reduce((acc, record) => {
    if (record.bmi && typeof record.bmi === 'number' && !isNaN(record.bmi)) {
      acc.totalWithBmi++;
      acc.totalBmi += record.bmi;

      // Count by category
      const category = record.bmi_category || 'Undefined';
      acc.categories[category] = (acc.categories[category] || 0) + 1;

      // Track min/max
      if (record.bmi < acc.minBmi) acc.minBmi = record.bmi;
      if (record.bmi > acc.maxBmi) acc.maxBmi = record.bmi;
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
