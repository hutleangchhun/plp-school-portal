/**
 * Report 4: Absence Report - Data Hook
 * Custom hook to fetch and transform absence report data
 */

import { useState } from 'react';
import { studentService } from '../../../utils/api/services/studentService';
import { attendanceService } from '../../../utils/api/services/attendanceService';

/**
 * Custom hook to fetch and process Report 4 data
 * @param {Object} filters - Report filters (classId, startDate, endDate, etc.)
 * @returns {Object} - { data, loading, error, fetchData }
 */
export const useReport4Data = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch absence report data
   * @param {Object} params - Fetch parameters
   * @param {string} params.schoolId - School ID
   * @param {string} params.classId - Class ID
   * @param {string} params.startDate - Start date (YYYY-MM-DD)
   * @param {string} params.endDate - End date (YYYY-MM-DD)
   * @param {number} params.apiLimit - API limit for attendance records
   */
  const fetchData = async ({ schoolId, classId, startDate, endDate, apiLimit = 200 }) => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch all students in the selected class
      console.log('👥 Fetching students for class:', classId);
      const studentsResponse = await studentService.getStudentsBySchoolClasses(schoolId, {
        classId: parseInt(classId),
        limit: 100,
        page: 1
      });

      if (!studentsResponse.success || !studentsResponse.data) {
        throw new Error('Failed to fetch students for the selected class');
      }

      const classStudents = studentsResponse.data;
      console.log(`👥 Found ${classStudents.length} students in class`);

      // Step 2: Fetch attendance records for the date range
      const attendanceResponse = await attendanceService.getAttendance({
        classId: parseInt(classId),
        startDate: startDate,
        endDate: endDate,
        limit: apiLimit
      });

      // Create a map of attendance records by userId
      const attendanceByUserId = {};
      if (attendanceResponse.success && attendanceResponse.data) {
        attendanceResponse.data.forEach(record => {
          const userId = record.userId;
          if (!attendanceByUserId[userId]) {
            attendanceByUserId[userId] = [];
          }
          attendanceByUserId[userId].push(record);
        });
      }

      // Step 3: Fetch full student details for each student (to get studentNumber and gender)
      const studentsWithFullDetails = await Promise.all(
        classStudents.map(async (student) => {
          try {
            const userId = student.userId || student.user?.id || student.id;
            
            // Fetch full student details
            const fullStudentResponse = await studentService.getStudentById(userId);
            
            if (!fullStudentResponse.success || !fullStudentResponse.data) {
              console.warn(`⚠️ Could not fetch full details for user ${userId}`);
              return student;
            }
            
            const fullStudent = fullStudentResponse.data;
            
            // Merge basic student info with full details
            return {
              ...student,
              student: fullStudent,
              studentNumber: fullStudent.student?.studentNumber || fullStudent.studentNumber || '',
              gender: fullStudent.gender || fullStudent.student?.gender || ''
            };
          } catch (error) {
            console.error(`Error fetching full details for student:`, error);
            return student;
          }
        })
      );

      console.log('✅ Fetched full details for all students');

      // Step 4: Combine students with their attendance records
      const studentsWithAttendance = studentsWithFullDetails.map(student => {
        const userId = student.userId || student.id;
        const attendances = attendanceByUserId[userId] || [];

        return {
          userId: userId,
          studentId: student.studentId || student.id || userId,
          firstName: student.firstName || student.first_name || '',
          lastName: student.lastName || student.last_name || '',
          khmerName: `${student.lastName || student.last_name || ''} ${student.firstName || student.first_name || ''}`.trim(),
          gender: student.gender || '',
          class: student.class,
          student: student.student || student,
          studentNumber: student.studentNumber || '',
          attendances: attendances
        };
      });

      console.log(`✅ Processed ${studentsWithAttendance.length} students with attendance data`);
      setData(studentsWithAttendance);
      return { success: true, data: studentsWithAttendance };
    } catch (err) {
      console.error('Error fetching Report 4 data:', err);
      setError(err.message || 'Failed to fetch report data');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    fetchData
  };
};
