import { useState, useEffect, useRef } from 'react';
import { bookService } from '../utils/api/services/bookService';

// Shared cache for all books to prevent duplicate requests
let sharedAllBooksCache = null;
let booksFetching = false;

export const useAllBooks = () => {
  const [allBooks, setAllBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);
  const fetchInitiatedRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Prevent Strict Mode from triggering duplicate fetches
    if (fetchInitiatedRef.current) {
      console.log('[useAllBooks] Fetch already initiated in this component instance (Strict Mode)');
      // Cache should already be loading or loaded
      if (sharedAllBooksCache && isMountedRef.current) {
        console.log('[useAllBooks] Using cached books (Strict Mode second render)');
        setAllBooks(sharedAllBooksCache);
        setLoading(false);
      }
      return;
    }

    const fetchBooks = async () => {
      setLoading(true);

      // If cache exists, use it immediately
      if (sharedAllBooksCache) {
        console.log('[useAllBooks] Using cached books');
        if (isMountedRef.current) {
          setAllBooks(sharedAllBooksCache);
          setLoading(false);
        }
        return;
      }

      // If already fetching, wait for it to complete
      if (booksFetching) {
        console.log('[useAllBooks] Books already fetching, waiting...');
        // Wait for the fetch to complete
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (!booksFetching && sharedAllBooksCache) {
              console.log('[useAllBooks] Fetch completed, using cache');
              clearInterval(checkInterval);
              if (isMountedRef.current) {
                setAllBooks(sharedAllBooksCache);
              }
              resolve();
            }
          }, 50);
        });
        if (isMountedRef.current) {
          setLoading(false);
        }
        return;
      }

      // Start fetching - fetch all books without grade filter for better performance
      console.log('[useAllBooks] Starting fetch for all books');
      booksFetching = true;
      try {
        let allBooksData = [];
        let currentPage = 1;
        let totalPages = 1;

        // Fetch all pages (API max limit is 100 per page)
        while (currentPage <= totalPages) {
          console.log(`[useAllBooks] Fetching page ${currentPage}`);
          const response = await bookService.getBooks(null, null, null, currentPage, 100);

          if (response.success && response.data) {
            allBooksData = [...allBooksData, ...response.data];
            totalPages = response.pagination?.totalPages || 1;
            currentPage++;
          } else {
            throw new Error(response.error || 'Failed to fetch books');
          }
        }

        console.log(`[useAllBooks] Fetch complete. Total books: ${allBooksData.length}`);
        sharedAllBooksCache = allBooksData;
        if (isMountedRef.current) {
          setAllBooks(allBooksData);
        }
      } catch (error) {
        console.error('Error fetching books:', error);
        if (isMountedRef.current) {
          setAllBooks([]);
        }
      } finally {
        booksFetching = false;
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchInitiatedRef.current = true;
    fetchBooks();
  }, []);

  return {
    allBooks,
    loading
  };
};
