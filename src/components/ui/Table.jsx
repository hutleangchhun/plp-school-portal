import React, { useMemo, useState } from 'react';
import { Button } from './Button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Database, ChevronsUpDown } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

const Table = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "No data found",
  className = "",
  showPagination = false,
  pagination = null,
  onPageChange = null,
  rowClassName = "",
  onRowClick = null,
  t = null,
  // New optional props to customize EmptyState
  emptyIcon: EmptyIcon = Database,
  emptyVariant = 'neutral',
  emptyDescription = '',
  emptyActionLabel,
  onEmptyAction,
  // New shadcn-like features
  stickyHeader = true,
  dense = false,
  enableSort = true,
  defaultSortKey = null,
  defaultSortDir = 'asc', // 'asc' | 'desc'
  onSortChange,
  ...props
}) => {
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState(defaultSortDir);

  const handleHeaderSort = (col) => {
    if (!enableSort) return;
    const key = col.accessor || col.key;
    if (!key || col.disableSort) return;

    let nextDir = 'asc';
    if (sortKey === key) {
      nextDir = sortDir === 'asc' ? 'desc' : 'asc';
    }
    setSortKey(key);
    setSortDir(nextDir);
    if (onSortChange) onSortChange({ key, dir: nextDir });
  };

  const sortedData = useMemo(() => {
    if (!enableSort || !sortKey) return data;
    const copy = Array.isArray(data) ? [...data] : [];
    copy.sort((a, b) => {
      const aVal = getNestedValue(a, sortKey);
      const bVal = getNestedValue(b, sortKey);
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDir === 'asc' ? -1 : 1;
      if (bVal == null) return sortDir === 'asc' ? 1 : -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return copy;
  }, [data, enableSort, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <EmptyState
        icon={EmptyIcon}
        title={emptyMessage}
        description={emptyDescription}
        variant={emptyVariant}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  const handleRowClick = (item, index) => {
    if (onRowClick) {
      onRowClick(item, index);
    }
  };

  const headerBase = stickyHeader
    ? 'sticky top-0 z-10 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/75'
    : 'bg-slate-50';

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className={`w-full text-sm ${className}`} {...props}>
          <thead className={`${headerBase} border-b border-gray-200`}> 
            <tr>
              {columns.map((column, index) => {
                const isSortable = enableSort && !(column.disableSort) && (column.accessor || column.key);
                const isActive = isSortable && (sortKey === (column.accessor || column.key));
                return (
                  <th
                    key={column.key || index}
                    scope="col"
                    className={`px-3 sm:px-4 ${dense ? 'py-2' : 'py-3.5'} text-left font-medium text-gray-700 uppercase tracking-wide align-middle ${
                      column.headerClassName || ''
                    } ${column.hidden ? 'hidden' : ''} ${column.responsive || ''}`}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => handleHeaderSort(column)}
                        className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900"
                        title={t ? t('sort', 'Sort') : 'Sort'}
                      >
                        <span className="whitespace-nowrap">{column.header}</span>
                        <ChevronsUpDown className={`h-3.5 w-3.5 ${isActive ? 'opacity-100' : 'opacity-40'}`} />
                      </button>
                    ) : (
                      <span className="whitespace-nowrap">{column.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedData.map((item, rowIndex) => (
              <tr
                key={item.id || rowIndex}
                className={`hover:bg-gray-50 transition-colors ${rowClassName} ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => handleRowClick(item, rowIndex)}
                style={{ animationDelay: `${rowIndex * 30}ms` }}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={column.key || colIndex}
                    className={`px-3 sm:px-6 ${dense ? 'py-2.5' : 'py-3.5'} whitespace-nowrap align-middle ${
                      column.cellClassName || ''
                    } ${column.hidden ? 'hidden' : ''} ${column.responsive || ''}`}
                  >
                    {column.render 
                      ? column.render(item, rowIndex)
                      : column.accessor 
                      ? getNestedValue(item, column.accessor)
                      : item[column.key]
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination && pagination && onPageChange && (
        <Pagination 
          pagination={pagination}
          onPageChange={onPageChange}
          t={t}
        />
      )}
    </div>
  );
};

// Helper function to get nested object values
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// Advanced Pagination component
const Pagination = ({ pagination, onPageChange, t }) => {
  const { page, pages, total, limit } = pagination;

  // Helper function to generate page numbers with ellipsis
  const generatePageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (pages <= maxVisiblePages + 2) {
      // Show all pages if total pages is small
      for (let i = 1; i <= pages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);
      
      // Calculate start and end of middle pages
      let startPage, endPage;
      
      if (page <= 4) {
        // Near the beginning
        startPage = 2;
        endPage = maxVisiblePages;
      } else if (page >= pages - 3) {
        // Near the end
        startPage = pages - maxVisiblePages + 1;
        endPage = pages - 1;
      } else {
        // In the middle
        startPage = page - 2;
        endPage = page + 2;
      }
      
      // Add ellipsis before middle pages if needed
      if (startPage > 2) {
        pageNumbers.push('ellipsis-start');
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        if (i > 1 && i < pages) {
          pageNumbers.push(i);
        }
      }
      
      // Add ellipsis after middle pages if needed
      if (endPage < pages - 1) {
        pageNumbers.push('ellipsis-end');
      }
      
      // Always show last page if more than 1 page
      if (pages > 1) {
        pageNumbers.push(pages);
      }
    }
    
    return pageNumbers;
  };

  const pageNumbers = generatePageNumbers();

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      {/* Mobile pagination */}
      <div className="flex-1 flex justify-between sm:hidden">
        <Button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          variant="outline"
          size="sm"
        >
          {t ? t('previous', 'Previous') : 'Previous'}
        </Button>
        <div className="flex items-center px-4">
          <span className="text-sm text-gray-700">
            {t ? t('page', 'Page') : 'Page'} {page} {t ? t('of', 'of') : 'of'} {pages}
          </span>
        </div>
        <Button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          variant="outline"
          size="sm"
        >
          {t ? t('next', 'Next') : 'Next'}
        </Button>
      </div>

      {/* Desktop pagination */}
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            {t ? t('showing', 'Showing') : 'Showing'}{' '}
            <span className="font-medium">
              {total === 0 ? 0 : (page - 1) * limit + 1}
            </span>{' '}
            {t ? t('to', 'to') : 'to'}{' '}
            <span className="font-medium">
              {Math.min(page * limit, total)}
            </span>{' '}
            {t ? t('of', 'of') : 'of'}{' '}
            <span className="font-medium">{total}</span>{' '}
            {t ? t('results', 'results') : 'results'}
          </p>
        </div>
        
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label={t('pagination')}>
            {/* First page button */}
            <Button
              onClick={() => onPageChange(1)}
              disabled={page === 1}
              variant="outline"
              size="sm"
              className="rounded-l-md rounded-r-none border-r-0"
              title={t ? t('firstPage', 'First page') : 'First page'}
            >
              <span className="sr-only">First</span>
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            </Button>

            {/* Previous page button */}
            <Button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              variant="outline"
              size="sm"
              className="rounded-none border-r-0"
              title={t ? t('previousPage', 'Previous page') : 'Previous page'}
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            
            {/* Page numbers */}
            {pageNumbers.map((pageNum, index) => {
              if (typeof pageNum === 'string' && pageNum.startsWith('ellipsis')) {
                return (
                  <span
                    key={pageNum}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                  >
                    ...
                  </span>
                );
              }
              
              return (
                <Button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  variant={page === pageNum ? 'primary' : 'outline'}
                  size="sm"
                  className="rounded-none border-r-0 hover:scale-105 transition-transform duration-200"
                  title={`${t ? t('page', 'Page') : 'Page'} ${pageNum}`}
                >
                  {pageNum}
                </Button>
              );
            })}

            {/* Next page button */}
            <Button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pages}
              variant="outline"
              size="sm"
              className="rounded-none border-r-0"
              title={t ? t('nextPage', 'Next page') : 'Next page'}
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>

            {/* Last page button */}
            <Button
              onClick={() => onPageChange(pages)}
              disabled={page >= pages}
              variant="outline"
              size="sm"
              className="rounded-r-md rounded-l-none"
              title={`${t ? t('lastPage', 'Last page') : 'Last page'} (${pages})`}
            >
              <span className="sr-only">Last</span>
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
};

// Mobile card component
const MobileCards = ({
  data = [],
  renderCard,
  cardClassName = "",
  onCardClick = null
}) => {
  return (
    <div className="block sm:hidden">
      {data.map((item, index) => (
        <div
          key={item.id || index}
          className={`bg-white border rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-200 ${cardClassName} ${
            onCardClick ? 'cursor-pointer' : ''
          }`}
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={() => onCardClick && onCardClick(item, index)}
        >
          {renderCard ? renderCard(item, index) : (
            <div className="text-sm text-gray-600">
              No card renderer provided
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Export all components
export { Table, Pagination, MobileCards };
export default Table;