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
    totalClasses: 0,
    totalStudents: 0,
    totalStudentsWithClass: 0,
    totalStudentsNoClass: 0,
    totalTeachers: 0,
    totalDirectors: 0,
    totalDeputyPrincipals: 0,
    totalSecretaries: 0,
    totalTreasurers: 0,
    totalLibrarians: 0,
    totalWorkshop: 0,
    totalSecurity: 0,
    totalTeacherIct: 0
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

      // Fetch school distribution data which contains the stats
      const response = await dashboardService.getSchoolDistribution();

      if (response.success) {
        setSystemStats({
          totalSchools: response.summary.totalSchools,
          totalStudents: response.summary.totalStudents,
          totalStudentsWithClass: response.summary.totalStudentsWithClass,
          totalStudentsNoClass: response.summary.totalStudentsNoClass,
          totalTeachers: response.summary.totalTeachers,
          totalClasses: response.summary.totalClasses,
          totalDirectors: response.summary.totalDirectors,
          totalDeputyPrincipals: response.summary.totalDeputyPrincipals,
          totalSecretaries: response.summary.totalSecretaries,
          totalTreasurers: response.summary.totalTreasurers,
          totalLibrarians: response.summary.totalLibrarians,
          totalWorkshop: response.summary.totalWorkshop,
          totalSecurity: response.summary.totalSecurity,
          totalTeacherIct: response.summary.totalTeacherIct
        });
      } else {
        console.error('Failed to fetch school distribution:', response.error);
        throw new Error(response.error || 'Failed to load school distribution');
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
                      {t('systemOverview', 'System Overview')}
                    </CardTitle>
                    <p className="text-sm text-gray-500">
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
                  size='md'
                  variant='filled'
                >
                  {t('adminUser', 'Admin User')}
                </Badge>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* System Statistics */}
        <FadeInSection delay={200} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-2">
          <StatsCard
            title={t('totalSchools', 'Total Schools')}
            value={formatNumberWithCommas(systemStats.totalSchools)}
            enhanced={true}
            gradientFrom="from-blue-500"
            gradientTo="to-blue-600"
            hoverColor="hover:border-blue-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalStudents', 'Total Students')}
            value={formatNumberWithCommas(systemStats.totalStudents)}
            enhanced={true}
            gradientFrom="from-green-500"
            gradientTo="to-green-600"
            hoverColor="hover:border-green-200"
            responsive={true}
          />

          <StatsCard
            title={t('studentsWithClass', 'Students With Class')}
            value={formatNumberWithCommas(systemStats.totalStudentsWithClass)}
            enhanced={true}
            gradientFrom="from-emerald-500"
            gradientTo="to-emerald-600"
            hoverColor="hover:border-emerald-200"
            responsive={true}
          />

          <StatsCard
            title={t('studentsNoClass', 'Students No Class')}
            value={formatNumberWithCommas(systemStats.totalStudentsNoClass)}
            enhanced={true}
            gradientFrom="from-amber-500"
            gradientTo="to-amber-600"
            hoverColor="hover:border-amber-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalTeachers', 'Total Teachers')}
            value={formatNumberWithCommas(systemStats.totalTeachers)}
            enhanced={true}
            gradientFrom="from-purple-500"
            gradientTo="to-purple-600"
            hoverColor="hover:border-purple-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalClasses', 'Total Classes')}
            value={formatNumberWithCommas(systemStats.totalClasses)}
            enhanced={true}
            gradientFrom="from-orange-500"
            gradientTo="to-orange-600"
            hoverColor="hover:border-orange-200"
            responsive={true}
          />
        </FadeInSection>

        {/* Additional Role Statistics */}
        <FadeInSection delay={250} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-2">
          <StatsCard
            title={t('totalDirectors', 'Total Directors')}
            value={formatNumberWithCommas(systemStats.totalDirectors)}
            enhanced={true}
            gradientFrom="from-rose-500"
            gradientTo="to-rose-600"
            hoverColor="hover:border-rose-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalDeputyPrincipals', 'Deputy Principals')}
            value={formatNumberWithCommas(systemStats.totalDeputyPrincipals)}
            enhanced={true}
            gradientFrom="from-pink-500"
            gradientTo="to-pink-600"
            hoverColor="hover:border-pink-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalSecretaries', 'Secretaries')}
            value={formatNumberWithCommas(systemStats.totalSecretaries)}
            enhanced={true}
            gradientFrom="from-cyan-500"
            gradientTo="to-cyan-600"
            hoverColor="hover:border-cyan-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalTreasurers', 'Treasurers')}
            value={formatNumberWithCommas(systemStats.totalTreasurers)}
            enhanced={true}
            gradientFrom="from-teal-500"
            gradientTo="to-teal-600"
            hoverColor="hover:border-teal-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalLibrarians', 'Librarians')}
            value={formatNumberWithCommas(systemStats.totalLibrarians)}
            enhanced={true}
            gradientFrom="from-indigo-500"
            gradientTo="to-indigo-600"
            hoverColor="hover:border-indigo-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalWorkshop', 'Workshop Staff')}
            value={formatNumberWithCommas(systemStats.totalWorkshop)}
            enhanced={true}
            gradientFrom="from-amber-500"
            gradientTo="to-amber-600"
            hoverColor="hover:border-amber-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalSecurity', 'Security Staff')}
            value={formatNumberWithCommas(systemStats.totalSecurity)}
            enhanced={true}
            gradientFrom="from-slate-500"
            gradientTo="to-slate-600"
            hoverColor="hover:border-slate-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalTeacherIct', 'ICT Teachers')}
            value={formatNumberWithCommas(systemStats.totalTeacherIct)}
            enhanced={true}
            gradientFrom="from-lime-500"
            gradientTo="to-lime-600"
            hoverColor="hover:border-lime-200"
            responsive={true}
          />
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