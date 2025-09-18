import React from 'react';
import { Trash2, Edit2, Users } from 'lucide-react';
import Badge from '@/components/ui/Badge';

/**
 * ClassCard - reusable, minimalist class card with dynamic colors and values
 *
 * Props:
 * - title: string
 * - subtitleParts: string[] (e.g., ["Grade 4", "Section B", "2024-2025", "Teacher Name"]) -> will be joined with •
 * - enrolled: number
 * - capacity: number
 * - idLabel: string (e.g., `ID #20`)
 * - status: 'available' | 'high' | 'full' (controls accent color)
 * - accentColor?: { bar: string, track: string, pillText?: string } tailwind classes
 * - onManage?: function
 * - onEdit?: function
 * - onDelete?: function
 * - manageLabel?: string
 */
export default function ClassCard({
  title,
  subtitleParts = [],
  enrolled = 0,
  capacity = 0,
  idLabel,
  status = 'available',
  accentColor,
  onEdit,
  onDelete,
}) {
  const percent = capacity > 0 ? Math.min(Math.round((enrolled / capacity) * 100), 100) : 0;

  const palette = (() => {
    if (accentColor) return accentColor;
    if (status === 'full') return { bar: 'bg-red-500', track: 'bg-gray-100', pillText: 'text-red-800' };
    if (status === 'high') return { bar: 'bg-amber-500', track: 'bg-gray-100', pillText: 'text-amber-800' };
    return { bar: 'bg-green-600', track: 'bg-gray-100', pillText: 'text-green-800' };
  })();

  const badgeColor = status === 'full' ? 'red' : status === 'high' ? 'amber' : 'green';

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 shadow-sm transition-all">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-gray-900">{title}</h3>
            {subtitleParts.length > 0 && (
              <p className="mt-1 text-sm text-gray-500 truncate">
                {subtitleParts.filter(Boolean).join(' • ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-4">
            <Badge color={badgeColor} size='sm' variant='filled'>
              {enrolled}/{capacity}
            </Badge>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1">
            <div className={`w-full h-2 rounded-full ${palette.track}`}>
              <div
                className={`${palette.bar} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <div className="text-xs text-gray-600 tabular-nums w-10 text-right">
            {percent}%
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {idLabel}
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 rounded-md text-blue-500 hover:text-blue-600 hover:bg-blue-50 border-2 border-blue-100 bg-blue-100 duration-300"
                title="Edit Class"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 border-2 border-red-100 bg-red-100 duration-300"
                title="Delete Class"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 