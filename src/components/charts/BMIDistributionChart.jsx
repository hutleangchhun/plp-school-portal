import React, { useState } from 'react';
import { Filter, RefreshCcw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';
import Dropdown from '../ui/Dropdown';
import SearchableDropdown from '../ui/SearchableDropdown';
import SidebarFilter from '../ui/SidebarFilter';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

/**
 * BMI Distribution Growth Chart Component
 * Displays BMI distribution comparison between two academic years
 *
 * @param {Object} dashboardData - Dashboard data containing bmiDistribution for both years
 * @param {Array} academicYearOptions - List of available academic years
 * @param {Object} dashboardFilters - Current filter values
 * @param {Object} locationOptions - Location filter options (provinces, districts, schools)
 * @param {Function} onFilterChange - Callback when filters change
 * @param {Function} onClearFilters - Callback to clear all filters
 * @param {Function} fetchDistricts - Function to fetch districts based on province
 * @param {Function} fetchSchools - Function to fetch schools based on district
 */
const BMIDistributionChart = ({
  dashboardData,
  academicYearOptions = [],
  dashboardFilters = {},
  locationOptions = { provinces: [], districts: [], schools: [] },
  onFilterChange,
  onClearFilters,
  fetchDistricts,
  fetchSchools
}) => {
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Local state for sidebar filters (temporary until Apply is clicked)
  const [sidebarFilters, setSidebarFilters] = useState({
    academicYear1: dashboardFilters.academicYear1 || '',
    academicYear2: dashboardFilters.academicYear2 || '',
    province: dashboardFilters.province,
    district: dashboardFilters.district,
    school: dashboardFilters.school
  });

  // Sync sidebar filters when dashboard filters change (from external changes like Reset)
  React.useEffect(() => {
    setSidebarFilters({
      academicYear1: dashboardFilters.academicYear1 || '',
      academicYear2: dashboardFilters.academicYear2 || '',
      province: dashboardFilters.province,
      district: dashboardFilters.district,
      school: dashboardFilters.school
    });
  }, [dashboardFilters]);

  if (!dashboardData || !dashboardData.bmiDistribution) {
    return null;
  }

  // Helper function to get the label for a selected value from options
  const getSelectedLabel = (value, options) => {
    if (!value) return '';

    // Try exact match first
    let selected = options.find(opt => opt.value === value);

    // If no match, try comparing as strings (in case one is number, one is string)
    if (!selected && typeof value === 'number') {
      selected = options.find(opt => String(opt.value) === String(value));
    } else if (!selected && typeof value === 'string') {
      selected = options.find(opt => String(opt.value) === value);
    }

    return selected?.label || '';
  };

  // Prepare growth chart data comparing two years
  const year1Data = dashboardData.bmiDistribution?.year1 || dashboardData.bmiDistribution || {};
  const year2Data = dashboardData.bmiDistribution?.year2 || {};

  const chartData = [
    {
      name: t('severeThinness', 'Severe Thinness'),
      [dashboardFilters.academicYear1 || 'Year 1']: year1Data.severeThinness || 0,
      [dashboardFilters.academicYear2 || 'Year 2']: year2Data.severeThinness || 0,
    },
    {
      name: t('thinness', 'Thinness'),
      [dashboardFilters.academicYear1 || 'Year 1']: year1Data.thinness || 0,
      [dashboardFilters.academicYear2 || 'Year 2']: year2Data.thinness || 0,
    },
    {
      name: t('normal', 'Normal'),
      [dashboardFilters.academicYear1 || 'Year 1']: year1Data.normal || 0,
      [dashboardFilters.academicYear2 || 'Year 2']: year2Data.normal || 0,
    },
    {
      name: t('overweight', 'Overweight'),
      [dashboardFilters.academicYear1 || 'Year 1']: year1Data.overweight || 0,
      [dashboardFilters.academicYear2 || 'Year 2']: year2Data.overweight || 0,
    },
    {
      name: t('obesity', 'Obesity'),
      [dashboardFilters.academicYear1 || 'Year 1']: year1Data.obesity || 0,
      [dashboardFilters.academicYear2 || 'Year 2']: year2Data.obesity || 0,
    }
  ];

  // Get selected filter labels for display
  const selectedProvince = dashboardFilters.province
    ? getSelectedLabel(dashboardFilters.province, locationOptions.provinces)
    : '';
  const selectedDistrict = dashboardFilters.district
    ? getSelectedLabel(dashboardFilters.district, locationOptions.districts)
    : '';
  const selectedSchool = dashboardFilters.school
    ? getSelectedLabel(dashboardFilters.school, locationOptions.schools)
    : '';
  const selectedYear1 = dashboardFilters.academicYear1 || null;
  const selectedYear2 = dashboardFilters.academicYear2 || null;
  const hasActiveFilters = Boolean(
    dashboardFilters.province ||
    dashboardFilters.district ||
    dashboardFilters.school ||
    dashboardFilters.academicYear1 ||
    dashboardFilters.academicYear2
  );

  // Debug log to check filter values
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Filter Debug:', {
      province: dashboardFilters.province,
      selectedProvince,
      provinceOptions: locationOptions.provinces.slice(0, 3),
      district: dashboardFilters.district,
      selectedDistrict,
      districtOptions: locationOptions.districts.slice(0, 3)
    });
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        {/* Header with Title and Filter Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{t('bmiGrowthChart', 'BMI Growth Comparison')}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {hasActiveFilters
                ? `${t('comparing', 'Comparing')}: ${[
                    selectedYear1 && `${selectedYear1}`,
                    selectedYear2 && `vs ${selectedYear2}`,
                    selectedProvince,
                    selectedDistrict,
                    selectedSchool
                  ].filter(Boolean).join(' • ')}`
                : t('selectYearsToCompare', 'Select two academic years to compare BMI distribution growth')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="success"
              size="sm"
              onClick={() => onClearFilters()}
              className="whitespace-nowrap"
              disabled={!hasActiveFilters}
            >
              <RefreshCcw className='w-4 h-4' />
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Growth Comparison Chart */}
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
            <XAxis
              dataKey="name"
              angle={0}
              height={100}
              className='text-sm'
            />
            <YAxis />
            <Tooltip
              contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
              formatter={(value) => value}
            />
            <Legend />
            <Bar
              dataKey={dashboardFilters.academicYear1 || 'Year 1'}
              fill="#3b82f6"
              barSize={40}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey={dashboardFilters.academicYear2 || 'Year 2'}
              fill="#10b981"
              barSize={40}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sidebar Filter */}
      <SidebarFilter
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        title={t('growthComparisonFilters', 'Growth Comparison Filters')}
        subtitle={t('selectTwoYearsToCompare', 'Select two academic years and location filters')}
        onApply={() => {
          // Apply sidebar filters to the dashboard
          onFilterChange('academicYear1', sidebarFilters.academicYear1);
          onFilterChange('academicYear2', sidebarFilters.academicYear2);
          onFilterChange('province', sidebarFilters.province);
          onFilterChange('district', sidebarFilters.district);
          onFilterChange('school', sidebarFilters.school);
          setSidebarOpen(false);
        }}
        onClearFilters={() => {
          onClearFilters();
          setSidebarFilters({
            academicYear1: '',
            academicYear2: '',
            province: '',
            district: '',
            school: ''
          });
        }}
        hasFilters={Object.values(sidebarFilters).some(v => v !== '')}
      >
        {/* Academic Year 1 Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('firstYear', 'First Year')}
          </label>
          <Dropdown
            options={[
              { value: '', label: t('selectFirstYear', 'Select first year') },
              ...academicYearOptions
            ]}
            value={sidebarFilters.academicYear1}
            onValueChange={(value) => setSidebarFilters(prev => ({ ...prev, academicYear1: value }))}
            placeholder={t('selectYear', 'Select year')}
            className="w-full"
          />
        </div>

        {/* Academic Year 2 Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('secondYear', 'Second Year')}
          </label>
          <Dropdown
            options={[
              { value: '', label: t('selectSecondYear', 'Select second year') },
              ...academicYearOptions
            ]}
            value={sidebarFilters.academicYear2}
            onValueChange={(value) => setSidebarFilters(prev => ({ ...prev, academicYear2: value }))}
            placeholder={t('selectYear', 'Select year')}
            className="w-full"
          />
        </div>

        {/* Province Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('province', 'Province')}
          </label>
          <Dropdown
            options={[
              { value: '', label: t('all', 'All Provinces') },
              ...locationOptions.provinces
            ]}
            value={sidebarFilters.province}
            onValueChange={(value) => {
              setSidebarFilters(prev => ({
                ...prev,
                province: value,
                district: '',
                school: ''
              }));
              if (value) {
                fetchDistricts(value);
              }
            }}
            placeholder={t('selectProvince', 'Select province')}
            className="w-full"
          />
        </div>

        {/* District Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('district', 'District')}
          </label>
          <Dropdown
            options={[
              { value: '', label: t('all', 'All Districts') },
              ...locationOptions.districts
            ]}
            value={sidebarFilters.district}
            onValueChange={(value) => {
              setSidebarFilters(prev => ({
                ...prev,
                district: value,
                school: ''
              }));
              if (value) {
                fetchSchools(value);
              }
            }}
            placeholder={t('selectDistrict', 'Select district')}
            disabled={!sidebarFilters.province}
            className="w-full"
          />
        </div>

        {/* School Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('school', 'School')}
          </label>
          <SearchableDropdown
            options={[
              { value: '', label: t('all', 'All Schools') },
              ...locationOptions.schools
            ]}
            value={sidebarFilters.school}
            onValueChange={(value) => setSidebarFilters(prev => ({ ...prev, school: value }))}
            placeholder={t('selectSchool', 'Select school')}
            searchPlaceholder={t('searchSchool', 'Search school...')}
            disabled={!sidebarFilters.district}
            className="w-full"
            minWidth="w-full"
            emptyMessage={t('noSchoolsFound', 'No schools found')}
          />
        </div>
      </SidebarFilter>
    </>
  );
};

export default BMIDistributionChart;
