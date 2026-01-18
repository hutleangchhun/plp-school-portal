import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Export a single student's data to Excel
 * @param {Object} student - Student data object
 * @param {Function} t - Translation function
 */
export const exportStudentToExcel = async (student, t) => {
  try {
    const XLSXStyleModule = await import('xlsx-js-style');
    const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

    // Prepare student data
    const studentName = student?.user?.full_name || student?.full_name ||
      `${student?.user?.first_name || ''} ${student?.user?.last_name || ''}`.trim() || '-';
    const studentId = student?.user?.id || student?.id || '-';
    const username = student?.username || student?.user?.username || '-';
    const email = student?.user?.email || '-';
    const phone = student?.user?.phone_number || student?.phone || '-';
    const classInfo = student?.class?.name || student?.className || '-';
    const gradeLevel = student?.class?.gradeLevel || student?.gradeLevel || '-';
    const academicYear = student?.academicYear || '-';

    // Prepare template data
    const templateData = [];

    // Header section
    templateData.push([t('studentInformation', 'Student Information')]);
    templateData.push([]);

    // Student details
    templateData.push([t('fullName', 'Full Name'), studentName]);
    templateData.push([t('studentId', 'Student ID'), studentId]);
    templateData.push([t('username', 'Username'), username]);
    templateData.push([t('email', 'Email'), email]);
    templateData.push([t('phone', 'Phone'), phone]);
    templateData.push([t('class', 'Class'), classInfo]);
    templateData.push([t('grade', 'Grade'), gradeLevel]);
    templateData.push([t('academicYear', 'Academic Year'), academicYear]);

    // Create worksheet
    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = [{ wch: 25 }, { wch: 40 }];

    // Apply styling
    applyStudentExportStyling(ws, XLSXStyle, templateData.length);

    // Create workbook
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, t('studentInfo', 'Student Info'));

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `student_${studentId}_${studentName.replace(/\s+/g, '_')}_${timestamp}.xlsx`;

    // Save file
    XLSXStyle.writeFile(wb, filename);
  } catch (error) {
    console.error('Error exporting student to Excel:', error);
    throw new Error('Failed to export student data to Excel');
  }
};

/**
 * Export multiple students to Excel
 * @param {Array} students - Array of student objects
 * @param {Function} t - Translation function
 */
export const exportStudentsToExcel = async (students, t) => {
  try {
    const XLSXStyleModule = await import('xlsx-js-style');
    const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

    // Prepare template data
    const templateData = [];

    // Header section
    templateData.push([t('studentList', 'Student List')]);
    templateData.push([]);

    // Table headers
    const headers = [
      t('no', 'No'),
      t('fullName', 'Full Name'),
      t('username', 'Username'),
      t('email', 'Email'),
      t('phone', 'Phone'),
      t('class', 'Class'),
      t('grade', 'Grade'),
      t('academicYear', 'Academic Year')
    ];
    templateData.push(headers);

    // Add student records
    students.forEach((student, index) => {
      const studentName = student?.user?.full_name || student?.full_name ||
        `${student?.user?.first_name || ''} ${student?.user?.last_name || ''}`.trim() || '-';
      const email = student?.user?.email || '-';
      const phone = student?.user?.phone_number || student?.phone || '-';
      const classInfo = student?.class?.name || student?.className || '-';
      const gradeLevel = student?.class?.gradeLevel || student?.gradeLevel || '-';

      templateData.push([
        index + 1,
        studentName,
        student?.username || student?.user?.username || '-',
        email,
        phone,
        classInfo,
        gradeLevel,
        student?.academicYear || '-'
      ]);
    });

    // Create worksheet
    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Set column widths
    const columnWidths = [5, 25, 20, 25, 15, 15, 10, 15];
    ws['!cols'] = columnWidths.map(w => ({ wch: w }));

    // Apply styling
    applyStudentListStyling(ws, XLSXStyle, templateData.length);

    // Create workbook
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, t('students', 'Students'));

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `student_list_${timestamp}.xlsx`;

    // Save file
    XLSXStyle.writeFile(wb, filename);
  } catch (error) {
    console.error('Error exporting students to Excel:', error);
    throw new Error('Failed to export student list to Excel');
  }
};

/**
 * Apply styling to single student export worksheet
 */
const applyStudentExportStyling = (ws, XLSXStyle, totalRows) => {
  const range = XLSXStyle.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });

      // Ensure cell exists
      if (!ws[cellAddress]) {
        ws[cellAddress] = { v: '' };
      }

      // Title styling (row 0)
      if (R === 0) {
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'FF2E5090' } }, // Dark blue
          alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
          font: { name: 'Khmer OS Battambang', sz: 14, bold: true, color: { rgb: 'FFFFFFFF' } },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }

      // Data rows styling
      if (R >= 2) {
        const bgColor = R % 2 === 0 ? 'FFFFFFFF' : 'FFF2F2F2'; // Alternating white/light gray
        const isBoldLabel = C === 0; // First column (labels)

        ws[cellAddress].s = {
          fill: { fgColor: { rgb: bgColor } },
          alignment: {
            vertical: 'center',
            horizontal: C === 0 ? 'left' : 'left',
            wrapText: true
          },
          font: {
            name: 'Khmer OS Battambang',
            sz: 10,
            bold: isBoldLabel
          },
          border: {
            top: { style: 'thin', color: { rgb: 'FFD3D3D3' } },
            bottom: { style: 'thin', color: { rgb: 'FFD3D3D3' } },
            left: { style: 'thin', color: { rgb: 'FFD3D3D3' } },
            right: { style: 'thin', color: { rgb: 'FFD3D3D3' } }
          }
        };
      }
    }
  }
};

/**
 * Apply styling to student list export worksheet
 */
const applyStudentListStyling = (ws, XLSXStyle, totalRows) => {
  const range = XLSXStyle.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });

      // Ensure cell exists
      if (!ws[cellAddress]) {
        ws[cellAddress] = { v: '' };
      }

      // Title styling (row 0)
      if (R === 0) {
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'FF2E5090' } }, // Dark blue
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          font: { name: 'Khmer OS Battambang', sz: 14, bold: true, color: { rgb: 'FFFFFFFF' } },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }

      // Table headers styling (row 2)
      if (R === 2) {
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'FF4472C4' } }, // Blue
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          font: { name: 'Khmer OS Battambang', sz: 11, bold: true, color: { rgb: 'FFFFFFFF' } },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }

      // Data rows styling (rows 3+)
      if (R >= 3) {
        const bgColor = R % 2 === 0 ? 'FFFFFFFF' : 'FFF2F2F2'; // Alternating white/light gray
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: bgColor } },
          alignment: {
            vertical: 'center',
            horizontal: C === 0 ? 'center' : 'left',
            wrapText: true
          },
          font: { name: 'Khmer OS Battambang', sz: 10 },
          border: {
            top: { style: 'thin', color: { rgb: 'FFD3D3D3' } },
            bottom: { style: 'thin', color: { rgb: 'FFD3D3D3' } },
            left: { style: 'thin', color: { rgb: 'FFD3D3D3' } },
            right: { style: 'thin', color: { rgb: 'FFD3D3D3' } }
          }
        };
      }
    }
  }
};
