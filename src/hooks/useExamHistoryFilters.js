import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing exam history filters
 * Provides a consistent filtering interface across different exam record pages
 *
 * @param {Array} exams - Array of exam records to filter
 * @returns {Object} Filters state and filter methods
 */
export function useExamHistoryFilters(exams = []) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [examTypeFilter, setExamTypeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setStatusFilter('ALL');
    setExamTypeFilter('');
    setSubjectFilter('');
    setSearchTerm('');
  }, []);

  /**
   * Check if any filters are applied
   */
  const hasActiveFilters = useMemo(() => {
    return (
      statusFilter !== 'ALL' ||
      examTypeFilter !== '' ||
      subjectFilter !== '' ||
      searchTerm.trim() !== ''
    );
  }, [statusFilter, examTypeFilter, subjectFilter, searchTerm]);

  /**
   * Apply all filters to exams
   */
  const filteredExams = useMemo(() => {
    let filtered = [...exams];

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(exam => exam.status === statusFilter);
    }

    // Filter by exam type
    if (examTypeFilter) {
      filtered = filtered.filter(exam => exam.examType === examTypeFilter);
    }

    // Filter by subject
    if (subjectFilter) {
      filtered = filtered.filter(exam =>
        exam.subjectId?.toString() === subjectFilter ||
        exam.subject_id?.toString() === subjectFilter
      );
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(exam =>
        exam.examTitle?.toLowerCase().includes(search) ||
        exam.subjectName?.toLowerCase().includes(search) ||
        exam.subjectKhmerName?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [exams, statusFilter, examTypeFilter, subjectFilter, searchTerm]);

  return {
    // State
    statusFilter,
    examTypeFilter,
    subjectFilter,
    searchTerm,
    hasActiveFilters,
    filteredExams,

    // Setters
    setStatusFilter,
    setExamTypeFilter,
    setSubjectFilter,
    setSearchTerm,
    clearFilters
  };
}

export default useExamHistoryFilters;
