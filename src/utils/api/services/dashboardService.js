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
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch school BMI data');
      }

      const data = response.data;

      // Map API bmiDistribution to Khmer category names
      const bmiCategoryCount = {
        'ស្គមខ្លាំង': data.bmiDistribution?.severeThinness || 0, // Underweight
        'ស្គម': data.bmiDistribution?.thinness || 0, // Underweight
        'ធម្មតា': data.bmiDistribution?.normal || 0, // Normal
        'លើសទម្ងន់': data.bmiDistribution?.overweight || 0, // Overweight
        'ធាត់': data.bmiDistribution?.obesity || 0, // Obese
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
  },

  /**
   * Get school distribution data for admin dashboard
   * Fetches data from /api/v1/dashboard/distribution/schools endpoint
   * @param {Object} params - Filter parameters
   * @param {number} [params.zoneId] - Zone ID to filter by
   * @param {number} [params.provinceId] - Province ID to filter by
   * @param {number} [params.districtId] - District ID to filter by
   * @param {string} [params.sortBy] - Field to sort by: studentCount, teacherCount, classCount, schoolName
   * @param {string} [params.sortOrder] - Sort order: ASC, DESC
   * @returns {Promise<Object>} Response with school distribution data
   */
  async getSchoolDistribution(params = {}) {
    try {
      console.log('📊 Fetching school distribution data...', params);

      let url = `${ENDPOINTS.DASHBOARD.BASE}/distribution/schools`;

      // Add query parameters for filtering and sorting
      const queryParams = [];

      if (params.zoneId) {
        queryParams.push(`zoneId=${params.zoneId}`);
      }

      if (params.provinceId) {
        queryParams.push(`provinceId=${params.provinceId}`);
      }

      if (params.districtId) {
        queryParams.push(`districtId=${params.districtId}`);
      }

      if (params.sortBy) {
        queryParams.push(`sortBy=${params.sortBy}`);
      }

      if (params.sortOrder) {
        queryParams.push(`sortOrder=${params.sortOrder}`);
      }

      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(url)
      );

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch school distribution data');
      }

      // handleApiResponse wraps the backend payload in response.data
      // Backend payload shape:
      // {
      //   data: [...],
      //   totalSchools,
      //   totalStudents,
      //   totalTeachers,
      //   totalClasses
      // }
      const payload = response.data || {};

      // The payload includes a data array and totals at the top level
      const data = Array.isArray(payload.data) ? payload.data : [];
      const totalSchools = payload.totalSchools || payload.total_schools || 0;
      const totalStudents = payload.totalStudents || payload.total_students || 0;
      const totalTeachers = payload.totalTeachers || payload.total_teachers || 0;
      const totalClasses = payload.totalClasses || payload.total_classes || 0;

      // Transform data for chart usage if needed
      // Make sure data is an array before calling .map()
      const chartData = Array.isArray(data) ?
        data.map(school => ({
          name: school.schoolName || school.school_name || school.name || 'Unknown School',
          studentCount: school.studentCount || 0,
          teacherCount: school.teacherCount || 0,
          classCount: school.classCount || 0,
          value: school.studentCount || 0, // Default value when activeMetric is studentCount
          provinceId: school.provinceId,
          districtId: school.districtId
        })) : [];

      // Calculate summary statistics
      const summary = {
        totalSchools: totalSchools,
        totalStudents: totalStudents,
        totalTeachers: totalTeachers,
        totalClasses: totalClasses
      };

      return {
        success: true,
        data: chartData,
        raw: data,
        summary
      };

    } catch (error) {
      console.error('❌ Error in getSchoolDistribution:', error);
      return {
        success: false,
        error: error.message || 'Failed to get school distribution',
        data: [],
        raw: [],
        summary: {
          totalSchools: 0,
          totalStudents: 0,
          totalTeachers: 0,
          totalClasses: 0
        }
      };
    }
  },

  /**
   * Get user data completeness for tracking profile completion
   * @param {Object} params - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=30] - Items per page
   * @param {number} [params.roleId] - Filter by role ID
   * @param {number} [params.schoolId] - Filter by school ID
   * @param {boolean} [params.incompleteOnly] - Show only incomplete profiles
   * @returns {Promise<Object>} Response with data completeness information
   */
  async getDataCompleteness(params = {}) {
    try {
      console.log('📊 Fetching data completeness...', params);

      const queryParams = {
        page: params.page || 1,
        limit: params.limit || 30,
        ...params
      };

      const response = await handleApiResponse(() =>
        apiClient_.get(`${ENDPOINTS.USERS.BASE}/dashboard/data-completeness`, {
          params: queryParams
        })
      );

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch data completeness');
      }

      // handleApiResponse wraps the API response in { success: true, data: response }
      // The API response has structure: { data: [...], pagination: {...}, summary: {...} }
      const apiData = response.data || {};

      return {
        success: true,
        data: apiData.data || [],
        pagination: apiData.pagination || {},
        summary: apiData.summary || {}
      };

    } catch (error) {
      console.error('❌ Error in getDataCompleteness:', error);
      return {
        success: false,
        error: error.message || 'Failed to get data completeness',
        data: [],
        pagination: {},
        summary: {}
      };
    }
  }
};
