import { useState, useEffect } from 'react';
import { BarChart3, Download, Filter, Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import DynamicLoader from '../../components/ui/DynamicLoader';
import Dropdown from '../../components/ui/Dropdown';
import Badge from '../../components/ui/Badge';
import { processAndExportReport } from '../../utils/reportExportUtils';
import { studentService } from '../../utils/api/services/studentService';
import { classService } from '../../utils/api/services/classService';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { parentService } from '../../utils/api/services/parentService';

export default function Reports() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [selectedReport, setSelectedReport] = useState('report1');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');

  // 16 Report Types - waiting for your specific report names
  const reportTypes = [
    { value: 'report1', label: t('reportStudentNameInfo', 'បញ្ជីហៅឈ្មោះសិស្ស') },
    { value: 'report2', label: t('report2', 'បញ្ជីហៅឈ្មោះសិស្សតាមថ្នាក់') },
    { value: 'report3', label: t('report3', 'បញ្ជីមធ្យមភាគសិស្ស') },
    { value: 'report4', label: t('report4', 'បញ្ជីអវត្តមានសិស្ស') },
    { value: 'report5', label: t('report5', 'បញ្ជីឈ្មោះសិស្សអាហារូបករណ៍') },
    { value: 'report6', label: t('report6', 'បញ្ជីឈ្មោះសិស្សមានពិការភាព') },
    { value: 'report7', label: t('report7', 'បញ្ជីឈ្មោះសិស្សមានបញ្ហាសុខភាព') },
    { value: 'report8', label: t('report8', 'បញ្ជីឈ្មោះសិស្សមានបញ្ហាផ្ទាល់ខ្លួន') },
    { value: 'report9', label: t('report9', 'បញ្ជីឈ្មោះសិស្សជាជនជាតិដើមភាគតិច') },
    { value: 'report10', label: t('report10', 'បញ្ជីឈ្មោះសិស្សផ្លាស់ប្ដូរថ្នាក់') },
    { value: 'report11', label: t('report11', 'បញ្ជីឈ្មោះសិស្សបោះបង់ការសិក្សារ') },
    { value: 'report12', label: t('report12', 'សៀវភៅតាមដាន') },
    { value: 'report13', label: t('report13', 'សៀវភៅសិក្ខាគារិក') },
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

  // Year Options (2 years before, current year, and 2 years after)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - 2 + i; // Start from 2 years ago
    return {
      value: year.toString(),
      label: year.toString()
    };
  });

  useEffect(() => {
    fetchReportData();
  }, [selectedReport, selectedPeriod, selectedMonth, selectedYear, selectedClass]);

  // Fetch classes when report2, report3 or report4 is selected
  useEffect(() => {
    if (['report2', 'report3', 'report4'].includes(selectedReport)) {
      fetchSchoolClasses();
    }
  }, [selectedReport]);

  const fetchSchoolClasses = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const schoolId = userData?.school?.id || userData?.schoolId;

      if (!schoolId) return;

      console.log('📚 Fetching classes for school:', schoolId);

      const response = await classService.getBySchool(schoolId, {
        page: 1,
        limit: 100
      });

      if (response.success && response.classes) {
        const classOptions = [
          { value: 'all', label: t('allClasses', 'All Classes') },
          ...response.classes.map(cls => ({
            value: cls.id.toString(),
            label: cls.name || `Class ${cls.id}`
          }))
        ];
        setAvailableClasses(classOptions);
        console.log(`✅ Fetched ${response.classes.length} classes`);
      }
    } catch (error) {
      console.error('❌ Error fetching classes:', error);
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

      console.log('📊 Fetching report data:', {
        report: selectedReport,
        period: selectedPeriod,
        month: selectedMonth,
        year: selectedYear,
        schoolId,
        classId: selectedClass !== 'all' ? selectedClass : undefined
      });

      // Build date filters based on period
      const dateFilters = {};
      if (selectedYear) {
        dateFilters.academicYear = selectedYear;
      }

      // Add class filter if selected and not 'all'
      if (selectedClass && selectedClass !== 'all') {
        dateFilters.classId = selectedClass;
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
          classId: selectedClass !== 'all' ? selectedClass : undefined,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate)
        });

        // Fetch attendance records
        const attendanceResponse = await attendanceService.getAttendance({
          classId: selectedClass !== 'all' ? parseInt(selectedClass) : undefined,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          limit: 400
        });

        if (attendanceResponse.success) {
          // Group attendance by student and calculate absences
          const attendanceByStudent = {};
          
          attendanceResponse.data.forEach(record => {
            const userId = record.userId;
            if (!attendanceByStudent[userId]) {
              // Extract user data from the attendance record
              const user = record.user || {};
              const student = record.student || {};
              
              attendanceByStudent[userId] = {
                userId: userId,
                studentId: student.studentId || student.id || userId,
                // Use first_name and last_name from user object
                firstName: user.first_name || user.firstName || '',
                lastName: user.last_name || user.lastName || '',
                khmerName: `${user.last_name || user.lastName || ''} ${user.first_name || user.firstName || ''}`.trim(),
                gender: user.gender || '',
                class: record.class,
                attendances: []
              };
            }
            attendanceByStudent[userId].attendances.push(record);
          });

          // Convert to array format expected by transformer
          const studentsWithAttendance = Object.values(attendanceByStudent);
          console.log(`✅ Processed ${studentsWithAttendance.length} students with attendance data`);
          console.log('📊 Sample student data:', studentsWithAttendance[0]);
          setReportData(studentsWithAttendance);
        } else {
          throw new Error(attendanceResponse.error || 'Failed to fetch attendance data');
        }
      } else if (['report1', 'report2', 'report6', 'report9'].includes(selectedReport)) {
        // For report1, report2, report6, report9 - fetch students with full details and parent information
        console.log(`📋 Fetching students with parent information for ${selectedReport}`);
        
        // Step 1: Fetch all students from school in batches (API limit is 100 per page)
        // For report2, filter by selected class
        let allBasicStudents = [];
        let currentPage = 1;
        let hasMorePages = true;
        
        while (hasMorePages) {
          const fetchParams = {
            page: currentPage,
            limit: 100 // API maximum
          };
          
          // Add class filter for report2
          if (selectedReport === 'report2' && selectedClass && selectedClass !== 'all') {
            fetchParams.classId = selectedClass;
          }
          
          console.log(`📄 Fetching page ${currentPage} with limit 100...`);
          
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
                
                // Combine full student data with parents
                return {
                  ...fullStudent,
                  studentId: studentId,
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
          
          // Apply filtering for specific reports
          let filteredStudents = studentsWithFullData;
          
          if (selectedReport === 'report6') {
            // Filter students with disabilities (accessibility field is not null/empty)
            filteredStudents = studentsWithFullData.filter(student => {
              const hasAccessibility = student.accessibility && 
                                      student.accessibility !== '' && 
                                      student.accessibility !== 'null' &&
                                      student.accessibility !== 'none';
              return hasAccessibility;
            });
            console.log(`🦽 Filtered ${filteredStudents.length} students with disabilities from ${studentsWithFullData.length} total students`);
          } else if (selectedReport === 'report9') {
            // Filter ethnic minority students (ethnic_group is not empty and not the majority group)
            // Assuming majority group is 'ខ្មែរ' (Khmer) - adjust if needed
            filteredStudents = studentsWithFullData.filter(student => {
              const ethnicGroup = student.ethnic_group || student.ethnicGroup || '';
              const isMinority = ethnicGroup && 
                                ethnicGroup !== '' && 
                                ethnicGroup !== 'null' &&
                                ethnicGroup !== 'ខ្មែរ' && // Not Khmer majority
                                ethnicGroup !== 'Khmer';
              return isMinority;
            });
            console.log(`🌍 Filtered ${filteredStudents.length} ethnic minority students from ${studentsWithFullData.length} total students`);
          }
          
          setReportData(filteredStudents);
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

      // Get class name for report2
      let className = '';
      if (selectedReport === 'report2' && selectedClass && selectedClass !== 'all') {
        const classOption = availableClasses.find(c => c.value === selectedClass);
        className = classOption?.label || '';
      }

      console.log(`📥 Exporting report: ${reportName} with ${reportData.length} records`);

      // Process and export the report with real data
      const result = await processAndExportReport(
        selectedReport,
        reportData,
        reportName,
        periodInfo,
        schoolName,
        className
      );

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
        <div className="bg-white rounded-lg shadow p-12 flex justify-center items-center">
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
      return (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('noDataAvailable', 'No Data Available')}
            </h3>
            <p className="text-gray-600">
              {t('noDataMessage', 'Please select filters and wait for data to load.')}
            </p>
          </div>
        </div>
      );
    }

    // Calculate statistics for charts
    const calculateStats = () => {
      if (['report1', 'report2', 'report6', 'report9'].includes(selectedReport)) {
        // Gender distribution
        const genderCount = reportData.reduce((acc, student) => {
          const gender = student.gender || 'Unknown';
          acc[gender] = (acc[gender] || 0) + 1;
          return acc;
        }, {});

        // Ethnic group distribution
        const ethnicCount = reportData.reduce((acc, student) => {
          const ethnic = student.ethnicGroup || student.ethnic_group || 'Unknown';
          acc[ethnic] = (acc[ethnic] || 0) + 1;
          return acc;
        }, {});

        // Parent status
        const parentStatus = reportData.reduce((acc, student) => {
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
      // For report1, report2, report6, report9 - Show statistics
      if (['report1', 'report2', 'report6', 'report9'].includes(selectedReport)) {
        const maxValue = Math.max(...Object.values(stats?.genderCount || {}), 1);
        const maxParentValue = Math.max(
          stats?.parentStatus.bothParents || 0,
          stats?.parentStatus.oneParent || 0,
          stats?.parentStatus.noParents || 0,
          1
        );
        
        // Determine summary card color based on report type
        const getSummaryCardColor = () => {
          if (selectedReport === 'report6') return 'from-purple-500 to-purple-600';
          if (selectedReport === 'report9') return 'from-orange-500 to-orange-600';
          return 'from-indigo-500 to-purple-600';
        };

        const getSummaryTitle = () => {
          if (selectedReport === 'report6') return t('studentsWithDisabilities', 'Students with Disabilities');
          if (selectedReport === 'report9') return t('ethnicMinorityStudents', 'Ethnic Minority Students');
          return 'Total Students';
        };
        
        return (
          <div className="space-y-6">
            {/* Total Students Summary */}
            <div className={`bg-gradient-to-r ${getSummaryCardColor()} rounded-lg p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white opacity-90">{getSummaryTitle()}</p>
                  <p className="text-4xl font-bold mt-2">{reportData.length}</p>
                </div>
                <BarChart3 className="h-16 w-16 text-white opacity-80" />
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Conditional Charts based on Report Type */}
              
              {/* Report 1 & 2: Show Parent Status */}
              {['report1', 'report2'].includes(selectedReport) && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-6">Parent Status</h4>
                  <div className="space-y-6">
                    {stats?.parentStatus.bothParents > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Both Parents</span>
                          <span className="text-sm font-bold text-gray-900">
                            {stats.parentStatus.bothParents} ({((stats.parentStatus.bothParents / reportData.length) * 100).toFixed(1)}%)
                          </span>
                        </div>
                        <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                          <div 
                            className="absolute h-full bg-gradient-to-r from-green-500 to-green-400 rounded-lg transition-all duration-500"
                            style={{ width: `${(stats.parentStatus.bothParents / maxParentValue) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {stats?.parentStatus.oneParent > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">One Parent</span>
                          <span className="text-sm font-bold text-gray-900">
                            {stats.parentStatus.oneParent} ({((stats.parentStatus.oneParent / reportData.length) * 100).toFixed(1)}%)
                          </span>
                        </div>
                        <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                          <div 
                            className="absolute h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-lg transition-all duration-500"
                            style={{ width: `${(stats.parentStatus.oneParent / maxParentValue) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {stats?.parentStatus.noParents > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">No Parents</span>
                          <span className="text-sm font-bold text-gray-900">
                            {stats.parentStatus.noParents} ({((stats.parentStatus.noParents / reportData.length) * 100).toFixed(1)}%)
                          </span>
                        </div>
                        <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                          <div 
                            className="absolute h-full bg-gradient-to-r from-red-500 to-red-400 rounded-lg transition-all duration-500"
                            style={{ width: `${(stats.parentStatus.noParents / maxParentValue) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Report 6: Show Disability Types Distribution */}
              {selectedReport === 'report6' && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-6">Disability Types</h4>
                  <div className="space-y-4">
                    {reportData.map((student, idx) => {
                      const disabilityType = Array.isArray(student.accessibility) 
                        ? student.accessibility.join(', ') 
                        : student.accessibility || 'Not specified';
                      return idx < 10 ? (
                        <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {student.lastName} {student.firstName}
                            </p>
                            <p className="text-xs text-gray-600">{student.class?.name || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-purple-700">{disabilityType}</p>
                          </div>
                        </div>
                      ) : null;
                    })}
                    {reportData.length > 10 && (
                      <p className="text-xs text-center text-gray-500 pt-2">
                        +{reportData.length - 10} more students
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Report 9: Show Ethnic Groups Distribution */}
              {selectedReport === 'report9' && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-6">Ethnic Groups Distribution</h4>
                  <div className="space-y-4">
                    {Object.entries(stats?.ethnicCount || {}).map(([ethnic, count], index) => {
                      const percentage = ((count / reportData.length) * 100).toFixed(1);
                      const colors = ['from-blue-500 to-blue-400', 'from-indigo-500 to-indigo-400', 'from-purple-500 to-purple-400', 'from-pink-500 to-pink-400', 'from-orange-500 to-orange-400'];
                      return (
                        <div key={ethnic}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">{ethnic || 'Unknown'}</span>
                            <span className="text-sm font-bold text-gray-900">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                            <div 
                              className={`absolute h-full bg-gradient-to-r ${colors[index % colors.length]} rounded-lg transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Report 1 & 2: Show Special Needs & Ethnic Groups Combined */}
              {['report1', 'report2'].includes(selectedReport) && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-6">Special Needs & Ethnic Groups</h4>
                  <div className="space-y-6">
                    {/* Special Needs */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Special Needs Students</span>
                        <span className="text-sm font-bold text-purple-900">
                          {stats?.specialNeedsCount || 0} ({((stats?.specialNeedsCount || 0) / reportData.length * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                        <div 
                          className="absolute h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-lg transition-all duration-500"
                          style={{ width: `${((stats?.specialNeedsCount || 0) / reportData.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Ethnic Groups */}
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-3">Ethnic Groups</p>
                      <div className="space-y-2">
                        {Object.entries(stats?.ethnicCount || {}).slice(0, 5).map(([ethnic, count], index) => {
                          const percentage = ((count / reportData.length) * 100).toFixed(1);
                          const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
                          return (
                            <div key={ethnic} className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                              <span className="text-xs text-gray-600 flex-1">{ethnic || 'Unknown'}</span>
                              <span className="text-xs font-semibold text-gray-900">{count} ({percentage}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
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
                  <p className="text-sm font-medium text-indigo-600">Total Records</p>
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
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
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
              {!['report1', 'report2', 'report6', 'report9'].includes(selectedReport) && (
                <div className="text-xs text-gray-500">
                  <span>{timePeriods.find(p => p.value === selectedPeriod)?.label}</span>
                  {selectedPeriod === 'month' && selectedMonth && (
                    <span> • {monthOptions.find(m => m.value === selectedMonth)?.label}</span>
                  )}
                  <span> • {selectedYear}</span>
                </div>
              )}
              {selectedReport === 'report2' && selectedClass && selectedClass !== 'all' && (
                <div className="text-xs text-gray-500">
                  {availableClasses.find(c => c.value === selectedClass)?.label || selectedClass}
                </div>
              )}
            </div>
          </div>
          <div className="h-px bg-gray-200"></div>
        </div>

        {renderDataPreview()}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{t('note', 'Note')}:</strong> {t('reportReadyToExport', `${reportData.length} records are ready to export. Click the "Export Report" button above to download as Excel.`)}
          </p>
        </div>
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
          <button
            onClick={handleExportReport}
            disabled={loading}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Exporting...' : (t('exportReport') || 'Export Report')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-4">
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max md:grid md:grid-cols-2 lg:grid-cols-4 md:min-w-full">
            {/* Report Type Dropdown */}
            <div className="flex-shrink-0 w-full md:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BarChart3 className="h-4 w-4 inline mr-1" />
                {t('reportType') || 'Report Type'}
              </label>
              <Dropdown
                value={selectedReport}
                onValueChange={(value) => {
                  setSelectedReport(value);
                  // Reset class filter when changing report type
                  if (value !== 'report4') {
                    setSelectedClass('all');
                  }
                }}
                options={reportTypes}
                placeholder={t('selectReportType', 'Select report type...')}
                minWidth="w-full"
                maxHeight="max-h-56"
                itemsToShow={10}
              />
            </div>

            {/* Time Period Dropdown - Hide for report1, report2, report6, report9 */}
            {!['report1', 'report2', 'report6', 'report9'].includes(selectedReport) && (
              <div className="flex-shrink-0 w-full md:w-auto">
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
            )}

            {/* Conditional: Month Dropdown (shown when period is 'month') - Hide for report1, report2, report6, report9 */}
            {!['report1', 'report2', 'report6', 'report9'].includes(selectedReport) && selectedPeriod === 'month' && (
              <div className="flex-shrink-0 w-full md:w-auto">
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

            {/* Year Dropdown (shown for all periods) - Hide for report1, report2, report6, report9 */}
            {!['report1', 'report2', 'report6', 'report9'].includes(selectedReport) && (
              <div className="flex-shrink-0 w-full md:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  {t('selectAcademicYear') || 'Select Year'}
                </label>
                <Dropdown
                  value={selectedYear}
                  onValueChange={setSelectedYear}
                  options={yearOptions}
                  placeholder={t('chooseYear', 'Choose year...')}
                  minWidth="w-full"
                  maxHeight="max-h-40"
                  itemsToShow={5}
                />
              </div>
            )}

            {/* Class Filter - Shown for report2, report3, and report4 */}
            {['report2', 'report3', 'report4'].includes(selectedReport) && (
              <div className="flex-shrink-0 w-full md:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="h-4 w-4 inline mr-1" />
                  {t('selectClass') || 'Select Class'}
                </label>
                <Dropdown
                  value={selectedClass}
                  onValueChange={setSelectedClass}
                  options={availableClasses}
                  placeholder={t('chooseClass', 'Choose class...')}
                  minWidth="w-full"
                  maxHeight="max-h-56"
                  itemsToShow={10}
                />
              </div>
            )}

          </div>
        </div>

        {/* Selected Filters Display */}
        <div className="mt-4 py-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-gray-700">{t('selectedFilters', 'Selected Filters')}:</span>
            <div className="flex flex-wrap gap-2">
              <Badge color="blue" variant="filled" size="sm">
                {reportTypes.find(r => r.value === selectedReport)?.label || selectedReport}
              </Badge>
              {!['report1', 'report2', 'report6', 'report9'].includes(selectedReport) && (
                <>
                  <Badge color="green" variant="filled" size="sm">
                    {timePeriods.find(p => p.value === selectedPeriod)?.label || selectedPeriod}
                  </Badge>
                  {selectedPeriod === 'month' && selectedMonth && (
                    <Badge color="orange" variant="filled" size="sm">
                      {monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth}
                    </Badge>
                  )}
                  <Badge color="purple" variant="filled" size="sm">
                    {t('year', 'Year')}: {selectedYear}
                  </Badge>
                </>
              )}
              {['report2', 'report3', 'report4'].includes(selectedReport) && selectedClass && selectedClass !== 'all' && (
                <Badge color="indigo" variant="filled" size="sm">
                  {t('class', 'Class')}: {availableClasses.find(c => c.value === selectedClass)?.label || selectedClass}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {renderReportContent()}
    </div>
  );
}