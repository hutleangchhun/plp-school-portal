import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { dashboardService } from '../../utils/api/services/dashboardService';
import DynamicLoader from '../ui/DynamicLoader';

/**
 * StudentGradeAndKindergartenDashboard Component
 * Combines Poor Card Grade and Kindergarten statistics
 * Displays charts for both datasets without stats cards or tables
 * @param {Object} props - Component props
 * @param {Object} props.filters - Location filters (selectedProvince, selectedDistrict, selectedSchool)
 */
const StudentGradeAndKindergartenDashboard = ({ filters = {} }) => {
  const { t } = useLanguage();
  const { error, handleError, clearError } = useErrorHandler();

  const [poorCardGradeStats, setPoorCardGradeStats] = useState(null);
  const [kindergartenStats, setKindergartenStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  // Chart colors
  const POOR_CARD_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  const KINDERGARTEN_COLORS = ['#10b981', '#f59e0b'];

  // Helper function to get grade label
  const getGradeLabel = (poorCardGrade) => {
    switch (poorCardGrade) {
      case '1':
        return t('gradeOne', 'Grade 1');
      case '2':
        return t('gradeTwo', 'Grade 2');
      case 'ហានិភ័យ':
      case 'Risk':
        return t('gradeRisk', 'Risk');
      default:
        return poorCardGrade;
    }
  };

  const fetchStats = useCallback(async () => {
    if (fetchingRef.current) {
      console.log('⏸️ StudentGradeAndKindergartenDashboard: Fetch already in progress, skipping');
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      clearError();

      console.log('🔍 StudentGradeAndKindergartenDashboard: Fetching statistics with filters:', {
        provinceId: filters.selectedProvince,
        districtId: filters.selectedDistrict,
        schoolId: filters.selectedSchool
      });

      // Build params object with active filters
      const params = {};
      if (filters.selectedProvince) params.provinceId = parseInt(filters.selectedProvince, 10);
      if (filters.selectedDistrict) params.districtId = parseInt(filters.selectedDistrict, 10);
      if (filters.selectedSchool) params.schoolId = parseInt(filters.selectedSchool, 10);

      // Fetch both datasets in parallel
      const [poorCardResponse, kindergartenResponse] = await Promise.all([
        dashboardService.getStudentPoorCardGradeStats(params),
        dashboardService.getStudentKindergartenStats(params)
      ]);

      console.log('📊 StudentGradeAndKindergartenDashboard: Poor Card Response:', poorCardResponse);
      console.log('📊 StudentGradeAndKindergartenDashboard: Kindergarten Response:', kindergartenResponse);

      if (!poorCardResponse.success || !kindergartenResponse.success) {
        throw new Error('Failed to fetch statistics');
      }

      setPoorCardGradeStats(poorCardResponse.data);
      setKindergartenStats(kindergartenResponse.data);
    } catch (err) {
      console.error('❌ StudentGradeAndKindergartenDashboard: Error fetching statistics:', err);
      handleError(err, {
        toastMessage: t('failedToLoadStats', 'Failed to load statistics')
      });
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [filters.selectedProvince, filters.selectedDistrict, filters.selectedSchool, t, clearError, handleError]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-8">
        {/* Poor Card Grade Section Skeleton */}
        <div>
          <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-gray-200 shadow-sm rounded-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  {t('poorCardGradeDistribution', 'Poor Card Grade Distribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <DynamicLoader />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm rounded-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  {t('poorCardGradeBreakdown', 'Poor Card Grade Breakdown')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <DynamicLoader />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Kindergarten Section Skeleton */}
        <div>
          <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-gray-200 shadow-sm rounded-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  {t('kindergartenDistribution', 'Kindergarten Distribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <DynamicLoader />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm rounded-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  {t('studentTypeBreakdown', 'Student Type Breakdown')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <DynamicLoader />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">
            <p>{t('errorLoadingData', 'Error loading data')}</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare Poor Card Grade chart data
  const poorCardChartData =
    poorCardGradeStats?.poorCardGradeDistribution?.map((item) => ({
      name: getGradeLabel(item.poorCardGrade),
      value: item.count,
      percentage: item.percentage,
      originalGrade: item.poorCardGrade,
    })) || [];

  // Prepare Kindergarten chart data
  const kindergartenChartData = [
    {
      name: t('kindergarten', 'Kindergarten'),
      value: kindergartenStats?.totalKindergartenStudents || 0
    },
    {
      name: t('nonKindergarten', 'Non-Kindergarten'),
      value: kindergartenStats?.totalNonKindergartenStudents || 0
    }
  ].filter(item => item.value > 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
      {/* ============ Poor Card Grade Chart ============ */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('poorCardGradeStatistics', 'Poor Card Grade Statistics')}
        </h3>

        {poorCardChartData.length > 0 && (
          <Card className="border border-gray-200 shadow-sm rounded-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {t('poorCardGradeDistribution', 'Poor Card Grade Distribution')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full" style={{ height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={poorCardChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percentage }) =>
                        `${name} (${percentage.toFixed(2)}%)`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {poorCardChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={POOR_CARD_COLORS[index % POOR_CARD_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) =>
                        `${value} (${props.payload.percentage.toFixed(1)}%)`
                      }
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ============ Kindergarten Chart ============ */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('kindergartenStatistics', 'Kindergarten Statistics')}
        </h3>

        {kindergartenChartData.length > 0 && (
          <Card className="border border-gray-200 shadow-sm rounded-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {t('kindergartenDistribution', 'Kindergarten Distribution')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={kindergartenChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) =>
                      `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {kindergartenChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={KINDERGARTEN_COLORS[index % KINDERGARTEN_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px'
                    }}
                    formatter={(value) => [value, 'Students']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudentGradeAndKindergartenDashboard;
