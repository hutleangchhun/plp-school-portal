import { formatDateKhmer } from './formatters';
import { getTimestampedFilename } from './exportUtils';
import { attendanceService } from './api/services/attendanceService';
import schoolService from './api/services/schoolService';

/**
 * Export teacher attendance data to Excel with monthly format
 * Exactly matching student attendance export format
 * @param {Array} teachers - Array of teacher objects
 * @param {number} schoolId - School ID for fetching attendance data
 * @param {Object} options - Export options
 * @param {Date} options.selectedDate - Date in the month to export (defaults to current date)
 * @param {string} options.schoolName - School name
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 */
export const exportTeacherAttendanceToExcel = async (teachers, schoolId, options = {}) => {
  try {
    let {
      selectedDate = new Date(),
      schoolName = 'សាលា',
      onSuccess,
      onError
    } = options;

    // Fetch school name from API if schoolId is provided and schoolName not set
    if (schoolId && !schoolName) {
      try {
        const schoolResponse = await schoolService.getSchoolInfo(schoolId);
        if (schoolResponse?.data?.name) {
          schoolName = schoolResponse.data.name;
        }
      } catch (err) {
        console.warn('Failed to fetch school name:', err);
        // Continue with default or provided name
      }
    }

    // Use default if still not set
    if (!schoolName) {
      schoolName = 'សាលា';
    }

    // Dynamically import xlsx-js-style
    const XLSXStyleModule = await import('xlsx-js-style');
    const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

    const currentDate = new Date(selectedDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = formatDateKhmer(currentDate, 'monthYear');

    // Format date to string (YYYY-MM-DD)
    const formatDateToString = (date) => {
      if (!date) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    // Fetch monthly teacher attendance data
    let monthlyAttendance = {};
    try {
      const startDate = formatDateToString(new Date(year, month, 1));
      const endDate = formatDateToString(new Date(year, month + 1, 0));

      const attendanceResponse = await attendanceService.getAttendance({
        startDate,
        endDate
      });

      if (attendanceResponse?.success && attendanceResponse?.data) {
        // Transform the fetched data: { userId: { date: { status, reason } } }
        attendanceResponse.data.forEach(record => {
          const userId = record.userId;
          const date = record.date;

          if (!monthlyAttendance[userId]) {
            monthlyAttendance[userId] = {};
          }

          monthlyAttendance[userId][date] = {
            status: record.status,
            reason: record.reason
          };
        });
      }
    } catch (err) {
      console.warn('Failed to fetch monthly teacher attendance:', err);
      // Continue with empty attendance data
    }

    // Prepare export data with all days of month
    // Using same format as student attendance
    const exportData = teachers.map((teacher, index) => {
      const teacherUserId = Number(teacher.id);
      const row = {
        'ល.រ': index + 1,
        'អត្តលេខ': teacher.id || '',
        'ឈ្មោះ': teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username || '',
      };

      // Add columns for each day of the month (1-31)
      // Count only ABSENT and LEAVE like student attendance
      let absentCount = 0;
      let leaveCount = 0;

      for (let day = 1; day <= 31; day++) {
        if (day <= daysInMonth) {
          const dayDate = new Date(year, month, day);
          const dateStr = formatDateToString(dayDate);
          const attendance = monthlyAttendance[teacherUserId]?.[dateStr];

          let statusMark = '';
          if (attendance?.status === 'PRESENT') {
            statusMark = 'វត្ត';
          } else if (attendance?.status === 'ABSENT') {
            statusMark = 'អច្ប';
            absentCount++;
          } else if (attendance?.status === 'LEAVE') {
            statusMark = 'ច្ប';
            leaveCount++;
          } else if (attendance?.status === 'LATE') {
            statusMark = 'អ';
          } else {
            statusMark = '';
          }

          row[day.toString()] = statusMark;
        } else {
          row[day.toString()] = '';
        }
      }

      // Add summary columns with 3 fields only (ABSENT, LEAVE, Total)
      // Matching student attendance export format exactly
      row['អច្ប'] = absentCount;                // ABSENT
      row['ច្ប'] = leaveCount;                  // LEAVE only
      row['សរុប'] = absentCount + leaveCount;  // Total (ABSENT + LEAVE)

      return row;
    });

    // Create template with headers (39 columns total: 4 info + 31 days + 4 summary)
    const emptyRow = Array(39).fill('');

    // Build header rows - exactly matching student attendance format
    const templateData = [];

    // Row 0: Kingdom header
    templateData.push(['ព្រះរាជាណាចក្រកម្ពុជា', ...Array(38).fill('')]);

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
    schoolRow[0] = schoolName;
    templateData.push(schoolRow);

    // Row 5: Attendance Title
    templateData.push(['បញ្ជីវត្តមានគ្រូបង្រៀនប្រចាំខែ', ...Array(38).fill('')]);

    // Row 6: Empty row
    templateData.push([...emptyRow]);

    // Row 7: Month
    templateData.push([`ខែ: ${monthName}`, ...Array(38).fill('')]);

    // Row 8: Empty row
    templateData.push([...emptyRow]);

    // Row 9: Info row with teacher counts
    const infoRow = [...emptyRow];
    infoRow[0] = 'ប្រចាំខែ:............................. ឆ្នាំសិក្សា............................';
    const totalTeachers = teachers.length;
    infoRow[24] = `គ្រូបង្រៀនសរុប: ................${totalTeachers}នាក់`;
    templateData.push(infoRow);

    // Two-row header structure
    // Row 10: First header row with category labels
    const headerRow1 = [...emptyRow];
    headerRow1[0] = 'ល.រ';
    headerRow1[1] = 'អត្តលេខ';
    headerRow1[2] = 'គោត្តនាម និងនាម';
    // Days section spans columns 4-34 (31 days)
    // Leave empty for now, will be merged
    headerRow1[35] = 'ចំនួនអវត្តមាន'; // Spans columns 35-37
    headerRow1[38] = 'សេចក្តីប្រកាស';
    templateData.push(headerRow1);

    // Row 11: Second header row with day numbers
    const headerRow2 = [...emptyRow];
    // First 3 columns are merged with row above, leave empty
    headerRow2[0] = '';
    headerRow2[1] = '';
    headerRow2[2] = '';
    // Day numbers 1-31
    for (let i = 1; i <= 31; i++) {
      headerRow2[2 + i] = i.toString(); // Columns 3-33
    }
    // Summary columns with Khmer labels (3 fields only: ABSENT, LEAVE, TOTAL)
    headerRow2[35] = 'អច្ប';    // ABSENT
    headerRow2[36] = 'ច្ប';     // LEAVE
    headerRow2[37] = 'សរុប';    // TOTAL
    headerRow2[38] = '';
    templateData.push(headerRow2);

    // Data rows starting from row 12
    const dataRows = exportData.map(row => {
      const arr = [
        row['ល.រ'],
        row['អត្តលេខ'],
        row['ឈ្មោះ'],
      ];

      // Add day columns
      for (let i = 1; i <= 31; i++) {
        arr.push(row[i.toString()] || '');
      }

      // Add summary columns
      arr.push(row['អច្ប'], row['ច្ប'], row['សរុប'], '');

      while (arr.length < 39) arr.push('');
      return arr;
    });

    templateData.push(...dataRows);

    // Create worksheet
    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Set column widths - matching student attendance format
    const colWidths = [
      { wch: 5 },  // ល.រ (No.)
      { wch: 10 }, // អត្តលេខ (ID)
      { wch: 25 }, // ឈ្មោះ (Name)
    ];

    // Add widths for day columns (1-31)
    for (let i = 1; i <= 31; i++) {
      colWidths.push({ wch: 3 }); // Day columns - narrow
    }

    // Add widths for summary columns
    colWidths.push({ wch: 6 });  // អច្ប (Absent)
    colWidths.push({ wch: 6 });  // ច្ប (Leave)
    colWidths.push({ wch: 6 });  // សរុប (Total)
    colWidths.push({ wch: 2 });  // Empty

    ws['!cols'] = colWidths;

    // Apply borders and styling to all cells
    const totalRows = templateData.length;
    const totalCols = 39;
    const dataEndRow = 11 + dataRows.length;

    for (let R = 0; R < totalRows; R++) {
      for (let C = 0; C < totalCols; C++) {
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
        // Rows 1-4: Department/Office/School - left-aligned, bold
        else if (R >= 1 && R <= 4) {
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
        // Rows 5-9: Headers - centered, bold
        else if (R >= 5 && R <= 9) {
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
        // Rows 10-11: Table header - Gray background, borders, bold
        else if (R === 10 || R === 11) {
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
        // Data rows - Borders, centered except name column
        else if (R >= 12 && R <= dataEndRow) {
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
        // Footer rows - No borders, left-aligned
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
      { s: { r: 0, c: 0 }, e: { r: 0, c: 38 } },
      // Row 2: Department - full width
      { s: { r: 2, c: 0 }, e: { r: 2, c: 38 } },
      // Row 3: Office - full width
      { s: { r: 3, c: 0 }, e: { r: 3, c: 38 } },
      // Row 4: School - full width
      { s: { r: 4, c: 0 }, e: { r: 4, c: 38 } },
      // Row 5: Title - full width
      { s: { r: 5, c: 0 }, e: { r: 5, c: 38 } },
      // Row 7: Month - full width
      { s: { r: 7, c: 0 }, e: { r: 7, c: 38 } },
      // Row 9: Info - full width
      { s: { r: 9, c: 0 }, e: { r: 9, c: 38 } },
      // Header row 1 - merge first 3 columns
      { s: { r: 10, c: 0 }, e: { r: 11, c: 2 } },
      // Header row 1 - merge day columns
      { s: { r: 10, c: 3 }, e: { r: 10, c: 33 } },
      // Header row 1 - merge summary columns
      { s: { r: 10, c: 35 }, e: { r: 10, c: 37 } },
    ];

    // Create workbook
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'វត្តមានគ្រូ');

    // Set workbook properties
    wb.Props = {
      Title: `បញ្ជីវត្តមានគ្រូបង្រៀន - ${monthName}`,
      Subject: 'វត្តមានគ្រូបង្រៀន',
      Author: 'Teacher Portal',
      CreatedDate: new Date()
    };

    // Generate filename
    const monthStr = String(month + 1).padStart(2, '0');
    const filename = getTimestampedFilename(
      `teacher_attendance_${year}-${monthStr}`,
      'xlsx'
    );

    // Export file
    XLSXStyle.writeFile(wb, filename);

    if (onSuccess) {
      onSuccess();
    }

    return { success: true, filename };
  } catch (error) {
    console.error('Teacher attendance export error:', error);
    if (onError) {
      onError(error);
    }
    return { success: false, error };
  }
};
