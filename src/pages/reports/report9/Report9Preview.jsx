/**
 * Report 9: Ethnic Minority Students - Preview Component
 * Displays preview of ethnic minority students
 */

import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import Table from '../../../components/ui/Table';
import { formatClassIdentifier } from '../../../utils/helpers';
import { getFullName } from '../../../utils/usernameUtils';

/**
 * Preview component for Report 9
 * Shows a table with ethnic minority students
 */
export const Report9Preview = ({ data }) => {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t('noDataAvailable', 'No data available')}
      </div>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  // Add row numbers to data
  const dataWithRowNumbers = currentData.map((student, index) => ({
    ...student,
    rowNumber: startIndex + index + 1
  }));

  const columns = [
    {
      key: 'rowNumber',
      header: '#',
      accessor: 'rowNumber',
      cellClassName: 'font-medium'
    },
    {
      key: 'studentId',
      header: t('studentId', 'Student ID'),
      render: (student) => student.student?.studentNumber || student.studentNumber || ''
    },
    {
      key: 'name',
      header: t('name', 'Name'),
      render: (student) => getFullName(student, ''),
      cellClassName: 'font-medium text-gray-900'
    },
    {
      key: 'gender',
      header: t('gender', 'Gender'),
      render: (student) => student.gender === 'MALE' ? t('male', 'ប្រុស') : student.gender === 'FEMALE' ? t('female', 'ស្រី') : ''
    },
    {
      key: 'class',
      header: t('class', 'Class'),
      render: (student) => {
        if (student.class?.gradeLevel !== undefined && student.class?.gradeLevel !== null) {
          const rawGradeLevel = String(student.class.gradeLevel);
          const displayGradeLevel =
            rawGradeLevel === '0'
              ? t('grade0', 'Kindergarten')
              : rawGradeLevel;

          return `${t('class') || 'Class'} ${formatClassIdentifier(displayGradeLevel, student.class.section)}`;
        }

        return student.class?.name || student.className || '';
      }
    },
    {
      key: 'ethnicGroup',
      header: t('ethnicGroup', 'Ethnic Group'),
      render: (student) => student.ethnicGroup || student.ethnic_group || ''
    }
  ];

  const pagination = {
    page: currentPage,
    pages: totalPages,
    total: data.length,
    limit: itemsPerPage
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-gray-900">
          {t('ethnicMinorityStudents', 'Ethnic Minority Students')}
        </h4>
        <span className="text-sm text-gray-500">
          {data.length} {t('students', 'students')}
        </span>
      </div>

      <Table
        columns={columns}
        data={dataWithRowNumbers}
        showPagination={true}
        pagination={pagination}
        onPageChange={setCurrentPage}
        t={t}
        emptyMessage={t('noDataAvailable', 'No data available')}
        enableSort={false}
      />
    </div>
  );
};
