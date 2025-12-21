import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatDateKhmer } from './formatters';
import { formatClassIdentifier } from './helpers';

/**
 * Export schedule data to PDF
 * @param {Array} schedules - Array of schedule objects
 * @param {Object} options - Export options
 * @param {Function} options.t - Translation function
 * @param {Object} options.classInfo - Class information for the header
 * @param {string} options.teacherName - Teacher name for the header
 * @param {string} options.academicYear - Academic year
 * @param {string} options.shift - Shift (morning/afternoon/all)
 * @param {string} filename - Output filename
 */
export const exportScheduleToPDF = (schedules = [], options = {}, filename = 'schedule.pdf') => {
  const { t, classInfo, teacherName, academicYear, shift } = options;

  // Create new PDF document
  const doc = new jsPDF('p', 'mm', 'a4');

  // Set font (use default for now, as Khmer fonts need to be embedded separately)
  doc.setFont('helvetica');

  // Add title
  doc.setFontSize(16);
  const title = t ? t('weeklySchedule', 'Weekly Schedule') : 'Weekly Schedule';
  doc.text(title, 105, 15, { align: 'center' });

  // Add header information
  doc.setFontSize(10);
  let yPosition = 25;

  if (teacherName) {
    doc.text(`${t ? t('teacher', 'Teacher') : 'Teacher'}: ${teacherName}`, 15, yPosition);
    yPosition += 6;
  }

  if (classInfo) {
    const classDisplay = formatClassIdentifier(classInfo.gradeLevel, classInfo.section);
    doc.text(`${t ? t('class', 'Class') : 'Class'}: ${classDisplay}`, 15, yPosition);
    yPosition += 6;
  }

  if (academicYear) {
    doc.text(`${t ? t('academicYear', 'Academic Year') : 'Academic Year'}: ${academicYear}`, 15, yPosition);
    yPosition += 6;
  }

  if (shift && shift !== 'all') {
    const shiftLabel = shift === 'morning'
      ? (t ? t('morningShift', 'Morning Shift') : 'Morning Shift')
      : (t ? t('afternoonShift', 'Afternoon Shift') : 'Afternoon Shift');
    doc.text(`${t ? t('shift', 'Shift') : 'Shift'}: ${shiftLabel}`, 15, yPosition);
    yPosition += 6;
  }

  doc.text(`${t ? t('generated', 'Generated') : 'Generated'}: ${formatDateKhmer(new Date(), 'short')}`, 15, yPosition);
  yPosition += 10;

  // Define day order
  const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  // Get day label translation
  const getDayLabel = (day) => {
    const labels = {
      MONDAY: t ? t('monday', 'Monday') : 'Monday',
      TUESDAY: t ? t('tuesday', 'Tuesday') : 'Tuesday',
      WEDNESDAY: t ? t('wednesday', 'Wednesday') : 'Wednesday',
      THURSDAY: t ? t('thursday', 'Thursday') : 'Thursday',
      FRIDAY: t ? t('friday', 'Friday') : 'Friday',
      SATURDAY: t ? t('saturday', 'Saturday') : 'Saturday',
      SUNDAY: t ? t('sunday', 'Sunday') : 'Sunday',
    };
    return labels[day] || day;
  };

  // Format time (remove seconds if present)
  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  // Group schedules by day
  const schedulesByDay = {};
  dayOrder.forEach(day => {
    schedulesByDay[day] = schedules
      .filter(s => s.dayOfWeek === day)
      .sort((a, b) => {
        const timeA = a.startTime || '';
        const timeB = b.startTime || '';
        return timeA.localeCompare(timeB);
      });
  });

  // Prepare table data
  const tableData = [];

  dayOrder.forEach(day => {
    const daySchedules = schedulesByDay[day];
    if (daySchedules && daySchedules.length > 0) {
      daySchedules.forEach((schedule, index) => {
        const subjectName = schedule.subject?.khmer_name ||
                           schedule.subject?.name ||
                           schedule.subject?.subject_name_en ||
                           t ? t('notAvailable', 'N/A') : 'N/A';

        const className = schedule.class?.gradeLevel
          ? formatClassIdentifier(schedule.class.gradeLevel, schedule.class.section)
          : '';

        const timeRange = `${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`;
        const room = schedule.room || '';
        const location = schedule.location || '';

        tableData.push([
          index === 0 ? getDayLabel(day) : '', // Only show day name for first entry
          timeRange,
          subjectName,
          className,
          room,
          location
        ]);
      });
    } else {
      // Add empty row for days with no schedules
      tableData.push([
        getDayLabel(day),
        t ? t('noSchedule', 'No schedule') : 'No schedule',
        '',
        '',
        '',
        ''
      ]);
    }
  });

  // Add table using autoTable
  doc.autoTable({
    startY: yPosition,
    head: [[
      t ? t('day', 'Day') : 'Day',
      t ? t('time', 'Time') : 'Time',
      t ? t('subject', 'Subject') : 'Subject',
      t ? t('class', 'Class') : 'Class',
      t ? t('room', 'Room') : 'Room',
      t ? t('location', 'Location') : 'Location'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak',
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue color
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: 'bold' }, // Day
      1: { cellWidth: 35 }, // Time
      2: { cellWidth: 45 }, // Subject
      3: { cellWidth: 25 }, // Class
      4: { cellWidth: 20 }, // Room
      5: { cellWidth: 30 }  // Location
    },
    didParseCell: function(data) {
      // Add alternating row colors for better readability
      if (data.section === 'body') {
        const dayColumn = data.table.body[data.row.index][0];
        if (dayColumn.content) {
          // New day section - add slight background
          data.cell.styles.fillColor = [243, 244, 246]; // gray-100
        }
      }
    },
    margin: { top: yPosition, left: 15, right: 15 }
  });

  // Add footer with summary
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(9);
  doc.text(
    `${t ? t('totalSchedules', 'Total Schedules') : 'Total Schedules'}: ${schedules.length}`,
    15,
    finalY
  );

  // Save the PDF
  doc.save(filename);
  return true;
};

/**
 * Get timestamped filename for exports
 */
export const getScheduleFilename = (prefix = 'schedule', extension = 'pdf') => {
  const timestamp = new Date().toISOString().split('T')[0];
  return `${prefix}_${timestamp}.${extension}`;
};

/**
 * Export schedule to CSV format
 */
export const exportScheduleToCSV = (schedules = [], options = {}, filename = 'schedule.csv') => {
  const { t } = options;

  // Define headers
  const headers = [
    t ? t('day', 'Day') : 'Day',
    t ? t('time', 'Time') : 'Time',
    t ? t('subject', 'Subject') : 'Subject',
    t ? t('class', 'Class') : 'Class',
    t ? t('room', 'Room') : 'Room',
    t ? t('location', 'Location') : 'Location',
    t ? t('status', 'Status') : 'Status'
  ];

  // Get day label translation
  const getDayLabel = (day) => {
    const labels = {
      MONDAY: t ? t('monday', 'Monday') : 'Monday',
      TUESDAY: t ? t('tuesday', 'Tuesday') : 'Tuesday',
      WEDNESDAY: t ? t('wednesday', 'Wednesday') : 'Wednesday',
      THURSDAY: t ? t('thursday', 'Thursday') : 'Thursday',
      FRIDAY: t ? t('friday', 'Friday') : 'Friday',
      SATURDAY: t ? t('saturday', 'Saturday') : 'Saturday',
      SUNDAY: t ? t('sunday', 'Sunday') : 'Sunday',
    };
    return labels[day] || day;
  };

  // Format time
  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  // Prepare CSV data
  const csvData = schedules.map(schedule => {
    const subjectName = schedule.subject?.khmer_name ||
                       schedule.subject?.name ||
                       schedule.subject?.subject_name_en ||
                       'N/A';

    const className = schedule.class?.gradeLevel
      ? formatClassIdentifier(schedule.class.gradeLevel, schedule.class.section)
      : '';

    const timeRange = `${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`;

    return [
      getDayLabel(schedule.dayOfWeek),
      timeRange,
      subjectName,
      className,
      schedule.room || '',
      schedule.location || '',
      schedule.status || 'ACTIVE'
    ];
  });

  // Combine headers and data
  const csvContent = [
    headers.join(','),
    ...csvData.map(row =>
      row.map(cell => {
        const value = String(cell);
        // Escape commas and quotes
        return value.includes(',') || value.includes('"') || value.includes('\n')
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      }).join(',')
    )
  ].join('\n');

  // Create and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);

  return true;
};

/**
 * Export schedule data to Excel
 * @param {Array} schedules - Array of schedule objects
 * @param {Object} options - Export options
 * @param {Function} options.t - Translation function
 * @param {Object} options.classInfo - Class information for the header
 * @param {string} options.teacherName - Teacher name for the header
 * @param {string} options.academicYear - Academic year
 * @param {string} options.shift - Shift (morning/afternoon/all)
 * @param {string} filename - Output filename
 */
export const exportScheduleToExcel = (schedules = [], options = {}, filename = 'schedule.xlsx') => {
  const { t, classInfo, teacherName, academicYear, shift } = options;

  // Define day order
  const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  // Get day label translation
  const getDayLabel = (day) => {
    const labels = {
      MONDAY: t ? t('monday', 'Monday') : 'Monday',
      TUESDAY: t ? t('tuesday', 'Tuesday') : 'Tuesday',
      WEDNESDAY: t ? t('wednesday', 'Wednesday') : 'Wednesday',
      THURSDAY: t ? t('thursday', 'Thursday') : 'Thursday',
      FRIDAY: t ? t('friday', 'Friday') : 'Friday',
      SATURDAY: t ? t('saturday', 'Saturday') : 'Saturday',
      SUNDAY: t ? t('sunday', 'Sunday') : 'Sunday',
    };
    return labels[day] || day;
  };

  // Format time
  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  // Prepare header information
  const headerInfo = [];
  headerInfo.push([t ? t('weeklySchedule', 'Weekly Schedule') : 'Weekly Schedule']);
  headerInfo.push([]); // Empty row

  if (teacherName) {
    headerInfo.push([`${t ? t('teacher', 'Teacher') : 'Teacher'}:`, teacherName]);
  }

  if (classInfo) {
    const classDisplay = formatClassIdentifier(classInfo.gradeLevel, classInfo.section);
    headerInfo.push([`${t ? t('class', 'Class') : 'Class'}:`, classDisplay]);
  }

  if (academicYear) {
    headerInfo.push([`${t ? t('academicYear', 'Academic Year') : 'Academic Year'}:`, academicYear]);
  }

  if (shift && shift !== 'all') {
    const shiftLabel = shift === 'morning'
      ? (t ? t('morningShift', 'Morning Shift') : 'Morning Shift')
      : shift === 'afternoon'
      ? (t ? t('afternoonShift', 'Afternoon Shift') : 'Afternoon Shift')
      : (t ? t('noShift', 'No Shift') : 'No Shift');
    headerInfo.push([`${t ? t('shift', 'Shift') : 'Shift'}:`, shiftLabel]);
  }

  headerInfo.push([`${t ? t('generated', 'Generated') : 'Generated'}:`, formatDateKhmer(new Date(), 'short')]);
  headerInfo.push([]); // Empty row

  // Prepare table headers
  const tableHeaders = [
    t ? t('day', 'Day') : 'Day',
    t ? t('time', 'Time') : 'Time',
    t ? t('subject', 'Subject') : 'Subject',
    t ? t('class', 'Class') : 'Class',
    t ? t('room', 'Room') : 'Room',
    t ? t('location', 'Location') : 'Location',
    t ? t('status', 'Status') : 'Status'
  ];

  // Group schedules by day
  const schedulesByDay = {};
  dayOrder.forEach(day => {
    schedulesByDay[day] = schedules
      .filter(s => s.dayOfWeek === day)
      .sort((a, b) => {
        const timeA = a.startTime || '';
        const timeB = b.startTime || '';
        return timeA.localeCompare(timeB);
      });
  });

  // Prepare table data
  const tableData = [];

  dayOrder.forEach(day => {
    const daySchedules = schedulesByDay[day];
    if (daySchedules && daySchedules.length > 0) {
      daySchedules.forEach((schedule, index) => {
        const subjectName = schedule.subject?.khmer_name ||
                           schedule.subject?.name ||
                           schedule.subject?.subject_name_en ||
                           t ? t('notAvailable', 'N/A') : 'N/A';

        const className = schedule.class?.gradeLevel
          ? formatClassIdentifier(schedule.class.gradeLevel, schedule.class.section)
          : '';

        const timeRange = `${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`;
        const room = schedule.room || '';
        const location = schedule.location || '';
        const status = schedule.status || 'ACTIVE';

        tableData.push([
          index === 0 ? getDayLabel(day) : '', // Only show day name for first entry
          timeRange,
          subjectName,
          className,
          room,
          location,
          status
        ]);
      });
    } else {
      // Add empty row for days with no schedules
      tableData.push([
        getDayLabel(day),
        t ? t('noSchedule', 'No schedule') : 'No schedule',
        '',
        '',
        '',
        '',
        ''
      ]);
    }
  });

  // Combine all data
  const worksheetData = [
    ...headerInfo,
    tableHeaders,
    ...tableData,
    [], // Empty row
    [`${t ? t('totalSchedules', 'Total Schedules') : 'Total Schedules'}:`, schedules.length]
  ];

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // Day
    { wch: 18 }, // Time
    { wch: 25 }, // Subject
    { wch: 12 }, // Class
    { wch: 12 }, // Room
    { wch: 20 }, // Location
    { wch: 12 }  // Status
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, t ? t('weeklySchedule', 'Weekly Schedule') : 'Schedule');

  // Save file
  XLSX.writeFile(workbook, filename);
  return true;
};
