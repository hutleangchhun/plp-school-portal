import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/Button';
import { Filter, RefreshCcw } from 'lucide-react';
import AttendanceMonthlyTrends from '../../components/charts/AttendanceMonthlyTrends';

const TeacherAttendanceOverviewTab = ({
  dashboardLoading,
  teacherDashboardData,
  monthlyFilters,
  monthlyLocationOptions,
  onMonthlyFilterChange,
  onMonthlyFiltersClear,
  fetchMonthlyDistricts,
  fetchMonthlySchools,
  getCurrentMonthRange,
  onSidebarOpen
}) => {
  const { t } = useLanguage();

  return (
    <>
      {dashboardLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('loadingData', 'Loading teacher attendance data...')}</p>
          </div>
        </div>
      )}

      {!dashboardLoading && !teacherDashboardData?.primary && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">{t('noDataAvailable', 'No teacher attendance data available')}</p>
          </CardContent>
        </Card>
      )}

      {/* Teacher Summary Cards */}
      {!dashboardLoading && teacherDashboardData?.primary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-900">
                {teacherDashboardData.primary.totalTeachers || 0}
              </div>
              <p className="text-sm text-blue-600 mt-2">{t('totalTeachers', 'Total Teachers')}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-900">
                {teacherDashboardData.primary.teachersWithAttendanceData || 0}
              </div>
              <p className="text-sm text-green-600 mt-2">{t('withData', 'With Attendance Data')}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-900">
                {teacherDashboardData.primary.averageHoursWorked?.toFixed(2) || 0}
              </div>
              <p className="text-sm text-purple-600 mt-2">{t('averageHours', 'Average Hours Worked')}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-orange-900">
                {teacherDashboardData.primary.overallAttendancePercentage?.toFixed(1) || 0}%
              </div>
              <p className="text-sm text-orange-600 mt-2">{t('attendancePercentage', 'Attendance %')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Teacher by Role Breakdown */}
      {!dashboardLoading && teacherDashboardData?.byRole && teacherDashboardData.byRole.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('attendanceByRole', 'Attendance by Role')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('role', 'Role')}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('total', 'Total')}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('present', 'Present')}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('absent', 'Absent')}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('late', 'Late')}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('leave', 'Leave')}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('percentage', 'Percentage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherDashboardData.byRole.map((role, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{role.roleName || 'N/A'}</td>
                      <td className="text-right py-3 px-4 text-gray-700">{role.totalStaff || 0}</td>
                      <td className="text-right py-3 px-4 text-green-600 font-medium">{role.distribution?.present || 0}</td>
                      <td className="text-right py-3 px-4 text-red-600 font-medium">{role.distribution?.absent || 0}</td>
                      <td className="text-right py-3 px-4 text-yellow-600 font-medium">{role.distribution?.late || 0}</td>
                      <td className="text-right py-3 px-4 text-blue-600 font-medium">{role.distribution?.leave || 0}</td>
                      <td className="text-right py-3 px-4 text-blue-600 font-medium">
                        {role.attendancePercentage?.toFixed(1) || 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teacher Monthly Trends Chart */}
      {teacherDashboardData?.monthly && (
        <AttendanceMonthlyTrends
          dashboardData={teacherDashboardData}
          dashboardFilters={monthlyFilters}
          locationOptions={monthlyLocationOptions}
          onFilterChange={onMonthlyFilterChange}
          onClearFilters={onMonthlyFiltersClear}
          fetchDistricts={fetchMonthlyDistricts}
          fetchSchools={fetchMonthlySchools}
        />
      )}

      {/* Filter Button for Teacher Tab */}
      <div className="flex gap-2 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={onSidebarOpen}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          {t('filters', 'Filters')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const { startDate, endDate } = getCurrentMonthRange();
            onMonthlyFiltersClear({
              startDate,
              endDate,
              province: '',
              district: '',
              school: ''
            });
          }}
          className="flex items-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          {t('reset', 'Reset')}
        </Button>
      </div>
    </>
  );
};

export default TeacherAttendanceOverviewTab;
