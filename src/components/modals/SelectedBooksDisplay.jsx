import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import BookCard from '../books/BookCard';
import { useBookCategories } from '../../hooks/useBookCategories';
import { useAllBooks } from '../../hooks/useAllBooks';

const SelectedBooksDisplay = ({
  selectedBookIds,
  onRemoveBook,
  t,
  showRemoveButtons = true
}) => {
  // Use shared hooks to fetch book categories, subjects, and books (prevents duplicates)
  const { bookCategories, subjects } = useBookCategories();
  const { allBooks, loading } = useAllBooks();

  const [books, setBooks] = useState([]);

  // Filter books based on selectedBookIds (without refetching)
  useEffect(() => {
    if (!selectedBookIds || selectedBookIds.length === 0) {
      setBooks([]);
      return;
    }

    // Filter the cached books by selectedBookIds
    const filteredBooks = allBooks.filter(book =>
      selectedBookIds.includes(book.id)
    );
    setBooks(filteredBooks);
  }, [selectedBookIds, allBooks]);

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

  return (
    <>
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : books.length > 0 ? (
        <div className="grid grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {books.map((book) => {
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
