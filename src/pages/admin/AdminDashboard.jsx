import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoading } from '../../contexts/LoadingContext';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import StatsCard from '../../components/ui/StatsCard';
import SchoolDistributionChart from '../../components/ui/SchoolDistributionChart';
import { dashboardService } from '../../utils/api/services/dashboardService';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import { Building2, Users, BookOpen, User } from 'lucide-react';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const AdminDashboard = ({ user: initialUser }) => {
  const { t } = useLanguage();
  const { error, handleError, clearError, retry } = useErrorHandler();
  const { startLoading, stopLoading } = useLoading();
  const [user] = useState(initialUser);
  const [initialLoading, setInitialLoading] = useState(true);
  const [systemStats, setSystemStats] = useState({
    totalSchools: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0
  });

  // Fetch system-wide statistics
  const fetchSystemStats = async () => {
    console.log('🔄 Admin Dashboard: fetchSystemStats called');
    clearError();

    try {
      startLoading('fetchSystemStats', t('loadingDashboard', 'Loading dashboard...'));

      // Fetch school distribution data which contains the stats
      const response = await dashboardService.getSchoolDistribution();

      if (response.success) {
        setSystemStats({
          totalSchools: response.summary.totalSchools,
          totalStudents: response.summary.totalStudents,
          totalTeachers: response.summary.totalTeachers,
          totalClasses: response.summary.totalClasses
        });
      } else {
        console.error('Failed to fetch school distribution:', response.error);
        throw new Error(response.error || 'Failed to load school distribution');
      }

    } catch (error) {
      console.error('Error in fetchSystemStats:', error);
      handleError(error, {
        toastMessage: t('failedToLoadDashboard', 'Failed to load dashboard data')
      });
    } finally {
      stopLoading('fetchSystemStats');
      setInitialLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchSystemStats();
  }, []);

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
        <FadeInSection delay={100} className="mb-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
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
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {t('adminUser', 'Admin User')}
                </span>
                {user?.username && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {user.username}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeInSection>

        {/* System Statistics */}
        <FadeInSection delay={200} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title={t('totalSchools', 'Total Schools')}
            value={systemStats.totalSchools}
            icon={Building2}
            enhanced={true}
            gradientFrom="from-blue-500"
            gradientTo="to-blue-600"
            hoverColor="hover:border-blue-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalStudents', 'Total Students')}
            value={systemStats.totalStudents}
            icon={Users}
            enhanced={true}
            gradientFrom="from-green-500"
            gradientTo="to-green-600"
            hoverColor="hover:border-green-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalTeachers', 'Total Teachers')}
            value={systemStats.totalTeachers}
            icon={User}
            enhanced={true}
            gradientFrom="from-purple-500"
            gradientTo="to-purple-600"
            hoverColor="hover:border-purple-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalClasses', 'Total Classes')}
            value={systemStats.totalClasses}
            icon={BookOpen}
            enhanced={true}
            gradientFrom="from-orange-500"
            gradientTo="to-orange-600"
            hoverColor="hover:border-orange-200"
            responsive={true}
          />
        </FadeInSection>

        {/* Charts Grid */}
        <FadeInSection delay={300} className="grid grid-cols-1 gap-6 mb-6">
          {/* School Distribution Chart */}
          <div className="">
            <SchoolDistributionChart />
          </div>
        </FadeInSection>
      </div>
    </PageTransition>
  );
};

export default AdminDashboard;