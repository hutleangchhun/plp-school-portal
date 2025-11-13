/**
 * Report 6: Students with Disabilities - Preview Component
 * Displays preview of students with disabilities
 */

import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import Table from '../../../components/ui/Table';

/**
 * Preview component for Report 6
 * Shows a table with students who have disabilities
 */
export const Report6Preview = ({ data }) => {
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
      render: (student) => student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || '',
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
      render: (student) => student.class?.name || student.className || ''
    },
    {
      key: 'disabilityType',
      header: t('disabilityTypes', 'Disability Type'),
      render: (student) => {
        const accessibility = student.accessibility || student.specialNeeds || student.special_needs || '';
        return Array.isArray(accessibility) ? accessibility.join(', ') : accessibility;
      }
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
          {t('studentsWithDisabilities', 'Students with Disabilities')}
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
