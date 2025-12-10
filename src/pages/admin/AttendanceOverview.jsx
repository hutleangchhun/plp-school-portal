import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { attendanceService } from '../../utils/api/services/attendanceService';
import locationService from '../../utils/api/services/locationService';
import { schoolService } from '../../utils/api/services/schoolService';
import { ArrowLeft, Download, Filter, RefreshCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import SearchableDropdown from '../../components/ui/SearchableDropdown';
import SidebarFilter from '../../components/ui/SidebarFilter';
import AttendanceSummaryCards from '../../components/dashboard/AttendanceSummaryCards';
import AttendanceMonthlyTrends from '../../components/charts/AttendanceMonthlyTrends';

const AttendanceOverview = () => {
  const { t } = useLanguage();
  const { error, handleError, clearError } = useErrorHandler();

  // State management
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  // Get current month's start and end dates
  const getCurrentMonthRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // First day of current month
    const startDate = new Date(year, month, 1);
    // Last day of current month
    const endDate = new Date(year, month + 1, 0);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Filter state - initialize with current month
  const [dashboardFilters, setDashboardFilters] = useState(() => {
    const { startDate, endDate } = getCurrentMonthRange();
    return {
      startDate,
      endDate,
      province: '',
      district: '',
      school: ''
    };
  });

  // Location options
  const [locationOptions, setLocationOptions] = useState({
    provinces: [],
    districts: [],
    schools: []
  });

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch provinces
  const fetchProvinces = useCallback(async () => {
    try {
      const response = await locationService.getProvinces();
      console.log('Provinces response:', response);

      // Handle different response formats
      let provincesList = [];
      if (response && response.data) {
        provincesList = Array.isArray(response.data) ? response.data : response.data.data || [];
      } else if (Array.isArray(response)) {
        provincesList = response;
      }

      if (provincesList.length > 0) {
        const provinces = provincesList.map(p => ({
          value: (p.id || p.province_id).toString(),
          label: p.province_name_kh || p.province_name_en || p.name || p.province_name || 'Unknown'
        }));
        setLocationOptions(prev => ({
          ...prev,
          provinces
        }));
        console.log('Provinces set:', provinces);
      }
    } catch (err) {
      console.error('Error fetching provinces:', err);
    }
  }, []);

  // Fetch districts based on selected province
  const fetchDistricts = useCallback(async (provinceId) => {
    if (!provinceId) {
      setLocationOptions(prev => ({
        ...prev,
        districts: [],
        schools: []
      }));
      return;
    }

    try {
      const numericProvinceId = parseInt(provinceId, 10);
      const response = await locationService.getDistrictsByProvince(numericProvinceId);
      console.log('Districts response:', response);

      // Handle different response formats
      let districtsList = [];
      if (response && response.data) {
        districtsList = Array.isArray(response.data) ? response.data : response.data.data || [];
      } else if (Array.isArray(response)) {
        districtsList = response;
      }

      if (districtsList.length > 0) {
        const districts = districtsList.map(d => ({
          value: (d.id || d.district_id).toString(),
          label: d.district_name_kh || d.district_name_en || d.name || d.district_name || 'Unknown'
        }));
        setLocationOptions(prev => ({
          ...prev,
          districts,
          schools: []
        }));
      }
    } catch (err) {
      console.error('Error fetching districts:', err);
    }
  }, []);

  // Fetch schools based on selected district
  const fetchSchools = useCallback(async (districtId) => {
    if (!districtId) {
      setLocationOptions(prev => ({
        ...prev,
        schools: []
      }));
      return;
    }

    try {
      const numericDistrictId = parseInt(districtId, 10);
      const response = await schoolService.getSchoolsByDistrict(numericDistrictId);
      console.log('Schools response:', response);

      // Handle different response formats
      let schoolsList = [];
      if (response && response.data) {
        schoolsList = Array.isArray(response.data) ? response.data : response.data.data || [];
      } else if (Array.isArray(response)) {
        schoolsList = response;
      }

      if (schoolsList.length > 0) {
        const schools = schoolsList.map(s => ({
          value: (s.id || s.school_id).toString(),
          label: s.school_name_kh || s.school_name_en || s.name || s.school_name || 'Unknown'
        }));
        setLocationOptions(prev => ({
          ...prev,
          schools
        }));
      }
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  }, []);

  // Fetch attendance dashboard data
  const fetchAttendanceDashboard = useCallback(async () => {
    setDashboardLoading(true);
    clearError();

    try {
      const params = {};
      if (dashboardFilters.startDate) params.startDate = dashboardFilters.startDate;
      if (dashboardFilters.endDate) params.endDate = dashboardFilters.endDate;
      if (dashboardFilters.province) params.provinceId = parseInt(dashboardFilters.province, 10);
      if (dashboardFilters.district) params.districtId = parseInt(dashboardFilters.district, 10);
      if (dashboardFilters.school) params.schoolId = parseInt(dashboardFilters.school, 10);

      console.log('Fetching attendance dashboard with params:', params);

      // Fetch all dashboard endpoints in parallel
      const [
        primaryResponse,
        monthlyResponse,
        approvalResponse
      ] = await Promise.all([
        attendanceService.dashboard.getPrimaryDashboard(params),
        attendanceService.dashboard.getMonthlyTrends(params),
        attendanceService.dashboard.getApprovalStatus(params)
      ]);

      // Combine all data
      setDashboardData({
        primary: primaryResponse.success ? primaryResponse.data : null,
        monthly: monthlyResponse.success ? monthlyResponse.data : [],
        approval: approvalResponse.success ? approvalResponse.data : null
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      handleError(err, {
        toastMessage: t('failedToLoadAttendanceDashboard', 'Failed to load attendance dashboard')
      });
    } finally {
      setDashboardLoading(false);
      setLoading(false);
    }
  }, [dashboardFilters, handleError, clearError, t]);

  // Load provinces on mount
  useEffect(() => {
    fetchProvinces();
  }, [fetchProvinces]);

  // Fetch dashboard on mount or when filters change
  useEffect(() => {
    fetchAttendanceDashboard();
  }, [fetchAttendanceDashboard]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!dashboardData || !dashboardData.primary) {
      handleError(new Error('No data to export'));
      return;
    }

    try {
      // Prepare CSV headers
      const headers = [
        'Metric',
        'Value'
      ];

      // Prepare CSV rows
      const rows = [
        ['Total Students', dashboardData.primary.totalStudents || 0],
        ['Students with Data', dashboardData.primary.studentsWithAttendanceData || 0],
        ['Total Records', dashboardData.primary.totalAttendanceRecords || 0],
        ['Overall Attendance %', dashboardData.primary.overallAttendancePercentage?.toFixed(2) || 0],
        ['Present', dashboardData.primary.attendanceDistribution?.present || 0],
        ['Absent', dashboardData.primary.attendanceDistribution?.absent || 0],
        ['Late', dashboardData.primary.attendanceDistribution?.late || 0],
        ['Leave', dashboardData.primary.attendanceDistribution?.leave || 0]
      ];

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `attendance-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      handleError(err, {
        toastMessage: t('failedToExportData', 'Failed to export data')
      });
    }
  };

  // Loading state
  if (loading && !dashboardData) {
    return (
      <PageLoader
        message={t('loadingAttendanceDashboard', 'Loading attendance dashboard...')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back', 'Back')}
          </Button>
          <ErrorDisplay
            error={error}
            onRetry={fetchAttendanceDashboard}
            size="lg"
            className="min-h-[400px]"
          />
        </div>
      </div>
    );
  }

  return (
    <div variant='fade' className="p-3 sm:p-4">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('attendanceOverview', 'Attendance Overview')}
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                {t('attendanceOverviewDescription', 'Analyze and monitor attendance data across the system')}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCSV}
              disabled={!dashboardData || !dashboardData.primary}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {t('export', 'Export')}
            </Button>
          </div>

          {/* Summary Statistics Cards */}
          <AttendanceSummaryCards
            dashboardData={dashboardData}
            dashboardFilters={dashboardFilters}
          />

          {/* Monthly Trends with Integrated Filters */}
          <AttendanceMonthlyTrends
            dashboardData={dashboardData}
            dashboardFilters={dashboardFilters}
            locationOptions={locationOptions}
            onFilterChange={(field, value) => {
              // Handle batch filter update
              if (field === 'all') {
                setDashboardFilters(value);
                return;
              }

              if (field === 'province') {
                setDashboardFilters(prev => ({
                  ...prev,
                  province: value,
                  district: '',
                  school: ''
                }));
                // Clear districts and schools when province changes
                setLocationOptions(prev => ({
                  ...prev,
                  districts: [],
                  schools: []
                }));
                if (value) {
                  fetchDistricts(value);
                }
              } else if (field === 'district') {
                setDashboardFilters(prev => ({
                  ...prev,
                  district: value,
                  school: ''
                }));
                // Clear schools when district changes
                setLocationOptions(prev => ({
                  ...prev,
                  schools: []
                }));
                if (value) {
                  fetchSchools(value);
                }
              } else if (field === 'school') {
                setDashboardFilters(prev => ({
                  ...prev,
                  school: value
                }));
              } else if (field === 'startDate') {
                setDashboardFilters(prev => ({
                  ...prev,
                  startDate: value
                }));
              } else if (field === 'endDate') {
                setDashboardFilters(prev => ({
                  ...prev,
                  endDate: value
                }));
              }
            }}
            onClearFilters={() => {
              const { startDate, endDate } = getCurrentMonthRange();
              setDashboardFilters({
                startDate,
                endDate,
                province: '',
                district: '',
                school: ''
              });
              // Clear location options when resetting
              setLocationOptions({
                provinces: locationOptions.provinces,
                districts: [],
                schools: []
              });
            }}
            fetchDistricts={fetchDistricts}
            fetchSchools={fetchSchools}
          />
        </div>
      </div>
    </div>
  );
};

export default AttendanceOverview;
