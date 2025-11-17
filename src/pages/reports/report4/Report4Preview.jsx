/**
 * Report 4: Absence Report - Preview Component
 * Displays preview of students with most absences and leaves
 */

import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import Table from '../../../components/ui/Table';
import { formatClassIdentifier } from '../../../utils/helpers';

/**
 * Preview component for Report 4
 * Shows two tables: top student with most absences and top student with most leaves
 */
export const Report4Preview = ({ data, semester, startDate, endDate, onDateRangeChange }) => {
  const { t } = useLanguage();
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [localStartDate, setLocalStartDate] = React.useState(startDate || '');
  const [localEndDate, setLocalEndDate] = React.useState(endDate || '');

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

  // Get top 1 student with most absences (only if count > 0)
  const topAbsentStudent = [...studentsWithStats]
    .filter(student => student.absentCount > 0)
    .sort((a, b) => b.absentCount - a.absentCount)
    .slice(0, 1);

  // Get top 1 student with most leaves (only if count > 0)
  const topLeaveStudent = [...studentsWithStats]
    .filter(student => student.leaveCount > 0)
    .sort((a, b) => b.leaveCount - a.leaveCount)
    .slice(0, 1);

  // Define columns for absent students table
  const absentColumns = [
    {
      key: 'studentId',
      header: t('studentId', 'អត្តលេខ'),
      render: (student) => student.studentNumber,
      cellClassName: 'font-medium'
    },
    {
      key: 'name',
      header: t('name', 'ឈ្មោះ'),
      render: (student) => student.khmerName || `${student.lastName || ''} ${student.firstName || ''}`.trim() || '',
      cellClassName: 'font-medium text-gray-900'
    },
    {
      key: 'gender',
      header: t('gender', 'ភេទ'),
      render: (student) => student.gender === 'MALE' ? 'ប' : student.gender === 'FEMALE' ? 'ស' : ''
    },
    {
      key: 'class',
      header: t('class', 'ថ្នាក់'),
      render: (student) => student.class?.gradeLevel
        ? formatClassIdentifier(student.class.gradeLevel, student.class.section)
        : (student.class?.name || student.className || '')
    },
    {
      key: 'absent',
      header: t('absent', 'អត់ច្បាប់'),
      render: (student) => (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800">
          {student.absentCount}
        </span>
      ),
      headerClassName: 'text-center',
      cellClassName: 'text-center'
    },
    {
      key: 'attendanceRate',
      header: t('attendanceRate', 'អត្រាវត្តមាន'),
      render: (student) => (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          student.attendanceRate >= 90 ? 'bg-green-100 text-green-800' :
          student.attendanceRate >= 75 ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {student.attendanceRate}%
        </span>
      ),
      headerClassName: 'text-center',
      cellClassName: 'text-center'
    }
  ];

  // Define columns for leave students table
  const leaveColumns = [
    {
      key: 'studentId',
      header: t('studentId', 'អត្តលេខ'),
      render: (student) => student.studentNumber,
      cellClassName: 'font-medium'
    },
    {
      key: 'name',
      header: t('name', 'ឈ្មោះ'),
      render: (student) => student.khmerName || `${student.lastName || ''} ${student.firstName || ''}`.trim() || '',
      cellClassName: 'font-medium text-gray-900'
    },
    {
      key: 'gender',
      header: t('gender', 'ភេទ'),
      render: (student) => student.gender === 'MALE' ? 'ប្រុស' : student.gender === 'FEMALE' ? 'ស្រី' : ''
    },
    {
      key: 'class',
      header: t('class', 'ថ្នាក់រៀន'),
      render: (student) => student.class?.gradeLevel
        ? formatClassIdentifier(student.class.gradeLevel, student.class.section)
        : (student.class?.name || student.className || '')
    },
    {
      key: 'leave',
      header: t('leave', 'ច្បាប់'),
      render: (student) => (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-800">
          {student.leaveCount}
        </span>
      ),
      headerClassName: 'text-center',
      cellClassName: 'text-center'
    },
    {
      key: 'attendanceRate',
      header: t('attendanceRate', 'អត្រាវត្តមាន'),
      render: (student) => (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          student.attendanceRate >= 90 ? 'bg-green-100 text-green-800' :
          student.attendanceRate >= 75 ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {student.attendanceRate}%
        </span>
      ),
      headerClassName: 'text-center',
      cellClassName: 'text-center'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
      {/* Student with Most Absences Table - Only show if there is absent data */}
      {topAbsentStudent.length > 0 && (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-red-900 mb-4 flex items-center">
              {t('studentWithMostAbsences', 'សិស្សដែលអវត្តមានច្រើនបំផុត')}
            </h4>
          
          
          <Table
            columns={absentColumns}
            data={topAbsentStudent}
            t={t}
            emptyMessage={t('noDataAvailable', 'No data available')}
            enableSort={false}
            rowClassName="hover:bg-red-50"
            className="border-red-200"
          />
        </div>
      )}

      {/* Student with Most Leaves Table - Only show if there is leave data */}
      {topLeaveStudent.length > 0 && (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-orange-900 mb-4 flex items-center">
              {t('studentWithMostLeaves', 'សិស្សដែលច្បាប់ច្រើនបំផុត')}
            </h4>
          
          <Table
            columns={leaveColumns}
            data={topLeaveStudent}
            t={t}
            emptyMessage={t('noDataAvailable', 'No data available')}
            enableSort={false}
            rowClassName="hover:bg-orange-50"
            className="border-orange-200"
          />
        </div>
      )}
    </div>
  );
};
