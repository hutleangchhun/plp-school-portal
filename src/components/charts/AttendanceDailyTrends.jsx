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
  ResponsiveContainer
} from 'recharts';

/**
 * Attendance Daily Trends Component
 * Displays single day attendance trends with bar charts
 *
 * @param {Object} dashboardData - Dashboard data containing attendance statistics
 * @param {Object} dashboardFilters - Current filter values
 * @param {Object} locationOptions - Location filter options (provinces, districts, schools)
 * @param {Function} onFilterChange - Callback when filters change
 * @param {Function} onClearFilters - Callback to clear all filters
 * @param {Function} fetchDistricts - Function to fetch districts based on province
 * @param {Function} fetchSchools - Function to fetch schools based on district
 */
const AttendanceDailyTrends = ({
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
    date: dashboardFilters.startDate || '',
    province: dashboardFilters.province,
    district: dashboardFilters.district,
    school: dashboardFilters.school
  });

  // Sync sidebar filters when dashboard filters change (from external changes like Reset)
  React.useEffect(() => {
    setSidebarFilters({
      date: dashboardFilters.startDate || '',
      province: dashboardFilters.province,
      district: dashboardFilters.district,
      school: dashboardFilters.school
    });
  }, [dashboardFilters]);

  if (!dashboardData || !dashboardData.daily) {
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

  // Prepare daily trends data for the selected date
  const dailyData = dashboardData.daily || [];

  // Get data for the selected date
  const getSelectedDayData = () => {
    if (!dashboardFilters.startDate || dailyData.length === 0) {
      return null;
    }

    const selectedData = dailyData.find(item => item.date === dashboardFilters.startDate);
    return selectedData || null;
  };

  const selectedDayData = getSelectedDayData();

  // Format date label
  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    // Expected format: "2025-12-13" -> "Dec 13, 2025"
    const [year, month, day] = dateStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month, 10) - 1;
    return `${monthNames[monthIndex]} ${parseInt(day, 10)}, ${year}`;
  };

  // Prepare data for attendance status bar chart
  const getAttendanceStatusData = () => {
    if (!selectedDayData) {
      return [
        { name: t('present', 'Present'), count: 0, fill: '#10b981' },
        { name: t('absent', 'Absent'), count: 0, fill: '#ef4444' },
        { name: t('late', 'Late'), count: 0, fill: '#f59e0b' },
        { name: t('leave', 'Leave'), count: 0, fill: '#3b82f6' }
      ];
    }

    return [
      { name: t('present', 'Present'), count: selectedDayData.present || 0, fill: '#10b981' },
      { name: t('absent', 'Absent'), count: selectedDayData.absent || 0, fill: '#ef4444' },
      { name: t('late', 'Late'), count: selectedDayData.late || 0, fill: '#f59e0b' },
      { name: t('leave', 'Leave'), count: selectedDayData.leave || 0, fill: '#3b82f6' }
    ];
  };

  // Format active filters for display
  const activeFilters = [];
  if (dashboardFilters.startDate) activeFilters.push(`Date: ${formatDateLabel(dashboardFilters.startDate)}`);
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

  const attendanceStatusData = getAttendanceStatusData();

  return (
    <>
      {/* Daily Attendance Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('dailyAttendance', 'Daily Attendance')}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('dailyAttendanceDescription', 'Attendance breakdown for selected day')}
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

        <div className='grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4'>
          {selectedDayData ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={attendanceStatusData}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  label={{ value: t('count', 'Count'), angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 } }}
                />
                <Tooltip />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {attendanceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-8 text-center text-sm text-gray-500">
              {t('selectDateForAttendance', 'Select a date to view attendance data')}
            </div>
          )}
          <div>
            {/* Daily Attendance Statistics Cards */}
            {selectedDayData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Present */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-600 mb-1">{t('present', 'Present')}</p>
                  <p className="text-3xl font-bold text-green-600">{selectedDayData.present || 0}</p>
                </div>

                {/* Absent */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-600 mb-1">{t('absent', 'Absent')}</p>
                  <p className="text-3xl font-bold text-red-600">{selectedDayData.absent || 0}</p>
                </div>

                {/* Late */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-600 mb-1">{t('late', 'Late')}</p>
                  <p className="text-3xl font-bold text-amber-600">{selectedDayData.late || 0}</p>
                </div>

                {/* Leave */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-600 mb-1">{t('leave', 'Leave')}</p>
                  <p className="text-3xl font-bold text-blue-600">{selectedDayData.leave || 0}</p>
                </div>
              </div>
            )}

            {/* Attendance Rate Card */}
            {selectedDayData && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{t('attendanceRate', 'Attendance Rate')}</p>
                    <p className="text-4xl font-bold text-green-600">
                      {(selectedDayData.attendancePercentage || 0).toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-2">{t('date', 'Date')}</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatDateLabel(dashboardFilters.startDate)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Filter */}
      <SidebarFilter
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        title={t('filterAttendanceData', 'Filter Attendance Data')}
        onApply={() => {
          // Apply all filters at once
          onFilterChange('all', {
            startDate: sidebarFilters.date,
            endDate: sidebarFilters.date,
            province: sidebarFilters.province,
            district: sidebarFilters.district,
            school: sidebarFilters.school
          });
          setSidebarOpen(false);
        }}
        onReset={() => {
          // Reset filters and close sidebar
          onClearFilters();
          setSidebarOpen(false);
        }}
      >
        <div className="space-y-4">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('selectDate', 'Select Date')}
            </label>
            <DatePickerWithDropdowns
              value={sidebarFilters.date ? new Date(sidebarFilters.date + 'T00:00:00') : null}
              onChange={(date) => {
                if (date) {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const formattedDate = `${year}-${month}-${day}`;
                  setSidebarFilters(prev => ({ ...prev, date: formattedDate }));
                } else {
                  setSidebarFilters(prev => ({ ...prev, date: '' }));
                }
              }}
              placeholder={t('selectDate', 'Select Date')}
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

export default AttendanceDailyTrends;
