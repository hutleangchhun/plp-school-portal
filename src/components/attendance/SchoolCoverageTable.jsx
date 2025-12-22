import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Pagination from '../ui/Pagination';

/**
 * School Coverage Table Component
 * Shows which schools have attendance data
 * Filters by province, district from parent
 */
const SchoolCoverageTable = ({
  data = [],
  loading,
  pagination = {},
  onPageChange = () => {},
  onLimitChange = () => {}
}) => {
  const { t } = useLanguage();
  const [sortConfig, setSortConfig] = useState({ key: 'schoolName', direction: 'asc' });

  const {
    page = 1,
    limit = 1,
    totalPages = 1,
    totalSchools = 0
  } = pagination;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <p className="text-gray-500">{t('noSchoolsFound', 'No schools found')}</p>
      </div>
    );
  }

  // Sort schools (data is already filtered by the API)
  const sortedData = [...data].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const SortableHeader = ({ label, sortKey }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        )}
      </div>
    </th>
  );


  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('schoolCoverageList', 'Schools with Attendance Data')}
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader label={t('schoolName', 'School Name')} sortKey="schoolName" />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('studentData', 'Student Data')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('teacherData', 'Teacher Data')}
              </th>
              <SortableHeader label={t('studentCount', 'Student Records')} sortKey="studentAttendanceCount" />
              <SortableHeader label={t('teacherCount', 'Teacher Records')} sortKey="teacherAttendanceCount" />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('dateRange', 'Date Range')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((school, index) => (
              <tr key={school.schoolId || index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{school.schoolName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {school.hasStudentAttendance ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">{t('yes', 'Yes')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <XCircle className="h-5 w-5" />
                      <span className="text-sm">{t('no', 'No')}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {school.hasTeacherAttendance ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">{t('yes', 'Yes')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <XCircle className="h-5 w-5" />
                      <span className="text-sm">{t('no', 'No')}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 font-medium">
                    {(school.studentAttendanceCount || 0).toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 font-medium">
                    {(school.teacherAttendanceCount || 0).toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs text-gray-500">
                    {school.firstAttendanceDate && school.lastAttendanceDate ? (
                      <>
                        <div>{new Date(school.firstAttendanceDate).toLocaleDateString()}</div>
                        <div className="text-gray-400">to</div>
                        <div>{new Date(school.lastAttendanceDate).toLocaleDateString()}</div>
                      </>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        total={totalSchools}
        limit={limit}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
        limitOptions={[10, 20, 50, 100]}
        showLimitSelector={true}
        t={t}
        showFirstLast={true}
        showInfo={true}
      />
    </div>
  );
};

export default SchoolCoverageTable;
