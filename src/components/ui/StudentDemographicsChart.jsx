import { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { Users, Accessibility } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoading } from '../../contexts/LoadingContext';
import { dashboardService } from '../../utils/api/services/dashboardService';
import { useStableCallback } from '../../utils/reactOptimization';
import { ethnicGroupOptions, accessibilityOptions } from '../../utils/formOptions';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/ui/chart';
import { Button } from '../../components/ui/Button';

export default function StudentDemographicsChart({ schoolId, className = "", defaultTab = null, showBothTabs = false }) {
  const { t } = useLanguage();
  const { startLoading, stopLoading } = useLoading();
  const [activeTab, setActiveTab] = useState(defaultTab || 'ethnic'); // 'ethnic' or 'accessibility'
  const [ethnicGroupData, setEthnicGroupData] = useState([]);
  const [accessibilityData, setAccessibilityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const displayBothTabs = showBothTabs || !defaultTab;
  const fetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  const COLORS = useMemo(() => ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'], []);

  const chartConfig = useMemo(() => ({
    count: { label: t('count', 'Count') },
    ethnic: { label: t('ethnic', 'Ethnic Groups') },
    accessibility: { label: t('accessibility', 'Accessibility') },
  }), [t]);

  const fetchStudentDemographics = useStableCallback(async () => {
    if (!schoolId) {
      console.warn('⚠️ StudentDemographicsChart: No schoolId provided');
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchingRef.current) {
      console.log('⏸️ StudentDemographicsChart: Fetch already in progress, skipping');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      fetchingRef.current = true;
      startLoading('fetchDemographics', t('loadingChartData', 'Loading chart data...'));

      console.log('📊 StudentDemographicsChart: Fetching demographics for schoolId:', schoolId);

      // Fetch ethnic group and accessibility data in parallel using new endpoints
      const [ethnicResponse, accessibilityResponse] = await Promise.all([
        dashboardService.getStudentEthnicGroupDistribution({ schoolId, roleId: 9 }),
        dashboardService.getStudentAccessibilityDistribution({ schoolId, roleId: 9 })
      ]);

      console.log('📊 StudentDemographicsChart: Ethnic group response:', ethnicResponse);
      console.log('📊 StudentDemographicsChart: Accessibility response:', accessibilityResponse);

      // Process ethnic group data
      // API response structure: { totalStudents, ethnicGroupDistribution: [...], filters }
      if (ethnicResponse.success && ethnicResponse.data) {
        const ethnicDistribution = ethnicResponse.data.ethnicGroupDistribution || [];

        // Create map of value -> label for proper display
        const ethnicGroupLabelMap = {};
        ethnicGroupOptions.forEach(option => {
          ethnicGroupLabelMap[option.value] = option.label;
        });

        console.log('📊 Ethnic distribution array:', ethnicDistribution);

        // API returns data in format: [{ ethnicGroup: 'ខ្មែរ', count: 10 }, ...]
        const ethnicData = ethnicDistribution
          .map(item => ({
            name: ethnicGroupLabelMap[item.ethnicGroup] || item.ethnicGroup,
            count: parseInt(item.count) || 0
          }))
          .filter(item => item.count > 0)
          .sort((a, b) => b.count - a.count);

        console.log('✅ Processed ethnic data:', ethnicData);
        setEthnicGroupData(ethnicData);
      } else {
        console.warn('⚠️ Invalid ethnic group response:', ethnicResponse);
        setEthnicGroupData([]);
      }

      // Process accessibility data
      // API response structure: { totalStudents, studentsWithAccessibilityNeeds, accessibilityDistribution: [...], filters }
      if (accessibilityResponse.success && accessibilityResponse.data) {
        const accessibilityDistribution = accessibilityResponse.data.accessibilityDistribution || [];

        console.log('📊 Accessibility distribution array:', accessibilityDistribution);

        // API returns data in format: [{ accessibilityType: 'ពិបាកក្នុងការធ្វើចលនា', count: 5 }, ...]
        const accessData = accessibilityDistribution
          .map(item => ({
            name: item.accessibilityType,
            count: parseInt(item.count) || 0
          }))
          .filter(item => item.count > 0)
          .sort((a, b) => b.count - a.count);

        console.log('✅ Processed accessibility data:', accessData);
        setAccessibilityData(accessData);
      } else {
        console.warn('⚠️ Invalid accessibility response:', accessibilityResponse);
        setAccessibilityData([]);
      }
    } catch (err) {
      console.error('Failed to fetch student demographics:', err);
      setError(err.message);
    } finally {
      stopLoading('fetchDemographics');
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [schoolId]);

  useEffect(() => {
    // Only fetch once when component mounts or schoolId changes
    if (schoolId && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchStudentDemographics();
    }
  }, [schoolId, fetchStudentDemographics]);

  const chartData = activeTab === 'ethnic' ? ethnicGroupData : accessibilityData;

  if (loading) {
    return (
      <div className="bg-white rounded-sm border border-gray-200 p-6">
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
    console.error('❌ StudentDemographicsChart: Error occurred:', error);
    return null;
  }

  // When showing both tabs, check if BOTH datasets are empty
  if (displayBothTabs) {
    if (ethnicGroupData.length === 0 && accessibilityData.length === 0) {
      console.log('ℹ️ StudentDemographicsChart: No data available for both charts');
      return null;
    }
  } else {
    // When showing single tab, check if current tab's data is empty
    if (chartData.length === 0) {
      console.log('ℹ️ StudentDemographicsChart: No data available for current tab');
      return null;
    }
  }

  // Render both charts side-by-side when showBothTabs=true
  if (displayBothTabs) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Ethnic Groups Chart */}
        <div className="bg-white rounded-sm border border-gray-200 p-6">
          <div className="flex flex-row gap-3 items-center mb-6">
            <div className="grid gap-1">
              <h3 className="text-md font-bold text-gray-900">
                {t('studentEthnicGroupDistribution', 'Student Ethnic Group Distribution')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('topEthnicGroups', 'Top ethnic groups in school')}
              </p>
            </div>
          </div>
          <div className="overflow-y-auto">
            {ethnicGroupData.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-gray-500 text-sm">{t('noEthnicGroupData', 'No ethnic group data available')}</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="w-full h-auto" style={{ height: `${ethnicGroupData.length * 36 + 40}px` }}>
                <BarChart
                  data={ethnicGroupData}
                  margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={80}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip
                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={24}>
                    {ethnicGroupData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </div>

        {/* Accessibility Needs Chart */}
        <div className="bg-white rounded-sm border border-gray-200 p-6">
          <div className="flex flex-row gap-3 items-center mb-6">
            <div className="grid gap-1">
              <h3 className="text-md font-bold text-gray-900">
                {t('studentAccessibilityDistribution', 'Student Accessibility Needs')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('accessibilityDistribution', 'Distribution of accessibility needs')}
              </p>
            </div>
          </div>
          <div className="overflow-y-auto">
            {accessibilityData.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-gray-500 text-sm">{t('noAccessibilityData', 'No accessibility data available')}</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="w-full h-auto" style={{ height: `${accessibilityData.length * 36 + 40}px` }}>
                <BarChart
                  data={accessibilityData}
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
                  <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} barSize={24}>
                    {accessibilityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Single tab view (original behavior)
  return (
    <div className="bg-white rounded-sm border border-gray-200 p-6">
      {/* Header with Icon and Dropdown */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex sm:flex-row flex-col items-start sm:items-center justify-start sm:justify-between w-full gap-3">
          {/* Icon and Title */}
          <div className="flex flex-row gap-3 items-center">
            <div className={`w-12 h-12 rounded-sm flex items-center justify-center ${
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

          {/* Tabs Dropdown - Only show if not displaying both tabs */}
          {!displayBothTabs && (
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
        <ChartContainer config={chartConfig} className="w-full h-auto" style={{ height: `${chartData.length * 36 + 40}px` }}>
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
            <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={24}>
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
