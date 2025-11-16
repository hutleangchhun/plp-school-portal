import { useState, useEffect } from 'react';
import { BarChart3, Download, Filter, Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import DynamicLoader from '../../components/ui/DynamicLoader';
import Dropdown from '../../components/ui/Dropdown';
import EmptyState from '../../components/ui/EmptyState';
import { processAndExportReport } from '../../utils/reportExportUtils';
import { exportReport4SemesterToExcel } from '../../utils/report4SemesterExportUtils';
import { studentService } from '../../utils/api/services/studentService';
import { classService } from '../../utils/api/services/classService';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { parentService } from '../../utils/api/services/parentService';
import { bmiService } from '../../utils/api/services/bmiService';
import { Button } from '@/components/ui/Button';
// Modular report components
import { useReport1Data, Report1Preview } from '../reports/report1/indexReport1';
import { useReport4Data, Report4Preview, exportReport4ToExcel } from '../reports/report4/indexReport4';
import { useReport6Data, Report6Preview } from '../reports/report6/indexReport6';
import { useReport8Data, Report8Preview } from '../reports/report8/indexReport8';
import { useReport9Data, Report9Preview } from '../reports/report9/indexReport9';

export default function TeacherReports({ user }) {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [selectedReport, setSelectedReport] = useState('report1');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');

  // Report Types
  const reportTypes = [
    { value: 'report1', label: t('reportStudentNameInfo', 'បញ្ជីហៅឈ្មោះសិស្ស') },
    { value: 'report4', label: t('report4', 'បញ្ជីអវត្តមានសិស្ស') },
    { value: 'report6', label: t('report6', 'បញ្ជីឈ្មោះសិស្សមានពិការភាព') },
    { value: 'report8', label: t('report8', 'បញ្ជីឈ្មោះសិស្សមានទិន្នន័យ BMI') },
    { value: 'report9', label: t('report9', 'បញ្ជីឈ្មោះសិស្សជាជនជាតិដើមភាគតិច') },
  ];

  // Time Period Options
  const timePeriods = [
    { value: 'month', label: t('byMonth', 'By Month') },
    { value: 'semester1', label: t('bySemester1', 'Semester 1') },
    { value: 'semester2', label: t('bySemester2', 'Semester 2') },
    { value: 'year', label: t('byYear', 'By Year') },
  ];

  // Month Options (Khmer names)
  const khmerMonths = [
    'មករា',      // January
    'កុម្ភៈ',     // February
    'មីនា',       // March
    'មេសា',       // April
    'ឧសភា',       // May
    'មិថុនា',     // June
    'កក្កដា',     // July
    'សីហា',       // August
    'កញ្ញា',      // September
    'តុលា',       // October
    'វិច្ឆិកា',    // November
    'ធ្នូ'        // December
  ];
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: khmerMonths[i]
  }));

  // Academic Year Options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const startYear = currentYear - 2 + i;
    const endYear = startYear + 1;
    const academicYear = `${startYear}-${endYear}`;
    return {
      value: academicYear,
      label: academicYear
    };
  });

  // Load teacher's classes
  useEffect(() => {
    const loadClasses = async () => {
      try {
        if (user?.classIds && user.classIds.length > 0) {
          const classPromises = user.classIds.map(classId =>
            classService.getClassById(classId)
          );
          const responses = await Promise.allSettled(classPromises);
          const classes = responses
            .filter(res => res.status === 'fulfilled' && res.value)
            .map(res => res.value);

          setAllClasses(classes);
          if (classes.length > 0) {
            setSelectedClass(String(classes[0].id || classes[0].classId));
          }
        }
      } catch (error) {
        console.error('Error loading classes:', error);
        showError(t('failedToLoadClasses', 'Failed to load classes'));
      }
    };

    loadClasses();
  }, [user, t, showError]);

  // Auto-fetch report data when filters change
  useEffect(() => {
    if (selectedClass && selectedClass !== 'all' && allClasses.length > 0) {
      fetchReportData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReport, selectedPeriod, selectedMonth, selectedYear, selectedClass, allClasses.length]);

  // Get class options for dropdown
  const getClassOptions = () => {
    const classOptions = [
      { value: 'all', label: t('allClasses', 'All Classes') }
    ];

    classOptions.push(...allClasses.map(cls => ({
      value: String(cls.id || cls.classId),
      label: cls.name
    })));

    return classOptions;
  };

  const fetchReportData = async () => {
    if (!selectedClass || selectedClass === 'all') {
      setReportData([]);
      return;
    }

    setLoading(true);
    try {
      const schoolId = user?.school_id || user?.schoolId;
      if (!schoolId) {
        showError(t('noSchoolIdFound', 'No school ID found'));
        return;
      }

      const selectedClassObj = allClasses.find(c => String(c.id || c.classId) === selectedClass);
      const classId = parseInt(selectedClass);

      // Fetch students for the selected class
      const studentsResponse = await studentService.getStudentsBySchoolClasses(schoolId, {
        classId: classId,
        limit: 100,
        page: 1
      });

      const students = studentsResponse?.data || [];

      if (students.length === 0) {
        setReportData([]);
        setLoading(false);
        return;
      }

      // Process based on selected report type
      if (selectedReport === 'report1') {
        // Fetch full details for each student
        const studentsWithFullDetails = await Promise.all(
          students.map(async (student) => {
            try {
              const userId = student.userId || student.user?.id;
              const fullStudentResponse = await studentService.getStudentById(userId);

              if (fullStudentResponse.success && fullStudentResponse.data) {
                return {
                  ...student,
                  ...fullStudentResponse.data,
                  class: selectedClassObj,
                  className: selectedClassObj?.name
                };
              }
              return { ...student, class: selectedClassObj, className: selectedClassObj?.name };
            } catch (error) {
              console.error('Error fetching student details:', error);
              return { ...student, class: selectedClassObj, className: selectedClassObj?.name };
            }
          })
        );
        setReportData(studentsWithFullDetails);
      } else if (selectedReport === 'report4') {
        // For report4 (attendance report) - fetch students and their attendance data
        console.log('📊 Fetching attendance data for report4');

        // Step 1: Create a map of attendance records by userId
        const attendanceResponse = await attendanceService.getAttendance({
          classId: classId,
          limit: 100,
          page: 1
        });

        const attendanceByUserId = {};
        if (attendanceResponse.success && attendanceResponse.data) {
          attendanceResponse.data.forEach(record => {
            const userId = record.userId;
            if (!attendanceByUserId[userId]) {
              attendanceByUserId[userId] = [];
            }
            attendanceByUserId[userId].push(record);
          });
        }

        console.log(`✅ Mapped ${Object.keys(attendanceByUserId).length} users with attendance data`);

        // Step 2: Fetch full student details for each student
        const studentsWithFullDetails = await Promise.all(
          students.map(async (student) => {
            try {
              const userId = student.userId || student.user?.id || student.id;

              console.log(`🔍 Fetching full details for user ID: ${userId}`);

              // Fetch full student details
              const fullStudentResponse = await studentService.getStudentById(userId);

              if (!fullStudentResponse.success || !fullStudentResponse.data) {
                console.warn(`⚠️ Could not fetch full details for user ${userId}`);
                return student;
              }

              const fullStudent = fullStudentResponse.data;
              console.log(`✅ Got full student data for ${fullStudent.first_name} ${fullStudent.last_name}`);

              // Merge basic student info with full details
              return {
                ...student,
                student: fullStudent,
                studentNumber: fullStudent.student?.studentNumber || fullStudent.studentNumber || '',
                gender: fullStudent.gender || fullStudent.student?.gender || ''
              };
            } catch (error) {
              console.error(`Error fetching full details for student:`, error);
              return student;
            }
          })
        );

        console.log('✅ Fetched full details for all students');

        // Step 3: Combine students with their attendance records
        const studentsWithAttendance = studentsWithFullDetails.map(student => {
          const userId = student.userId || student.id;
          const attendances = attendanceByUserId[userId] || [];

          return {
            userId: userId,
            studentId: student.studentId || student.id || userId,
            firstName: student.firstName || student.first_name || '',
            lastName: student.lastName || student.last_name || '',
            khmerName: `${student.lastName || student.last_name || ''} ${student.firstName || student.first_name || ''}`.trim(),
            gender: student.gender || '',
            class: selectedClassObj,
            student: student.student || student,
            studentNumber: student.studentNumber || '',
            attendances: attendances
          };
        });

        console.log(`✅ Processed ${studentsWithAttendance.length} students with attendance data`);
        setReportData(studentsWithAttendance);
      } else if (['report6', 'report9'].includes(selectedReport)) {
        // For report6 and report9 - fetch all students from school with filters
        console.log(`📋 Fetching students for ${selectedReport}`);

        let allBasicStudents = [];
        let currentPage = 1;
        let hasMorePages = true;

        while (hasMorePages) {
          const fetchParams = {
            page: currentPage,
            limit: 100
          };

          if (selectedReport === 'report6') {
            fetchParams.hasAccessibility = true;
          }

          if (selectedReport === 'report9') {
            fetchParams.isEtnicgroup = true;
          }

          console.log(`📄 Fetching page ${currentPage} with limit 100...`, fetchParams);

          const studentsResponse = await studentService.getStudentsBySchoolClasses(
            schoolId,
            fetchParams
          );

          if (studentsResponse.success) {
            const pageStudents = studentsResponse.data || [];
            allBasicStudents = [...allBasicStudents, ...pageStudents];

            console.log(`✅ Page ${currentPage}: Fetched ${pageStudents.length} students (Total: ${allBasicStudents.length})`);

            const pagination = studentsResponse.pagination;
            if (pagination && currentPage < pagination.pages) {
              currentPage++;
            } else {
              hasMorePages = false;
            }
          } else {
            console.warn(`⚠️ Failed to fetch page ${currentPage}`);
            hasMorePages = false;
          }
        }

        console.log(`✅ Fetched total of ${allBasicStudents.length} students from school`);

        if (allBasicStudents.length > 0) {
          // Step 2: For each student, fetch full details to get accessibility/ethnic_group fields
          const studentsWithFullData = await Promise.all(
            allBasicStudents.map(async (basicStudent) => {
              try {
                const userId = basicStudent.user?.id || basicStudent.userId;

                console.log(`🔍 Fetching full details for user ID: ${userId}`);

                const fullStudentResponse = await studentService.getStudentById(userId);

                if (!fullStudentResponse.success || !fullStudentResponse.data) {
                  console.warn(`⚠️ Could not fetch full details for user ${userId}`);
                  return basicStudent;
                }

                const fullStudent = fullStudentResponse.data;
                console.log(`✅ Got full student data for ${fullStudent.first_name} ${fullStudent.last_name}`);

                return {
                  ...basicStudent,
                  ...fullStudent,
                  class: selectedClassObj,
                  studentId: basicStudent.studentId || fullStudent.id
                };
              } catch (error) {
                console.warn(`❌ Failed to fetch full details for student:`, error);
                return basicStudent;
              }
            })
          );

          console.log(`✅ Processed ${studentsWithFullData.length} students with full data`);

          let filteredData = studentsWithFullData;

          if (selectedReport === 'report6') {
            filteredData = studentsWithFullData.filter(student => {
              const accessibility = student.accessibility || student.specialNeeds || student.special_needs || '';
              const hasDisability = accessibility &&
                accessibility !== '' &&
                accessibility !== 'null' &&
                accessibility !== 'none' &&
                accessibility !== 'None';
              return hasDisability;
            });
            console.log(`🦽 Filtered ${filteredData.length} students with disabilities (from ${studentsWithFullData.length} total)`);
          } else if (selectedReport === 'report9') {
            filteredData = studentsWithFullData.filter(student => {
              const ethnicGroup = student.ethnicGroup || student.ethnic_group || '';
              const isValidEthnicGroup = ethnicGroup &&
                ethnicGroup !== '' &&
                ethnicGroup !== 'ខ្មែរ' &&
                ethnicGroup !== 'Unknown' &&
                ethnicGroup !== 'unknown' &&
                ethnicGroup !== 'null' &&
                ethnicGroup.toLowerCase() !== 'khmer';
              return isValidEthnicGroup;
            });
            console.log(`🌍 Filtered ${filteredData.length} ethnic minority students (from ${studentsWithFullData.length} total)`);
          }

          setReportData(filteredData);
        } else {
          setReportData([]);
        }
      } else if (selectedReport === 'report8') {
        // For report8 (BMI report) - fetch students with BMI history
        console.log('📊 Fetching students with BMI history for report8');

        if (students.length > 0) {
          const studentsWithBmiData = await Promise.all(
            students.map(async (basicStudent) => {
              try {
                const userId = basicStudent.user?.id || basicStudent.userId;

                console.log(`🔍 Fetching BMI history for user ID: ${userId}`);

                const bmiParams = {};
                if (selectedYear) {
                  bmiParams.year = selectedYear;
                }
                bmiParams.limit = 1;

                const bmiResponse = await bmiService.getBmiHistoryByUser(userId, bmiParams);

                let bmiData = null;
                if (bmiResponse.success && bmiResponse.data && bmiResponse.data.length > 0) {
                  bmiData = bmiResponse.data[0];
                  console.log(`✅ Got BMI data for ${basicStudent.firstName} ${basicStudent.lastName}:`, bmiData);
                } else {
                  console.log(`⚠️ No BMI data found for user ${userId}`);
                }

                const rawGender = basicStudent.gender ||
                  basicStudent.user?.gender ||
                  basicStudent.sex ||
                  basicStudent.user?.sex ||
                  '';

                let formattedGender = '';
                if (rawGender === 'M' || rawGender === 'MALE' || rawGender === 'male' || rawGender === 'ប្រុស') {
                  formattedGender = 'ប្រុស';
                } else if (rawGender === 'F' || rawGender === 'FEMALE' || rawGender === 'female' || rawGender === 'ស្រី') {
                  formattedGender = 'ស្រី';
                } else {
                  formattedGender = rawGender || '';
                }

                const bmiValue = bmiData?.bmi ? parseFloat(bmiData.bmi) : null;

                let ageInYears = null;
                let ageInYearsAndMonths = '';
                let ageInMonths = null;
                const dob = basicStudent.dateOfBirth || basicStudent.date_of_birth;
                if (dob) {
                  try {
                    const birthDate = new Date(dob);
                    if (!isNaN(birthDate.getTime())) {
                      const today = new Date();
                      let years = today.getFullYear() - birthDate.getFullYear();
                      let months = today.getMonth() - birthDate.getMonth();

                      if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
                        years--;
                        months += 12;
                      }

                      if (today.getDate() < birthDate.getDate()) {
                        months--;
                      }

                      ageInYears = years;
                      ageInYearsAndMonths = months > 0 ? `${years} ឆ្នាំ ${months} ខែ` : `${years} ឆ្នាំ`;
                      ageInMonths = years * 12 + months;
                    }
                  } catch (e) {
                    // Keep null if calculation fails
                  }
                }

                return {
                  ...basicStudent,
                  userId: userId,
                  studentId: basicStudent.studentId || basicStudent.id,
                  firstName: basicStudent.firstName || basicStudent.first_name || '',
                  lastName: basicStudent.lastName || basicStudent.last_name || '',
                  khmerName: `${basicStudent.lastName || basicStudent.last_name || ''} ${basicStudent.firstName || basicStudent.first_name || ''}`.trim(),
                  gender: formattedGender,
                  dateOfBirth: basicStudent.dateOfBirth || basicStudent.date_of_birth,
                  class: selectedClassObj,
                  studentNumber: basicStudent.studentNumber || basicStudent.student_number || basicStudent.number || '',

                  height: bmiData?.height_cm || bmiData?.height || null,
                  weight: bmiData?.weight_kg || bmiData?.weight || null,
                  bmi: bmiValue,
                  bmiCategory: bmiValue ? bmiService.utils.getBmiCategory(bmiValue) : 'មិនបានកំណត់',
                  age: bmiData?.age || null,
                  ageInYears: ageInYears,
                  ageInYearsAndMonths: ageInYearsAndMonths,
                  ageInMonths: ageInMonths,
                  recordDate: bmiData?.recorded_at || bmiData?.createdAt || bmiData?.created_at || null,
                  academicYear: selectedYear || basicStudent.academicYear,
                  gradeLevel: basicStudent.gradeLevel || basicStudent.class?.gradeLevel
                };
              } catch (error) {
                console.warn(`❌ Failed to fetch BMI data for student:`, error);

                const rawGender = basicStudent.gender ||
                  basicStudent.user?.gender ||
                  basicStudent.sex ||
                  basicStudent.user?.sex ||
                  '';

                let formattedGender = '';
                if (rawGender === 'M' || rawGender === 'MALE' || rawGender === 'male' || rawGender === 'ប្រុស') {
                  formattedGender = 'ប្រុស';
                } else if (rawGender === 'F' || rawGender === 'FEMALE' || rawGender === 'female' || rawGender === 'ស្រី') {
                  formattedGender = 'ស្រី';
                } else {
                  formattedGender = rawGender || '';
                }

                return {
                  ...basicStudent,
                  firstName: basicStudent.firstName || basicStudent.first_name || '',
                  lastName: basicStudent.lastName || basicStudent.last_name || '',
                  khmerName: `${basicStudent.lastName || basicStudent.last_name || ''} ${basicStudent.firstName || basicStudent.first_name || ''}`.trim(),
                  gender: formattedGender,
                  dateOfBirth: basicStudent.dateOfBirth || basicStudent.date_of_birth,
                  class: selectedClassObj,
                  studentNumber: basicStudent.studentNumber || basicStudent.student_number || basicStudent.number || '',
                  height: null,
                  weight: null,
                  bmi: null,
                  bmiCategory: 'មិនបានកំណត់',
                  age: null,
                  ageInYears: null,
                  ageInYearsAndMonths: '',
                  ageInMonths: null,
                  recordDate: null
                };
              }
            })
          );

          console.log(`📊 Showing all ${studentsWithBmiData.length} students with BMI data (if available)`);
          setReportData(studentsWithBmiData);
        } else {
          setReportData([]);
        }
      }
    } catch (error) {
      console.error('Error generating report:', error);
      showError(t('failedToGenerateReport', 'Failed to generate report'));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (reportData.length === 0) {
      showError(t('noDataToExport', 'No data to export'));
      return;
    }

    setLoading(true);
    try {
      const selectedClassObj = allClasses.find(c => String(c.id || c.classId) === selectedClass);
      const className = selectedClassObj?.name || 'Report';
      const reportName = reportTypes.find(r => r.value === selectedReport)?.label || 'Report';

      if (selectedReport === 'report4' && (selectedPeriod === 'semester1' || selectedPeriod === 'semester2')) {
        await exportReport4SemesterToExcel(reportData, selectedPeriod, className);
      } else {
        await processAndExportReport(selectedReport, reportData, reportName, '', '', className);
      }

      showSuccess(t('reportExported', 'Report exported successfully'));
    } catch (error) {
      console.error('Error exporting report:', error);
      showError(t('failedToExportReport', 'Failed to export report'));
    } finally {
      setLoading(false);
    }
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-[400px]">
          <DynamicLoader
            type="spinner"
            size="xl"
            variant="primary"
            message={t('loadingReportData', 'Loading report data...')}
          />
        </div>
      );
    }

    if (!reportData || reportData.length === 0) {
      if (selectedReport === 'report4' && (!selectedClass || selectedClass === 'all')) {
        return (
          <EmptyState
            icon={Filter}
            title={t('selectClassRequired', 'Class Selection Required')}
            description={t('selectClassForReport4', 'Please select a specific class for the absence report')}
            variant="warning"
          />
        );
      }

      return (
        <EmptyState
          icon={BarChart3}
          title={t('noDataAvailable', 'No Data Available')}
          description={t('noDataMessage', 'Please select filters and wait for data to load.')}
          variant="info"
        />
      );
    }

    const renderDataPreview = () => {
      if (selectedReport === 'report1') {
        return <Report1Preview data={reportData} />;
      }

      if (selectedReport === 'report4') {
        return <Report4Preview data={reportData} />;
      }

      if (selectedReport === 'report6') {
        return <Report6Preview data={reportData} />;
      }

      if (selectedReport === 'report8') {
        return <Report8Preview data={reportData} />;
      }

      if (selectedReport === 'report9') {
        return <Report9Preview data={reportData} />;
      }

      return null;
    };

    return (
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {reportTypes.find(r => r.value === selectedReport)?.label || 'Report'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {reportData.length} {t('recordsLoaded', 'records loaded')}
              </p>
            </div>
          </div>
          <div className="h-px bg-gray-200"></div>
        </div>

        {renderDataPreview()}
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="p-4 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {t('reports') || 'Reports & Analytics'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('viewAnalytics') || 'View comprehensive analytics and generate reports'}
            </p>
          </div>
          <Button
            onClick={handleExport}
            disabled={loading || reportData.length === 0}
            size="sm"
            variant="default"
          >
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Exporting...' : (t('exportReport', 'Export Report') || 'Export Report')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-4">
        <div className="overflow-x-auto">
          <div className="flex gap-4 flex-wrap items-end">
            {/* Report Type */}
            <div className="flex-shrink-0 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BarChart3 className="h-4 w-4 inline mr-1" />
                {t('reportType', 'Report Type')}
              </label>
              <Dropdown
                value={selectedReport}
                onValueChange={setSelectedReport}
                options={reportTypes}
                placeholder={t('selectReportType', 'Select report type...')}
                minWidth="w-full"
                maxHeight="max-h-56"
                itemsToShow={10}
              />
            </div>

            {/* Class Filter */}
            <div className="flex-shrink-0 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="h-4 w-4 inline mr-1" />
                {t('selectClass', 'Select Class')}
              </label>
              <Dropdown
                value={selectedClass}
                onValueChange={setSelectedClass}
                options={getClassOptions()}
                placeholder={t('selectClass', 'Select class...')}
                minWidth="w-full"
                maxHeight="max-h-56"
                itemsToShow={10}
              />
            </div>

            {/* Period Filter */}
            <div className="flex-shrink-0 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                {t('duration', 'Duration')}
              </label>
              <Dropdown
                value={selectedPeriod}
                onValueChange={setSelectedPeriod}
                options={timePeriods}
                placeholder={t('selectPeriod', 'Select period...')}
                minWidth="w-full"
                maxHeight="max-h-56"
              />
            </div>

            {/* Month Filter (for monthly reports) */}
            {selectedPeriod === 'month' && (
              <div className="flex-shrink-0 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('month', 'Month')}
                </label>
                <Dropdown
                  value={selectedMonth}
                  onValueChange={setSelectedMonth}
                  options={monthOptions}
                  placeholder={t('selectMonth', 'Select month...')}
                  minWidth="w-full"
                  maxHeight="max-h-56"
                />
              </div>
            )}

            {/* Year Filter */}
            {['month', 'semester1', 'semester2', 'year'].includes(selectedPeriod) && (
              <div className="flex-shrink-0 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('year', 'Year')}
                </label>
                <Dropdown
                  value={selectedYear}
                  onValueChange={setSelectedYear}
                  options={yearOptions}
                  placeholder={t('selectYear', 'Select year...')}
                  minWidth="w-full"
                  maxHeight="max-h-56"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="mt-6 bg-white rounded-lg shadow">
        {renderReportContent()}
      </div>
    </div>
  );
}
