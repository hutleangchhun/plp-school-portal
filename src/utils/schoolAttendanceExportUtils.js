import { getTimestampedFilename } from './exportUtils';
import { attendanceService } from './api/services/attendanceService';

/**
 * Export all schools with attendance data to Excel
 * Fetches all schools without pagination limit
 * @param {Object} filters - Filter options (province, district, date range)
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 */
export const exportSchoolsAttendanceToExcel = async (filters = {}, onSuccess, onError) => {
  try {
    // Dynamically import xlsx-js-style
    const XLSXStyleModule = await import('xlsx-js-style');
    const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

    // Build API params - fetch all schools with high limit
    const params = {
      limit: 10000,
      page: 1
    };

    // Add filters
    if (filters.province) params.provinceId = parseInt(filters.province, 10);
    if (filters.district) params.districtId = parseInt(filters.district, 10);

    // Handle date filters based on mode
    if (filters.filterMode === 'single' && filters.date) {
      params.date = filters.date;
    } else if (filters.filterMode === 'range') {
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
    }

    console.log('Exporting schools with params:', params);

    // Fetch all schools coverage data
    const response = await attendanceService.dashboard.getSchoolsCoverage(params);

    if (!response.success || !response.data) {
      throw new Error('Failed to fetch schools data for export');
    }

    const schools = response.data.schools || [];

    if (schools.length === 0) {
      throw new Error('No schools found to export');
    }

    // Prepare export data
    const exportData = schools.map((school, index) => ({
      'ល.រ': index + 1,
      'ឈ្មោះសាលា': school.schoolName || 'មិនមានឈ្មោះ',
      'ចំនួនសិស្សសរុប': school.totalStudents || 0,
      'ចំនួនគ្រូសរុប': school.totalTeachers || 0,
      'ចំនួនថ្ងៃមានវត្តមាន': school.daysWithAttendance || 0,
      'ទិន្នន័យសិស្ស': school.hasStudentAttendance ? 'មាន' : 'គ្មាន',
      'ទិន្នន័យគ្រូបង្រៀន': school.hasTeacherAttendance ? 'មាន' : 'គ្មាន',
      'ចំនួនកំណត់ត្រាសិស្សចុះវត្តមាន': school.studentAttendanceCount || 0,
      'ចំនួនកំណត់ត្រាគ្រូចុះវត្តមាន': school.teacherAttendanceCount || 0,
      'ថ្ងៃចាប់ផ្ដើម': school.firstAttendanceDate ? school.firstAttendanceDate.split('T')[0] : '-',
      'ថ្ងៃចុងក្រោយ': school.lastAttendanceDate ? school.lastAttendanceDate.split('T')[0] : '-'
    }));

    // Build template data
    const templateData = [];

    // Row 0: Title
    templateData.push(['វត្តមាននៃសាលានិមួយៗ', '', '', '', '', '', '', '', '', '', '']);

    // Row 1: Empty
    templateData.push(['', '', '', '', '', '', '', '', '', '', '']);

    // Row 2: Filters info
    const filterInfo = [];
    if (filters.province) filterInfo.push(`ខេត្ត/រាជធានី: ${filters.province}`);
    if (filters.district) filterInfo.push(`ស្រុក/ខណ្ឌ: ${filters.district}`);
    if (filters.filterMode === 'single' && filters.date) {
      filterInfo.push(`ថ្ងៃ: ${filters.date}`);
    } else if (filters.filterMode === 'range') {
      if (filters.startDate || filters.endDate) {
        filterInfo.push(`ពេលវេលា: ${filters.startDate || '...'} ដល់ ${filters.endDate || '...'}`);
      }
    }
    templateData.push([filterInfo.join(' | '), '', '', '', '', '', '', '', '', '', '']);

    // Row 3: Empty
    templateData.push(['', '', '', '', '', '', '', '', '', '', '']);

    // Row 4: Headers
    templateData.push([
      'ល.រ',
      'ឈ្មោះសាលា',
      'ចំនួនសិស្សសរុប',
      'ចំនួនគ្រូសរុប',
      'ចំនួនថ្ងៃមានវត្តមាន',
      'ទិន្នន័យសិស្ស',
      'ទិន្នន័យគ្រូបង្រៀន',
      'ចំនួនកំណត់ត្រាសិស្សចុះវត្តមាន',
      'ចំនួនកំណត់ត្រាគ្រូចុះវត្តមាន',
      'ថ្ងៃចាប់ផ្ដើម',
      'ថ្ងៃចុងក្រោយ'
    ]);

    // Data rows
    const dataRows = exportData.map(row => [
      row['ល.រ'],
      row['ឈ្មោះសាលា'],
      row['ចំនួនសិស្សសរុប'],
      row['ចំនួនគ្រូសរុប'],
      row['ចំនួនថ្ងៃមានវត្តមាន'],
      row['ទិន្នន័យសិស្ស'],
      row['ទិន្នន័យគ្រូបង្រៀន'],
      row['ចំនួនកំណត់ត្រាសិស្សចុះវត្តមាន'],
      row['ចំនួនកំណត់ត្រាគ្រូចុះវត្តមាន'],
      row['ថ្ងៃចាប់ផ្ដើម'],
      row['ថ្ងៃចុងក្រោយ']
    ]);

    templateData.push(...dataRows);

    // Create worksheet
    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },   // ល.រ
      { wch: 30 },  // ឈ្មោះសាលា
      { wch: 14 },  // ចំនួនសិស្សសរុប (Total Students)
      { wch: 14 },  // ចំនួនគ្រូសរុប (Total Teachers)
      { wch: 14 },  // ថ្ងៃមានវត្តមាន (Days with Attendance)
      { wch: 12 },  // ទិន្នន័យសិស្ស
      { wch: 15 },  // ទិន្នន័យគ្រូបង្រៀន
      { wch: 18 },  // ចំនួនកំណត់ត្រាសិស្ស
      { wch: 16 },  // ចំនួនកំណត់ត្រាគ្រូ
      { wch: 12 },  // ថ្ងៃដំបូង
      { wch: 14 }   // ថ្ងៃចុងក្រោយ
    ];

    // Apply styling
    const totalRows = templateData.length;
    const totalCols = 11; // Updated from 8 to 11 columns

    for (let R = 0; R < totalRows; R++) {
      for (let C = 0; C < totalCols; C++) {
        const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });

        if (!ws[cellAddress]) {
          ws[cellAddress] = { t: 's', v: '' };
        }

        // Title row styling
        if (R === 0) {
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'center' },
            font: { name: 'Khmer OS Battambang', sz: 14, bold: true }
          };
        }
        // Filter info row styling
        else if (R === 2) {
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'left' },
            font: { name: 'Khmer OS Battambang', sz: 10, italic: true }
          };
        }
        // Header row styling
        else if (R === 4) {
          ws[cellAddress].s = {
            fill: { fgColor: { rgb: 'D3D3D3' } },
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
              color: { rgb: '000000' }
            }
          };
        }
        // Data rows styling
        else if (R > 4) {
          ws[cellAddress].s = {
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            },
            alignment: {
              vertical: 'center',
              horizontal: C === 1 ? 'left' : 'center'
            },
            font: {
              name: 'Khmer OS Battambang',
              sz: 9
            }
          };
        }
      }
    }

    // Merge cells for title and filter info
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, // Updated to span 11 columns (0-10)
      { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } }  // Updated to span 11 columns (0-10)
    ];

    // Create workbook
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'សាលា');

    wb.Props = {
      Title: 'របាយការណ៍វត្តមាននៃសាលា',
      Subject: 'វត្តមាននៃសាលា',
      Author: 'School Portal',
      CreatedDate: new Date()
    };

    const filename = getTimestampedFilename('របាយការណ៍វត្តមាននៃសាលា', 'xlsx');

    XLSXStyle.writeFile(wb, filename);

    if (onSuccess) {
      onSuccess();
    }

    return { success: true, filename };
  } catch (error) {
    console.error('School attendance export error:', error);
    if (onError) {
      onError(error);
    }
    return { success: false, error };
  }
};
