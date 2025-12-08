import React from 'react';
import { Users, Heart, AlertTriangle, TrendingUp } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * BMI Summary Cards Component
 * Displays key BMI statistics in card format
 *
 * @param {Object} dashboardData - Dashboard data containing BMI statistics
 * @param {Object} dashboardFilters - Current filter values (for year comparison)
 */
const BMISummaryCards = ({ dashboardData, dashboardFilters }) => {
  const { t } = useLanguage();

  if (!dashboardData || !dashboardData.bmiDistribution) {
    return null;
  }

  const year1Data = dashboardData.bmiDistribution?.year1 || {};
  const year2Data = dashboardData.bmiDistribution?.year2 || {};
  const hasComparison = dashboardFilters?.academicYear1 && dashboardFilters?.academicYear2;

  // Calculate totals for Year 1
  const totalYear1 = Object.values(year1Data).reduce((sum, val) => sum + (val || 0), 0);
  const healthyYear1 = year1Data.normal || 0;
  const atRiskYear1 = (year1Data.severeThinness || 0) + (year1Data.thinness || 0) +
                       (year1Data.overweight || 0) + (year1Data.obesity || 0);
  const healthyPercentYear1 = totalYear1 > 0 ? ((healthyYear1 / totalYear1) * 100).toFixed(1) : 0;

  // Calculate totals for Year 2 (if comparing)
  const totalYear2 = hasComparison ? Object.values(year2Data).reduce((sum, val) => sum + (val || 0), 0) : 0;
  const healthyYear2 = year2Data.normal || 0;
  const atRiskYear2 = (year2Data.severeThinness || 0) + (year2Data.thinness || 0) +
                       (year2Data.overweight || 0) + (year2Data.obesity || 0);
  const healthyPercentYear2 = totalYear2 > 0 ? ((healthyYear2 / totalYear2) * 100).toFixed(1) : 0;

  // Calculate change (if comparing)
  const calculateChange = (val1, val2) => {
    if (!hasComparison || !val1) return null;
    const change = val2 - val1;
    const changePercent = ((change / val1) * 100).toFixed(1);
    return { change, changePercent, isPositive: change >= 0 };
  };

  const healthyChange = calculateChange(parseFloat(healthyPercentYear1), parseFloat(healthyPercentYear2));
  const atRiskChange = calculateChange(atRiskYear1, atRiskYear2);
  const totalChange = calculateChange(totalYear1, totalYear2);

  const cards = [
    {
      title: t('totalStudentsMeasured', 'Total Students Measured'),
      value: totalYear1.toLocaleString(),
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      change: totalChange,
      subtitle: hasComparison ? `${dashboardFilters.academicYear1}` : null
    },
    {
      title: t('healthyWeight', 'Healthy Weight'),
      value: `${healthyPercentYear1}%`,
      subtitle: `${healthyYear1.toLocaleString()} ${t('students', 'students')}`,
      icon: Heart,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      change: healthyChange
    },
    {
      title: t('atRiskStudents', 'At Risk Students'),
      value: atRiskYear1.toLocaleString(),
      subtitle: `${totalYear1 > 0 ? ((atRiskYear1 / totalYear1) * 100).toFixed(1) : 0}% ${t('ofTotal', 'of total')}`,
      icon: AlertTriangle,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      change: atRiskChange,
      reverseColor: true // For at-risk, increase is bad
    },
    {
      title: t('obesityRate', 'Obesity Rate'),
      value: `${totalYear1 > 0 ? (((year1Data.obesity || 0) / totalYear1) * 100).toFixed(1) : 0}%`,
      subtitle: `${(year1Data.obesity || 0).toLocaleString()} ${t('students', 'students')}`,
      icon: TrendingUp,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      change: calculateChange(year1Data.obesity || 0, year2Data.obesity || 0),
      reverseColor: true
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const showChange = card.change && hasComparison;
        const isIncrease = card.change?.isPositive;
        const changeColor = card.reverseColor
          ? (isIncrease ? 'text-red-600' : 'text-green-600')
          : (isIncrease ? 'text-green-600' : 'text-red-600');

        return (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            {/* Icon and Title */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  {showChange && (
                    <span className={`text-sm font-medium ${changeColor} flex items-center gap-1`}>
                      {card.change.isPositive ? '↑' : '↓'}
                      {Math.abs(card.change.changePercent)}%
                    </span>
                  )}
                </div>
              </div>
              <div className={`${card.iconBg} p-2 rounded-lg`}>
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>

            {/* Subtitle */}
            {card.subtitle && (
              <p className="text-xs text-gray-500">{card.subtitle}</p>
            )}

            {/* Comparison Info */}
            {showChange && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  {t('comparedTo', 'Compared to')} {dashboardFilters.academicYear2}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BMISummaryCards;
