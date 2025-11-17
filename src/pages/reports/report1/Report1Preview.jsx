/**
 * Report 1: Student Name List - Preview Component
 * Displays preview of student list with basic information
 */

import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import Table from '../../../components/ui/Table';
import { formatClassIdentifier } from '../../../utils/helpers';

/**
 * Preview component for Report 1
 * Shows a table with student basic information
 */
export const Report1Preview = ({ data }) => {
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
      render: (student) => student.student?.studentNumber || student.studentNumber || '-'
    },
    {
      key: 'name',
      header: t('name', 'Name'),
      render: (student) => student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || '-',
      cellClassName: 'font-medium text-gray-900'
    },
    {
      key: 'gender',
      header: t('gender', 'Gender'),
      render: (student) => student.gender === 'MALE' ? t('male', 'ប្រុស') : student.gender === 'FEMALE' ? t('female', 'ស្រី') : '-'
    },
    {
      key: 'class',
      header: t('class', 'Class'),
      render: (student) => student.class?.gradeLevel
        ? `${t('class') || 'Class'} ${formatClassIdentifier(student.class.gradeLevel, student.class.section)}`
        : (student.class?.name || student.className || '-')
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
          {t('studentList', 'Student List')}</h4>
        <span className="text-sm text-gray-500">
          ({data.length} {t('students', 'students')})</span>
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
