import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Users, UserCheck, Clock, TrendingUp } from 'lucide-react';

/**
 * Combined Attendance Statistics Component
 * Shows aggregated stats for both students and teachers
 */
const CombinedAttendanceStats = ({ data, loading }) => {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const stats = [
    {
      label: t('totalUsers', 'Total Users'),
      value: data.totalUsers || 0,
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100'
    },
    {
      label: t('usersWithData', 'Users with Data'),
      value: data.usersWithData || 0,
      icon: UserCheck,
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100'
    },
    {
      label: t('totalRecords', 'Total Records'),
      value: data.totalRecords || 0,
      icon: Clock,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100'
    },
    {
      label: t('overallAttendance', 'Overall Attendance'),
      value: data.overallAttendancePercentage
        ? `${data.overallAttendancePercentage.toFixed(1)}%`
        : '0%',
      icon: TrendingUp,
      gradient: 'from-orange-500 to-orange-600',
      bgGradient: 'from-orange-50 to-orange-100'
    }
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`bg-gradient-to-br ${stat.bgGradient} rounded-lg shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.gradient} shadow-sm`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {typeof stat.value === 'number'
                    ? stat.value.toLocaleString()
                    : stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CombinedAttendanceStats;
