import { useState, useEffect } from 'react';
import { BarChart3, Download, Filter, Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import DynamicLoader from '../../components/ui/DynamicLoader';
import Dropdown from '../../components/ui/Dropdown';
import EmptyState from '../../components/ui/EmptyState';
import { DatePickerWithDropdowns } from '../../components/ui/date-picker-with-dropdowns';
import { YearPicker } from '../../components/ui/year-picker';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { processAndExportReport } from '../../utils/reportExportUtils';
import { exportReport4SemesterToExcel } from '../../utils/report4SemesterExportUtils';
import { studentService } from '../../utils/api/services/studentService';
import { classService } from '../../utils/api/services/classService';
import { teacherService } from '../../utils/api/services/teacherService';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { parentService } from '../../utils/api/services/parentService';
import { bmiService } from '../../utils/api/services/bmiService';
import { Button } from '@/components/ui/Button';
import { formatClassIdentifier } from '../../utils/helpers';
import { getAcademicYearOptions } from '../../utils/formOptions';
import { getFullName } from '../../utils/usernameUtils';
import ExportProgressModal from '../../components/modals/ExportProgressModal';
import { exportService } from '../../utils/api/services/exportService';
import { graphqlService } from '../../utils/api/services/graphqlService';
import ReportPreviewPanel from '../reports/ReportPreviewPanel';

/**
 * TeacherReports Component
 * Displays reports filtered to only show classes assigned to the current teacher
 * Teachers can view reports for multiple classes they teach
 */
export default function Reports() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [selectedReport, setSelectedReport] = useState('report1');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getMonth() + 1}`);
  const [selectedYear, setSelectedYear] = useState(`${new Date().getFullYear()}`);
  const [selectedSemesterStartDate, setSelectedSemesterStartDate] = useState(null);
  const [selectedSemesterEndDate, setSelectedSemesterEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [teacherClasses, setTeacherClasses] = useState([]); // All classes assigned to teacher
  const [currentClassId, setCurrentClassId] = useState(null); // Currently selected class
  const [currentClassName, setCurrentClassName] = useState(''); // Display current class name

  // BMI Report Pagination State
  const [bmiPage, setBmiPage] = useState(1);
  const [bmiPagination, setBmiPagination] = useState(null);
  const [bmiLimit, setBmiLimit] = useState(10); // Default limit

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
    { value: 'report4', label: t('report4', 'បញ្ជីអវត្តមានសិស្ស') },

    // 🚧 Not Yet Implemented - Uncomment when ready
    // { value: 'report3', label: t('report3', 'បញ្ជីមធ្យមភាគសិស្ស') },
    // { value: 'report5', label: t('report5', 'បញ្ជីឈ្មោះសិស្សអាហារូបករណ៍') },
    // { value: 'report7', label: t('report7', 'បញ្ជីឈ្មោះសិស្សមានបញ្ហាសុខភាព') },
    // { value: 'report9', label: t('report9', 'បញ្ជីឈ្មោះសិស្សជាជនជាតិដើមភាគតិច') },
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

  // Initialize: Fetch all teacher's classes on mount
  useEffect(() => {
    const initializeTeacherClasses = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const teacherId = userData?.teacherId || userData?.teacher_id || userData?.id;

        if (!teacherId) {
          console.warn('⚠️ No teacher ID found in user data');
          return;
        }

        console.log('📚 Fetching all classes for teacher ID:', teacherId);

        // Get all classes assigned to this teacher
        const response = await teacherService.getTeacherClasses(teacherId);

        console.log('📦 Teacher classes response:', response);

        // Handle response - teacherService returns { success, data, classes }
        const classes = response.classes || response.data || [];

        if (response.success && classes.length > 0) {
          console.log(`✅ Fetched ${classes.length} classes for teacher`);

          // Store all teacher classes
          setTeacherClasses(classes);

          // Auto-select the first class
          const firstClass = classes[0];
          const classId = firstClass.id || firstClass.classId;
          const className = firstClass.name || `Class ${classId}`;

          console.log('📍 Auto-selecting first class:', { id: classId, name: className });
          setCurrentClassId(classId);
          setCurrentClassName(className);
        } else {
          console.warn('⚠️ No classes found for this teacher');
          setTeacherClasses([]);
        }
      } catch (error) {
        console.error('❌ Error fetching classes:', error);
      }
    };

    initializeTeacherClasses();
  }, []);

  useEffect(() => {
    // Reset page to 1 whenever filters change for BMI report
    if (selectedReport === 'report8') {
      setBmiPage(1);
    }
    // We don't want to trigger fetch here immediately because fetchReportData depends on bmiPage
    // and we want the page change effect to handle it or the main effect
  }, [selectedReport, selectedPeriod, selectedMonth, selectedYear, currentClassId]);

  // Fetch report data whenever dependencies change
  useEffect(() => {
    if (currentClassId) {
      fetchReportData();
    }
  }, [selectedReport, selectedPeriod, selectedMonth, selectedYear, currentClassId, selectedSemesterStartDate, selectedSemesterEndDate, bmiPage, bmiLimit]);

  // Build class dropdown options from teacher's classes
  const getClassOptions = () => {
    return teacherClasses.map(cls => {
      const rawGradeLevel =
        typeof cls.gradeLevel !== 'undefined' && cls.gradeLevel !== null
          ? String(cls.gradeLevel)
          : '';

      const displayGradeLevel =
        rawGradeLevel === '0'
          ? t('grade0', 'Kindergarten')
          : rawGradeLevel;

      return {
        value: (cls.id || cls.classId).toString(),
        label: `${t('class') || 'Class'} ${formatClassIdentifier(displayGradeLevel, cls.section)}`
      };
    });
  };

  // Handle class selection change
  const handleClassChange = (classIdString) => {
    const selectedClass = teacherClasses.find(cls => (cls.id || cls.classId).toString() === classIdString);
    if (selectedClass) {
      const classId = selectedClass.id || selectedClass.classId;
      const className = selectedClass.name || `Class ${classId}`;
      setCurrentClassId(classId);
      setCurrentClassName(className);
      console.log('📍 Switched to class:', { id: classId, name: className });
    }
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

      // For report4 and report1, validate class selection first
      if (['report1', 'report4'].includes(selectedReport)) {
        if (!currentClassId) {
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
        classId: currentClassId
      });

      let hasData = false;
      let recordCount = 1; // Default to 1 so the array length > 0 if hasData is true

      const isGqlReport = ['report6', 'report9', 'report8'].includes(selectedReport) ||
        (selectedReport === 'report1' && currentClassId) ||
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
          const hasAnyFilter = selectedYear || currentClassId;
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
              classId: currentClassId ? currentClassId : undefined,
            });
          } else if (selectedReport === 'report6') {
            gqlData = await graphqlService.exportAccessibilityCheck({ schoolId: parseInt(schoolId) });
          } else if (selectedReport === 'report9') {
            gqlData = await graphqlService.exportEthnicCheck({ schoolId: parseInt(schoolId) });
          } else if (selectedReport === 'report1' && currentClassId) {
            gqlData = await graphqlService.exportStudentListCheck(currentClassId);
          } else if (selectedReport === 'report4' && currentClassId) {
            gqlData = await graphqlService.exportClassMonthlyCheck({
              classId: currentClassId,
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
        // For reports without a specific check endpoint (report4 non-monthly, etc.)
        // Only assume data is available if at least one filter has been selected
        const hasAnyFilter = selectedYear || currentClassId;

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

      // Get class name for report1 and report4
      let className = '';
      if (['report1', 'report4'].includes(selectedReport) && currentClassId) {
        className = currentClassName || '';
      }

      console.log(`📥 Exporting report: ${reportName}`);

      if (isAsyncExport) {
        const year = parseInt(selectedYear);
        const monthIndex = parseInt(selectedMonth);

        try {
          // Show export modal immediately for async jobs
          setExportModalState({ isOpen: true, progress: 10, status: 'processing', jobId: null });

          let enqueueRes;
          if (selectedReport === 'report1') {
            if (!currentClassId) {
              setExportModalState({ isOpen: false, progress: 0, status: 'error' });
              showError(t('selectClassRequired', 'Please select a specific class.'));
              setLoading(false);
              return;
            }
            enqueueRes = await exportService.enqueueStudentListExport(currentClassId);
          } else if (selectedReport === 'report6') {
            const accessibilityParams = {};
            if (schoolId) accessibilityParams.schoolId = schoolId;
            enqueueRes = await exportService.enqueueStudentsAccessibilityExport(accessibilityParams);
          } else if (selectedReport === 'report9') {
            const ethnicParams = {};
            if (schoolId) ethnicParams.schoolId = schoolId;
            enqueueRes = await exportService.enqueueStudentEthnicExport(ethnicParams);
          } else if (selectedReport === 'report8') {
            const bmiParams = {};
            if (schoolId) bmiParams.schoolId = schoolId;
            if (selectedYear) bmiParams.academicYear = selectedYear;
            if (currentClassId) bmiParams.classId = currentClassId;

            enqueueRes = await exportService.enqueueStudentBmiExport(bmiParams);
          } else if (selectedReport === 'report4') {
            if (!currentClassId) {
              setExportModalState({ isOpen: false, progress: 0, status: 'error' });
              showError(t('selectClassRequired', 'Please select a specific class.'));
              setLoading(false);
              return;
            }
            enqueueRes = await exportService.enqueueStudentMonthlyExport(currentClassId, year, monthIndex);
          } else {
            if (!schoolId) {
              setExportModalState({ isOpen: false, progress: 0, status: 'error' });
              showError(t('noSchoolIdFound', 'No school ID found.'));
              setLoading(false);
              return;
            }
            enqueueRes = await exportService.enqueueTeacherMonthlyExport(schoolId, year, monthIndex);
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
      } else {
        // Fallback or handle standard formats (e.g. report4 semester exports not yet ported if any)
        // Since we migrated the main ones, we throw if unsupported
        showError(t('unsupportedExport', 'Export format is not fully configured for this report type.'));
      }
    } catch (error) {
      console.error('❌ Error exporting report:', error);
      showError(t('errorExportingReport', 'Error exporting report'));
    } finally {
      // Don't set loading state to false here for async exports as they handle it in their callbacks
      if (selectedReport === 'report4' && selectedPeriod !== 'month') {
        setLoading(false);
      }
    }
  };

  return (
    <PageTransition className="bg-gray-50">
      <div className="p-3 sm:p-6">
        <ExportProgressModal
          isOpen={exportModalState.isOpen}
          progress={exportModalState.progress}
          status={exportModalState.status}
          onClose={() => setExportModalState({ ...exportModalState, isOpen: false })}
          onCancel={() => {
            if (exportModalState.pollInterval) clearInterval(exportModalState.pollInterval);
            setExportModalState({ isOpen: false, progress: 0, status: 'canceled' });
            setLoading(false);
            showSuccess(t('exportCanceled', 'Export has been canceled.'));
          }}
        />

        <FadeInSection delay={100} className="mx-2">
          <div className="flex justify-between items-start">
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

                        // Reset year when leaving BMI (report8)
                        if (prev === 'report8' && next !== 'report8') {
                          setSelectedYear(null);
                        }
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-sm text-sm font-medium transition-colors ${selectedReport === report.value
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 border border-transparent'
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
                          disabled={loading || (['report1', 'report4'].includes(selectedReport) && !currentClassId) || reportData.length === 0}
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
                        {/* Class Selection - Dropdown if multiple classes, read-only if single class */}
                        {teacherClasses.length > 0 && (
                          <div className="col-span-1 w-full">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 truncate">
                              {t('selectClass') || 'Select Class'}
                            </label>
                            {teacherClasses.length > 1 ? (
                              <Dropdown
                                value={currentClassId?.toString()}
                                onValueChange={handleClassChange}
                                options={getClassOptions()}
                                placeholder={t('chooseClass', 'Choose class...')}
                                minWidth="w-full"
                                maxHeight="max-h-56"
                                itemsToShow={10}
                              />
                            ) : (
                              <div className="px-3 py-2 bg-gray-100 rounded border border-gray-300 text-sm text-gray-900 truncate">
                                {currentClassName}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Step 3a: Academic Year Filter - Shown for report8 */}
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

                        {/* Step 3: Date filters - Only show for report4 when current class is available */}
                        {selectedReport === 'report4' && currentClassId && (
                          <>
                            {/* Time Period Dropdown */}
                            <div className="col-span-1 w-full">
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 truncate">
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
                                  <label className="block text-sm font-medium text-gray-700 mb-2 truncate">
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
                                  <label className="block text-sm font-medium text-gray-700 mb-2 truncate">
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
                              <label className="block text-sm font-medium text-gray-700 mb-2 truncate">
                                {t('selectYear') || 'Select Year'}
                              </label>
                              <YearPicker
                                value={selectedYear}
                                onChange={setSelectedYear}
                                placeholder={t('chooseYear', 'Choose year...')}
                                fromYear={1900}
                                toYear={3000}
                              />
                            </div>
                          </>
                        )}

                        {/* For other reports (not report1, report4, report6, report8, report9): Show date filters normally */}
                        {!['report1', 'report4', 'report6', 'report8', 'report9'].includes(selectedReport) && (
                          <>
                            {/* Time Period Dropdown */}
                            <div className="w-full">
                              <label className="block text-sm font-medium text-gray-700 mb-2 truncate">
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
                                <label className="block text-sm font-medium text-gray-700 mb-2 truncate">
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
                              <label className="block text-sm font-medium text-gray-700 mb-2 truncate">
                                {t('selectYear') || 'Select Year'}
                              </label>
                              <YearPicker
                                value={selectedYear}
                                onChange={setSelectedYear}
                                placeholder={t('chooseYear', 'Choose year...')}
                                fromYear={1900}
                                toYear={3000}
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
                          selectedClass={currentClassId}
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
