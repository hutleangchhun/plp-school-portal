import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * School Coverage Table Component
 * Shows which schools have attendance data
 * Filters by province, district, school from parent
 */
const SchoolCoverageTable = ({ data, loading, filters = {} }) => {
  const { t } = useLanguage();
  const [sortConfig, setSortConfig] = useState({ key: 'schoolName', direction: 'asc' });

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

    // Handle string comparison
    if (typeof aValue === 'string') {
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

  // Group schools by province (if province data is available)
  const groupedByProvince = sortedData.reduce((acc, school) => {
    const province = school.provinceName || t('unknown', 'Unknown');
    if (!acc[province]) {
      acc[province] = [];
    }
    acc[province].push(school);
    return {};
  }, {});

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const toggleProvince = (province) => {
    const newExpanded = new Set(expandedProvinces);
    if (newExpanded.has(province)) {
      newExpanded.delete(province);
    } else {
      newExpanded.add(province);
    }
    setExpandedProvinces(newExpanded);
  };

  // Calculate summary stats
  const stats = {
    total: sortedData.length,
    withStudentData: sortedData.filter((s) => s.hasStudentAttendance).length,
    withTeacherData: sortedData.filter((s) => s.hasTeacherAttendance).length,
    withBothData: sortedData.filter((s) => s.hasStudentAttendance && s.hasTeacherAttendance).length,
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

    </div>
  );
};

export default SchoolCoverageTable;
