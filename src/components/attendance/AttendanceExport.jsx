import { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDateKhmer } from '../../utils/formatters';

/**
 * AttendanceExport Component
 *
 * A reusable component for exporting attendance data to Excel or CSV format
 * Supports both daily and monthly attendance reports
 *
 * @param {Object} props
 * @param {Array} props.students - Array of student objects
 * @param {Object} props.attendance - Attendance data object
 * @param {string} props.className - Name of the class
 * @param {string} props.schoolName - Name of the school
 * @param {Date} props.selectedDate - Selected date for export
 * @param {string} props.exportType - 'daily' or 'monthly'
 * @param {boolean} props.disabled - Disable export button
 */
export default function AttendanceExport({
  students = [],
  attendance = {},
  className = 'Unknown-Class',
  schoolName = 'សាលា',
  selectedDate = new Date(),
  exportType = 'monthly', // 'daily' or 'monthly'
  disabled = false
}) {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Format date to string (YYYY-MM-DD)
  const formatDateToString = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Clean filename
  const cleanClassName = className
    .replace(/\s+/g, '_')
    .replace(/[^\w\u0080-\uFFFF-]/g, '_');

  // Prepare export data for monthly report
  const prepareMonthlyExportData = () => {
    const currentDate = new Date(selectedDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const exportData = students.map((student, index) => {
      const studentUserId = Number(student.userId || student.id);

      const row = {
        'ល.រ': index + 1,
        'អត្តលេខ': student.studentId || student.id || '',
        'ឈ្មោះ': student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username || '',
        'ភេទ': student.gender === 'MALE' ? 'ប' : student.gender === 'FEMALE' ? 'ស' : '',
      };

      // Add columns for each day of the month (1-31)
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;

      for (let day = 1; day <= 31; day++) {
        if (day <= daysInMonth) {
          // Check attendance for this specific day
          const dayDate = new Date(year, month, day);
          const dateStr = formatDateToString(dayDate);
          const studentAttendance = attendance[studentUserId]?.[dateStr];

          if (studentAttendance?.status) {
            const statusMark = studentAttendance.status === 'PRESENT' ? 'ម' :
                             studentAttendance.status === 'ABSENT' ? 'អ' :
                             studentAttendance.status === 'LATE' ? 'យ' : '';
            row[day.toString()] = statusMark;

            // Count totals
            if (studentAttendance.status === 'PRESENT') presentCount++;
            else if (studentAttendance.status === 'ABSENT') absentCount++;
            else if (studentAttendance.status === 'LATE') lateCount++;
          } else {
            row[day.toString()] = '';
          }
        } else {
          row[day.toString()] = '';
        }
      }

      // Add summary columns
      row['ម'] = presentCount;
      row['អ'] = absentCount;
      row['យឺត'] = lateCount;

      return row;
    });

    return { exportData, daysInMonth };
  };

  // Prepare export data for daily report
  const prepareDailyExportData = () => {
    const currentDate = new Date(selectedDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const exportData = students.map((student, index) => {
      const studentUserId = Number(student.userId || student.id);
      const studentAttendance = attendance[studentUserId] || { status: null, reason: '' };

      const row = {
        'ល.រ': index + 1,
        'អត្តលេខ': student.studentId || student.id || '',
        'ឈ្មោះ': student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username || '',
        'ភេទ': student.gender === 'MALE' ? 'ប' : student.gender === 'FEMALE' ? 'ស' : '',
      };

      // Add columns for each day of the month (1-31)
      for (let day = 1; day <= 31; day++) {
        if (day <= daysInMonth) {
          // Check if this is the selected date
          if (day === currentDate.getDate() && studentAttendance.status) {
            const statusMark = studentAttendance.status === 'PRESENT' ? 'ម' :
                             studentAttendance.status === 'ABSENT' ? 'អ' :
                             studentAttendance.status === 'LATE' ? 'យ' : '';
            row[day.toString()] = statusMark;
          } else {
            row[day.toString()] = '';
          }f
        } else {
          row[day.toString()] = '';
        }
      }

      // Add summary columns
      row['ម'] = studentAttendance.status === 'PRESENT' ? 1 : 0;
      row['អ'] = studentAttendance.status === 'ABSENT' ? 1 : 0;
      row['យឺត'] = studentAttendance.status === 'LATE' ? 1 : 0;

      return row;
    });

    return { exportData, daysInMonth };
  };

  // Export to Excel with borders and styling
  const handleExportExcel = async () => {
    try {
      const { exportData, daysInMonth } = exportType === 'monthly'
        ? prepareMonthlyExportData()
        : prepareDailyExportData();

      const dateStr = formatDateToString(selectedDate);

      // Import xlsx-js-style for borders
      const XLSXStyleModule = await import('xlsx-js-style');
      const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

      const currentDate = new Date(selectedDate);
      const monthName = formatDateKhmer(currentDate, 'monthYear');

      // Calculate student counts for header
      const totalStudents = students.length;
      const femaleStudents = students.filter(s => s.gender === 'FEMALE').length;
      const maleStudents = totalStudents - femaleStudents;

      // Create template with headers (39 columns total: 4 info + 31 days + 4 summary)
      const emptyRow = Array(39).fill('');

      // Build header rows
      const templateData = [];

      // Row 1: Official Header - centered
      templateData.push(['ព្រះរាជាណាចក្រកម្ពុជា', ...Array(38).fill('')]);

      // Row 2: Nation Religion King - centered, with 3 columns
      const nationRow = [...emptyRow];
      nationRow[0] = 'ជាតិ';
      nationRow[15] = 'សាសនា';
      nationRow[30] = 'ព្រះមហាក្សត្រ';
      templateData.push(nationRow);

      // Row 3: Department Info - left aligned
      const deptRow = [...emptyRow];
      deptRow[0] = 'មន្ទីរអប់រំ យុវជន និងកីឡា រាជធានី/ខេត្ត............';
      templateData.push(deptRow);

      // Row 4: Office Info - left aligned
      const officeRow = [...emptyRow];
      officeRow[0] = 'ការិយាល័យអប់រំ យុវជន និងកីឡារដ្ឋបាលក្រុង/ស្រុក/ខណ្ឌ.......................................';
      templateData.push(officeRow);

      // Row 5: School Name - left aligned
      const schoolRow = [...emptyRow];
      schoolRow[0] = schoolName;
      templateData.push(schoolRow);

      // Row 6: Attendance Title - centered
      templateData.push(['បញ្ជីហៅឈ្មោះសិស្ស', ...Array(38).fill('')]);

      // Row 7: Section Title - centered
      templateData.push([`ផ្នែកអវត្តមានប្រចាំខែ - ${className}`, ...Array(38).fill('')]);

      // Row 8: Month/Year - centered
      templateData.push([`ខែ: ${monthName}`, ...Array(38).fill('')]);

      // Row 9: Empty row
      templateData.push([...emptyRow]);

      // Row 10: Info row (month/year on left, student counts on right)
      const infoRow = [...emptyRow];
      infoRow[0] = 'ប្រចាំខែ:.............................';
      infoRow[25] = `សិស្សសរុប: ................${totalStudents}នាក់  ប្រុស...............${maleStudents}នាក់ ស្រី.................${femaleStudents}នាក់`;
      templateData.push(infoRow);

      // Single header row - Row 11
      const headerRow = ['ល.រ', 'អត្តលេខ', 'ឈ្មោះ', 'ភេទ'];
      for (let i = 1; i <= 31; i++) {
        headerRow.push(i.toString());
      }
      headerRow.push('ចំនួនអវត្តមាន');
      headerRow.push('ម');
      headerRow.push('អ');
      headerRow.push('យឺត');
      while (headerRow.length < 39) headerRow.push('');
      templateData.push(headerRow);

      // Data rows starting from row 8
      const dataRows = exportData.map(row => {
        const arr = [
          row['ល.រ'],
          row['អត្តលេខ'],
          row['ឈ្មោះ'],
          row['ភេទ']
        ];

        // Add day columns
        for (let i = 1; i <= 31; i++) {
          arr.push(row[i.toString()] || '');
        }

        // Add summary columns (including blank ផ្សេងៗ)
        arr.push(row['ម'], row['អ'], row['យឺត'], ''); // Last column is blank ផ្សេងៗ

        while (arr.length < 39) arr.push('');
        return arr;
      });

      templateData.push(...dataRows);

      // Note: Student counts already calculated earlier for use in header and footer
      // Note: Other calculation fields (attendance counts, percentage) left blank for manual entry as per standard format

      // Add footer section (summary statistics) - Structured format
      const emptyFooterRow = Array(39).fill('');

      // Empty row for spacing
      templateData.push([...emptyFooterRow]);

      // First summary row with calculations
      const summaryRow1 = [...emptyFooterRow];
      summaryRow1[0] = `- ចំនួនសិស្សក្នុងបញ្ជី..${totalStudents}..នាក់ ប្រុស..${maleStudents}..នាក់ ស្រី..${femaleStudents}..នាក់ ចំនួនពេលដែលសិស្សត្រូវមករៀន..... ចំនួនពេលអវត្តមាន...... ចំនួនពេលដែលសិស្សមករៀនពិតប្រាកដ........... គណនាភាគរយៈ  x100  = .............. %`;
      templateData.push(summaryRow1);

      // Second row - times list stopped
      const summaryRow2 = [...emptyFooterRow];
      summaryRow2[0] = '- បញ្ឈប់បញ្ជីក្នុងខែនេះនូវចំនួន..........ពេល';
      templateData.push(summaryRow2);

      // Empty row
      templateData.push([...emptyFooterRow]);

      // First date row - right aligned
      const dateRow1 = [...emptyFooterRow];
      dateRow1[30] = 'ថ្ងៃ........... ខែ ......... ថា្...... ព.ស.២៥...........';
      templateData.push(dateRow1);

      // Empty row between dates
      templateData.push([...emptyFooterRow]);

      // Second date row - right aligned
      const dateRow2 = [...emptyFooterRow];
      dateRow2[30] = 'ធ្វើនៅ.........................ថ្ងៃទី.......... ខែ............. ឆ្នាំ២០.......';
      templateData.push(dateRow2);

      // Empty row
      templateData.push([...emptyFooterRow]);

      // Signature labels row - left and right
      const signatureRow = [...emptyFooterRow];
      signatureRow[5] = 'បានឃើញ';
      signatureRow[33] = 'គ្រូប្រចាំថ្នាក់';
      templateData.push(signatureRow);

      // Position labels row - left side only
      const positionRow = [...emptyFooterRow];
      positionRow[4] = 'នាយកសាលា';
      templateData.push(positionRow);

      // Empty rows for actual signatures
      templateData.push([...emptyFooterRow]);
      templateData.push([...emptyFooterRow]);

      // Create worksheet
      const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

      // Set column widths - attendance sheet format
      const colWidths = [
        { wch: 5 },  // ល.រ (No.)
        { wch: 12 }, // អត្តសញ្ញាណ (Student Number)
        { wch: 25 }, // ឈ្មោះ (Name)
        { wch: 5 },  // ភេទ (Gender)
      ];

      // Add widths for day columns (1-31)
      for (let i = 1; i <= 31; i++) {
        colWidths.push({ wch: 3 }); // Day columns - narrow
      }

      // Add widths for summary columns
      colWidths.push({ wch: 5 });  // ម (Present)
      colWidths.push({ wch: 5 });  // អ (Absent)
      colWidths.push({ wch: 5 });  // យឺត (Late)
      colWidths.push({ wch: 20 }); // ផ្សេងៗ (Remarks)

      ws['!cols'] = colWidths;

      // Apply borders and styling to all cells
      const totalRows = templateData.length;
      const totalCols = 39; // 4 info + 31 days + 4 summary = 39 columns (A-AM)
      const dataEndRow = 12 + dataRows.length; // Last row of actual student data (headers 0-10, info row 11, table header 12, data starts at 13)

      for (let R = 0; R < totalRows; R++) {
        for (let C = 0; C < totalCols; C++) {
          const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });

          if (!ws[cellAddress]) {
            ws[cellAddress] = { t: 's', v: '' };
          }

          // Header section rows 0-1 - No borders, centered, bold
          if (R < 2) {
            ws[cellAddress].s = {
              alignment: {
                vertical: 'center',
                horizontal: 'center'
              },
              font: {
                name: 'Khmer OS Battambang',
                sz: 11,
                bold: true
              }
            };
          }
          // Department, office and school rows (rows 2-4) - No borders, left-aligned, bold
          else if (R >= 2 && R < 5) {
            ws[cellAddress].s = {
              alignment: {
                vertical: 'center',
                horizontal: 'left'
              },
              font: {
                name: 'Khmer OS Battambang',
                sz: 11,
                bold: true
              }
            };
          }
          // Remaining header section (rows 5-9) - No borders, centered, bold
          else if (R >= 5 && R < 10) {
            ws[cellAddress].s = {
              alignment: {
                vertical: 'center',
                horizontal: 'center'
              },
              font: {
                name: 'Khmer OS Battambang',
                sz: 11,
                bold: true
              }
            };
          }
          // Empty row (row 10) - No borders, centered
          else if (R === 10) {
            ws[cellAddress].s = {
              alignment: {
                vertical: 'center',
                horizontal: 'center'
              },
              font: {
                name: 'Khmer OS Battambang',
                sz: 10
              }
            };
          }
          // Info row (row 11) - No borders, left-aligned
          else if (R === 11) {
            ws[cellAddress].s = {
              alignment: {
                vertical: 'center',
                horizontal: 'left'
              },
              font: {
                name: 'Khmer OS Battambang',
                sz: 10
              }
            };
          }
          // Table header row (row 12) - Gray background, borders, bold
          else if (R === 12) {
            ws[cellAddress].s = {
              fill: {
                fgColor: { rgb: 'E0E0E0' }
              },
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
              font: {
                name: 'Khmer OS Battambang',
                sz: 10,
                bold: true
              }
            };
          }
          // Data rows (13 to dataEndRow) - Borders, centered except name column
          else if (R >= 13 && R <= dataEndRow) {
            ws[cellAddress].s = {
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              },
              alignment: {
                vertical: 'center',
                horizontal: C === 2 ? 'left' : 'center' // Column C (ឈ្មោះ) left-aligned
              },
              font: {
                name: 'Khmer OS Battambang',
                sz: 10
              }
            };
          }
          // Footer rows (after dataEndRow) - No borders, left-aligned
          else {
            ws[cellAddress].s = {
              alignment: {
                vertical: 'center',
                horizontal: 'left'
              },
              font: {
                name: 'Khmer OS Battambang',
                sz: 10
              }
            };
          }
        }
      }

      // Merge header cells
      ws['!merges'] = [
        // Row 1: Kingdom header - full width
        { s: { r: 0, c: 0 }, e: { r: 0, c: 38 } },
        // Row 2: Nation Religion King - three sections, no merge (displayed in columns 0, 15, 30)
        // Row 3: Department - full width
        { s: { r: 2, c: 0 }, e: { r: 2, c: 38 } },
        // Row 4: Office - full width
        { s: { r: 3, c: 0 }, e: { r: 3, c: 38 } },
        // Row 5: School - full width
        { s: { r: 4, c: 0 }, e: { r: 4, c: 38 } },
        // Row 6: Attendance Title - full width
        { s: { r: 5, c: 0 }, e: { r: 5, c: 38 } },
        // Row 7: Section Title - full width
        { s: { r: 6, c: 0 }, e: { r: 6, c: 38 } },
        // Row 8: Month - full width
        { s: { r: 7, c: 0 }, e: { r: 7, c: 38 } },
        // Row 9: Empty row - full width
        { s: { r: 8, c: 0 }, e: { r: 8, c: 38 } },
        // Row 10: Info row - no merge (spans naturally)
        // Row 11: Table header - no merge (each column has its own header)
      ];

      // Create workbook
      const wb = XLSXStyle.utils.book_new();
      XLSXStyle.utils.book_append_sheet(wb, ws, 'កត់ត្រាវត្តមាន');

      // Set workbook properties
      wb.Props = {
        Title: `បញ្ជីកត់ត្រាវត្តមាន - ${className}`,
        Subject: 'វត្តមានសិស្ស',
        Author: 'Teacher Portal',
        CreatedDate: new Date()
      };

      // Generate filename
      const filename = `Attendance_${cleanClassName}_${monthName.replace(/\s+/g, '_')}.xlsx`;

      // Export file
      XLSXStyle.writeFile(wb, filename, {
        bookType: 'xlsx',
        type: 'binary'
      });

      showSuccess(t('exportSuccess', 'Attendance exported successfully'));
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showError(t('exportFailed', 'Failed to export attendance'));
    }
  };

  // Export to CSV (Google Sheets compatible)
  const handleExportCSV = () => {
    try {
      const { exportData } = exportType === 'monthly'
        ? prepareMonthlyExportData()
        : prepareDailyExportData();

      const dateStr = formatDateToString(selectedDate);
      const currentDate = new Date(selectedDate);
      const monthName = formatDateKhmer(currentDate, 'monthYear');

      // Convert data to CSV format manually for better control
      const headers = Object.keys(exportData[0]);
      const csvRows = [];

      // Add headers
      csvRows.push(headers.join(','));

      // Add data rows
      exportData.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || '';
          // Escape values that contain commas, quotes, or newlines
          if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
            return `"${value.toString().replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvRows.push(values.join(','));
      });

      // Join all rows
      const csvContent = csvRows.join('\n');

      // Add UTF-8 BOM for better compatibility with Google Sheets
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;

      // Create blob and download
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `Attendance_${cleanClassName}_${monthName.replace(/\s+/g, '_')}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      showSuccess(t('exportSuccess', 'Attendance exported successfully'));
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      showError(t('exportFailed', 'Failed to export attendance'));
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setShowExportDropdown(!showExportDropdown)}
        variant="outline"
        size="sm"
        disabled={disabled || students.length === 0}
      >
        <Download className="h-4 w-4 mr-2" />
        {t('export', 'Export')}
        <ChevronDown className="h-4 w-4 ml-1" />
      </Button>

      {showExportDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <button
              onClick={handleExportExcel}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              {t('exportToExcel', 'Export to Excel')}
            </button>
            <button
              onClick={handleExportCSV}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              {t('exportToCSV', 'Export to CSV')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
