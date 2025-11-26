import { useState, useEffect } from 'react';
import { BookOpen, X, ChevronDown } from 'lucide-react';
import { bookService } from '../../utils/api/services/bookService';
import { getBookCoverUrl } from '../../utils/api/config';
import { Button } from '../ui/Button';

const SelectedBooksDisplay = ({
  selectedBookIds,
  onRemoveBook,
  t,
  showRemoveButtons = true,
  maxDisplay = 10
}) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Fetch full book details for selected books
  useEffect(() => {
    const fetchBookDetails = async () => {
      if (!selectedBookIds || selectedBookIds.length === 0) {
        setBooks([]);
        return;
      }

      try {
        setLoading(true);
        // Fetch books by all grade levels to get complete book data
        // We use a large limit to ensure we get all available books
        // Note: API may need pagination if total books exceed limit
        let allBooks = [];

        // Fetch from multiple grade levels (1-6 covers primary education)
        for (let grade = 1; grade <= 6; grade++) {
          const response = await bookService.getBooksByGradeLevel(String(grade), 1, 100);
          if (response.success && response.data) {
            allBooks = [...allBooks, ...response.data];
          }
        }

        // Remove duplicates by book ID
        const uniqueBooks = Array.from(
          new Map(allBooks.map(book => [book.id, book])).values()
        );

        // Filter to only selected books
        const filteredBooks = uniqueBooks.filter(book =>
          selectedBookIds.includes(book.id)
        );
        setBooks(filteredBooks);
      } catch (error) {
        console.error('Error fetching book details:', error);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [selectedBookIds]);

  if (!selectedBookIds || selectedBookIds.length === 0) {
    return (
      <div className="bg-white rounded-md border border-gray-200 p-6">
        <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('selectedBooks', 'Selected Books')}
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 text-center">
            {t('noBooksSelected', 'No books selected')}
          </p>
        </div>
      </div>
    );
  }

  const displayedBooks = showAll ? books : books.slice(0, maxDisplay);
  const hasMoreBooks = books.length > maxDisplay;

  return (
    <div className="bg-white rounded-md border border-gray-200 p-6 mt-6">
      <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('selectedBooks', 'Selected Books')}
        </h3>
        <span className="ml-2 px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-full">
          {selectedBookIds.length}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : books.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-3">
            {displayedBooks.map((book) => {
              // Get book cover URL from filename using helper function
              const bookCoverUrl = getBookCoverUrl(book?.coverBook);

              return (
                <div key={book.id} className="relative group flex flex-col h-full">
                  {/* Book Cover - Tall/Portrait style */}
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
                    {showRemoveButtons && (
                      <button
                        type="button"
                        onClick={() => onRemoveBook(book.id)}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('removeBook', 'Remove book')}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Book Title - Below image */}
                  <div className="text-xs line-clamp-2 font-medium text-gray-700">
                    {book?.title || 'N/A'}
                  </div>
                </div>
              );
            })}
          </div>

          {hasMoreBooks && (
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant={showAll ? 'outline' : 'primary'}
                onClick={() => setShowAll(!showAll)}
                className="flex items-center gap-2"
              >
                {showAll ? (
                  <>
                    {t('showLess', 'Show Less')}
                  </>
                ) : (
                  <>
                    {t('showMore', 'Show More')} ({books.length - maxDisplay} {t('more', 'more')})
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      ) : selectedBookIds.length > 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 text-center">
            {t('bookDetailsNotAvailable', 'Book details not available')}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default SelectedBooksDisplay;
