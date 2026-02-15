import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoading } from '../../contexts/LoadingContext';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import StatsCard from '../../components/ui/StatsCard';
import SchoolDistributionChart from '../../components/ui/SchoolDistributionChart';
import FieldCompletenessChart from '../../components/ui/FieldCompletenessChart';
import { dashboardService } from '../../utils/api/services/dashboardService';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import { Building2, Users, BookOpen, User, Shield, Award, Briefcase } from 'lucide-react';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import Badge from '@/components/ui/Badge';
import { formatNumberWithCommas } from '@/utils/formatters';

const AdminDashboard = ({ user: initialUser }) => {
  const { t } = useLanguage();
  const { error, handleError, clearError, retry } = useErrorHandler();
  const { startLoading, stopLoading } = useLoading();
  const [user] = useState(initialUser);
  const [initialLoading, setInitialLoading] = useState(true);
  const [systemStats, setSystemStats] = useState({
    totalSchools: 0,
    totalClasses: 0,
    totalStudents: 0,
    totalStudentsWithClass: 0,
    totalStudentsNoClass: 0,
    totalTeachers: 0,
    totalDirectors: 0,
    totalDeputyPrincipals: 0,
    totalSchoolSecretaries: 0,
    totalSchoolTreasurers: 0,
    totalSchoolLibrarians: 0,
    totalSchoolWorkshop: 0,
    totalSchoolSecurity: 0,
    totalTeacherIct: 0,
    studentsByGradeLevel: []
  });

  // Shared filter state for both completeness charts
  const [sharedFilters, setSharedFilters] = useState({
    selectedRole: '8',
    selectedSchool: '',
    selectedProvince: '',
    selectedDistrict: ''
  });

  // Fetch system-wide statistics
  const fetchSystemStats = useCallback(async ({ isRetry = false } = {}) => {
    console.log('🔄 Admin Dashboard: fetchSystemStats called', { isRetry });
    clearError();

    try {
      startLoading('fetchSystemStats', t('loadingDashboard', 'Loading dashboard...'));

      // Fetch dashboard statistics from the new endpoint
      const response = await dashboardService.getDashboardStatistics();

      if (response.success) {
        setSystemStats(response.data);
      } else {
        console.error('Failed to fetch dashboard statistics:', response.error);
        throw new Error(response.error || 'Failed to load dashboard statistics');
      }

    } catch (error) {
      console.error('Error in fetchSystemStats:', error);

      // One-time automatic retry for transient network errors
      const isNetworkError =
        error?.status === 0 ||
        typeof error?.message === 'string' && error.message.includes('No response received from server');

      if (!isRetry && isNetworkError) {
        setTimeout(() => {
          fetchSystemStats({ isRetry: true });
        }, 1000);
        return;
      }

      handleError(error, {
        toastMessage: t('failedToLoadDashboard', 'Failed to load dashboard data')
      });
    } finally {
      stopLoading('fetchSystemStats');
      setInitialLoading(false);
    }
  }, [clearError, startLoading, stopLoading, t, handleError]);

  // Initial data fetch
  useEffect(() => {
    fetchSystemStats();
  }, [fetchSystemStats]);

  // Initial loading state
  if (initialLoading) {
    return (
      <PageLoader
        message={t('loadingDashboard')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => retry(fetchSystemStats)}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="p-3 sm:p-6">
        {/* System Overview Card */}
        <FadeInSection delay={100} className="my-4 mx-2">
          <div className="pb-2 space-y-2 flex flex-col sm:flex-row justify-between items-start">
            <div>
              <div className="flex flex-col sm:flex-row items-start justify-between">
                <div className="flex items-center">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      {t('schoolManagement', 'System Overview')}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {t('systemOverviewDesc', 'Overview of the entire school system')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="flex flex-wrap gap-3">
                <Badge
                  color='green'
                  size='sm'
                  variant='outline'
                >
                  {t('adminUser', 'Admin User')}
                </Badge>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* System Statistics - Grouped by Student and Staff */}
        <FadeInSection delay={200} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Student Statistics Card */}
          <Card className="rounded-sm shadow-sm transition-shadow">
            <CardHeader className="border-b bg-white pb-4">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-base md:text-lg lg:text-lg font-bold text-gray-900">
                  {t('studentStatistics', 'Student Statistics')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Top Row - Schools and Classes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-sm border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    {t('totalSchools', 'Total Schools')}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatNumberWithCommas(systemStats.totalSchools)}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-sm border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    {t('totalClasses', 'Total Classes')}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatNumberWithCommas(systemStats.totalClasses)}
                  </p>
                </div>
              </div>
              {/* Student Distribution */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 rounded-sm border border-green-100">
                  <p className="text-xs font-medium text-green-700 mb-1">
                    {t('studentsWithClass', 'With Class')}
                  </p>
                  <p className="text-lg font-bold text-green-900">
                    {formatNumberWithCommas(systemStats.totalStudentsWithClass)}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-sm border border-amber-100">
                  <p className="text-xs font-medium text-amber-700 mb-1">
                    {t('studentsNoClass', 'No Class')}
                  </p>
                  <p className="text-lg font-bold text-amber-900">
                    {formatNumberWithCommas(systemStats.totalStudentsNoClass)}
                  </p>
                </div>
              </div>

              {/* Students by Grade Level */}
              {systemStats.studentsByGradeLevel && systemStats.studentsByGradeLevel.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    {t('studentsByGradeWithClasses', 'Students by Grade Level with Classes')}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2">
                    {systemStats.studentsByGradeLevel.map((grade) => (
                      <div key={grade.gradeLevel} className="p-4 bg-gray-50 rounded-sm border border-gray-100">
                        <p className="text-xs text-gray-500 mb-0.5">
                          {grade.gradeLevel === '0' ? 'កម្រិតមត្តេយ្យ' : `${t('grade', 'Grade')} ${grade.gradeLevel}`}
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          {formatNumberWithCommas(grade.count)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Staff Statistics Card */}
          <Card className="rounded-sm shadow-sm transition-shadow">
            <CardHeader className="border-b bg-white pb-4">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-base md:text-lg lg:text-lg font-bold text-gray-900">
                  {t('staffStatistics', 'Staff Statistics')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Total Teachers - Highlighted */}
              <div className="p-4 bg-purple-50 rounded-sm border border-purple-100">
                <p className="text-xs font-medium text-purple-700 mb-1">
                  {t('totalTeachers', 'Total Teachers')}
                </p>
                <p className="text-lg font-bold text-purple-900">
                  {formatNumberWithCommas(systemStats.totalTeachers)}
                </p>
              </div>

              {/* Leadership Roles */}
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-sm border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      {t('totalDirectors', 'Directors')}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatNumberWithCommas(systemStats.totalDirectors)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-sm border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      {t('totalDeputyPrincipals', 'Deputy')}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatNumberWithCommas(systemStats.totalDeputyPrincipals)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-sm border border-gray-100">
                    <p className="text-xs text-gray-500 mb-0.5">
                      {t('totalSecretaries', 'Secretary')}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatNumberWithCommas(systemStats.totalSchoolSecretaries)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-sm border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">
                      {t('totalTreasurers', 'Treasurer')}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatNumberWithCommas(systemStats.totalSchoolTreasurers)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-sm border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">
                      {t('totalLibrarians', 'Librarian')}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatNumberWithCommas(systemStats.totalSchoolLibrarians)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-sm border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">
                      {t('totalTeacherIct', 'ICT')}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatNumberWithCommas(systemStats.totalTeacherIct)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-sm border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">
                      {t('totalWorkshop', 'Workshop')}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatNumberWithCommas(systemStats.totalSchoolWorkshop)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-sm border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">
                      {t('totalSecurity', 'Security')}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatNumberWithCommas(systemStats.totalSchoolSecurity)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeInSection>

        {/* Charts Grid */}
        <FadeInSection delay={300} className="grid grid-cols-1 gap-6 mb-6">
          {/* School Distribution Chart */}
          <div className="">
            <SchoolDistributionChart />
          </div>
          {/* Field Completeness Chart */}
          <div className="">
            <FieldCompletenessChart
              sharedFilters={sharedFilters}
              onFiltersChange={setSharedFilters}
            />
          </div>
        </FadeInSection>
      </div>
    </PageTransition>
  );
};

export default AdminDashboard;