/**
 * Report 4: Student Absence Report Fetcher
 * បញ្ជីអវត្តមានសិស្ស
 */

import { attendanceService } from '../../../utils/api/services/attendanceService';

/**
 * Fetch data for Report 4 (Student Absence Report)
 */
export const fetchReport4Data = async (schoolId, options = {}) => {
  const { classId, selectedPeriod, selectedMonth, selectedYear } = options;

  // Calculate date range based on period
  let startDate, endDate;

  if (selectedPeriod === 'month' && selectedMonth) {
    // Specific month
    const monthIndex = parseInt(selectedMonth) - 1;
    const year = parseInt(selectedYear);
    startDate = new Date(year, monthIndex, 1);
    endDate = new Date(year, monthIndex + 1, 0);
  } else if (selectedPeriod === 'semester') {
    // Semester (6 months)
    const year = parseInt(selectedYear);
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 5, 30);
  } else {
    // Full year
    const year = parseInt(selectedYear);
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31);
  }

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  console.log('📅 Fetching attendance data:', {
    classId: classId !== 'all' ? classId : undefined,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  });

  // Fetch attendance records
  const attendanceResponse = await attendanceService.getAttendance({
    classId: classId !== 'all' ? parseInt(classId) : undefined,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    limit: 400
  });

  if (!attendanceResponse.success) {
    throw new Error(attendanceResponse.error || 'Failed to fetch attendance data');
  }

  // Group attendance by student and calculate absences
  const attendanceByStudent = {};

  attendanceResponse.data.forEach(record => {
    const userId = Number(record.userId || record.user_id);
    const recordDate = record.date ? record.date.split('T')[0] : null;

    if (!userId || isNaN(userId) || !recordDate) {
      return;
    }

    if (!attendanceByStudent[userId]) {
      // Extract user data from the attendance record
      const user = record.user || {};
      const student = record.student || {};

      attendanceByStudent[userId] = {
        userId: userId,
        studentId: student.studentId || student.id || userId,
        // Use first_name and last_name from user object
        firstName: user.first_name || user.firstName || '',
        lastName: user.last_name || user.lastName || '',
        khmerName: `${user.last_name || user.lastName || ''} ${user.first_name || user.firstName || ''}`.trim(),
        gender: user.gender || '',
        class: record.class,
        attendances: []
      };
    }
    attendanceByStudent[userId].attendances.push(record);
  });

  // Convert to array format expected by transformer
  const studentsWithAttendance = Object.values(attendanceByStudent);
  console.log(`✅ Report4: Processed ${studentsWithAttendance.length} students with attendance data`);

  return studentsWithAttendance;
};
