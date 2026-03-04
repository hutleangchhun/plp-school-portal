import { useState, useEffect } from 'react';
import { BarChart3, Download, Filter, Calendar } from 'lucide-react';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import DynamicLoader from '../../components/ui/DynamicLoader';
import Dropdown from '../../components/ui/Dropdown';
import EmptyState from '../../components/ui/EmptyState';
import { DatePickerWithDropdowns } from '../../components/ui/date-picker-with-dropdowns';
import { YearPicker } from '../../components/ui/year-picker';
import ExportProgressModal from '../../components/modals/ExportProgressModal';
import { processAndExportReport } from '../../utils/reportExportUtils';
import { exportReport4SemesterToExcel } from '../../utils/report4SemesterExportUtils';
import { exportService } from "../../utils/api/services/exportService";
import { classService } from "../../utils/api/services/classService";
import { Button } from '@/components/ui/Button';
import { formatClassIdentifier, getGradeLevelOptions as getSharedGradeLevelOptions } from '../../utils/helpers';
import { getAcademicYearOptions } from '../../utils/formOptions';
// Export utility functions
import { exportReport4ToExcel } from './report4/indexReport4';
import { graphqlService } from '../../utils/api/services/graphqlService';
import ReportPreviewPanel from './ReportPreviewPanel';

export default function Reports() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [selectedReport, setSelectedReport] = useState('report1');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getMonth() + 1}`);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSemesterStartDate, setSelectedSemesterStartDate] = useState(null);
  const [selectedSemesterEndDate, setSelectedSemesterEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [allClasses, setAllClasses] = useState([]); // Store all classes from API
  const [availableClasses, setAvailableClasses] = useState([]); // Filtered classes based on grade level
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('all'); // Grade level filter
  const [selectedClass, setSelectedClass] = useState('all');


  // BMI Report Pagination State
  const [bmiPage, setBmiPage] = useState(1);
  const [bmiPagination, setBmiPagination] = useState(null);
  const [bmiLimit, setBmiLimit] = useState(10);
  // GraphQL preview data
  const [checkData, setCheckData] = useState(null);
  const [checkLoading, setCheckLoading] = useState(false);
  // Export Progress Modal State
  const [exportModalState, setExportModalState] = useState({
    isOpen: false,
    progress: 0,
    status: 'processing'
  });

  // Report Types - Only showing working reports (others are commented out for future implementation)
  const reportTypes = [
    // ✅ Working Reports
    { value: 'report1', label: t('reportStudentNameInfo', 'បញ្ជីហៅឈ្មោះសិស្ស') },
    { value: 'report4', label: t('report4', 'បញ្ជីវត្តមានសិស្ស') },
    { value: 'reportTeacherAttendance', label: t('reportTeacherAttendance', 'បញ្ជីវត្តមានគ្រូ') },
    { value: 'report6', label: t('report6', 'បញ្ជីឈ្មោះសិស្សមានពិការភាព') },
    { value: 'report8', label: t('report8', 'បញ្ជីឈ្មោះសិស្សមានទិន្នន័យ BMI') },
    { value: 'report9', label: t('report9', 'បញ្ជីឈ្មោះសិស្សជាជនជាតិដើមភាគតិច') },

    // 🚧 Not Yet Implemented - Uncomment when ready
    // { value: 'report3', label: t('report3', 'បញ្ជីមធ្យមភាគសិស្ស') },
    // { value: 'report5', label: t('report5', 'បញ្ជីឈ្មោះសិស្សអាហារូបករណ៍') },
    // { value: 'report7', label: t('report7', 'បញ្ជីឈ្មោះសិស្សមានបញ្ហាសុខភាព') },
    // { value: 'report10', label: t('report10', 'បញ្ជីឈ្មោះសិស្សផ្លាស់ប្ដូរថ្នាក់') },
    // { value: 'report11', label: t('report11', 'បញ្ជីឈ្មោះសិស្សបោះបង់ការសិក្សារ') },
    // { value: 'report12', label: t('report12', 'សៀវភៅតាមដាន') },
    // { value: 'report13', label: t('report13', 'សៀវភៅសិក្ខាគារិក') },
  ];

  // Time Period Options
  const timePeriods = [
    { value: 'month', label: t('byMonth', 'By Month') },
    { value: 'semester1', label: t('bySemester1', 'Semester 1') },
    { value: 'semester2', label: t('bySemester2', 'Semester 2') },
    { value: 'year', label: t('byYear', 'By Year') }
  ];

  // Month Options (1-12) - Khmer Names
  const monthOptions = [
    { value: '1', label: t('january', 'មករា') },
    { value: '2', label: t('february', 'កុម្ភៈ') },
    { value: '3', label: t('march', 'មីនា') },
    { value: '4', label: t('april', 'មេសា') },
    { value: '5', label: t('may', 'ឧសភា') },
    { value: '6', label: t('june', 'មិថុនា') },
    { value: '7', label: t('july', 'កក្កដា') },
    { value: '8', label: t('august', 'សីហា') },
    { value: '9', label: t('september', 'កញ្ញា') },
    { value: '10', label: t('october', 'តុលា') },
    { value: '11', label: t('november', 'វិច្ឆិកា') },
    { value: '12', label: t('december', 'ធ្នូ') }
  ];


  // Reset report data whenever any filter changes
  useEffect(() => {
    setReportData([]);
    if (selectedReport === 'report8') {
      setBmiPage(1);
    }
  }, [selectedReport, selectedPeriod, selectedMonth, selectedYear, selectedClass, selectedSemesterStartDate, selectedSemesterEndDate]);

  // Auto-check data availability whenever filters change
  useEffect(() => {
    fetchReportData();
  }, [selectedReport, selectedPeriod, selectedMonth, selectedYear, selectedClass, selectedSemesterStartDate, selectedSemesterEndDate, bmiPage, bmiLimit]);

  // Fetch classes when report1, report3, report4, or report8 is selected, or when grade level changes
  // For report1 and report4: Only fetch if a specific grade level is selected
  useEffect(() => {
    if (['report1', 'report3', 'report4', 'report8'].includes(selectedReport)) {
      // For report1 and report4: require grade level selection before fetching
      if (['report1', 'report4'].includes(selectedReport) && (!selectedGradeLevel || selectedGradeLevel === 'all')) {
        setAllClasses([]);
        setSelectedClass('all');
        return;
      }

      fetchSchoolClasses();
      // Reset class selection when grade level changes
      setSelectedClass('all');
    }
  }, [selectedReport, selectedGradeLevel]);

  const fetchSchoolClasses = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const schoolId = userData?.school?.id || userData?.schoolId;

      if (!schoolId) return;

      console.log('📚 Fetching classes for school:', schoolId, 'with gradeLevel:', selectedGradeLevel);

      // Build query parameters - pass gradeLevel to API for server-side filtering
      const queryParams = {
        page: 1,
        limit: 100
      };

      // Add gradeLevel filter if not 'all'
      if (selectedGradeLevel && selectedGradeLevel !== 'all') {
        queryParams.gradeLevel = selectedGradeLevel;
        console.log('🎯 Applying grade level filter to classes:', selectedGradeLevel);
      } else {
        console.log('📋 Fetching all classes (no grade level filter)');
      }

      const response = await classService.getBySchool(schoolId, queryParams);

      if (response.success && response.classes) {
        // Store filtered classes returned by API
        setAllClasses(response.classes);
        console.log(`✅ Fetched ${response.classes.length} classes`);
        console.log('📚 Classes with gradeLevel:', response.classes.slice(0, 3).map(c => ({
          name: c.name,
          gradeLevel: c.gradeLevel,
          grade_level: c.grade_level,
          id: c.id
        })));
      }
    } catch (error) {
      console.error('❌ Error fetching classes:', error);
    }
  };

  // Build class dropdown options from filtered classes returned by API
  const getClassOptions = () => {
    const classOptions = [];

    // Only add "All Classes" option for reports that allow it
    // Report 1 and Report 4 require specific class selection
    if (!['report1', 'report4'].includes(selectedReport)) {
      classOptions.push({ value: 'all', label: t('allClasses', 'All Classes') });
    }

    classOptions.push(...allClasses.map(cls => {
      const rawGradeLevel =
        typeof cls.gradeLevel !== 'undefined' && cls.gradeLevel !== null
          ? String(cls.gradeLevel)
          : '';

      const displayGradeLevel =
        rawGradeLevel === '0'
          ? t('grade0', 'Kindergarten')
          : rawGradeLevel;

      return {
        value: cls.id.toString(),
        label: `${t('class') || 'Class'} ${formatClassIdentifier(displayGradeLevel, cls.section)}`
      };
    }));

    return classOptions;
  };

  // Get unique grade levels from all classes
  const getGradeLevelOptions = () => {
    // Shared helper uses global grade config (including Kindergarten) and translations
    return getSharedGradeLevelOptions(t, true);
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const schoolId = userData?.school?.id || userData?.schoolId;

      if (!schoolId) {
        showError(t('noSchoolIdFound', 'No school ID found. Please ensure you are logged in.'));
        setReportData([]);
        return;
      }

      // For report1 and report4, validate class selection first
      if (['report1', 'report4'].includes(selectedReport)) {
        if (!selectedClass || selectedClass === 'all') {
          // Don't show error, just set empty data and stop loading
          setReportData([]);
          setLoading(false);
          return;
        }
      }

      console.log('📊 Checking report data availability:', {
        report: selectedReport,
        period: selectedPeriod,
        month: selectedMonth,
        year: selectedYear,
        schoolId,
        classId: selectedClass !== 'all' ? selectedClass : undefined
      });

      let hasData = false;
      let recordCount = 1; // Default to 1 so the array length > 0 if hasData is true

      const isGqlReport = ['report6', 'report9', 'report8'].includes(selectedReport) ||
        (selectedReport === 'report1' && selectedClass && selectedClass !== 'all') ||
        (selectedReport === 'report4' && selectedPeriod === 'month') ||
        (selectedReport === 'reportTeacherAttendance' && selectedPeriod === 'month');

      if (isGqlReport) {
        // Validate required filters before calling GraphQL
        if (selectedReport === 'report4' || selectedReport === 'reportTeacherAttendance') {
          if (!selectedYear || !selectedMonth) {
            setReportData([]);
            setLoading(false);
            return;
          }
        } else if (selectedReport === 'report8') {
          const hasAnyFilter = selectedYear ||
            (selectedGradeLevel && selectedGradeLevel !== 'all') ||
            (selectedClass && selectedClass !== 'all');
          if (!hasAnyFilter || !selectedYear) {
            setReportData([]);
            setLoading(false);
            return;
          }
        }

        setCheckLoading(true);
        setCheckData(null);
        try {
          let gqlData = null;
          if (selectedReport === 'report8' && selectedYear) {
            gqlData = await graphqlService.exportBmiCheck({
              schoolId: parseInt(schoolId),
              academicYear: selectedYear,
              gradeLevel: selectedGradeLevel && selectedGradeLevel !== 'all' ? selectedGradeLevel : undefined,
              classId: selectedClass && selectedClass !== 'all' ? selectedClass : undefined,
            });
          } else if (selectedReport === 'report6') {
            gqlData = await graphqlService.exportAccessibilityCheck({ schoolId: parseInt(schoolId) });
          } else if (selectedReport === 'report9') {
            gqlData = await graphqlService.exportEthnicCheck({ schoolId: parseInt(schoolId) });
          } else if (selectedReport === 'report1' && selectedClass && selectedClass !== 'all') {
            gqlData = await graphqlService.exportStudentListCheck(selectedClass);
          } else if (selectedReport === 'report4' && selectedClass && selectedClass !== 'all') {
            gqlData = await graphqlService.exportClassMonthlyCheck({
              classId: selectedClass,
              year: parseInt(selectedYear),
              month: parseInt(selectedMonth),
            });
          } else if (selectedReport === 'reportTeacherAttendance') {
            gqlData = await graphqlService.exportTeacherMonthlyCheck({
              schoolId: parseInt(schoolId),
              year: parseInt(selectedYear),
              month: parseInt(selectedMonth),
            });
          }

          setCheckData(gqlData);
          if (gqlData && gqlData.hasData) {
            hasData = true;
            if (gqlData.studentCount !== undefined) {
              recordCount = gqlData.studentCount === 0 ? 1 : gqlData.studentCount;
            } else if (gqlData.teacherCount !== undefined) {
              recordCount = gqlData.teacherCount === 0 ? 1 : gqlData.teacherCount;
            } else {
              recordCount = 1;
            }
          }
        } catch (gqlErr) {
          console.warn('⚠️ GraphQL preview fetch failed:', gqlErr.message);
          setCheckData(null);
        } finally {
          setCheckLoading(false);
        }
      } else {
        // For reports without a specific check endpoint (report1 non-monthly, etc.)
        // Only assume data is available if at least one filter has been selected
        const hasAnyFilter = selectedYear ||
          (selectedClass && selectedClass !== 'all') ||
          (selectedGradeLevel && selectedGradeLevel !== 'all');

        if (!hasAnyFilter) {
          setReportData([]);
          setLoading(false);
          return;
        }

        hasData = true;
        recordCount = 1;
      }

      if (hasData) {
        setReportData(new Array(recordCount).fill({}));
      } else {
        setReportData([]);
      }
    } catch (error) {
      console.error('❌ Error checking report data:', error);
      showError(t('errorFetchingReportData', 'Error validating report data'));
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    setLoading(true);
    try {
      const reportName = reportTypes.find(r => r.value === selectedReport)?.label || 'Report';
      const periodName = timePeriods.find(p => p.value === selectedPeriod)?.label || '';
      const monthName = selectedPeriod === 'month' && selectedMonth
        ? monthOptions.find(m => m.value === selectedMonth)?.label
        : '';

      const periodInfo = `${periodName}${monthName ? ` (${monthName})` : ''} ${selectedYear}`;

      const isAsyncExport = selectedReport === 'report1' ||
        selectedReport === 'report6' ||
        selectedReport === 'report8' ||
        selectedReport === 'report9' ||
        (selectedReport === 'report4' && selectedPeriod === 'month') ||
        (selectedReport === 'reportTeacherAttendance' && selectedPeriod === 'month');

      // Get school name
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const schoolName = schoolInfo?.name || userData?.school?.name || 'PLP School';

      if (isAsyncExport) {
        const year = parseInt(selectedYear);
        const monthIndex = parseInt(selectedMonth);

        try {
          // Show export modal immediately for async jobs
          setExportModalState({ isOpen: true, progress: 10, status: 'processing', jobId: null });

          let enqueueRes;
          if (selectedReport === 'report1') {
            if (!selectedClass || selectedClass === 'all') {
              setExportModalState({ isOpen: false, progress: 0, status: 'error' });
              showError(t('selectClassRequired', 'Please select a specific class.'));
              setLoading(false);
              return;
            }
            enqueueRes = await exportService.enqueueStudentListExport(selectedClass);
          } else if (selectedReport === 'report6') {
            const accessibilityParams = {};
            if (schoolInfo?.id) accessibilityParams.schoolId = schoolInfo.id;
            if (!accessibilityParams.schoolId) {
              const userData = JSON.parse(localStorage.getItem('user') || '{}');
              accessibilityParams.schoolId = userData?.school?.id || userData?.schoolId;
            }
            enqueueRes = await exportService.enqueueStudentsAccessibilityExport(accessibilityParams);
          } else if (selectedReport === 'report9') {
            const ethnicParams = {};
            if (schoolInfo?.id) ethnicParams.schoolId = schoolInfo.id;
            if (!ethnicParams.schoolId) {
              const userData = JSON.parse(localStorage.getItem('user') || '{}');
              ethnicParams.schoolId = userData?.school?.id || userData?.schoolId;
            }
            enqueueRes = await exportService.enqueueStudentEthnicExport(ethnicParams);
          } else if (selectedReport === 'report8') {
            const bmiParams = {};
            if (schoolInfo?.id) bmiParams.schoolId = schoolInfo.id;
            if (!bmiParams.schoolId) {
              const userData = JSON.parse(localStorage.getItem('user') || '{}');
              bmiParams.schoolId = userData?.school?.id || userData?.schoolId;
            }
            if (selectedYear) bmiParams.academicYear = selectedYear;
            if (selectedClass && selectedClass !== 'all') bmiParams.classId = selectedClass;
            if (selectedGradeLevel && selectedGradeLevel !== 'all') bmiParams.gradeLevel = selectedGradeLevel;

            enqueueRes = await exportService.enqueueStudentBmiExport(bmiParams);
          } else if (selectedReport === 'report4') {
            if (!selectedClass || selectedClass === 'all') {
              setExportModalState({ isOpen: false, progress: 0, status: 'error' });
              showError(t('selectClassRequired', 'Please select a specific class.'));
              setLoading(false);
              return;
            }
            enqueueRes = await exportService.enqueueStudentMonthlyExport(selectedClass, year, monthIndex);
          } else {
            const schoolIdToUse = schoolInfo?.id || userData?.school?.id || userData?.schoolId;
            if (!schoolIdToUse) {
              setExportModalState({ isOpen: false, progress: 0, status: 'error' });
              showError(t('noSchoolIdFound', 'No school ID found.'));
              setLoading(false);
              return;
            }
            enqueueRes = await exportService.enqueueTeacherMonthlyExport(schoolIdToUse, year, monthIndex);
          }

          if (!enqueueRes.success) {
            throw new Error(enqueueRes.error || 'Failed to enqueue export job');
          }

          const jobId = enqueueRes.data?.jobId || enqueueRes.jobId;
          setExportModalState(prev => ({ ...prev, progress: 40, jobId }));

          // Poll every 3 seconds
          // Store interval ID in state so it can be cleared remotely
          const intervalId = setInterval(async () => {
            // Fake progress while waiting
            setExportModalState(prev => ({
              ...prev,
              progress: Math.min(prev.progress + 5, 85)
            }));

            try {
              const statusRes = await exportService.getJobStatus(jobId);
              const job = statusRes.data || statusRes;

              if (job.status === 'completed') {
                clearInterval(intervalId);
                setExportModalState(prev => ({ ...prev, progress: 95 }));
                // Download file
                try {
                  const blobRes = await exportService.downloadJobResult(jobId);
                  const url = window.URL.createObjectURL(new Blob([blobRes.data || blobRes]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', job.filename || `export_${year}_${monthIndex}.xlsx`);
                  document.body.appendChild(link);
                  link.click();
                  link.parentNode.removeChild(link);
                  window.URL.revokeObjectURL(url);

                  setExportModalState({ isOpen: false, progress: 100, status: 'success' });
                  showSuccess(t('exportSuccess', 'Report exported successfully!'));
                  setLoading(false);
                } catch (downloadErr) {
                  console.error('Download error:', downloadErr);
                  setExportModalState({ isOpen: false, progress: 100, status: 'error' });
                  showError(t('downloadFailed', 'Failed to download the report.'));
                  setLoading(false);
                }
              } else if (job.status === 'failed') {
                clearInterval(intervalId);
                setExportModalState({ isOpen: false, progress: 100, status: 'error' });
                showError(t('exportFailed', 'Export failed: ') + (job.error || 'Unknown error'));
                setLoading(false);
              }
            } catch (pollErr) {
              console.error('Polling error:', pollErr);
              clearInterval(intervalId);
              setExportModalState({ isOpen: false, progress: 100, status: 'error' });
              showError(t('exportPollError', 'Error checking export status.'));
              setLoading(false);
            }
          }, 3000);

          setExportModalState(prev => ({ ...prev, pollInterval: intervalId }));

          return; // Exit early since polling handles the completion
        } catch (err) {
          console.error('Export error:', err);
          setExportModalState({ isOpen: false, progress: 0, status: 'error' });
          showError(err.message || t('errorExportingReport', 'Error exporting report'));
          setLoading(false);
          return;
        }
      }

      // Check if we have report data for non-async exports
      if (!reportData || reportData.length === 0) {
        showError(t('noDataToExport', 'No data available to export. Please wait for data to load.'));
        setLoading(false);
        return;
      }

      // Get class name for report1 and report4
      let className = '';
      if (['report1', 'report4'].includes(selectedReport) && selectedClass && selectedClass !== 'all') {
        const classOptions = getClassOptions();
        const classOption = classOptions.find(c => c.value === selectedClass);
        className = classOption?.label || '';
      }

      console.log(`📥 Exporting report: ${reportName} with ${reportData.length} records`);
      console.log(`📚 Selected class: ${selectedClass}, Class name: ${className}`);

      // Show modal initially for synchronous exports
      setExportModalState({ isOpen: true, progress: 10, status: 'processing' });
      // Special handling for Report 4 (Absence Report) non-month - use calendar format
      let result;
      if (selectedReport === 'report4') {
        // Calculate date range and selected date based on period
        let selectedDate = new Date();
        let startDate, endDate;
        const year = parseInt(selectedYear);

        if ((selectedPeriod === 'semester1' || selectedPeriod === 'semester2') && selectedSemesterStartDate && selectedSemesterEndDate) {
          // Custom semester date range - use semester export function
          result = await exportReport4SemesterToExcel(reportData, {
            schoolName,
            className: className || 'All Classes',
            startDate: selectedSemesterStartDate,
            endDate: selectedSemesterEndDate,
            selectedYear,
            periodName: selectedPeriod === 'semester1' ? 'ឆមាសទី១' : 'ឆមាសទី២'
          });
        } else if (selectedPeriod === 'semester') {
          // Semester report (6 months)
          selectedDate = new Date(year, 0, 15);
          startDate = new Date(year, 0, 1);
          endDate = new Date(year, 5, 30);

          result = await exportReport4SemesterToExcel(reportData, {
            schoolName,
            className: className || 'All Classes',
            startDate,
            endDate,
            selectedYear,
            periodName: 'ឆមាសទី១'
          });
        } else {
          // Yearly report
          selectedDate = new Date(year, 0, 15);
          startDate = new Date(year, 0, 1);
          endDate = new Date(year, 11, 31);

          result = await exportReport4ToExcel(reportData, {
            schoolName,
            className: className || 'All Classes',
            selectedDate,
            period: 'year',
            periodName,
            monthName,
            selectedYear,
            startDate,
            endDate
          });
        }

      } else {
        // Process and export other reports with standard format
        result = await processAndExportReport(
          selectedReport,
          reportData,
          reportName,
          periodInfo,
          schoolName,
          className
        );
      }

      setExportModalState(prev => ({ ...prev, progress: 90 }));

      if (result.success) {
        setExportModalState({ isOpen: false, progress: 100, status: 'success' });
        showSuccess(t('reportExportedSuccessfully', `Report exported: ${reportName} - ${result.recordCount} records`));
      } else {
        setExportModalState({ isOpen: false, progress: 100, status: 'error' });
        showError(result.error || t('errorExportingReport', 'Error exporting report'));
      }
    } catch (error) {
      console.error('❌ Error exporting report:', error);
      setExportModalState({ isOpen: false, progress: 100, status: 'error' });
      showError(t('errorExportingReport', 'Error exporting report'));
    } finally {
      if (selectedReport === 'report8' || !['report1', 'report4', 'report6', 'report8', 'report9', 'reportTeacherAttendance'].includes(selectedReport)) {
        setLoading(false);
      }
    }
  };

  const cancelExportJob = () => {
    // Clear the polling interval
    if (exportModalState.pollInterval) {
      clearInterval(exportModalState.pollInterval);
    }

    // Reset modal state
    setExportModalState({ isOpen: false, progress: 0, status: 'idle', jobId: null, pollInterval: null });
    setLoading(false);

    // Optionally call an API to cancel the job on backend
    // if (exportModalState.jobId) {
    //   exportService.cancelJob(exportModalState.jobId).catch(console.error);
    // }

    showSuccess(t('exportCancelled', 'Export job cancelled.'));
  };

  const runExportInBackground = () => {
    // Hide the modal but KEEP the polling interval running in the background state
    // We update the state to hidden, but don't clear the interval
    setExportModalState(prev => ({ ...prev, isOpen: false }));
    showSuccess(t('exportRunningInBackground', 'Export is running in background. You will be notified when it completes.'));
    // Do not set loading to false here so the Export button remains disabled,
    // or set it to false if you want them to be able to start another one concurrently (depending on your requirements)
    setLoading(false);
  };

  return (
    <PageTransition className='bg-gray-50'>
      <div className='p-3 sm:p-6'>

        <ExportProgressModal
          isOpen={exportModalState.isOpen}
          progress={exportModalState.progress}
          status={exportModalState.status}
          onRunInBackground={runExportInBackground}
          onCancel={cancelExportJob}
        />

        <FadeInSection delay={100} className="mx-2">
          <div className='flex justify-between items-start'>
            <div className="mb-4">
              <h4 className="text-lg sm:text-xl font-bold text-gray-900">
                {t('reports') || 'Reports & Analytics'}
              </h4>
              <p className="mt-1 text-sm text-gray-500">
                {t('viewAnalytics') || 'View comprehensive analytics and generate reports'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Left Sidebar: Report Category */}
            <div className="lg:col-span-1 border border-transparent">
              <div className="bg-white rounded-sm shadow-sm border border-gray-200 sticky top-6 flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-blue-500 text-white flex items-center gap-2">
                  <h5 className="text-base font-medium">{t('reportType', 'Report Category')}</h5>
                </div>
                <div className="p-3 space-y-1 flex-1 overflow-y-auto">
                  {reportTypes.map((report) => (
                    <button
                      key={report.value}
                      onClick={() => {
                        const prev = selectedReport;
                        const next = report.value;
                        setSelectedReport(next);

                        // Reset year when leaving BMI (report8) — academic year is only for BMI
                        if (prev === 'report8' && next !== 'report8') {
                          setSelectedYear(null);
                        }

                        // Switching between student attendance (report4) and teacher attendance:
                        // keep period/month/year but reset class-specific filters
                        const attendanceReports = ['report4', 'reportTeacherAttendance'];
                        if (attendanceReports.includes(next) && attendanceReports.includes(prev) && next !== prev) {
                          setSelectedClass('all');
                          setSelectedGradeLevel('all');
                        } else if (!attendanceReports.includes(next)) {
                          // Switching to a non-attendance report — reset class
                          setSelectedClass('all');
                        }

                        // Auto-select current month for Report 4 directly
                        if (next === 'report4') {
                          setSelectedMonth(`${new Date().getMonth() + 1}`);
                          setSelectedPeriod('month');
                        }
                      }}
                      className={`w-full text-left px-3 py-2.5 transition-colors duration-200 text-sm ${selectedReport === report.value
                        ? 'bg-blue-50 text-blue-700 font-medium border-l-4 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-100 border-l-4 border-transparent'
                        }`}
                    >
                      {report.label}
                    </button>
                  ))}

                </div>
              </div>
            </div>

            <FadeInSection delay={100} className="lg:col-span-3">
              {/* Right Content Area: Report Parameters & Preview */}
              <div className="flex flex-col gap-6">
                {/* Report Parameters */}
                {selectedReport && (
                  <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-visible">
                    <div className="p-4 sm:p-5 bg-gray-50/50 border-b border-gray-200 flex items-center justify-between gap-2 rounded-t-xl">
                      <h5 className="text-lg font-medium text-gray-900">{t('reportParameters', 'Report Parameters')}</h5>
                      <div className="mt-4 sm:mt-0">
                        <Button
                          onClick={handleExportReport}
                          disabled={loading || (['report1', 'report4'].includes(selectedReport) && (!selectedClass || selectedClass === 'all')) || reportData.length === 0}
                          size="sm"
                          variant="default"
                          className="w-full sm:w-auto shadow-sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {loading ? 'Exporting...' : (t('exportReport') || 'Export Report')}
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6 lg:overflow-x-auto">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end pb-2">
                        {/* Step 2a: Grade Level Filter - Shown for report1, report3, report4, and report8 (cascade filter) */}
                        {['report1', 'report3', 'report4', 'report8'].includes(selectedReport) && (
                          <div className="col-span-1 w-full">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 truncate">
                              {t('selectGradeLevel') || 'Select Grade Level'}
                            </label>
                            <Dropdown
                              value={selectedGradeLevel}
                              onValueChange={(value) => {
                                setSelectedGradeLevel(value);
                                // Reset class selection when grade level changes
                                setSelectedClass('all');
                              }}
                              options={getGradeLevelOptions()}
                              placeholder={t('chooseGradeLevel', 'Choose grade level...')}
                              minWidth="w-full"
                              maxHeight="max-h-56"
                              itemsToShow={10}
                            />
                          </div>
                        )}

                        {/* Step 2b: Class Filter - Shown for report1, report3, report4, and report8 (filtered by grade level) */}
                        {/* For report1 and report4: Only show class filter if grade level is selected */}
                        {['report1', 'report4'].includes(selectedReport) && selectedGradeLevel && selectedGradeLevel !== 'all' && (
                          <div className="col-span-1 w-full">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 truncate">
                              {t('selectClass') || 'Select Class'}
                              {['report1', 'report4'].includes(selectedReport) && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <Dropdown
                              value={selectedClass}
                              onValueChange={setSelectedClass}
                              options={getClassOptions()}
                              placeholder={t('chooseClass', 'Choose class...')}
                              minWidth="w-full"
                              maxHeight="max-h-56"
                              itemsToShow={10}
                            />
                          </div>
                        )}

                        {/* For report3 and report8: Show class filter normally after grade level loads */}
                        {['report3', 'report8'].includes(selectedReport) && allClasses.length > 0 && (
                          <div className="col-span-1 w-full">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 truncate">
                              {t('selectClass') || 'Select Class'}
                            </label>
                            <Dropdown
                              value={selectedClass}
                              onValueChange={setSelectedClass}
                              options={getClassOptions()}
                              placeholder={t('chooseClass', 'Choose class...')}
                              minWidth="w-full"
                              maxHeight="max-h-56"
                              itemsToShow={10}
                            />
                          </div>
                        )}

                        {/* Step 3a: Year Filter - Shown for report8 */}
                        {selectedReport === 'report8' && (
                          <div className="col-span-1 w-full">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 truncate">
                              {t('selectAcademicYear') || 'Select Academic Year'}
                            </label>
                            <Dropdown
                              value={selectedYear}
                              onValueChange={setSelectedYear}
                              options={getAcademicYearOptions()}
                              placeholder={t('selectAcademicYear', 'Select academic year...')}
                              minWidth="w-full"
                              maxHeight="max-h-56"
                            />
                          </div>
                        )}

                        {/* Step 3: Date filters - Only show after class is selected for report4, show always for reportTeacherAttendance */}
                        {/* For report4: Show date filters only if class is selected */}
                        {((selectedReport === 'report4' && selectedClass && selectedClass !== 'all') || selectedReport === 'reportTeacherAttendance') && (
                          <>
                            {/* Time Period Dropdown */}
                            <div className="col-span-1 w-full">
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 truncate">
                                {t('timePeriod') || 'Time Period'}
                              </label>
                              <Dropdown
                                value={selectedPeriod}
                                onValueChange={setSelectedPeriod}
                                options={['report4', 'reportTeacherAttendance'].includes(selectedReport) ? timePeriods.filter(p => p.value === 'month') : timePeriods}
                                placeholder={t('selectTimePeriod', 'Select time period...')}
                                minWidth="w-full"
                                maxHeight="max-h-40"
                                itemsToShow={5}
                              />
                            </div>

                            {/* Month Dropdown (shown when period is 'month') */}
                            {selectedPeriod === 'month' && (
                              <div className="col-span-1 w-full">
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 truncate">
                                  {t('selectMonth') || 'Select Month'}
                                </label>
                                <Dropdown
                                  value={selectedMonth}
                                  onValueChange={setSelectedMonth}
                                  options={monthOptions}
                                  placeholder={t('selectMonth', 'Choose month...')}
                                  minWidth="w-full"
                                  maxHeight="max-h-40"
                                  itemsToShow={5}
                                />
                              </div>
                            )}

                            {/* Date Range for Semester (shown when period is 'semester1' or 'semester2') */}
                            {(selectedPeriod === 'semester1' || selectedPeriod === 'semester2') && (
                              <>
                                <div className="w-full">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('startDate') || 'Start Date'}
                                  </label>
                                  <DatePickerWithDropdowns
                                    value={selectedSemesterStartDate}
                                    onChange={setSelectedSemesterStartDate}
                                    placeholder={t('selectStartDate', 'Select start date')}
                                    className="w-full"
                                  />
                                </div>
                                <div className="w-full">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('endDate') || 'End Date'}
                                  </label>
                                  <DatePickerWithDropdowns
                                    value={selectedSemesterEndDate}
                                    onChange={setSelectedSemesterEndDate}
                                    placeholder={t('selectEndDate', 'Select end date')}
                                    className="w-full"
                                  />
                                </div>
                              </>
                            )}

                            {/* Year Picker */}
                            <div className="w-full">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('selectYear') || 'Select Year'}
                              </label>
                              <YearPicker
                                value={selectedYear}
                                onChange={setSelectedYear}
                                placeholder={t('chooseYear', 'Choose year...')}
                              />
                            </div>
                          </>
                        )}

                        {/* For other reports (not report1, report4, report6, report8, report9, reportTeacherAttendance): Show date filters normally */}
                        {!['report1', 'report4', 'report6', 'report8', 'report9', 'reportTeacherAttendance'].includes(selectedReport) && (
                          <>
                            {/* Time Period Dropdown */}
                            <div className="w-full">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('timePeriod') || 'Time Period'}
                              </label>
                              <Dropdown
                                value={selectedPeriod}
                                onValueChange={setSelectedPeriod}
                                options={timePeriods}
                                placeholder={t('selectTimePeriod', 'Select time period...')}
                                minWidth="w-full"
                                maxHeight="max-h-40"
                                itemsToShow={5}
                              />
                            </div>

                            {/* Month Dropdown (shown when period is 'month') */}
                            {selectedPeriod === 'month' && (
                              <div className="w-full">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  {t('selectMonth') || 'Select Month'}
                                </label>
                                <Dropdown
                                  value={selectedMonth}
                                  onValueChange={setSelectedMonth}
                                  options={monthOptions}
                                  placeholder={t('selectMonth', 'Choose month...')}
                                  minWidth="w-full"
                                  maxHeight="max-h-40"
                                  itemsToShow={5}
                                />
                              </div>
                            )}

                            {/* Year Picker */}
                            <div className="w-full relative">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('selectYear') || 'Select Year'}
                              </label>
                              <YearPicker
                                value={selectedYear}
                                onChange={setSelectedYear}
                                placeholder={t('chooseYear', 'Choose year...')}
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Inline Preview Panel — always rendered when a report is selected */}
                      {selectedReport && (
                        <ReportPreviewPanel
                          report={selectedReport}
                          data={checkData}
                          loading={loading || checkLoading}
                          reportData={reportData}
                          selectedReport={selectedReport}
                          selectedClass={selectedClass}
                        />
                      )}
                    </div>
                  </div>
                )}

              </div>
            </FadeInSection>
          </div>
        </FadeInSection>
      </div>
    </PageTransition>
  );
}