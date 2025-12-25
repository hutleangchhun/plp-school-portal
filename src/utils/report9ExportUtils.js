/**
 * Report 9: Ethnic Minority Students Export Utility
 * Exports ethnic minority student data in traditional Excel format with Khmer headers
 */

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

    const totalColumns = 1; // Only 1 column for ethnic group

    // Build template data
    const templateData = [];

    // Row 0: Kingdom header
    templateData.push(['ព្រះរាជាណាចក្រកម្ពុជា']);

    // Row 1: Nation/Religion/King
    templateData.push(['ជាតិ     សាសនា     ព្រះមហាក្សត្រ']);

    // Row 2: Department
    templateData.push(['មន្ទីរអប់រំ យុវជន និងកីឡា រាជធានី/ខេត្ត............']);

    // Row 3: Office
    templateData.push(['ការិយាល័យអប់រំ/ការិយាល័យប្រឹក្សាភិបាល............']);

    // Row 4: School name
    templateData.push([`សាលា: ${schoolName}`]);

    // Row 5: Report title
    templateData.push(['បញ្ជីឈ្មោះសិស្ស ជនជាតិដើមភាគតិច']);

    // Row 6: Empty row
    templateData.push(['']);

    // Row 7-8: Headers - Only ethnic group column
    templateData.push(['ជនជាតិដើមភាគតិច']);
    templateData.push(['(១)']);

    // Data rows
    ethnicMinorityStudents.forEach((student) => {
      const ethnicGroup = student.ethnicGroup || student.ethnic_group || '';
      templateData.push([ethnicGroup]);
    });

    // Footer section
    templateData.push(['']);

    // Summary row
    const summaryRowIndex = templateData.length;
    templateData.push([`សរុប: ${ethnicMinorityStudents.length} នាក់`]);

    // Date row
    const dateRowIndex = templateData.length;
    templateData.push(['ថ្ងៃ........... ខែ ......... ឆ្នាំ......']);

    templateData.push(['']);

    // Signature rows
    const signatureLabelRowIndex = templateData.length;
    templateData.push(['បានឃើញ']);

    const signatureRoleRowIndex = templateData.length;
    templateData.push(['នាយកសាលា']);

    // Create worksheet
    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Set column widths - Only ethnic group column is very wide
    ws['!cols'] = [{ wch: 80 }];

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
          // Report title - center aligned
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
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
              horizontal: 'left'
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
      { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 0 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 0 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 0 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 0 } }, // Title row - center aligned
      // Header column merge
      { s: { r: 7, c: 0 }, e: { r: 8, c: 0 } },
      // Footer merges
      { s: { r: summaryRowIndex, c: 0 }, e: { r: summaryRowIndex, c: 0 } },
      // Date row merge
      { s: { r: dateRowIndex, c: 0 }, e: { r: dateRowIndex, c: 0 } }
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
