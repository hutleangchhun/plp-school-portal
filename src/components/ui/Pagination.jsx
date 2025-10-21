import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';

const Pagination = ({ 
  currentPage = 1, 
  totalPages = 1, 
  total = 0, 
  limit = 10,
  onPageChange, 
  t = null,
  className = "",
  showFirstLast = true,
  showInfo = true,
  maxVisiblePages = 5
}) => {
  // Helper function to generate page numbers with ellipsis
  const generatePageNumbers = () => {
    const pageNumbers = [];
    
    if (totalPages <= maxVisiblePages + 2) {
      // Show all pages if total pages is small
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);
      
      // Calculate start and end of middle pages
      let startPage, endPage;
      
      if (currentPage <= 4) {
        // Near the beginning
        startPage = 2;
        endPage = maxVisiblePages;
      } else if (currentPage >= totalPages - 3) {
        // Near the end
        startPage = totalPages - maxVisiblePages + 1;
        endPage = totalPages - 1;
      } else {
        // In the middle
        startPage = currentPage - 2;
        endPage = currentPage + 2;
      }
      
      // Add ellipsis before middle pages if needed
      if (startPage > 2) {
        pageNumbers.push('ellipsis-start');
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        if (i > 1 && i < totalPages) {
          pageNumbers.push(i);
        }
      }
      
      // Add ellipsis after middle pages if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push('ellipsis-end');
      }
      
      // Always show last page if more than 1 page
      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  const pageNumbers = generatePageNumbers();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 ${className}`}>
      {/* Mobile pagination */}
      <div className="flex-1 flex justify-between sm:hidden">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
        >
          {t ? t('previous', 'Previous') : 'Previous'}
        </Button>
        <div className="flex items-center px-4">
          <span className="text-sm text-gray-700">
            {t ? t('page', 'Page') : 'Page'} {currentPage} {t ? t('of', 'of') : 'of'} {totalPages}
          </span>
        </div>
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          variant="outline"
          size="sm"
        >
          {t ? t('next', 'Next') : 'Next'}
        </Button>
      </div>

      {/* Desktop pagination */}
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        {showInfo && (
          <div>
            <p className="text-sm text-gray-700">
              {t ? t('showing', 'Showing') : 'Showing'}{' '}
              <span className="font-medium">
                {total === 0 ? 0 : (currentPage - 1) * limit + 1}
              </span>{' '}
              {t ? t('to', 'to') : 'to'}{' '}
              <span className="font-medium">
                {Math.min(currentPage * limit, total)}
              </span>{' '}
              {t ? t('of', 'of') : 'of'}{' '}
              <span className="font-medium">{total}</span>{' '}
              {t ? t('results', 'results') : 'results'}
            </p>
          </div>
        )}
        
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label={t ? t('pagination', 'Pagination') : 'Pagination'}>
            {/* First page button */}
            {showFirstLast && (
              <Button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="rounded-l-md rounded-r-none border-r-0"
                title={t ? t('firstPage', 'First page') : 'First page'}
              >
                <span className="sr-only">First</span>
                <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}

            {/* Previous page button */}
            <Button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className={`${showFirstLast ? 'rounded-none border-r-0' : 'rounded-l-md rounded-r-none border-r-0'}`}
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
                  variant={currentPage === pageNum ? 'primary' : 'outline'}
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
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              variant="outline"
              size="sm"
              className={`${showFirstLast ? 'rounded-none border-r-0' : 'rounded-r-md rounded-l-none'}`}
              title={t ? t('nextPage', 'Next page') : 'Next page'}
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>

            {/* Last page button */}
            {showFirstLast && (
              <Button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage >= totalPages}
                variant="outline"
                size="sm"
                className="rounded-r-md rounded-l-none"
                title={`${t ? t('lastPage', 'Last page') : 'Last page'} (${totalPages})`}
              >
                <span className="sr-only">Last</span>
                <ChevronsRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
