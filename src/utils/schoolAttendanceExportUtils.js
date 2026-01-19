import { getTimestampedFilename } from './exportUtils';
import { attendanceService } from './api/services/attendanceService';

/**
 * Export all schools with detailed attendance data to Excel
 * Fetches all schools without pagination limit and detailed attendance info for each
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

    // Fetch detailed attendance count data for each school
    console.log(`Fetching detailed data for ${schools.length} schools...`);
    const detailedDataPromises = schools.map(async (school) => {
      try {
        const countParams = {};
        if (filters.filterMode === 'single' && filters.date) {
          countParams.startDate = filters.date;
          countParams.endDate = filters.date;
        } else if (filters.filterMode === 'range') {
          if (filters.startDate) countParams.startDate = filters.startDate;
          if (filters.endDate) countParams.endDate = filters.endDate;
        }

        const detailResponse = await attendanceService.dashboard.getSchoolAttendanceCountWithDates(
          school.schoolId,
          countParams
        );

        if (detailResponse.success && detailResponse.data) {
          return {
            ...school,
            details: detailResponse.data
          };
        }
        return school;
      } catch (err) {
        console.warn(`Failed to fetch details for school ${school.schoolId}:`, err);
        return school;
      }
    });

    const schoolsWithDetails = await Promise.all(detailedDataPromises);

    // Build template data
    const templateData = [];

    // Row 0: Title
    templateData.push(['របាយការណ៍វត្តមាននៃសាលា', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    // Row 1: Empty
    templateData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

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
    templateData.push([filterInfo.join(' | '), '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    // Row 3: Empty
    templateData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    // Row 4: Headers
    templateData.push([
      'ល.រ',
      'ឈ្មោះសាលា',
      'ខេត្ត',
      'ស្រុក',
      'សរុបសិស្ស',
      'សរុបគ្រូ',
      'សិស្ស-វត្តមាន',
      'សិស្ស-អវត្តមាន',
      'សិស្ស-យឺត',
      'សិស្ស-ច្បាប់',
      'គ្រូ-វត្តមាន',
      'គ្រូ-អវត្តមាន',
      'គ្រូ-យឺត',
      'គ្រូ-ច្បាប់',
      'ថ្ងៃដំបូង'
    ]);

    // Data rows
    const dataRows = schoolsWithDetails.map((school, index) => {
      const details = school.details || {};
      return [
        index + 1,
        school.schoolName || 'Unknown',
        details.provinceName || '',
        details.districtName || '',
        details.totalStudents || 0,
        details.totalTeachers || 0,
        details.studentPresentCount || 0,
        details.studentAbsentCount || 0,
        details.studentLateCount || 0,
        details.studentLeaveCount || 0,
        details.teacherPresentCount || 0,
        details.teacherAbsentCount || 0,
        details.teacherLateCount || 0,
        details.teacherLeaveCount || 0,
        school.firstAttendanceDate ? school.firstAttendanceDate.split('T')[0] : '-'
      ];
    });

    templateData.push(...dataRows);

    // Create worksheet
    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },    // ល.រ
      { wch: 28 },   // ឈ្មោះសាលា
      { wch: 15 },   // ខេត្ត
      { wch: 15 },   // ស្រុក
      { wch: 10 },   // សរុបសិស្ស
      { wch: 10 },   // សរុបគ្រូ
      { wch: 12 },   // សិស្ស-វត្តមាន
      { wch: 13 },   // សិស្ស-អវត្តមាន
      { wch: 11 },   // សិស្ស-យឺត
      { wch: 12 },   // សិស្ស-ច្បាប់
      { wch: 12 },   // គ្រូ-វត្តមាន
      { wch: 13 },   // គ្រូ-អវត្តមាន
      { wch: 11 },   // គ្រូ-យឺត
      { wch: 12 },   // គ្រូ-ច្បាប់
      { wch: 14 }    // ថ្ងៃដំបូង
    ];

    // Apply styling
    const totalRows = templateData.length;

    for (let R = 0; R < totalRows; R++) {
      for (let C = 0; C < 15; C++) {
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
              sz: 9,
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
      { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 14 } }
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
