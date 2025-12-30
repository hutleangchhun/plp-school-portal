import { useState, useEffect, useRef } from 'react';
import { apiClient_, handleApiResponse } from '../utils/api/client';
import { subjectService } from '../utils/api/services/subjectService';

// Shared cache for book categories and subjects
let sharedBookCategoriesCache = null;
let sharedSubjectsCache = null;

// Promise-based coordination to ensure all instances get the data
let categoriesFetchPromise = null;
let subjectsFetchPromise = null;

// Subscriber callbacks to notify all instances when data is fetched
let categoriesSubscribers = [];
let subjectsSubscribers = [];

const notifyCategories = (data) => {
  categoriesSubscribers.forEach(callback => callback(data));
};

const notifySubjects = (data) => {
  subjectsSubscribers.forEach(callback => callback(data));
};

export const useBookCategories = () => {
  const [bookCategories, setBookCategories] = useState(() => sharedBookCategoriesCache || []);
  const [subjects, setSubjects] = useState(() => sharedSubjectsCache || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Subscribe to category updates
    const categoriesCallback = (data) => {
      setBookCategories(data);
    };
    categoriesSubscribers.push(categoriesCallback);

    // Subscribe to subject updates
    const subjectsCallback = (data) => {
      setSubjects(data);
    };
    subjectsSubscribers.push(subjectsCallback);

    // If we already have cached data, set it immediately
    if (sharedBookCategoriesCache) {
      setBookCategories(sharedBookCategoriesCache);
    }
    if (sharedSubjectsCache) {
      setSubjects(sharedSubjectsCache);
    }

    // Initiate fetch if not already happening
    const fetchData = async () => {
      setLoading(true);

      // Fetch categories with promise coordination
      if (!categoriesFetchPromise) {
        categoriesFetchPromise = (async () => {
          try {
            if (sharedBookCategoriesCache) {
              return sharedBookCategoriesCache;
            }

            const response = await handleApiResponse(() =>
              apiClient_.get('book-categories?status=ACTIVE')
            );

            if (response.success && response.data) {
              let data = response.data;

              // Handle different response formats
              if (!Array.isArray(data) && data.data && Array.isArray(data.data)) {
                data = data.data;
              }

              if (Array.isArray(data)) {
                sharedBookCategoriesCache = data;
                notifyCategories(data);
                return data;
              }
            }

            return [];
          } catch (error) {
            console.error('Error fetching book categories:', error);
            return [];
          }
        })();
      }

      const categoriesData = await categoriesFetchPromise;
      setBookCategories(categoriesData);

      // Fetch subjects with promise coordination
      if (!subjectsFetchPromise) {
        subjectsFetchPromise = (async () => {
          try {
            if (sharedSubjectsCache) {
              return sharedSubjectsCache;
            }

            const response = await subjectService.getAll({ limit: 100 });

            if (response.success && Array.isArray(response.data)) {
              sharedSubjectsCache = response.data;
              notifySubjects(response.data);
              return response.data;
            }

            return [];
          } catch (error) {
            console.error('Error fetching subjects:', error);
            return [];
          }
        })();
      }

      const subjectsData = await subjectsFetchPromise;
      setSubjects(subjectsData);
      setLoading(false);
    };

    fetchData();

    // Cleanup: unsubscribe
    return () => {
      categoriesSubscribers = categoriesSubscribers.filter(cb => cb !== categoriesCallback);
      subjectsSubscribers = subjectsSubscribers.filter(cb => cb !== subjectsCallback);
    };
  }, []);

  return {
    bookCategories,
    subjects,
    loading
  };
};
