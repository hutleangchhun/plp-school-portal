import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import MultiRoleDashboard from '../../components/ui/MultiRoleDashboard';

/**
 * MultiRoleDashboardPage Component
 * Dedicated page for users with multi-role access
 * Displays full multi-role dashboard with officer responsibilities
 */
const MultiRoleDashboardPage = ({ user }) => {
  const { t } = useLanguage();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="">
        <MultiRoleDashboard user={user} />
      </div>
    </div>
  );
};

export default MultiRoleDashboardPage;
