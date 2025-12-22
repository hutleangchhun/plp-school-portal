import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import SystemWideStudentStats from '../../components/admin/SystemWideStudentStats';

/**
 * AdminUserDemographic Component
 * Page for viewing user demographics with global filters
 * Can be used for teachers (with role filter) or students (without role filter)
 * @param {number} fixedRole - If provided, role is fixed and role filter is hidden (e.g., 9 for students, 8 for teachers)
 * @param {boolean} showPageWrapper - Whether to show PageTransition wrapper (default: true)
 * @param {object} filters - Global filters from parent component { selectedProvince, selectedDistrict, selectedSchool, selectedRole }
 * @param {boolean} useGlobalFilters - Whether to use filters from parent instead of local state
 */
const AdminUserDemographic = ({ fixedRole, showPageWrapper = true, filters = null, useGlobalFilters = false }) => {
  const { t } = useLanguage();

  // Use global filters if provided, otherwise use local state
  const selectedProvince = useGlobalFilters && filters ? filters.selectedProvince : "";
  const selectedDistrict = useGlobalFilters && filters ? filters.selectedDistrict : "";
  const selectedSchool = useGlobalFilters && filters ? filters.selectedSchool : "";
  const selectedRole = useGlobalFilters && filters ? filters.selectedRole : (fixedRole ? String(fixedRole) : "9");

  const content = (
    <SystemWideStudentStats
      roleId={parseInt(selectedRole)}
      provinceId={selectedProvince}
      districtId={selectedDistrict}
      schoolId={selectedSchool}
      showOwnFilters={false}
      key={`${selectedRole}-${selectedProvince}-${selectedDistrict}-${selectedSchool}`}
    />
  );

  if (showPageWrapper) {
    return (
      <PageTransition>
        <div className="p-6 space-y-6">
          <FadeInSection>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {fixedRole === 8 ? t('teacherDemographics', 'Teacher Demographics') : t('studentDemographics', 'Student Demographics')}
              </h1>
              <p className="text-gray-600 mt-2">
                {fixedRole === 8
                  ? t('viewTeacherDemographics', 'View teacher ethnic groups and accessibility needs across all schools')
                  : t('viewStudentDemographics', 'View student ethnic groups and accessibility needs across all schools')
                }
              </p>
            </div>
          </FadeInSection>

          <FadeInSection delay={100}>
            {content}
          </FadeInSection>
        </div>
      </PageTransition>
    );
  }

  return content;
};

export default AdminUserDemographic;
