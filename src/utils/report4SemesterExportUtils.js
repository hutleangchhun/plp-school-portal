/**
 * Report 4: Student Absence Report Export Utility for Semester
 * Exports student absence data with monthly summaries and semester total
 */

import { formatDateKhmer } from './formatters';

/**
 * Export Report 4 (Absence Report) for Semester to Excel with monthly summaries
 * Shows: Monthly totals for each month + Grand total for entire semester
 *
 * @param {Array} studentsWithAttendance - Array of students with their attendance records
 * @param {Object} options - Export options
 * @param {string} options.schoolName - School name
 * @param {string} options.className - Class name
 * @param {Date} options.startDate - Start date of the semester
 * @param {Date} options.endDate - End date of the semester
 * @param {string} options.selectedYear - Selected year
 * @param {string} options.periodName - Period name (Semester 1 or Semester 2)
 */
export const exportReport4SemesterToExcel = async (studentsWithAttendance, options = {}) => {
  const {
    schoolName = 'សាលា',
    className = 'Unknown Class',
    startDate = null,
    endDate = null,
    selectedYear = new Date().getFullYear().toString(),
    periodName = 'ឆមាស'
  } = options;

  try {
    // Dynamically import xlsx-js-style
    const XLSXStyleModule = await import('xlsx-js-style');
    const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

    const semesterStart = startDate ? new Date(startDate) : new Date(parseInt(selectedYear), 0, 1);
    const semesterEnd = endDate ? new Date(endDate) : new Date(parseInt(selectedYear), 5, 30);

    // Calculate months in the semester
    const startMonth = semesterStart.getMonth();
    const endMonth = semesterEnd.getMonth();
    const months = [];

    for (let m = startMonth; m <= endMonth; m++) {
      months.push({
        month: m,
        year: parseInt(selectedYear),
        name: [
          'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
          'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
        ][m]
      });
    }

    // Format date to string (YYYY-MM-DD)
    const formatDateToString = (date) => {
      if (!date) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    // Transform attendance data to semester format
    const exportData = studentsWithAttendance.map((student, index) => {
      const row = {
        'ល.រ': index + 1,
        'អត្តលេខ': student.studentId || student.id || '',
        'ឈ្មោះ': student.khmerName || `${student.lastName || ''} ${student.firstName || ''}`.trim() || '',
        'ភេទ': student.gender === 'MALE' ? 'ប្រុស' : student.gender === 'FEMALE' ? 'ស្រី' : '',
      };

      // Create attendance map for quick lookup
      const attendanceMap = {};
      const monthlyAbsentCount = {};
      const monthlyLeaveCount = {};
      let totalAbsent = 0;
      let totalLeave = 0;

      // Initialize monthly counters
      months.forEach(m => {
        const monthKey = `${m.year}-${m.month}`;
        monthlyAbsentCount[monthKey] = 0;
        monthlyLeaveCount[monthKey] = 0;
      });

      // Process attendance records
      if (student.attendances && Array.isArray(student.attendances)) {
        student.attendances.forEach(record => {
          const dateStr = record.date ? record.date.split('T')[0] : null;
          if (dateStr) {
            const recordDate = new Date(dateStr);
            const monthKey = `${recordDate.getFullYear()}-${recordDate.getMonth()}`;

            if (monthlyAbsentCount.hasOwnProperty(monthKey)) {
              if (record.status === 'ABSENT') {
                monthlyAbsentCount[monthKey]++;
                totalAbsent++;
              } else if (record.status === 'LEAVE') {
                monthlyLeaveCount[monthKey]++;
                totalLeave++;
              }
            }
          }
        });
      }

      // Add monthly columns for absence count
      months.forEach(m => {
        const monthKey = `${m.year}-${m.month}`;
        const monthTotal = (monthlyAbsentCount[monthKey] || 0) + (monthlyLeaveCount[monthKey] || 0);
        row[`${m.name}_អច្ប`] = monthlyAbsentCount[monthKey] || '';
        row[`${m.name}_ច្ប`] = monthlyLeaveCount[monthKey] || '';
        row[`${m.name}_សរុប`] = monthTotal > 0 ? monthTotal : '';
      });

      // Add semester totals
      row['សរុបអច្ប'] = totalAbsent > 0 ? totalAbsent : '';
      row['សរុបច្ប'] = totalLeave > 0 ? totalLeave : '';
      row['សរុបរួម'] = (totalAbsent + totalLeave) > 0 ? (totalAbsent + totalLeave) : '';

      return row;
    });

    // Calculate student counts
    const totalStudents = studentsWithAttendance.length;
    const femaleStudents = studentsWithAttendance.filter(s => s.gender === 'FEMALE').length;
    const maleStudents = totalStudents - femaleStudents;

    // Total columns: 4 info + (months * 3) + 3 semester totals + 1 notes
    const totalColumns = 4 + (months.length * 3) + 4;
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
    templateData.push(['បញ្ជីអវត្តមានសិស្សប្រចាំឆមាស', ...Array(totalColumns - 1).fill('')]);

    // Row 6: Section with class
    templateData.push([`បញ្ជីអវត្តមាន - ${className}`, ...Array(totalColumns - 1).fill('')]);

    // Row 7: Period subtitle
    const periodSubtitle = `${periodName} ឆ្នាំ ${selectedYear}`;
    templateData.push([periodSubtitle, ...Array(totalColumns - 1).fill('')]);

    // Row 8: Empty
    templateData.push([...emptyRow]);

    // Row 9: Info row with student counts
    const infoRow = [...emptyRow];
    infoRow[0] = `ឆមាស:............................. ឆ្នាំសិក្សា............................`;
    infoRow[20] = `សិស្សសរុប: ................${totalStudents}នាក់  ប្រុស...............${maleStudents}នាក់ ស្រី.................${femaleStudents}នាក់`;
    templateData.push(infoRow);

    // Row 10: First header row
    const headerRow1 = [...emptyRow];
    headerRow1[0] = 'ល.រ';
    headerRow1[1] = 'អត្តលេខ';
    headerRow1[2] = 'គោត្តនាម និងនាម';
    headerRow1[3] = 'ភេទ';

    let colIndex = 4;
    months.forEach(m => {
      // Merge 3 cells for each month (absent, leave, total)
      headerRow1[colIndex] = m.name;
      colIndex += 3;
    });

    headerRow1[colIndex] = 'សរុបឆមាស';
    templateData.push(headerRow1);

    // Row 11: Second header row (sub-headers)
    const headerRow2 = [...emptyRow];
    headerRow2[0] = '';
    headerRow2[1] = '';
    headerRow2[2] = '';
    headerRow2[3] = '';

    colIndex = 4;
    months.forEach(m => {
      headerRow2[colIndex] = 'អច្ប';
      headerRow2[colIndex + 1] = 'ច្ប';
      headerRow2[colIndex + 2] = 'សរុប';
      colIndex += 3;
    });

    headerRow2[colIndex] = 'អច្ប';
    headerRow2[colIndex + 1] = 'ច្ប';
    headerRow2[colIndex + 2] = 'សរុប';
    headerRow2[colIndex + 3] = '';

    templateData.push(headerRow2);

    // Data rows
    const dataRows = exportData.map(row => {
      const arr = [
        row['ល.រ'],
        row['អត្តលេខ'],
        row['ឈ្មោះ'],
        row['ភេទ']
      ];

      // Add monthly data columns
      months.forEach(m => {
        arr.push(row[`${m.name}_អច្ប`] || '');
        arr.push(row[`${m.name}_ច្ប`] || '');
        arr.push(row[`${m.name}_សរុប`] || '');
      });

      // Add semester totals
      arr.push(row['សរុបអច្ប'] || '');
      arr.push(row['សរុបច្ប'] || '');
      arr.push(row['សរុបរួម'] || '');
      arr.push('');

      while (arr.length < totalColumns) arr.push('');
      return arr;
    });

    templateData.push(...dataRows);

    // Footer section
    const emptyFooterRow = Array(totalColumns).fill('');
    templateData.push([...emptyFooterRow]);

    const summaryRow1 = [...emptyFooterRow];
    summaryRow1[0] = `- ចំនួនសិស្សក្នុងបញ្ជី..${totalStudents}..នាក់ ប្រុស..${maleStudents}..នាក់ ស្រី..${femaleStudents}..នាក់`;
    templateData.push(summaryRow1);

    const dateRow1 = [...emptyFooterRow];
    dateRow1[25] = 'ថ្ងៃ........... ខែ ......... ឆ្នាំ...... ព.ស.២៥...........';
    templateData.push(dateRow1);

    const dateRow2 = [...emptyFooterRow];
    dateRow2[25] = 'ធ្វើនៅ.........................ថ្ងៃទី.......... ខែ............. ឆ្នាំ២០.......';
    templateData.push(dateRow2);

    templateData.push([...emptyFooterRow]);

    const signatureRow = [...emptyFooterRow];
    signatureRow[5] = 'បានឃើញ';
    signatureRow[30] = 'គ្រូប្រចាំថ្នាក់';
    templateData.push(signatureRow);

    const positionRow = [...emptyFooterRow];
    positionRow[4] = 'នាយកសាលា';
    templateData.push(positionRow);

    // Create worksheet
    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Set column widths
    const colWidths = [
      { wch: 5 },  // ល.រ
      { wch: 12 }, // អត្តលេខ
      { wch: 25 }, // ឈ្មោះ
      { wch: 5 },  // ភេទ
    ];

    // Add widths for monthly columns (3 columns per month)
    months.forEach(m => {
      colWidths.push({ wch: 6 });  // អច្ប
      colWidths.push({ wch: 6 });  // ច្ប
      colWidths.push({ wch: 6 });  // សរុប
    });

    // Add widths for semester totals
    colWidths.push({ wch: 6 });  // សរុបអច្ប
    colWidths.push({ wch: 6 });  // សរុបច្ប
    colWidths.push({ wch: 6 });  // សរុបរួម
    colWidths.push({ wch: 20 }); // ផ្សេងៗ

    ws['!cols'] = colWidths;

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
        if (R === 0 || R === 1) {
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
            alignment: { vertical: 'center', horizontal: 'left' },
            font: { name: 'Khmer OS Battambang', sz: 10 }
          };
        } else if (R === 10 || R === 11) {
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
              bold: true
            }
          };
        } else if (R >= 12 && R <= dataEndRow) {
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
              sz: 10
            }
          };
        } else {
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'left' },
            font: { name: 'Khmer OS Battambang', sz: 10 }
          };
        }
      }
    }

    // Merge cells for headers
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalColumns - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalColumns - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: totalColumns - 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: totalColumns - 1 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: totalColumns - 1 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: totalColumns - 1 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: totalColumns - 1 } },
      { s: { r: 8, c: 0 }, e: { r: 8, c: totalColumns - 1 } },
      { s: { r: 10, c: 0 }, e: { r: 11, c: 0 } },
      { s: { r: 10, c: 1 }, e: { r: 11, c: 1 } },
      { s: { r: 10, c: 2 }, e: { r: 11, c: 2 } },
      { s: { r: 10, c: 3 }, e: { r: 11, c: 3 } },
    ];

    // Merge month headers
    let monthColStart = 4;
    months.forEach(m => {
      ws['!merges'].push({
        s: { r: 10, c: monthColStart },
        e: { r: 10, c: monthColStart + 2 }
      });
      monthColStart += 3;
    });

    // Merge semester total headers
    const semesterTotalStart = 4 + (months.length * 3);
    ws['!merges'].push({
      s: { r: 10, c: semesterTotalStart },
      e: { r: 10, c: semesterTotalStart + 2 }
    });

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
    const filename = `បញ្ជីអវត្តមាន_${cleanClassName}_${periodName.replace(/\s+/g, '_')}_${selectedYear}.xlsx`;

    // Export file
    XLSXStyle.writeFile(wb, filename, {
      bookType: 'xlsx',
      type: 'binary'
    });

    return { success: true, filename, recordCount: studentsWithAttendance.length };
  } catch (error) {
    console.error('Error exporting Report 4 Semester:', error);
    return { success: false, error: error.message };
  }
};
