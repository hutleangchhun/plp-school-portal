import React from 'react';

/**
 * Reusable StatsCard component for displaying key metrics
 * @param {Object} props - Component props
 * @param {string} props.title - The title text for the stat
 * @param {string|number} props.value - The main value to display
 * @param {string} props.subtitle - Optional subtitle text
 * @param {React.Component} props.icon - Optional icon component to display
 * @param {string} props.iconBgColor - Background color for the icon (e.g., 'bg-blue-100')
 * @param {string} props.iconColor - Icon color (e.g., 'text-blue-600')
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.valueColor - Color for the value text (default: 'text-gray-900')
 * @param {string} props.titleColor - Color for the title text (default: 'text-gray-600')
 * @param {boolean} props.enhanced - Use enhanced styling with animations and gradients
 * @param {string} props.hoverColor - Hover border color for enhanced mode (e.g., 'hover:border-blue-200')
 * @param {string} props.gradientFrom - Gradient start color for enhanced mode (e.g., 'from-blue-500')
 * @param {string} props.gradientTo - Gradient end color for enhanced mode (e.g., 'to-blue-600')
 * @param {boolean} props.responsive - Use responsive sizing
 * @param {boolean} props.clickable - Make the card clickable with cursor pointer
 */
export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor = 'bg-gray-100',
  iconColor = 'text-gray-600',
  className = '',
  valueColor = 'text-gray-900',
  titleColor = 'text-gray-600',
  enhanced = false,
  hoverColor = 'hover:border-blue-200',
  gradientFrom = 'from-blue-500',
  gradientTo = 'to-blue-600',
  responsive = false,
  clickable = false
}) {
  if (enhanced) {
    return (
      <div className={`bg-white ${responsive ? 'rounded-sm sm:rounded-sm p-3 sm:p-4 lg:p-6' : 'rounded-md p-6'} border border-gray-100 ${responsive ? 'sm:border-2' : 'border-2'} shadow-sm hover:shadow-lg hover:scale-[1.02] ${hoverColor} transition-all duration-300 ${clickable ? 'cursor-pointer' : ''} group ${className}`}>
        <div className={`flex ${responsive ? 'flex-col sm:flex-row items-center sm:items-start text-center sm:text-left' : 'items-center'}`}>
          {Icon && (
            <div className={`flex-shrink-0 ${responsive ? 'mb-2 sm:mb-0' : ''}`}>
              <div className={`${responsive ? 'h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12' : 'h-12 w-12'} bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-md flex items-center justify-center shadow-md group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 ${responsive ? 'mx-auto' : ''}`}>
                <Icon className={`${responsive ? 'h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6' : 'h-6 w-6'} text-white group-hover:rotate-12 transition-transform duration-300`} />
              </div>
            </div>
          )}
          <div className={`${Icon ? (responsive ? 'sm:ml-3 lg:ml-4' : 'ml-4') : ''} flex-1 min-w-0`}>
            <p className={`${responsive ? 'text-xs sm:text-sm' : 'text-sm'} font-medium ${titleColor} truncate`}>{title}</p>
            <p className={`${responsive ? 'text-lg sm:text-xl lg:text-2xl' : 'text-2xl'} font-bold ${valueColor}`}>
              {typeof value === 'string' && value.includes(' ') ? (
                <>
                  <span className={responsive ? 'block sm:inline' : ''}>{value.split(' ')[0]}</span>
                  <span className={`${responsive ? 'text-sm sm:text-base lg:text-lg ml-0 sm:ml-1' : 'text-lg ml-1'}`}> {value.split(' ').slice(1).join(' ')}</span>
                </>
              ) : (
                value
              )}
            </p>
            {subtitle && (
              <p className={`${responsive ? 'text-xs sm:text-sm' : 'text-sm'} text-gray-500 mt-1`}>{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Simple mode (original design)
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center">
        {Icon && (
          <div className={`h-12 w-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        )}
        <div className={Icon ? 'ml-4' : ''}>
          <p className={`text-sm font-medium ${titleColor}`}>{title}</p>
          <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}