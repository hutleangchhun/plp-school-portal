import { useState, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoading } from '../../contexts/LoadingContext';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/ui/chart';
import { dashboardService } from '../../utils/api/services/dashboardService';
import { useStableCallback } from '../../utils/reactOptimization';

export default function BMIPieChart({ schoolId, className = "" }) {
  const { t } = useLanguage();
  const { startLoading, stopLoading } = useLoading();
  const [bmiCategoryData, setBmiCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const fetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  // BMI Category Colors - Distinct and vibrant
  // Uses Khmer keys to match bmiService.utils.getBmiCategory() output
  const BMI_COLORS = useMemo(() => ({
    'ធាត់': '#dc2626', // Dark Red - Obese
    'លើសទម្ងន់': '#ea580c', // Deep Orange - Overweight
    'ធម្មតា': '#16a34a', // Forest Green - Normal (Healthy)
    'ស្គម': '#0369a1', // Deep Sky Blue - Underweight
    'ស្គមខ្លាំង': '#4D179A', // Dark Gray - Unknown
    'មិនបានកំណត់': '#6b7280' // Dark Gray - Unknown
  }), []);

  // BMI Category Labels in Khmer and English
  const getBMICategoryLabel = (category) => {
    const labels = {
      'ធាត់': 'ធាត់',
      'លើសទម្ងន់': 'លើសទម្ងន់',
      'ធម្មតា': 'ធម្មតា',
      'ស្គម': 'ស្គម',
      'ស្គមខ្លាំង': 'ស្គមខ្លាំង',
      'មិនបានកំណត់': 'មិនបានកំណត់'
    };
    return labels[category] || category;
  };

  const fetchBMIData = useStableCallback(async () => {
    if (!schoolId) {
      console.warn('⚠️ BMIPieChart: No schoolId provided');
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchingRef.current) {
      console.log('⏸️ BMIPieChart: Fetch already in progress, skipping');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      fetchingRef.current = true;
      startLoading('fetchBMIData', t('loadingBMIData', 'Loading BMI data...'));

      console.log('📊 BMIPieChart: Fetching BMI data for schoolId:', schoolId);

      // Get current academic year (e.g., "2024-2025")
      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;

      // Fetch BMI distribution from dashboard API endpoint
      const response = await dashboardService.getBMIDistribution(schoolId, {
        academicYear: academicYear
      });

      console.log('📊 BMIPieChart: BMI response:', response);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch BMI data');
      }

      const chartData = response.data;
      console.log('chartData', chartData);
      const summary = response.summary;

      console.log(`✅ Fetched BMI data for ${summary.totalStudents} students`);
      console.log(`📊 Students with BMI data: ${summary.studentsWithBMIData}`);
      console.log('✅ BMI Category Distribution:', chartData);

      // If no students have BMI data, don't show the chart
      if (!summary.studentsWithBMIData || summary.studentsWithBMIData === 0) {
        setBmiCategoryData([]);
        setTotalStudents(summary.totalStudents || 0);
        return;
      }

      // Add display names to chart data
      const chartDataWithLabels = chartData.map(item => ({
        ...item,
        displayName: getBMICategoryLabel(item.name)
      }));

      setTotalStudents(summary.totalStudents || 0);
      setBmiCategoryData(chartDataWithLabels);

      console.log('✅ BMIPieChart: Data set successfully');
    } catch (err) {
      console.error('❌ BMIPieChart: Failed to fetch BMI data:', err);
      setError(err.message);
    } finally {
      stopLoading('fetchBMIData');
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [schoolId]);

  useEffect(() => {
    // Only fetch once when component mounts or schoolId changes
    if (schoolId && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchBMIData();
    }
  }, [schoolId, fetchBMIData]);

  if (loading) {
    return (
      <div className="bg-white rounded-md border border-gray-200 p-6">
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
    return null;
  }

  if (bmiCategoryData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-md border border-gray-200 p-6">
      {/* Header with Icon and Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-md flex items-center justify-center bg-purple-600">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div className="grid gap-1">
          <h3 className="text-md font-bold text-gray-900">
            {t('studentBMIDistribution', 'Student BMI Distribution')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('bmiCategoryBreakdown', `BMI Category Breakdown`)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="flex flex-col items-center justify-center">
        <ChartContainer
          config={{
            value: {
              label: t('students', 'Students')
            },
          }}
          className="w-full h-[350px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={bmiCategoryData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ displayName, percentage }) => `${displayName} ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {bmiCategoryData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={BMI_COLORS[entry.name] || '#9ca3af'}
                  />
                ))}
              </Pie>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [value, t('students', 'Students')]}
                  />
                }
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => `${value}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}
