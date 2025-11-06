/**
 * Base Report Data Fetcher
 * Common utilities for fetching report data
 */

import { studentService } from '../../../utils/api/services/studentService';
import { parentService } from '../../../utils/api/services/parentService';

/**
 * Fetch students with full details and parent information
 * Used by reports that need complete student data
 */
export const fetchStudentsWithFullData = async (schoolId, options = {}) => {
  const {
    classId,
    apiFilters = {},
    onProgress = null,
  } = options;

  // Step 1: Fetch all students from school in batches
  let allBasicStudents = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const fetchParams = {
      page: currentPage,
      limit: 100, // API maximum
      ...apiFilters,
    };

    // Add class filter if specified
    if (classId && classId !== 'all') {
      fetchParams.classId = classId;
    }

    if (onProgress) {
      onProgress(`Fetching page ${currentPage}...`);
    }

    console.log(`📄 Fetching page ${currentPage} with limit 100...`, fetchParams);

    const studentsResponse = await studentService.getStudentsBySchoolClasses(
      schoolId,
      fetchParams
    );

    if (studentsResponse.success) {
      const pageStudents = studentsResponse.data || [];
      allBasicStudents = [...allBasicStudents, ...pageStudents];

      console.log(`✅ Page ${currentPage}: Fetched ${pageStudents.length} students (Total: ${allBasicStudents.length})`);

      // Check if there are more pages
      const pagination = studentsResponse.pagination;
      if (pagination && currentPage < pagination.pages) {
        currentPage++;
      } else {
        hasMorePages = false;
      }
    } else {
      console.warn(`⚠️ Failed to fetch page ${currentPage}`);
      hasMorePages = false;
    }
  }

  console.log(`✅ Fetched total of ${allBasicStudents.length} students from school`);

  if (allBasicStudents.length === 0) {
    return [];
  }

  // Step 2: For each student, fetch full details and parents
  const studentsWithFullData = await Promise.all(
    allBasicStudents.map(async (basicStudent) => {
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

        console.log(`👨‍👩‍👧 Parent response for student ${studentId}:`, {
          success: parentsResponse.success,
          hasData: !!parentsResponse.data,
        });

        // Handle parent data and fetch full parent details
        let parentsArray = [];
        if (parentsResponse.success && parentsResponse.data) {
          let rawParents = [];

          // Check if data is directly an array
          if (Array.isArray(parentsResponse.data)) {
            rawParents = parentsResponse.data;
          }
          // Check if data has a 'data' property that is an array
          else if (parentsResponse.data.data && Array.isArray(parentsResponse.data.data)) {
            rawParents = parentsResponse.data.data;
          }
          // Check if data has a 'parents' property that is an array
          else if (parentsResponse.data.parents && Array.isArray(parentsResponse.data.parents)) {
            rawParents = parentsResponse.data.parents;
          }
          // Otherwise treat as single parent object
          else if (typeof parentsResponse.data === 'object') {
            rawParents = [parentsResponse.data];
          }

          // Fetch full details for each parent using their user ID
          parentsArray = await Promise.all(
            rawParents.map(async (parent) => {
              try {
                const parentUserId = parent.user?.id || parent.userId;
                if (!parentUserId) {
                  return {
                    ...parent,
                    user: parent.user || {}
                  };
                }

                const parentUserResponse = await studentService.getStudentById(parentUserId);

                if (parentUserResponse.success && parentUserResponse.data) {
                  return {
                    ...parent,
                    user: parentUserResponse.data
                  };
                }

                return {
                  ...parent,
                  user: parent.user || {}
                };
              } catch (error) {
                console.warn(`❌ Failed to fetch parent user details:`, error);
                return {
                  ...parent,
                  user: parent.user || {}
                };
              }
            })
          );
        }

        console.log(`📋 Processed ${parentsArray.length} parents with full details for student ${studentId}`);

        // Combine full student data with parents
        return {
          ...fullStudent,
          studentId: studentId,
          parents: parentsArray
        };
      } catch (error) {
        console.warn(`❌ Failed to fetch data for student:`, error);
        return { ...basicStudent, parents: [] };
      }
    })
  );

  console.log(`✅ Processed ${studentsWithFullData.length} students with full data and parents`);
  return studentsWithFullData;
};

/**
 * Fetch basic student data
 * Used by reports that don't need full details
 */
export const fetchBasicStudents = async (schoolId, options = {}) => {
  const {
    classId,
    apiFilters = {},
  } = options;

  const fetchParams = {
    page: 1,
    limit: 100,
    ...apiFilters,
  };

  if (classId && classId !== 'all') {
    fetchParams.classId = classId;
  }

  const response = await studentService.getStudentsBySchoolClasses(
    schoolId,
    fetchParams
  );

  if (response.success) {
    const students = response.data || [];
    console.log(`✅ Fetched ${students.length} students for report`);
    return {
      students,
      schoolInfo: response.schoolInfo
    };
  }

  throw new Error(response.error || 'Failed to fetch students data');
};
