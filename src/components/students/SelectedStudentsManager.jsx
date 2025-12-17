import React, { useState, useEffect, useMemo } from 'react';
import { Users, Folder, FolderOpen, Filter } from 'lucide-react';
import { Button } from '../ui/Button';
import Modal from '../ui/Modal';
import Dropdown from '../ui/Dropdown';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import studentService from '../../utils/api/services/studentService';
import classService from '../../utils/api/services/classService';
import DynamicLoader from '../ui/DynamicLoader';
import SelectedCard from '../ui/SelectedCard';
import { formatClassIdentifier, getGradeLevelOptions as getSharedGradeLevelOptions } from '../../utils/helpers';
import { getFullName } from '../../utils/usernameUtils';

const SelectedStudentsManager = ({
  selectedStudents = [],
  selectedStudentsData = {},
  onRemoveStudent,
  onClearAll,
  onBulkAction,
  actions = [],
  schoolId, // Add schoolId prop to fetch classes
  classes: externalClasses, // Accept classes as prop to avoid duplicate fetches
  className = '',
  showActions = true,
  isOpen: externalIsOpen,
  onToggle,
  autoOpen = true,
  onRefresh
}) => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();

  // Debug: Log component props
  console.log('🏗️ SelectedStudentsManager mounted with props:', {
    schoolId,
    selectedStudentsCount: selectedStudents.length,
    showActions,
    isOpen: externalIsOpen,
    externalClassesProvided: !!externalClasses
  });
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [userManuallyClosed, setUserManuallyClosed] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [assigningStudents, setAssigningStudents] = useState(false);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('all');
  const [internalClasses, setInternalClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  // Reset manual close flag when students are added/removed
  useEffect(() => {
    if (selectedStudents.length > 0) {
      setUserManuallyClosed(false);
    }
  }, [selectedStudents.length]);

  // Use external classes if provided, otherwise fetch them
  useEffect(() => {
    console.log('🔍 SelectedStudentsManager useEffect triggered with:', {
      schoolId,
      selectedGradeLevel,
      hasExternalClasses: !!externalClasses,
      externalClassesCount: externalClasses?.length
    });

    // If classes are provided externally, use them instead of fetching
    if (externalClasses && Array.isArray(externalClasses)) {
      console.log('✅ Using external classes, no fetch needed:', externalClasses.length, 'classes');
      setInternalClasses(externalClasses);
      setLoadingClasses(false);
      return;
    }

    // Only fetch if no external classes provided
    const fetchClasses = async () => {
      if (!schoolId) {
        console.log('❌ No schoolId provided, skipping class fetch');
        setInternalClasses([]);
        return;
      }

      try {
        setLoadingClasses(true);
        console.log('🔄 Starting to fetch classes for school:', schoolId, 'grade:', selectedGradeLevel);

        // Build query parameters like in ClassesManagement.jsx
        const queryParams = {
          limit: 1000 // Set a high limit to get all classes
        };
        if (selectedGradeLevel && selectedGradeLevel !== 'all') {
          queryParams.gradeLevel = selectedGradeLevel;
          console.log('🎯 Filtering by grade level:', selectedGradeLevel);
        }

        console.log('🌐 Making API call to classService.getBySchool with params:', queryParams);
        const response = await classService.getBySchool(schoolId, queryParams);
        console.log('📚 Raw API response:', response);

        if (response && response.success && response.classes) {
          setInternalClasses(response.classes);
          console.log('✅ Classes loaded successfully:', response.classes.length, 'classes for grade:', selectedGradeLevel);
          console.log('📝 First class example:', response.classes[0]);
        } else {
          console.warn('⚠️ No classes found in response or response.success is false');
          console.log('🔍 Response structure:', response);
          setInternalClasses([]);
        }
      } catch (error) {
        console.error('❌ Error fetching classes:', error);
        console.error('🔍 Error details:', error.message, error.stack);
        showError(t('errorFetchingClasses', 'Failed to load classes'));
        setInternalClasses([]);
      } finally {
        setLoadingClasses(false);
        console.log('🏁 Finished fetching classes, loadingClasses set to false');
      }
    };

    fetchClasses();
  }, [schoolId, selectedGradeLevel, externalClasses, showError, t]);

  // Use external classes if provided, otherwise use internal classes
  const classes = externalClasses || internalClasses;

  // Grade level options using shared helper (includes Kindergarten/grade 0)
  const gradeLevelOptions = useMemo(() => {
    return getSharedGradeLevelOptions(t, true);
  }, [t]);

  // Filter classes by selected grade level (client-side filtering when using external classes)
  const filteredClasses = useMemo(() => {
    if (selectedGradeLevel === 'all') {
      return classes;
    }
    return classes.filter(cls => String(cls.gradeLevel) === String(selectedGradeLevel));
  }, [classes, selectedGradeLevel]);

  // Auto-open disabled - now controlled by button click only

  // Modal component handles escape key automatically

  const handleClose = () => {
    setUserManuallyClosed(true);
    if (externalIsOpen !== undefined) {
      onToggle?.(false);
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleAssignToClass = async () => {
    if (!selectedClass || selectedStudents.length === 0) {
      return;
    }

    try {
      setAssigningStudents(true);

      // Convert selectedClass to number for API call
      const classId = parseInt(selectedClass);

      // Find the selected class details to check capacity
      const selectedClassData = classes.find(cls =>
        cls.id === classId || cls.id === selectedClass ||
        cls.id.toString() === selectedClass
      );

      if (selectedClassData && selectedClassData.maxStudents) {
        // Get current enrollment count for this class
        try {
          const currentStudentsResponse = await studentService.getMyStudents({ classId: classId });
          const currentEnrollment = currentStudentsResponse?.data?.length || 0;
          const maxStudents = selectedClassData.maxStudents;
          const remainingCapacity = maxStudents - currentEnrollment;

          console.log(`Class capacity check: ${currentEnrollment}/${maxStudents} (${remainingCapacity} remaining)`);

          // Check if adding selected students would exceed capacity
          if (selectedStudents.length > remainingCapacity) {
            const errorMsg = t('classCapacityExceeded',
              `Cannot assign ${selectedStudents.length} students. Class "${selectedClassData.name}" has only ${remainingCapacity} spots remaining (${currentEnrollment}/${maxStudents} currently enrolled).`
            );
            console.error(errorMsg);
            showError(errorMsg);
            return;
          }
        } catch (error) {
          console.warn('Could not check current enrollment, proceeding with assignment:', error);
        }
      }

      const response = await studentService.addStudentsToClass(classId, selectedStudents);

      // Check if the API call was successful
      if (!response.success) {
        const errorMsg = response.error || 'Failed to assign students to class';
        console.error('API call failed:', errorMsg);
        showError(errorMsg);
        return;
      }

      // Show success message
      const selectedClassName = selectedClassData?.name || 'Unknown Class';
      const successMsg = t('studentsAssignedSuccess',
        `Successfully assigned ${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''} to ${selectedClassName}`
      );
      console.log(successMsg);
      showSuccess(successMsg);

      // Reset selections and close sidebar
      setSelectedClass('');
      onClearAll();
      handleClose();

      // Refresh parent component data to reflect changes
      if (onRefresh) {
        console.log('Refreshing parent component data after student assignment');
        onRefresh();
      }

    } catch (error) {
      console.error('Error assigning students to class:', error);
      const errorMsg = error.message || t('errorAssigningStudents', 'Failed to assign students to class');
      showError(errorMsg);
    } finally {
      setAssigningStudents(false);
    }
  };

  if (selectedStudents.length === 0) {
    return null;
  }

  return (
    <>
      {/* Notification Badge - Only show when students are selected */}
      {selectedStudents.length > 0 && !isOpen && (
        <div className="mb-4 flex justify-center">
          <button
            onClick={() => {
              if (externalIsOpen !== undefined) {
                onToggle?.(true);
              } else {
                setInternalIsOpen(true);
              }
            }}
            className="group relative inline-flex items-center justify-center p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
            title={t('viewSelectedStudents') || 'View Selected Students'}
          >
            <Users className="h-5 w-5" />
            {/* Notification count badge */}
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-md border-2 border-white">
              {selectedStudents.length > 99 ? '99+' : selectedStudents.length}
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
              {t('viewSelectedStudents') || 'View Selected Students'}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
            </div>
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>{t('selectedStudents') || 'សិស្សបានជ្រើសរើស'}</span>
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
              {selectedStudents.length}
            </span>
          </div>
        }
        size="2xl"
        height="xl"
        className={className}
        footer={
          <div className="space-y-4">
            {/* Class Assignment Section */}
            {showActions && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  {t('assignToClass') || 'កំណត់ទៅថ្នាក់'}:
                </h4>
                <div className="space-y-3">
                  {/* Grade Level Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      <Filter className="h-3 w-3 inline mr-1" />
                      {t('gradeLevel') || 'Filter by Grade Level'}:
                    </label>
                    <Dropdown
                      value={selectedGradeLevel}
                      onValueChange={(value) => {
                        setSelectedGradeLevel(value);
                        setSelectedClass(''); // Reset class selection when grade changes
                      }}
                      options={gradeLevelOptions}
                      placeholder={t('selectGradeLevel') || 'Select Grade Level'}
                      className="w-full"
                      minWidth="w-full"
                    />
                  </div>
                  <div>
                    <div className="border border-gray-300 rounded-md max-h-64 overflow-y-auto">
                      {loadingClasses ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          <DynamicLoader type="spinner" size="sm" className="inline-block mr-2" />
                          {t('loadingClasses') || 'Loading classes...'}
                        </div>
                      ) : classes.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          {t('noClassesAvailable') || 'No classes available'}
                        </div>
                      ) : filteredClasses.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          {t('noClassesForGrade') || 'No classes available for selected grade level'}
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {filteredClasses.map((cls) => {
                            const classId = (cls.id || cls.classId).toString();
                            const isSelected = selectedClass === classId;
                            return (
                              <div
                                key={classId}
                                onClick={() => setSelectedClass(isSelected ? '' : classId)}
                                className={`flex items-center p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                                  isSelected ? 'bg-blue-50 border-blue-200' : ''
                                }`}
                              >
                                <div className="flex items-center space-x-3 flex-1">
                                  {isSelected ? (
                                    <FolderOpen className="h-5 w-5 text-blue-600" />
                                  ) : (
                                    <Folder className="h-5 w-5 text-gray-500" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {cls.name}
                                      </p>
                                      {isSelected && (
                                        <div className="w-2 h-2 bg-blue-600 rounded-full ml-2"></div>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                      {(() => {
                                        const rawGradeLevel =
                                          typeof cls.gradeLevel !== 'undefined' && cls.gradeLevel !== null
                                            ? String(cls.gradeLevel)
                                            : '';

                                        const displayGradeLevel =
                                          rawGradeLevel === '0'
                                            ? t('grade0', 'Kindergarten')
                                            : rawGradeLevel;

                                        return `${t('class') || 'Class'} ${formatClassIdentifier(displayGradeLevel, cls.section)} • ${cls.academicYear}`;
                                      })()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className='flex justify-between items-center space-x-4'>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="w-full"
            >
              {t('clearSelection') || 'សម្អាតការជ្រើសរើស'}
            </Button>
            <Button
                    onClick={handleAssignToClass}
                    disabled={!selectedClass || assigningStudents}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    size="sm"
                  >
                    {assigningStudents ? (
                      <DynamicLoader
                        type="spinner"
                        size="sm"
                        variant="white"
                        message={t('assigning') || 'កំពុងកំណត់...'}
                      />
                    ) : (
                      <>{t('assignStudents') || 'កំណត់សិស្ស'}</>
                    )}
                  </Button>
                  {/* Clear Selection Button */}
            </div>
          </div>
        }
      >
        {/* Selected Students List - Scrollable */}
        <div className="max-h-96 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedStudents.map(studentId => {
              const student = selectedStudentsData[studentId];

              // Handle case where student data might be missing
              const studentName = student
                ? getFullName(student, student.username || 'No Name')
                : `Student ID: ${studentId}`;

              const studentInfo = student
                ? `${student.email || 'No email'} • ${student.studentId || 'No ID'}`
                : 'Student data not available';

              return (
                <div key={studentId} className="bg-blue-50 border border-blue-200 rounded-lg p-3 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {/* Selection indicator */}
                      <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {studentName}
                        </h4>
                        <p className="text-xs text-gray-600 truncate">
                          {studentInfo}
                        </p>
                      </div>
                    </div>
                    {/* Remove button */}
                    <button
                      onClick={() => onRemoveStudent(studentId)}
                      className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors duration-200 flex-shrink-0"
                      title="Remove student"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Scroll indicator */}
          {selectedStudents.length > 5 && (
            <div className="text-center mt-3 text-xs text-gray-500">
              {selectedStudents.length > 5 ? (t('scrollToSeeMoreStudents') || 'រំកិលដើម្បីមើលសិស្សបន្ថែម') : ''}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default SelectedStudentsManager;