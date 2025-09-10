const Badge = ({ 
  children, 
  color = 'blue', 
  size = 'sm', 
  variant = 'outline',
  className = '',
  ...props 
}) => {
  const colorClasses = {
    blue: {
      filled: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      outline: 'border border-blue-200 text-blue-800 hover:bg-blue-50'
    },
    green: {
      filled: 'bg-green-100 text-green-800 hover:bg-green-200',
      outline: 'border border-green-200 text-green-800 hover:bg-green-50'
    },
    red: {
      filled: 'bg-red-100 text-red-800 hover:bg-red-200',
      outline: 'border border-red-200 text-red-800 hover:bg-red-50'
    },
    yellow: {
      filled: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      outline: 'border border-yellow-200 text-yellow-800 hover:bg-yellow-50'
    },
    orange: {
      filled: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
      outline: 'border border-orange-200 text-orange-800 hover:bg-orange-50'
    },
    purple: {
      filled: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
      outline: 'border border-purple-200 text-purple-800 hover:bg-purple-50'
    },
    pink: {
      filled: 'bg-pink-100 text-pink-800 hover:bg-pink-200',
      outline: 'border border-pink-200 text-pink-800 hover:bg-pink-50'
    },
    gray: {
      filled: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
      outline: 'border border-gray-200 text-gray-800 hover:bg-gray-50'
    }
  };

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-3 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-3 py-1.5 text-sm'
  };

  const baseClasses = 'inline-flex items-center pt-1 font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const colorClass = colorClasses[color]?.[variant] || colorClasses.blue.filled;
  const sizeClass = sizeClasses[size] || sizeClasses.sm;
  
  const classes = `${baseClasses} ${colorClass} ${sizeClass} ${className}`.trim();

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
};

export default Badge;
export { Badge };