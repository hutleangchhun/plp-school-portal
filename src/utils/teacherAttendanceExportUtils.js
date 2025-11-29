import { formatDateKhmer, getMonthCalendarLayout, getKhmerDayShorthand, getKhmerDayWithShorthand, isWeekend } from './formatters';
import { getTimestampedFilename } from './exportUtils';
import { attendanceService } from './api/services/attendanceService';
import schoolService from './api/services/schoolService';
import { getFullName } from './usernameUtils';

/**
 * Export teacher attendance data to Excel with monthly calendar format
 * Exactly matching student attendance export format with calendar layout
 * @param {Array} teachers - Array of teacher objects
 * @param {number} schoolId - School ID for fetching attendance data
 * @param {Object} options - Export options
 * @param {Date} options.selectedDate - Date in the month to export (defaults to current date)
 * @param {string} options.schoolName - School name
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 */
export const exportTeacherAttendanceToExcel = async (teachers, schoolId, options = {}) => {
  let {
    selectedDate = new Date(),
    schoolName = 'សាលា',
    onSuccess,
    onError
  } = options;

  try {

    // Fetch school name from API if schoolId is provided and schoolName not set
    if (schoolId && !schoolName) {
      try {
        const schoolResponse = await schoolService.getSchoolInfo(schoolId);
        if (schoolResponse?.data?.name) {
          schoolName = schoolResponse.data.name;
        }
      } catch (err) {
        console.warn('Failed to fetch school name:', err);
      }
    }

    if (!schoolName) {
      schoolName = 'សាលា';
    }

    // Dynamically import xlsx-js-style
    const XLSXStyleModule = await import('xlsx-js-style');
    const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

    const currentDate = new Date(selectedDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = formatDateKhmer(currentDate, 'monthYear');

    // Get calendar layout but only use actual days (no blank cells for days outside month)
    // This eliminates the extra blank columns that appear before the month starts
    const daysInMonth = new Date(year, month + 1, 0).getDate();

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
    }

    // Prepare export data with calendar layout
    const exportData = teachers.map((teacher, index) => {
      const teacherUserId = Number(teacher.id);
      const row = {
        'ល.រ': index + 1,
        'អត្តលេខ': teacher.id || '',
        'ឈ្មោះ': getFullName(teacher, teacher.username || ''),
      };

      let absentCount = 0;
      let leaveCount = 0;

      // Add data for each actual day of month
      for (let day = 1; day <= daysInMonth; day++) {
        // Calculate day of week for this day
        const dayDate = new Date(year, month, day);
        const dayOfWeekNum = dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1; // 0 = Monday, 6 = Sunday
        const dateStr = formatDateToString(dayDate);
        const attendance = monthlyAttendance[teacherUserId]?.[dateStr];

        let statusMark = '';
        if (attendance?.status === 'PRESENT') {
          statusMark = '';
        } else if (attendance?.status === 'ABSENT') {
          statusMark = 'អច្ប';
          absentCount++;
        } else if (attendance?.status === 'LEAVE') {
          statusMark = 'ច្ប';
          leaveCount++;
        } else if (attendance?.status === 'LATE') {
          statusMark = '';
        }

        row[`cell_${day}`] = {
          value: statusMark,
          dayNum: day,
          dayOfWeek: dayOfWeekNum
        };
      }

      // Summary columns
      row['អច្ប'] = absentCount;
      row['ច្ប'] = leaveCount;
      row['សរុប'] = absentCount + leaveCount;

      return row;
    });

    // Total columns: 3 info + actual days + 4 summary
    const totalColumns = 3 + daysInMonth + 4;
    const emptyRow = Array(totalColumns).fill('');

    // Build template data
    const templateData = [];

    // Row 0: Kingdom header
    templateData.push(['ព្រះរាជាណាចក្រកម្ពុជា', ...Array(totalColumns - 1).fill('')]);

    // Row 1: Nation/Religion/King
    const nationRow = [...emptyRow];
    nationRow[10] = 'ជាតិ';
    nationRow[18] = 'សាសនា';
    nationRow[28] = 'ព្រះមហាក្សត្រ';
    templateData.push(nationRow);

    // Row 2: Department
    const deptRow = [...emptyRow];
    deptRow[0] = 'មន្ទីរអប់រំ យុវជន និងកីឡា រាជធានី/ខេត្ត............';
    templateData.push(deptRow);

    // Row 3: Office
    const officeRow = [...emptyRow];
    officeRow[0] = 'ការិយាល័យអប់រំ យុវជន និងកីឡារដ្ឋបាលក្រុង/ស្រុក/ខណ្ឌ.......................................';
    templateData.push(officeRow);

    // Row 4: School
    const schoolRow = [...emptyRow];
    schoolRow[0] = schoolName;
    templateData.push(schoolRow);

    // Row 5: Title
    templateData.push(['បញ្ជីអវត្តមានគ្រូបង្រៀនប្រចាំខែ', ...Array(totalColumns - 1).fill('')]);

    // Row 6: Empty
    templateData.push([...emptyRow]);

    // Row 7: Month
    templateData.push([`ខែ: ${monthName}`, ...Array(totalColumns - 1).fill('')]);

    // Row 8: Empty
    templateData.push([...emptyRow]);

    // Row 9: Info
    const infoRow = [...emptyRow];
    infoRow[0] = 'ប្រចាំខែ:............................. ឆ្នាំសិក្សា............................';
    const totalTeachers = teachers.length;
    infoRow[24] = `គ្រូបង្រៀនសរុប: ................${totalTeachers}នាក់`;
    templateData.push(infoRow);

    // Row 10: First header row with day names
    const summaryStartCol = 3 + daysInMonth;
    const headerRow1 = [...emptyRow];
    headerRow1[0] = 'ល.រ';
    headerRow1[1] = 'អត្តលេខ';
    headerRow1[2] = 'គោត្តនាម និងនាម';

    // Add Khmer day names in header row 1
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const dayOfWeekNum = dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1;
      headerRow1[3 + day - 1] = getKhmerDayShorthand(dayOfWeekNum);
    }

    headerRow1[summaryStartCol] = 'ចំនួនអវត្តមាន';
    headerRow1[summaryStartCol + 3] = 'សេចក្តីផ្សេងៗ';
    templateData.push(headerRow1);

    // Row 11: Second header row with day numbers
    const headerRow2 = [...emptyRow];
    headerRow2[0] = '';
    headerRow2[1] = '';
    headerRow2[2] = '';

    for (let day = 1; day <= daysInMonth; day++) {
      headerRow2[3 + day - 1] = day.toString();
    }

    headerRow2[summaryStartCol] = 'អច្ប';
    headerRow2[summaryStartCol + 1] = 'ច្ប';
    headerRow2[summaryStartCol + 2] = 'សរុប';
    headerRow2[summaryStartCol + 3] = '';
    templateData.push(headerRow2);

    // Data rows
    const dataRows = exportData.map(row => {
      const arr = [
        row['ល.រ'],
        row['អត្តលេខ'],
        row['ឈ្មោះ'],
      ];

      // Add day columns
      for (let day = 1; day <= daysInMonth; day++) {
        const cellData = row[`cell_${day}`];
        arr.push(cellData?.value || '');
      }

      // Add summary
      arr.push(row['អច្ប'], row['ច្ប'], row['សរុប'], '');

      while (arr.length < totalColumns) arr.push('');
      return arr;
    });

    templateData.push(...dataRows);

    // Footer section
    const emptyFooterRow = Array(totalColumns).fill('');

    templateData.push([...emptyFooterRow]);

    const summaryRow1 = [...emptyFooterRow];
    summaryRow1[0] = `- ចំនួនគ្រូបង្រៀនក្នុងបញ្ជី..${totalTeachers}..នាក់ ចំនួនពេលដែលគ្រូបង្រៀនត្រូវមក..... ចំនួនពេលអវត្តមាន...... ចំនួនពេលដែលគ្រូបង្រៀនមករៀនពិតប្រាកដ........... គណនាភាគរយៈ  x100  = .............. %`;
    templateData.push(summaryRow1);

    const summaryRow2 = [...emptyFooterRow];
    summaryRow2[0] = '- បញ្ឈប់បញ្ជីក្នុងខែនេះនូវចំនួន..........ពេល';
    templateData.push(summaryRow2);

    const dateRow1 = [...emptyFooterRow];
    dateRow1[30] = 'ថ្ងៃ........... ខែ ......... ឆ្នាំ...... ព.ស.២៥...........';
    templateData.push(dateRow1);

    const dateRow2 = [...emptyFooterRow];
    dateRow2[30] = 'ធ្វើនៅ.........................ថ្ងៃទី.......... ខែ............. ឆ្នាំ២០.......';
    templateData.push(dateRow2);

    templateData.push([...emptyFooterRow]);

    const signatureRow = [...emptyFooterRow];
    signatureRow[5] = 'បានឃើញ';
    signatureRow[33] = 'នាយកសាលា';
    templateData.push(signatureRow);

    templateData.push([...emptyFooterRow]);
    templateData.push([...emptyFooterRow]);

    // Create worksheet
    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Set column widths
    const colWidths = [
      { wch: 5 },  // ល.រ
      { wch: 12 }, // អត្តលេខ
      { wch: 25 }, // ឈ្មោះ
    ];

    for (let i = 0; i < daysInMonth; i++) {
      colWidths.push({ wch: 3 }); // Calendar cells with day name + number
    }

    colWidths.push({ wch: 5 });  // អច្ប
    colWidths.push({ wch: 5 });  // ច្ប
    colWidths.push({ wch: 5 });  // សរុប
    colWidths.push({ wch: 20 }); // សេចក្តីប្រកាស

    ws['!cols'] = colWidths;

    // Apply styling
    const totalRows = templateData.length;
    const dataStartRow = 12; // Data starts after headers (row 10-11)
    const dataEndRow = dataStartRow + dataRows.length - 1;

    for (let R = 0; R < totalRows; R++) {
      for (let C = 0; C < totalColumns; C++) {
        const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });

        if (!ws[cellAddress]) {
          ws[cellAddress] = { t: 's', v: '' };
        }

        // Header rows styling
        if (R === 0) {
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'center' },
            font: { name: 'Khmer OS Battambang', sz: 11, bold: true }
          };
        } else if (R === 1) {
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'center' },
            font: { name: 'Khmer OS Battambang', sz: 11, bold: true }
          };
        } else if (R >= 2 && R <= 4) {
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'left' },
            font: { name: 'Khmer OS Battambang', sz: 11, bold: true }
          };
        } else if (R >= 5 && R < 10) {
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'center' },
            font: { name: 'Khmer OS Battambang', sz: 11, bold: true }
          };
        } else if (R === 10 || R === 11) {
          // Table headers - check if this is a weekend column
          let isWeekendCol = false;
          if (C >= 3 && C < 3 + daysInMonth) {
            const day = C - 3 + 1;
            const dayDate = new Date(year, month, day);
            const dayOfWeekNum = dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1;
            isWeekendCol = isWeekend(dayOfWeekNum);
          }

          ws[cellAddress].s = {
            fill: { fgColor: { rgb: 'E0E0E0' } },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            },
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            font: {
              name: 'Khmer OS Battambang',
              sz: 10,
              bold: true,
              color: isWeekendCol ? { rgb: 'FF0000' } : undefined
            }
          };
        } else if (R >= dataStartRow && R <= dataEndRow) {
          // Data rows - check if weekend column
          let isWeekendCol = false;
          if (C >= 3 && C < 3 + daysInMonth) {
            const day = C - 3 + 1;
            const dayDate = new Date(year, month, day);
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
              horizontal: C === 2 ? 'left' : 'center'
            },
            font: {
              name: 'Khmer OS Battambang',
              sz: 10,
              color: isWeekendCol ? { rgb: 'FF0000' } : undefined
            }
          };
        } else {
          // Footer
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'left' },
            font: { name: 'Khmer OS Battambang', sz: 10 }
          };
        }
      }
    }

    // Merge cells
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalColumns - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalColumns - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: totalColumns - 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: totalColumns - 1 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: totalColumns - 1 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: totalColumns - 1 } },
      { s: { r: 9, c: 0 }, e: { r: 9, c: totalColumns - 1 } },
      { s: { r: 10, c: 0 }, e: { r: 11, c: 0 } },
      { s: { r: 10, c: 1 }, e: { r: 11, c: 1 } },
      { s: { r: 10, c: 2 }, e: { r: 11, c: 2 } },
      { s: { r: 10, c: summaryStartCol }, e: { r: 10, c: summaryStartCol + 2 } },
      { s: { r: 10, c: summaryStartCol + 3 }, e: { r: 11, c: summaryStartCol + 3 } },
    ];

    // Create workbook
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'វត្តមានគ្រូ');

    wb.Props = {
      Title: `បញ្ជីអវត្តមានគ្រូបង្រៀន - ${monthName}`,
      Subject: 'អវត្តមានគ្រូបង្រៀន',
      Author: 'Teacher Portal',
      CreatedDate: new Date()
    };

    const monthStr = String(month + 1).padStart(2, '0');
    const filename = getTimestampedFilename(
      `បញ្ជីអវត្តមាន_${year}-${monthStr}`,
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
