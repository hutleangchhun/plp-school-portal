import { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';

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
 * @param {Date} props.selectedDate - Selected date for export
 * @param {string} props.exportType - 'daily' or 'monthly'
 * @param {boolean} props.disabled - Disable export button
 */
export default function AttendanceExport({
  students = [],
  attendance = {},
  className = 'Unknown-Class',
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
        'អត្តសញ្ញាណ': student.studentId || student.id || '',
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
        'អត្តសញ្ញាណ': student.studentId || student.id || '',
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
          }
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
      const monthName = currentDate.toLocaleDateString('km-KH', { month: 'long', year: 'numeric' });

      // Create template with headers
      const templateData = [
        // Official Header - Row 1
        ['ព្រះរាជាណាចក្រកម្ពុជា', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // Nation Religion King - Row 2
        ['ជាតិ       សាសនា       ព្រះមហាក្សត្រ', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // School Info - Row 3
        ['សាលា: _______________', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // Attendance Title - Row 4
        [`បញ្ជីកត់ត្រាវត្តមាន - ${className}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // Month/Year - Row 5
        [`ខែ: ${monthName}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // Empty row - Row 6
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ];

      // Header row - Row 7
      const headerRow = ['ល.រ', 'អត្តសញ្ញាណ', 'ឈ្មោះ', 'ភេទ'];
      for (let i = 1; i <= 31; i++) {
        headerRow.push(i.toString());
      }
      headerRow.push('ម', 'អ', 'យឺត');
      while (headerRow.length < 38) headerRow.push('');
      templateData.push(headerRow);

      // Data rows starting from row 8
      const dataRows = exportData.map(row => {
        const arr = [
          row['ល.រ'],
          row['អត្តសញ្ញាណ'],
          row['ឈ្មោះ'],
          row['ភេទ']
        ];

        // Add day columns
        for (let i = 1; i <= 31; i++) {
          arr.push(row[i.toString()] || '');
        }

        // Add summary columns
        arr.push(row['ម'], row['អ'], row['យឺត']);

        while (arr.length < 38) arr.push('');
        return arr;
      });

      templateData.push(...dataRows);

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

      ws['!cols'] = colWidths;

      // Apply borders and styling to all cells
      const totalRows = templateData.length;
      const totalCols = 38; // 4 info + 31 days + 3 summary = 38 columns (A-AL)

      for (let R = 0; R < totalRows; R++) {
        for (let C = 0; C < totalCols; C++) {
          const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });

          if (!ws[cellAddress]) {
            ws[cellAddress] = { t: 's', v: '' };
          }

          // Header section (rows 0-5) - No borders, centered, bold
          if (R < 6) {
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
          // Column header row (row 6) - Gray background, borders, bold
          else if (R === 6) {
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
          // Data rows (7+) - Borders, centered except name column
          else {
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
        }
      }

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
      const monthName = currentDate.toLocaleDateString('km-KH', { month: 'long', year: 'numeric' });

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
