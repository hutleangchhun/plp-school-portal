import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { bmiService } from '../../utils/api/services/bmiService';
import { ArrowLeft, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

const BMIReport = () => {
  const { t } = useLanguage();
  const { error, handleError, clearError } = useErrorHandler();

  // State management
  const [loading, setLoading] = useState(true);
  const [bmiData, setBmiData] = useState([]);
  const [allBmiData, setAllBmiData] = useState([]); // Store all data for charts
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    academicYear: ''
  });
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [showChart, setShowChart] = useState(true);

  // Generate academic year options
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -2; i <= 2; i++) {
      const year = currentYear + i;
      years.push({
        value: `${year}-${year + 1}`,
        label: `${year}-${year + 1}`
      });
    }
    setAcademicYearOptions(years);
  }, []);

  // Fetch all BMI data across academic years for charts (define before useEffect)
  const fetchAllBmiDataForCharts = useCallback(async () => {
    try {
      const allYears = [];
      const currentYear = new Date().getFullYear();

      // Fetch data for multiple years
      for (let i = -2; i <= 2; i++) {
        const year = currentYear + i;
        const yearString = `${year}-${year + 1}`;

        const response = await bmiService.getBmiReportAllUsers({
          academicYear: yearString,
          limit: 100,
          page: 1
        });

        if (response.success && response.data) {
          // Handle both array and object response formats
          const dataArray = Array.isArray(response.data) ? response.data : (response.data.data || []);
          if (dataArray.length > 0) {
            allYears.push(...dataArray);
          }
        }
      }

      setAllBmiData(allYears);
    } catch (err) {
      console.error('Error fetching all BMI data for charts:', err);
    }
  }, []);

  // Fetch BMI report data
  const fetchBmiReport = useCallback(async (page = 1) => {
    clearError();
    setLoading(true);

    try {
      const params = {
        page,
        limit: pagination.limit
      };

      // Add academic year filter if selected
      if (filters.academicYear) {
        params.academicYear = filters.academicYear;
      }

      console.log('📊 Fetching BMI report with params:', params);

      const response = await bmiService.getBmiReportAllUsers(params);

      if (response.success) {
        setBmiData(response.data || []);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            page: response.pagination.page || 1,
            total: response.pagination.total || 0,
            totalPages: response.pagination.totalPages || 1
          }));
        }
      } else {
        throw new Error(response.error || 'Failed to fetch BMI report');
      }
    } catch (err) {
      console.error('Error fetching BMI report:', err);
      handleError(err, {
        toastMessage: t('failedToLoadBMIReport', 'Failed to load BMI report')
      });
    } finally {
      setLoading(false);
    }
  }, [filters.academicYear, pagination.limit, clearError, handleError, t]);

  // Initial fetch
  useEffect(() => {
    fetchBmiReport(1);
  }, [filters.academicYear]);

  // Fetch all data for charts on mount
  useEffect(() => {
    fetchAllBmiDataForCharts();
  }, [fetchAllBmiDataForCharts]);

  // Handle filter change
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle pagination
  const handlePreviousPage = () => {
    if (pagination.page > 1) {
      fetchBmiReport(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      fetchBmiReport(pagination.page + 1);
    }
  };

  // Helper function to get BMI category color
  const getBmiStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';

    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('normal')) return 'bg-green-100 text-green-800';
    if (lowerStatus.includes('obese') || lowerStatus.includes('3sd')) return 'bg-red-100 text-red-800';
    if (lowerStatus.includes('overweight') || lowerStatus.includes('2sd')) return 'bg-orange-100 text-orange-800';
    if (lowerStatus.includes('thin') || lowerStatus.includes('-')) return 'bg-blue-100 text-blue-800';

    return 'bg-gray-100 text-gray-800';
  };

  // Generate chart data for BMI trends by academic year
  const chartData = useMemo(() => {
    if (allBmiData.length === 0) return [];

    // Group data by academic year and calculate average BMI
    const yearMap = new Map();

    allBmiData.forEach(record => {
      const year = record.academicYear || 'Unknown';
      if (!yearMap.has(year)) {
        yearMap.set(year, {
          year,
          totalBmi: 0,
          count: 0,
          normalCount: 0,
          overweightCount: 0,
          obeseCount: 0,
          thinCount: 0
        });
      }

      const entry = yearMap.get(year);
      const bmiValue = typeof record.bmi === 'string' ? parseFloat(record.bmi) : record.bmi;

      entry.totalBmi += bmiValue;
      entry.count += 1;

      // Count by status
      const status = (record.bmiStatus || '').toLowerCase();
      if (status.includes('normal')) entry.normalCount += 1;
      else if (status.includes('overweight') || status.includes('2sd')) entry.overweightCount += 1;
      else if (status.includes('obese') || status.includes('3sd')) entry.obeseCount += 1;
      else if (status.includes('thin') || status.includes('-')) entry.thinCount += 1;
    });

    // Convert to sorted array and calculate averages
    return Array.from(yearMap.values())
      .sort((a, b) => a.year.localeCompare(b.year))
      .map(entry => ({
        ...entry,
        averageBmi: parseFloat((entry.totalBmi / entry.count).toFixed(2))
      }));
  }, [allBmiData]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!bmiData || bmiData.length === 0) {
      handleError(new Error('No data to export'));
      return;
    }

    try {
      // Prepare CSV headers
      const headers = [
        'User ID',
        'User Name',
        'Email',
        'Academic Year',
        'Weight (kg)',
        'Height (cm)',
        'BMI',
        'BMI Status',
        'Recorded At'
      ];

      // Prepare CSV rows
      const rows = bmiData.map(record => [
        record.userId || '-',
        record.userName || '-',
        record.email || '-',
        record.academicYear || '-',
        record.weight_kg || '-',
        record.height_cm || '-',
        typeof record.bmi === 'string' ? parseFloat(record.bmi).toFixed(2) : (record.bmi ? record.bmi.toFixed(2) : '-'),
        record.bmiStatus || '-',
        record.recordedAt ? new Date(record.recordedAt).toLocaleDateString() : '-'
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `bmi-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      handleError(err, {
        toastMessage: t('failedToExportData', 'Failed to export data')
      });
    }
  };

  // Loading state
  if (loading && bmiData.length === 0) {
    return (
      <PageLoader
        message={t('loadingBMIReport', 'Loading BMI report...')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Error state
  if (error && bmiData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back', 'Back')}
          </Button>
          <ErrorDisplay
            error={error}
            onRetry={() => fetchBmiReport(pagination.page)}
            size="lg"
            className="min-h-[400px]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('bmiReport', 'BMI Report')}</h1>
              <p className="text-gray-600 mt-2">{t('bmiReportDescription', 'View and manage BMI data for all users')}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCSV}
              disabled={bmiData.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {t('export', 'Export')}
            </Button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900">{t('filters', 'Filters')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('academicYear', 'Academic Year')}
                </label>
                <Dropdown
                  options={[
                    { value: '', label: t('all', 'All Years') },
                    ...academicYearOptions
                  ]}
                  value={filters.academicYear}
                  onValueChange={(value) => handleFilterChange('academicYear', value)}
                  placeholder={t('selectYear', 'Select year')}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        {showChart && chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Average BMI Trend Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('averageBmiTrend', 'Average BMI Trend')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis domain={[0, 40]} />
                  <Tooltip
                    formatter={(value) => value.toFixed(2)}
                    contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="averageBmi"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 5 }}
                    activeDot={{ r: 7 }}
                    name={t('averageBmi', 'Average BMI')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* BMI Status Distribution Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('bmiDistribution', 'BMI Status Distribution')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }} />
                  <Legend />
                  <Bar dataKey="normalCount" fill="#10b981" name={t('normal', 'Normal')} />
                  <Bar dataKey="overweightCount" fill="#f59e0b" name={t('overweight', 'Overweight')} />
                  <Bar dataKey="obeseCount" fill="#ef4444" name={t('obese', 'Obese')} />
                  <Bar dataKey="thinCount" fill="#6366f1" name={t('underweight', 'Underweight')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">{t('userName', 'User Name')}</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">{t('email', 'Email')}</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">{t('academicYear', 'Academic Year')}</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-900">{t('weight', 'Weight')} (kg)</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-900">{t('height', 'Height')} (cm)</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-900">{t('bmi', 'BMI')}</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">{t('status', 'Status')}</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">{t('recordedAt', 'Recorded At')}</th>
                </tr>
              </thead>
              <tbody>
                {bmiData.length > 0 ? (
                  bmiData.map((record, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 text-gray-900 font-medium">{record.userName || '-'}</td>
                      <td className="px-6 py-4 text-gray-600">{record.email || '-'}</td>
                      <td className="px-6 py-4 text-gray-600">{record.academicYear || '-'}</td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {record.weight_kg ? record.weight_kg.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {record.height_cm || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-gray-900">
                          {record.bmi ? (typeof record.bmi === 'string' ? parseFloat(record.bmi).toFixed(2) : record.bmi.toFixed(2)) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getBmiStatusColor(record.bmiStatus)}`}>
                          {record.bmiStatus || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {record.recordedAt ? new Date(record.recordedAt).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      {t('noBMIData', 'No BMI data available')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                {t('page', 'Page')} {pagination.page} {t('of', 'of')} {pagination.totalPages}
                {' - '}
                {t('total', 'Total')}: {pagination.total} {t('records', 'records')}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={pagination.page === 1}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('previous', 'Previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={pagination.page === pagination.totalPages}
                  className="flex items-center gap-2"
                >
                  {t('next', 'Next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BMIReport;
