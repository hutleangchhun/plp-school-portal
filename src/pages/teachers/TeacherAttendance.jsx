import { useState, useEffect } from 'react';
import { Calendar, Users, Check, X, Clock, AlertCircle, Save, RefreshCw, Download, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import { DatePickerWithDropdowns } from '../../components/ui/date-picker-with-dropdowns';
import { studentService } from '../../utils/api/services/studentService';
import { classService } from '../../utils/api/services/classService';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import EmptyState from '@/components/ui/EmptyState';

export default function TeacherAttendance({ user }) {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date()); // Date object for DatePicker
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [existingAttendance, setExistingAttendance] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Update selected date to current date when component mounts or becomes visible
  useEffect(() => {
    const updateToCurrentDate = () => {
      setSelectedDate(new Date());
    };

    // Update immediately
    updateToCurrentDate();

    // Also update when page becomes visible (handles overnight tab switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateToCurrentDate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const attendanceStatuses = [
    { value: 'PRESENT', label: t('present', 'Present'), icon: Check, color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-600', borderColor: 'green' },
    { value: 'ABSENT', label: t('absent', 'Absent'), icon: X, color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-600', borderColor: 'red'  },
    { value: 'LATE', label: t('late', 'Late'), icon: Clock, color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-600', borderColor: 'yellow' },
  ];

  // Helper function to convert Date to YYYY-MM-DD string (avoiding timezone issues)
  const formatDateToString = (date) => {
    if (!date) return '';
    // Use local date to avoid timezone offset issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if the selected date is in the past (before today)
  const isPastDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0); // Reset time to start of day
    return selected < today;
  };

  const isReadOnly = isPastDate();

  // Load classes on mount
  useEffect(() => {
    let mounted = true;

    async function loadClasses() {
      if (!user) {
        setInitialLoading(false);
        return;
      }

      try {
        const userId = user.id || user.userId || user.school_id || user.schoolId;
        const response = await classService.getClassByUser(userId);

        if (mounted && response.success && response.classes?.length > 0) {
          setClasses(response.classes || []);
          setSelectedClassId(String(response.classes[0].classId || response.classes[0].id));
        }
      } catch (error) {
        console.error('Error loading classes:', error);
        showError('Failed to load classes');
      } finally {
        if (mounted) {
          setInitialLoading(false);
        }
      }
    }

    loadClasses();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load students and attendance when class or date changes
  useEffect(() => {
    if (!selectedClassId || initialLoading) return;

    let mounted = true;

    async function loadStudentsAndAttendance() {
      try {
        setStudentsLoading(true);

        // Fetch students in the class (no limit to get all students)
        console.log('Fetching students for classId:', selectedClassId);
        const studentsResponse = await studentService.getMyStudents({
          classId: selectedClassId,
          page: 1,
          limit: 100 // Set very high limit to get all students
        });

        console.log('Students API response:', studentsResponse);

        if (!mounted) return;

        if (studentsResponse.success) {
          const studentsList = studentsResponse.data || [];
          console.log(`Loaded ${studentsList.length} students for attendance`);
          setStudents(studentsList);

          // Fetch existing attendance for this date and class
          const selectedDateStr = formatDateToString(selectedDate);
          console.log('=== ATTENDANCE REQUEST ===');
          console.log('Selected Date Object:', selectedDate);
          console.log('Selected Date String (formatted):', selectedDateStr);
          console.log('Current date (now):', formatDateToString(new Date()));
          console.log('Class ID:', selectedClassId);

          const attendanceResponse = await attendanceService.getAttendance({
            classId: selectedClassId,
            date: selectedDateStr,
            page: 1,
            limit: 100 // Set very high limit to get all attendance records
          });

          console.log('=== ATTENDANCE RESPONSE ===');
          console.log('Total records received:', attendanceResponse.data?.length);
          console.log('Records by date:', attendanceResponse.data?.reduce((acc, record) => {
            acc[record.date] = (acc[record.date] || 0) + 1;
            return acc;
          }, {}));
          console.log('Sample record:', attendanceResponse.data?.[0]);
          console.log('Full response:', attendanceResponse);

          if (!mounted) return;

          // Build attendance map
          const attendanceMap = {};
          const existingMap = {};

          if (attendanceResponse.success && attendanceResponse.data) {
            // WORKAROUND: Filter by date on frontend since backend might not filter correctly
            const filteredRecords = attendanceResponse.data.filter(record => {
              return record.date === selectedDateStr;
            });

            console.log(`Filtered ${filteredRecords.length} records out of ${attendanceResponse.data.length} for date ${selectedDateStr}`);
            console.log('Filtered records:', filteredRecords);

            filteredRecords.forEach(record => {
              // Normalize userId to number for consistent comparison
              const studentUserId = Number(record.userId);
              console.log('Loading attendance record:', {
                rawRecord: record,
                userId: studentUserId,
                status: record.status,
                reason: record.reason,
                date: record.date
              });
              attendanceMap[studentUserId] = {
                status: record.status,
                reason: record.reason || ''
              };
              existingMap[studentUserId] = record.id; // Store attendance record ID for updates
            });
          }

          console.log('Attendance map after loading from API:', attendanceMap);

          // Initialize attendance for all students (no default status if not marked)
          console.log('=== INITIALIZING STUDENTS ===');
          studentsList.forEach((student, index) => {
            const studentUserId = Number(student.userId || student.id);
            if (index === 0) {
              console.log('First student:', {
                rawUserId: student.userId || student.id,
                normalizedUserId: studentUserId,
                hasAttendance: !!attendanceMap[studentUserId],
                attendanceData: attendanceMap[studentUserId]
              });
            }
            if (!attendanceMap[studentUserId]) {
              attendanceMap[studentUserId] = {
                status: null, // No default status
                reason: ''
              };
            }
          });

          console.log('=== FINAL ATTENDANCE MAP ===', attendanceMap);
          setAttendance(attendanceMap);
          setExistingAttendance(existingMap);
        }
      } catch (error) {
        console.error('Error loading students and attendance:', error);
        showError('Failed to load students');
      } finally {
        if (mounted) {
          setStudentsLoading(false);
        }
      }
    }

    loadStudentsAndAttendance();

    return () => {
      mounted = false;
    };
  }, [selectedClassId, selectedDate, initialLoading, showError]);

  // Handle status change for a student
  const handleStatusChange = (studentUserId, status) => {
    // Prevent editing if the date is in the past
    if (isReadOnly) {
      showError(t('cannotEditPastAttendance', 'Cannot edit attendance for past dates'));
      return;
    }

    setAttendance(prev => {
      const currentAttendance = prev[studentUserId] || {};

      return {
        ...prev,
        [studentUserId]: {
          ...currentAttendance,
          status,
          // Clear reason if changing to PRESENT
          reason: status === 'PRESENT' ? '' : currentAttendance.reason
        }
      };
    });
  };

  // Handle reason change for a student
  const handleReasonChange = (studentUserId, reason) => {
    // Prevent editing if the date is in the past
    if (isReadOnly) {
      return;
    }

    setAttendance(prev => ({
      ...prev,
      [studentUserId]: {
        ...prev[studentUserId],
        reason
      }
    }));
  };

  // Mark all as present
  const handleMarkAllPresent = () => {
    // Prevent editing if the date is in the past
    if (isReadOnly) {
      showError(t('cannotEditPastAttendance', 'Cannot edit attendance for past dates'));
      return;
    }

    const newAttendance = {};
    students.forEach(student => {
      const studentUserId = student.userId || student.id;
      newAttendance[studentUserId] = {
        status: 'PRESENT',
        reason: ''
      };
    });
    setAttendance(newAttendance);
    showSuccess(t('markedAllPresent', 'Marked all students as present'));
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    // Prevent saving if the date is in the past
    if (isReadOnly) {
      showError(t('cannotEditPastAttendance', 'Cannot edit attendance for past dates'));
      return;
    }

    try {
      setSaving(true);

      const selectedDateStr = formatDateToString(selectedDate);

      const promises = students.map(async (student) => {
        const studentUserId = student.userId || student.id;
        const attendanceData = attendance[studentUserId];

        // Skip if no status selected
        if (!attendanceData || !attendanceData.status) return;

        const payload = {
          classId: parseInt(selectedClassId),
          userId: studentUserId,
          date: selectedDateStr,
          status: attendanceData.status,
          reason: attendanceData.reason || null
        };

        // Check if attendance record already exists
        const existingId = existingAttendance[studentUserId];

        if (existingId) {
          // Update existing record using PATCH
          return attendanceService.updateAttendance(existingId, payload);
        } else {
          // Create new record using POST
          return attendanceService.createAttendance(payload);
        }
      });

      await Promise.all(promises.filter(Boolean)); // Filter out undefined promises

      showSuccess(t('attendanceSavedSuccess', 'Attendance saved successfully'));

      // Reload attendance to get the updated records
      const attendanceResponse = await attendanceService.getAttendance({
        classId: selectedClassId,
        date: selectedDate,
        page: 1,
        limit: 100
      });

      if (attendanceResponse.success && attendanceResponse.data) {
        const existingMap = {};
        attendanceResponse.data.forEach(record => {
          existingMap[record.userId] = record.id;
        });
        setExistingAttendance(existingMap);
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      showError(t('attendanceSaveFailed', 'Failed to save attendance'));
    } finally {
      setSaving(false);
    }
  };

  // Prepare export data in traditional attendance sheet format
  const prepareExportData = () => {
    // Get selected class name
    const selectedClass = classes.find(cls => String(cls.classId || cls.id) === selectedClassId);
    const className = selectedClass?.name || 'Unknown-Class';
    const dateStr = formatDateToString(selectedDate);

    // Clean filename
    const cleanClassName = className
      .replace(/\s+/g, '_')
      .replace(/[^\w\u0080-\uFFFF-]/g, '_');

    // Get the current month and year from selected date
    const currentDate = new Date(selectedDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Prepare data for export in attendance sheet format
    const exportData = students.map((student, index) => {
      const studentUserId = Number(student.userId || student.id);
      const studentAttendance = attendance[studentUserId] || { status: null, reason: '' };

      const row = {
        'ល.រ': index + 1,
        'អត្តសញ្ញាណ': student.studentId || student.id || '',
        'ឈ្មោះ': student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username,
        'ភេទ': student.gender === 'MALE' ? 'ប' : student.gender === 'FEMALE' ? 'ស' : '',
      };

      // Add columns for each day of the month (1-31)
      for (let day = 1; day <= 31; day++) {
        if (day <= daysInMonth) {
          // Check if this is the selected date
          if (day === currentDate.getDate() && studentAttendance.status) {
            // Mark attendance: ម = Present, អ = Absent, យ = Late
            const statusMark = studentAttendance.status === 'PRESENT' ? 'ម' :
                             studentAttendance.status === 'ABSENT' ? 'អ' :
                             studentAttendance.status === 'LATE' ? 'យ' : '';
            row[day.toString()] = statusMark;
          } else {
            row[day.toString()] = '';
          }
        } else {
          row[day.toString()] = '';
        }
      }

      // Add summary columns
      row['ម'] = studentAttendance.status === 'PRESENT' ? 1 : 0;
      row['អ'] = studentAttendance.status === 'ABSENT' ? 1 : 0;
      row['យឺត'] = studentAttendance.status === 'LATE' ? 1 : 0;

      return row;
    });

    return { exportData, className: cleanClassName, dateStr, daysInMonth };
  };

  // Export attendance to Excel in traditional format
  const handleExportExcel = async () => {
    try {
      const { exportData, className, dateStr } = prepareExportData();

      // Import xlsx-js-style for borders
      const XLSXStyleModule = await import('xlsx-js-style');
      const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

      // Get selected class info
      const selectedClass = classes.find(cls => String(cls.classId || cls.id) === selectedClassId);
      const classFullName = selectedClass?.name || className;

      const currentDate = new Date(selectedDate);
      const monthName = currentDate.toLocaleDateString('km-KH', { month: 'long', year: 'numeric' });

      // Create template with headers
      const templateData = [
        // Official Header - Row 1
        ['ព្រះរាជាណាចក្រកម្ពុជា', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // Nation Religion King - Row 2
        ['ជាតិ       សាសនា       ព្រះមហាក្សត្រ', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // School Info - Row 3
        ['សាលា: _______________', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // Attendance Title - Row 4
        [`បញ្ជីកត់ត្រាវត្តមាន - ${classFullName}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // Month/Year - Row 5
        [`ខែ: ${monthName}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // Empty row - Row 6
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ];

      // Header row - Row 7
      const headerRow = ['ល.រ', 'អត្តសញ្ញាណ', 'ឈ្មោះ', 'ភេទ'];
      for (let i = 1; i <= 31; i++) {
        headerRow.push(i.toString());
      }
      headerRow.push('ម', 'អ', 'យឺត');
      while (headerRow.length < 38) headerRow.push('');
      templateData.push(headerRow);

      // Data rows starting from row 8
      const dataRows = exportData.map(row => {
        const arr = [
          row['ល.រ'],
          row['អត្តសញ្ញាណ'],
          row['ឈ្មោះ'],
          row['ភេទ']
        ];

        // Add day columns
        for (let i = 1; i <= 31; i++) {
          arr.push(row[i.toString()] || '');
        }

        // Add summary columns (no ផ្សេងៗ)
        arr.push(row['ម'], row['អ'], row['យឺត']);

        while (arr.length < 38) arr.push('');
        return arr;
      });

      templateData.push(...dataRows);

      // Create worksheet
      const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

      // Set column widths - attendance sheet format
      const colWidths = [
        { wch: 5 },  // ល.រ (No.)
        { wch: 12 }, // អត្តសញ្ញាណ (Student Number)
        { wch: 25 }, // ឈ្មោះ (Name)
        { wch: 5 },  // ភេទ (Gender)
      ];

      // Add widths for day columns (1-31)
      for (let i = 1; i <= 31; i++) {
        colWidths.push({ wch: 3 }); // Day columns - narrow
      }

      // Add widths for summary columns
      colWidths.push({ wch: 5 });  // ម (Present)
      colWidths.push({ wch: 5 });  // អ (Absent)
      colWidths.push({ wch: 5 });  // យឺត (Late)

      ws['!cols'] = colWidths;

      // Apply borders and styling to all cells
      const totalRows = templateData.length;
      const totalCols = 38; // 4 info + 31 days + 3 summary = 38 columns (A-AL)

      for (let R = 0; R < totalRows; R++) {
        for (let C = 0; C < totalCols; C++) {
          const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });

          if (!ws[cellAddress]) {
            ws[cellAddress] = { t: 's', v: '' };
          }

          // Header section (rows 0-5) - No borders, centered, bold
          if (R < 6) {
            ws[cellAddress].s = {
              alignment: {
                vertical: 'center',
                horizontal: 'center'
              },
              font: {
                name: 'Khmer OS Battambang',
                sz: 11,
                bold: true
              }
            };
          }
          // Column header row (row 6) - Gray background, borders, bold
          else if (R === 6) {
            ws[cellAddress].s = {
              fill: {
                fgColor: { rgb: 'E0E0E0' }
              },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              },
              alignment: {
                vertical: 'center',
                horizontal: 'center'
              },
              font: {
                name: 'Khmer OS Battambang',
                sz: 10,
                bold: true
              }
            };
          }
          // Data rows (7+) - Borders, centered except name column
          else {
            ws[cellAddress].s = {
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              },
              alignment: {
                vertical: 'center',
                horizontal: C === 2 ? 'left' : 'center' // Column C (ឈ្មោះ) left-aligned
              },
              font: {
                name: 'Khmer OS Battambang',
                sz: 10
              }
            };
          }
        }
      }

      // Create workbook
      const wb = XLSXStyle.utils.book_new();
      XLSXStyle.utils.book_append_sheet(wb, ws, 'កត់ត្រាវត្តមាន');

      // Set workbook properties
      wb.Props = {
        Title: `បញ្ជីកត់ត្រាវត្តមាន - ${className}`,
        Subject: 'វត្តមានសិស្ស',
        Author: 'Teacher Portal',
        CreatedDate: new Date()
      };

      // Generate filename
      const filename = `Attendance_${className}_${dateStr}.xlsx`;

      // Export file
      XLSXStyle.writeFile(wb, filename, {
        bookType: 'xlsx',
        type: 'binary'
      });

      showSuccess(t('exportSuccess', 'Attendance exported successfully'));
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showError(t('exportFailed', 'Failed to export attendance'));
    }
  };

  // Export attendance to CSV (Google Sheets compatible)
  const handleExportCSV = () => {
    try {
      const { exportData, className, dateStr } = prepareExportData();

      // Convert data to CSV format manually for better control
      const headers = Object.keys(exportData[0]);
      const csvRows = [];

      // Add headers
      csvRows.push(headers.join(','));

      // Add data rows
      exportData.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || '';
          // Escape values that contain commas, quotes, or newlines
          if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
            return `"${value.toString().replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvRows.push(values.join(','));
      });

      // Join all rows
      const csvContent = csvRows.join('\n');

      // Add UTF-8 BOM for better compatibility with Google Sheets
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;

      // Create blob and download
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `Attendance_${className}_${dateStr}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      showSuccess(t('exportSuccess', 'Attendance exported successfully'));
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      showError(t('exportFailed', 'Failed to export attendance'));
    }
  };

  // Class dropdown options
  const classDropdownOptions = classes.map(cls => ({
    value: String(cls.classId || cls.id),
    label: cls.name
  }));

  // Count students by status
  const getStatusCounts = () => {
    const counts = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
    };

    Object.values(attendance).forEach(record => {
      if (counts[record.status] !== undefined) {
        counts[record.status]++;
      }
    });

    return counts;
  };


  if (initialLoading) {
    return <PageLoader message={t('loadingAttendance', 'Loading attendance...')} />;
  }

  if (classes.length === 0) {
    return (
      <PageTransition className='h-96 flex justify-center items-center'>
        <EmptyState
          icon={Calendar}
          title={t('noClassesAssigned', 'No Classes Assigned')}
          variant='info'
          description={t('noClassesAssignedMessage', 'You are not assigned to any classes. Please contact the administrator.')}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition className='p-6'>
      <div>
        <FadeInSection>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {t('attendance', 'Attendance')}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {t('markStudentAttendance', 'Mark student attendance for your classes')}
            </p>
          </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Class Selector */}
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('class', 'Class')}
                </label>
                <Dropdown
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                  options={classDropdownOptions}
                  placeholder={t('selectClass', 'Select class...')}
                  minWidth="min-w-[200px] sm:min-w-[250px]"
                />
              </div>

              {/* Date Selector */}
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('date', 'Date')}
                </label>
                <DatePickerWithDropdowns
                  value={selectedDate}
                  onChange={(date) => setSelectedDate(date || new Date())}
                  placeholder={t('pickDate', 'Pick a date')}
                  className="min-w-[200px] sm:min-w-[250px]"
                  toDate={new Date()} // Limit to today
                  fromYear={new Date().getFullYear() - 1} // Allow selecting dates from last year
                />
              </div>

              {/* Actions */}
              <div className="w-full sm:w-auto sm:ml-auto flex gap-2 sm:mt-7">
                <Button
                  onClick={handleMarkAllPresent}
                  variant="outline"
                  size="sm"
                  disabled={studentsLoading || students.length === 0 || isReadOnly}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {t('markAllPresent', 'Mark All Present')}
                </Button>

                {/* Export Dropdown */}
                <div className="relative">
                  <Button
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    variant="outline"
                    size="sm"
                    disabled={studentsLoading || students.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('export', 'Export')}
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>

                  {showExportDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        <button
                          onClick={handleExportExcel}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          {t('exportToExcel', 'Export to Excel')}
                        </button>
                        <button
                          onClick={handleExportCSV}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          {t('exportToCSV', 'Export to CSV')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSaveAttendance}
                  disabled={saving || studentsLoading || students.length === 0 || isReadOnly}
                  size="sm"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving ? t('saving', 'Saving...') : t('save', 'Save')}
                </Button>
              </div>
            </div>

            {/* Past Date Warning */}
            {isReadOnly && showWarning && (
              <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 hover:scale-99 transition-transform">
                <div className="flex items-start justify-between">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        {t('viewingPastAttendance', 'You are viewing attendance for a past date. Editing is disabled.')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWarning(false)}
                    className="ml-3 flex-shrink-0 inline-flex text-yellow-600 hover:text-yellow-800 focus:outline-none transition-colors"
                    aria-label={t('close', 'Close')}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Students List */}
          {studentsLoading ? (
            <DynamicLoader message={t('loadingStudents', 'Loading students...')} />
          ) : students.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('noStudents', 'No Students')}
              variant='info'
              description={t('noStudentsInClass', 'There are no students in this class.')}
            />
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className='bg-blue-500'>
                      <th className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                        {t('student', 'Student')}
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                        {t('status', 'Status')}
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                        {t('reason', 'Reason')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => {
                      const studentUserId = Number(student.userId || student.id);
                      const studentAttendance = attendance[studentUserId] || { status: null, reason: '' };
                      const hasStatus = studentAttendance.status !== null;

                      // Debug log for first student
                      if (students.indexOf(student) === 0) {
                        console.log('First student render:', {
                          studentUserId,
                          studentAttendance,
                          hasStatus,
                          allAttendance: attendance
                        });
                      }

                      return (
                        <tr key={studentUserId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              {attendanceStatuses.map(status => {
                                const StatusIcon = status.icon;
                                const isSelected = hasStatus && studentAttendance.status === status.value;
                                return (
                                  <button
                                    key={status.value}
                                    onClick={() => handleStatusChange(studentUserId, status.value)}
                                    disabled={isReadOnly}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all border-0 ${
                                      isSelected
                                        ? `${status.bgColor} ${status.textColor} border-${status.borderColor}-200`
                                        : `bg-transparent border-2 border-gray-100 text-gray-600 ${isReadOnly ? '' : 'hover:bg-gray-100'}`
                                    } ${isReadOnly && !isSelected ? 'opacity-50' : ''} ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                    title={isReadOnly ? t('cannotEditPastAttendance', 'Cannot edit attendance for past dates') : status.label}
                                  >
                                    <StatusIcon className="h-4 w-4" />
                                    <span className="text-xs font-medium hidden sm:inline">{status.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {(studentAttendance.status === 'ABSENT' || studentAttendance.status === 'LATE') && (
                              <input
                                type="text"
                                value={studentAttendance.reason}
                                onChange={(e) => handleReasonChange(studentUserId, e.target.value)}
                                placeholder={t('enterReason', 'Enter reason...')}
                                disabled={isReadOnly}
                                readOnly={isReadOnly}
                                className={`block w-full p-3 border border-none ring-none outline-none rounded-md text-sm focus:outline-none focus:ring-none focus:border-none ${
                                  isReadOnly
                                    ? 'bg-gray-50 cursor-not-allowed text-gray-700'
                                    : 'hover:bg-transparent'
                                }`}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
