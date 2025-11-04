import { formatDateKhmer } from './formatters';
import { getTimestampedFilename } from './exportUtils';

/**
 * Export teacher attendance data to Excel
 * @param {Array} teachers - Array of teacher objects
 * @param {Object} weekData - Weekly attendance data { userId: { date: { status, reason } } }
 * @param {Object} options - Export options
 * @param {Date} options.weekStartDate - Start date of the week
 * @param {Date} options.weekEndDate - End date of the week
 * @param {string} options.schoolName - School name
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 */
export const exportTeacherAttendanceToExcel = async (teachers, weekData, options = {}) => {
  try {
    const {
      weekStartDate = new Date(),
      weekEndDate,
      schoolName = 'សាលា',
      onSuccess,
      onError
    } = options;

    // Dynamically import xlsx-js-style
    const XLSXStyleModule = await import('xlsx-js-style');
    const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

    // Get week dates
    const weekDates = getWeekDates(weekStartDate);

    // Format date to string (YYYY-MM-DD)
    const formatDateToString = (date) => {
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Build template data
    const templateData = [];

    // Kingdom header (row 0)
    templateData.push(['ព្រះរាជាណាចក្រកម្ពុជា', ...Array(20).fill('')]);

    // Nation/Religion/King (row 1)
    const nationRow = [...Array(21).fill('')];
    nationRow[8] = 'ជាតិ';
    nationRow[14] = 'សាសនា';
    nationRow[19] = 'ព្រះមហាក្សត្រ';
    templateData.push(nationRow);

    // School name (row 2)
    templateData.push([schoolName, ...Array(20).fill('')]);

    // Department (row 3)
    templateData.push(['មន្ទីរអប់រំ យុវជន និងកីឡា', ...Array(20).fill('')]);

    // Office (row 4)
    templateData.push(['ការិយាល័យអប់រំ រដ្ឋបាលក្រុង/ស្រុក/ខណ្ឌ', ...Array(20).fill('')]);

    // Title (row 5)
    templateData.push(['បញ្ជីវត្តមានគ្រូបង្រៀនប្រចាំសប្តាហ៍', ...Array(20).fill('')]);

    // Week range (row 6)
    const weekRange = `ឆ្នាំ ២០${new Date().getFullYear().toString().slice(-2)} ថ្ងៃទី ${weekStartDate.getDate()} ដល់ ${weekDates[6].getDate()} ខែ ${getKhmerMonth(weekStartDate.getMonth())}`;
    templateData.push([weekRange, ...Array(20).fill('')]);

    // Empty row (row 7)
    templateData.push([...Array(21).fill('')]);

    // Header row 1 - Teacher info and days
    const headerRow1 = [...Array(21).fill('')];
    headerRow1[0] = 'ល.រ';
    headerRow1[1] = 'ឈ្មោះគ្រូបង្រៀន';
    for (let i = 0; i < 7; i++) {
      headerRow1[3 + i] = getKhmerDayName(weekDates[i].getDay());
    }
    templateData.push(headerRow1);

    // Header row 2 - Dates
    const headerRow2 = [...Array(21).fill('')];
    headerRow2[0] = '';
    headerRow2[1] = '';
    headerRow2[2] = '';
    for (let i = 0; i < 7; i++) {
      headerRow2[3 + i] = weekDates[i].getDate().toString();
    }
    // Summary columns
    headerRow2[10] = 'វត្តមាន';
    headerRow2[11] = 'អវត្តមាន';
    headerRow2[12] = 'យឺត';
    headerRow2[13] = 'ច្បាប់';
    headerRow2[14] = 'សរុប';
    templateData.push(headerRow2);

    // Teacher data rows
    teachers.forEach((teacher, index) => {
      const row = [...Array(21).fill('')];
      row[0] = index + 1;
      row[1] = teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username || '';
      row[2] = teacher.teacherNumber || '';

      // Attendance status for each day
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let leaveCount = 0;

      for (let i = 0; i < 7; i++) {
        const dateStr = formatDateToString(weekDates[i]);
        const attendance = weekData[teacher.id]?.[dateStr];
        const status = attendance?.status;

        let statusMark = '';
        if (status === 'PRESENT') {
          statusMark = 'វ';
          presentCount++;
        } else if (status === 'ABSENT') {
          statusMark = 'អ';
          absentCount++;
        } else if (status === 'LATE') {
          statusMark = 'យ';
          lateCount++;
        } else if (status === 'LEAVE') {
          statusMark = 'ច';
          leaveCount++;
        } else {
          statusMark = '-';
        }

        row[3 + i] = statusMark;
      }

      // Summary columns
      row[10] = presentCount;
      row[11] = absentCount;
      row[12] = lateCount;
      row[13] = leaveCount;
      row[14] = presentCount + absentCount + lateCount + leaveCount;

      templateData.push(row);
    });

    // Create worksheet
    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Set column widths
    const colWidths = [
      { wch: 5 },   // No.
      { wch: 25 },  // Name
      { wch: 12 },  // Teacher number
      { wch: 4 },   // Day 1
      { wch: 4 },   // Day 2
      { wch: 4 },   // Day 3
      { wch: 4 },   // Day 4
      { wch: 4 },   // Day 5
      { wch: 4 },   // Day 6
      { wch: 4 },   // Day 7
      { wch: 8 },   // Present
      { wch: 8 },   // Absent
      { wch: 6 },   // Late
      { wch: 6 },   // Leave
      { wch: 6 },   // Total
      { wch: 15 },  // Notes
      ...Array(6).fill({ wch: 10 })
    ];

    ws['!cols'] = colWidths;

    // Apply styling
    applyTeacherAttendanceStyling(ws, XLSXStyle, templateData.length);

    // Create workbook and save
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'វត្តមានគ្រូ');

    const dateRange = `${formatDateToString(weekStartDate)}_to_${formatDateToString(weekDates[6])}`;
    const filename = getTimestampedFilename(
      `teacher_attendance_${dateRange}`,
      'xlsx'
    );

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

/**
 * Get array of dates for the week starting from the given date
 */
const getWeekDates = (startDate) => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date);
  }
  return dates;
};

/**
 * Get Khmer day name (0 = Sunday, 1 = Monday, etc.)
 */
const getKhmerDayName = (dayIndex) => {
  const khmerDays = ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
  return khmerDays[dayIndex];
};

/**
 * Get Khmer month name
 */
const getKhmerMonth = (monthIndex) => {
  const khmerMonths = [
    'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
    'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
  ];
  return khmerMonths[monthIndex];
};

/**
 * Apply styling to teacher attendance worksheet
 */
const applyTeacherAttendanceStyling = (ws, XLSXStyle, totalRows) => {
  const totalCols = 21;

  for (let R = 0; R < totalRows; R++) {
    for (let C = 0; C < totalCols; C++) {
      const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });

      if (!ws[cellAddress]) {
        ws[cellAddress] = { t: 's', v: '' };
      }

      const cell = ws[cellAddress];

      // Kingdom header (row 0) - centered, bold, large font
      if (R === 0) {
        cell.s = {
          alignment: { vertical: 'center', horizontal: 'center' },
          font: { name: 'Khmer OS Battambang', sz: 14, bold: true },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }
      // Rows 1-7: Header/info rows
      else if (R >= 1 && R <= 7) {
        cell.s = {
          alignment: { vertical: 'center', horizontal: 'center' },
          font: { name: 'Khmer OS Battambang', sz: 11 },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }
      // Header rows (8-9)
      else if (R === 8 || R === 9) {
        cell.s = {
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          font: { name: 'Khmer OS Battambang', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4472C4' }, patternType: 'solid' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }
      // Data rows (10+)
      else {
        cell.s = {
          alignment: { vertical: 'center', horizontal: 'center' },
          font: { name: 'Khmer OS Battambang', sz: 10 },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };

        // Alternate row colors for better readability
        if (R % 2 === 0) {
          cell.s.fill = { fgColor: { rgb: 'F2F2F2' }, patternType: 'solid' };
        }
      }
    }
  }
};
