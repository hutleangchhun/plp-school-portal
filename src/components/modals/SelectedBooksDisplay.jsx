import { useState, useEffect } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { bookService } from '../../utils/api/services/bookService';
import { subjectService } from '../../utils/api/services/subjectService';
import { apiClient_, handleApiResponse } from '../../utils/api/client.js';
import { Button } from '../ui/Button';
import BookCard from '../books/BookCard';

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
  const [bookCategories, setBookCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Fetch categories and subjects on mount
  useEffect(() => {
    const fetchCategoriesAndSubjects = async () => {
      try {
        // Fetch categories
        const categoriesResponse = await handleApiResponse(() =>
          apiClient_.get('book-categories?status=ACTIVE')
        );

        if (categoriesResponse.success && categoriesResponse.data) {
          const categoriesData = Array.isArray(categoriesResponse.data) ? categoriesResponse.data :
            Array.isArray(categoriesResponse.data.data) ? categoriesResponse.data.data : [];
          setBookCategories(categoriesData);
        }

        // Fetch subjects
        const subjectsResponse = await subjectService.getAll({ limit: 100 });
        if (subjectsResponse.success && subjectsResponse.data) {
          setSubjects(subjectsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching categories and subjects:', error);
      }
    };

    fetchCategoriesAndSubjects();
  }, []);

  // Fetch full book details for selected books (only on mount)
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

        // Store all books (don't filter yet - filtering happens in render)
        setBooks(uniqueBooks);
      } catch (error) {
        console.error('Error fetching book details:', error);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if books array is empty
    if (books.length === 0 && selectedBookIds && selectedBookIds.length > 0) {
      fetchBookDetails();
    }
  }, []);

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

  // Filter books to only show those in selectedBookIds
  const filteredBooks = books.filter(book => selectedBookIds.includes(book.id));
  const displayedBooks = showAll ? filteredBooks : filteredBooks.slice(0, maxDisplay);
  const hasMoreBooks = filteredBooks.length > maxDisplay;

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
      ) : filteredBooks.length > 0 ? (
        <>
          <div className="grid grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {displayedBooks.map((book) => {
              const categoryName = bookCategories.find(cat => cat.id === book.bookCategoryId)?.name || 'N/A';
              const subjectName = subjects.find(subj => subj.id === book.subjectId)?.khmer_name || subjects.find(subj => subj.id === book.subjectId)?.name || 'N/A';

              return (
                <BookCard
                  key={book.id}
                  book={book}
                  t={t}
                  getEmptyDisplay={() => 'N/A'}
                  layout="portrait"
                  categoryName={categoryName}
                  subjectName={subjectName}
                  showRemoveButton={showRemoveButtons}
                  onRemoveBook={onRemoveBook}
                />
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
      ) : null}
    </div>
  );
};

export default SelectedBooksDisplay;
