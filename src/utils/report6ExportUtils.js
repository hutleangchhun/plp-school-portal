/**
 * Report 6: Students with Disabilities Export Utility
 * Exports students with disabilities data in traditional Excel format with Khmer headers
 * Shows all accessibility types as columns with tick marks for each student
 */

import { getFullName } from './usernameUtils';
import { formatClassIdentifier } from './helpers';
import { accessibilityOptions } from './formOptions';

/**
 * Export Report 6 (Students with Disabilities) to Excel with traditional format
 *
 * @param {Array} studentsWithDisabilities - Array of students with disabilities
 * @param {Object} options - Export options
 * @param {string} options.schoolName - School name
 * @returns {Promise<Object>} - Success/error result with filename and record count
 */
export const exportReport6ToExcel = async (studentsWithDisabilities, options = {}) => {
  const {
    schoolName = 'សាលា'
  } = options;

  console.log('📊 exportReport6ToExcel - Received data:', studentsWithDisabilities.length, 'students');

  try {
    // Dynamically import xlsx-js-style
    const XLSXStyleModule = await import('xlsx-js-style');
    const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

    // Fixed columns: ល.រ, អត្តលេខសិស្ស, ឈ្មោះសិស្ស, ភេទ, ថ្នាក់
    const fixedColumns = 5;
    const accessibilityColumns = accessibilityOptions.length; // 8 columns for accessibility types
    const totalColumns = fixedColumns + accessibilityColumns;

    // Build template data
    const templateData = [];

    // Create empty row template
    const emptyRow = Array(totalColumns).fill('');

    // Row 0: Kingdom header
    const headerRow0 = [...emptyRow];
    headerRow0[0] = 'ព្រះរាជាណាចក្រកម្ពុជា';
    templateData.push(headerRow0);

    // Row 1: Nation/Religion/King
    const headerRow1Header = [...emptyRow];
    headerRow1Header[0] = 'ជាតិ     សាសនា     ព្រះមហាក្សត្រ';
    templateData.push(headerRow1Header);

    // Row 2: Department
    const deptRow = [...emptyRow];
    deptRow[0] = 'មន្ទីរអប់រំ យុវជន និងកីឡា រាជធានី/ខេត្ត............';
    templateData.push(deptRow);

    // Row 3: Office
    const officeRow = [...emptyRow];
    officeRow[0] = 'ការិយាល័យអប់រំ យុវជន និងកីឡារដ្ឋបាលក្រុង/ស្រុក/ខណ្ឌ..........................';
    templateData.push(officeRow);

    // Row 4: School name
    const schoolRow = [...emptyRow];
    schoolRow[0] = `សាលា: ${schoolName}`;
    templateData.push(schoolRow);

    // Row 5: Report title
    const titleRow = [...emptyRow];
    titleRow[0] = 'បញ្ជីសិស្ស ដែលមានឧបសគ្គ/ពិការ';
    templateData.push(titleRow);

    // Row 6: Academic year
    const academicYearRow = [...emptyRow];
    academicYearRow[0] = 'ឆ្នាំសិក្សា: ________________';
    templateData.push(academicYearRow);

    // Row 7: Empty row
    templateData.push([...emptyRow]);

    // Row 8: Main headers
    const headerRow1 = Array(totalColumns).fill('');
    headerRow1[0] = 'ល.រ';
    headerRow1[1] = 'អត្តលេខសិស្ស';
    headerRow1[2] = 'ឈ្មោះសិស្ស';
    headerRow1[3] = 'ភេទ';
    headerRow1[4] = 'ថ្នាក់';

    // Add accessibility type headers
    accessibilityOptions.forEach((option, index) => {
      headerRow1[fixedColumns + index] = option.label;
    });
    templateData.push(headerRow1);

    // Row 9: Column numbers
    const headerRow2 = Array(totalColumns).fill('');
    headerRow2[0] = '(១)';
    headerRow2[1] = '(២)';
    headerRow2[2] = '(៣)';
    headerRow2[3] = '(៤)';
    headerRow2[4] = '(៥)';

    // Add column numbers for accessibility columns
    for (let i = 0; i < accessibilityColumns; i++) {
      headerRow2[fixedColumns + i] = `(${fixedColumns + i + 1})`;
    }
    templateData.push(headerRow2);

    // Data rows
    studentsWithDisabilities.forEach((student, index) => {
      const dataRow = Array(totalColumns).fill('');
      dataRow[0] = index + 1;
      dataRow[1] = student.student?.studentNumber || student.studentNumber || student.studentId || student.id || '';
      dataRow[2] = getFullName(student, '');
      dataRow[3] = student.gender === 'MALE' ? 'ប្រុស' : student.gender === 'FEMALE' ? 'ស្រី' : '';

      // Format class
      if (student.class?.gradeLevel !== undefined && student.class?.gradeLevel !== null) {
        const gradeLevel = String(student.class.gradeLevel);
        const displayGradeLevel = gradeLevel === '0' ? 'មត្តេយ្យ' : gradeLevel;
        dataRow[4] = formatClassIdentifier(displayGradeLevel, student.class?.section);
      } else {
        dataRow[4] = student.class?.name || '';
      }

      // Get student's accessibility types (can be array or comma-separated string)
      const studentAccessibility = student.accessibility || student.specialNeeds || student.special_needs || '';
      let accessibilityArray = [];

      if (Array.isArray(studentAccessibility)) {
        accessibilityArray = studentAccessibility;
      } else if (typeof studentAccessibility === 'string' && studentAccessibility) {
        // Split comma-separated values and trim
        accessibilityArray = studentAccessibility.split(',').map(item => item.trim());
      }

      // Check each accessibility type and add tick mark if present
      accessibilityOptions.forEach((option, index) => {
        const hasType = accessibilityArray.some(type =>
          type.toLowerCase() === option.value.toLowerCase()
        );
        dataRow[fixedColumns + index] = hasType ? '✓' : '';
      });

      templateData.push(dataRow);
    });

    // Footer section
    templateData.push([...emptyRow]);

    // Summary row
    const summaryRowIndex = templateData.length;
    const summaryRow = [...emptyRow];
    summaryRow[0] = `សរុប: ${studentsWithDisabilities.length} នាក់`;
    templateData.push(summaryRow);

    // Create worksheet
    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Set column widths
    const colWidths = [
      { wch: 6 },    // ល.រ
      { wch: 18 },   // អត្តលេខសិស្ស
      { wch: 30 },   // ឈ្មោះសិស្ស
      { wch: 10 },   // ភេទ
      { wch: 15 }    // ថ្នាក់
    ];

    // Add column widths for accessibility columns
    for (let i = 0; i < accessibilityColumns; i++) {
      colWidths.push({ wch: 20 });
    }

    ws['!cols'] = colWidths;

    // Set row heights
    const rowHeights = [];
    for (let i = 0; i < templateData.length; i++) {
      if (i === 0 || i === 1 || i === 5) {
        rowHeights.push({ hpt: 20 });
      } else if (i === 8 || i === 9) {
        // Headers are now at rows 8-9
        rowHeights.push({ hpt: 18 });
      } else {
        rowHeights.push({ hpt: 15 });
      }
    }
    ws['!rows'] = rowHeights;

    // Apply styling
    const totalRows = templateData.length;
    const dataEndRow = 10 + studentsWithDisabilities.length;

    for (let R = 0; R < totalRows; R++) {
      for (let C = 0; C < totalColumns; C++) {
        const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });

        if (R === 0 || R === 1) {
          // Kingdom and nation header
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            font: { name: 'Khmer OS', sz: 11, bold: true }
          };
        } else if (R === 2 || R === 3 || R === 4) {
          // Department, office, school rows
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
            font: { name: 'Khmer OS', sz: 10 }
          };
        } else if (R === 5) {
          // Report title - center aligned
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            font: { name: 'Khmer OS', sz: 11, bold: true }
          };
        } else if (R === 6) {
          // Academic year row - center aligned
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            font: { name: 'Khmer OS', sz: 10 }
          };
        } else if (R === 8 || R === 9) {
          // Header rows (now at 8-9)
          ws[cellAddress].s = {
            fill: { fgColor: { rgb: 'D3D3D3' } },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            },
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            font: { name: 'Khmer OS Battambang', sz: 10, bold: true }
          };
        } else if (R >= 10 && R <= dataEndRow) {
          // Data rows
          ws[cellAddress].s = {
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
            font: { name: 'Khmer OS Battambang', sz: 10 }
          };
        } else if (R === summaryRowIndex) {
          // Summary row
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
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
      // Header merges - span across all columns
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalColumns - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalColumns - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalColumns - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: totalColumns - 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: totalColumns - 1 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: totalColumns - 1 } }, // Title row
      { s: { r: 6, c: 0 }, e: { r: 6, c: totalColumns - 1 } }, // Academic year row
      // Header columns merge (rows 8-9 for each column)
      { s: { r: 8, c: 0 }, e: { r: 9, c: 0 } },
      { s: { r: 8, c: 1 }, e: { r: 9, c: 1 } },
      { s: { r: 8, c: 2 }, e: { r: 9, c: 2 } },
      { s: { r: 8, c: 3 }, e: { r: 9, c: 3 } },
      { s: { r: 8, c: 4 }, e: { r: 9, c: 4 } },
      // Merge accessibility headers (8-9) for each column
      ...Array.from({ length: accessibilityColumns }, (_, i) =>
        ({ s: { r: 8, c: fixedColumns + i }, e: { r: 9, c: fixedColumns + i } })
      ),
      // Summary row merge
      { s: { r: summaryRowIndex, c: 0 }, e: { r: summaryRowIndex, c: totalColumns - 1 } }
    ];

    // Create workbook
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'សិស្សឧបសគ្គ');

    // Set page setup for A4 landscape
    ws['!pageSetup'] = {
      paperSize: ws['!pageSetup']?.paperSize || 9, // 9 = A4
      orientation: 'landscape',
      fitToHeight: 1,
      fitToWidth: 1
    };

    // Set print options
    ws['!printOptions'] = {
      horizontalCentered: false,
      verticalCentered: false,
      printGridLines: false
    };

    wb.Props = {
      Title: `បញ្ជីសិស្សឧបសគ្គ - ${schoolName}`,
      Subject: 'សិស្សឧបសគ្គ',
      Author: 'PLP School Portal',
      CreatedDate: new Date()
    };

    // Generate filename
    const filename = `បញ្ជីសិស្សឧបសគ្គ_${schoolName.replace(/\\s+/g, '_')}.xlsx`;

    // Export file
    XLSXStyle.writeFile(wb, filename, {
      bookType: 'xlsx',
      type: 'binary'
    });

    return { success: true, filename, recordCount: studentsWithDisabilities.length };
  } catch (error) {
    console.error('Error exporting Report 6:', error);
    return { success: false, error: error.message };
  }
};
