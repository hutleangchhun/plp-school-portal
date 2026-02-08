import { useState, useEffect } from 'react';
import { BarChart3, Download, Filter, Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import DynamicLoader from '../../components/ui/DynamicLoader';
import Dropdown from '../../components/ui/Dropdown';
import EmptyState from '../../components/ui/EmptyState';
import { DatePickerWithDropdowns } from '../../components/ui/date-picker-with-dropdowns';
import { YearPicker } from '../../components/ui/year-picker';
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
// Modular report components
import { useReport1Data, Report1Preview } from '../reports/report1/indexReport1';
import { useReport4Data, Report4Preview, exportReport4ToExcel } from '../reports/report4/indexReport4';
import { useReport6Data, Report6Preview } from '../reports/report6/indexReport6';
import { useReport8Data, Report8Preview } from '../reports/report8/indexReport8';
import { useReport9Data, Report9Preview } from '../reports/report9/indexReport9';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

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

  // Report Types - Only showing working reports (others are commented out for future implementation)
  const reportTypes = [
    // ✅ Working Reports
    { value: 'report1', label: t('reportStudentNameInfo', 'បញ្ជីហៅឈ្មោះសិស្ស') },
    { value: 'report4', label: t('report4', 'បញ្ជីអវត្តមានសិស្ស') },
    { value: 'report6', label: t('report6', 'បញ្ជីឈ្មោះសិស្សមានពិការភាព') },
    { value: 'report8', label: t('report8', 'បញ្ជីឈ្មោះសិស្សមានទិន្នន័យ BMI') },

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

      // For report4 (absence report), ensure current class is set
      if (selectedReport === 'report4') {
        if (!currentClassId) {
          // Don't show error, just set empty data and stop loading
          setReportData([]);
          setLoading(false);
          return;
        }
      }

      console.log('📊 Fetching report data:', {
        report: selectedReport,
        period: selectedPeriod,
        month: selectedMonth,
        year: selectedYear,
        schoolId,
        currentClassId: currentClassId
      });

      // Build date filters based on period
      const dateFilters = {};
      if (selectedYear) {
        dateFilters.academicYear = selectedYear;
      }

      // Add current class filter
      if (currentClassId) {
        dateFilters.classId = currentClassId;
      }

      // For report4 (absence report), fetch attendance data instead of student data
      if (selectedReport === 'report4') {
        // Calculate date range based on period
        let startDate, endDate;
        const currentDate = new Date();

        if (selectedPeriod === 'month' && selectedMonth) {
          // Specific month
          const monthIndex = parseInt(selectedMonth) - 1;
          const year = parseInt(selectedYear);
          startDate = new Date(year, monthIndex, 1);
          endDate = new Date(year, monthIndex + 1, 0);
        } else if ((selectedPeriod === 'semester1' || selectedPeriod === 'semester2') && selectedSemesterStartDate && selectedSemesterEndDate) {
          // Custom semester date range
          startDate = selectedSemesterStartDate;
          endDate = selectedSemesterEndDate;
        } else if (selectedPeriod === 'semester') {
          // Semester (6 months)
          const year = parseInt(selectedYear);
          startDate = new Date(year, 0, 1);
          endDate = new Date(year, 5, 30);
        } else {
          // Full year
          const year = parseInt(selectedYear);
          startDate = new Date(year, 0, 1);
          endDate = new Date(year, 11, 31);
        }

        const formatDate = (date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        };

        console.log('📅 Fetching attendance data:', {
          classId: currentClassId,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate)
        });

        // Calculate appropriate API limit based on period
        // For ~60 students per class:
        // - Monthly: ~1,800 records (60 × 30 days)
        // - Semester: ~10,800 records (60 × 180 days)
        // - Yearly: ~21,900 records (60 × 365 days)
        let apiLimit = 200; // Default for monthly
        if (selectedPeriod === 'semester') {
          apiLimit = 1000; // Semester (6 months)
        } else if (selectedPeriod === 'year') {
          apiLimit = 2000; // Full year
        }

        // First, fetch all students in the current class
        console.log('👥 Fetching students for class:', currentClassId);
        const studentsResponse = await studentService.getStudentsBySchoolClasses(schoolId, {
          classId: parseInt(currentClassId),
          limit: 100,
          page: 1
        });

        if (!studentsResponse.success || !studentsResponse.data) {
          throw new Error('Failed to fetch students for the selected class');
        }

        const classStudents = studentsResponse.data;
        console.log(`👥 Found ${classStudents.length} students in class`);
        console.log('📋 Sample student from API:', classStudents[0]);
        console.log('🔍 Student fields:', {
          hasStudentNumber: !!classStudents[0]?.studentNumber,
          hasStudent_number: !!classStudents[0]?.student_number,
          hasNestedStudent: !!classStudents[0]?.student,
          hasNestedStudentNumber: !!classStudents[0]?.student?.studentNumber,
          hasGender: !!classStudents[0]?.gender,
          hasNestedGender: !!classStudents[0]?.student?.gender,
          studentNumberValue: classStudents[0]?.studentNumber || classStudents[0]?.student_number || classStudents[0]?.student?.studentNumber,
          genderValue: classStudents[0]?.gender || classStudents[0]?.student?.gender
        });

        // Then fetch attendance records for the date range
        const attendanceResponse = await attendanceService.getAttendance({
          classId: parseInt(currentClassId),
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          limit: apiLimit
        });

        // Create a map of attendance records by userId
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

        // Fetch full student details for each student (to get studentNumber and gender)
        const studentsWithFullDetails = await Promise.all(
          classStudents.map(async (student) => {
            try {
              const userId = student.userId || student.user?.id || student.id;
              const studentId = student.studentId || student.id;

              // Fetch full student details
              const fullStudentResponse = await studentService.getStudentById(userId);

              if (!fullStudentResponse.success || !fullStudentResponse.data) {
                console.warn(`⚠️ Could not fetch full details for user ${userId}`);
                return student; // Return basic student if full details fail
              }

              const fullStudent = fullStudentResponse.data;

              // Merge basic student info with full details
              return {
                ...student,
                student: fullStudent, // Full student object with all details
                studentNumber: fullStudent.student?.studentNumber || fullStudent.studentNumber || '',
                gender: fullStudent.gender || fullStudent.student?.gender || ''
              };
            } catch (error) {
              console.error(`Error fetching full details for student:`, error);
              return student; // Return basic student on error
            }
          })
        );

        console.log('✅ Fetched full details for all students');
        console.log('📋 Sample student with full details:', studentsWithFullDetails[0]);

        // Combine students with their attendance records
        const studentsWithAttendance = studentsWithFullDetails.map(student => {
          const userId = student.userId || student.id;
          const attendances = attendanceByUserId[userId] || [];

          return {
            userId: userId,
            studentId: student.studentId || student.id || userId,
            firstName: student.firstName || student.first_name || '',
            lastName: student.lastName || student.last_name || '',
            khmerName: getFullName(student, ''),
            gender: student.gender || '',
            class: student.class,
            student: student.student || student, // Full student object
            studentNumber: student.studentNumber || '',
            attendances: attendances
          };
        });

        console.log(`✅ Processed ${studentsWithAttendance.length} students with attendance data`);
        console.log('📊 Sample student data:', studentsWithAttendance[0]);
        console.log('📊 Sample student class:', studentsWithAttendance[0]?.class);
        setReportData(studentsWithAttendance);
      } else if (selectedReport === 'report8') {
        // For report8 (BMI report) - fetch students with BMI history using new endpoint
        console.log('📊 Fetching students with BMI history for report8');

        const bmiParams = {
          page: bmiPage,
          limit: bmiLimit
        };

        if (schoolId) bmiParams.schoolId = schoolId;
        if (selectedYear) bmiParams.academicYear = selectedYear;
        if (currentClassId) bmiParams.classId = currentClassId;

        const bmiResponse = await bmiService.getStudentBmiReport(bmiParams);

        if (bmiResponse.success) {
          setReportData(bmiResponse.data || []);
          setBmiPagination(bmiResponse.pagination);
          console.log(`✅ Fetched ${bmiResponse.data?.length} BMI records (Page ${bmiPage})`);
        } else {
          console.warn('⚠️ Failed to fetch BMI report:', bmiResponse.error);
          setReportData([]);
          setBmiPagination(null);
          showError(bmiResponse.error || 'Failed to fetch BMI report');
        }
      } else if (['report1', 'report6', 'report9'].includes(selectedReport)) {
        // For report1, report6, report9 - fetch students with full details and parent information
        console.log(`📋 Fetching students with parent information for ${selectedReport}`);

        // Step 1: Fetch all students from school in batches (API limit is 100 per page)
        // For report1, filter by selected class if specified
        let allBasicStudents = [];
        let currentPage = 1;
        let hasMorePages = true;

        while (hasMorePages) {
          const fetchParams = {
            page: currentPage,
            limit: 100 // API maximum
          };

          // Add current class filter
          if (currentClassId) {
            fetchParams.classId = currentClassId;
          }

          // Add backend filters for report6 and report9 for performance optimization
          if (selectedReport === 'report6') {
            fetchParams.hasAccessibility = true; // Only fetch students with disabilities
          }

          if (selectedReport === 'report9') {
            fetchParams.isEtnicgroup = true; // Only fetch ethnic minority students
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

            // Check if there are more pages
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
          const basicStudents = allBasicStudents;

          // Step 2: For each student, fetch full details using user.id and then fetch parents using studentId
          const studentsWithFullData = await Promise.all(
            basicStudents.map(async (basicStudent) => {
              try {
                const userId = basicStudent.user?.id || basicStudent.userId;
                const studentId = basicStudent.studentId || basicStudent.id;

                console.log(`🔍 Fetching full details for user ID: ${userId}, student ID: ${studentId}`);

                // Fetch full student details by user ID
                const fullStudentResponse = await studentService.getStudentById(userId);

                if (!fullStudentResponse.success || !fullStudentResponse.data) {
                  console.warn(`⚠️ Could not fetch full details for user ${userId}`);
                  return { ...basicStudent, parents: [] };
                }

                const fullStudent = fullStudentResponse.data;
                console.log(`✅ Got full student data for ${fullStudent.first_name} ${fullStudent.last_name}`);
                console.log(`📋 Student fields:`, {
                  id: fullStudent.id,
                  date_of_birth: fullStudent.date_of_birth,
                  gender: fullStudent.gender,
                  phone: fullStudent.phone,
                  ethnic_group: fullStudent.ethnic_group,
                  accessibility: fullStudent.accessibility,
                  hasResidence: !!fullStudent.residence
                });

                // Fetch parent information using studentId
                const parentsResponse = await parentService.getParentsByStudentId(studentId);

                console.log(`👨‍👩‍👧 Parent response for student ${studentId}:`, {
                  success: parentsResponse.success,
                  hasData: !!parentsResponse.data,
                  isArray: Array.isArray(parentsResponse.data),
                  hasDataProperty: parentsResponse.data?.data !== undefined,
                  dataType: typeof parentsResponse.data,
                  fullData: parentsResponse.data
                });

                // Handle parent data and fetch full parent details
                let parentsArray = [];
                if (parentsResponse.success && parentsResponse.data) {
                  let rawParents = [];

                  // Check if data is directly an array
                  if (Array.isArray(parentsResponse.data)) {
                    rawParents = parentsResponse.data;
                    console.log(`📌 Parents data is array, length: ${rawParents.length}`);
                  }
                  // Check if data has a 'data' property that is an array
                  else if (parentsResponse.data.data && Array.isArray(parentsResponse.data.data)) {
                    rawParents = parentsResponse.data.data;
                    console.log(`📌 Parents in data.data array, length: ${rawParents.length}`);
                  }
                  // Check if data has a 'parents' property that is an array
                  else if (parentsResponse.data.parents && Array.isArray(parentsResponse.data.parents)) {
                    rawParents = parentsResponse.data.parents;
                    console.log(`📌 Parents in data.parents array, length: ${rawParents.length}`);
                  }
                  // Otherwise treat as single parent object
                  else if (typeof parentsResponse.data === 'object') {
                    rawParents = [parentsResponse.data];
                    console.log(`📌 Single parent object`);
                  }

                  console.log(`📋 Raw parents to process:`, rawParents);

                  // Fetch full details for each parent using their user ID
                  parentsArray = await Promise.all(
                    rawParents.map(async (parent) => {
                      try {
                        const parentUserId = parent.user?.id || parent.userId;
                        if (!parentUserId) {
                          console.warn(`⚠️ No user ID found for parent:`, parent);
                          return {
                            ...parent,
                            user: parent.user || {}
                          };
                        }

                        console.log(`🔍 Fetching full parent details for user ID: ${parentUserId}`);
                        const parentUserResponse = await studentService.getStudentById(parentUserId);

                        if (parentUserResponse.success && parentUserResponse.data) {
                          console.log(`✅ Got full parent data for ${parentUserResponse.data.first_name} ${parentUserResponse.data.last_name}`);
                          return {
                            ...parent,
                            user: parentUserResponse.data
                          };
                        }

                        return {
                          ...parent,
                          user: parent.user || {}
                        };
                      } catch (error) {
                        console.warn(`❌ Failed to fetch parent user details:`, error);
                        return {
                          ...parent,
                          user: parent.user || {}
                        };
                      }
                    })
                  );
                }

                console.log(`📋 Processed ${parentsArray.length} parents with full details for student ${studentId}`);

                // Combine full student data with parents and preserve class info
                return {
                  ...fullStudent,
                  studentId: studentId,
                  class: basicStudent.class || fullStudent.class, // Preserve class from basicStudent
                  className: basicStudent.class?.name || fullStudent.class?.name, // Add className for easy access
                  parents: parentsArray
                };
              } catch (error) {
                console.warn(`❌ Failed to fetch data for student:`, error);
                return { ...basicStudent, parents: [] };
              }
            })
          );

          console.log(`✅ Processed ${studentsWithFullData.length} students with full data and parents`);
          console.log('📊 Sample student with full data:', studentsWithFullData[0]);
          console.log('📊 Sample student class:', studentsWithFullData[0]?.class);

          // Apply client-side filtering as backup (in case API filter doesn't work properly)
          let filteredData = studentsWithFullData;

          if (selectedReport === 'report6') {
            // Filter students with actual disabilities
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
            // Filter students with actual ethnic minority groups (exclude Khmer majority)
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
          console.warn('⚠️ No students found');
          setReportData([]);
        }
      } else {
        // For other reports, fetch students data from API
        const response = await studentService.getStudentsBySchoolClasses(
          schoolId,
          {
            page: 1,
            limit: 100, // Get all students for report
            ...dateFilters
          }
        );

        if (response.success) {
          const students = response.data || [];
          console.log(`✅ Fetched ${students.length} students for report`);
          setReportData(students);
          setSchoolInfo(response.schoolInfo);
        } else {
          throw new Error(response.error || 'Failed to fetch students data');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching report data:', error);
      showError(t('errorFetchingReportData', 'Error fetching report data'));
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

      // Check if we have report data
      if (!reportData || reportData.length === 0) {
        showError(t('noDataToExport', 'No data available to export. Please wait for data to load.'));
        return;
      }

      // Get school name
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const schoolName = schoolInfo?.name || userData?.school?.name || 'PLP School';

      // Get class name for report1 and report4 - match Reports.jsx pattern
      let className = '';
      if (['report1', 'report4'].includes(selectedReport) && currentClassId) {
        className = currentClassName || '';
      }

      console.log(`📥 Exporting report: ${reportName} with ${reportData.length} records`);

      // Special handling for Report 4 (Absence Report) - use calendar format
      let result;
      if (selectedReport === 'report4') {
        // Calculate date range and selected date based on period
        let selectedDate = new Date();
        let startDate, endDate;
        const year = parseInt(selectedYear);

        if (selectedPeriod === 'month' && selectedMonth) {
          // Monthly report
          const monthIndex = parseInt(selectedMonth) - 1;
          selectedDate = new Date(year, monthIndex, 15);
          startDate = new Date(year, monthIndex, 1);
          endDate = new Date(year, monthIndex + 1, 0);

          result = await exportReport4ToExcel(reportData, {
            schoolName,
            className: className || 'Current Class',
            selectedDate,
            period: selectedPeriod,
            periodName,
            monthName,
            selectedYear,
            startDate,
            endDate
          });
        } else if ((selectedPeriod === 'semester1' || selectedPeriod === 'semester2') && selectedSemesterStartDate && selectedSemesterEndDate) {
          // Custom semester date range - use semester export function
          result = await exportReport4SemesterToExcel(reportData, {
            schoolName,
            className: className || 'Current Class',
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
            className: className || 'Current Class',
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
            className: className || 'Current Class',
            selectedDate,
            period: 'year',
            periodName,
            monthName,
            selectedYear,
            startDate,
            endDate
          });
        }
      } else if (selectedReport === 'report8') {
        const bmiParams = {};
        if (schoolInfo?.id) bmiParams.schoolId = schoolInfo.id;
        // Fallback to user school ID if schoolInfo not set yet
        if (!bmiParams.schoolId) {
          const userData = JSON.parse(localStorage.getItem('user') || '{}');
          bmiParams.schoolId = userData?.school?.id || userData?.schoolId;
        }

        if (selectedYear) bmiParams.academicYear = selectedYear;
        // Use currentClassId for teacher reports
        if (currentClassId) bmiParams.classId = currentClassId;

        // Call the specific export endpoint
        const response = await bmiService.exportStudentBmiReport(bmiParams);

        if (response.success && response.data) {
          // Create a download link for the blob
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          // Try to get filename from headers if available, or generate one
          const fileName = `BMI_Report_${schoolName}_${selectedYear}.xlsx`;
          link.setAttribute('download', fileName);
          document.body.appendChild(link);
          link.click();
          link.parentNode.removeChild(link);
          window.URL.revokeObjectURL(url); // Clean up

          // Manually trigger success since processAndExportReport is not used
          showSuccess(t('reportExportedSuccessfully', `Report exported: ${reportName}`));
          setLoading(false);
          return; // Exit early to avoid error message below
        } else {
          throw new Error(response.error || 'Failed to export BMI report');
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

      if (result.success) {
        showSuccess(t('reportExportedSuccessfully', `Report exported: ${reportName} - ${result.recordCount} records`));
      } else {
        showError(result.error || t('errorExportingReport', 'Error exporting report'));
      }
    } catch (error) {
      console.error('❌ Error exporting report:', error);
      showError(t('errorExportingReport', 'Error exporting report'));
    } finally {
      setLoading(false);
    }
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className=" flex justify-center items-center">
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
      // Special message for Report 4 when no class is selected
      if (selectedReport === 'report4' && !currentClassId) {
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

    // Calculate statistics for charts
    const calculateStats = () => {
      if (['report1', 'report6', 'report9'].includes(selectedReport)) {
        // Gender distribution
        const genderCount = reportData.reduce((acc, student) => {
          // For report6, only count students with accessibility issues
          if (selectedReport === 'report6') {
            const hasAccessibility = student.accessibility &&
              student.accessibility !== '' &&
              student.accessibility !== 'null' &&
              student.accessibility !== 'none' &&
              student.accessibility !== 'None';
            if (!hasAccessibility) return acc;
          }

          const gender = student.gender || 'Unknown';
          acc[gender] = (acc[gender] || 0) + 1;
          return acc;
        }, {});

        // Ethnic group distribution
        const ethnicCount = reportData.reduce((acc, student) => {
          let ethnic = student.ethnicGroup || student.ethnic_group || '';

          // For report9, skip students without ethnic group (they shouldn't be in the data anyway)
          if (selectedReport === 'report9') {
            // Only count students with actual ethnic group values
            if (ethnic && ethnic !== 'Unknown' && ethnic !== 'unknown' && ethnic !== 'null' && ethnic !== 'ខ្មែរ') {
              acc[ethnic] = (acc[ethnic] || 0) + 1;
            }
          } else {
            // For other reports, treat empty, null, or 'Unknown' as Khmer
            if (!ethnic || ethnic === 'Unknown' || ethnic === 'unknown' || ethnic === 'null') {
              ethnic = 'ខ្មែរ';
            }
            acc[ethnic] = (acc[ethnic] || 0) + 1;
          }
          return acc;
        }, {});

        // Parent status
        const parentStatus = reportData.reduce((acc, student) => {
          // For report6, only count students with accessibility issues
          if (selectedReport === 'report6') {
            const hasAccessibility = student.accessibility &&
              student.accessibility !== '' &&
              student.accessibility !== 'null' &&
              student.accessibility !== 'none' &&
              student.accessibility !== 'None';
            if (!hasAccessibility) return acc;
          }

          const parentCount = student.parents?.length || 0;
          if (parentCount === 0) acc.noParents = (acc.noParents || 0) + 1;
          else if (parentCount === 1) acc.oneParent = (acc.oneParent || 0) + 1;
          else acc.bothParents = (acc.bothParents || 0) + 1;
          return acc;
        }, {});

        // Special needs
        const specialNeedsCount = reportData.filter(s =>
          s.accessibility || s.specialNeeds || s.special_needs
        ).length;

        return { genderCount, ethnicCount, parentStatus, specialNeedsCount };
      }

      return null;
    };

    const stats = calculateStats();

    // Render data preview based on report type
    const renderDataPreview = () => {
      // Use modular preview components
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
        return (
          <Report8Preview
            data={reportData}
            serverPagination={bmiPagination}
            onPageChange={(page) => setBmiPage(page)}
            limit={bmiLimit}
            onLimitChange={setBmiLimit}
          />
        );
      }

      if (selectedReport === 'report9') {
        return <Report9Preview data={reportData} />;
      }

      // For report1, report6, report9 - Show statistics (OLD - keeping for charts)
      if (['report1', 'report6', 'report9'].includes(selectedReport)) {
        const maxValue = Math.max(...Object.values(stats?.genderCount || {}), 1);
        const maxParentValue = Math.max(
          stats?.parentStatus.bothParents || 0,
          stats?.parentStatus.oneParent || 0,
          stats?.parentStatus.noParents || 0,
          1
        );


        const getSummaryTitle = () => {
          if (selectedReport === 'report6') return t('studentsWithDisabilities', 'Students with Disabilities');
          if (selectedReport === 'report9') return t('ethnicMinorityStudents', 'Ethnic Minority Students');
          return t('totalStudents', 'Total Students');
        };

        // Prepare chart data
        const parentStatusData = [
          { name: t('bothParents', 'មានឪពុកម្តាយទាំងពីរ'), value: stats?.parentStatus.bothParents || 0, color: '#10b981' },
          { name: t('oneParent', 'មានឪពុកម្តាយម្នាក់'), value: stats?.parentStatus.oneParent || 0, color: '#f59e0b' },
          { name: t('noParents', 'គ្មានឪពុកម្តាយ'), value: stats?.parentStatus.noParents || 0, color: '#ef4444' }
        ].filter(item => item.value > 0);

        const ethnicGroupData = Object.entries(stats?.ethnicCount || {}).map(([name, value], index) => ({
          name: name, // Name is already set to 'ខ្មែរ' for unknown values in calculateStats
          value,
          color: ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f97316'][index % 5]
        }));

        // Prepare accessibility data for report6
        // Only include students with actual accessibility data (disabilities)
        const accessibilityData = {};
        reportData.forEach(student => {
          const accessibility = student.accessibility;

          // Skip students without accessibility data
          if (!accessibility ||
              accessibility === '' ||
              accessibility === 'null' ||
              accessibility === 'none' ||
              accessibility === 'None') {
            return;
          }

          const accessibilityLabel = Array.isArray(accessibility)
            ? accessibility.join(', ')
            : accessibility;

          accessibilityData[accessibilityLabel] = (accessibilityData[accessibilityLabel] || 0) + 1;
        });

        const accessibilityChartData = Object.entries(accessibilityData).map(([name, value], index) => ({
          name,
          value,
          color: ['#eab308', '#f59e0b', '#f97316', '#ef4444', '#ec4899'][index % 5]
        }));

        return (
          <div className="space-y-6">


            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Report 1: Parent Status Chart */}
              {selectedReport === 'report1' && parentStatusData.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-4">{t('parentStatus', 'ស្ថានភាពឪពុកម្តាយ')}</h4>
                  <ChartContainer
                    config={{
                      value: {
                        label: t('students', 'សិស្ស'),
                      },
                    }}
                    className="h-[300px] w-full"
                  >
                    <BarChart data={parentStatusData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                      <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={90} tickLine={false} axisLine={false} className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value) => Math.round(value)} />} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {parentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>
              )}

              {/* Report 6: Accessibility Distribution Pie Chart */}
              {selectedReport === 'report6' && accessibilityChartData.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-4">{t('accessibilityDistribution', 'ការចែកចាយប្រភេទពិការភាព')}</h4>
                  <ChartContainer
                    config={{
                      value: {
                        label: t('students', 'សិស្ស'),
                      },
                    }}
                    className="h-[300px] w-full"
                  >
                    <PieChart>
                      <Pie
                        data={accessibilityChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {accessibilityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent formatter={(value) => Math.round(value)} />} />
                    </PieChart>
                  </ChartContainer>
                </div>
              )}

              {/* Report 9: Ethnic Groups Distribution Bar Chart */}
              {selectedReport === 'report9' && ethnicGroupData.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-4">{t('ethnicGroupsDistribution', 'ការចែកចាយក្រុមជនជាតិ')}</h4>
                  <ChartContainer
                    config={{
                      value: {
                        label: t('students', 'សិស្ស'),
                      },
                    }}
                    className="h-[300px] w-full"
                  >
                    <BarChart data={ethnicGroupData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                      <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={70} tickLine={false} axisLine={false} className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value) => Math.round(value)} />} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {ethnicGroupData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>
              )}

              {/* Report 1: Ethnic Groups Pie Chart */}
              {selectedReport === 'report1' && ethnicGroupData.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-4">{t('ethnicGroups', 'ក្រុមជនជាតិ')}</h4>
                  <ChartContainer
                    config={{
                      value: {
                        label: t('students', 'សិស្ស'),
                      },
                    }}
                    className="h-[300px] w-full"
                  >
                    <PieChart>
                      <Pie
                        data={ethnicGroupData.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ethnicGroupData.slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent formatter={(value) => Math.round(value)} />} />
                    </PieChart>
                  </ChartContainer>
                </div>
              )}
            </div>
          </div>
        );
      }

      // For other reports - show summary stats
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600">{t('totalRecords', 'Total Records')}</p>
                  <p className="text-3xl font-bold text-indigo-900 mt-2">{reportData.length}</p>
                </div>
                <BarChart3 className="h-10 w-10 text-indigo-400" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Data Preview</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    {reportData[0] && Object.keys(reportData[0]).slice(0, 5).map(key => (
                      <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.slice(0, 10).map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{index + 1}</td>
                      {Object.values(record).slice(0, 5).map((value, i) => (
                        <td key={i} className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs">
                          {String(value || 'N/A')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reportData.length > 10 && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Showing 10 of {reportData.length} records. Export to see all data.
              </p>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className=" p-4 sm:p-6">
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
            <div className="flex items-center space-x-2">
              {!['report1', 'report6', 'report9'].includes(selectedReport) && (
                <div className="text-xs text-gray-500">
                  <span>{timePeriods.find(p => p.value === selectedPeriod)?.label}</span>
                  {selectedPeriod === 'month' && selectedMonth && (
                    <span> • {monthOptions.find(m => m.value === selectedMonth)?.label}</span>
                  )}
                  <span> • {selectedYear}</span>
                </div>
              )}
              {currentClassName && (
                <div className="text-xs text-gray-500">
                  Class: {currentClassName}
                </div>
              )}
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
      <div className=" p-4 sm:p-4">
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
            onClick={handleExportReport}
            disabled={loading}
            size="sm"
            variant="default"
          >
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Exporting...' : (t('exportReport') || 'Export Report')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-4">
        <div className="overflow-x-auto">
          <div className="flex gap-4 flex-wrap items-end">
            {/* Step 1: Report Type Dropdown - Always shown first */}
            <div className="flex-shrink-0 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BarChart3 className="h-4 w-4 inline mr-1" />
                {t('reportType') || 'Report Type'}
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

            {/* Class Selection - Dropdown if multiple classes, read-only if single class */}
            {teacherClasses.length > 0 && (
              <div className="flex-shrink-0 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="h-4 w-4 inline mr-1" />
                  {t('selectClass') || 'Select Class'}
                </label>
                {teacherClasses.length > 1 ? (
                  // Show dropdown if multiple classes
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
                  // Show read-only display if only one class
                  <div className="px-4 py-2 bg-gray-100 rounded border border-gray-300 text-sm text-gray-900">
                    {currentClassName}
                  </div>
                )}
              </div>
            )}

            {/* Step 3a: Academic Year Filter - Shown for report8 */}
            {selectedReport === 'report8' && (
              <div className="flex-shrink-0 min-w-[250px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
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
                <div className="flex-shrink-0 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Filter className="h-4 w-4 inline mr-1" />
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
                  <div className="flex-shrink-0 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
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
                    <div className="flex-shrink-0 min-w-[200px]">
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
                    <div className="flex-shrink-0 min-w-[200px]">
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
                <div className="flex-shrink-0 min-w-[250px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
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
                <div className="flex-shrink-0 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Filter className="h-4 w-4 inline mr-1" />
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
                  <div className="flex-shrink-0 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
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
                <div className="flex-shrink-0 min-w-[250px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
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
        </div>
      </div>

      {/* Report Content */}
      {renderReportContent()}
    </div>
  );
}
