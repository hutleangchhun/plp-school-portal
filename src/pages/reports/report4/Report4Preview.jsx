/**
 * Report 4: Absence Report - Preview Component
 * Displays preview of students with most absences and leaves
 */

import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

/**
 * Preview component for Report 4
 * Shows two tables: top student with most absences and top student with most leaves
 */
export const Report4Preview = ({ data }) => {
  const { t } = useLanguage();

  // Calculate absence statistics for each student
  const studentsWithStats = data.map((student) => {
    const attendances = student.attendances || [];
    const absentCount = attendances.filter(a => a.status === 'ABSENT').length;
    const leaveCount = attendances.filter(a => a.status === 'LEAVE').length;
    const totalAbsences = absentCount + leaveCount;
    const presentCount = attendances.filter(a => a.status === 'PRESENT').length;
    const totalDays = attendances.length;
    const attendanceRate = totalDays > 0 ? ((presentCount / totalDays) * 100).toFixed(1) : 0;
    
    return {
      ...student,
      // Use actual studentNumber from nested student object (same as Report 1)
      studentNumber: student.student?.studentNumber || student.studentNumber || '',
      // Use gender from nested student object with fallback
      gender: student.student?.gender || student.gender || '',
      absentCount,
      leaveCount,
      totalAbsences,
      presentCount,
      totalDays,
      attendanceRate
    };
  });

  // Get top 1 student with most absences
  const topAbsentStudent = [...studentsWithStats]
    .sort((a, b) => b.absentCount - a.absentCount)
    .slice(0, 1);

  // Get top 1 student with most leaves
  const topLeaveStudent = [...studentsWithStats]
    .sort((a, b) => b.leaveCount - a.leaveCount)
    .slice(0, 1);

  return (
    <div className="space-y-6">
      {/* Student with Most Absences Table */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <h4 className="text-sm font-semibold text-red-900 mb-4 flex items-center">
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold mr-2">អច្ប</span>
          {t('studentWithMostAbsences', 'សិស្សដែលអវត្តមានច្រើនបំផុត')}
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-red-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('studentId', 'អត្តលេខ')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('name', 'ឈ្មោះ')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('gender', 'ភេទ')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('class', 'ថ្នាក់')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('absent', 'អច្ប')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('attendanceRate', 'អត្រាវត្តមាន')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topAbsentStudent.length > 0 ? (
                topAbsentStudent.map((student, index) => (
                  <tr key={index} className="hover:bg-red-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{student.studentNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {student.khmerName || `${student.lastName || ''} ${student.firstName || ''}`.trim() || ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {student.gender === 'MALE' ? 'ប' : student.gender === 'FEMALE' ? 'ស' : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {student.class?.name || student.className || ''}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800">
                        {student.absentCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        student.attendanceRate >= 90 ? 'bg-green-100 text-green-800' :
                        student.attendanceRate >= 75 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {student.attendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                    {t('noAbsences', 'មិនមានអវត្តមាន')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student with Most Leaves Table */}
      <div className="bg-white border border-orange-200 rounded-lg p-6">
        <h4 className="text-sm font-semibold text-orange-900 mb-4 flex items-center">
          <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold mr-2">ច្ប</span>
          {t('studentWithMostLeaves', 'សិស្សដែលច្បច្រើនបំផុត')}
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-orange-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('studentId', 'អត្តលេខ')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('name', 'ឈ្មោះ')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('gender', 'ភេទ')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('class', 'ថ្នាក់')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('leave', 'ច្ប')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('attendanceRate', 'អត្រាវត្តមាន')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topLeaveStudent.length > 0 ? (
                topLeaveStudent.map((student, index) => (
                  <tr key={index} className="hover:bg-orange-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{student.studentNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {student.khmerName || `${student.lastName || ''} ${student.firstName || ''}`.trim() || ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {student.gender === 'MALE' ? 'ប' : student.gender === 'FEMALE' ? 'ស' : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {student.class?.name || student.className || ''}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-800">
                        {student.leaveCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        student.attendanceRate >= 90 ? 'bg-green-100 text-green-800' :
                        student.attendanceRate >= 75 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {student.attendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                    {t('noLeaves', 'មិនមានច្ប')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
