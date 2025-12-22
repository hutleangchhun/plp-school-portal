import React from 'react';
import AdminUserDemographic from './AdminUserDemographic';

/**
 * AdminStudentDemographic Page
 * Standalone page for viewing student demographics across all schools
 * Shows ethnic group distribution and accessibility needs
 * Filters by province, district, school (NO role filter - fixed to students)
 */
const AdminStudentDemographic = () => {
  return <AdminUserDemographic fixedRole={9} showPageWrapper={true} />;
};

export default AdminStudentDemographic;
