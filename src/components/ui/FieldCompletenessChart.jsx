import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';
import { dashboardService } from '../../utils/api/services/dashboardService';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import Dropdown from '../ui/Dropdown';
import SidebarFilter from '../ui/SidebarFilter';
import { RefreshCcw, SlidersHorizontal, TrendingUp } from 'lucide-react';
import CustomTooltip from '../ui/TooltipChart';

const FieldCompletenessChart = ({ className = "", sharedFilters = {}, onFiltersChange = null }) => {
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Applied filters that actually drive the query
  const [appliedRole, setAppliedRole] = useState(sharedFilters.selectedRole || '8');
  const [appliedSchool, setAppliedSchool] = useState(sharedFilters.selectedSchool || '');

  // Pending filters edited in the sidebar (only applied when user clicks Apply)
  const [selectedRole, setSelectedRole] = useState(appliedRole);
  const [selectedSchool, setSelectedSchool] = useState(appliedSchool);
  const [dataType, setDataType] = useState('filled'); // 'filled' or 'missing'

  // Fetch field completeness data
  useEffect(() => {
    const fetchFieldCompleteness = async () => {
      try {
        setLoading(true);
        clearError();

        const params = {};

        if (appliedRole) params.roleId = parseInt(appliedRole, 10);
        if (appliedSchool) params.schoolId = parseInt(appliedSchool, 10);

        console.log('📊 Fetching missing fields statistics with params:', params);

        const response = await dashboardService.getMissingFieldsStatistics(params);

        console.log('📊 Missing fields statistics response:', response);

        if (response.success) {
          const apiData = response.data || {};

          // Extract summary data from API response
          setSummary({
            total: apiData.totalUsers || 0,
            complete: apiData.usersWithCompleteProfiles || 0,
            incomplete: apiData.usersWithIncompleteProfiles || 0,
            completionRate: apiData.overallCompletionRate || 0
          });

          // Transform field stats for bar chart
          const fieldStats = (apiData.fieldStatistics || []).map(field => ({
            name: field.fieldName || field.field_name || field.name,
            filled: field.filledCount || field.filled_count || 0,
            missing: field.missingCount || field.missing_count || 0,
            fillRate: field.completionRate || field.completion_rate || 0
          }));

          setChartData(fieldStats);

          console.log('✅ Missing fields statistics loaded:', fieldStats);
        } else {
          console.error('Failed to fetch missing fields statistics:', response.error);
          handleError(new Error(response.error || 'Failed to fetch missing fields statistics'), {
            toastMessage: t('errorFetchingData', 'Error fetching data'),
            setError: true
          });
        }
      } catch (error) {
        console.error('❌ Error fetching missing fields statistics:', error);
        handleError(error, {
          toastMessage: t('errorFetchingData', 'Error fetching data'),
          setError: true
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFieldCompleteness();
  }, [appliedRole, appliedSchool, clearError, t, handleError]);

  const handleRefresh = async () => {
    // Trigger re-fetch by clearing error
    clearError();
    setLoading(true);
  };

  const handleClearFilters = () => {
    // Reset pending filters
    setSelectedRole('');
    setSelectedSchool('');

    // Reset applied filters that actually drive the query
    setAppliedRole('');
    setAppliedSchool('');

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

  // Apply filters: copy pending -> applied and update shared filters
  const handleApplyFilters = () => {
    setAppliedRole(selectedRole);
    setAppliedSchool(selectedSchool);

    if (onFiltersChange) {
      onFiltersChange({
        selectedRole: selectedRole,
        selectedSchool: selectedSchool
      });
    }
  };

  const hasFilters = !!(appliedRole || appliedSchool);

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
        title={t('fieldCompletenessFilters', 'Field Completeness Filters')}
        subtitle={t('fieldCompletenessFiltersDesc', 'Filter fields by role and school')}
        onApply={() => {
          handleApplyFilters();
          handleRefresh();
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
              { value: '8', label: t('teacher', 'Teacher') },
              { value: '9', label: t('student', 'Student') },
              { value: '10', label: t('parent', 'Parent') },
              { value: '14', label: t('principal', 'Principal') },
              { value: '15', label: t('deputyPrincipal', 'Deputy Principal') },
              { value: '16', label: t('schoolSecretary', 'School Secretary') },
              { value: '17', label: t('schoolTreasurer', 'School Treasurer') },
              { value: '18', label: t('schoolLibrarian', 'School Librarian') },
              { value: '19', label: t('schoolWorkshop', 'School Workshop') },
              { value: '20', label: t('schoolSecurity', 'School Security') },
              { value: '21', label: t('teacherIct', 'Teacher ICT') },
            ]}
            placeholder={t('selectRole', 'Select Role')}
            className='w-full'
          />
        </div>
      </SidebarFilter>

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {t('fieldCompleteness', 'Field Completeness')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('fieldCompletenessDesc', 'Track completion rate for each profile field')}
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

      {/* Data Type Toggle */}
      <div className="mb-6 flex gap-2">
        <Button
          onClick={() => setDataType('filled')}
          variant={dataType === 'filled' ? 'primary' : 'outline'}
          size="sm"
        >
          {t('filled', 'Filled')}
        </Button>
        <Button
          onClick={() => setDataType('missing')}
          variant={dataType === 'missing' ? 'primary' : 'outline'}
          size="sm"
        >
          {t('missing', 'Missing')}
        </Button>
      </div>

      {/* Bar Chart */}
      <div className="h-[600px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 100,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={120}
              tick={{ fontSize: 11 }}
            />
            <YAxis />
            <Tooltip
              content={<CustomTooltip />}
              formatter={(value) => value}
            />
            <Bar
              dataKey={dataType}
              name={dataType === 'filled' ? t('filled', 'Filled') : t('missing', 'Missing')}
              fill={dataType === 'filled' ? '#10b981' : '#ef4444'}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FieldCompletenessChart;
