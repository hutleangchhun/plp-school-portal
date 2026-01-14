import { useState, useEffect, useRef } from 'react';
import { bookService } from '../utils/api/services/bookService';

// Shared cache for all books to prevent duplicate requests
let sharedAllBooksCache = null;
let booksFetching = false;
let fetchPromise = null;

export const useAllBooks = (isEnabled = false) => {
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
    // Only fetch if enabled
    if (!isEnabled) {
      console.log('[useAllBooks] Fetch disabled (isEnabled=false)');
      return;
    }

    // Prevent duplicate fetches - if already initiated, skip
    if (fetchInitiatedRef.current) {
      console.log('[useAllBooks] Fetch already initiated in this instance');
      if (sharedAllBooksCache && isMountedRef.current) {
        console.log('[useAllBooks] Using cached books');
        setAllBooks(sharedAllBooksCache);
        setLoading(false);
      }
      return;
    }

    const fetchBooks = async () => {
      try {
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

        // If already fetching, wait for the existing promise
        if (booksFetching && fetchPromise) {
          console.log('[useAllBooks] Books already fetching, waiting for completion...');
          const result = await fetchPromise;
          if (isMountedRef.current) {
            setAllBooks(result);
            setLoading(false);
          }
          return;
        }

        // Start fetching
        console.log('[useAllBooks] Starting fresh fetch for all books');
        booksFetching = true;
        
        // Create the fetch promise for other instances to wait on
        fetchPromise = (async () => {
          try {
            let allBooksData = [];
            let currentPage = 1;
            let totalPages = 1;

            // Fetch all pages (API max limit is 100 per page)
            while (currentPage <= totalPages) {
              console.log(`[useAllBooks] Fetching page ${currentPage} of ${totalPages}`);
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
            return allBooksData;
          } catch (error) {
            console.error('[useAllBooks] Error fetching books:', error);
            return [];
          } finally {
            booksFetching = false;
            fetchPromise = null;
          }
        })();

        const result = await fetchPromise;
        if (isMountedRef.current) {
          setAllBooks(result);
          setLoading(false);
        }
      } catch (error) {
        console.error('[useAllBooks] Unexpected error:', error);
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchInitiatedRef.current = true;
    fetchBooks();
  }, [isEnabled]);

  return {
    allBooks,
    loading
  };
};

