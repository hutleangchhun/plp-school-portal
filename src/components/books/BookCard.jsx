import { BookOpen } from 'lucide-react';
import { getBookCoverUrl } from '../../utils/api/config';

/**
 * BookCard Component - Reusable book card for displaying book information with cover image
 *
 * @param {Object} props
 * @param {Object} props.book - Book data object with title, subject, bookCategory, coverBook
 * @param {Function} props.t - Translation function from useLanguage hook
 * @param {Function} props.getEmptyDisplay - Function to get empty/N/A display text
 * @param {string} [props.layout='horizontal'] - Card layout: 'horizontal' (image right), 'vertical' (image top), or 'portrait' (image top with styled title)
 * @param {string} [props.imageSize='sm'] - Image size: 'sm' (w-28 h-28), 'md' (w-32 h-32), 'lg' (w-40 h-40)
 * @param {boolean} [props.showCategory=true] - Whether to display book category
 * @param {boolean} [props.hoverable=true] - Whether to show hover effects
 * @param {string} [props.borderColor='gray-200'] - Border color (e.g., 'blue-500', 'gray-200')
 * @param {boolean} [props.isSelected=false] - Whether the card is selected
 * @param {string} [props.categoryName] - Category name to display (for portrait layout)
 * @param {string} [props.subjectName] - Subject name to display (for portrait layout)
 * @param {boolean} [props.showRemoveButton=false] - Whether to show remove button overlay (for portrait layout)
 * @param {Function} [props.onRemoveBook] - Callback when remove button is clicked
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
  borderColor = 'gray-200',
  isSelected = false,
  categoryName,
  subjectName,
  showRemoveButton = false,
  onRemoveBook,
  className = ''
}) {
  // Get book cover URL from filename using helper function
  const bookCoverUrl = getBookCoverUrl(book?.coverBook);

  // Image size classes
  const imageSizeClasses = {
    sm: 'w-28 h-28',
    md: 'w-32 h-32',
    lg: 'w-40 h-40'
  };

  const imageSizeClass = imageSizeClasses[imageSize] || imageSizeClasses.sm;

  // Common styles
  const cardBaseClasses = `border-2 border-${borderColor} rounded-md overflow-hidden bg-white transition-shadow duration-200 ${hoverable ? 'hover:shadow-md' : ''}`;

  // Horizontal layout (image on right)
  if (layout === 'horizontal') {
    return (
      <div className={`flex flex-row ${cardBaseClasses} ${className}`}>
        {/* Book Info - Left Section */}
        <div className="flex-1 flex flex-col p-4   min-w-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 line-clamp-2">
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
            className={`w-full h-full flex items-center justify-center px-1 ${isSelected
                ? 'bg-gradient-to-br from-blue-100 to-blue-50'
                : 'bg-gradient-to-br from-gray-100 to-gray-50'
              }`}
            style={{ display: !bookCoverUrl ? 'flex' : 'none' }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <BookOpen className={`h-4 w-4 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
              <span className={`text-xs font-medium text-center ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>No Image</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vertical layout (image on top)
  if (layout === 'vertical') {
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
            className={`w-full h-full flex items-center justify-center ${isSelected
                ? 'bg-gradient-to-br from-blue-100 to-blue-50'
                : 'bg-gradient-to-br from-purple-100 to-purple-50'
              }`}
            style={{ display: !bookCoverUrl ? 'flex' : 'none' }}
          >
            <div className="flex flex-col items-center gap-1">
              <BookOpen className={`h-6 w-6 ${isSelected ? 'text-blue-400' : 'text-purple-400'}`} />
              <span className={`text-xs font-medium text-center ${isSelected ? 'text-blue-600' : 'text-purple-600'}`}>No Image</span>
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

  // Portrait layout (image top with styled title and category/subject below)
  return (
    <div className="relative group flex flex-col h-full">
      {/* Book Cover - Portrait style */}
      <div className="relative flex-1 bg-gradient-to-br from-gray-100 to-gray-200 rounded-md overflow-hidden mb-2 shadow-sm group-hover:shadow-md transition-shadow">
        {bookCoverUrl ? (
          <img
            src={bookCoverUrl}
            alt={book?.title || 'Book cover'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            style={{ minHeight: '160px' }}
            onError={(e) => {
              e.target.style.display = 'none';
              const fallback = e.target.parentElement.querySelector('[data-book-fallback]');
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
          />
        ) : null}

        {/* Fallback - No image */}
        <div
          data-book-fallback
          className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-50"
          style={{ display: !bookCoverUrl ? 'flex' : 'none', minHeight: '160px' }}
        >
          <div className="flex flex-col items-center gap-1">
            <BookOpen className="h-5 w-5 text-purple-400" />
            <span className="text-xs font-medium text-center text-purple-600">No Image</span>
          </div>
        </div>

        {/* Remove Button - Overlay on image */}
        {showRemoveButton && onRemoveBook && (
          <button
            type="button"
            onClick={() => onRemoveBook(book.id)}
            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            title={t('removeBook', 'Remove book')}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Book Title - Below image with blue background */}
      <div className="text-xs line-clamp-2 font-medium text-gray-700 bg-blue-50 p-4 rounded-md">
        <div className='text-sm font-bold line-clamp-1'>
          {book?.title || 'N/A'}
        </div>
        <div className="text-xs text-gray-600 space-y-0.5 mt-1">
          {categoryName && (
            <div className="truncate">
              <span className="font-semibold">{t('category', 'Category')}:</span> {categoryName}
            </div>
          )}
          {subjectName && (
            <div className="truncate">
              <span className="font-semibold">{t('subject', 'Subject')}:</span> {subjectName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookCard;
