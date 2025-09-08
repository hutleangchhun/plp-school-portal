import React from 'react';
import { Button } from './Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  ...props
}) => {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  const handleRowClick = (item, index) => {
    if (onRowClick) {
      onRowClick(item, index);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-gray-200 ${className}`} {...props}>
        <thead className="rounded-t-lg bg-blue-50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={column.key || index}
                scope="col"
                className={`px-3 sm:px-6 py-3 text-left bg-blue-50 text-sm font-semibold text-gray-700 uppercase tracking-wider ${
                  column.headerClassName || ''
                } ${column.hidden ? 'hidden' : ''} ${column.responsive || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, rowIndex) => (
            <tr
              key={item.id || rowIndex}
              className={`hover:bg-gray-50 transition-all duration-200 ${rowClassName} ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
              onClick={() => handleRowClick(item, rowIndex)}
              style={{ animationDelay: `${rowIndex * 50}ms` }}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={column.key || colIndex}
                  className={`px-3 sm:px-6 py-4 whitespace-nowrap ${
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

// Pagination component
const Pagination = ({ pagination, onPageChange, t }) => {
  const { page, pages, total, limit } = pagination;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      <div className="flex-1 flex justify-between sm:hidden">
        <Button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          variant="outline"
          size="sm"
        >
          {t ? t('previous', 'Previous') : 'Previous'}
        </Button>
        <Button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          variant="outline"
          size="sm"
        >
          {t ? t('next', 'Next') : 'Next'}
        </Button>
      </div>
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
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <Button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              variant="outline"
              size="sm"
              className="rounded-l-md rounded-r-none border-r-0"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              let pageNum;
              if (pages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= pages - 2) {
                pageNum = pages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  variant={page === pageNum ? 'primary' : 'outline'}
                  size="sm"
                  className="rounded-none border-r-0 hover:scale-105 transition-transform duration-200"
                >
                  {pageNum}
                </Button>
              );
            })}
            
            <Button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pages}
              variant="outline"
              size="sm"
              className="rounded-r-md rounded-l-none"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
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