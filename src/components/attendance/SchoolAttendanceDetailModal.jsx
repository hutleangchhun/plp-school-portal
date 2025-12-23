import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { X, Users, School, TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/card';
import StatsCard from '../ui/StatsCard';

/**
 * School Attendance Detail Modal
 * Shows detailed attendance information for a selected school
 */
const SchoolAttendanceDetailModal = ({ isOpen, onClose, school }) => {
  const { t } = useLanguage();

  if (!isOpen || !school) return null;

  const stats = [
    {
      label: t('studentRecords', 'Student Records'),
      value: school.studentAttendanceCount || 0,
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100'
    },
    {
      label: t('teacherRecords', 'Teacher Records'),
      value: school.teacherAttendanceCount || 0,
      icon: Users,
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100'
    },
    {
      label: t('totalRecords', 'Total Records'),
      value: school.totalAttendanceCount || 0,
      icon: TrendingUp,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <School className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {school.schoolName}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {t('attendanceDetails', 'Attendance Details')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <StatsCard 
                      title={stat.label}
                      value={stat.value}
                      icon={Icon}
                      gradientFrom="from-blue-500"
                      gradientTo="to-blue-600"
                      hoverColor="hover:border-blue-200"
                      responsive={true}
                  />
                );
              })}
            </div>

            {/* Summary Info */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {t('summary', 'Summary')}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('schoolId', 'School ID')}:</span>
                  <span className="font-medium text-gray-900">{school.schoolId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('studentAttendance', 'Student Attendance')}:</span>
                  <span className="font-medium text-gray-900">
                    {school.studentAttendanceCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('teacherAttendance', 'Teacher Attendance')}:</span>
                  <span className="font-medium text-gray-900">
                    {school.teacherAttendanceCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="text-gray-900 font-semibold">{t('totalAttendance', 'Total Attendance')}:</span>
                  <span className="font-bold text-gray-900">
                    {school.totalAttendanceCount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{t('note', 'Note')}:</strong> {t('schoolAttendanceNote', 'This shows the total number of attendance records for this school. For detailed attendance reports, please navigate to the main attendance overview page.')}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <Button
              variant="outline"
              onClick={onClose}
            >
              {t('close', 'Close')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolAttendanceDetailModal;
