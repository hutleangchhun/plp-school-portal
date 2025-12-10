import React from 'react';
import { Users, Calendar, TrendingUp, School } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Attendance Summary Cards Component
 * Displays key attendance statistics in card format
 *
 * @param {Object} dashboardData - Dashboard data containing attendance statistics
 * @param {Object} dashboardFilters - Current filter values
 */
const AttendanceSummaryCards = ({ dashboardData, dashboardFilters }) => {
  const { t } = useLanguage();

  if (!dashboardData || !dashboardData.primary) {
    return null;
  }

  const primaryData = dashboardData.primary;
  const distribution = primaryData.attendanceDistribution || {};

  const cards = [
    {
      title: t('totalStudents', 'Total Students'),
      value: (primaryData.totalStudents || 0).toLocaleString(),
      subtitle: `${(primaryData.studentsWithAttendanceData || 0).toLocaleString()} ${t('withData', 'with data')}`,
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      title: t('overallAttendance', 'Overall Attendance'),
      value: `${(primaryData.overallAttendancePercentage || 0).toFixed(2)}%`,
      subtitle: `${(primaryData.totalAttendanceRecords || 0).toLocaleString()} ${t('records', 'records')}`,
      icon: TrendingUp,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      title: t('presentRate', 'Present Rate'),
      value: `${(distribution.presentPercentage || 0).toFixed(2)}%`,
      subtitle: `${(distribution.present || 0).toLocaleString()} ${t('students', 'students')}`,
      icon: School,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    },
    {
      title: t('absentRate', 'Absent Rate'),
      value: `${(distribution.absentPercentage || 0).toFixed(2)}%`,
      subtitle: `${(distribution.absent || 0).toLocaleString()} ${t('students', 'students')}`,
      icon: Calendar,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;

        return (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            {/* Icon and Title */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
              </div>
              <div className={`${card.iconBg} p-2 rounded-lg`}>
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>

            {/* Subtitle */}
            {card.subtitle && (
              <p className="text-xs text-gray-500">{card.subtitle}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AttendanceSummaryCards;
