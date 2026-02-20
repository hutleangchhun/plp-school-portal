import { getTimestampedFilename } from './exportUtils';
import { attendanceService } from './api/services/attendanceService';

/**
 * Export all schools with attendance data to Excel
 * Fetches all schools without pagination limit
 * @param {Object} filters - Filter options (province, district, date range)
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 */
/**
 * Export daily attendance statistics for bar chart visualization
 * Shows total schools, student attendance, and teacher attendance by each day
 * @param {Object} filters - Filter options (province, district, date range)
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 */
export const exportDailyAttendanceChart = async (filters = {}, onSuccess, onError) => {
  try {
    // Dynamically import exceljs
    const ExcelJSModule = await import('exceljs');
    const ExcelJS = ExcelJSModule.default || ExcelJSModule;

    // Build API params for date range
    const params = {};

    // Add filters
    if (filters.province) params.provinceId = parseInt(filters.province, 10);
    if (filters.district) params.districtId = parseInt(filters.district, 10);

    // Set date range (default to last 30 days if not specified)
    if (filters.filterMode === 'range') {
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
    } else {
      // Default to last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      params.startDate = startDate.toISOString().split('T')[0];
      params.endDate = endDate.toISOString().split('T')[0];
    }

    console.log('Exporting daily chart data with params:', params);

    // Generate date range excluding Sundays
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    const dates = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      // Skip Sundays (0 = Sunday)
      if (dayOfWeek !== 0) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }

    console.log(`Fetching coverage data for ${dates.length} days (excluding Sundays)`);

    // Fetch coverage data for each date
    const dailyDataPromises = dates.map(async (date) => {
      try {
        const dateParams = { ...params, date };
        delete dateParams.startDate;
        delete dateParams.endDate;

        const response = await attendanceService.dashboard.getSchoolsCoverage(dateParams);

        if (response.success && response.data) {
          const data = response.data;
          return {
            date: date,
            totalSchools: data.totalSchools || 0,
            schoolsWithStudentAttendance: data.schoolsWithStudentAttendance || 0,
            schoolsWithTeacherAttendance: data.schoolsWithTeacherAttendance || 0,
            totalStudentsInSchoolsWithAttendance: data.totalStudentsInSchoolsWithAttendance || 0,
            totalTeachersInSchoolsWithAttendance: data.totalTeachersInSchoolsWithAttendance || 0,
            totalStudentsWithAttendance: data.totalStudentsWithAttendance || 0,
            totalTeachersWithAttendance: data.totalTeachersWithAttendance || 0,
            totalStudentsPresentCount: data.totalStudentsPresentCount || 0,
            totalStudentsAbsentCount: data.totalStudentsAbsentCount || 0,
            totalStudentsLateCount: data.totalStudentsLateCount || 0,
            totalStudentsLeaveCount: data.totalStudentsLeaveCount || 0,
            totalTeachersPresentCount: data.totalTeachersPresentCount || 0,
            totalTeachersAbsentCount: data.totalTeachersAbsentCount || 0,
            totalTeachersLateCount: data.totalTeachersLateCount || 0,
            totalTeachersLeaveCount: data.totalTeachersLeaveCount || 0
          };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching coverage for ${date}:`, error);
        return null;
      }
    });

    const dailyDataResults = await Promise.all(dailyDataPromises);
    const dailyData = dailyDataResults.filter(data => data !== null).sort((a, b) => a.date.localeCompare(b.date));

    if (dailyData.length === 0) {
      throw new Error('No daily data found to export');
    }

    // Create ExcelJS workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'School Portal';
    workbook.created = new Date();

    // Build template data for detailed sheet
    const templateData = [];

    // Row 0: Title
    templateData.push(['របាយការណ៍វត្តមានប្រចាំថ្ងៃ', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    // Row 1: Empty
    templateData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    // Row 2: Filter info
    const filterInfo = [];
    if (filters.province) filterInfo.push(`ខេត្ត/រាជធានី: ${filters.province}`);
    if (filters.district) filterInfo.push(`ស្រុក/ខណ្ឌ: ${filters.district}`);
    if (params.startDate || params.endDate) {
      filterInfo.push(`ពេលវេលា: ${params.startDate} ដល់ ${params.endDate}`);
    }
    templateData.push([filterInfo.join(' | '), '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    // Row 3: Empty
    templateData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    // Row 4: Headers
    templateData.push([
      'ថ្ងៃ',
      'ចំនួនសាលារៀនទាំងអស់',
      'សាលារៀនមានទិន្នន័យសិស្ស',
      'សាលារៀនមានទិន្នន័យបុគ្គលិក',
      'សរុបសិស្សក្នុងសាលា',
      'សរុបបុគ្គលិកក្នុងសាលា',
      'សរុបសិស្សចុះវត្តមាន',
      'សរុបបុគ្គលិកចុះវត្តមាន',
      'សិស្សមានវត្តមាន',
      'សិស្សអវត្តមាន',
      'សិស្សយឺត',
      'សិស្សច្បាប់',
      'បុគ្គលិកមានវត្តមាន',
      'បុគ្គលិកអវត្តមាន',
      'បុគ្គលិកយឺត',
      'បុគ្គលិកច្បាប់'
    ]);

    // Data rows
    dailyData.forEach(day => {
      templateData.push([
        day.date,
        day.totalSchools,
        day.schoolsWithStudentAttendance,
        day.schoolsWithTeacherAttendance,
        day.totalStudentsInSchoolsWithAttendance,
        day.totalTeachersInSchoolsWithAttendance,
        day.totalStudentsWithAttendance,
        day.totalTeachersWithAttendance,
        day.totalStudentsPresentCount,
        day.totalStudentsAbsentCount,
        day.totalStudentsLateCount,
        day.totalStudentsLeaveCount,
        day.totalTeachersPresentCount,
        day.totalTeachersAbsentCount,
        day.totalTeachersLateCount,
        day.totalTeachersLeaveCount
      ]);
    });

    // ===== SHEET 1: Bar Chart =====
    const chartSheet = workbook.addWorksheet('Bar Chart');

    // Add chart data starting from row 3
    chartSheet.getCell('A3').value = 'ថ្ងៃ';
    chartSheet.getCell('B3').value = 'ចំនួនសាលារៀនទាំងអស់';
    chartSheet.getCell('C3').value = 'សរុបសិស្សចុះវត្តមាន';
    chartSheet.getCell('D3').value = 'សរុបបុគ្គលិកចុះវត្តមាន';

    // Style header row
    ['A3', 'B3', 'C3', 'D3'].forEach(cell => {
      chartSheet.getCell(cell).font = { name: 'Khmer OS Battambang', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      chartSheet.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } };
      chartSheet.getCell(cell).alignment = { vertical: 'middle', horizontal: 'center' };
      chartSheet.getCell(cell).border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
    dailyData.forEach((day, index) => {
      const rowNum = index + 4;
      chartSheet.getCell(`A${rowNum}`).value = day.date;
      chartSheet.getCell(`B${rowNum}`).value = day.totalSchools;
      chartSheet.getCell(`C${rowNum}`).value = day.totalStudentsWithAttendance;
      chartSheet.getCell(`D${rowNum}`).value = day.totalTeachersWithAttendance;

      // Style data rows
      ['A', 'B', 'C', 'D'].forEach(col => {
        const cell = chartSheet.getCell(`${col}${rowNum}`);
        cell.font = { name: 'Khmer OS Battambang', size: 9, bold: col !== 'A' };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowNum % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5' }
        };
      });
    });

    // Set column widths
    chartSheet.getColumn(1).width = 15;
    chartSheet.getColumn(2).width = 22;
    chartSheet.getColumn(3).width = 25;
    chartSheet.getColumn(4).width = 25;

    // ===== SHEET 2: Detailed Data =====
    const detailSheet = workbook.addWorksheet('វត្តមានប្រចាំថ្ងៃ');

    // Add all data rows
    templateData.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        const cell = detailSheet.getCell(rowIndex + 1, colIndex + 1);
        cell.value = value;

        // Apply styling
        if (rowIndex === 0) {
          // Title row
          cell.font = { name: 'Khmer OS Battambang', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (rowIndex === 2) {
          // Filter info
          cell.font = { name: 'Khmer OS Battambang', size: 10, italic: true };
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else if (rowIndex === 4) {
          // Headers
          cell.font = { name: 'Khmer OS Battambang', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };
        } else if (rowIndex > 4) {
          // Data rows
          cell.font = { name: 'Khmer OS Battambang', size: 9, bold: colIndex > 0 };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowIndex % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5' }
          };
        }
      });
    });

    // Merge cells for title and filter
    detailSheet.mergeCells('A1:P1');
    detailSheet.mergeCells('A3:P3');

    // Set column widths
    const columnWidths = [12, 18, 22, 22, 18, 18, 20, 20, 16, 15, 12, 12, 16, 15, 12, 12];
    columnWidths.forEach((width, index) => {
      detailSheet.getColumn(index + 1).width = width;
    });

    // Write file (browser-compatible)
    const filename = getTimestampedFilename('របាយការណ៍វត្តមានប្រចាំថ្ងៃ', 'xlsx');

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Create blob and download
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);

    if (onSuccess) {
      onSuccess();
    }

    return { success: true, filename };
  } catch (error) {
    console.error('Daily attendance chart export error:', error);
    if (onError) {
      onError(error);
    }
    return { success: false, error };
  }
};

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

    // Extract summary statistics
    const summaryStats = {
      totalSchools: response.data.totalSchools || 0,
      schoolsWithStudentAttendance: response.data.schoolsWithStudentAttendance || 0,
      schoolsWithTeacherAttendance: response.data.schoolsWithTeacherAttendance || 0,
      totalStudentsWithAttendance: response.data.totalStudentsWithAttendance || 0,
      totalTeachersWithAttendance: response.data.totalTeachersWithAttendance || 0
    };

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

    // Row 2-3: Summary Statistics (Horizontal Table)
    templateData.push([
      'ចំនួនសាលារៀនទាំងអស់',
      'សាលារៀនមានទិន្នន័យសិស្ស',
      'សាលារៀនមានទិន្នន័យគ្រូ',
      'សរុបសិស្សចុះវត្តមាន',
      'សរុបគ្រូចុះវត្តមាន',
      '', '', '', '', '', ''
    ]);
    templateData.push([
      summaryStats.totalSchools,
      summaryStats.schoolsWithStudentAttendance,
      summaryStats.schoolsWithTeacherAttendance,
      summaryStats.totalStudentsWithAttendance,
      summaryStats.totalTeachersWithAttendance,
      '', '', '', '', '', ''
    ]);

    // Row 4: Empty
    templateData.push(['', '', '', '', '', '', '', '', '', '', '']);

    // Row 5: Filters info
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

    // Row 6: Empty
    templateData.push(['', '', '', '', '', '', '', '', '', '', '']);

    // Row 7: Headers
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
      { wch: 25 },  // ចំនួនសាលារៀនទាំងអស់ / ល.រ
      { wch: 28 },  // សាលារៀនមានទិន្នន័យសិស្ស / ឈ្មោះសាលា
      { wch: 28 },  // សាលារៀនមានទិន្នន័យគ្រូ / ចំនួនសិស្សសរុប
      { wch: 25 },  // សរុបសិស្សចុះវត្តមាន / ចំនួនគ្រូសរុប
      { wch: 25 },  // សរុបគ្រូចុះវត្តមាន / ចំនួនថ្ងៃមានវត្តមាន
      { wch: 18 },  // ទិន្នន័យសិស្ស
      { wch: 22 },  // ទិន្នន័យគ្រូបង្រៀន
      { wch: 28 },  // ចំនួនកំណត់ត្រាសិស្សចុះវត្តមាន
      { wch: 28 },  // ចំនួនកំណត់ត្រាគ្រូចុះវត្តមាន
      { wch: 16 },  // ថ្ងៃចាប់ផ្ដើម
      { wch: 16 }   // ថ្ងៃចុងក្រោយ
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

        // Title row styling (Row 0)
        if (R === 0) {
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'center' },
            font: { name: 'Khmer OS Battambang', sz: 14, bold: true }
          };
        }
        // Summary headers row styling (Row 2)
        else if (R === 2) {
          // Only style first 5 columns (summary stats)
          if (C < 5) {
            ws[cellAddress].s = {
              alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
              font: { name: 'Khmer OS Battambang', sz: 10, bold: true },
              fill: { fgColor: { rgb: '4A90E2' } },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            };
          }
        }
        // Summary values row styling (Row 3)
        else if (R === 3) {
          // Only style first 5 columns (summary stats)
          if (C < 5) {
            ws[cellAddress].s = {
              alignment: { vertical: 'center', horizontal: 'center' },
              font: { name: 'Khmer OS Battambang', sz: 11, bold: true },
              fill: { fgColor: { rgb: 'E8F4F8' } },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            };
          }
        }
        // Filter info row styling (Row 5)
        else if (R === 5) {
          ws[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'left' },
            font: { name: 'Khmer OS Battambang', sz: 10, italic: true }
          };
        }
        // Table header row styling (Row 7)
        else if (R === 7) {
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
        // Data rows styling (Rows > 7)
        else if (R > 7) {
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
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },  // Title (Row 0)
      { s: { r: 5, c: 0 }, e: { r: 5, c: 10 } }   // Filter info (Row 5)
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
