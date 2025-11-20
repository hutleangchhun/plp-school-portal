import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';
import { dashboardService } from '../../utils/api/services/dashboardService';
import locationService from '../../utils/api/services/locationService';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import Dropdown from '../ui/Dropdown';
import SortOrderDropdown from '../ui/SortOrderDropdown';
import SidebarFilter from '../ui/SidebarFilter';
import { RefreshCcw, Filter, SlidersHorizontal } from 'lucide-react';
import CustomTooltip from '../ui/TooltipChart';

const SchoolDistributionChart = ({
  className = "",
  filterProvinceId = null,
  filterDistrictId = null
}) => {
  const { t } = useLanguage();
  const { error, handleError, clearError, retry } = useErrorHandler();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState('studentCount');
  const [sortOrder, setSortOrder] = useState('DESC'); // Default sorting order
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState(filterProvinceId || '');
  const [selectedDistrict, setSelectedDistrict] = useState(filterDistrictId || '');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Fetch provinces when component mounts
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await locationService.getProvinces();
        if (response && response.success !== false) {
          // Format response to match expected structure, assuming it returns data in a list format
          setProvinces(Array.isArray(response) ? response : response.data || []);
        } else {
          setProvinces([]);
        }
      } catch (error) {
        console.error('Error fetching provinces:', error);
      }
    };

    fetchProvinces();
  }, []);

  // Fetch districts when province is selected
  useEffect(() => {
    const fetchDistricts = async () => {
      if (selectedProvince) {
        try {
          // The district endpoint in locationService expects province ID as integer
          const provinceId = parseInt(selectedProvince, 10);  // Convert string back to integer
          const response = await locationService.getDistrictsByProvince(provinceId);
          if (response && response.success !== false) {
            setDistricts(Array.isArray(response) ? response : response.data || []);
          } else {
            setDistricts([]);
          }
        } catch (error) {
          console.error('Error fetching districts:', error);
          setDistricts([]);
        }
      } else {
        setDistricts([]);
      }
    };
    fetchDistricts();
  }, [selectedProvince]);

  // Fetch school distribution data
  useEffect(() => {
    const fetchSchoolDistribution = async () => {
      try {
        setLoading(true);
        clearError();

        // Pass filter parameters to the service
        const params = {};
        if (selectedProvince) params.provinceId = parseInt(selectedProvince, 20);
        if (selectedDistrict) params.districtId = parseInt(selectedDistrict, 20);

        // Add sorting parameters based on active metric
        // Map activeMetric to the corresponding field in API response
        let sortByField;
        switch(activeMetric) {
          case 'studentCount':
            sortByField = 'studentCount';
            break;
          case 'teacherCount':
            sortByField = 'teacherCount';
            break;
          case 'classCount':
            sortByField = 'classCount';
            break;
          default:
            sortByField = 'studentCount'; // default sorting field
        }

        params.sortBy = sortByField;
        params.sortOrder = sortOrder; // Use the selected sort order

        const response = await dashboardService.getSchoolDistribution(params);

        if (response.success) {
          // dashboardService already returns chart-ready array in response.data
          // and keeps the raw API data in response.raw
          const schoolData = Array.isArray(response.data)
            ? response.data
            : (Array.isArray(response.raw) ? response.raw : []);

          // Limit to top 10 schools for better visualization
          const displayData = schoolData.slice(0, 15);

          setChartData(displayData);

          console.log('✅ School distribution data loaded:', displayData);
        } else {
          console.error('Failed to fetch school distribution:', response.error);
          // setError(new Error(response.error || 'Failed to fetch school distribution'));
        }
      } catch (error) {
        console.error('Error fetching school distribution:', error);
        handleError(error, {
          toastMessage: t('errorFetchingData', 'Error fetching data'),
          setError: true
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolDistribution();
  }, [activeMetric, selectedProvince, selectedDistrict, sortOrder]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      clearError();

      // Pass filter parameters to the service
      const params = {};
      if (selectedProvince) params.provinceId = selectedProvince;
      if (selectedDistrict) params.districtId = selectedDistrict;

      const response = await dashboardService.getSchoolDistribution(params);

      if (response.success) {
        // Normalize data in the same way as initial fetch
        const schoolData = Array.isArray(response.data)
          ? response.data
          : (Array.isArray(response.raw) ? response.raw : []);

        // Limit to top 10 schools for better visualization
        const sortedData = [...schoolData]
          .sort((a, b) => (b[activeMetric] || 0) - (a[activeMetric] || 0))
          .slice(0, 15);

        setChartData(sortedData);
      } else {
        console.error('Failed to refresh school distribution:', response.error);
        // setError(new Error(response.error || 'Failed to refresh school distribution'));
      }
    } catch (error) {
      console.error('Error refreshing school distribution:', error);
      handleError(error, {
        toastMessage: t('errorFetchingData', 'Error fetching data'),
        setError: true
      });
    } finally {
      setLoading(false);
    }
  };

  // Metric options for the chart
  const metricOptions = [
    { value: 'studentCount', label: t('totalStudents', 'Students') },
    { value: 'teacherCount', label: t('totalTeachers', 'Teachers') },
    { value: 'classCount', label: t('totalClasses', 'Classes') }
  ];

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
          <p className="text-red-500 mb-4">{t('error', 'Error')}:</p>
          <p className="text-gray-600 mb-4">{error.message || t('errorFetchingData', 'Error fetching data')}</p>
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
        title={t('schoolFilters', 'School Filters')}
        subtitle={t('schoolFiltersDesc', 'Filter and sort schools for the chart')}
        onApply={handleRefresh}
        onClearFilters={() => {
          setSelectedProvince('');
          setSelectedDistrict('');
          setActiveMetric('studentCount');
          setSortOrder('DESC');
        }}
        hasFilters={!!(selectedProvince || selectedDistrict || activeMetric !== 'studentCount' || sortOrder !== 'DESC')}
      >
        {/* Province filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('province', 'Province')}
          </label>
          <Dropdown
            value={selectedProvince}
            onValueChange={setSelectedProvince}
            options={[
              { value: '', label: t('allProvinces', 'All Provinces') },
              ...provinces.map((province) => ({
                value: province.id.toString(),
                label:
                  province.province_name_kh ||
                  province.province_name_en ||
                  province.name ||
                  'Unknown Province',
              })),
            ]}
            placeholder={t('selectProvince', 'Select Province')}
            className='w-full'
          />
        </div>

        {/* District filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('district', 'District')}
          </label>
          <Dropdown
            value={selectedDistrict}
            onValueChange={setSelectedDistrict}
            options={[
              { value: '', label: t('allDistricts', 'All Districts') },
              ...districts.map((district) => ({
                value: district.id
                  ? district.id.toString()
                  : district.district_code || district.code || district.id,
                label:
                  district.district_name_kh ||
                  district.district_name_en ||
                  district.name ||
                  'Unknown District',
              })),
            ]}
            placeholder={t('selectDistrict', 'Select District')}
            disabled={!selectedProvince}
            className='w-full'
          />
        </div>

        {/* Metric sort field */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('sortByMetric', 'Sort by metric')}
          </label>
          <Dropdown
            value={activeMetric}
            onValueChange={setActiveMetric}
            options={metricOptions}
            className='w-full'
          />
        </div>

        {/* Sort order */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('sortOrder', 'Sort order')}
          </label>
          <SortOrderDropdown
            value={sortOrder}
            onChange={setSortOrder}
            className="w-full"
          />
        </div>

      </SidebarFilter>

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {t('schoolDistribution', 'School Distribution')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('schoolDistributionDesc', 'Distribution of schools by various metrics')}
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

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 20,
              right: 30,
              // Extra left margin so school names sit clearly to the left of bars
              left: 120,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            {/* Numeric values along the bottom */}
            <XAxis type="number" />
            <YAxis
              type="category"
              // Use school name field from API (fallback to other possible keys)
              dataKey="name"
              tick={{
                fontSize: 11,
                // Keep labels on the left of the bar, not under it
                textAnchor: 'end'
              }}
              // Show all category labels (no skipping)
              interval={0}
              // Wider axis area to fully show school names on the left
              width={180}
            />
            <Tooltip
              content={<CustomTooltip />}
              formatter={(value, name) => [value, t(name, name)]}
              labelFormatter={(value) => value}
            />
            <Legend />
            <Bar
              dataKey={activeMetric}
              name={metricOptions.find(opt => opt.value === activeMetric)?.label || activeMetric}
              fill="#3b82f6" // Tailwind blue-500
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{chartData.reduce((sum, item) => sum + (item.studentCount || 0), 0)}</p>
            <p className="text-sm text-gray-500">{t('totalStudents', 'Total Students')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{chartData.reduce((sum, item) => sum + (item.teacherCount || 0), 0)}</p>
            <p className="text-sm text-gray-500">{t('totalTeachers', 'Total Teachers')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{chartData.reduce((sum, item) => sum + (item.classCount || 0), 0)}</p>
            <p className="text-sm text-gray-500">{t('totalClasses', 'Total Classes')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolDistributionChart;