import { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import Table from '../../../components/ui/Table';
import { formatClassIdentifier } from '../../../utils/helpers';
import { getFullName } from '../../../utils/usernameUtils';

/**
 * Report 8 Preview Component - BMI Report
 * Displays student BMI data in a table format
 */
export function Report8Preview({ data, serverPagination, onPageChange, limit = 10, onLimitChange }) {
  const { t } = useLanguage();
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const itemsPerPage = limit;

  if (!data || !Array.isArray(data) || data.length === 0) {
    if (data && !Array.isArray(data)) {
        console.error('Report8Preview received invalid data (not an array):', data);
    }
    return null; // Don't show anything when there are no records
  }

  // Determine if we are using server-side pagination or local pagination
  const isServerSide = !!serverPagination;

  // Pagination logic
  let pagination;
  let currentData;
  let startIndex;

  if (isServerSide) {
    // Server-side pagination
    pagination = serverPagination;
    currentData = data; // Data is already paginated from server
    startIndex = (serverPagination.page - 1) * serverPagination.limit;
  } else {
    // Client-side pagination (legacy fallback)
    const totalPages = Math.ceil(data.length / itemsPerPage);
    startIndex = (localCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    currentData = data.slice(startIndex, endIndex);

    pagination = {
      page: localCurrentPage,
      pages: totalPages,
      total: data.length,
      limit: itemsPerPage
    };
  }

  const handlePageChange = (page) => {
    if (isServerSide) {
      if (onPageChange) {
        onPageChange(page);
      }
    } else {
      setLocalCurrentPage(page);
    }
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
      render: (student) => {
          const gender = student.gender;
          if (gender === 'MALE' || gender === 'Male' || gender === 'M') return 'ប្រុស';
          if (gender === 'FEMALE' || gender === 'Female' || gender === 'F') return 'ស្រី';
          return gender;
      }
    },
    {
      key: 'class',
      header: t('class', 'ថ្នាក់'),
      render: (student) => {
        // Handle flattened structure or nested class object
        const gradeLevel = student.gradeLevel ?? student.class?.gradeLevel;
        const section = student.section ?? student.class?.section;
        const className = student.className ?? student.class?.name;

        if (gradeLevel !== undefined && gradeLevel !== null) {
          const rawGradeLevel = String(gradeLevel);
          const displayGradeLevel =
            rawGradeLevel === '0'
              ? t('grade0', 'Kindergarten')
              : rawGradeLevel;

          return `${t('class') || 'Class'} ${formatClassIdentifier(displayGradeLevel, section)}`;
        }

        return className || '';
      }
    },
    {
      key: 'height',
      header: t('height', 'កម្ពស់ (cm)'),
      render: (student) => {
        const height = student.heightCm || student.height_cm || student.height;
        return height ? `${parseFloat(height).toFixed(1)} cm` : '';
      }
    },
    {
      key: 'weight',
      header: t('weight', 'ទម្ងន់ (kg)'),
      render: (student) => {
        const weight = student.weightKg || student.weight_kg || student.weight;
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
        // Try to get status from new API fields first
        let status = 'unknown';
        let categoryKhmer = student.bmiStatus || 'មិនបានកំណត់';
        
        // Map English status to Khmer if needed (though API seems to return English text like "Normal Weight (-1SD to 1SD)")
        // Basic mapping based on keywords if the API returns English
        const statusStr = (student.bmiStatus || '').toLowerCase();
        
        if (statusStr.includes('severe thinness') || statusStr.includes('-3sd')) {
            status = 'thinness_grade_3';
            categoryKhmer = 'ស្គមខ្លាំង';
        } else if (statusStr.includes('thinness') || statusStr.includes('-2sd')) {
             status = 'thinness_grade_2';
             categoryKhmer = 'ស្គម';
        } else if (statusStr.includes('normal') || statusStr.includes('1sd')) {
            status = 'normal';
            categoryKhmer = 'ទម្ងន់ធម្មតា';
        } else if (statusStr.includes('overweight') || statusStr.includes('2sd')) {
            status = 'overweight';
            categoryKhmer = 'លើសទម្ងន់';
        } else if (statusStr.includes('obesity') || statusStr.includes('3sd')) {
            status = 'obesity';
            categoryKhmer = 'ធាត់';
        } else {
             // Fallback to SD grade logic if bmiStatus string parsing failed or wasn't present
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
            } else if (student.zScore !== null && student.zScore !== undefined) {
                 // Fallback to zScore if available
                 const z = student.zScore;
                 if (z <= -3) { status = 'thinness_grade_3'; categoryKhmer = 'ស្គមខ្លាំង'; }
                 else if (z <= -2) { status = 'thinness_grade_2'; categoryKhmer = 'ស្គម'; }
                 else if (z <= 1) { status = 'normal'; categoryKhmer = 'ទម្ងន់ធម្មតា'; }
                 else if (z <= 2) { status = 'overweight'; categoryKhmer = 'លើសទម្ងន់'; }
                 else { status = 'obesity'; categoryKhmer = 'ធាត់'; }
            }
        }

        const statusColor = {
          'thinness_grade_3': 'bg-purple-100 text-purple-800',
          'thinness_grade_2': 'bg-blue-100 text-blue-800',
          'normal': 'bg-green-100 text-green-800',
          'overweight': 'bg-yellow-100 text-yellow-800',
          'obesity': 'bg-red-100 text-red-800',
          'unknown': 'bg-gray-100 text-gray-800'
        };

        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor[status]}`}>
            {categoryKhmer}
          </span>
        );
      }
    },
    {
      key: 'zScore',
      header: t('sdGrade', 'មាត្រដ្ឋាន'),
      render: (student) => {
          if (student.zScore !== undefined && student.zScore !== null) {
              return `${student.zScore.toFixed(2)} SD`;
          }
          if (student.sd_grade) {
               const { grade } = student.sd_grade;
               return `${grade}SD`;
          }
          return '';
      }
    },
    {
      key: 'age',
      header: t('age', 'អាយុ'),
      render: (student) => student.age || student.ageInYears || ''
    },
    {
      key: 'ageInYearsAndMonths',
      header: t('ageInYearsAndMonths', 'អាយុជាឆ្នាំនិងខែ'),
      render: (student) => {
          if (student.ageInYearsAndMonths) return student.ageInYearsAndMonths;
          if (student.ageInYears && student.ageInMonths) {
               const years = student.ageInYears;
               const months = student.ageInMonths % 12;
               return months > 0 ? `${years} ឆ្នាំ ${months} ខែ` : `${years} ឆ្នាំ`;
          }
          return '';
      }
    },
    {
      key: 'recordDate',
      header: t('recordDate', 'កាលបរិច្ឆេទកត់ត្រា'),
      render: (student) => {
        const dateField = student.recordedAt || student.recorded_at || student.recordDate;
        return dateField ? new Date(dateField).toLocaleDateString('km-KH') : '';
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-gray-900">
          {t('bmiReportData', 'ទិន្នន័យរបាយការណ៍ BMI')}
        </h4>
        <span className="text-sm text-gray-500">
          {pagination.total} {t('records', 'កំណត់ត្រា')}
        </span>
      </div>

      {/* Data Table with Pagination */}
      <Table
        columns={columns}
        data={currentData}
        showPagination={true}
        pagination={pagination}
        onPageChange={handlePageChange}
        // Pass limit selector props to use the built-in Pagination component features
        showLimitSelector={!!isServerSide && !!onLimitChange}
        onLimitChange={(newLimit) => {
            if (onLimitChange) {
                onLimitChange(newLimit);
                if (onPageChange) onPageChange(1); // Reset to page 1
            }
        }}
        limitOptions={[10, 20, 50, 100]}
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
