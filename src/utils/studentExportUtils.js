import { formatDateKhmer } from './formatters';
import { getTimestampedFilename } from './exportUtils';
import schoolService from './api/services/schoolService';

/**
 * Export students data to Excel in BulkStudentImport template format
 * @param {Array} students - Array of student objects
 * @param {Object} options - Export options
 * @param {Object} options.selectedClass - Selected class information
 * @param {string} options.schoolName - School name for header
 * @param {number} options.schoolId - School ID to fetch school info
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 */
export const exportStudentsToExcel = async (students, options = {}) => {
  try {
    let {
      selectedClass = null,
      schoolName = '',
      schoolId = null,
      onSuccess,
      onError
    } = options;

    // Fetch school name from API if schoolId is provided
    if (schoolId && !schoolName) {
      try {
        const schoolResponse = await schoolService.getSchoolInfo(schoolId);
        if (schoolResponse?.data?.name) {
          schoolName = schoolResponse.data.name;
        }
      } catch (err) {
        console.warn('Failed to fetch school name:', err);
        // Continue with default or provided name
      }
    }

    // Use default if still not set
    if (!schoolName) {
      schoolName = 'សាលា';
    }

    // Dynamically import xlsx-js-style
    const XLSXStyleModule = await import('xlsx-js-style');
    const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

    // Prepare header information
    const className = selectedClass?.name || 'បញ្ជីរាយនាមសិស្ស';
    const academicYear = selectedClass?.academicYear || (new Date().getFullYear() + '-' + (new Date().getFullYear() + 1));
    const gradeLevel = selectedClass?.gradeLevel || '';
    const filterInfo = selectedClass ? ` ថ្នាក់: ${selectedClass.name}` : '';

    // Build template data with headers
    const templateData = buildTemplateHeaders(schoolName, gradeLevel, filterInfo, academicYear);

    // Append student rows
    students.forEach((student, index) => {
      const row = buildStudentRow(student, index, selectedClass, academicYear);
      templateData.push(row);
    });

    // Create worksheet
    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Apply column widths
    ws['!cols'] = getColumnWidths();

    // Apply cell merges
    ws['!merges'] = getCellMerges();

    // Apply styling to all cells
    applyWorksheetStyling(ws, XLSXStyle);

    // Ensure merged cell headers have correct text
    setMergedCellHeaders(ws, XLSXStyle);

    // Create workbook and save
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'បញ្ជីសិស្ស');

    const filename = getTimestampedFilename(
      selectedClass ? `students_${selectedClass.name.replace(/\s+/g, '_')}` : 'students_data',
      'xlsx'
    );

    XLSXStyle.writeFile(wb, filename);

    if (onSuccess) {
      onSuccess();
    }

    return { success: true, filename };
  } catch (error) {
    console.error('Export error:', error);
    if (onError) {
      onError(error);
    }
    return { success: false, error };
  }
};

/**
 * Build template headers (rows 0-10)
 */
const buildTemplateHeaders = (schoolName, gradeLevel, filterInfo, academicYear) => {
  return [
    // Top header rows (0-8)
    ['ព្រះរាជាណាចក្រកម្ពុជា', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['ជាតិ       សាសនា       ព្រះមហាក្សត្រ', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    [schoolName || 'សាលាបឋមសិក្សា ...........', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['បញ្ជីរាយនាមសិស្ស', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    [`${gradeLevel ? `${filterInfo}` : 'ថ្នាក់ទី.....'} ឆ្នាំសិក្សា ${academicYear}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],

    // Main header row (row index 9)
    [
      '#',                              // col 0
      'ព័ត៌មានសិស្ស', '', '', '', '', '', '', '', '', '', // cols 1..10 (student info)
      'ព័ត៌មានឪពុក', '', '', '', '', '',          // cols 11..16 (father)
      'ព័ត៌មានម្តាយ', '', '', '', '', '',          // cols 17..22 (mother)
      'សេចក្ដីផ្សេងៗ', ''                        // cols 23..24 (other)
    ],

    // Subheader row (row index 10)
    [
      '#',
      'អត្តលេខ', 'គោត្តនាម', 'នាម',
      'ថ្ងៃខែឆ្នាំកំណើត', 'ភេទ', 'លេខទូរស័ព្ទ', 'សញ្ជាតិ', 'លេខសិស្ស', 'ឆ្នាំសិក្សា',
      'អាសយដ្ឋានពេញ',
      // Father subheaders (cols 11..16)
      'នាម', 'គោត្តនាម', 'ទូរស័ព្ទ', 'ភេទ', 'មុខរបរ', 'អាសយដ្ឋានពេញឪពុក',
      // Mother subheaders (cols 17..22)
      'នាម', 'គោត្តនាម', 'ទូរស័ព្ទ', 'ភេទ', 'មុខរបរ', 'អាសយដ្ឋានពេញម្តាយ',
      // Other (cols 23..24)
      'ជនជាតិភាគតិច', 'លក្ខណៈពិសេស'
    ]
  ];
};

/**
 * Build a single student row
 */
const buildStudentRow = (student, index, selectedClass, academicYear) => {
  const dob = student.dateOfBirth || student.date_of_birth;
  const formattedDob = dob ? formatDateKhmer(dob, 'dateOnly') : '';
  const gender = student.gender === 'MALE' || student.gender === 'male' ? 'ប្រុស' :
    student.gender === 'FEMALE' || student.gender === 'female' ? 'ស្រី' : '';

  const studentAddress = [
    student.residence?.village || student.village,
    student.residence?.commune || student.commune,
    student.residence?.district || student.district,
    student.residence?.province || student.province
  ].filter(Boolean).join(' ');

  const fatherData = student.parents?.find(p => p.relationship === 'FATHER') || {};
  const motherData = student.parents?.find(p => p.relationship === 'MOTHER') || {};

  const fatherAddress = [
    fatherData.village,
    fatherData.commune,
    fatherData.district,
    fatherData.province
  ].filter(Boolean).join(' ') || studentAddress;

  const motherAddress = [
    motherData.village,
    motherData.commune,
    motherData.district,
    motherData.province
  ].filter(Boolean).join(' ') || studentAddress;

  const fatherGender = fatherData.gender === 'MALE' || fatherData.gender === 'male' ? 'ប្រុស' : '';
  const motherGender = motherData.gender === 'FEMALE' || motherData.gender === 'female' ? 'ស្រី' : '';

  return [
    index + 1,
    student.studentId || student.id || '',
    student.lastName || student.last_name || '',
    student.firstName || student.first_name || '',
    formattedDob,
    gender,
    student.phone || '',
    student.nationality || 'ខ្មែរ',
    student.studentId || '',
    selectedClass?.academicYear || academicYear,
    studentAddress,
    // Father (11..16)
    fatherData.firstName || fatherData.first_name || '',
    fatherData.lastName || fatherData.last_name || '',
    fatherData.phone || '',
    fatherGender,
    fatherData.occupation || '',
    fatherAddress,
    // Mother (17..22)
    motherData.firstName || motherData.first_name || '',
    motherData.lastName || motherData.last_name || '',
    motherData.phone || '',
    motherGender,
    motherData.occupation || '',
    motherAddress,
    // Other
    student.minority || '',
    student.specialNeeds || ''
  ];
};

/**
 * Get column widths configuration
 */
const getColumnWidths = () => {
  return [
    { wch: 5 },  // #
    { wch: 12 }, // អត្តលេខ
    { wch: 12 }, // គោត្តនាម
    { wch: 12 }, // នាម
    { wch: 12 }, // ថ្ងៃខែឆ្នាំកំណើត
    { wch: 8 },  // ភេទ
    { wch: 12 }, // លេខទូរស័ព្ទ
    { wch: 10 }, // សញ្ជាតិ
    { wch: 12 }, // លេខសិស្ស
    { wch: 12 }, // ឆ្នាំសិក្សា
    { wch: 40 }, // អាសយដ្ឋានពេញ
    // Father columns (11..16)
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 40 },
    // Mother columns (17..22)
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 40 },
    // Other
    { wch: 12 }, { wch: 20 }
  ];
};

/**
 * Get cell merge configurations
 */
const getCellMerges = () => {
  return [
    // Top header merges (rows 0-6)
    { s: { r: 0, c: 0 }, e: { r: 0, c: 24 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 24 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 24 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 24 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 24 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 24 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 24 } },

    // Main header merges (row 9)
    // Student info: columns 1..10 (B..K)
    { s: { r: 9, c: 1 }, e: { r: 9, c: 10 } },
    // Father info: columns 11..16 (L..Q)
    { s: { r: 9, c: 11 }, e: { r: 9, c: 16 } },
    // Mother info: columns 17..22 (R..W)
    { s: { r: 9, c: 17 }, e: { r: 9, c: 22 } },
    // Other: columns 23..24 (X..Y)
    { s: { r: 9, c: 23 }, e: { r: 9, c: 24 } }
  ];
};

/**
 * Apply styling to worksheet cells
 */
const applyWorksheetStyling = (ws, XLSXStyle) => {
  const range = XLSXStyle.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };

      // Top header rows (0..8) - centered bold
      if (R < 9) {
        ws[cellAddress].s = {
          alignment: { vertical: 'center', horizontal: 'center' },
          font: { name: 'Khmer OS Battambang', sz: 11, bold: true }
        };
      }
      // Main header row (9) - merged big labels
      else if (R === 9) {
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'E0E0E0' } },
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          font: { name: 'Khmer OS Battambang', sz: 11, bold: true },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
      // Subheader row (10)
      else if (R === 10) {
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'E0E0E0' } },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          },
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          font: { name: 'Khmer OS Battambang', sz: 10, bold: true }
        };
      }
      // Data rows
      else {
        ws[cellAddress].s = {
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          },
          alignment: { vertical: 'center', horizontal: 'left' },
          font: { name: 'Khmer OS Battambang', sz: 10 }
        };
      }
    }
  }
};

/**
 * Set merged cell headers explicitly
 */
const setMergedCellHeaders = (ws, XLSXStyle) => {
  const setCell = (r, c, value) => {
    const addr = XLSXStyle.utils.encode_cell({ r, c });
    ws[addr] = ws[addr] || { t: 's', v: '' };
    ws[addr].v = value;
  };

  setCell(9, 1, 'ព័ត៌មានសិស្ស');   // B10 (row-index 9)
  setCell(9, 11, 'ព័ត៌មានឪពុក');  // L10
  setCell(9, 17, 'ព័ត៌មានម្តាយ');  // R10
  setCell(9, 23, 'សេចក្ដីផ្សេងៗ'); // X10
};
