import React, { useState } from 'react';
import { Filter } from 'lucide-react';
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
  ResponsiveContainer
} from 'recharts';

/**
 * BMI Distribution Chart Component
 * Displays BMI distribution data with integrated sidebar filters
 *
 * @param {Object} dashboardData - Dashboard data containing bmiDistribution
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
    academicYear: dashboardFilters.academicYear,
    province: dashboardFilters.province,
    district: dashboardFilters.district,
    school: dashboardFilters.school
  });

  // Sync sidebar filters when dashboard filters change (from external changes like Reset)
  React.useEffect(() => {
    setSidebarFilters({
      academicYear: dashboardFilters.academicYear,
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

  const chartData = [
    {
      name: t('severeThinness', 'Severe Thinness'),
      value: dashboardData.bmiDistribution.severeThinness || 0,
      fill: '#6366f1'
    },
    {
      name: t('thinness', 'Thinness'),
      value: dashboardData.bmiDistribution.thinness || 0,
      fill: '#3b82f6'
    },
    {
      name: t('normal', 'Normal'),
      value: dashboardData.bmiDistribution.normal || 0,
      fill: '#10b981'
    },
    {
      name: t('overweight', 'Overweight'),
      value: dashboardData.bmiDistribution.overweight || 0,
      fill: '#f59e0b'
    },
    {
      name: t('obesity', 'Obesity'),
      value: dashboardData.bmiDistribution.obesity || 0,
      fill: '#ef4444'
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
  const selectedYear = dashboardFilters.academicYear && dashboardFilters.academicYear !== '2025-2026'
    ? dashboardFilters.academicYear
    : null;
  const hasActiveFilters = Object.values(dashboardFilters).some(v => v !== '' && v !== '2025-2026');

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
            <h3 className="text-lg font-bold text-gray-900">{t('bmiDistribution', 'BMI Distribution')}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {hasActiveFilters
                ? `${t('filteringBy', 'Filtering by')}: ${[selectedYear, selectedProvince, selectedDistrict, selectedSchool]
                    .filter(Boolean)
                    .join(' • ')}`
                : t('bmiDistributionDesc', 'View BMI distribution across all students')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onClearFilters()}
              className="whitespace-nowrap"
              disabled={!hasActiveFilters}
            >
              {t('reset', 'Reset')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Filter className="h-4 w-4" />
              {t('filters', 'Filters')}
            </Button>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis />
            <Tooltip
              contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
              formatter={(value) => value}
            />
            <Bar dataKey="value" fill="#3b82f6" name={t('count', 'Count')} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sidebar Filter */}
      <SidebarFilter
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        title={t('bmiDashboardFilters', 'BMI Dashboard Filters')}
        subtitle={t('filterBmiData', 'Filter BMI data by location and academic year')}
        onApply={() => {
          // Apply sidebar filters to the dashboard
          onFilterChange('academicYear', sidebarFilters.academicYear);
          onFilterChange('province', sidebarFilters.province);
          onFilterChange('district', sidebarFilters.district);
          onFilterChange('school', sidebarFilters.school);
          setSidebarOpen(false);
        }}
        onClearFilters={() => {
          onClearFilters();
          setSidebarFilters({
            academicYear: '2025-2026',
            province: '',
            district: '',
            school: ''
          });
        }}
        hasFilters={Object.values(sidebarFilters).some(v => v !== '' && v !== '2025-2026')}
      >
        {/* Academic Year Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('academicYear', 'Academic Year')}
          </label>
          <Dropdown
            options={[
              { value: '', label: t('all', 'All Years') },
              ...academicYearOptions
            ]}
            value={sidebarFilters.academicYear}
            onValueChange={(value) => setSidebarFilters(prev => ({ ...prev, academicYear: value }))}
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
