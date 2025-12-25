/**
 * Report 9: Ethnic Minority Students Export Utility
 * Exports ethnic minority student data in traditional Excel format with Khmer headers
 */

import { getFullName } from './usernameUtils';
import { formatClassIdentifier } from './helpers';

/**
 * Export Report 9 (Ethnic Minority Students) to Excel with traditional format
 *
 * @param {Array} ethnicMinorityStudents - Array of ethnic minority students
 * @param {Object} options - Export options
 * @param {string} options.schoolName - School name
 * @returns {Promise<Object>} - Success/error result with filename and record count
 */
export const exportReport9ToExcel = async (ethnicMinorityStudents, options = {}) => {
  const {
    schoolName = 'សាលា'
  } = options;

  console.log('📊 exportReport9ToExcel - Received data:', ethnicMinorityStudents.length, 'students');

  try {
    // Dynamically import xlsx-js-style
    const XLSXStyleModule = await import('xlsx-js-style');
    const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

    const totalColumns = 34; // AH columns

    // Build template data
    const templateData = [];

    // Row 0: Kingdom header
    templateData.push(['ព្រះរាជាណាចក្រកម្ពុជា', ...Array(totalColumns - 1).fill('')]);

    // Row 1: Nation/Religion/King
    templateData.push(['ជាតិ     សាសនា     ព្រះមហាក្សត្រ', ...Array(totalColumns - 1).fill('')]);

    // Row 2: Department
    const deptRow = [...Array(totalColumns).fill('')];
    deptRow[0] = 'មន្ទីរអប់រំ យុវជន និងកីឡា រាជធានី/ខេត្ត............';
    templateData.push(deptRow);

    // Row 3: Office
    const officeRow = [...Array(totalColumns).fill('')];
    officeRow[0] = 'ការិយាល័យអប់រំ/ការិយាល័យប្រឹក្សាភិបាល............';
    templateData.push(officeRow);

    // Row 4: School name
    const schoolRow = [...Array(totalColumns).fill('')];
    schoolRow[0] = `សាលា: ${schoolName}`;
    templateData.push(schoolRow);

    // Row 5: Report title
    const titleRow = [...Array(totalColumns).fill('')];
    titleRow[0] = 'បញ្ជីឈ្មោះសិស្ស / សិស្សី ជាជនជាតិដើមភាគតិច';
    templateData.push(titleRow);

    // Row 6: Empty row
    templateData.push([...Array(totalColumns).fill('')]);

    // Row 7-8: Headers
    const headerRow1 = [...Array(totalColumns).fill('')];
    headerRow1[0] = 'ល.រ';
    headerRow1[1] = 'អត្តលេខសិស្ស';
    headerRow1[2] = 'ឈ្មោះសិស្ស';
    headerRow1[3] = 'ភេទ';
    headerRow1[4] = 'ថ្នាក់';
    headerRow1[5] = 'ជនជាតិដើមភាគតិច';
    headerRow1[6] = 'ភាសាម្តាយ';
    templateData.push(headerRow1);

    const headerRow2 = [...Array(totalColumns).fill('')];
    headerRow2[0] = '(១)';
    headerRow2[1] = '(២)';
    headerRow2[2] = '(៣)';
    headerRow2[3] = '(៤)';
    headerRow2[4] = '(៥)';
    headerRow2[5] = '(៦)';
    headerRow2[6] = '(៧)';
    templateData.push(headerRow2);

    // Data rows
    ethnicMinorityStudents.forEach((student, index) => {
      const dataRow = [...Array(totalColumns).fill('')];
      dataRow[0] = index + 1;
      dataRow[1] = student.studentId || student.id || '';
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

      dataRow[5] = student.ethnicGroup || student.ethnic_group || '';
      dataRow[6] = student.nativeLanguage || student.native_language || '';

      templateData.push(dataRow);
    });

    // Footer section
    const emptyFooterRow = Array(totalColumns).fill('');
    templateData.push([...emptyFooterRow]);

    // Summary row
    const footerStartRow = templateData.length;
    const summaryRow = [...emptyFooterRow];
    summaryRow[0] = `សរុប: ${ethnicMinorityStudents.length} នាក់`;
    templateData.push(summaryRow);
    const summaryRowIndex = footerStartRow;

    // Date and signature rows
    const dateRow = [...emptyFooterRow];
    dateRow[30] = 'ថ្ងៃ........... ខែ ......... ឆ្នាំ......';
    templateData.push(dateRow);
    const dateRowIndex = footerStartRow + 1;

    templateData.push([...emptyFooterRow]);

    // Signature rows
    const signatureLabelRow = [...emptyFooterRow];
    signatureLabelRow[2] = 'បានឃើញ';
    signatureLabelRow[30] = 'បានឃើញ';
    templateData.push(signatureLabelRow);
    const signatureLabelRowIndex = footerStartRow + 3;

    const signatureRoleRow = [...emptyFooterRow];
    signatureRoleRow[2] = 'នាយកសាលា';
    signatureRoleRow[30] = 'គ្រូប្រចាំថ្នាក់';
    templateData.push(signatureRoleRow);
    const signatureRoleRowIndex = footerStartRow + 4;

    // Create worksheet
    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Set column widths
    const colWidths = [];
    for (let i = 0; i < totalColumns; i++) {
      if (i === 0) {
        colWidths.push({ wch: 5 });  // ល.រ
      } else if (i === 1) {
        colWidths.push({ wch: 12 }); // អត្តលេខ
      } else if (i === 2) {
        colWidths.push({ wch: 20 }); // ឈ្មោះ
      } else if (i === 3 || i === 4) {
        colWidths.push({ wch: 8 });  // ភេទ, ថ្នាក់
      } else if (i === 5 || i === 6) {
        colWidths.push({ wch: 15 }); // ជនជាតិដើម, ភាសា
      } else {
        colWidths.push({ wch: 3 });
      }
    }
    ws['!cols'] = colWidths;

    // Set row heights
    const rowHeights = [];
    for (let i = 0; i < templateData.length; i++) {
      if (i === 0 || i === 1 || i === 5) {
        rowHeights.push({ hpt: 20 });
      } else if (i === 7 || i === 8) {
        rowHeights.push({ hpt: 18 });
      } else {
        rowHeights.push({ hpt: 15 });
      }
    }
    ws['!rows'] = rowHeights;

    // Apply styling
    const totalRows = templateData.length;
    const dataEndRow = 9 + ethnicMinorityStudents.length;

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
          // Report title
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
            font: { name: 'Khmer OS', sz: 11, bold: true }
          };
        } else if (R === 7 || R === 8) {
          // Header rows
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
        } else if (R >= 9 && R <= dataEndRow) {
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
              horizontal: C === 0 ? 'center' : 'left'
            },
            font: { name: 'Khmer OS Battambang', sz: 10 }
          };
        } else if (R === summaryRowIndex) {
          // Summary row
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
            font: { name: 'Khmer OS', sz: 10 }
          };
        } else if (R === dateRowIndex) {
          // Date row
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            font: { name: 'Khmer OS', sz: 10 }
          };
        } else if (R === signatureLabelRowIndex || R === signatureRoleRowIndex) {
          // Signature rows
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
      // Header merges
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalColumns - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalColumns - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalColumns - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: totalColumns - 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: totalColumns - 1 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: totalColumns - 1 } },
      // Header column merges
      { s: { r: 7, c: 0 }, e: { r: 8, c: 0 } },
      { s: { r: 7, c: 1 }, e: { r: 8, c: 1 } },
      { s: { r: 7, c: 2 }, e: { r: 8, c: 2 } },
      { s: { r: 7, c: 3 }, e: { r: 8, c: 3 } },
      { s: { r: 7, c: 4 }, e: { r: 8, c: 4 } },
      { s: { r: 7, c: 5 }, e: { r: 8, c: 5 } },
      { s: { r: 7, c: 6 }, e: { r: 8, c: 6 } },
      // Footer merges
      { s: { r: summaryRowIndex, c: 0 }, e: { r: summaryRowIndex, c: totalColumns - 1 } },
      // Date row merge
      { s: { r: dateRowIndex, c: 30 }, e: { r: dateRowIndex, c: totalColumns - 1 } },
      // Signature rows
      { s: { r: signatureLabelRowIndex, c: 2 }, e: { r: signatureLabelRowIndex, c: 10 } },
      { s: { r: signatureLabelRowIndex, c: 30 }, e: { r: signatureLabelRowIndex, c: totalColumns - 1 } },
      { s: { r: signatureRoleRowIndex, c: 2 }, e: { r: signatureRoleRowIndex, c: 10 } },
      { s: { r: signatureRoleRowIndex, c: 30 }, e: { r: signatureRoleRowIndex, c: totalColumns - 1 } }
    ];

    // Create workbook
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'សិស្សជនជាតិដើម');

    wb.Props = {
      Title: `បញ្ជីឈ្មោះសិស្សជាជនជាតិដើមភាគតិច - ${schoolName}`,
      Subject: 'សិស្សជនជាតិដើម',
      Author: 'PLP School Portal',
      CreatedDate: new Date()
    };

    // Generate filename
    const filename = `បញ្ជីឈ្មោះសិស្សជាជនជាតិដើមភាគតិច_${schoolName.replace(/\s+/g, '_')}.xlsx`;

    // Export file
    XLSXStyle.writeFile(wb, filename, {
      bookType: 'xlsx',
      type: 'binary'
    });

    return { success: true, filename, recordCount: ethnicMinorityStudents.length };
  } catch (error) {
    console.error('Error exporting Report 9:', error);
    return { success: false, error: error.message };
  }
};
