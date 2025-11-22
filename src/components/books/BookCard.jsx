import { BookOpen } from 'lucide-react';

/**
 * BookCard Component - Reusable book card for displaying book information with cover image
 *
 * @param {Object} props
 * @param {Object} props.book - Book data object with title, subject, bookCategory, coverBook
 * @param {Function} props.t - Translation function from useLanguage hook
 * @param {Function} props.getEmptyDisplay - Function to get empty/N/A display text
 * @param {string} [props.layout='horizontal'] - Card layout: 'horizontal' (image right) or 'vertical' (image top)
 * @param {string} [props.imageSize='sm'] - Image size: 'sm' (w-28 h-28), 'md' (w-32 h-32), 'lg' (w-40 h-40)
 * @param {boolean} [props.showCategory=true] - Whether to display book category
 * @param {boolean} [props.hoverable=true] - Whether to show hover effects
 * @param {string} [props.className=''] - Additional CSS classes
 */
function BookCard({
  book,
  t,
  getEmptyDisplay,
  layout = 'horizontal',
  imageSize = 'sm',
  showCategory = true,
  hoverable = true,
  className = ''
}) {
  // Helper function to get static asset base URL
  const getStaticAssetBaseUrl = () => {
    if (import.meta.env.VITE_STATIC_BASE_URL) {
      return import.meta.env.VITE_STATIC_BASE_URL;
    }
    if (import.meta.env.MODE === 'development') {
      return 'http://localhost:8080';
    }
    return 'https://plp-api.moeys.gov.kh';
  };

  // Construct book cover image URL
  const bookCoverUrl = book?.coverBook
    ? `${getStaticAssetBaseUrl()}/uploads/books/${book.coverBook}`
    : null;

  // Image size classes
  const imageSizeClasses = {
    sm: 'w-28 h-28',
    md: 'w-32 h-32',
    lg: 'w-40 h-40'
  };

  const imageSizeClass = imageSizeClasses[imageSize] || imageSizeClasses.sm;

  // Common styles
  const cardBaseClasses = `border-2 border-gray-200 rounded-xl overflow-hidden bg-white transition-shadow duration-200 ${hoverable ? 'hover:shadow-md' : ''}`;

  // Horizontal layout (image on right)
  if (layout === 'horizontal') {
    return (
      <div className={`flex flex-row ${cardBaseClasses} ${className}`}>
        {/* Book Info - Left Section */}
        <div className="flex-1 flex flex-col p-3 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 line-clamp-2">
              {book?.title || getEmptyDisplay()}
            </p>
            <p className="text-xs text-gray-600 mt-1 line-clamp-1">
              <span className="font-medium">{t('subject', 'Subject')}:</span> {book?.subjectKhmer || book?.subject || getEmptyDisplay()}
            </p>
            {showCategory && book?.bookCategory && (
              <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                <span className="font-medium">{t('category', 'Category')}:</span> {book.bookCategory}
              </p>
            )}
          </div>
        </div>

        {/* Book Cover Image - Right Side */}
        <div className={`relative flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden ${imageSizeClass}`}>
          {bookCoverUrl ? (
            <img
              src={bookCoverUrl}
              alt={book?.title || 'Book cover'}
              className={`w-full h-full object-cover ${hoverable ? 'hover:scale-105' : ''} transition-transform duration-300`}
              onError={(e) => {
                e.target.style.display = 'none';
                const fallback = e.target.parentElement.querySelector('[data-book-fallback]');
                if (fallback) {
                  fallback.style.display = 'flex';
                }
              }}
            />
          ) : null}

          {/* Fallback when no image or image fails */}
          <div
            data-book-fallback
            className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-50 px-1"
            style={{ display: !bookCoverUrl ? 'flex' : 'none' }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <BookOpen className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-purple-600 font-medium text-center">No Image</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vertical layout (image on top)
  return (
    <div className={`flex flex-col ${cardBaseClasses} ${className}`}>
      {/* Book Cover Image - Top */}
      <div className={`relative flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden w-full ${imageSizeClass}`}>
        {bookCoverUrl ? (
          <img
            src={bookCoverUrl}
            alt={book?.title || 'Book cover'}
            className={`w-full h-full object-cover ${hoverable ? 'hover:scale-105' : ''} transition-transform duration-300`}
            onError={(e) => {
              e.target.style.display = 'none';
              const fallback = e.target.parentElement.querySelector('[data-book-fallback]');
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
          />
        ) : null}

        {/* Fallback when no image or image fails */}
        <div
          data-book-fallback
          className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-50"
          style={{ display: !bookCoverUrl ? 'flex' : 'none' }}
        >
          <div className="flex flex-col items-center gap-1">
            <BookOpen className="h-6 w-6 text-purple-400" />
            <span className="text-xs text-purple-600 font-medium text-center">No Image</span>
          </div>
        </div>
      </div>

      {/* Book Info - Bottom */}
      <div className="flex-1 flex flex-col p-3 min-w-0">
        <p className="text-xs font-semibold text-gray-900 line-clamp-2">
          {book?.title || getEmptyDisplay()}
        </p>
        <p className="text-xs text-gray-600 mt-1 line-clamp-1">
          <span className="font-medium">{t('subject', 'Subject')}:</span> {book?.subjectKhmer || book?.subject || getEmptyDisplay()}
        </p>
        {showCategory && book?.bookCategory && (
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
            <span className="font-medium">{t('category', 'Category')}:</span> {book.bookCategory}
          </p>
        )}
      </div>
    </div>
  );
}

export default BookCard;
