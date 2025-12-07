import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { bookService } from '../../utils/api/services/bookService';
import { subjectService } from '../../utils/api/services/subjectService';
import { apiClient_, handleApiResponse } from '../../utils/api/client.js';
import BookCard from '../books/BookCard';

const SelectedBooksDisplay = ({
  selectedBookIds,
  onRemoveBook,
  t,
  showRemoveButtons = true
}) => {
  const [books, setBooks] = useState([]);
  const [allAvailableBooks, setAllAvailableBooks] = useState([]);
  const [loading, setLoading] = useState(false);
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

  // Fetch all available books once on mount
  useEffect(() => {
    const fetchAllBooks = async () => {
      try {
        setLoading(true);
        let allBooks = [];

        // Fetch from multiple grade levels (0-6 includes kindergarten through grade 6)
        for (let grade = 0; grade <= 6; grade++) {
          const response = await bookService.getBooksByGradeLevel(String(grade), 1, 100);
          if (response.success && response.data) {
            allBooks = [...allBooks, ...response.data];
          }
        }

        // Remove duplicates by book ID
        const uniqueBooks = Array.from(
          new Map(allBooks.map(book => [book.id, book])).values()
        );

        // Store all available books
        setAllAvailableBooks(uniqueBooks);
      } catch (error) {
        console.error('Error fetching book details:', error);
        setAllAvailableBooks([]);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch once on mount
    if (allAvailableBooks.length === 0) {
      fetchAllBooks();
    }
  }, []);

  // Filter books based on selectedBookIds (without refetching)
  useEffect(() => {
    if (!selectedBookIds || selectedBookIds.length === 0) {
      setBooks([]);
      return;
    }

    // Filter the cached books by selectedBookIds
    const filteredBooks = allAvailableBooks.filter(book =>
      selectedBookIds.includes(book.id)
    );
    setBooks(filteredBooks);
  }, [selectedBookIds, allAvailableBooks]);

  if (!selectedBookIds || selectedBookIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-gray-500 text-center">
          {t('noBooksSelected', 'No books selected')}
        </p>
      </div>
    );
  }

  // Filter books to only show those in selectedBookIds
  const filteredBooks = books.filter(book => selectedBookIds.includes(book.id));

  return (
    <>
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredBooks.length > 0 ? (
        <div className="grid grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {filteredBooks.map((book) => {
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
      ) : null}
    </>
  );
};

export default SelectedBooksDisplay;
