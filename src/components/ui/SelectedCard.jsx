import React from 'react';
import { X } from 'lucide-react';

/**
 * SelectedCard - reusable card for selected entities (student/teacher/parent)
 *
 * Props:
 * - title: string (primary text)
 * - subtitle?: string (secondary line, muted)
 * - statusColor?: 'blue' | 'purple' | 'green' | 'amber' | 'red' | string (tailwind base color name)
 * - onRemove: () => void
 * - className?: string
 */
export default function SelectedCard({
  title,
  subtitle,
  statusColor = 'blue',
  onRemove,
  className = ''
}) {
  const bg = statusColor === 'blue'
    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    : statusColor === 'purple'
    ? 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    : statusColor === 'green'
    ? 'bg-green-50 border-green-200 hover:bg-green-100'
    : statusColor === 'amber'
    ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
    : statusColor === 'red'
    ? 'bg-red-50 border-red-200 hover:bg-red-100'
    : 'bg-gray-50 border-gray-200 hover:bg-gray-100';

  const dot = statusColor === 'blue'
    ? 'bg-blue-500'
    : statusColor === 'purple'
    ? 'bg-purple-500'
    : statusColor === 'green'
    ? 'bg-green-500'
    : statusColor === 'amber'
    ? 'bg-amber-500'
    : statusColor === 'red'
    ? 'bg-red-500'
    : 'bg-gray-400';

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${bg} ${className}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${dot}`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
            {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
          </div>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="ml-2 flex justify-center items-center h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:rounded-full hover:bg-red-300 hover:border-red-400 hover:scale-110 transition-all duration-200"
        title="Remove"
        aria-label="Remove"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
