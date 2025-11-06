/**
 * Report 1: Student Name List - Preview Component
 * Displays preview of student list with basic information
 */

import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import Pagination from '../../../components/ui/Pagination';

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
  const showingFrom = startIndex + 1;
  const showingTo = Math.min(endIndex, data.length);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">
          {t('dataPreview', 'Data Preview')} ({data.length} {t('students', 'students')})
        </h4>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('studentId', 'Student ID')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('name', 'Name')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('gender', 'Gender')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('class', 'Class')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.map((student, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">{startIndex + index + 1}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {student.student?.studentNumber || student.studentNumber || ''}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || ''}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {student.gender === 'MALE' ? t('male', 'ប្រុស') : student.gender === 'FEMALE' ? t('female', 'ស្រី') : ''}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {student.class?.name || student.className || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        total={data.length}
        limit={itemsPerPage}
        onPageChange={setCurrentPage}
        t={t}
      />
    </div>
  );
};
