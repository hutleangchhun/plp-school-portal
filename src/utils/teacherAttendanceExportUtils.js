import { formatDateKhmer } from './formatters';
import { getTimestampedFilename } from './exportUtils';
import { attendanceService } from './api/services/attendanceService';

/**
 * Export teacher attendance data to Excel with monthly format
 * Similar to student attendance but for teachers
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
    const {
      selectedDate = new Date(),
      schoolName = 'សាលា',
      onSuccess,
      onError
    } = options;

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
    const exportData = teachers.map((teacher, index) => {
      const teacherUserId = Number(teacher.id);
      const row = {
        'ល.រ': index + 1,
        'ឈ្មោះគ្រូបង្រៀន': teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username || '',
      };

      // Add columns for each day of the month (1-31)
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let leaveCount = 0;

      for (let day = 1; day <= 31; day++) {
        if (day <= daysInMonth) {
          const dayDate = new Date(year, month, day);
          const dateStr = formatDateToString(dayDate);
          const attendance = monthlyAttendance[teacherUserId]?.[dateStr];

          let statusMark = '';
          if (attendance?.status === 'PRESENT') {
            statusMark = 'វត្ត';
            presentCount++;
          } else if (attendance?.status === 'ABSENT') {
            statusMark = 'អច្ប';
            absentCount++;
          } else if (attendance?.status === 'LATE') {
            statusMark = 'យឺត';
            lateCount++;
          } else if (attendance?.status === 'LEAVE') {
            statusMark = 'ច្បាប់';
            leaveCount++;
          } else {
            statusMark = '';
          }

          row[day.toString()] = statusMark;
        } else {
          row[day.toString()] = '';
        }
      }

      // Add summary columns with counts
      row['វត្តមាន'] = presentCount;
      row['អច្ប'] = absentCount;
      row['យឺត'] = lateCount;
      row['ច្បាប់'] = leaveCount;
      row['សរុប'] = presentCount + absentCount + lateCount + leaveCount;

      return row;
    });

    // Create template with headers (39 columns total: 2 info + 31 days + 5 summary)
    const emptyRow = Array(39).fill('');

    // Build header rows - similar to student attendance
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
    templateData.push(['បញ្ជីវត្តមានគ្រូបង្រៀន', ...Array(38).fill('')]);

    // Row 6: Month
    templateData.push([`ខែ: ${monthName}`, ...Array(38).fill('')]);

    // Row 7: Empty row
    templateData.push([...emptyRow]);

    // Row 8: Info row
    const infoRow = [...emptyRow];
    infoRow[0] = 'ប្រចាំខែ:............................. ឆ្នាំសិក្សា............................';
    templateData.push(infoRow);

    // Row 9: First header row with category labels
    const headerRow1 = [...emptyRow];
    headerRow1[0] = 'ល.រ';
    headerRow1[1] = 'ឈ្មោះគ្រូបង្រៀន';
    // Days section spans columns 2-32 (31 days)
    headerRow1[33] = 'ចំនួនវត្តមាន'; // Summary columns
    templateData.push(headerRow1);

    // Row 10: Second header row with day numbers
    const headerRow2 = [...emptyRow];
    headerRow2[0] = '';
    headerRow2[1] = '';
    // Day numbers 1-31
    for (let i = 1; i <= 31; i++) {
      headerRow2[1 + i] = i.toString(); // Columns 2-32
    }
    // Summary columns
    headerRow2[33] = 'វត្តមាន';
    headerRow2[34] = 'អច្ប';
    headerRow2[35] = 'យឺត';
    headerRow2[36] = 'ច្បាប់';
    headerRow2[37] = 'សរុប';
    templateData.push(headerRow2);

    // Data rows starting from row 11
    const dataRows = exportData.map(row => {
      const arr = [
        row['ល.រ'],
        row['ឈ្មោះគ្រូបង្រៀន']
      ];

      // Add day columns
      for (let i = 1; i <= 31; i++) {
        arr.push(row[i.toString()] || '');
      }

      // Add summary columns
      arr.push(row['វត្តមាន'], row['អច្ប'], row['យឺត'], row['ច្បាប់'], row['សរុប']);

      while (arr.length < 39) arr.push('');
      return arr;
    });

    templateData.push(...dataRows);

    // Add footer section
    const emptyFooterRow = Array(39).fill('');

    // Empty row for spacing
    templateData.push([...emptyFooterRow]);

    // Summary row
    const summaryRow = [...emptyFooterRow];
    summaryRow[0] = '- ចំនួនគ្រូបង្រៀនសរុប.............................. ចំនួនពេលដែលគ្រូបង្រៀនត្រូវមក..... ចំនួនពេលអវត្តមាន...... គណនាភាគរយៈ  x100  = .............. %';
    templateData.push(summaryRow);

    // Date row - right aligned
    const dateRow = [...emptyFooterRow];
    dateRow[30] = 'ថ្ងៃ........... ខែ ......... ឆ្នាំ...... ព.ស.២៥...........';
    templateData.push(dateRow);

    // Signature labels row
    const signatureRow = [...emptyFooterRow];
    signatureRow[5] = 'បានឃើញ';
    signatureRow[33] = 'នាយកសាលា';
    templateData.push(signatureRow);

    // Empty rows for signatures
    templateData.push([...emptyFooterRow]);
    templateData.push([...emptyFooterRow]);

    // Create worksheet
    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Set column widths - teacher attendance sheet format
    const colWidths = [
      { wch: 5 },  // ល.រ (No.)
      { wch: 25 }, // ឈ្មោះគ្រូបង្រៀន (Name)
    ];

    // Add widths for day columns (1-31)
    for (let i = 1; i <= 31; i++) {
      colWidths.push({ wch: 3 }); // Day columns - narrow
    }

    // Add widths for summary columns
    colWidths.push({ wch: 6 });  // វត្តមាន (Present)
    colWidths.push({ wch: 6 });  // អច្ប (Absent)
    colWidths.push({ wch: 6 });  // យឺត (Late)
    colWidths.push({ wch: 6 });  // ច្បាប់ (Leave)
    colWidths.push({ wch: 6 });  // សរុប (Total)

    ws['!cols'] = colWidths;

    // Apply borders and styling to all cells
    const totalRows = templateData.length;
    const totalCols = 39;
    const dataEndRow = 10 + dataRows.length;

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
        // Rows 5-8: Headers - centered, bold
        else if (R >= 5 && R <= 8) {
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
        // Rows 9-10: Table header - Gray background, borders, bold
        else if (R === 9 || R === 10) {
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
        else if (R >= 11 && R <= dataEndRow) {
          ws[cellAddress].s = {
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            },
            alignment: {
              vertical: 'center',
              horizontal: C === 1 ? 'left' : 'center' // Column B (ឈ្មោះគ្រូបង្រៀន) left-aligned
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
      // Row 6: Month - full width
      { s: { r: 6, c: 0 }, e: { r: 6, c: 38 } },
      // Row 7: Empty - full width
      { s: { r: 7, c: 0 }, e: { r: 7, c: 38 } },
      // Row 8: Info - full width
      { s: { r: 8, c: 0 }, e: { r: 8, c: 38 } },
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
