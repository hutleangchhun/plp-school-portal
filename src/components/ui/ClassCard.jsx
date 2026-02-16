import React from 'react';
import { Trash2, Edit2, Users, Loader } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * ClassCard - reusable, minimalist class card with dynamic colors and values
 *
 * Props:
 * - title: string
 * - subtitleParts: string[] (e.g., ["Grade 4", "Section B", "2024-2025", "Teacher Name"]) -> will be joined with •
 * - enrolled: number
 * - capacity: number
 * - idLabel: string (e.g., `ID #20`)
 * - badges: array of badge objects [{ label: string, color?: string, variant?: string }]
 * - status: 'available' | 'high' | 'full' (controls accent color)
 * - accentColor?: { bar: string, track: string, pillText?: string } tailwind classes
 * - onManage?: function (callback to view/manage students in class)
 * - onEdit?: function
 * - onDelete?: function
 * - manageLabel?: string
 * - isEditLoading?: boolean (shows loading state on edit button)
 */
export default function ClassCard({
  title,
  subtitleParts = [],
  enrolled = 0,
  capacity = 0,
  idLabel,
  badges = [],
  status: propStatus, // Rename to avoid conflict
  accentColor,
  onManage,
  onEdit,
  onDelete,
  isEditLoading = false,
}) {
  const { t } = useLanguage();
  const percent = capacity > 0 ? Math.min(Math.round((enrolled / capacity) * 100), 100) : 0;

  // Calculate status based on percentage if not provided
  const status = propStatus || (percent >= 90 ? 'full' : percent >= 70 ? 'high' : 'available');


  const palette = (() => {
    if (accentColor) return accentColor;
    if (status === 'full') return { bar: 'bg-red-500', track: 'bg-red-100', pillText: 'text-red-800' };
    if (status === 'high') return { bar: 'bg-yellow-500', track: 'bg-yellow-100', pillText: 'text-yellow-800' };
    return { bar: 'bg-green-500', track: 'bg-green-100', pillText: 'text-green-800' };
  })();

  const badgeColor = status === 'full' ? 'red' : status === 'high' ? 'yellow' : 'green';

  return (
    <div className="bg-white rounded-sm border border-gray-200 hover:border-gray-300 shadow-sm transition-all">
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
          <div className="flex-1">
            {idLabel && (
              <div className="text-sm text-gray-500 mb-2">
                {idLabel}
              </div>
            )}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {badges.map((badge, index) => (
                  <Badge
                    key={index}
                    color={badge.color || 'blue'}
                    variant={badge.variant || 'outline'}
                    size="xs"
                  >
                    {badge.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onManage && (
              <Tooltip content={t('manageStudent', 'View and manage students in this class')} className="p-2 text-xs">
                <button
                  onClick={onManage}
                  className="p-2 rounded-sm text-green-500 hover:text-green-600 hover:bg-green-50 border-2 border-green-100 bg-green-100 duration-300"
                  title="Manage Students"
                >
                  <Users className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
            {onEdit && (
              <Tooltip content={isEditLoading ? t('loadingClassDetails', 'Loading class details...') : t('editClass', 'Edit class details')} className="p-2 text-xs">
                <button
                  onClick={onEdit}
                  disabled={isEditLoading}
                  className={`p-2 rounded-sm border-2 duration-300 ${
                    isEditLoading
                      ? 'text-gray-400 hover:text-gray-400 hover:bg-gray-50 border-gray-200 bg-gray-100 cursor-not-allowed'
                      : 'text-blue-500 hover:text-blue-600 hover:bg-blue-50 border-blue-100 bg-blue-100'
                  }`}
                  title={isEditLoading ? 'Loading...' : 'Edit Class'}
                >
                  {isEditLoading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Edit2 className="h-4 w-4" />
                  )}
                </button>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip content={t('deleteClass', 'Delete class')} className="p-2 text-xs">
                <button
                  onClick={onDelete}
                  className="p-2 rounded-sm text-red-500 hover:text-red-600 hover:bg-red-50 border-2 border-red-100 bg-red-100 duration-300"
                  title="Delete Class"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 