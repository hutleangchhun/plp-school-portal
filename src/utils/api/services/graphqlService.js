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
              provinceName
              districtName
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
  },

  // ─── Export Check Queries ─────────────────────────────────────────────────

  /**
   * BMI export check — studentCount, bmiStatus breakdown, averages
   */
  async exportBmiCheck({ schoolId, academicYear, gradeLevel, classId } = {}) {
    const data = await this.query(
      `query ExportBmiCheck($schoolId: Int!, $academicYear: String!, $gradeLevel: String, $classId: Int) {
              exportBmiCheck(schoolId: $schoolId, academicYear: $academicYear, gradeLevel: $gradeLevel, classId: $classId) {
                hasData studentCount femaleCount withBmiCount withoutBmiCount noMeasurementCount noHeightCount noWeightCount canRecalculate skipReason
                bmiStatus { thinness_grade_3 thinness_grade_2 thinness_grade_1 normal overweight obesity }
                avgBmi avgHeightCm avgWeightKg
              }
            }`,
      { schoolId, academicYear, gradeLevel: gradeLevel || null, classId: classId ? parseInt(classId) : null }
    );
    return data.exportBmiCheck;
  },

  /**
   * Student List (Report 1) export check
   */
  async exportStudentListCheck(classId) {
    if (!classId || classId === 'all') return null;
    const data = await this.query(
      `query ExportStudentListCheck($classId: Int!) {
        exportStudentListCheck(classId: $classId) {
          hasData studentCount femaleCount
        }
      }`,
      { classId: parseInt(classId) }
    );
    return data.exportStudentListCheck;
  },

  /**
   * Accessibility export check — breakdown by disability type
   */
  async exportAccessibilityCheck({ schoolId } = {}) {
    const data = await this.query(
      `query ExportAccessibilityCheck($schoolId: Int!) {
              exportAccessibilityCheck(schoolId: $schoolId) {
                hasData studentCount femaleCount
                byType { label count }
              }
            }`,
      { schoolId: parseInt(schoolId) }
    );
    return data.exportAccessibilityCheck;
  },

  /**
   * Ethnic group export check — breakdown by ethnic group
   */
  async exportEthnicCheck({ schoolId } = {}) {
    const data = await this.query(
      `query ExportEthnicCheck($schoolId: Int!) {
              exportEthnicCheck(schoolId: $schoolId) {
                hasData studentCount femaleCount
                byEthnicGroup { label count }
              }
            }`,
      { schoolId: parseInt(schoolId) }
    );
    return data.exportEthnicCheck;
  },

  /**
   * Class monthly attendance check
   */
  async exportClassMonthlyCheck({ classId, year, month } = {}) {
    const data = await this.query(
      `query ExportClassMonthlyCheck($classId: Int!, $year: Int!, $month: Int!) {
              exportClassMonthlyCheck(classId: $classId, year: $year, month: $month) {
                hasData studentCount femaleStudentCount daysRecorded
                presentCount absentCount lateCount leaveCount
                topByStatus {
                  present { fullName count }
                  absent { fullName count }
                  late { fullName count }
                  leave { fullName count }
                }
              }
            }`,
      { classId: parseInt(classId), year: parseInt(year), month: parseInt(month) }
    );
    return data.exportClassMonthlyCheck;
  },

  /**
   * Teacher monthly attendance check
   */
  async exportTeacherMonthlyCheck({ schoolId, year, month } = {}) {
    const data = await this.query(
      `query ExportTeacherMonthlyCheck($schoolId: Int!, $year: Int!, $month: Int!) {
              exportTeacherMonthlyCheck(schoolId: $schoolId, year: $year, month: $month) {
                hasData teacherCount femaleTeacherCount daysRecorded
                presentCount absentCount lateCount leaveCount
                topByStatus {
                  present { fullName count }
                  absent { fullName count }
                  late { fullName count }
                  leave { fullName count }
                }
              }
            }`,
      { schoolId: parseInt(schoolId), year: parseInt(year), month: parseInt(month) }
    );
    return data.exportTeacherMonthlyCheck;
  }
};

