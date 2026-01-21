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
   * @param {number} [params.schoolId] - School ID to filter by (for director dashboard)
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

      if (params.schoolId) {
        queryParams.push(`schoolId=${params.schoolId}`);
      }

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
      const totalSchools = payload.totalSchools ?? payload.total_schools ?? 0;
      const totalStudents = payload.totalStudents ?? payload.total_students ?? 0;
      const totalStudentsWithClass = payload.totalStudentsWithClass ?? payload.total_students_with_class ?? 0;
      const totalStudentsNoClass = payload.totalStudentsNoClass ?? payload.total_students_no_class ?? 0;
      const totalTeachers = payload.totalTeachers ?? payload.total_teachers ?? 0;
      const totalClasses = payload.totalClasses ?? payload.total_classes ?? 0;

      // Transform data for chart usage if needed
      // Make sure data is an array before calling .map()
      const chartData = Array.isArray(data) ?
        data.map(school => ({
          name: school.schoolName || school.school_name || school.name || 'Unknown School',
          studentsWithClassCount: school.studentsWithClassCount ?? 0,
          totalStudentsCount: school.totalStudentsCount ?? 0,
          studentsNoClassCount: school.studentsNoClassCount ?? 0,
          teacherCount: school.teacherCount || 0,
          classCount: school.classCount || 0,
          value: school.totalStudentsCount || 0, // Default value use total
          provinceId: school.provinceId,
          districtId: school.districtId
        })) : [];

      // Calculate summary statistics including all role counts
      let totalDirectors = 0;
      let totalDeputyPrincipals = 0;
      let totalSecretaries = 0;
      let totalTreasurers = 0;
      let totalLibrarians = 0;
      let totalWorkshop = 0;
      let totalSecurity = 0;
      let totalTeacherIct = 0;

      // Aggregate all role counts from individual schools
      if (Array.isArray(data)) {
        data.forEach(school => {
          totalDirectors += school.directorCount || 0;
          totalDeputyPrincipals += school.deputyPrincipalCount || 0;
          totalSecretaries += school.schoolSecretaryCount || 0;
          totalTreasurers += school.schoolTreasurerCount || 0;
          totalLibrarians += school.schoolLibrarianCount || 0;
          totalWorkshop += school.schoolWorkshopCount || 0;
          totalSecurity += school.schoolSecurityCount || 0;
          totalTeacherIct += school.teacherIctCount || 0;
        });
      }

      const summary = {
        totalSchools: totalSchools,
        totalStudents: totalStudents,
        totalStudentsWithClass: totalStudentsWithClass,
        totalStudentsNoClass: totalStudentsNoClass,
        totalTeachers: totalTeachers,
        totalClasses: totalClasses,
        totalDirectors: totalDirectors,
        totalDeputyPrincipals: totalDeputyPrincipals,
        totalSecretaries: totalSecretaries,
        totalTreasurers: totalTreasurers,
        totalLibrarians: totalLibrarians,
        totalWorkshop: totalWorkshop,
        totalSecurity: totalSecurity,
        totalTeacherIct: totalTeacherIct
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
          totalClasses: 0,
          totalDirectors: 0,
          totalDeputyPrincipals: 0,
          totalSecretaries: 0,
          totalTreasurers: 0,
          totalLibrarians: 0,
          totalWorkshop: 0,
          totalSecurity: 0,
          totalTeacherIct: 0
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
  },

  /**
   * Get field completion statistics for tracking which profile fields are incomplete
   * @param {Object} params - Query parameters
   * @param {number} [params.roleId] - Filter by role ID
   * @param {number} [params.schoolId] - Filter by school ID
   * @returns {Promise<Object>} Response with field statistics
   */
  async getDataCompletenessSummary(params = {}) {
    try {
      console.log('📊 Fetching data completeness summary...', params);

      const queryParams = { ...params };

      const response = await handleApiResponse(() =>
        apiClient_.get(`${ENDPOINTS.USERS.BASE}/dashboard/data-completeness-summary`, {
          params: queryParams
        })
      );

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch data completeness summary');
      }

      // handleApiResponse wraps the API response in { success: true, data: response }
      // The API response has structure: { summary: {...}, fieldStats: [...] }
      const apiData = response.data || {};

      return {
        success: true,
        summary: apiData.summary || {},
        fieldStats: apiData.fieldStats || []
      };

    } catch (error) {
      console.error('❌ Error in getDataCompletenessSummary:', error);
      return {
        success: false,
        error: error.message || 'Failed to get data completeness summary',
        summary: {},
        fieldStats: []
      };
    }
  },

  /**
   * Get missing fields statistics for tracking incomplete profile fields
   * @param {Object} params - Query parameters
   * @param {number} [params.roleId] - Filter by role ID (8=Teacher, 9=Student, etc.)
   * @param {number} [params.schoolId] - Filter by school ID
   * @param {number} [params.provinceId] - Filter by province ID
   * @returns {Promise<Object>} Response with missing fields statistics
   */
  async getMissingFieldsStatistics(params = {}) {
    try {
      console.log('📊 Fetching missing fields statistics...', params);

      const queryParams = { ...params };

      const response = await handleApiResponse(() =>
        apiClient_.get(`${ENDPOINTS.USERS.BASE}/dashboard/missing-fields-statistics`, {
          params: queryParams
        })
      );

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch missing fields statistics');
      }

      // handleApiResponse wraps the API response in { success: true, data: response }
      const apiData = response.data || {};

      return {
        success: true,
        data: apiData
      };

    } catch (error) {
      console.error('❌ Error in getMissingFieldsStatistics:', error);
      return {
        success: false,
        error: error.message || 'Failed to get missing fields statistics',
        data: {}
      };
    }
  },

  /**
   * Get teacher employment type statistics
   * Fetches data from /api/v1/dashboard/teachers/employment-type/stats endpoint
   * @param {Object} params - Filter parameters
   * @param {number} [params.provinceId] - Province ID to filter by
   * @param {number} [params.districtId] - District ID to filter by
   * @param {number} [params.schoolId] - School ID to filter by
   * @returns {Promise<Object>} Response with employment type statistics
   */
  async getTeacherEmploymentTypeStats(params = {}) {
    try {
      console.log('📊 Fetching teacher employment type statistics...', params);

      let url = `${ENDPOINTS.DASHBOARD.BASE}/teachers/employment-type/stats`;

      // Add query parameters for filtering
      const queryParams = [];

      if (params.provinceId) {
        queryParams.push(`provinceId=${params.provinceId}`);
      }

      if (params.districtId) {
        queryParams.push(`districtId=${params.districtId}`);
      }

      if (params.schoolId) {
        queryParams.push(`schoolId=${params.schoolId}`);
      }

      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(url)
      );

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch employment type statistics');
      }

      const apiData = response.data || {};

      return {
        success: true,
        data: apiData
      };

    } catch (error) {
      console.error('❌ Error in getTeacherEmploymentTypeStats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get teacher employment type statistics',
        data: {}
      };
    }
  },

  /**
   * Get teacher extra learning tool statistics
   * Fetches data from /api/v1/dashboard/teachers/extra-learning-tool/stats endpoint
   * @param {Object} params - Filter parameters
   * @param {number} [params.provinceId] - Province ID to filter by
   * @param {number} [params.districtId] - District ID to filter by
   * @param {number} [params.schoolId] - School ID to filter by
   * @returns {Promise<Object>} Response with extra learning tool statistics
   */
  async getTeacherExtraLearningToolStats(params = {}) {
    try {
      console.log('📊 Fetching teacher extra learning tool statistics...', params);

      let url = `${ENDPOINTS.DASHBOARD.BASE}/admin/extra-learning`;

      // Add query parameters for filtering
      const queryParams = [];

      if (params.provinceId) {
        queryParams.push(`provinceId=${params.provinceId}`);
      }

      if (params.districtId) {
        queryParams.push(`districtId=${params.districtId}`);
      }

      if (params.schoolId) {
        queryParams.push(`schoolId=${params.schoolId}`);
      }

      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(url)
      );

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch extra learning tool statistics');
      }

      const apiData = response.data || {};

      return {
        success: true,
        data: apiData
      };

    } catch (error) {
      console.error('❌ Error in getTeacherExtraLearningToolStats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get teacher extra learning tool statistics',
        data: {}
      };
    }
  },

  /**
   * Get student ethnic group distribution
   * Fetches data from /api/v1/dashboard/students/ethnic-group endpoint
   * @param {Object} params - Filter parameters
   * @param {number} [params.provinceId] - Province ID (optional)
   * @param {number} [params.districtId] - District ID (optional)
   * @param {number} [params.schoolId] - School ID (optional - omit for all schools)
   * @param {number} [params.roleId=9] - Role ID (default: 9 for students)
   * @returns {Promise<Object>} Response with ethnic group distribution
   */
  async getStudentEthnicGroupDistribution(params = {}) {
    try {
      console.log('📊 Fetching student ethnic group distribution...', params);

      const queryParams = {
        roleId: params.roleId || 9
      };

      // Add location filters if provided
      if (params.provinceId) {
        queryParams.provinceId = params.provinceId;
      }
      if (params.districtId) {
        queryParams.districtId = params.districtId;
      }
      if (params.schoolId) {
        queryParams.schoolId = params.schoolId;
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(`${ENDPOINTS.DASHBOARD.BASE}/student-ethnic-group`, {
          params: queryParams
        })
      );

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch ethnic group distribution');
      }

      const apiData = response.data || [];

      return {
        success: true,
        data: apiData
      };

    } catch (error) {
      console.error('❌ Error in getStudentEthnicGroupDistribution:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ethnic group distribution',
        data: []
      };
    }
  },

  /**
   * Get student accessibility needs distribution
   * Fetches data from /api/v1/dashboard/students/accessibility endpoint
   * @param {Object} params - Filter parameters
   * @param {number} [params.provinceId] - Province ID (optional)
   * @param {number} [params.districtId] - District ID (optional)
   * @param {number} [params.schoolId] - School ID (optional - omit for all schools)
   * @param {number} [params.roleId=9] - Role ID (default: 9 for students)
   * @returns {Promise<Object>} Response with accessibility distribution
   */
  async getStudentAccessibilityDistribution(params = {}) {
    try {
      console.log('📊 Fetching student accessibility distribution...', params);

      const queryParams = {
        roleId: params.roleId || 9
      };

      // Add location filters if provided
      if (params.provinceId) {
        queryParams.provinceId = params.provinceId;
      }
      if (params.districtId) {
        queryParams.districtId = params.districtId;
      }
      if (params.schoolId) {
        queryParams.schoolId = params.schoolId;
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(`${ENDPOINTS.DASHBOARD.BASE}/student-accessibility`, {
          params: queryParams
        })
      );

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch accessibility distribution');
      }

      const apiData = response.data || [];

      return {
        success: true,
        data: apiData
      };

    } catch (error) {
      console.error('❌ Error in getStudentAccessibilityDistribution:', error);
      return {
        success: false,
        error: error.message || 'Failed to get accessibility distribution',
        data: []
      };
    }
  },

  /**
   * Get user registration statistics for dashboard
   * Wraps /dashboard/users/registration-stats
   * @param {Object} params - Filter parameters
   * @param {number} [params.roleId] - Role ID to filter by (e.g. 9 for students)
   * @param {string|number} [params.gradeLevel] - Grade level enum value (e.g. 0 for all)
   * @param {string} [params.startDate] - Start date (YYYY-MM-DD)
   * @param {string} [params.endDate] - End date (YYYY-MM-DD)
   * @param {number[]} [params.excludeSchoolIds] - List of school IDs to exclude
   * @param {number} [params.provinceId] - Province ID (optional)
   * @param {number} [params.districtId] - District ID (optional)
   * @param {number} [params.schoolId] - School ID (optional - omit for all schools)
   * @returns {Promise<Object>} Registration stats response
   */
  async getUserRegistrationStats(params = {}) {
    try {
      const queryParams = {};

      if (params.roleId != null) queryParams.roleId = params.roleId;
      if (params.gradeLevel != null) queryParams.gradeLevel = params.gradeLevel;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.provinceId) queryParams.provinceId = params.provinceId;
      if (params.districtId) queryParams.districtId = params.districtId;
      if (params.schoolId) queryParams.schoolId = params.schoolId;
      if (Array.isArray(params.excludeSchoolIds) && params.excludeSchoolIds.length > 0) {
        queryParams.excludeSchoolIds = params.excludeSchoolIds.join(',');
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.DASHBOARD.USER_REGISTRATION_STATS, { params: queryParams })
      );

      return response;
    } catch (error) {
      console.error('❌ Error in getUserRegistrationStats:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch user registration stats',
        data: null
      };
    }
  },

  /**
   * Get student extra learning tool statistics
   * Fetches data from /api/v1/dashboard/students/extra-learning-tools/stats endpoint
   * @param {Object} params - Filter parameters
   * @param {number} [params.provinceId] - Province ID to filter by
   * @param {number} [params.districtId] - District ID to filter by
   * @param {number} [params.schoolId] - School ID to filter by
   * @returns {Promise<Object>} Response with extra learning tool statistics
   */
  async getStudentExtraLearningToolStats(params = {}) {
    try {
      console.log('📊 Fetching student extra learning tool statistics...', params);

      let url = `${ENDPOINTS.DASHBOARD.BASE}/admin/extra-learning`;

      // Add query parameters for filtering
      const queryParams = [];

      if (params.provinceId) {
        queryParams.push(`provinceId=${params.provinceId}`);
      }

      if (params.districtId) {
        queryParams.push(`districtId=${params.districtId}`);
      }

      if (params.schoolId) {
        queryParams.push(`schoolId=${params.schoolId}`);
      }

      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(url)
      );

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch extra learning tool statistics');
      }

      const apiData = response.data || {};

      return {
        success: true,
        data: apiData
      };

    } catch (error) {
      console.error('❌ Error in getStudentExtraLearningToolStats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get student extra learning tool statistics',
        data: {}
      };
    }
  },

  /**
   * Get student poor card grade statistics
   * Fetches data from /api/v1/dashboard/students/poor-card-grade endpoint
   * @param {Object} params - Filter parameters
   * @param {number} [params.provinceId] - Province ID to filter by
   * @param {number} [params.districtId] - District ID to filter by
   * @param {number} [params.schoolId] - School ID to filter by
   * @returns {Promise<Object>} Response with poor card grade statistics
   */
  async getStudentPoorCardGradeStats(params = {}) {
    try {
      console.log('📊 Fetching student poor card grade statistics...', params);

      let url = `${ENDPOINTS.DASHBOARD.BASE}/student-poor-card-grade`;

      // Add query parameters for filtering
      const queryParams = [];

      if (params.provinceId) {
        queryParams.push(`provinceId=${params.provinceId}`);
      }

      if (params.districtId) {
        queryParams.push(`districtId=${params.districtId}`);
      }

      if (params.schoolId) {
        queryParams.push(`schoolId=${params.schoolId}`);
      }

      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(url)
      );

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch poor card grade statistics');
      }

      const apiData = response.data || {};

      return {
        success: true,
        data: apiData
      };

    } catch (error) {
      console.error('❌ Error in getStudentPoorCardGradeStats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get student poor card grade statistics',
        data: {}
      };
    }
  },

  /**
   * Get student kindergarten statistics
   * Fetches data from /api/v1/dashboard/students/kindergarten endpoint
   * @param {Object} params - Filter parameters
   * @param {number} [params.provinceId] - Province ID to filter by
   * @param {number} [params.districtId] - District ID to filter by
   * @param {number} [params.schoolId] - School ID to filter by
   * @returns {Promise<Object>} Response with kindergarten statistics
   */
  async getStudentKindergartenStats(params = {}) {
    try {
      console.log('📊 Fetching student kindergarten statistics...', params);

      let url = `${ENDPOINTS.DASHBOARD.BASE}/student-kindergarten`;

      // Add query parameters for filtering
      const queryParams = [];

      if (params.provinceId) {
        queryParams.push(`provinceId=${params.provinceId}`);
      }

      if (params.districtId) {
        queryParams.push(`districtId=${params.districtId}`);
      }

      if (params.schoolId) {
        queryParams.push(`schoolId=${params.schoolId}`);
      }

      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(url)
      );

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch kindergarten statistics');
      }

      const apiData = response.data || {};

      return {
        success: true,
        data: apiData
      };

    } catch (error) {
      console.error('❌ Error in getStudentKindergartenStats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get student kindergarten statistics',
        data: {}
      };
    }
  },

  /**
   * Get rate limit information for all users
   * Fetches data from /api/v1/rate-limit/all-users endpoint
   * @returns {Promise<Object>} Response with rate limit data for all users
   */
  async getRateLimitAllUsers() {
    try {
      console.log('📊 Fetching rate limit data for all users...');

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.RATE_LIMIT.ALL_USERS)
      );

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch rate limit data');
      }

      const apiData = response.data || {};

      return {
        success: true,
        data: apiData
      };

    } catch (error) {
      console.error('❌ Error in getRateLimitAllUsers:', error);
      return {
        success: false,
        error: error.message || 'Failed to get rate limit data',
        data: {}
      };
    }
  },

  /**
   * Get concurrent users statistics
   * Fetches data from /api/v1/rate-limit/concurrent/stats endpoint
   * @returns {Promise<Object>} Response with concurrent users statistics
   */
  async getConcurrentUsers() {
    try {
      console.log('👥 Fetching concurrent users statistics...');

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.RATE_LIMIT.CONCURRENT_STATS)
      );

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch concurrent users statistics');
      }

      const apiData = response.data || {};

      return {
        success: true,
        data: apiData
      };

    } catch (error) {
      console.error('❌ Error in getConcurrentUsers:', error);
      return {
        success: false,
        error: error.message || 'Failed to get concurrent users statistics',
        data: {}
      };
    }
  },

  /**
   * Get hourly user usage statistics
   * Fetches data from /api/v1/api/usage/hourly endpoint
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} Response with hourly usage data
   */
  async getHourlyUsage(date) {
    try {
      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.RATE_LIMIT.HOURLY_USAGE, {
          params: { date }
        })
      );

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch hourly usage data');
      }

      // API returns: {success: true, data: {success: true, data: [...]}}
      // We need to extract the nested data array
      let apiData = response.data;

      // If apiData is an object with a 'data' property, extract it
      if (apiData && typeof apiData === 'object' && !Array.isArray(apiData) && apiData.data) {
        apiData = apiData.data;
      }

      // Ensure apiData is an array
      if (!Array.isArray(apiData)) {
        apiData = [];
      }

      return {
        success: true,
        data: apiData
      };

    } catch (error) {
      console.error('Error in getHourlyUsage:', error);
      return {
        success: false,
        error: error.message || 'Failed to get hourly usage data',
        data: []
      };
    }
  }
};
