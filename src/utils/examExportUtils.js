import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Export exam results to Excel file
 * @param {Array} exams - Array of exam records
 * @param {Object} student - Student information
 * @param {Function} t - Translation function
 * @param {Object} options - Export options
 */
export const exportExamResultsToExcel = async (exams, student, t, options = {}) => {
  try {
    const XLSXStyleModule = await import('xlsx-js-style');
    const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

    // Get student name
    const studentName = student?.user?.full_name || student?.full_name || `${student?.user?.first_name} ${student?.user?.last_name}`.trim() || '-';
    const studentId = student?.user?.id || student?.id || '-';

    // Prepare template data
    const templateData = [];

    // Header section
    templateData.push(['ឯកសារលទ្ធផលប្រលង']);
    templateData.push(['EXAM RESULTS REPORT']);
    templateData.push([]);

    // Student info section
    templateData.push([t('studentName', 'Student Name') + ':', studentName, '', t('studentId', 'Student ID') + ':', studentId]);
    templateData.push([]);

    // Table headers
    const headers = [
      t('no', 'No'),
      t('examTitle', 'Exam Title'),
      t('examType', 'Exam Type'),
      t('subject', 'Subject'),
      t('score', 'Score'),
      t('examGrade', 'Grade'),
      t('status', 'Status'),
      t('duration', 'Duration'),
      t('examDate', 'Exam Date')
    ];
    templateData.push(headers);

    // Add exam records
    exams.forEach((exam, index) => {
      const scoreDisplay = exam.percentage !== undefined && exam.percentage !== null
        ? `${exam.percentage}%`
        : exam.score !== undefined && exam.score !== null
        ? `${exam.score}/${exam.totalScore || 100}`
        : '-';

      const examDate = exam.createdAt ? new Date(exam.createdAt).toLocaleDateString() : '-';

      templateData.push([
        index + 1,
        exam.examTitle || '-',
        getExamTypeLabel(exam.examType, t),
        exam.subjectKhmerName || exam.subjectName || '-',
        scoreDisplay,
        exam.letterGrade || '-',
        exam.status || '-',
        formatTimeTaken(exam.timeTaken),
        examDate
      ]);
    });

    // Create worksheet
    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Set column widths
    const columnWidths = [5, 25, 15, 20, 15, 12, 15, 15, 18];
    ws['!cols'] = columnWidths.map(w => ({ wch: w }));

    // Set row heights
    ws['!rows'] = [
      { hpx: 25 }, // Title
      { hpx: 20 }, // Subtitle
      { hpx: 10 }, // Empty row
      { hpx: 18 }, // Student info
      { hpx: 10 }, // Empty row
      { hpx: 22 }  // Headers
    ];

    // Apply styling
    applyExamExportStyling(ws, XLSXStyle, templateData.length);

    // Create workbook
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, t('examResults', 'Exam Results'));

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `exam_results_${studentId}_${timestamp}.xlsx`;

    // Save file
    XLSXStyle.writeFile(wb, filename);
  } catch (error) {
    console.error('Error exporting exam results to Excel:', error);
    throw new Error('Failed to export exam results to Excel');
  }
};

/**
 * Apply styling to exam export worksheet
 */
const applyExamExportStyling = (ws, XLSXStyle, totalRows) => {
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

      // Subtitle styling (row 1)
      if (R === 1) {
        ws[cellAddress].s = {
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          font: { name: 'Khmer OS Battambang', sz: 11, bold: true, color: { rgb: 'FF2E5090' } },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }

      // Student info styling (row 3)
      if (R === 3) {
        ws[cellAddress].s = {
          alignment: { vertical: 'center', horizontal: 'left' },
          font: { name: 'Khmer OS Battambang', sz: 10, bold: C === 0 || C === 3 },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }

      // Table headers styling (row 5)
      if (R === 5) {
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

      // Data rows styling (rows 6+)
      if (R >= 6) {
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

/**
 * Get exam type label in Khmer
 */
const getExamTypeLabel = (examType, t) => {
  const examTypeMap = {
    'exam': t('examTypeExam', 'ការប្រលង'),
    'test': t('examTypeTest', 'ការធ្វើតេស្ត'),
    'quiz': t('examTypeQuiz', 'សាកល្បង')
  };
  return examTypeMap[examType?.toLowerCase()] || examType || '-';
};

/**
 * Format time taken in hh:mm:ss format
 */
const formatTimeTaken = (seconds) => {
  if (!seconds || seconds <= 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (num) => String(num).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(minutes)}:${pad(secs)}`;
};
