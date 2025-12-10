import React, { useState } from 'react';
import { Filter, RefreshCcw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';
import SearchableDropdown from '../ui/SearchableDropdown';
import SidebarFilter from '../ui/SidebarFilter';
import { DatePickerWithDropdowns } from '../ui/date-picker-with-dropdowns';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

/**
 * Attendance Distribution Chart Component
 * Displays attendance distribution data with integrated sidebar filters
 *
 * @param {Object} dashboardData - Dashboard data containing attendance statistics
 * @param {Object} dashboardFilters - Current filter values
 * @param {Object} locationOptions - Location filter options (provinces, districts, schools)
 * @param {Function} onFilterChange - Callback when filters change
 * @param {Function} onClearFilters - Callback to clear all filters
 * @param {Function} fetchDistricts - Function to fetch districts based on province
 * @param {Function} fetchSchools - Function to fetch schools based on district
 */
const AttendanceDistributionChart = ({
  dashboardData,
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
    startDate: dashboardFilters.startDate || '',
    endDate: dashboardFilters.endDate || '',
    province: dashboardFilters.province,
    district: dashboardFilters.district,
    school: dashboardFilters.school
  });

  // Sync sidebar filters when dashboard filters change (from external changes like Reset)
  React.useEffect(() => {
    setSidebarFilters({
      startDate: dashboardFilters.startDate || '',
      endDate: dashboardFilters.endDate || '',
      province: dashboardFilters.province,
      district: dashboardFilters.district,
      school: dashboardFilters.school
    });
  }, [dashboardFilters]);

  if (!dashboardData || !dashboardData.primary) {
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

  // Prepare monthly trends data
  const monthlyData = dashboardData.monthly || [];

  // Helper function to format month labels
  const formatMonthLabel = (monthStr) => {
    if (!monthStr) return '';
    // Expected format: "2024-09" -> "Sep 2024"
    const [year, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month, 10) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  };

  // Prepare attendance distribution chart data
  const distribution = dashboardData.primary.attendanceDistribution || {};

  let chartData = [];
  let isMonthlyView = false;

  // Check if we have monthly data with actual values
  if (monthlyData && Array.isArray(monthlyData) && monthlyData.length > 0) {
    // Use monthly data for the main chart
    isMonthlyView = true;
    chartData = monthlyData.map(month => ({
      name: formatMonthLabel(month.month), // Format: "Sep 2024"
      present: month.present || 0,
      absent: month.absent || 0,
      late: month.late || 0,
      leave: month.leave || 0,
      attendancePercentage: month.attendancePercentage || 0
    }));
  } else {
    // Fallback: show distribution summary as grouped bars by status
    // This shows the total counts in a summary format
    isMonthlyView = false;
    chartData = [
      {
        name: t('present', 'Present'),
        count: distribution.present || 0,
        percentage: distribution.presentPercentage || 0,
        fill: '#10b981'
      },
      {
        name: t('absent', 'Absent'),
        count: distribution.absent || 0,
        percentage: distribution.absentPercentage || 0,
        fill: '#ef4444'
      },
      {
        name: t('late', 'Late'),
        count: distribution.late || 0,
        percentage: distribution.latePercentage || 0,
        fill: '#f59e0b'
      },
      {
        name: t('leave', 'Leave'),
        count: distribution.leave || 0,
        percentage: distribution.leavePercentage || 0,
        fill: '#3b82f6'
      }
    ];
  }

  // Custom tooltip for both monthly and summary views
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      if (isMonthlyView) {
        // Monthly view: show all status counts
        return (
          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
            <p className="font-medium text-gray-900 mb-2">{data.name}</p>
            <div className="space-y-1">
              {payload.map((entry, index) => (
                <p key={index} className="text-sm text-gray-600">
                  <span style={{ color: entry.color }}>{entry.name}</span>: <span className="font-semibold">{entry.value.toLocaleString()}</span>
                </p>
              ))}
              <p className="text-sm text-gray-600 pt-1 border-t border-gray-200">
                {t('attendanceRate', 'Attendance Rate')}: <span className="font-semibold">{data.attendancePercentage?.toFixed(2)}%</span>
              </p>
            </div>
          </div>
        );
      } else {
        // Summary view: show count and percentage
        return (
          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
            <p className="font-medium text-gray-900">{data.name}</p>
            <p className="text-sm text-gray-600">
              {t('count', 'Count')}: <span className="font-semibold">{data.count.toLocaleString()}</span>
            </p>
            <p className="text-sm text-gray-600">
              {t('percentage', 'Percentage')}: <span className="font-semibold">{data.percentage.toFixed(2)}%</span>
            </p>
          </div>
        );
      }
    }
    return null;
  };

  // Format active filters for display
  const activeFilters = [];
  if (dashboardFilters.startDate) activeFilters.push(`From: ${dashboardFilters.startDate}`);
  if (dashboardFilters.endDate) activeFilters.push(`To: ${dashboardFilters.endDate}`);
  if (dashboardFilters.province) {
    const provinceLabel = getSelectedLabel(dashboardFilters.province, locationOptions.provinces);
    if (provinceLabel) activeFilters.push(provinceLabel);
  }
  if (dashboardFilters.district) {
    const districtLabel = getSelectedLabel(dashboardFilters.district, locationOptions.districts);
    if (districtLabel) activeFilters.push(districtLabel);
  }
  if (dashboardFilters.school) {
    const schoolLabel = getSelectedLabel(dashboardFilters.school, locationOptions.schools);
    if (schoolLabel) activeFilters.push(schoolLabel);
  }

  return (
    <>
      {/* Attendance Distribution Bar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('attendanceDistribution', 'Attendance Distribution')}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('attendanceDistributionDescription', 'Breakdown of attendance by status')}
            </p>
            {activeFilters.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {activeFilters.map((filter, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {filter}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="flex items-center gap-1"
              >
                <RefreshCcw className="h-4 w-4" />
                {t('reset', 'Reset')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-1"
            >
              <Filter className="h-4 w-4" />
              {t('filters', 'Filters')}
            </Button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              label={{ value: t('count', 'Count'), angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
            {isMonthlyView ? (
              // Monthly view: show grouped bars for each status (4 bars per month)
              <>
                <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} name={t('present', 'Present')} />
                <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} name={t('absent', 'Absent')} />
                <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} name={t('late', 'Late')} />
                <Bar dataKey="leave" fill="#3b82f6" radius={[4, 4, 0, 0]} name={t('leave', 'Leave')} />
              </>
            ) : (
              // Summary view: single bar per status with different colors
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Trends - Attendance Counts */}
      {monthlyData && monthlyData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('monthlyTrends', 'Monthly Trends')}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('monthlyTrendsDescription', 'Attendance counts over time')}
            </p>
          </div>

          <ResponsiveContainer width="100%" height={350}>
            <LineChart
              data={monthlyData.map(month => ({
                ...month,
                formattedMonth: formatMonthLabel(month.month)
              }))}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="formattedMonth"
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 12 }}
                label={{ value: t('count', 'Count'), angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 } }}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
              <Line
                type="monotone"
                dataKey="present"
                stroke="#10b981"
                strokeWidth={2}
                name={t('present', 'Present')}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="absent"
                stroke="#ef4444"
                strokeWidth={2}
                name={t('absent', 'Absent')}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="late"
                stroke="#f59e0b"
                strokeWidth={2}
                name={t('late', 'Late')}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="leave"
                stroke="#3b82f6"
                strokeWidth={2}
                name={t('leave', 'Leave')}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Attendance Rate Trend */}
      {monthlyData && monthlyData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('attendanceRateTrend', 'Attendance Rate Trend')}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('attendanceRateTrendDescription', 'Monthly attendance percentage over time')}
            </p>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={monthlyData.map(month => ({
                ...month,
                formattedMonth: formatMonthLabel(month.month)
              }))}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="formattedMonth"
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                label={{ value: t('percentage', 'Percentage (%)'), angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 } }}
              />
              <Tooltip
                formatter={(value) => `${value.toFixed(2)}%`}
              />
              <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
              <Line
                type="monotone"
                dataKey="attendancePercentage"
                stroke="#10b981"
                strokeWidth={3}
                name={t('attendanceRate', 'Attendance Rate')}
                dot={{ r: 5, fill: '#10b981' }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sidebar Filter */}
      <SidebarFilter
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        title={t('filterAttendanceData', 'Filter Attendance Data')}
        onApply={() => {
          // Apply all filters at once
          onFilterChange('all', sidebarFilters);
          setSidebarOpen(false);
        }}
        onReset={() => {
          // Reset filters and close sidebar
          onClearFilters();
          setSidebarOpen(false);
        }}
      >
        <div className="space-y-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('startDate', 'Start Date')}
            </label>
            <DatePickerWithDropdowns
              value={sidebarFilters.startDate ? new Date(sidebarFilters.startDate + 'T00:00:00') : null}
              onChange={(date) => {
                if (date) {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const formattedDate = `${year}-${month}-${day}`;
                  setSidebarFilters(prev => ({ ...prev, startDate: formattedDate }));
                } else {
                  setSidebarFilters(prev => ({ ...prev, startDate: '' }));
                }
              }}
              placeholder={t('selectStartDate', 'Select Start Date')}
              toDate={sidebarFilters.endDate ? new Date(sidebarFilters.endDate + 'T00:00:00') : new Date()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('endDate', 'End Date')}
            </label>
            <DatePickerWithDropdowns
              value={sidebarFilters.endDate ? new Date(sidebarFilters.endDate + 'T00:00:00') : null}
              onChange={(date) => {
                if (date) {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const formattedDate = `${year}-${month}-${day}`;
                  setSidebarFilters(prev => ({ ...prev, endDate: formattedDate }));
                } else {
                  setSidebarFilters(prev => ({ ...prev, endDate: '' }));
                }
              }}
              placeholder={t('selectEndDate', 'Select End Date')}
              fromDate={sidebarFilters.startDate ? new Date(sidebarFilters.startDate + 'T00:00:00') : new Date(1960, 0, 1)}
              toDate={new Date()}
            />
          </div>

          {/* Province Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('province', 'Province')}
            </label>
            <SearchableDropdown
              options={locationOptions.provinces}
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
              placeholder={t('selectProvince', 'Select Province')}
            />
          </div>

          {/* District Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('district', 'District')}
            </label>
            <SearchableDropdown
              options={locationOptions.districts}
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
              placeholder={t('selectDistrict', 'Select District')}
              disabled={!sidebarFilters.province}
            />
          </div>

          {/* School Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('school', 'School')}
            </label>
            <SearchableDropdown
              options={locationOptions.schools}
              value={sidebarFilters.school}
              onValueChange={(value) => {
                setSidebarFilters(prev => ({
                  ...prev,
                  school: value
                }));
              }}
              placeholder={t('selectSchool', 'Select School')}
              disabled={!sidebarFilters.district}
            />
          </div>
        </div>
      </SidebarFilter>
    </>
  );
};

export default AttendanceDistributionChart;
