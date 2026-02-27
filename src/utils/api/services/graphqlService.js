import { getGraphqlBaseUrl, ENDPOINTS } from '../config';
import { tokenManager } from '../client';

/**
 * GraphQL API Service
 * Handles executing generic GraphQL queries and mutations
 */
export const graphqlService = {
    /**
     * Execute a GraphQL query or mutation
     * @param {string} query - The GraphQL query string
     * @param {Object} [variables] - Optional variables dictionary
     * @returns {Promise<Object>} The `data` root of the GraphQL response
     * @throws {Error} If the response contains GraphQL errors
     */
    async query(query, variables = {}) {
        const graphqlUrl = `${getGraphqlBaseUrl()}${ENDPOINTS.GRAPHQL.BASE}`;
        const token = tokenManager.getToken();

        const response = await fetch(graphqlUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query, variables })
        });

        const jsonResponse = await response.json();

        if (jsonResponse.errors) {
            throw new Error(jsonResponse.errors[0].message || 'GraphQL Error');
        }

        return jsonResponse.data;
    },

    /**
     * Fetch school status statistics with pagination and filtering
     * @param {Object} variables - Query variables for filtering and pagination
     */
    async getSchoolStatus(variables) {
        const query = `
        query($provinceId: Int, $districtId: Int, $schoolId: Int, $noClasses: Boolean, $noTeachers: Boolean, $noStudents: Boolean, $page: Int, $limit: Int) {
          schoolStatus(
            provinceId: $provinceId
            districtId: $districtId
            schoolId: $schoolId
            noClasses: $noClasses
            noTeachers: $noTeachers
            noStudents: $noStudents
            page: $page
            limit: $limit
          ) {
            total
            page
            limit
            totalPages
            data {
              schoolId
              schoolName
              schoolCode
              classCount
              teacherCount
              studentCount
            }
          }
        }
      `;
        return this.query(query, variables);
    },

    /**
     * Fetch province-level school statistics for charts
     */
    async getProvinceSchoolStatus() {
        const query = `
        query {
          provinceSchoolStatus {
            provinceId
            provinceNameEn
            provinceNameKh
            totalSchools
            schoolsWithClasses
            schoolsWithClassesPct
            schoolsWithTeachers
            schoolsWithTeachersPct
            schoolsWithStudents
            schoolsWithStudentsPct
          }
        }
      `;
        return this.query(query, {});
    },

    /**
     * Fetch teacher/staff field-level data completion statistics
     * @param {Object} variables - { schoolId, provinceId, districtId, roleId }
     */
    async getTeacherDataCompletion(variables = {}) {
        const query = `
        query TeacherDataCompletion($schoolId: Int, $provinceId: Int, $districtId: Int, $roleId: Int) {
          teacherDataCompletion(
            schoolId: $schoolId
            provinceId: $provinceId
            districtId: $districtId
            roleId: $roleId
          ) {
            total
            fieldStatistics {
              fieldName
              fieldDisplayName
              category
              filledCount
              emptyCount
              filledPercentage
              emptyPercentage
            }
          }
        }
      `;
        return this.query(query, variables);
    },

    /**
     * Fetch student field-level data completion statistics
     * @param {Object} variables - { schoolId, provinceId, districtId }
     */
    async getStudentDataCompletion(variables = {}) {
        const query = `
        query StudentDataCompletion($schoolId: Int, $provinceId: Int, $districtId: Int) {
          studentDataCompletion(
            schoolId: $schoolId
            provinceId: $provinceId
            districtId: $districtId
          ) {
            total
            fieldStatistics {
              fieldName
              fieldDisplayName
              category
              filledCount
              emptyCount
              filledPercentage
              emptyPercentage
            }
          }
        }
      `;
        return this.query(query, variables);
    }
};
