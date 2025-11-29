import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';
import { dashboardService } from '../../utils/api/services/dashboardService';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import Dropdown from '../ui/Dropdown';
import SidebarFilter from '../ui/SidebarFilter';
import { RefreshCcw, SlidersHorizontal, Users, CheckCircle, AlertCircle } from 'lucide-react';
import CustomTooltip from '../ui/TooltipChart';
import { roleOptions } from '../../utils/formOptions';

const COLORS = {
  complete: '#10b981', // green-500
  incomplete: '#ef4444', // red-500
};

const DataCompletenessChart = ({ className = "", sharedFilters = {}, onFiltersChange = null }) => {
  const { t } = useLanguage();
  const { error, handleError, clearError, retry } = useErrorHandler();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total: 0,
    complete: 0,
    incomplete: 0,
    completionRate: 0
  });
  const [userData, setUserData] = useState([]);
  const [pagination, setPagination] = useState({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Applied filters that actually drive the query
  const [appliedRole, setAppliedRole] = useState(sharedFilters.selectedRole || '8');
  const [appliedSchool, setAppliedSchool] = useState(sharedFilters.selectedSchool || '');
  const [appliedIncompleteOnly, setAppliedIncompleteOnly] = useState(false);

  // Pending filters edited in the sidebar (only applied when user clicks Apply)
  const [selectedRole, setSelectedRole] = useState(appliedRole);
  const [selectedSchool, setSelectedSchool] = useState(appliedSchool);
  const [incompleteOnly, setIncompleteOnly] = useState(appliedIncompleteOnly);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit] = useState(10);

  // Fetch data completeness
  useEffect(() => {
    const fetchDataCompleteness = async () => {
      try {
        setLoading(true);
        clearError();

        const params = {
          page: currentPage,
          limit: pageLimit
        };

        if (appliedRole) params.roleId = parseInt(appliedRole, 10);
        if (appliedSchool) params.schoolId = parseInt(appliedSchool, 10);
        if (appliedIncompleteOnly) params.incompleteOnly = true;

        console.log('📊 Fetching data completeness with params:', params);

        const response = await dashboardService.getDataCompleteness(params);

        console.log('📊 Data completeness response:', response);

        if (response.success) {
          setUserData(response.data || []);
          setPagination(response.pagination || {});

          const summaryData = response.summary || {};
          setSummary({
            total: summaryData.total || 0,
            complete: summaryData.complete || 0,
            incomplete: summaryData.incomplete || 0,
            completionRate: summaryData.completionRate || 0
          });

          // Transform data for pie chart
          const chartDataArray = [
            {
              name: t('complete', 'Complete'),
              value: summaryData.complete || 0,
              percentage: summaryData.completionRate || 0
            },
            {
              name: t('incomplete', 'Incomplete'),
              value: summaryData.incomplete || 0,
              percentage: 100 - (summaryData.completionRate || 0)
            }
          ];

          setChartData(chartDataArray);

          console.log('✅ Data completeness loaded:', summaryData);
        } else {
          console.error('Failed to fetch data completeness:', response.error);
          handleError(new Error(response.error || 'Failed to fetch data completeness'), {
            toastMessage: t('errorFetchingData', 'Error fetching data'),
            setError: true
          });
        }
      } catch (error) {
        console.error('❌ Error fetching data completeness:', error);
        handleError(error, {
          toastMessage: t('errorFetchingData', 'Error fetching data'),
          setError: true
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDataCompleteness();
  }, [currentPage, appliedRole, appliedSchool, appliedIncompleteOnly, pageLimit, clearError, t, handleError]);

  const handleRefresh = async () => {
    setCurrentPage(1);
    // The useEffect will trigger automatically when currentPage or applied filters change
  };

  const handleClearFilters = () => {
    // Reset pending filters
    setSelectedRole('');
    setSelectedSchool('');
    setIncompleteOnly(false);

    // Reset applied filters that actually drive the query
    setAppliedRole('');
    setAppliedSchool('');
    setAppliedIncompleteOnly(false);
    setCurrentPage(1);
    // Update shared filters if callback provided
    if (onFiltersChange) {
      onFiltersChange({
        selectedRole: '',
        selectedSchool: ''
      });
    }
  };

  // Handle role / school changes only in pending state (no immediate fetch)
  const handleRoleChange = (value) => {
    setSelectedRole(value);
  };

  const handleSchoolChange = (value) => {
    setSelectedSchool(value);
  };

  const handleIncompleteOnlyChange = (checked) => {
    setIncompleteOnly(checked);
  };

  // Apply filters: copy pending -> applied, update shared filters, and refresh data
  const handleApplyFilters = () => {
    setAppliedRole(selectedRole);
    setAppliedSchool(selectedSchool);
    setAppliedIncompleteOnly(incompleteOnly);
    setCurrentPage(1);

    if (onFiltersChange) {
      onFiltersChange({
        selectedRole: selectedRole,
        selectedSchool: selectedSchool
      });
    }
  };

  const hasFilters = !!(appliedRole || appliedSchool || appliedIncompleteOnly);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">{t('loadingChartData', 'Loading chart data...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-red-500 mb-4 font-semibold">{t('error', 'Error')}:</p>
          <p className="text-gray-600 mb-4 text-center max-w-md">{error.message || t('errorFetchingData', 'Error fetching data')}</p>
          <Button onClick={() => retry(handleRefresh)} variant="primary">
            {t('retry', 'Retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      {/* Filters Sidebar */}
      <SidebarFilter
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title={t('dataCompletenessFilters', 'Data Completeness Filters')}
        subtitle={t('dataCompletenessFiltersDesc', 'Filter users by role, school, and completion status')}
        onApply={() => {
          handleApplyFilters();
          setIsFilterOpen(false);
        }}
        onClearFilters={handleClearFilters}
        hasFilters={hasFilters}
      >
        {/* Role filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('role', 'Role')}
          </label>
          <Dropdown
            value={selectedRole}
            onValueChange={handleRoleChange}
            options={[
              { value: '', label: t('allRoles', 'All Roles') },
              ...roleOptions
            ]}
            placeholder={t('selectRole', 'Select Role')}
            className='w-full'
          />
        </div>

        {/* Show incomplete only toggle */}
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={incompleteOnly}
              onChange={(e) => handleIncompleteOnlyChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              {t('incompleteOnly', 'Show incomplete only')}
            </span>
          </label>
        </div>
      </SidebarFilter>

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {t('dataCompleteness', 'Data Completeness')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('dataCompletenessDesc', 'Track user profile completion status')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsFilterOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col justify-center space-y-4">
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            <p className="text-sm text-gray-500">{t('totalUsers', 'Total Users')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{summary.complete}</p>
            <p className="text-sm text-gray-500">{t('completeProfiles', 'Complete Profiles')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
          <div className="p-3 bg-red-100 rounded-lg">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{summary.incomplete}</p>
            <p className="text-sm text-gray-500">{t('incompleteProfiles', 'Incomplete Profiles')}</p>
          </div>
        </div>

        <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600 mb-1">{t('completionRate', 'Completion Rate')}</p>
          <p className="text-3xl font-bold text-blue-600">{summary.completionRate.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
};

export default DataCompletenessChart;
