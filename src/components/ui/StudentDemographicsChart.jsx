import { useState, useEffect, useMemo } from 'react';
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

  const COLORS = useMemo(() => ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'], []);

  const chartConfig = useMemo(() => ({
    count: { label: t('count', 'Count') },
    ethnic: { label: t('ethnic', 'Ethnic Groups') },
    accessibility: { label: t('accessibility', 'Accessibility') },
  }), [t]);

  const fetchStudentDemographics = useStableCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      startLoading('fetchDemographics', t('loadingChartData', 'Loading chart data...'));

      // Fetch ALL students with demographics in ONE call to avoid duplicate API requests
      console.log('📊 Fetching all students demographics for dashboard charts');
      const demographicsData = await dashboardService.fetchAllStudentsDemographics(schoolId);

      const ethnicStudents = demographicsData.ethnic;
      const accessibilityStudents = demographicsData.accessibility;

      console.log(`✅ Dashboard: Fetched ${ethnicStudents.length} ethnic minority students`);

      // Process ethnic group data - group by ethnic_group field
      // Create map of value -> label for proper display
      const ethnicGroupLabelMap = {};
      ethnicGroupOptions.forEach(option => {
        ethnicGroupLabelMap[option.value] = option.label;
      });

      // Count students in each ethnic group
      const ethnicGroupCountMap = {};
      let ethnicGroupsFound = 0;

      ethnicStudents.forEach((student, index) => {
        // Check multiple possible field locations - direct fields first since that's where they are
        let ethnicGroup = student.ethnic_group ||
                          student.ethnicGroup ||
                          student.user?.ethnic_group ||
                          student.student?.ethnic_group ||
                          student.user?.ethnicGroup ||
                          '';

        // Handle empty arrays or invalid values
        if (Array.isArray(ethnicGroup) && ethnicGroup.length > 0) {
          ethnicGroup = ethnicGroup[0]; // Take first item if it's an array
        }

        if (ethnicGroup && ethnicGroup !== '' && ethnicGroup !== 'null' && ethnicGroup !== 'none' && ethnicGroup !== 'None') {
          if (ethnicGroupLabelMap.hasOwnProperty(ethnicGroup)) {
            ethnicGroupCountMap[ethnicGroup] = (ethnicGroupCountMap[ethnicGroup] || 0) + 1;
            ethnicGroupsFound++;
          } else {
            if (index < 3) {
              console.warn(`⚠️ Ethnic group "${ethnicGroup}" not found in label map. Available keys:`, Object.keys(ethnicGroupLabelMap));
            }
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

      setEthnicGroupData(ethnicData);

      console.log(`✅ Dashboard: Fetched ${accessibilityStudents.length} students with accessibility needs`);

      // Process accessibility data - group by accessibility field
      // Initialize map with all accessibility options (count = 0)
      const accessibilityMap = {};
      accessibilityOptions.forEach(option => {
        accessibilityMap[option.label] = 0;
      });

      // Count students in each accessibility need
      let accessibilityNeedsFound = 0;

      accessibilityStudents.forEach((student, index) => {
        // Check multiple possible field locations - direct fields first since that's where they are
        let accessibility = student.accessibility ||
                            student.specialNeeds ||
                            student.user?.accessibility ||
                            student.student?.accessibility ||
                            student.user?.specialNeeds ||
                            student.special_needs ||
                            student.user?.special_needs ||
                            null;

        // Skip empty arrays
        if (Array.isArray(accessibility) && accessibility.length === 0) {
          accessibility = null;
        }

        if (accessibility && accessibility !== '' && accessibility !== 'null' && accessibility !== 'none' && accessibility !== 'None') {
          // Handle array of accessibility needs
          if (Array.isArray(accessibility)) {
            accessibility.forEach(need => {
              if (need && need !== '' && need !== 'null' && need !== 'none' && need !== 'None') {
                if (accessibilityMap.hasOwnProperty(need)) {
                  accessibilityMap[need]++;
                  accessibilityNeedsFound++;
                } else {
                  if (index < 3) {
                    console.warn(`⚠️ Accessibility need "${need}" not found in map. Available needs:`, Object.keys(accessibilityMap));
                  }
                }
              }
            });
          } else {
            if (accessibilityMap.hasOwnProperty(accessibility)) {
              accessibilityMap[accessibility]++;
              accessibilityNeedsFound++;
            } else {
              if (index < 3) {
                console.warn(`⚠️ Accessibility "${accessibility}" not found in map. Available needs:`, Object.keys(accessibilityMap));
              }
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

      setAccessibilityData(accessData);
    } catch (err) {
      console.error('Failed to fetch student demographics:', err);
      setError(err.message);
    } finally {
      stopLoading('fetchDemographics');
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchStudentDemographics();
  }, [schoolId]);

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
          <p className="text-sm mt-2 text-gray-500">
            {activeTab === 'ethnic'
              ? 'Ethnic group data not yet populated in student profiles'
              : 'Accessibility data not yet populated in student profiles'}
          </p>
        </div>
      </div>
    );
  }

  // Render both charts side-by-side when showBothTabs=true
  if (displayBothTabs) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Ethnic Groups Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-row gap-3 items-center mb-6">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-600">
              <Users className="h-5 w-5 text-white" />
            </div>
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
            <ChartContainer config={chartConfig} className="w-full h-auto" style={{ height: `${ethnicGroupData.length * 50 + 50}px` }}>
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
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={40}>
                  {ethnicGroupData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        {/* Accessibility Needs Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-row gap-3 items-center mb-6">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-600">
              <Accessibility className="h-5 w-5 text-white" />
            </div>
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
            <ChartContainer config={chartConfig} className="w-full h-auto" style={{ height: `${accessibilityData.length * 50 + 50}px` }}>
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
                <Bar dataKey="count" fill="#10b981" radius={[0, 8, 8, 0]} barSize={40}>
                  {accessibilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    );
  }

  // Single tab view (original behavior)
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
