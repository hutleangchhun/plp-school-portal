import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import Dropdown from '../ui/Dropdown';
import { subjectService } from '../../utils/api/services/subjectService';

/**
 * SubjectFilterContent Component
 * Provides a reusable subject filter UI for use with SidebarFilter
 *
 * @param {string} selectedSubject - Currently selected subject ID
 * @param {function} onSubjectChange - Callback when subject selection changes
 */
export default function SubjectFilterContent({
  selectedSubject = '',
  onSubjectChange
}) {
  const { t } = useLanguage();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        const response = await subjectService.getAll({ limit: 1000 });
        if (response.success && response.data) {
          setSubjects(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
        setError(err?.message || 'Failed to load subjects');
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  // Build filter options
  const filterOptions = [
    { value: '', label: t('allSubjects', 'All Subjects') }
  ];

  if (subjects && Array.isArray(subjects)) {
    subjects.forEach(subject => {
      filterOptions.push({
        value: subject.id?.toString() || subject.name,
        label: subject.khmer_name || subject.name || 'Unknown'
      });
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('selectSubject', 'Select Subject')}
        </label>
        <Dropdown
          value={selectedSubject}
          onValueChange={onSubjectChange}
          options={filterOptions}
          disabled={loading}
          className="w-full"
        />
      </div>

      {loading && (
        <p className="text-sm text-gray-500 italic">
          {t('loadingSubjects', 'Loading subjects...')}
        </p>
      )}
    </div>
  );
}
