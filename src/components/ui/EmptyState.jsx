import React from 'react';

/**
 * EmptyState - Reusable fallback for empty table/results
 *
 * Props:
 * - icon: React component (e.g., UserRoundX)
 * - title: string (main message)
 * - description?: string (secondary text)
 * - variant?: 'neutral' | 'danger' | 'warning' | 'info' | 'success'
 * - actionLabel?: string
 * - onAction?: () => void
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  variant = 'neutral',
  actionLabel,
  onAction
}) {
  const palette = {
    neutral: { ring: 'border-gray-300', bg: 'bg-gray-100', icon: 'text-gray-600' },
    danger: { ring: 'border-red-300', bg: 'bg-red-100', icon: 'text-red-700' },
    warning: { ring: 'border-amber-300', bg: 'bg-amber-100', icon: 'text-amber-700' },
    info: { ring: 'border-blue-300', bg: 'bg-blue-100', icon: 'text-blue-700' },
    success: { ring: 'border-green-300', bg: 'bg-green-100', icon: 'text-green-700' }
  }[variant] || { ring: 'border-gray-300', bg: 'bg-gray-100', icon: 'text-gray-600' };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className={`h-20 w-20 ${palette.bg} ${palette.ring} border-2 rounded-full flex items-center justify-center`}>
        {Icon ? <Icon className={`h-8 w-8 ${palette.icon}`} /> : null}
      </div>
      {title && (
        <p className="text-gray-800 mt-3 text-sm font-medium">
          {title}
        </p>
      )}
      {description && (
        <p className="text-gray-500 mt-1 text-xs">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-gray-900 text-white hover:bg-gray-800"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
