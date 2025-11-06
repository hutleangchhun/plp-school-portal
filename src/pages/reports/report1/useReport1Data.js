/**
 * Report 1: Student Name List - Data Hook
 * Custom hook to fetch and transform student name list data
 */

import { useState } from 'react';
import { studentService } from '../../../utils/api/services/studentService';
import { parentService } from '../../../utils/api/services/parentService';

/**
 * Custom hook to fetch and process Report 1 data
 */
export const useReport1Data = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch student name list data
   * @param {Object} params - Fetch parameters
   * @param {string} params.schoolId - School ID
   * @param {string} params.classId - Class ID (optional, 'all' for all classes)
   */
  const fetchData = async ({ schoolId, classId = 'all' }) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`📋 Fetching students with parent information for report1`);
      
      // Step 1: Fetch all students from school in batches (API limit is 100 per page)
      let allBasicStudents = [];
      let currentPage = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        console.log(`📄 Fetching page ${currentPage} with limit 100...`, { page: currentPage, limit: 100 });
        
        const fetchParams = {
          page: currentPage,
          limit: 100
        };
        
        // For report1, filter by selected class if specified
        if (classId && classId !== 'all') {
          fetchParams.classId = parseInt(classId);
        }
        
        const response = await studentService.getStudentsBySchoolClasses(schoolId, fetchParams);
        
        if (!response.success || !response.data) {
          throw new Error('Failed to fetch students');
        }
        
        const students = response.data;
        allBasicStudents = [...allBasicStudents, ...students];
        
        console.log(`✅ Page ${currentPage}: Fetched ${students.length} students (Total: ${allBasicStudents.length})`);
        
        // Check if there are more pages
        const totalPages = response.totalPages || Math.ceil((response.total || 0) / 100);
        hasMorePages = currentPage < totalPages && students.length === 100;
        currentPage++;
        
        // Safety limit to prevent infinite loops
        if (currentPage > 20) {
          console.warn('⚠️ Reached maximum page limit (20). Stopping pagination.');
          break;
        }
      }
      
      console.log(`✅ Fetched total of ${allBasicStudents.length} students from school`);

      if (allBasicStudents.length > 0) {
        const basicStudents = allBasicStudents;
        
        // Step 2: For each student, fetch full details using user.id and then fetch parents using studentId
        const studentsWithFullData = await Promise.all(
          basicStudents.map(async (basicStudent) => {
            try {
              const userId = basicStudent.user?.id || basicStudent.userId;
              const studentId = basicStudent.studentId || basicStudent.id;
              
              console.log(`🔍 Fetching full details for user ID: ${userId}, student ID: ${studentId}`);
              
              // Fetch full student details by user ID
              const fullStudentResponse = await studentService.getStudentById(userId);
              
              if (!fullStudentResponse.success || !fullStudentResponse.data) {
                console.warn(`⚠️ Could not fetch full details for user ${userId}`);
                return { ...basicStudent, parents: [] };
              }
              
              const fullStudent = fullStudentResponse.data;
              console.log(`✅ Got full student data for ${fullStudent.first_name} ${fullStudent.last_name}`);
              
              // Fetch parent information using studentId
              const parentsResponse = await parentService.getParentsByStudentId(studentId);
              
              // Handle parent data and fetch full parent details
              let parentsArray = [];
              if (parentsResponse.success && parentsResponse.data) {
                const rawParents = parentsResponse.data.data || parentsResponse.data || [];
                
                if (Array.isArray(rawParents) && rawParents.length > 0) {
                  // Fetch full details for each parent
                  const parentsWithFullData = await Promise.all(
                    rawParents.map(async (parent) => {
                      try {
                        const parentUserId = parent.user?.id || parent.userId;
                        if (!parentUserId) return parent;
                        
                        const parentDetailsResponse = await parentService.getParentById(parentUserId);
                        if (parentDetailsResponse.success && parentDetailsResponse.data) {
                          return {
                            ...parent,
                            ...parentDetailsResponse.data,
                            fullDetails: parentDetailsResponse.data
                          };
                        }
                        return parent;
                      } catch (error) {
                        console.error(`Error fetching parent details:`, error);
                        return parent;
                      }
                    })
                  );
                  parentsArray = parentsWithFullData;
                }
              }
              
              console.log(`📋 Processed ${parentsArray.length} parents with full details for student ${studentId}`);
              
              // Combine basic student info, full student details, and parents
              return {
                ...basicStudent,
                ...fullStudent,
                student: fullStudent.student || fullStudent,
                parents: parentsArray,
                userId: userId,
                studentId: studentId
              };
            } catch (error) {
              console.error(`Error processing student:`, error);
              return { ...basicStudent, parents: [] };
            }
          })
        );
        
        console.log(`✅ Processed ${studentsWithFullData.length} students with full data and parents`);
        console.log(`📊 Sample student with full data:`, studentsWithFullData[0]);
        
        setData(studentsWithFullData);
        return { success: true, data: studentsWithFullData };
      } else {
        setData([]);
        return { success: true, data: [] };
      }
    } catch (err) {
      console.error('Error fetching Report 1 data:', err);
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
