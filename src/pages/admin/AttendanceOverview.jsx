import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import SearchableDropdown from '../../components/ui/SearchableDropdown';
import SidebarFilter from '../../components/ui/SidebarFilter';
import AttendanceSummaryCards from '../../components/dashboard/AttendanceSummaryCards';
import AttendanceDailyTrends from '../../components/charts/AttendanceDailyTrends';
import AttendanceMonthlyTrends from '../../components/charts/AttendanceMonthlyTrends';

const AttendanceOverview = () => {
  const { t } = useLanguage();
  const { error, handleError, clearError } = useErrorHandler();
  const location = useLocation();
  const previousLocationRef = useRef(location.pathname);

  // State management
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  // Initialize activeTab from localStorage if available, otherwise default to 'student'
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      const savedTab = localStorage.getItem('attendanceOverviewTab');
      return savedTab && (savedTab === 'student' || savedTab === 'teacher') ? savedTab : 'student';
    } catch {
      return 'student';
    }
  });

  // Wrapper for setActiveTab that also saves to localStorage
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('attendanceOverviewTab', tab);
    } catch (err) {
      console.error('Error saving tab preference:', err);
    }
  };

  const [teacherDashboardData, setTeacherDashboardData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Sidebar filter state

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

  // Daily Trends Filter state - initialize with today
  const [dailyFilters, setDailyFilters] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      startDate: today,
      province: '',
      district: '',
      school: ''
    };
  });

  // Monthly Trends Filter state - initialize with current month
  const [monthlyFilters, setMonthlyFilters] = useState(() => {
    const { startDate, endDate } = getCurrentMonthRange();
    return {
      startDate,
      endDate,
      province: '',
      district: '',
      school: ''
    };
  });

  // Location options for daily trends
  const [dailyLocationOptions, setDailyLocationOptions] = useState({
    provinces: [],
    districts: [],
    schools: []
  });

  // Location options for monthly trends
  const [monthlyLocationOptions, setMonthlyLocationOptions] = useState({
    provinces: [],
    districts: [],
    schools: []
  });

  // Fetch provinces for both daily and monthly
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
        setDailyLocationOptions(prev => ({
          ...prev,
          provinces
        }));
        setMonthlyLocationOptions(prev => ({
          ...prev,
          provinces
        }));
        console.log('Provinces set:', provinces);
      }
    } catch (err) {
      console.error('Error fetching provinces:', err);
    }
  }, []);

  // Fetch districts for daily trends
  const fetchDailyDistricts = useCallback(async (provinceId) => {
    if (!provinceId) {
      setDailyLocationOptions(prev => ({
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
        setDailyLocationOptions(prev => ({
          ...prev,
          districts,
          schools: []
        }));
      }
    } catch (err) {
      console.error('Error fetching districts:', err);
    }
  }, []);

  // Fetch districts for monthly trends
  const fetchMonthlyDistricts = useCallback(async (provinceId) => {
    if (!provinceId) {
      setMonthlyLocationOptions(prev => ({
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
        setMonthlyLocationOptions(prev => ({
          ...prev,
          districts,
          schools: []
        }));
      }
    } catch (err) {
      console.error('Error fetching districts:', err);
    }
  }, []);

  // Fetch schools for daily trends
  const fetchDailySchools = useCallback(async (districtId) => {
    if (!districtId) {
      setDailyLocationOptions(prev => ({
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
        setDailyLocationOptions(prev => ({
          ...prev,
          schools
        }));
      }
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  }, []);

  // Fetch schools for monthly trends
  const fetchMonthlySchools = useCallback(async (districtId) => {
    if (!districtId) {
      setMonthlyLocationOptions(prev => ({
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
        setMonthlyLocationOptions(prev => ({
          ...prev,
          schools
        }));
      }
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  }, []);

  // Fetch attendance dashboard data (primary + approval status)
  const fetchAttendanceDashboard = useCallback(async () => {
    setDashboardLoading(true);
    clearError();

    try {
      // Fetch primary and approval data (using monthly filters for overall dashboard)
      const primaryParams = {};
      if (monthlyFilters.startDate) primaryParams.startDate = monthlyFilters.startDate;
      if (monthlyFilters.endDate) primaryParams.endDate = monthlyFilters.endDate;
      if (monthlyFilters.province) primaryParams.provinceId = parseInt(monthlyFilters.province, 10);
      if (monthlyFilters.district) primaryParams.districtId = parseInt(monthlyFilters.district, 10);
      if (monthlyFilters.school) primaryParams.schoolId = parseInt(monthlyFilters.school, 10);

      console.log('Fetching primary dashboard with params:', primaryParams);

      // Fetch daily trends data
      const dailyParams = {};
      if (dailyFilters.startDate) dailyParams.startDate = dailyFilters.startDate;
      if (dailyFilters.province) dailyParams.provinceId = parseInt(dailyFilters.province, 10);
      if (dailyFilters.district) dailyParams.districtId = parseInt(dailyFilters.district, 10);
      if (dailyFilters.school) dailyParams.schoolId = parseInt(dailyFilters.school, 10);

      console.log('Fetching daily trends with params:', dailyParams);

      // Fetch monthly trends data
      const monthlyParams = {};
      if (monthlyFilters.startDate) monthlyParams.startDate = monthlyFilters.startDate;
      if (monthlyFilters.endDate) monthlyParams.endDate = monthlyFilters.endDate;
      if (monthlyFilters.province) monthlyParams.provinceId = parseInt(monthlyFilters.province, 10);
      if (monthlyFilters.district) monthlyParams.districtId = parseInt(monthlyFilters.district, 10);
      if (monthlyFilters.school) monthlyParams.schoolId = parseInt(monthlyFilters.school, 10);

      console.log('Fetching monthly trends with params:', monthlyParams);

      // Fetch all dashboard endpoints in parallel
      const [
        primaryResponse,
        dailyResponse,
        monthlyResponse,
        approvalResponse
      ] = await Promise.all([
        attendanceService.dashboard.getPrimaryDashboard(primaryParams),
        attendanceService.dashboard.getDailyTrends(dailyParams),
        attendanceService.dashboard.getMonthlyTrends(monthlyParams),
        attendanceService.dashboard.getApprovalStatus(primaryParams)
      ]);

      // Combine all data
      setDashboardData({
        primary: primaryResponse.success ? primaryResponse.data : null,
        daily: dailyResponse.success ? dailyResponse.data : [],
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
  }, [dailyFilters, monthlyFilters, handleError, clearError, t]);

  // Fetch teacher attendance dashboard data
  const fetchTeacherAttendanceDashboard = useCallback(async () => {
    setDashboardLoading(true);
    clearError();

    try {
      // Build params for monthly trends (primary stats and monthly chart)
      const monthlyParams = {};
      if (monthlyFilters.startDate) monthlyParams.startDate = monthlyFilters.startDate;
      if (monthlyFilters.endDate) monthlyParams.endDate = monthlyFilters.endDate;
      if (monthlyFilters.province) monthlyParams.provinceId = parseInt(monthlyFilters.province, 10);
      if (monthlyFilters.district) monthlyParams.districtId = parseInt(monthlyFilters.district, 10);
      if (monthlyFilters.school) monthlyParams.schoolId = parseInt(monthlyFilters.school, 10);

      // Build params for daily role breakdown (table - use today's date)
      const dailyParams = {};
      if (dailyFilters.startDate) {
        dailyParams.startDate = dailyFilters.startDate;
        dailyParams.endDate = dailyFilters.startDate; // Same day for daily view
      }
      if (dailyFilters.province) dailyParams.provinceId = parseInt(dailyFilters.province, 10);
      if (dailyFilters.district) dailyParams.districtId = parseInt(dailyFilters.district, 10);
      if (dailyFilters.school) dailyParams.schoolId = parseInt(dailyFilters.school, 10);

      console.log('Fetching teacher dashboard - Monthly params:', monthlyParams);
      console.log('Fetching teacher dashboard - Daily params:', dailyParams);

      // Fetch teacher primary dashboard, role breakdown (daily), and monthly trends in parallel
      const [
        teacherPrimaryResponse,
        teacherDailyRoleResponse,
        teacherMonthlyResponse
      ] = await Promise.all([
        attendanceService.dashboard.getTeacherPrimaryDashboard(monthlyParams),
        attendanceService.dashboard.getTeacherByRoleBreakdown(dailyParams),
        attendanceService.dashboard.getTeacherMonthlyTrends(monthlyParams)
      ]);

      console.log('Teacher Primary Response:', teacherPrimaryResponse);
      console.log('Teacher Daily Role Response:', teacherDailyRoleResponse);
      console.log('Teacher Monthly Trends Response:', teacherMonthlyResponse);

      // Extract data with proper fallbacks
      const primaryData = teacherPrimaryResponse.success ? teacherPrimaryResponse.data : null;
      const dailyRoleData = teacherDailyRoleResponse.success ? teacherDailyRoleResponse.data : [];
      const monthlyTrendsData = teacherMonthlyResponse.success ? (Array.isArray(teacherMonthlyResponse.data) ? teacherMonthlyResponse.data : []) : [];

      // Debug log the structure
      console.log('Extracted Primary Data:', primaryData);
      console.log('Extracted Daily Role Data:', dailyRoleData);
      console.log('Monthly Trends Data:', monthlyTrendsData);
      console.log('Primary Data Keys:', primaryData ? Object.keys(primaryData) : 'null');
      console.log('Daily Role is Array:', Array.isArray(dailyRoleData));
      console.log('Daily Role length:', Array.isArray(dailyRoleData) ? dailyRoleData.length : 'N/A');
      console.log('Monthly Trends is Array:', Array.isArray(monthlyTrendsData));
      console.log('Monthly Trends length:', Array.isArray(monthlyTrendsData) ? monthlyTrendsData.length : 'N/A');

      // Log first role object structure
      if (Array.isArray(dailyRoleData) && dailyRoleData.length > 0) {
        console.log('First Role Object:', dailyRoleData[0]);
        console.log('First Role Keys:', Object.keys(dailyRoleData[0]));
        console.log('Full daily role data:', JSON.stringify(dailyRoleData, null, 2));
      }

      // Combine all data
      const combinedData = {
        primary: primaryData,
        byRole: Array.isArray(dailyRoleData) ? dailyRoleData : [],
        monthly: monthlyTrendsData
      };

      setTeacherDashboardData(combinedData);

      console.log('Teacher Dashboard Data set to:', combinedData);

    } catch (err) {
      console.error('Error fetching teacher dashboard data:', err);
      handleError(err, {
        toastMessage: t('failedToLoadAttendanceDashboard', 'Failed to load teacher attendance dashboard')
      });
    } finally {
      setDashboardLoading(false);
      setLoading(false);
    }
  }, [monthlyFilters, dailyFilters, handleError, clearError, t]);

  // Load provinces on mount
  useEffect(() => {
    fetchProvinces();
  }, [fetchProvinces]);

  // Fetch dashboard on mount or when filters change
  useEffect(() => {
    if (activeTab === 'student') {
      fetchAttendanceDashboard();
    } else {
      fetchTeacherAttendanceDashboard();
    }
  }, [fetchAttendanceDashboard, fetchTeacherAttendanceDashboard, activeTab, monthlyFilters, dailyFilters]);

  // Clear tab preference from localStorage only when navigating away from this page
  useEffect(() => {
    const currentPathname = location.pathname;

    // Check if we've navigated to a different page
    if (previousLocationRef.current !== currentPathname && !currentPathname.includes('attendance-overview')) {
      try {
        localStorage.removeItem('attendanceOverviewTab');
        console.log('Cleared tab preference - navigated away from attendance overview');
      } catch (err) {
        console.error('Error clearing tab preference:', err);
      }
    }

    // Update the ref for next comparison
    previousLocationRef.current = currentPathname;
  }, [location.pathname]);

  // Export to CSV
  const handleExportCSV = () => {
    try {
      let headers = ['Metric', 'Value'];
      let rows = [];

      if (activeTab === 'student') {
        if (!dashboardData || !dashboardData.primary) {
          handleError(new Error('No data to export'));
          return;
        }

        // Prepare student CSV rows
        rows = [
          ['Total Students', dashboardData.primary.totalStudents || 0],
          ['Students with Data', dashboardData.primary.studentsWithAttendanceData || 0],
          ['Total Records', dashboardData.primary.totalAttendanceRecords || 0],
          ['Overall Attendance %', dashboardData.primary.overallAttendancePercentage?.toFixed(2) || 0],
          ['Present', dashboardData.primary.attendanceDistribution?.present || 0],
          ['Absent', dashboardData.primary.attendanceDistribution?.absent || 0],
          ['Late', dashboardData.primary.attendanceDistribution?.late || 0],
          ['Leave', dashboardData.primary.attendanceDistribution?.leave || 0]
        ];
      } else {
        if (!teacherDashboardData || !teacherDashboardData.primary) {
          handleError(new Error('No data to export'));
          return;
        }

        // Prepare teacher CSV rows
        rows = [
          ['Total Teachers', teacherDashboardData.primary.totalTeachers || 0],
          ['Teachers with Data', teacherDashboardData.primary.teachersWithAttendanceData || 0],
          ['Total Records', teacherDashboardData.primary.totalAttendanceRecords || 0],
          ['Average Hours Worked', teacherDashboardData.primary.averageHoursWorked?.toFixed(2) || 0],
          ['Overall Attendance %', teacherDashboardData.primary.overallAttendancePercentage?.toFixed(2) || 0],
          ['Pending Approvals', teacherDashboardData.primary.pendingApprovals || 0]
        ];
      }

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
      link.setAttribute('download', `${activeTab}-attendance-report-${new Date().toISOString().split('T')[0]}.csv`);
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
              disabled={activeTab === 'student' ? (!dashboardData || !dashboardData.primary) : (!teacherDashboardData || !teacherDashboardData.primary)}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {t('export', 'Export')}
            </Button>
          </div>

          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full py-4">
            <TabsList className="grid w-full bg-transparent grid-cols-2 gap-4">
              <TabsTrigger value="student">{t('students', 'Students')}</TabsTrigger>
              <TabsTrigger value="teacher">{t('teachers', 'Teachers')}</TabsTrigger>
            </TabsList>

            {/* Student Tab Content */}
            <TabsContent value="student" className="space-y-6">
            {dashboardLoading && (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">{t('loadingData', 'Loading student attendance data...')}</p>
                </div>
              </div>
            )}

            {!dashboardLoading && !dashboardData?.primary && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">{t('noDataAvailable', 'No student attendance data available')}</p>
                </CardContent>
              </Card>
            )}

            {!dashboardLoading && dashboardData?.primary && (
              <>
                {/* Summary Statistics Cards */}
                <AttendanceSummaryCards
                  dashboardData={dashboardData}
                  dashboardFilters={monthlyFilters}
                />

              {/* Daily Trends with Separate Filters */}
              <AttendanceDailyTrends
                dashboardData={dashboardData}
                dashboardFilters={dailyFilters}
                locationOptions={dailyLocationOptions}
                onFilterChange={(field, value) => {
                  if (field === 'all') {
                    setDailyFilters(value);
                    return;
                  }

                  if (field === 'province') {
                    setDailyFilters(prev => ({
                      ...prev,
                      province: value,
                      district: '',
                      school: ''
                    }));
                    setDailyLocationOptions(prev => ({
                      ...prev,
                      districts: [],
                      schools: []
                    }));
                    if (value) {
                      fetchDailyDistricts(value);
                    }
                  } else if (field === 'district') {
                    setDailyFilters(prev => ({
                      ...prev,
                      district: value,
                      school: ''
                    }));
                    setDailyLocationOptions(prev => ({
                      ...prev,
                      schools: []
                    }));
                    if (value) {
                      fetchDailySchools(value);
                    }
                  } else if (field === 'school') {
                    setDailyFilters(prev => ({
                      ...prev,
                      school: value
                    }));
                  } else if (field === 'startDate') {
                    setDailyFilters(prev => ({
                      ...prev,
                      startDate: value
                    }));
                  }
                }}
                onClearFilters={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setDailyFilters({
                    startDate: today,
                    province: '',
                    district: '',
                    school: ''
                  });
                  setDailyLocationOptions({
                    provinces: dailyLocationOptions.provinces,
                    districts: [],
                    schools: []
                  });
                }}
                fetchDistricts={fetchDailyDistricts}
                fetchSchools={fetchDailySchools}
              />

              {/* Monthly Trends with Separate Filters */}
              <AttendanceMonthlyTrends
                dashboardData={dashboardData}
                dashboardFilters={monthlyFilters}
                locationOptions={monthlyLocationOptions}
                onFilterChange={(field, value) => {
                  if (field === 'all') {
                    setMonthlyFilters(value);
                    return;
                  }

                  if (field === 'province') {
                    setMonthlyFilters(prev => ({
                      ...prev,
                      province: value,
                      district: '',
                      school: ''
                    }));
                    setMonthlyLocationOptions(prev => ({
                      ...prev,
                      districts: [],
                      schools: []
                    }));
                    if (value) {
                      fetchMonthlyDistricts(value);
                    }
                  } else if (field === 'district') {
                    setMonthlyFilters(prev => ({
                      ...prev,
                      district: value,
                      school: ''
                    }));
                    setMonthlyLocationOptions(prev => ({
                      ...prev,
                      schools: []
                    }));
                    if (value) {
                      fetchMonthlySchools(value);
                    }
                  } else if (field === 'school') {
                    setMonthlyFilters(prev => ({
                      ...prev,
                      school: value
                    }));
                  } else if (field === 'startDate') {
                    setMonthlyFilters(prev => ({
                      ...prev,
                      startDate: value
                    }));
                  } else if (field === 'endDate') {
                    setMonthlyFilters(prev => ({
                      ...prev,
                      endDate: value
                    }));
                  }
                }}
                onClearFilters={() => {
                  const { startDate, endDate } = getCurrentMonthRange();
                  setMonthlyFilters({
                    startDate,
                    endDate,
                    province: '',
                    district: '',
                    school: ''
                  });
                  setMonthlyLocationOptions({
                    provinces: monthlyLocationOptions.provinces,
                    districts: [],
                    schools: []
                  });
                }}
                fetchDistricts={fetchMonthlyDistricts}
                fetchSchools={fetchMonthlySchools}
              />
              </>
            )}
          </TabsContent>

          {/* Teacher Tab Content */}
          <TabsContent value="teacher" className="space-y-6">
              {dashboardLoading && (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">{t('loadingData', 'Loading teacher attendance data...')}</p>
                  </div>
                </div>
              )}

              {!dashboardLoading && !teacherDashboardData?.primary && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6 text-center">
                    <p className="text-gray-600">{t('noDataAvailable', 'No teacher attendance data available')}</p>
                  </CardContent>
                </Card>
              )}

              {/* Teacher Summary Cards */}
              {!dashboardLoading && teacherDashboardData?.primary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-blue-900">
                        {teacherDashboardData.primary.totalTeachers || 0}
                      </div>
                      <p className="text-sm text-blue-600 mt-2">{t('totalTeachers', 'Total Teachers')}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-green-900">
                        {teacherDashboardData.primary.teachersWithAttendanceData || 0}
                      </div>
                      <p className="text-sm text-green-600 mt-2">{t('withData', 'With Attendance Data')}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-purple-900">
                        {teacherDashboardData.primary.averageHoursWorked?.toFixed(2) || 0}
                      </div>
                      <p className="text-sm text-purple-600 mt-2">{t('averageHours', 'Average Hours Worked')}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-orange-900">
                        {teacherDashboardData.primary.overallAttendancePercentage?.toFixed(1) || 0}%
                      </div>
                      <p className="text-sm text-orange-600 mt-2">{t('attendancePercentage', 'Attendance %')}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Teacher by Role Breakdown */}
              {!dashboardLoading && teacherDashboardData?.byRole && teacherDashboardData.byRole.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('attendanceByRole', 'Attendance by Role')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('role', 'Role')}</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('total', 'Total')}</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('present', 'Present')}</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('absent', 'Absent')}</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('late', 'Late')}</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('leave', 'Leave')}</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('percentage', 'Percentage')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teacherDashboardData.byRole.map((role, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900">{role.roleName || 'N/A'}</td>
                              <td className="text-right py-3 px-4 text-gray-700">{role.totalStaff || 0}</td>
                              <td className="text-right py-3 px-4 text-green-600 font-medium">{role.distribution?.present || 0}</td>
                              <td className="text-right py-3 px-4 text-red-600 font-medium">{role.distribution?.absent || 0}</td>
                              <td className="text-right py-3 px-4 text-yellow-600 font-medium">{role.distribution?.late || 0}</td>
                              <td className="text-right py-3 px-4 text-blue-600 font-medium">{role.distribution?.leave || 0}</td>
                              <td className="text-right py-3 px-4 text-blue-600 font-medium">
                                {role.attendancePercentage?.toFixed(1) || 0}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Teacher Monthly Trends Chart */}
              {teacherDashboardData?.monthly && (
                <AttendanceMonthlyTrends
                  dashboardData={teacherDashboardData}
                  dashboardFilters={monthlyFilters}
                  locationOptions={monthlyLocationOptions}
                  onFilterChange={(field, value) => {
                    if (field === 'all') {
                      setMonthlyFilters(value);
                      return;
                    }

                    if (field === 'province') {
                      setMonthlyFilters(prev => ({
                        ...prev,
                        province: value,
                        district: '',
                        school: ''
                      }));
                      setMonthlyLocationOptions(prev => ({
                        ...prev,
                        districts: [],
                        schools: []
                      }));
                      if (value) {
                        fetchMonthlyDistricts(value);
                      }
                    } else if (field === 'district') {
                      setMonthlyFilters(prev => ({
                        ...prev,
                        district: value,
                        school: ''
                      }));
                      setMonthlyLocationOptions(prev => ({
                        ...prev,
                        schools: []
                      }));
                      if (value) {
                        fetchMonthlySchools(value);
                      }
                    } else if (field === 'school') {
                      setMonthlyFilters(prev => ({
                        ...prev,
                        school: value
                      }));
                    } else if (field === 'startDate') {
                      setMonthlyFilters(prev => ({
                        ...prev,
                        startDate: value
                      }));
                    } else if (field === 'endDate') {
                      setMonthlyFilters(prev => ({
                        ...prev,
                        endDate: value
                      }));
                    }
                  }}
                  onClearFilters={() => {
                    const { startDate, endDate } = getCurrentMonthRange();
                    setMonthlyFilters({
                      startDate,
                      endDate,
                      province: '',
                      district: '',
                      school: ''
                    });
                    setMonthlyLocationOptions({
                      provinces: monthlyLocationOptions.provinces,
                      districts: [],
                      schools: []
                    });
                  }}
                  fetchDistricts={fetchMonthlyDistricts}
                  fetchSchools={fetchMonthlySchools}
                />
              )}

              {/* Filter Button for Teacher Tab */}
              <div className="flex gap-2 mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {t('filters', 'Filters')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const { startDate, endDate } = getCurrentMonthRange();
                    setMonthlyFilters({
                      startDate,
                      endDate,
                      province: '',
                      district: '',
                      school: ''
                    });
                    setMonthlyLocationOptions({
                      provinces: monthlyLocationOptions.provinces,
                      districts: [],
                      schools: []
                    });
                  }}
                  className="flex items-center gap-2"
                >
                  <RefreshCcw className="h-4 w-4" />
                  {t('reset', 'Reset')}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Sidebar Filter for Teacher Tab */}
      <SidebarFilter
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        title={t('filterTeacherAttendance', 'Filter Teacher Attendance')}
        subtitle={t('selectDateAndLocation', 'Select date range and location')}
        hasFilters={monthlyFilters.province || monthlyFilters.district || monthlyFilters.school}
        onApply={() => {
          setSidebarOpen(false);
        }}
        onClearFilters={() => {
          const { startDate, endDate } = getCurrentMonthRange();
          setMonthlyFilters({
            startDate,
            endDate,
            province: '',
            district: '',
            school: ''
          });
          setMonthlyLocationOptions({
            provinces: monthlyLocationOptions.provinces,
            districts: [],
            schools: []
          });
        }}
      >
        {/* Filter Content */}
        <div className="space-y-4">
          <SearchableDropdown
            label={t('province', 'Province')}
            options={monthlyLocationOptions.provinces}
            value={monthlyFilters.province}
            onChange={(value) => {
              setMonthlyFilters(prev => ({
                ...prev,
                province: value,
                district: '',
                school: ''
              }));
              setMonthlyLocationOptions(prev => ({
                ...prev,
                districts: [],
                schools: []
              }));
              if (value) {
                fetchMonthlyDistricts(value);
              }
            }}
            placeholder={t('selectProvince', 'Select Province')}
          />
          <SearchableDropdown
            label={t('district', 'District')}
            options={monthlyLocationOptions.districts}
            value={monthlyFilters.district}
            onChange={(value) => {
              setMonthlyFilters(prev => ({
                ...prev,
                district: value,
                school: ''
              }));
              setMonthlyLocationOptions(prev => ({
                ...prev,
                schools: []
              }));
              if (value) {
                fetchMonthlySchools(value);
              }
            }}
            placeholder={t('selectDistrict', 'Select District')}
            disabled={!monthlyFilters.province}
          />
          <SearchableDropdown
            label={t('school', 'School')}
            options={monthlyLocationOptions.schools}
            value={monthlyFilters.school}
            onChange={(value) => {
              setMonthlyFilters(prev => ({
                ...prev,
                school: value
              }));
            }}
            placeholder={t('selectSchool', 'Select School')}
            disabled={!monthlyFilters.district}
          />
        </div>
      </SidebarFilter>
    </div>
  );
};

export default AttendanceOverview;
