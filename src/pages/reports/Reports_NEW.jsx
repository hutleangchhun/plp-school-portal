/**
 * Reports Page - Modular Version
 * Refactored to use separate fetchers and components for better maintainability
 */

import { useState, useEffect } from 'react';
import { BarChart3, Download, Filter, Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import DynamicLoader from '../../components/ui/DynamicLoader';
import Dropdown from '../../components/ui/Dropdown';
import { processAndExportReport } from '../../utils/reportExportUtils';
import { classService } from '../../utils/api/services/classService';

// Import modular components
import { getActiveReportTypes, getReportConfig } from './types/reportTypes';
import { fetchReportData } from './fetchers';
import { calculateReportStats, getSummaryTitle } from './utils/statsCalculator';
import {
  ParentStatusChart,
  AccessibilityChart,
  EthnicGroupsBarChart,
  EthnicGroupsPieChart
} from './charts/ReportCharts';

export default function Reports() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  
  // State management
  const [selectedReport, setSelectedReport] = useState('report1');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');

  // Get report types from configuration
  const reportTypes = getActiveReportTypes(t);

  // Time Period Options
  const timePeriods = [
    { value: 'month', label: t('byMonth', 'By Month') },
    { value: 'semester1', label: t('bySemester1', 'Semester 1') },
    { value: 'semester2', label: t('bySemester2', 'Semester 2') },
    { value: 'year', label: t('byYear', 'By Year') }
  ];

  // Month Options
  const monthOptions = [
    { value: '1', label: t('january', 'មករា') },
    { value: '2', label: t('february', 'កុម្ភៈ') },
    { value: '3', label: t('march', 'មីនា') },
    { value: '4', label: t('april', 'មេសា') },
    { value: '5', label: t('may', 'ឧសភា') },
    { value: '6', label: t('june', 'មិថុនា') },
    { value: '7', label: t('july', 'កក្កដា') },
    { value: '8', label: t('august', 'សីហា') },
    { value: '9', label: t('september', 'កញ្ញា') },
    { value: '10', label: t('october', 'តុលា') },
    { value: '11', label: t('november', 'វិច្ឆិកា') },
    { value: '12', label: t('december', 'ធ្នូ') }
  ];

  // Year Options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - 2 + i;
    return {
      value: year.toString(),
      label: year.toString()
    };
  });

  // Fetch report data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const schoolId = userData?.school?.id || userData?.schoolId;

      if (!schoolId) {
        showError(t('noSchoolIdFound', 'No school ID found. Please ensure you are logged in.'));
        setReportData([]);
        return;
      }

      console.log('📊 Fetching report data:', {
        report: selectedReport,
        period: selectedPeriod,
        month: selectedMonth,
        year: selectedYear,
        schoolId,
        classId: selectedClass !== 'all' ? selectedClass : undefined
      });

      // Use modular fetcher
      const data = await fetchReportData(selectedReport, schoolId, {
        classId: selectedClass,
        selectedPeriod,
        selectedMonth,
        selectedYear,
      });

      setReportData(data);
    } catch (error) {
      console.error('❌ Error fetching report data:', error);
      showError(t('errorFetchingReportData', 'Error fetching report data'));
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch classes for reports that need class filter
  const fetchSchoolClasses = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const schoolId = userData?.school?.id || userData?.schoolId;

      if (!schoolId) return;

      const reportConfig = getReportConfig(selectedReport);
      if (!reportConfig?.hasClassFilter) return;

      console.log('📚 Fetching classes for school:', schoolId);

      const response = await classService.getBySchool(schoolId, {
        page: 1,
        limit: 100
      });

      if (response.success && response.classes) {
        const classOptions = [
          { value: 'all', label: t('allClasses', 'All Classes') },
          ...response.classes.map(cls => ({
            value: cls.id.toString(),
            label: cls.name || `Class ${cls.id}`
          }))
        ];
        setAvailableClasses(classOptions);
        console.log(`✅ Fetched ${response.classes.length} classes`);
      }
    } catch (error) {
      console.error('❌ Error fetching classes:', error);
    }
  };

  // Export report
  const handleExportReport = async () => {
    setLoading(true);
    try {
      const reportName = reportTypes.find(r => r.value === selectedReport)?.label || 'Report';
      const periodName = timePeriods.find(p => p.value === selectedPeriod)?.label || '';
      const monthName = selectedPeriod === 'month' && selectedMonth
        ? monthOptions.find(m => m.value === selectedMonth)?.label
        : '';

      const periodInfo = `${periodName}${monthName ? ` (${monthName})` : ''} ${selectedYear}`;

      if (!reportData || reportData.length === 0) {
        showError(t('noDataToExport', 'No data available to export. Please wait for data to load.'));
        return;
      }

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const schoolName = schoolInfo?.name || userData?.school?.name || 'PLP School';

      let className = '';
      if (selectedReport === 'report1' && selectedClass && selectedClass !== 'all') {
        const classOption = availableClasses.find(c => c.value === selectedClass);
        className = classOption?.label || '';
      }

      console.log(`📥 Exporting report: ${reportName} with ${reportData.length} records`);

      const result = await processAndExportReport(
        selectedReport,
        reportData,
        reportName,
        periodInfo,
        schoolName,
        className
      );

      if (result.success) {
        showSuccess(t('reportExportedSuccessfully', `Report exported: ${reportName} - ${result.recordCount} records`));
      } else {
        showError(result.error || t('errorExportingReport', 'Error exporting report'));
      }
    } catch (error) {
      console.error('❌ Error exporting report:', error);
      showError(t('errorExportingReport', 'Error exporting report'));
    } finally {
      setLoading(false);
    }
  };

  // Render report content with charts
  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center">
          <DynamicLoader
            type="spinner"
            size="xl"
            variant="primary"
            message={t('loadingReportData', 'Loading report data...')}
          />
        </div>
      );
    }

    if (!reportData || reportData.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('noDataAvailable', 'No Data Available')}
            </h3>
            <p className="text-gray-600">
              {t('noDataMessage', 'Please select filters and wait for data to load.')}
            </p>
          </div>
        </div>
      );
    }

    // Calculate statistics
    const stats = calculateReportStats(reportData, selectedReport);

    // Render charts based on report type
    if (['report1', 'report6', 'report9'].includes(selectedReport)) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Report 1: Parent Status Chart */}
            {selectedReport === 'report1' && stats?.parentStatus && (
              <ParentStatusChart data={stats.parentStatus} t={t} />
            )}

            {/* Report 6: Accessibility Distribution */}
            {selectedReport === 'report6' && stats?.accessibilityData && (
              <AccessibilityChart data={stats.accessibilityData} t={t} />
            )}

            {/* Report 9: Ethnic Groups Bar Chart */}
            {selectedReport === 'report9' && stats?.ethnicCount && (
              <EthnicGroupsBarChart data={stats.ethnicCount} t={t} />
            )}

            {/* Report 1: Ethnic Groups Pie Chart */}
            {selectedReport === 'report1' && stats?.ethnicCount && (
              <EthnicGroupsPieChart data={stats.ethnicCount} t={t} />
            )}
          </div>
        </div>
      );
    }

    // For other reports, show basic summary
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {getSummaryTitle(selectedReport, t)}
        </h3>
        <p className="text-gray-600">
          {t('totalRecords', 'Total Records')}: <strong>{reportData.length}</strong>
        </p>
      </div>
    );
  };

  // Effects
  useEffect(() => {
    fetchData();
  }, [selectedReport, selectedPeriod, selectedMonth, selectedYear, selectedClass]);

  useEffect(() => {
    fetchSchoolClasses();
  }, [selectedReport]);

  // Get report configuration
  const reportConfig = getReportConfig(selectedReport);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('reports', 'របាយការណ៍')}
        </h1>
        <p className="text-gray-600">
          {t('reportsDescription', 'Generate and export school reports')}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="inline h-4 w-4 mr-1" />
              {t('reportType', 'Report Type')}
            </label>
            <Dropdown
              options={reportTypes}
              value={selectedReport}
              onChange={setSelectedReport}
              placeholder={t('selectReport', 'Select Report')}
            />
          </div>

          {/* Class Filter (if applicable) */}
          {reportConfig?.hasClassFilter && availableClasses.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('class', 'Class')}
              </label>
              <Dropdown
                options={availableClasses}
                value={selectedClass}
                onChange={setSelectedClass}
                placeholder={t('selectClass', 'Select Class')}
              />
            </div>
          )}

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              {t('period', 'Period')}
            </label>
            <Dropdown
              options={timePeriods}
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              placeholder={t('selectPeriod', 'Select Period')}
            />
          </div>

          {/* Month (if period is month) */}
          {selectedPeriod === 'month' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('month', 'Month')}
              </label>
              <Dropdown
                options={monthOptions}
                value={selectedMonth}
                onChange={setSelectedMonth}
                placeholder={t('selectMonth', 'Select Month')}
              />
            </div>
          )}

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('year', 'Year')}
            </label>
            <Dropdown
              options={yearOptions}
              value={selectedYear}
              onChange={setSelectedYear}
              placeholder={t('selectYear', 'Select Year')}
            />
          </div>
        </div>

        {/* Export Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleExportReport}
            disabled={loading || !reportData || reportData.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('exportToExcel', 'Export to Excel')}
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {renderReportContent()}
      </div>
    </div>
  );
}
