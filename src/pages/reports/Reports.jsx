import { useState, useEffect } from 'react';
import { BarChart3, Download, Filter, Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import DynamicLoader from '../../components/ui/DynamicLoader';
import Dropdown from '../../components/ui/Dropdown';

export default function Reports() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [selectedReport, setSelectedReport] = useState('report1');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);

  // 16 Report Types - waiting for your specific report names
  const reportTypes = [
    { value: 'reportStudent', label: t('reportStudentNameInfo', 'បញ្ជីហៅឈ្មោះសិស្ស') },
    { value: 'report2', label: t('report2', 'បញ្ជីហៅឈ្មោះសិស្សតាមថ្នាក់') },
    { value: 'report3', label: t('report3', 'បញ្ជីមធ្យមភាគសិស្ស') },
    { value: 'report4', label: t('report4', 'បញ្ជីអវត្តមានសិស្ស') },
    { value: 'report5', label: t('report5', 'បញ្ជីឈ្មោះសិស្សអាហារូបករណ៍') },
    { value: 'report6', label: t('report6', 'បញ្ជីឈ្មោះសិស្សមានពិការភាព') },
    { value: 'report7', label: t('report7', 'បញ្ជីឈ្មោះសិស្សមានបញ្ហាសុខភាព') },
    { value: 'report8', label: t('report8', 'បញ្ជីឈ្មោះសិស្សមានបញ្ហាផ្ទាល់ខ្លួន') },
    { value: 'report9', label: t('report9', 'បញ្ជីឈ្មោះសិស្សជាជនជាតិដើមភាគតិច') },
    { value: 'report10', label: t('report10', 'បញ្ជីឈ្មោះសិស្សផ្លាស់ប្ដូរថ្នាក់') },
    { value: 'report11', label: t('report11', 'បញ្ជីឈ្មោះសិស្សបោះបង់ការសិក្សារ') },
    { value: 'report12', label: t('report12', 'សៀវភៅតាមដាន') },
    { value: 'report13', label: t('report13', 'សៀវភៅសិក្ខាគារិក') },
  ];

  // Time Period Options
  const timePeriods = [
    { value: 'month', label: t('month', 'By Month') },
    { value: 'semester1', label: t('semester1', 'Semester 1') },
    { value: 'semester2', label: t('semester2', 'Semester 2') },
    { value: 'year', label: t('year', 'By Year') }
  ];

  // Month Options (1-12)
  const monthOptions = [
    { value: '1', label: t('january', 'January') },
    { value: '2', label: t('february', 'February') },
    { value: '3', label: t('march', 'March') },
    { value: '4', label: t('april', 'April') },
    { value: '5', label: t('may', 'May') },
    { value: '6', label: t('june', 'June') },
    { value: '7', label: t('july', 'July') },
    { value: '8', label: t('august', 'August') },
    { value: '9', label: t('september', 'September') },
    { value: '10', label: t('october', 'October') },
    { value: '11', label: t('november', 'November') },
    { value: '12', label: t('december', 'December') }
  ];

  // Year Options (current year and previous 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => ({
    value: (currentYear - i).toString(),
    label: (currentYear - i).toString()
  }));

  useEffect(() => {
    fetchReportData();
  }, [selectedReport, selectedPeriod, selectedMonth, selectedYear]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Simulate API call to fetch report data
      await new Promise(resolve => setTimeout(resolve, 1000));

      // TODO: Implement actual API call to fetch report data based on:
      // - selectedReport (report type)
      // - selectedPeriod (month/semester1/semester2/year)
      // - selectedMonth (if period is 'month')
      // - selectedYear

      console.log('Fetching report:', {
        report: selectedReport,
        period: selectedPeriod,
        month: selectedMonth,
        year: selectedYear
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      showError(t('errorFetchingReportData', 'Error fetching report data'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate export
      const reportName = reportTypes.find(r => r.value === selectedReport)?.label;
      const periodName = timePeriods.find(p => p.value === selectedPeriod)?.label;
      const monthName = selectedPeriod === 'month' && selectedMonth
        ? monthOptions.find(m => m.value === selectedMonth)?.label
        : '';

      const exportDetails = `${reportName} - ${periodName}${monthName ? ` (${monthName})` : ''} - ${selectedYear}`;
      showSuccess(t('reportExportedSuccessfully', `Report exported: ${exportDetails}`));
    } catch (error) {
      showError(t('errorExportingReport', 'Error exporting report'));
    } finally {
      setLoading(false);
    }
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <DynamicLoader
            type="spinner"
            size="xl"
            variant="primary"
            message="Loading report data..."
          />
        </div>
      );
    }

    // Generic report placeholder for all 16 report types
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {reportTypes.find(r => r.value === selectedReport)?.label || 'Report'}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('reportContentWillAppear', 'Report content will appear here')}
          </p>
          <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
            <span>Period: {timePeriods.find(p => p.value === selectedPeriod)?.label}</span>
            {selectedPeriod === 'month' && selectedMonth && (
              <span>• Month: {monthOptions.find(m => m.value === selectedMonth)?.label}</span>
            )}
            <span>• Year: {selectedYear}</span>
          </div>
        </div>

        {/* Placeholder content grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-8 bg-gray-100 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{t('note', 'Note')}:</strong> {t('reportImplementationNote', 'This is a placeholder. Replace with actual report implementation for each of the 16 report types.')}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('reports') || 'Reports & Analytics'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('viewAnalytics') || 'View comprehensive analytics and generate reports'}
            </p>
          </div>
          <button
            onClick={handleExportReport}
            disabled={loading}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Exporting...' : (t('exportReport') || 'Export Report')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Report Type Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BarChart3 className="h-4 w-4 inline mr-1" />
              {t('reportType') || 'Report Type'}
            </label>
            <Dropdown
              value={selectedReport}
              onValueChange={setSelectedReport}
              options={reportTypes}
              placeholder={t('selectReportType', 'Select report type...')}
              minWidth="w-full"
            />
          </div>

          {/* Time Period Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="h-4 w-4 inline mr-1" />
              {t('timePeriod') || 'Time Period'}
            </label>
            <Dropdown
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
              options={timePeriods}
              placeholder={t('selectTimePeriod', 'Select time period...')}
              minWidth="w-full"
            />
          </div>

          {/* Conditional: Month Dropdown (shown when period is 'month') */}
          {selectedPeriod === 'month' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                {t('selectMonth') || 'Select Month'}
              </label>
              <Dropdown
                value={selectedMonth}
                onValueChange={setSelectedMonth}
                options={monthOptions}
                placeholder={t('selectMonth', 'Choose month...')}
                minWidth="w-full"
              />
            </div>
          )}

          {/* Year Dropdown (shown for all periods) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              {t('selectAcademicYear') || 'Select Year'}
            </label>
            <Dropdown
              value={selectedYear}
              onValueChange={setSelectedYear}
              options={yearOptions}
              placeholder={t('chooseYear', 'Choose year...')}
              minWidth="w-full"
            />
          </div>
        </div>

        {/* Selected Filters Display */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600">{t('selectedFilters', 'Selected Filters')}:</span>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {reportTypes.find(r => r.value === selectedReport)?.label || selectedReport}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {timePeriods.find(p => p.value === selectedPeriod)?.label || selectedPeriod}
              </span>
              {selectedPeriod === 'month' && selectedMonth && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth}
                </span>
              )}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {t('year', 'Year')}: {selectedYear}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {renderReportContent()}
    </div>
  );
}