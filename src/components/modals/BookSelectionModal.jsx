import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import Modal from '../ui/Modal';
import BookCard from '../books/BookCard';
import Dropdown from '../ui/Dropdown';
import { Button } from '../ui/Button';
import { bookService } from '../../utils/api/services/bookService';
import { apiClient_, handleApiResponse } from '../../utils/api/client.js';
import { gradeLevelOptions } from '../../utils/formOptions';

const BookSelectionModal = ({
  isOpen,
  onClose,
  selectedBookIds,
  onBookIdsChange,
  t
}) => {
  const [availableBooks, setAvailableBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [bookCategories, setBookCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('');

  // Fetch book categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await handleApiResponse(() =>
          apiClient_.get('book-categories?status=ACTIVE')
        );

        if (response.success && response.data) {
          const categoriesData = Array.isArray(response.data) ? response.data :
                                 Array.isArray(response.data.data) ? response.data.data : [];
          setBookCategories(categoriesData);
        } else {
          console.warn('Failed to fetch book categories:', response.error);
          setBookCategories([]);
        }
      } catch (error) {
        console.error('Error fetching book categories:', error);
        setBookCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch books when filters change
  useEffect(() => {
    const fetchBooks = async () => {
      // Require at least one filter to be selected
      if (!selectedGradeFilter && !selectedCategoryFilter) {
        setAvailableBooks([]);
        return;
      }

      try {
        setBooksLoading(true);

        // Use combined filter method - pass both category and grade level
        const response = await bookService.getBooks(
          selectedCategoryFilter || null,
          selectedGradeFilter || null,
          1,
          100
        );

        if (response.success && response.data) {
          setAvailableBooks(response.data);
        } else {
          console.warn('Failed to fetch books:', response.error);
          setAvailableBooks([]);
        }
      } catch (error) {
        console.error('Error fetching books:', error);
        setAvailableBooks([]);
      } finally {
        setBooksLoading(false);
      }
    };

    fetchBooks();
  }, [selectedGradeFilter, selectedCategoryFilter]);

  const handleClose = () => {
    setSelectedCategoryFilter('');
    setSelectedGradeFilter('');
    onClose();
  };

  const handleBookToggle = (bookId) => {
    const newBookIds = selectedBookIds.includes(bookId)
      ? selectedBookIds.filter(id => id !== bookId)
      : [...selectedBookIds, bookId];
    onBookIdsChange(newBookIds);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-purple-600" />
          {t('selectBooks', 'Select Books')}
        </div>
      }
      size="full"
      height="lg"
      stickyFooter={true}
      footer={
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedBookIds.length > 0 ? (
              <span className="font-semibold">
                {selectedBookIds.length} {selectedBookIds.length === 1 ? t('bookSelected', 'book selected') : t('booksSelected', 'books selected')}
              </span>
            ) : (
              <span>{t('noBooksSelected', 'No books selected')}</span>
            )}
          </div>
          <Button
            type="button"
            onClick={handleClose}
            variant="primary"
          >
            {t('done', 'Done')}
          </Button>
        </div>
      }
    >
      {/* Filters Section */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex flex-col gap-4">
          {/* Grade Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('gradeLevel', 'Grade Level')}
            </label>
            <Dropdown
              options={[
                { value: '', label: t('selectGradeLevel', 'Select Grade Level') },
                ...gradeLevelOptions
              ]}
              value={selectedGradeFilter}
              onValueChange={(value) => setSelectedGradeFilter(value)}
              placeholder={t('selectGradeLevel', 'Select Grade Level')}
              contentClassName="max-h-[200px] overflow-y-auto"
              disabled={false}
              className='w-full'
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              {t('filterByCategory', 'Filter by Category')}
            </label>
            {categoriesLoading ? (
              <div className="text-xs text-gray-500 p-2 border border-gray-300 rounded bg-gray-50">
                {t('loadingCategories', 'Loading categories...')}
              </div>
            ) : bookCategories.length > 0 ? (
              <Dropdown
                options={[
                  { value: '', label: t('allCategories', 'All Categories') },
                  ...bookCategories.map(cat => ({
                    value: String(cat.id),
                    label: cat.name
                  }))
                ]}
                value={selectedCategoryFilter}
                onValueChange={(value) => {
                  console.log('Category changed to:', value);
                  setSelectedCategoryFilter(value);
                }}
                placeholder={t('selectCategory', 'Select category')}
                contentClassName="max-h-[200px] overflow-y-auto"
                disabled={false}
                className='w-full'
              />
            ) : (
              <div className="text-xs text-gray-500 p-2 border border-gray-300 rounded bg-gray-50">
                {t('noCategories', 'No categories available')}
                {bookCategories.length === 0 && categoriesLoading === false && (
                  <div className="text-xs mt-1">({bookCategories.length} categories loaded)</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Books Grid */}
      {booksLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : availableBooks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableBooks.map((book) => {
            const isSelected = selectedBookIds.includes(book.id);

            return (
              <button
                key={book.id}
                type="button"
                onClick={() => handleBookToggle(book.id)}
                className="relative transition-all duration-200 text-left"
              >
                <BookCard
                  book={book}
                  t={t}
                  getEmptyDisplay={() => 'N/A'}
                  layout="horizontal"
                  imageSize="md"
                  showCategory={true}
                  hoverable={true}
                  borderColor={isSelected ? 'blue-500' : 'gray-200'}
                  isSelected={isSelected}
                  className={`${
                    isSelected
                      ? 'bg-gradient-to-l from-blue-50 to-white shadow-md'
                      : 'hover:border-blue-300 hover:shadow-md'
                  }`}
                />
                {/* Selection Checkmark Badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-1.5 shadow-lg">
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64">
          <BookOpen className="h-16 w-16 text-gray-300 mb-4" />
          <p className="text-gray-500 text-center">
            {t('noBooksAvailable', 'No books available for this grade level')}
          </p>
        </div>
      )}
    </Modal>
  );
};

export default BookSelectionModal;
