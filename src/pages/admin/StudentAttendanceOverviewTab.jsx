import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card, CardContent } from '../../components/ui/card';
import AttendanceSummaryCards from '../../components/dashboard/AttendanceSummaryCards';
import AttendanceDailyTrends from '../../components/charts/AttendanceDailyTrends';
import AttendanceMonthlyTrends from '../../components/charts/AttendanceMonthlyTrends';

const StudentAttendanceOverviewTab = ({
  dashboardLoading,
  dashboardData,
  dailyFilters,
  monthlyFilters,
  dailyLocationOptions,
  monthlyLocationOptions,
  onDailyFilterChange,
  onDailyFiltersClear,
  onMonthlyFilterChange,
  onMonthlyFiltersClear,
  fetchDailyDistricts,
  fetchDailySchools,
  fetchMonthlyDistricts,
  fetchMonthlySchools
}) => {
  const { t } = useLanguage();

  return (
    <>
      {dashboardLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('loadingData', 'Loading student attendance data...')}</p>
          </div>
        </div>
      )}

      {!dashboardLoading && !dashboardData?.primary && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">{t('noDataAvailable', 'No student attendance data available')}</p>
          </CardContent>
        </Card>
      )}

      {!dashboardLoading && dashboardData?.primary && (
        <>
          {/* Summary Statistics Cards */}
          <AttendanceSummaryCards
            dashboardData={dashboardData}
            dashboardFilters={monthlyFilters}
          />

          {/* Daily Trends with Separate Filters */}
          <AttendanceDailyTrends
            dashboardData={dashboardData}
            dashboardFilters={dailyFilters}
            locationOptions={dailyLocationOptions}
            onFilterChange={onDailyFilterChange}
            onClearFilters={onDailyFiltersClear}
            fetchDistricts={fetchDailyDistricts}
            fetchSchools={fetchDailySchools}
          />

          {/* Monthly Trends with Separate Filters */}
          <AttendanceMonthlyTrends
            dashboardData={dashboardData}
            dashboardFilters={monthlyFilters}
            locationOptions={monthlyLocationOptions}
            onFilterChange={onMonthlyFilterChange}
            onClearFilters={onMonthlyFiltersClear}
            fetchDistricts={fetchMonthlyDistricts}
            fetchSchools={fetchMonthlySchools}
          />
        </>
      )}
    </>
  );
};

export default StudentAttendanceOverviewTab;
