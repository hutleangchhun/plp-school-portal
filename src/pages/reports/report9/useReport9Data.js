/**
 * Report 9: Ethnic Minority Students - Data Hook
 * Custom hook to fetch and transform ethnic minority report data
 */

import { useState } from 'react';
import { studentService } from '../../../utils/api/services/studentService';
import { parentService } from '../../../utils/api/services/parentService';

/**
 * Custom hook to fetch and process Report 9 data
 */
export const useReport9Data = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch ethnic minority students data
   * @param {Object} params - Fetch parameters
   * @param {string} params.schoolId - School ID
   */
  const fetchData = async ({ schoolId }) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`📋 Fetching ethnic minority students for report9`);
      
      // Fetch all students from school in batches
      let allBasicStudents = [];
      let currentPage = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        console.log(`📄 Fetching page ${currentPage} with limit 100...`);
        
        const fetchParams = {
          page: currentPage,
          limit: 100,
          isEtnicgroup: true // Filter for ethnic minority students
        };
        
        const response = await studentService.getStudentsBySchoolClasses(schoolId, fetchParams);
        
        if (!response.success || !response.data) {
          throw new Error('Failed to fetch students');
        }
        
        const students = response.data;
        allBasicStudents = [...allBasicStudents, ...students];
        
        console.log(`✅ Page ${currentPage}: Fetched ${students.length} students (Total: ${allBasicStudents.length})`);
        
        const totalPages = response.totalPages || Math.ceil((response.total || 0) / 100);
        hasMorePages = currentPage < totalPages && students.length === 100;
        currentPage++;
        
        if (currentPage > 20) {
          console.warn('⚠️ Reached maximum page limit (20)');
          break;
        }
      }
      
      console.log(`✅ Fetched total of ${allBasicStudents.length} ethnic minority students`);

      if (allBasicStudents.length > 0) {
        // Fetch full details for each student
        const studentsWithFullData = await Promise.all(
          allBasicStudents.map(async (basicStudent) => {
            try {
              const userId = basicStudent.user?.id || basicStudent.userId;
              const studentId = basicStudent.studentId || basicStudent.id;
              
              // Fetch full student details
              const fullStudentResponse = await studentService.getStudentById(userId);
              
              if (!fullStudentResponse.success || !fullStudentResponse.data) {
                return { ...basicStudent, parents: [] };
              }
              
              const fullStudent = fullStudentResponse.data;
              
              // Fetch parent information
              const parentsResponse = await parentService.getParentsByStudentId(studentId);
              
              let parentsArray = [];
              if (parentsResponse.success && parentsResponse.data) {
                const rawParents = parentsResponse.data.data || parentsResponse.data || [];
                
                if (Array.isArray(rawParents) && rawParents.length > 0) {
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
                        return parent;
                      }
                    })
                  );
                  parentsArray = parentsWithFullData;
                }
              }
              
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
        
        console.log(`✅ Processed ${studentsWithFullData.length} ethnic minority students`);
        
        // Client-side filter: Only include students with actual ethnic group values
        // Exclude students with no ethnic group, 'ខ្មែរ', 'Unknown', null, or empty
        const filteredStudents = studentsWithFullData.filter(student => {
          const ethnicGroup = student.ethnicGroup || student.ethnic_group || '';
          const isValidEthnicGroup = ethnicGroup && 
                                    ethnicGroup !== '' && 
                                    ethnicGroup !== 'ខ្មែរ' && 
                                    ethnicGroup !== 'Unknown' && 
                                    ethnicGroup !== 'unknown' && 
                                    ethnicGroup !== 'null' &&
                                    ethnicGroup.toLowerCase() !== 'khmer';
          return isValidEthnicGroup;
        });
        
        console.log(`🔍 Filtered to ${filteredStudents.length} students with valid ethnic minority groups`);
        
        setData(filteredStudents);
        return { success: true, data: filteredStudents };
      } else {
        setData([]);
        return { success: true, data: [] };
      }
    } catch (err) {
      console.error('Error fetching Report 9 data:', err);
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
