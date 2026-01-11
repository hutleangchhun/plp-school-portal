import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createPortal } from 'react-dom';
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
  filterDistrictId = null,
  restrictedProvinceIds = [],
  restrictedDistrictIds = [],
  restrictedCommuneIds = [],
  user = null
}) => {
  const { t } = useLanguage();
  const { error, handleError, clearError, retry } = useErrorHandler();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState('totalStudentsCount');
  const [sortOrder, setSortOrder] = useState('DESC'); // Default sorting order
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState(filterProvinceId ? filterProvinceId.toString() : '');
  const [selectedDistrict, setSelectedDistrict] = useState(filterDistrictId ? filterDistrictId.toString() : '');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Check if filters are restricted (for multi-role dashboard)
  // Admin (roleId = 1) should NOT have restrictions and see all locations
  const isAdmin = user?.roleId === 1;
  const hasRestrictedFilters = restrictedProvinceIds.length > 0 && !isAdmin;

  // Fetch provinces when component mounts
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await locationService.getProvinces();
        if (response && response.success !== false) {
          // Format response to match expected structure, assuming it returns data in a list format
          let allProvinces = Array.isArray(response) ? response : response.data || [];

          // If restricted provinces provided, filter to only those
          if (hasRestrictedFilters && restrictedProvinceIds.length > 0) {
            allProvinces = allProvinces.filter(province =>
              restrictedProvinceIds.includes(province.id)
            );
            console.log('🔒 Filtered provinces to restricted list:', restrictedProvinceIds, 'Result:', allProvinces.length);
          }

          setProvinces(allProvinces);
        } else {
          setProvinces([]);
        }
      } catch (error) {
        console.error('Error fetching provinces:', error);
      }
    };

    fetchProvinces();
  }, [hasRestrictedFilters, restrictedProvinceIds.join(',')])

  // Fetch districts when province is selected
  useEffect(() => {
    const fetchDistricts = async () => {
      if (selectedProvince) {
        try {
          // The district endpoint in locationService expects province ID as integer
          const provinceId = parseInt(selectedProvince, 10);  // Convert string back to integer
          const response = await locationService.getDistrictsByProvince(provinceId);
          if (response && response.success !== false) {
            let allDistricts = Array.isArray(response) ? response : response.data || [];

            // If restricted districts provided, filter to only those
            if (hasRestrictedFilters && restrictedDistrictIds.length > 0) {
              allDistricts = allDistricts.filter(district =>
                restrictedDistrictIds.includes(district.id)
              );
              console.log('🔒 Filtered districts to restricted list:', restrictedDistrictIds, 'Result:', allDistricts.length);
            }

            setDistricts(allDistricts);
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
  }, [selectedProvince, hasRestrictedFilters, restrictedDistrictIds.join(',')]);

  // Auto-select district when filterDistrictId is provided and districts are loaded
  useEffect(() => {
    if (filterDistrictId && districts.length > 0 && !selectedDistrict) {
      const districtExists = districts.some(d => d.id === parseInt(filterDistrictId, 10));
      if (districtExists) {
        setSelectedDistrict(filterDistrictId.toString());
        console.log('✅ Auto-selected district:', filterDistrictId);
      }
    }
  }, [districts, filterDistrictId, selectedDistrict]);

  // Fetch school distribution data
  useEffect(() => {
    const fetchSchoolDistribution = async () => {
      try {
        setLoading(true);
        // Reset sort order to DESC when location filters change
        if (selectedProvince || selectedDistrict) {
          setSortOrder('DESC');
        }
        clearError();

        // Pass filter parameters to the service
        const params = {};
        if (selectedProvince) params.provinceId = parseInt(selectedProvince, 10);
        if (selectedDistrict) params.districtId = parseInt(selectedDistrict, 10);

        // Add sorting parameters based on active metric
        // Map activeMetric to the corresponding field in API response
        let sortByField;
        switch(activeMetric) {
          case 'totalStudentsCount':
            sortByField = 'totalStudentsCount';
            break;
          case 'teacherCount':
            sortByField = 'teacherCount';
            break;
          case 'classCount':
            sortByField = 'classCount';
            break;
          default:
            sortByField = 'totalStudentsCount'; // default sorting field
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

          // Show top 20 schools by default, but show all when filtered by region
          const hasRegionFilter = !!(selectedProvince || selectedDistrict);
          const displayData = hasRegionFilter ? schoolData : schoolData.slice(0, 20);

          setChartData(displayData);

          console.log('✅ School distribution chartData set:', displayData);
          console.log('📊 Active metric:', activeMetric);
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

      // Reset sort order to DESC when filtering as per user request
      if (selectedProvince || selectedDistrict) {
        setSortOrder('DESC');
      }

      const response = await dashboardService.getSchoolDistribution(params);

      if (response.success) {
        // Normalize data in the same way as initial fetch
        const schoolData = Array.isArray(response.data)
          ? response.data
          : (Array.isArray(response.raw) ? response.raw : []);

        // Limit to top 10 schools for better visualization
        const hasRegionFilter = !!(selectedProvince || selectedDistrict);
        const sortedData = [...schoolData]
          .sort((a, b) => {
            const valA = a[activeMetric] || 0;
            const valB = b[activeMetric] || 0;
            return sortOrder === 'DESC' ? valB - valA : valA - valB;
          });

        setChartData(hasRegionFilter ? sortedData : sortedData.slice(0, 20));
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
    { value: 'totalStudentsCount', label: t('totalStudents', 'Students') },
    { value: 'teacherCount', label: t('totalTeachers', 'Teachers') },
    { value: 'classCount', label: t('totalClasses', 'Classes') }
  ];

  if (loading) {
    return (
      <div className={`bg-white rounded-md border border-gray-200 p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">{t('loadingChartData', 'Loading chart data...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-md border border-gray-200 p-6 ${className}`}>
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
    <div className={`bg-white rounded-md border border-gray-200 p-6 ${className}`}>
      {/* Filters Sidebar - Rendered in Portal to avoid transform issues */}
      {isFilterOpen && createPortal(
        <SidebarFilter
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title={t('schoolFilters', 'School Filters')}
          subtitle={t('schoolFiltersDesc', 'Filter and sort schools for the chart')}
          onApply={() => {
            handleRefresh();
            setIsFilterOpen(false);
          }}
          onClearFilters={() => {
            setSelectedProvince('');
            setSelectedDistrict('');
            setActiveMetric('totalStudentsCount');
            setSortOrder('DESC');
          }}
          hasFilters={!!(selectedProvince || selectedDistrict || activeMetric !== 'totalStudentsCount' || sortOrder !== 'DESC')}
        >
          {/* Province filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('province', 'Province')}
            </label>
            <Dropdown
              value={selectedProvince}
              onValueChange={(val) => {
                setSelectedProvince(val);
                setSelectedDistrict('');
              }}
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
        </SidebarFilter>,
        document.body
      )}

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

      <div className="h-96 overflow-x-auto overflow-y-hidden custom-scrollbar bg-white">
        <div style={{ 
          minWidth: '100%', 
          width: chartData.length > 10 ? `${chartData.length * 70}px` : '100%',
          height: '100%',
          position: 'relative'
        }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 40, // Increased left margin
              bottom: 100, // Increased bottom margin for rotated labels
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              type="category"
              interval={0}
              tick={{
                fontSize: 10,
                angle: -45,
                textAnchor: 'end'
              }}
              height={100}
            />
            <YAxis 
              type="number" 
              allowDecimals={false} 
              width={60} 
              domain={[0, 'auto']}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
            />
            <Legend verticalAlign="top" align="right" height={36}/>
            {activeMetric === 'totalStudentsCount' && (
              <Bar 
                dataKey="studentsWithClassCount" 
                name={t('studentsWithClass', 'Students with class')} 
                stackId="students" 
                fill="#10b981" 
                isAnimationActive={false}
                barSize={40}
              />
            )}
            {activeMetric === 'totalStudentsCount' && (
              <Bar 
                dataKey="studentsNoClassCount" 
                name={t('studentsNoClass', 'Students without class')} 
                stackId="students" 
                fill="#f59e0b" 
                radius={[4, 4, 0, 0]} 
                isAnimationActive={false}
                barSize={40}
              />
            )}
            {activeMetric === 'totalStudentsCount' && (
              <Bar 
                dataKey="totalStudentsCount" 
                name={t('totalStudents', 'Total Students')} 
                fill="transparent" 
                legendType="none"
              />
            )}
            {activeMetric !== 'totalStudentsCount' && (
              <Bar
                dataKey={activeMetric}
                name={metricOptions.find(opt => opt.value === activeMetric)?.label || activeMetric}
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
                barSize={40}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{chartData.reduce((sum, item) => sum + (item.totalStudentsCount || 0), 0)}</p>
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