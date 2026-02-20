import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { attendanceService } from '../../utils/api/services/attendanceService';
import locationService from '../../utils/api/services/locationService';
import { schoolService } from '../../utils/api/services/schoolService';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import SearchableDropdown from '../../components/ui/SearchableDropdown';
import SidebarFilter from '../../components/ui/SidebarFilter';
import StudentAttendanceOverviewTab from './StudentAttendanceOverviewTab';
import TeacherAttendanceOverviewTab from './TeacherAttendanceOverviewTab';

const AttendanceOverview = () => {
  const { t } = useLanguage();
  const { error, handleError, clearError } = useErrorHandler();

  // State management
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  // Initialize activeTab - always default to 'teacher' (don't use localStorage)
  const [activeTab, setActiveTab] = useState('teacher');

  const [teacherDashboardData, setTeacherDashboardData] = useState(null);
  const [schoolsCoverageData, setSchoolsCoverageData] = useState(null);
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

  // Fetch schools coverage data (for export)
  const fetchSchoolsCoverage = useCallback(async () => {
    try {
      const coverageParams = {
        page: 1,
        limit: 10000 // Get all schools for export
      };
      if (monthlyFilters.startDate) coverageParams.startDate = monthlyFilters.startDate;
      if (monthlyFilters.endDate) coverageParams.endDate = monthlyFilters.endDate;
      if (monthlyFilters.province) coverageParams.provinceId = parseInt(monthlyFilters.province, 10);
      if (monthlyFilters.district) coverageParams.districtId = parseInt(monthlyFilters.district, 10);

      console.log('Fetching schools coverage with params:', coverageParams);

      const response = await attendanceService.dashboard.getSchoolsCoverage(coverageParams);

      console.log('=== Schools Coverage Response ===');
      console.log('Full response:', response);
      console.log('response.success:', response.success);
      console.log('response.data:', response.data);
      console.log('response.data.schools:', response.data?.schools);
      console.log('schools array length:', response.data?.schools?.length);

      if (response.success) {
        setSchoolsCoverageData(response.data);
        console.log('✅ Schools coverage data SET:', response.data);
      } else {
        console.log('❌ Response not successful');
      }
    } catch (err) {
      console.error('Error fetching schools coverage:', err);
      // Don't show error to user as this is for export only
    }
  }, [monthlyFilters]);

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

  // NOTE: Combined coverage/overall stats logic was removed from this page.

  // Fetch student dashboard when student tab is active
  useEffect(() => {
    console.log('Student useEffect triggered, activeTab:', activeTab);
    if (activeTab === 'student') {
      console.log('Fetching student dashboard...');
      fetchAttendanceDashboard();
    }
  }, [activeTab, fetchAttendanceDashboard]);

  // Fetch teacher dashboard when teacher tab is active
  useEffect(() => {
    console.log('Teacher useEffect triggered, activeTab:', activeTab);
    if (activeTab === 'teacher') {
      console.log('Fetching teacher dashboard...');
      fetchTeacherAttendanceDashboard();
    }
  }, [activeTab, fetchTeacherAttendanceDashboard]);

  // Fetch schools coverage data when filters change (for export)
  useEffect(() => {
    fetchSchoolsCoverage();
  }, [fetchSchoolsCoverage]);


  // Export to CSV
  const handleExportCSV = () => {
    try {
      console.log('');
      console.log('🔵🔵🔵 ATTENDANCE OVERVIEW EXPORT STARTED 🔵🔵🔵');
      console.log('Active Tab:', activeTab);
      console.log('=== EXPORT DEBUG ===');
      console.log('schoolsCoverageData:', schoolsCoverageData);
      console.log('schoolsCoverageData?.schools:', schoolsCoverageData?.schools);
      console.log('schools length:', schoolsCoverageData?.schools?.length);

      let csvRows = [];

      if (activeTab === 'student') {
        if (!dashboardData || !dashboardData.primary) {
          handleError(new Error('No data to export'));
          return;
        }

        // Summary Statistics Section
        csvRows.push(['STUDENT ATTENDANCE SUMMARY']);
        csvRows.push(['']);
        csvRows.push(['Metric', 'Value']);
        csvRows.push(['Total Students', dashboardData.primary.totalStudents || 0]);
        csvRows.push(['Students with Data', dashboardData.primary.studentsWithAttendanceData || 0]);
        csvRows.push(['Total Records', dashboardData.primary.totalAttendanceRecords || 0]);
        csvRows.push(['Overall Attendance %', dashboardData.primary.overallAttendancePercentage?.toFixed(2) || 0]);
        csvRows.push(['Present', dashboardData.primary.attendanceDistribution?.present || 0]);
        csvRows.push(['Absent', dashboardData.primary.attendanceDistribution?.absent || 0]);
        csvRows.push(['Late', dashboardData.primary.attendanceDistribution?.late || 0]);
        csvRows.push(['Leave', dashboardData.primary.attendanceDistribution?.leave || 0]);
        csvRows.push(['']);
        csvRows.push(['']);

      } else {
        if (!teacherDashboardData || !teacherDashboardData.primary) {
          handleError(new Error('No data to export'));
          return;
        }

        // Summary Statistics Section
        csvRows.push(['TEACHER ATTENDANCE SUMMARY']);
        csvRows.push(['']);
        csvRows.push(['Metric', 'Value']);
        csvRows.push(['Total Teachers', teacherDashboardData.primary.totalTeachers || 0]);
        csvRows.push(['Teachers with Data', teacherDashboardData.primary.teachersWithAttendanceData || 0]);
        csvRows.push(['Total Records', teacherDashboardData.primary.totalAttendanceRecords || 0]);
        csvRows.push(['Average Hours Worked', teacherDashboardData.primary.averageHoursWorked?.toFixed(2) || 0]);
        csvRows.push(['Overall Attendance %', teacherDashboardData.primary.overallAttendancePercentage?.toFixed(2) || 0]);
        csvRows.push(['Pending Approvals', teacherDashboardData.primary.pendingApprovals || 0]);
        csvRows.push(['']);
        csvRows.push(['']);
      }

      // School-Level Details Section
      console.log('Checking school data condition...');
      console.log('schoolsCoverageData exists?', !!schoolsCoverageData);
      console.log('schoolsCoverageData.schools exists?', !!schoolsCoverageData?.schools);
      console.log('schools length > 0?', (schoolsCoverageData?.schools?.length || 0) > 0);

      if (schoolsCoverageData && schoolsCoverageData.schools && schoolsCoverageData.schools.length > 0) {
        console.log('✅ Adding school-level details to export...');
        console.log('Number of schools:', schoolsCoverageData.schools.length);
        csvRows.push(['SCHOOL-LEVEL ATTENDANCE DETAILS']);
        csvRows.push(['']);

        // Headers for school data
        csvRows.push([
          'School Name',
          'Total Students',
          'Total Teachers',
          'Days with Attendance',
          'Student Attendance Count',
          'Teacher Attendance Count',
          'Has Student Attendance',
          'Has Teacher Attendance',
          'Coverage Percentage',
          'First Attendance Date',
          'Last Attendance Date'
        ]);

        // School rows
        schoolsCoverageData.schools.forEach((school, index) => {
          if (index === 0) {
            console.log('First school data:', school);
          }
          csvRows.push([
            school.schoolName || 'N/A',
            school.totalStudents || 0,
            school.totalTeachers || 0,
            school.daysWithAttendance || 0,
            school.studentAttendanceCount || 0,
            school.teacherAttendanceCount || 0,
            school.hasStudentAttendance ? 'Yes' : 'No',
            school.hasTeacherAttendance ? 'Yes' : 'No',
            school.coveragePercentage || 0,
            school.firstAttendanceDate ? new Date(school.firstAttendanceDate).toLocaleDateString() : 'N/A',
            school.lastAttendanceDate ? new Date(school.lastAttendanceDate).toLocaleDateString() : 'N/A'
          ]);
        });

        csvRows.push(['']);
        csvRows.push(['']);

        // Add overall statistics from coverage data
        csvRows.push(['OVERALL STATISTICS']);
        csvRows.push(['']);
        csvRows.push(['Metric', 'Value']);
        csvRows.push(['Total Schools', schoolsCoverageData.totalSchools || 0]);
        csvRows.push(['Schools with Student Attendance', schoolsCoverageData.schoolsWithStudentAttendance || 0]);
        csvRows.push(['Schools with Teacher Attendance', schoolsCoverageData.schoolsWithTeacherAttendance || 0]);
        csvRows.push(['Total Students in Schools with Attendance', schoolsCoverageData.totalStudentsInSchoolsWithAttendance || 0]);
        csvRows.push(['Total Teachers in Schools with Attendance', schoolsCoverageData.totalTeachersInSchoolsWithAttendance || 0]);
        csvRows.push(['Total Students with Attendance', schoolsCoverageData.totalStudentsWithAttendance || 0]);
        csvRows.push(['Total Teachers with Attendance', schoolsCoverageData.totalTeachersWithAttendance || 0]);
      } else {
        console.log('❌ School-level details NOT added because:');
        console.log('  - schoolsCoverageData exists?', !!schoolsCoverageData);
        console.log('  - schools array exists?', !!schoolsCoverageData?.schools);
        console.log('  - schools has items?', (schoolsCoverageData?.schools?.length || 0) > 0);
      }

      // Convert to CSV format
      const csvContent = csvRows
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      console.log('Total CSV rows:', csvRows.length);
      console.log('First 5 rows:', csvRows.slice(0, 5));

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const fileName = `attendance-report-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ Export completed! File:', fileName);
      console.log('🔵🔵🔵 EXPORT FINISHED 🔵🔵🔵');
      console.log('');
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
            <TabsContent value="student" className="space-y-2 mt-6">
              <StudentAttendanceOverviewTab
                dashboardLoading={dashboardLoading}
                dashboardData={dashboardData}
                dailyFilters={dailyFilters}
                monthlyFilters={monthlyFilters}
                dailyLocationOptions={dailyLocationOptions}
                monthlyLocationOptions={monthlyLocationOptions}
                onDailyFilterChange={(field, value) => {
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
                onDailyFiltersClear={() => {
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
                onMonthlyFilterChange={(field, value) => {
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
                onMonthlyFiltersClear={() => {
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
                fetchDailyDistricts={fetchDailyDistricts}
                fetchDailySchools={fetchDailySchools}
                fetchMonthlyDistricts={fetchMonthlyDistricts}
                fetchMonthlySchools={fetchMonthlySchools}
              />
            </TabsContent>

          {/* Teacher Tab Content */}
          <TabsContent value="teacher" className="space-y-6 mt-6">
            <TeacherAttendanceOverviewTab
              dashboardLoading={dashboardLoading}
              teacherDashboardData={teacherDashboardData}
              monthlyFilters={monthlyFilters}
              monthlyLocationOptions={monthlyLocationOptions}
              onMonthlyFilterChange={(field, value) => {
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
              onMonthlyFiltersClear={(filters) => {
                setMonthlyFilters(filters);
                setMonthlyLocationOptions({
                  provinces: monthlyLocationOptions.provinces,
                  districts: [],
                  schools: []
                });
              }}
              fetchMonthlyDistricts={fetchMonthlyDistricts}
              fetchMonthlySchools={fetchMonthlySchools}
              getCurrentMonthRange={getCurrentMonthRange}
              onSidebarOpen={() => setSidebarOpen(true)}
            />
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
