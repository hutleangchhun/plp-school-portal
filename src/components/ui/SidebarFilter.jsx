import { X, Search } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from './Button';

/**
 * SidebarFilter Component
 * A reusable filters sidebar component that displays filters and actions
 *
 * @param {boolean} isOpen - Whether the sidebar is open
 * @param {function} onClose - Callback when sidebar should close
 * @param {string} title - Title of the sidebar
 * @param {string} subtitle - Subtitle/description
 * @param {ReactNode} children - Filter content to display
 * @param {ReactNode} actionsContent - Actions section content
 * @param {function} onApply - Callback when applying filters
 * @param {function} onClearFilters - Callback to clear all filters
 * @param {boolean} hasFilters - Whether filters are currently applied
 */
export default function SidebarFilter({
  isOpen,
  onClose,
  title = 'Filters & Actions',
  subtitle = 'Manage your filters and actions',
  children,
  actionsContent,
  onApply,
  onClearFilters,
  hasFilters = false,
  overlayClassName = ''
}) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black bg-opacity-50 ${overlayClassName}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-blue-100 text-sm mt-1">{subtitle}</p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-blue-100 hover:text-white hover:bg-blue-700"
            title={t('close', 'Close')}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Filters Section */}
          {children && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                <p className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  {t('filters', 'Filters')}
                </p>
              </div>
              {children}
            </div>
          )}

          {/* Divider */}
          {children && actionsContent && (
            <div className="border-t-2 border-dashed border-gray-200" />
          )}

          {/* Actions Section */}
          {actionsContent && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-green-500 rounded-full"></div>
                <p className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  {t('actions', 'Actions')}
                </p>
              </div>
              {actionsContent}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 space-y-2">
          {hasFilters && (
            <Button
              onClick={() => {
                onClearFilters();
                onClose();
              }}
              variant="danger"
              size="sm"
              className="w-full flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" />
              {t('clearFilters', 'Clear Filters')}
            </Button>
          )}
          <Button
            onClick={() => {
              if (onApply) onApply();
            }}
            variant="primary"
            size="sm"
            className="w-full"
          >
            {t('apply', 'Apply Filters')}
          </Button>
        </div>
      </div>
    </div>
  );
}
