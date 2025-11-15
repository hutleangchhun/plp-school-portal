import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { Users, Accessibility } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoading } from '../../contexts/LoadingContext';
import { fetchStudentsWithFullData } from '../../pages/reports/fetchers/baseFetcher';
import { ethnicGroupOptions, accessibilityOptions } from '../../utils/formOptions';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/ui/chart';
import { Button } from '../../components/ui/Button';

export default function StudentDemographicsChart({ schoolId, className = "", defaultTab = null }) {
  const { t } = useLanguage();
  const { startLoading, stopLoading } = useLoading();
  const [activeTab, setActiveTab] = useState(defaultTab || 'ethnic'); // 'ethnic' or 'accessibility'
  const [ethnicGroupData, setEthnicGroupData] = useState([]);
  const [accessibilityData, setAccessibilityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const COLORS = useMemo(() => ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'], []);

  const chartConfig = useMemo(() => ({
    count: { label: t('count', 'Count') },
    ethnic: { label: t('ethnic', 'Ethnic Groups') },
    accessibility: { label: t('accessibility', 'Accessibility') },
  }), [t]);

  const fetchStudentDemographics = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      startLoading('fetchDemographics', t('loadingChartData', 'Loading chart data...'));

      // Fetch ethnic minority students (using backend filter)
      console.log('🌍 Fetching ethnic minority students for dashboard');
      const ethnicStudents = await fetchStudentsWithFullData(schoolId, {
        apiFilters: { isEtnicgroup: true }
      });

      console.log(`✅ Dashboard: Backend filtered ${ethnicStudents.length} ethnic minority students`);

      // Process ethnic group data - group by ethnic_group field
      // Create map of value -> label for proper display
      const ethnicGroupLabelMap = {};
      ethnicGroupOptions.forEach(option => {
        ethnicGroupLabelMap[option.value] = option.label;
      });

      // Count students in each ethnic group
      const ethnicGroupCountMap = {};
      ethnicStudents.forEach(student => {
        const ethnicGroup = student.ethnic_group;
        if (ethnicGroup && ethnicGroup !== '' && ethnicGroup !== 'null') {
          if (ethnicGroupLabelMap.hasOwnProperty(ethnicGroup)) {
            ethnicGroupCountMap[ethnicGroup] = (ethnicGroupCountMap[ethnicGroup] || 0) + 1;
          }
        }
      });

      const ethnicData = Object.entries(ethnicGroupCountMap)
        .map(([groupValue, count]) => ({
          name: ethnicGroupLabelMap[groupValue],  // Use label for display
          count: count
        }))
        .filter(item => item.count > 0)  // Only show groups with students
        .sort((a, b) => b.count - a.count);

      console.log('✅ Ethnic groups found:', ethnicData.length, ethnicData);
      setEthnicGroupData(ethnicData);

      // Fetch students with accessibility needs (using backend filter)
      console.log('🦽 Fetching students with accessibility needs for dashboard');
      const accessibilityStudents = await fetchStudentsWithFullData(schoolId, {
        apiFilters: { hasAccessibility: true }
      });

      console.log(`✅ Dashboard: Backend filtered ${accessibilityStudents.length} students with accessibility needs`);

      // Process accessibility data - group by accessibility field
      // Initialize map with all accessibility options (count = 0)
      const accessibilityMap = {};
      accessibilityOptions.forEach(option => {
        accessibilityMap[option.label] = 0;
      });

      // Count students in each accessibility need
      accessibilityStudents.forEach(student => {
        const accessibility = student.accessibility;

        if (accessibility && accessibility !== '' && accessibility !== 'null') {
          // Handle array of accessibility needs
          if (Array.isArray(accessibility)) {
            accessibility.forEach(need => {
              if (need && need !== '' && need !== 'null') {
                if (accessibilityMap.hasOwnProperty(need)) {
                  accessibilityMap[need]++;
                }
              }
            });
          } else {
            if (accessibilityMap.hasOwnProperty(accessibility)) {
              accessibilityMap[accessibility]++;
            }
          }
        }
      });

      const accessData = Object.entries(accessibilityMap)
        .map(([need, count]) => ({
          name: need,
          count: count
        }))
        .filter(item => item.count > 0)  // Only show needs with students
        .sort((a, b) => b.count - a.count);

      console.log('✅ Accessibility needs found:', accessData.length, accessData);
      setAccessibilityData(accessData);
    } catch (err) {
      console.error('Failed to fetch student demographics:', err);
      setError(err.message);
    } finally {
      stopLoading('fetchDemographics');
      setLoading(false);
    }
  }, [schoolId, t, startLoading, stopLoading]);

  useEffect(() => {
    fetchStudentDemographics();
  }, [fetchStudentDemographics]);

  const chartData = activeTab === 'ethnic' ? ethnicGroupData : accessibilityData;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('loadingChartData', 'Loading chart data...')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-red-600 text-center">
          <p>{t('error', 'Error')}: {error}</p>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-gray-600 text-center">
          <p>{t('noData', 'No data available')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header with Icon and Dropdown */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex sm:flex-row flex-col items-start sm:items-center justify-start sm:justify-between w-full gap-3">
          {/* Icon and Title */}
          <div className="flex flex-row gap-3 items-center">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              activeTab === 'ethnic' ? 'bg-blue-600' : 'bg-green-600'
            }`}>
              {activeTab === 'ethnic' ? (
                <Users className="h-5 w-5 text-white" />
              ) : (
                <Accessibility className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="grid gap-1">
              <h3 className="text-md font-bold text-gray-900">
                {activeTab === 'ethnic'
                  ? t('studentEthnicGroupDistribution', 'Student Ethnic Group Distribution')
                  : t('studentAccessibilityDistribution', 'Student Accessibility Needs')}
              </h3>
              <p className="text-sm text-gray-500">
                {activeTab === 'ethnic'
                  ? t('topEthnicGroups', 'Top ethnic groups in school')
                  : t('accessibilityDistribution', 'Distribution of accessibility needs')}
              </p>
            </div>
          </div>

          {/* Tabs Dropdown - Only show if defaultTab is not specified */}
          {!defaultTab && (
            <div className="flex gap-2">
              <Button
                onClick={() => setActiveTab('ethnic')}
                variant={activeTab === 'ethnic' ? 'primary' : 'outline'}
                size="sm"
              >
                {t('ethnicGroup', 'Ethnic Groups')}
              </Button>
              <Button
                onClick={() => setActiveTab('accessibility')}
                variant={activeTab === 'accessibility' ? 'success' : 'outline'}
                size="sm"
              >
                {t('accessibility', 'Accessibility')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-y-auto">
        <ChartContainer config={chartConfig} className="w-full h-auto" style={{ height: `${chartData.length * 50 + 50}px` }}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis
              dataKey="name"
              type="category"
              width={100}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={40}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
