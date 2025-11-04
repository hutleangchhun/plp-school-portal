import { useState, useEffect } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDateKhmer, getKhmerDayShorthand, isWeekend } from '../../utils/formatters';
import { attendanceService } from '../../utils/api/services/attendanceService';
import schoolService from '../../utils/api/services/schoolService';

/**
 * AttendanceExport Component
 *
 * A reusable component for exporting attendance data to Excel or CSV format
 * Supports both daily and monthly attendance reports
 *
 * @param {Object} props
 * @param {Array} props.students - Array of student objects
 * @param {Object} props.attendance - Attendance data object
 * @param {string} props.className - Name of the class
 * @param {string} props.schoolName - Name of the school
 * @param {number} props.schoolId - School ID to fetch school info
 * @param {Date} props.selectedDate - Selected date for export
 * @param {string} props.exportType - 'daily' or 'monthly'
 * @param {boolean} props.disabled - Disable export button
 */
export default function AttendanceExport({
  students = [],
  attendance = {},
  className = 'Unknown-Class',
  schoolName = 'សាលា',
  schoolId = null,
  selectedDate,
  exportType = 'monthly', // 'daily' or 'monthly'
  classId, // Required for API calls
  disabled = false
}) {
  // Default to current date if no selectedDate is provided and exportType is monthly
  const defaultSelectedDate = selectedDate || (exportType === 'monthly' ? new Date() : new Date());
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [resolvedSchoolName, setResolvedSchoolName] = useState(schoolName);

  // Fetch school name from API if schoolId is provided
  useEffect(() => {
    if (schoolId && !schoolName) {
      const fetchSchoolName = async () => {
        try {
          const schoolResponse = await schoolService.getSchoolInfo(schoolId);
          if (schoolResponse?.data?.name) {
            setResolvedSchoolName(schoolResponse.data.name);
          }
        } catch (err) {
          console.warn('Failed to fetch school name:', err);
          // Keep the default name
        }
      };
      fetchSchoolName();
    }
  }, [schoolId, schoolName]);

  // Format date to string (YYYY-MM-DD)
  const formatDateToString = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const effectiveDate = selectedDate || defaultSelectedDate;

  // Get start and end date for the current month
  const getCurrentMonthRange = () => {
    const now = new Date(effectiveDate);
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // First day of the month
    const startDate = new Date(year, month, 1);
    // Last day of the month
    const endDate = new Date(year, month + 1, 0);
    
    return {
      startDate: formatDateToString(startDate),
      endDate: formatDateToString(endDate)
    };
  };

  // Clean filename
  const cleanClassName = className
    .replace(/\s+/g, '_')
    .replace(/[^\w\u0080-\uFFFF-]/g, '_');

  // Fetch monthly attendance data for all students
  const fetchMonthlyAttendanceData = async () => {
    const { startDate, endDate } = getCurrentMonthRange();
    
    try {
      // Fetch attendance data for the month
      const attendanceResponse = await attendanceService.getAttendance({
        classId: classId,
        startDate: startDate,
        endDate: endDate
      });
      
      if (!attendanceResponse.success) {
        throw new Error('Failed to fetch attendance data');
      }
      
      // Transform the fetched data into the expected format
      // Expected format: { userId: { date: { status, reason, ... }, ... }, ... }
      const transformedAttendance = {};
      attendanceResponse.data.forEach(record => {
        const userId = record.userId;
        const date = record.date;
        
        if (!transformedAttendance[userId]) {
          transformedAttendance[userId] = {};
        }
        
        transformedAttendance[userId][date] = {
          status: record.status,
          reason: record.reason
        };
      });
      
      return transformedAttendance;
    } catch (error) {
      console.error('Error fetching monthly attendance data:', error);
      showError(t('fetchAttendanceFailed', 'Failed to fetch attendance data'));
      return {};
    }
  };

  // Prepare export data for monthly report
  const prepareMonthlyExportData = (monthlyAttendance = null) => {
    const actualAttendance = monthlyAttendance || attendance;
    const currentDate = new Date(effectiveDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const exportData = students.map((student, index) => {
      const studentUserId = Number(student.userId || student.id);

      const row = {
        'ល.រ': index + 1,
        'អត្តលេខ': student.studentId || student.id || '',
        'ឈ្មោះ': student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username || '',
        'ភេទ': student.gender === 'MALE' ? 'ប' : student.gender === 'FEMALE' ? 'ស' : '',
      };

      // Add columns for each day of the month (1-31)
      let absentCount = 0;
      let leaveCount = 0; // LEAVE only

      for (let day = 1; day <= 31; day++) {
        if (day <= daysInMonth) {
          // Check attendance for this specific day
          const dayDate = new Date(year, month, day);
          const dateStr = formatDateToString(dayDate);
          const studentAttendance = actualAttendance[studentUserId]?.[dateStr];

          if (studentAttendance?.status) {
            const statusMark = studentAttendance.status === 'PRESENT' ? '' :
                             studentAttendance.status === 'ABSENT' ? 'អច្ប' :
                             studentAttendance.status === 'LEAVE' ? 'ច្ប' :
                             studentAttendance.status === 'LATE' ? '' : '';
            row[day.toString()] = statusMark;

            // Count totals - only ABSENT and LEAVE
            if (studentAttendance.status === 'ABSENT') absentCount++;
            else if (studentAttendance.status === 'LEAVE') leaveCount++; // Count LEAVE only
          } else {
            row[day.toString()] = '';
          }
        } else {
          row[day.toString()] = '';
        }
      }

      // Add summary columns with 3 fields only (ABSENT, LEAVE, Total)
      row['អច្ប'] = absentCount;       // ABSENT
      row['ច្ប'] = leaveCount;          // LEAVE only
      row['សរុប'] = absentCount + leaveCount; // Total (ABSENT + LEAVE)

      return row;
    });

    return { exportData, daysInMonth };
  };

  // Prepare export data for daily report
  const prepareDailyExportData = (dailyAttendance = null) => {
    const actualAttendance = dailyAttendance || attendance;
    const currentDate = new Date(effectiveDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const exportData = students.map((student, index) => {
      const studentUserId = Number(student.userId || student.id);
      const studentAttendance = actualAttendance[studentUserId] || { status: null, reason: '' };

      const row = {
        'ល.រ': index + 1,
        'អត្តលេខ': student.studentId || student.id || '',
        'ឈ្មោះ': student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username || '',
        'ភេទ': student.gender === 'MALE' ? 'ប' : student.gender === 'FEMALE' ? 'ស' : '',
      };

      // Add columns for each day of the month (1-31)
      for (let day = 1; day <= 31; day++) {
        if (day <= daysInMonth) {
          // Check if this is the selected date
          if (day === currentDate.getDate() && studentAttendance.status) {
            const statusMark = studentAttendance.status === 'PRESENT' ? 'វត្ត' :
                             studentAttendance.status === 'ABSENT' ? 'អច្ប' :
                             studentAttendance.status === 'LEAVE' ? 'ច្ប' :
                             studentAttendance.status === 'LATE' ? 'អ' : '';
            row[day.toString()] = statusMark;
          } else {
            row[day.toString()] = '';
          }
        } else {
          row[day.toString()] = '';
        }
      }

      // Add summary columns with 3 fields only (ABSENT, LEAVE, Total)
      // For daily report, count 1 if status matches, 0 otherwise
      const isAbsent = studentAttendance.status === 'ABSENT' ? 1 : 0;
      const isLeave = studentAttendance.status === 'LEAVE' ? 1 : 0;
      const totalAbsentAndLeave = isAbsent + isLeave;

      row['អច្ប'] = isAbsent;                // ABSENT
      row['ច្ប'] = isLeave;                  // LEAVE only
      row['សរុប'] = totalAbsentAndLeave;    // Total (ABSENT + LEAVE)

      return row;
    });

    return { exportData, daysInMonth };
  };

  // Export to Excel with borders and styling
  const handleExportExcel = async () => {
    try {
      let exportData, daysInMonth;
      
      if (exportType === 'monthly') {
        // Fetch current month's attendance data
        const monthlyAttendance = await fetchMonthlyAttendanceData();
        ({ exportData, daysInMonth } = prepareMonthlyExportData(monthlyAttendance));
      } else {
        ({ exportData, daysInMonth } = prepareDailyExportData());
      }

      const dateStr = formatDateToString(effectiveDate);

      // Import xlsx-js-style for borders
      const XLSXStyleModule = await import('xlsx-js-style');
      const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

      const currentDate = new Date(effectiveDate);
      const monthName = formatDateKhmer(currentDate, 'monthYear');

      // Calculate student counts for header
      const totalStudents = students.length;
      const femaleStudents = students.filter(s => s.gender === 'FEMALE').length;
      const maleStudents = totalStudents - femaleStudents;

      // Create template with headers (dynamic: 4 info + actual days + 4 summary)
      const totalColumns = 4 + daysInMonth + 4;
      const emptyRow = Array(totalColumns).fill('');

      // Build header rows - simplified structure
      const templateData = [];

      // Row 0: Kingdom header
      templateData.push(['ព្រះរាជាណាចក្រកម្ពុជា', ...Array(totalColumns - 1).fill('')]);

      // Row 1: Nation/Religion/King in 3 columns
      const nationRow = [...emptyRow];
      nationRow[10] = 'ជាតិ';
      nationRow[18] = 'សាសនា';
      nationRow[28] = 'ព្រះមហាក្សត្រ';
      templateData.push(nationRow);

      // Row 2: Department - left aligned
      const deptRow = [...emptyRow];
      deptRow[0] = 'មន្ទីរអប់រំ យុវជន និងកីឡា រាជធានី/ខេត្ត............';
      templateData.push(deptRow);

      // Row 3: Office - left aligned
      const officeRow = [...emptyRow];
      officeRow[0] = 'ការិយាល័យអប់រំ យុវជន និងកីឡារដ្ឋបាលក្រុង/ស្រុក/ខណ្ឌ.......................................';
      templateData.push(officeRow);

      // Row 4: School - left aligned
      const schoolRow = [...emptyRow];
      schoolRow[0] = resolvedSchoolName;
      templateData.push(schoolRow);

      // Row 5: Attendance Title
      templateData.push(['បញ្ជីអវត្តមានប្រចាំខែ', ...Array(totalColumns - 1).fill('')]);

      // Row 6: Section Title with class
      templateData.push([`ផ្នែកអវត្តមានប្រចាំខែ - ${className}`, ...Array(totalColumns - 1).fill('')]);

      // Row 7: Month
      templateData.push([`ខែ: ${monthName}`, ...Array(totalColumns - 1).fill('')]);

      // Row 8: Empty row
      templateData.push([...emptyRow]);

      // Row 9: Info row with student counts
      const infoRow = [...emptyRow];
      infoRow[0] = 'ប្រចាំខែ:............................. ឆ្នាំសិក្សា............................';
      infoRow[24] = `សិស្សសរុប: ................${totalStudents}នាក់  ប្រុស...............${maleStudents}នាក់ ស្រី.................${femaleStudents}នាក់`;
      templateData.push(infoRow);

      // Two-row header structure
      // Calculate summary column position based on actual days in month
      const summaryStartCol = 4 + daysInMonth;

      // Row 10: First header row with day names (Khmer shorthand)
      const headerRow1 = [...emptyRow];
      headerRow1[0] = 'ល.រ';
      headerRow1[1] = 'អត្តលេខ';
      headerRow1[2] = 'គោត្តនាម និងនាម';
      headerRow1[3] = 'ភេទ';
      // Add Khmer day names for each day of month
      for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dayOfWeekNum = dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1; // 0 = Monday, 6 = Sunday
        headerRow1[3 + day] = getKhmerDayShorthand(dayOfWeekNum);
      }
      headerRow1[summaryStartCol] = 'ចំនួនអវត្តមាន'; // Spans 3 columns
      headerRow1[summaryStartCol + 3] = 'សេចក្តីប្រកាស';
      templateData.push(headerRow1);

      // Row 11: Second header row with day numbers
      const headerRow2 = [...emptyRow];
      // First 4 columns are merged with row above, leave empty
      headerRow2[0] = '';
      headerRow2[1] = '';
      headerRow2[2] = '';
      headerRow2[3] = '';
      // Day numbers - only show actual days in month
      for (let i = 1; i <= daysInMonth; i++) {
        headerRow2[3 + i] = i.toString(); // Columns 4 onwards
      }
      // Summary columns positioned after actual days
      headerRow2[summaryStartCol] = 'អច្ប';    // ABSENT
      headerRow2[summaryStartCol + 1] = 'ច្ប';     // LEAVE
      headerRow2[summaryStartCol + 2] = 'សរុប';    // TOTAL
      headerRow2[summaryStartCol + 3] = ''; // Remarks
      templateData.push(headerRow2);

      // Data rows starting from row 8
      const dataRows = exportData.map(row => {
        const arr = [
          row['ល.រ'],
          row['អត្តលេខ'],
          row['ឈ្មោះ'],
          row['ភេទ']
        ];

        // Add day columns - only actual days in month
        for (let i = 1; i <= daysInMonth; i++) {
          arr.push(row[i.toString()] || '');
        }

        // Add summary columns with Khmer labels (3 fields: ABSENT, LEAVE, TOTAL)
        arr.push(row['អច្ប'], row['ច្ប'], row['សរុប'], ''); // Last column is blank ផ្សេងៗ

        while (arr.length < totalColumns) arr.push('');
        return arr;
      });

      templateData.push(...dataRows);

      // Note: Student counts already calculated earlier for use in header and footer
      // Note: Other calculation fields (attendance counts, percentage) left blank for manual entry as per standard format

      // Add footer section (summary statistics) - Structured format
      const emptyFooterRow = Array(totalColumns).fill('');

      // Empty row for spacing
      templateData.push([...emptyFooterRow]);

      // First summary row with calculations
      const summaryRow1 = [...emptyFooterRow];
      summaryRow1[0] = `- ចំនួនសិស្សក្នុងបញ្ជី..${totalStudents}..នាក់ ប្រុស..${maleStudents}..នាក់ ស្រី..${femaleStudents}..នាក់ ចំនួនពេលដែលសិស្សត្រូវមករៀន..... ចំនួនពេលអវត្តមាន...... ចំនួនពេលដែលសិស្សមករៀនពិតប្រាកដ........... គណនាភាគរយៈ  x100  = .............. %`;
      templateData.push(summaryRow1);

      // Second row - times list stopped
      const summaryRow2 = [...emptyFooterRow];
      summaryRow2[0] = '- បញ្ឈប់បញ្ជីក្នុងខែនេះនូវចំនួន..........ពេល';
      templateData.push(summaryRow2);

      // First date row - right aligned
      const dateRow1 = [...emptyFooterRow];
      dateRow1[30] = 'ថ្ងៃ........... ខែ ......... ឆ្នាំ...... ព.ស.២៥...........';
      templateData.push(dateRow1);
      // Second date row - right aligned
      const dateRow2 = [...emptyFooterRow];
      dateRow2[30] = 'ធ្វើនៅ.........................ថ្ងៃទី.......... ខែ............. ឆ្នាំ២០.......';
      templateData.push(dateRow2);

      // Empty row
      templateData.push([...emptyFooterRow]);

      // Signature labels row - left and right
      const signatureRow = [...emptyFooterRow];
      signatureRow[5] = 'បានឃើញ';
      signatureRow[33] = 'គ្រូប្រចាំថ្នាក់';
      templateData.push(signatureRow);

      // Position labels row - left side only
      const positionRow = [...emptyFooterRow];
      positionRow[4] = 'នាយកសាលា';
      templateData.push(positionRow);

      // Empty rows for actual signatures
      templateData.push([...emptyFooterRow]);
      templateData.push([...emptyFooterRow]);

      // Create worksheet
      const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

      // Set column widths - attendance sheet format
      const colWidths = [
        { wch: 5 },  // ល.រ (No.)
        { wch: 12 }, // អត្តសញ្ញាណ (Student Number)
        { wch: 25 }, // ឈ្មោះ (Name)
        { wch: 5 },  // ភេទ (Gender)
      ];

      // Add widths for day columns - actual days in month
      for (let i = 1; i <= daysInMonth; i++) {
        colWidths.push({ wch: 3 }); // Day columns - narrow
      }

      // Add widths for summary columns (3 fields: ABSENT, LEAVE, TOTAL)
      colWidths.push({ wch: 5 });  // អច្ប (Absent)
      colWidths.push({ wch: 5 });  // ច្ប (Leave)
      colWidths.push({ wch: 5 });  // សរុប (Total)
      colWidths.push({ wch: 20 }); // ផ្សេងៗ (Remarks)

      ws['!cols'] = colWidths;

      // Apply borders and styling to all cells
      const totalRows = templateData.length;
      const dataEndRow = 11 + dataRows.length; // Last row of actual student data (headers 0-8, info row 9, table headers 10-11, data starts at 12)

      for (let R = 0; R < totalRows; R++) {
        for (let C = 0; C < totalColumns; C++) {
          const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });

          if (!ws[cellAddress]) {
            ws[cellAddress] = { t: 's', v: '' };
          }

          // Row 0: Kingdom - centered, bold
          if (R === 0) {
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
          // Row 1: Nation/Religion/King - centered, bold
          else if (R === 1) {
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
          // Rows 2-4: Dept/Office/School - left-aligned, bold
          else if (R >= 2 && R <= 4) {
            ws[cellAddress].s = {
              alignment: {
                vertical: 'center',
                horizontal: 'left'
              },
              font: {
                name: 'Khmer OS Battambang',
                sz: 11,
                bold: true
              }
            };
          }
          // Rows 5-8: Remaining headers - centered, bold
          else if (R >= 5 && R < 9) {
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
          // Row 9: Info row - left-aligned
          else if (R === 9) {
            ws[cellAddress].s = {
              alignment: {
                vertical: 'center',
                horizontal: 'left'
              },
              font: {
                name: 'Khmer OS Battambang',
                sz: 10
              }
            };
          }
          // Rows 10-11: Table header (two rows) - Gray background, borders, bold
          else if (R === 10 || R === 11) {
            // Check if this is a weekend column
            let isWeekendCol = false;
            if (C >= 4 && C < 4 + daysInMonth) {
              const day = C - 4 + 1;
              const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const dayOfWeekNum = dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1;
              isWeekendCol = isWeekend(dayOfWeekNum);
            }

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
                horizontal: 'center',
                wrapText: true
              },
              font: {
                name: 'Khmer OS Battambang',
                sz: 10,
                bold: true,
                color: isWeekendCol ? { rgb: 'FF0000' } : undefined
              }
            };
          }
          // Data rows (12 to dataEndRow) - Borders, centered except name column
          else if (R >= 12 && R <= dataEndRow) {
            // Check if this is a weekend column
            let isWeekendCol = false;
            if (C >= 4 && C < 4 + daysInMonth) {
              const day = C - 4 + 1;
              const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const dayOfWeekNum = dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1;
              isWeekendCol = isWeekend(dayOfWeekNum);
            }

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
                sz: 10,
                color: isWeekendCol ? { rgb: 'FF0000' } : undefined
              }
            };
          }
          // Footer rows (after dataEndRow) - No borders, left-aligned
          else {
            ws[cellAddress].s = {
              alignment: {
                vertical: 'center',
                horizontal: 'left'
              },
              font: {
                name: 'Khmer OS Battambang',
                sz: 10
              }
            };
          }
        }
      }

      // Merge header cells
      ws['!merges'] = [
        // Row 0: Kingdom - full width
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalColumns - 1 } },
        // Row 1: Nation/Religion/King - no merge (in columns 10, 18, 28)
        // Row 2: Department - full width
        { s: { r: 2, c: 0 }, e: { r: 2, c: totalColumns - 1 } },
        // Row 3: Office - full width
        { s: { r: 3, c: 0 }, e: { r: 3, c: totalColumns - 1 } },
        // Row 4: School - full width
        { s: { r: 4, c: 0 }, e: { r: 4, c: totalColumns - 1 } },
        // Row 5: Attendance Title - full width
        { s: { r: 5, c: 0 }, e: { r: 5, c: totalColumns - 1 } },
        // Row 6: Section Title - full width
        { s: { r: 6, c: 0 }, e: { r: 6, c: totalColumns - 1 } },
        // Row 7: Month - full width
        { s: { r: 7, c: 0 }, e: { r: 7, c: totalColumns - 1 } },
        // Row 8: Empty row - full width
        { s: { r: 8, c: 0 }, e: { r: 8, c: totalColumns - 1 } },
        // Row 9: Info row - no merge (spans naturally)

        // Two-row table header merges (Rows 10-11)
        // Merge first 4 columns vertically (ល.រ, អត្តលេខ, គោត្តនាម និងនាម, ភេទ)
        { s: { r: 10, c: 0 }, e: { r: 11, c: 0 } }, // ល.រ
        { s: { r: 10, c: 1 }, e: { r: 11, c: 1 } }, // អត្តលេខ
        { s: { r: 10, c: 2 }, e: { r: 11, c: 2 } }, // គោត្តនាម និងនាម
        { s: { r: 10, c: 3 }, e: { r: 11, c: 3 } }, // ភេទ
        // Merge "ចំនួនអវត្តមាន" horizontally across 3 summary columns
        { s: { r: 10, c: summaryStartCol }, e: { r: 10, c: summaryStartCol + 2 } }, // ចំនួនអវត្តមាន
        // Merge "សេចក្តីប្រកាស" vertically
        { s: { r: 10, c: summaryStartCol + 3 }, e: { r: 11, c: summaryStartCol + 3 } }, // សេចក្តីប្រកាស
      ];

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
      const filename = `Attendance_${cleanClassName}_${monthName.replace(/\s+/g, '_')}.xlsx`;

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

  // Export to CSV (Google Sheets compatible)
  const handleExportCSV = async () => {
    try {
      let exportData;
      
      if (exportType === 'monthly') {
        // Fetch current month's attendance data
        const monthlyAttendance = await fetchMonthlyAttendanceData();
        ({ exportData } = prepareMonthlyExportData(monthlyAttendance));
      } else {
        ({ exportData } = prepareDailyExportData());
      }

      const dateStr = formatDateToString(effectiveDate);
      const currentDate = new Date(effectiveDate);
      const monthName = formatDateKhmer(currentDate, 'monthYear');

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
      link.setAttribute('download', `Attendance_${cleanClassName}_${monthName.replace(/\s+/g, '_')}.csv`);
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

  return (
    <div className="relative">
      <Button
        onClick={() => setShowExportDropdown(!showExportDropdown)}
        variant="outline"
        size="sm"
        disabled={disabled || students.length === 0}
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
  );
}
