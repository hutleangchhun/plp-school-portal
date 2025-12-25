/**
 * Report 4: Student Absence Report Export Utility
 * Exports student absence data in calendar format (like attendance export)
 */

import { formatDateKhmer, getKhmerDayShorthand, isWeekend } from './formatters';
import { formatClassIdentifier } from './helpers';

/**
 * Export Report 4 (Absence Report) to Excel with calendar format
 * Supports monthly, semester, and yearly reports
 * 
 * API LIMIT RECOMMENDATIONS (for ~60 students per class):
 * - Monthly: limit = 100-200 (60 students × ~30 days = ~1,800 records max)
 * - Semester: limit = 500-1000 (60 students × ~180 days = ~10,800 records max)
 * - Yearly: limit = 1000-2000 (60 students × ~365 days = ~21,900 records max)
 * 
 * @param {Array} studentsWithAttendance - Array of students with their attendance records
 * @param {Object} options - Export options
 * @param {string} options.schoolName - School name
 * @param {string} options.className - Class name
 * @param {Date} options.selectedDate - Selected date for the report
 * @param {string} options.period - Period type: 'month', 'semester', or 'year'
 * @param {string} options.periodName - Period name (month, semester, year)
 * @param {string} options.monthName - Month name if period is month
 * @param {string} options.selectedYear - Selected year
 * @param {Date} options.startDate - Start date of the period
 * @param {Date} options.endDate - End date of the period
 */
export const exportReport4ToExcel = async (studentsWithAttendance, options = {}) => {
  const {
    schoolName = 'សាលា',
    className = 'Unknown Class',
    selectedDate = new Date(),
    period = 'month',
    periodName = '',
    monthName = '',
    selectedYear = new Date().getFullYear().toString(),
    startDate = null,
    endDate = null
  } = options;

  console.log('📊 exportReport4ToExcel - Received className:', className);
  console.log('📊 exportReport4ToExcel - Options:', options);

  try {
    // Dynamically import xlsx-js-style
    const XLSXStyleModule = await import('xlsx-js-style');
    const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

    const currentDate = new Date(selectedDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Determine period-specific settings
    let periodTitle = '';
    let periodSubtitle = '';
    let daysToShow = [];
    
    if (period === 'month') {
      // Monthly report - show all days in the month
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      periodTitle = 'បញ្ជីអវត្តមានសិស្សប្រចាំខែ';
      periodSubtitle = `ខែ: ${formatDateKhmer(currentDate, 'monthYear')}`;
      
      for (let day = 1; day <= daysInMonth; day++) {
        daysToShow.push(new Date(year, month, day));
      }
    } else if (period === 'semester') {
      // Semester report - show summary by month (6 months)
      periodTitle = 'បញ្ជីអវត្តមានសិស្សប្រចាំឆមាស';
      periodSubtitle = `ឆមាស: ${periodName} ${selectedYear}`;
      
      // For semester, we'll show monthly summaries instead of daily
      // This is more practical for 6 months of data
      const semesterStart = startDate ? new Date(startDate) : new Date(year, 0, 1);
      const semesterEnd = endDate ? new Date(endDate) : new Date(year, 5, 30);
      
      // Create monthly buckets
      const startMonth = semesterStart.getMonth();
      const endMonth = semesterEnd.getMonth();
      for (let m = startMonth; m <= endMonth; m++) {
        daysToShow.push({ month: m, year: year, isSummary: true });
      }
    } else {
      // Yearly report - show summary by month (12 months)
      periodTitle = 'បញ្ជីអវត្តមានសិស្សប្រចាំឆ្នាំ';
      periodSubtitle = `ឆ្នាំ: ${selectedYear}`;
      
      // For yearly, show monthly summaries
      for (let m = 0; m < 12; m++) {
        daysToShow.push({ month: m, year: year, isSummary: true });
      }
    }

    // Generate filename suffix based on period
    let monthYearName = '';
    if (period === 'month') {
      monthYearName = formatDateKhmer(currentDate, 'monthYear');
    } else if (period === 'semester') {
      monthYearName = `${periodName}_${selectedYear}`;
    } else {
      monthYearName = selectedYear;
    }

    // Format date to string (YYYY-MM-DD)
    const formatDateToString = (date) => {
      if (!date) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    // Transform attendance data to calendar format
    const exportData = studentsWithAttendance.map((student, index) => {
      const row = {
        'ល.រ': index + 1,
        'អត្តលេខ': student.studentId || student.id || '',
        'ឈ្មោះ': student.khmerName || `${student.lastName || ''} ${student.firstName || ''}`.trim() || '',
        'ភេទ': student.gender === 'MALE' ? 'ប' : student.gender === 'FEMALE' ? 'ស' : '',
      };

      let absentCount = 0;
      let leaveCount = 0;

      // Create attendance map for quick lookup
      const attendanceMap = {};
      const monthlyStats = {}; // For semester/yearly summaries
      
      if (student.attendances && Array.isArray(student.attendances)) {
        student.attendances.forEach(record => {
          const dateStr = record.date ? record.date.split('T')[0] : null;
          if (dateStr) {
            attendanceMap[dateStr] = {
              status: record.status,
              reason: record.reason
            };
            
            // Track monthly stats for semester/yearly reports
            if (period !== 'month') {
              const recordDate = new Date(dateStr);
              const monthKey = `${recordDate.getFullYear()}-${recordDate.getMonth()}`;
              
              if (!monthlyStats[monthKey]) {
                monthlyStats[monthKey] = { absent: 0, leave: 0 };
              }
              
              if (record.status === 'ABSENT') monthlyStats[monthKey].absent++;
              if (record.status === 'LEAVE') monthlyStats[monthKey].leave++;
            }
          }
        });
      }

      // Add columns based on period type
      if (period === 'month') {
        // Daily view for monthly reports
        for (let day = 1; day <= 31; day++) {
          if (day <= daysToShow.length) {
            const dayDate = daysToShow[day - 1];
            const dateStr = formatDateToString(dayDate);
            const attendance = attendanceMap[dateStr];

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

            row[day.toString()] = statusMark;
          } else {
            row[day.toString()] = '';
          }
        }
      } else {
        // Monthly summary view for semester/yearly reports
        daysToShow.forEach((monthInfo, index) => {
          const monthKey = `${monthInfo.year}-${monthInfo.month}`;
          const stats = monthlyStats[monthKey] || { absent: 0, leave: 0 };
          
          absentCount += stats.absent;
          leaveCount += stats.leave;
          
          // Show count in cell (e.g., "2" for 2 absences)
          const totalForMonth = stats.absent + stats.leave;
          row[`month_${index + 1}`] = totalForMonth > 0 ? totalForMonth.toString() : '';
        });
      }

      // Add summary columns (leave blank if zero)
      row['អច្ប'] = absentCount > 0 ? absentCount : '';
      row['ច្ប'] = leaveCount > 0 ? leaveCount : '';
      row['សរុប'] = (absentCount + leaveCount) > 0 ? (absentCount + leaveCount) : '';

      return row;
    });

    // Calculate student counts
    const totalStudents = studentsWithAttendance.length;
    const femaleStudents = studentsWithAttendance.filter(s => s.gender === 'FEMALE').length;
    const maleStudents = totalStudents - femaleStudents;

    // Total columns: 4 info + period columns + 4 summary
    const numPeriodColumns = daysToShow.length;
    const totalColumns = 4 + numPeriodColumns + 4;
    const emptyRow = Array(totalColumns).fill('');
    
    // Month names in Khmer for semester/yearly reports
    const khmerMonths = [
      'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
      'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
    ];

    // Build template data
    const templateData = [];

    // Row 0: Kingdom header
    templateData.push(['ព្រះរាជាណាចក្រកម្ពុជា', ...Array(totalColumns - 1).fill('')]);

    // Row 1: Nation/Religion/King (merged and centered like Kingdom header)
    templateData.push(['ជាតិ     សាសនា     ព្រះមហាក្សត្រ', ...Array(totalColumns - 1).fill('')]);

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
    templateData.push([periodTitle, ...Array(totalColumns - 1).fill('')]);

    // Row 6: Section with class name only
    const sectionTitle = `ផ្នែកអវត្តមានប្រចាំខែ - ${className}`;
    templateData.push([sectionTitle, ...Array(totalColumns - 1).fill('')]);

    // Row 7: Period subtitle
    templateData.push([periodSubtitle, ...Array(totalColumns - 1).fill('')]);

    // Row 8: Empty
    templateData.push([...emptyRow]);

    // Row 9: Info row with student counts
    const infoRow = [...emptyRow];
    infoRow[0] =`សិស្សសរុប: ................${totalStudents}នាក់  ប្រុស...............${maleStudents}នាក់ ស្រី.................${femaleStudents}នាក់`;
    const infoRowIndex = 9;
    // Only add info row for monthly reports
    if (period === 'month') {
      templateData.push(infoRow);
    } else {
      templateData.push([...emptyRow]);
    }

    // Row 10: First header row
    const summaryStartCol = 4 + numPeriodColumns;
    const headerRow1 = [...emptyRow];
    headerRow1[0] = 'ល.រ';
    headerRow1[1] = 'អត្តលេខ';
    headerRow1[2] = 'គោត្តនាម និងនាម';
    headerRow1[3] = 'ភេទ';

    if (period === 'month') {
      // Add Khmer day names for each day of month
      for (let i = 0; i < daysToShow.length; i++) {
        const dayDate = daysToShow[i];
        const dayOfWeekNum = dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1;
        headerRow1[4 + i] = getKhmerDayShorthand(dayOfWeekNum);
      }
    } else {
      // For semester/yearly, show month names
      daysToShow.forEach((monthInfo, index) => {
        headerRow1[4 + index] = khmerMonths[monthInfo.month];
      });
    }

    headerRow1[summaryStartCol] = 'ចំនួនអវត្តមាន';
    headerRow1[summaryStartCol + 3] = 'សេចក្តីផ្សេងៗ';
    templateData.push(headerRow1);

    // Row 11: Second header row
    const headerRow2 = [...emptyRow];
    headerRow2[0] = '';
    headerRow2[1] = '';
    headerRow2[2] = '';
    headerRow2[3] = '';

    if (period === 'month') {
      // Show day numbers for monthly report
      for (let i = 1; i <= daysToShow.length; i++) {
        headerRow2[3 + i] = i.toString();
      }
    } else {
      // For semester/yearly, leave empty or show year
      daysToShow.forEach((monthInfo, index) => {
        headerRow2[4 + index] = ''; // Could show year if needed
      });
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
        row['ភេទ']
      ];

      // Add period columns (days or months)
      if (period === 'month') {
        for (let i = 1; i <= daysToShow.length; i++) {
          arr.push(row[i.toString()] || '');
        }
      } else {
        for (let i = 1; i <= daysToShow.length; i++) {
          arr.push(row[`month_${i}`] || '');
        }
      }

      // Add summary columns
      arr.push(row['អច្ប'], row['ច្ប'], row['សរុប'], '');

      while (arr.length < totalColumns) arr.push('');
      return arr;
    });

    templateData.push(...dataRows);

    // Footer section
    const emptyFooterRow = Array(totalColumns).fill('');
    templateData.push([...emptyFooterRow]);

    // Track footer row numbers for merging
    const footerStartRow = templateData.length;

    const summaryRow1 = [...emptyFooterRow];
    summaryRow1[0] = `ចំនួនសិស្សក្នុងបញ្ជី..${totalStudents}..នាក់ ប្រុស..${maleStudents}..នាក់ ស្រី..${femaleStudents}..នាក់ ចំនួនពេលដែលសិស្សត្រូវមករៀន..... ចំនួនពេលអវត្តមាន...... ចំនួនពេលដែលសិស្សមករៀនពិតប្រាកដ........... គណនាភាគរយៈ x100 = .............. %`;
    templateData.push(summaryRow1);
    const summaryRow1Index = footerStartRow;

    const summaryRow2 = [...emptyFooterRow];
    summaryRow2[0] = `បញ្ឈប់បញ្ជីក្នុងខែនេះនូវចំនួន..........ពេល`;
    templateData.push(summaryRow2);
    const summaryRow2Index = footerStartRow + 1;

    const dateRow1 = [...emptyFooterRow];
    dateRow1[30] = 'ថ្ងៃ........... ខែ ......... ឆ្នាំ...... ព.ស.២៥...........';
    templateData.push(dateRow1);
    const dateRow1Index = footerStartRow + 2;

    const dateRow2 = [...emptyFooterRow];
    dateRow2[30] = 'ធ្វើនៅ.........................ថ្ងៃទី.......... ខែ............. ឆ្នាំ២០.......';
    templateData.push(dateRow2);
    const dateRow2Index = footerStartRow + 3;

    templateData.push([...emptyFooterRow]);
    const emptyRowAfterDatesIndex = footerStartRow + 4;

    // Signature label row: បានឃើញ on left and right (same row)
    const signatureLabelRow = [...emptyFooterRow];
    signatureLabelRow[2] = 'បានឃើញ';
    signatureLabelRow[31] = 'បានឃើញ';
    templateData.push(signatureLabelRow);
    const signatureLabelRowIndex = footerStartRow + 5;

    // Signature role row: នាយកសាលា on left and គ្រូប្រចាំថ្នាក់ on right (same row)
    const signatureRoleRow = [...emptyFooterRow];
    signatureRoleRow[2] = 'នាយកសាលា';
    signatureRoleRow[31] = 'គ្រូប្រចាំថ្នាក់';
    templateData.push(signatureRoleRow);
    const signatureRoleRowIndex = footerStartRow + 6;

    templateData.push([...emptyFooterRow]);
    templateData.push([...emptyFooterRow]);

    // Create worksheet
    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Set column widths
    const colWidths = [
      { wch: 5 },  // ល.រ
      { wch: 12 }, // អត្តលេខ
      { wch: 25 }, // ឈ្មោះ
      { wch: 5 },  // ភេទ
    ];

    // Add widths for period columns
    const columnWidth = period === 'month' ? 3 : 6; // Wider for month names
    for (let i = 0; i < numPeriodColumns; i++) {
      colWidths.push({ wch: columnWidth });
    }

    colWidths.push({ wch: 5 });  // អច្ប
    colWidths.push({ wch: 5 });  // ច្ប
    colWidths.push({ wch: 5 });  // សរុប
    colWidths.push({ wch: 20 }); // ផ្សេងៗ

    ws['!cols'] = colWidths;

    // Set row heights for better spacing
    const rowHeights = [];
    for (let i = 0; i < templateData.length; i++) {
      if (i >= summaryRow1Index && i <= summaryRow2Index) {
        // Moderate height for summary rows
        rowHeights.push({ hpt: 25 });
      } else if (i === dateRow1Index || i === dateRow2Index) {
        // Height for date rows
        rowHeights.push({ hpt: 20 });
      } else {
        // Default height for all other rows including signature rows
        rowHeights.push({ hpt: 15 });
      }
    }
    ws['!rows'] = rowHeights;

    // Apply styling
    const totalRows = templateData.length;
    const dataEndRow = 11 + dataRows.length;

    for (let R = 0; R < totalRows; R++) {
      for (let C = 0; C < totalColumns; C++) {
        const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });

        if (!ws[cellAddress]) {
          ws[cellAddress] = { t: 's', v: '' };
        }

        // Apply styling based on row type
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
        } else if (R >= 5 && R < 9) {
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'center' },
            font: { name: 'Khmer OS Battambang', sz: 11, bold: true }
          };
        } else if (R === 9) {
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
            font: { name: 'Khmer OS Battambang', sz: 10, bold: true }
          };
        } else if (R === 10 || R === 11) {
          // Check if weekend column (only for monthly reports)
          let isWeekendCol = false;
          if (period === 'month' && C >= 4 && C < 4 + numPeriodColumns) {
            const dayIndex = C - 4;
            if (dayIndex < daysToShow.length) {
              const dayDate = daysToShow[dayIndex];
              const dayOfWeekNum = dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1;
              isWeekendCol = isWeekend(dayOfWeekNum);
            }
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
        } else if (R >= 12 && R <= dataEndRow) {
          // Check if weekend column (only for monthly reports)
          let isWeekendCol = false;
          if (period === 'month' && C >= 4 && C < 4 + numPeriodColumns) {
            const dayIndex = C - 4;
            if (dayIndex < daysToShow.length) {
              const dayDate = daysToShow[dayIndex];
              const dayOfWeekNum = dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1;
              isWeekendCol = isWeekend(dayOfWeekNum);
            }
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
        } else if (R === signatureLabelRowIndex || R === signatureRoleRowIndex) {
          // Signature rows: align to start (left) - must be before general footer styling
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
            font: { name: 'Khmer OS', sz: 10 }
          };
        } else if (R === dateRow1Index || R === dateRow2Index) {
          // Date rows: center aligned
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            font: { name: 'Khmer OS', sz: 10 }
          };
        } else if (R === summaryRow1Index || R === summaryRow2Index) {
          // Summary rows: align to start (left)
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
            font: { name: 'Khmer OS', sz: 10 }
          };
        } else if (R >= summaryRow1Index && R <= signatureRoleRowIndex) {
          // Footer rows styling with proper Khmer font support (center aligned)
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            font: { name: 'Khmer OS', sz: 10 }
          };
        } else {
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'left' },
            font: { name: 'Khmer OS Battambang', sz: 10 }
          };
        }
      }
    }

    // Merge cells
    ws['!merges'] = [
      // Header section merges
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalColumns - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalColumns - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalColumns - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: totalColumns - 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: totalColumns - 1 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: totalColumns - 1 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: totalColumns - 1 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: totalColumns - 1 } },
      { s: { r: 8, c: 0 }, e: { r: 8, c: totalColumns - 1 } },
      { s: { r: infoRowIndex, c: 0 }, e: { r: infoRowIndex, c: totalColumns - 1 } },
      // Column headers merges
      { s: { r: 10, c: 0 }, e: { r: 11, c: 0 } },
      { s: { r: 10, c: 1 }, e: { r: 11, c: 1 } },
      { s: { r: 10, c: 2 }, e: { r: 11, c: 2 } },
      { s: { r: 10, c: 3 }, e: { r: 11, c: 3 } },
      { s: { r: 10, c: summaryStartCol }, e: { r: 10, c: summaryStartCol + 2 } },
      { s: { r: 10, c: summaryStartCol + 3 }, e: { r: 11, c: summaryStartCol + 3 } },
      // Footer section merges - merge long text rows across columns
      { s: { r: summaryRow1Index, c: 0 }, e: { r: summaryRow1Index, c: totalColumns - 1 } },
      { s: { r: summaryRow2Index, c: 0 }, e: { r: summaryRow2Index, c: totalColumns - 1 } },
      // dateRow1 and dateRow2: Start at column 30 (AD) and span to end
      { s: { r: dateRow1Index, c: 30 }, e: { r: dateRow1Index, c: totalColumns - 1 } },
      { s: { r: dateRow2Index, c: 30 }, e: { r: dateRow2Index, c: totalColumns - 1 } },
      // Signature label and role rows: Column C (2) to Column J (10) on left, Column AE (31+) on right
      { s: { r: signatureLabelRowIndex, c: 2 }, e: { r: signatureLabelRowIndex, c: 10 } },
      { s: { r: signatureLabelRowIndex, c: 31 }, e: { r: signatureLabelRowIndex, c: totalColumns - 1 } },
      { s: { r: signatureRoleRowIndex, c: 2 }, e: { r: signatureRoleRowIndex, c: 10 } },
      { s: { r: signatureRoleRowIndex, c: 31 }, e: { r: signatureRoleRowIndex, c: totalColumns - 1 } },
    ];

    // Create workbook
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'អវត្តមានសិស្ស');

    wb.Props = {
      Title: `បញ្ជីអវត្តមានសិស្ស - ${className}`,
      Subject: 'អវត្តមានសិស្ស',
      Author: 'PLP School Portal',
      CreatedDate: new Date()
    };

    // Generate filename
    const cleanClassName = className.replace(/\s+/g, '_').replace(/[^\w\u0080-\uFFFF-]/g, '_');
    const filename = `បញ្ជីអវត្តមាន_${cleanClassName}_${monthYearName.replace(/\s+/g, '_')}.xlsx`;

    // Export file
    XLSXStyle.writeFile(wb, filename, {
      bookType: 'xlsx',
      type: 'binary'
    });

    return { success: true, filename, recordCount: studentsWithAttendance.length };
  } catch (error) {
    console.error('Error exporting Report 4:', error);
    return { success: false, error: error.message };
  }
};
