import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';
import { studentService } from './studentService.js';

/**
 * Dashboard API Service
 * Handles all dashboard-related API operations
 */
export const dashboardService = {
  /**
   * Fetch student demographics data (ethnic groups and accessibility)
   * Ultra-optimized version - Uses demographic data already in API response
   * Used by dashboard StudentDemographicsChart
   * Note: Backend returns ethnic_group and accessibility in student object
   * No additional API calls needed!
   */
  /**
   * Fetch ALL student demographics data at once (both ethnic and accessibility)
   * Optimized to reduce duplicate API calls when dashboard has multiple chart instances
   * Single fetch provides data for both StudentDemographicsChart instances
   */
  async fetchAllStudentsDemographics(schoolId) {
    try {
      let allStudents = [];
      let currentPage = 1;
      let hasMorePages = true;

      console.log('📄 Fetching ALL students demographics from school:', schoolId);

      while (hasMorePages) {
        const fetchParams = {
          page: currentPage,
          limit: 100, // API maximum
        };

        console.log(`📄 Fetching demographics page ${currentPage}...`);

        const studentsResponse = await studentService.getStudentsBySchoolClasses(
          schoolId,
          fetchParams
        );

        if (studentsResponse.success) {
          const pageStudents = studentsResponse.data || [];

          // Extract demographic data - fields are already at top level of student object
          const studentsWithDemographics = pageStudents.map((student) => ({
            ...student,
            // Keep existing fields as they are from API
            ethnic_group: student.ethnic_group,
            ethnicGroup: student.ethnicGroup || student.ethnic_group,
            accessibility: student.accessibility,
            specialNeeds: student.specialNeeds || student.accessibility,
          }));

          allStudents = [...allStudents, ...studentsWithDemographics];

          console.log(`✅ Page ${currentPage}: Fetched ${pageStudents.length} students (Total: ${allStudents.length})`);

          // Check if there are more pages
          const pagination = studentsResponse.pagination;
          if (pagination && currentPage < pagination.pages) {
            currentPage++;
          } else {
            hasMorePages = false;
          }
        } else {
          console.warn(`⚠️ Failed to fetch demographics page ${currentPage}`);
          hasMorePages = false;
        }
      }

      console.log(`✅ Fetched total of ${allStudents.length} students with demographics`);

      // Return filtered datasets for each chart
      return {
        all: allStudents,
        ethnic: allStudents.filter(s => s.ethnic_group || s.ethnicGroup),
        accessibility: allStudents.filter(s => s.accessibility || s.specialNeeds)
      };
    } catch (error) {
      console.error('❌ Error in fetchAllStudentsDemographics:', error);
      return { all: [], ethnic: [], accessibility: [] };
    }
  },

  async fetchStudentsDemographicsOnly(schoolId, options = {}) {
    try {
      const { apiFilters = {} } = options;

      let allStudents = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const fetchParams = {
          page: currentPage,
          limit: 100, // API maximum
          ...apiFilters,
        };

        console.log(`📄 Fetching demographics page ${currentPage}...`, fetchParams);

        const studentsResponse = await studentService.getStudentsBySchoolClasses(
          schoolId,
          fetchParams
        );

        if (studentsResponse.success) {
          const pageStudents = studentsResponse.data || [];

          // Extract demographic data - fields are already at top level of student object
          const studentsWithDemographics = pageStudents.map((student) => ({
            ...student,
            // Keep existing fields as they are from API
            ethnic_group: student.ethnic_group,
            ethnicGroup: student.ethnicGroup || student.ethnic_group,
            accessibility: student.accessibility,
            specialNeeds: student.specialNeeds || student.accessibility,
          }));

          allStudents = [...allStudents, ...studentsWithDemographics];

          console.log(`✅ Page ${currentPage}: Fetched ${pageStudents.length} students (Total: ${allStudents.length})`);

          // Check if there are more pages
          const pagination = studentsResponse.pagination;
          if (pagination && currentPage < pagination.pages) {
            currentPage++;
          } else {
            hasMorePages = false;
          }
        } else {
          console.warn(`⚠️ Failed to fetch demographics page ${currentPage}`);
          hasMorePages = false;
        }
      }

      console.log(`✅ Fetched total of ${allStudents.length} students with demographics`);
      return allStudents;
    } catch (error) {
      console.error('❌ Error in fetchStudentsDemographicsOnly:', error);
      return [];
    }
  },
  /**
   * Get BMI distribution for dashboard pie chart
   * @param {string|number} schoolId - The ID of the school
   * @param {Object} params - Query parameters for filtering (academicYear, etc.)
   * @returns {Promise<Object>} Response with BMI distribution
   */
  async getBMIDistribution(schoolId, params = {}) {
    try {
      if (!schoolId) {
        throw new Error('School ID is required to fetch BMI data');
      }

      console.log('📊 Fetching BMI data for school:', schoolId, 'with params:', params);

      const queryParams = {};

      // Add academic year filter if provided
      if (params.academicYear) {
        queryParams.academicYear = params.academicYear;
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.DASHBOARD.SCHOOL_BMI(schoolId), {
          params: queryParams
        })
      );

      console.log('📊 School BMI API response:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch school BMI data');
      }

      const data = response.data;

      // Map API bmiDistribution to Khmer category names
      const bmiCategoryCount = {
        'ស្គម': data.bmiDistribution?.underweight || 0, // Underweight
        'ធម្មតា': data.bmiDistribution?.normal || 0, // Normal
        'លើសទម្ងន់': data.bmiDistribution?.overweight || 0, // Overweight
        'ធាត់': data.bmiDistribution?.obese || 0, // Obese
        'មិនបានកំណត់': (data.totalStudents || 0) - (data.studentsWithBMIData || 0) // Unknown
      };

      const totalWithBMI = data.studentsWithBMIData || 0;

      // Transform to chart format
      const chartData = Object.entries(bmiCategoryCount)
        .filter(([_, count]) => count > 0) // Only show categories with data
        .map(([category, count]) => ({
          name: category,
          value: count,
          percentage: totalWithBMI > 0 ? ((count / totalWithBMI) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.value - a.value);

      console.log('📊 BMI Distribution formatted:', chartData);
      console.log(`📊 Total students: ${data.totalStudents}, With BMI: ${totalWithBMI}, Average BMI: ${data.averageBMI}`);

      return {
        success: true,
        data: chartData,
        summary: {
          totalStudents: data.totalStudents || 0,
          studentsWithBMIData: data.studentsWithBMIData || 0,
          averageBMI: data.averageBMI || 0,
          averageWeight: data.averageWeight_kg || 0,
          averageHeight: data.averageHeight_cm || 0
        }
      };

    } catch (error) {
      console.error('❌ Error in getBMIDistribution:', error);
      return {
        success: false,
        error: error.message || 'Failed to get BMI distribution',
        data: [],
        summary: {
          totalStudents: 0,
          studentsWithBMIData: 0,
          averageBMI: 0,
          averageWeight: 0,
          averageHeight: 0
        }
      };
    }
  }
};
