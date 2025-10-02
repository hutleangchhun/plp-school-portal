import React, { useState, useEffect } from 'react';
import { X, Users, Folder, FolderOpen } from 'lucide-react';
import { Button } from '../ui/Button';
import Modal from '../ui/Modal';
import { useLanguage } from '../../contexts/LanguageContext';
import studentService from '../../utils/api/services/studentService';

const SelectedStudentsManager = ({
  selectedStudents = [],
  selectedStudentsData = {},
  onRemoveStudent,
  onClearAll,
  onBulkAction,
  actions = [],
  classes = [],
  className = '',
  showActions = true,
  isOpen: externalIsOpen,
  onToggle,
  autoOpen = true
}) => {
  const { t } = useLanguage();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [userManuallyClosed, setUserManuallyClosed] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [assigningStudents, setAssigningStudents] = useState(false);

  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  // Reset manual close flag when students are added/removed
  useEffect(() => {
    if (selectedStudents.length > 0) {
      setUserManuallyClosed(false);
    }
  }, [selectedStudents.length]);

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
            // Show error (you might want to add a toast or error display here)
            console.error(
              `Cannot assign ${selectedStudents.length} students. Class "${selectedClassData.name}" has only ${remainingCapacity} spots remaining (${currentEnrollment}/${maxStudents} currently enrolled).`
            );
            return;
          }
        } catch (error) {
          console.warn('Could not check current enrollment, proceeding with assignment:', error);
        }
      }

      await studentService.addStudentsToClass(classId, selectedStudents);

      // Show success message (you might want to add a toast here)
      const selectedClassName = selectedClassData?.name || 'Unknown Class';
      console.log(`Students assigned successfully to ${selectedClassName}`);

      // Reset selections and close sidebar
      setSelectedClass('');
      onClearAll();
      handleClose();

    } catch (error) {
      console.error('Error assigning students to class:', error);
      // Show error (you might want to add a toast here)
    } finally {
      setAssigningStudents(false);
    }
  };

  if (selectedStudents.length === 0) {
    return null;
  }

  return (
    <>
      {/* Toggle Button - Only show when students are selected */}
      {selectedStudents.length > 0 && !isOpen && (
        <div className="mb-4">
          <Button
            onClick={() => {
              if (externalIsOpen !== undefined) {
                onToggle?.(true);
              } else {
                setInternalIsOpen(true);
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            size="sm"
          >
            <Users className="h-4 w-4 mr-2" />
            {t('viewSelectedStudents') || 'View Selected Students'} ({selectedStudents.length})
          </Button>
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
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      {t('selectClass') || 'ជ្រើសរើសថ្នាក់'}
                    </label>
                    <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
                      {classes.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          {t('loadingClasses') || 'Loading classes...'}
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {classes.map((cls) => {
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
                                      Grade {cls.gradeLevel} • Max: {cls.maxStudents || 50} students
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {selectedClass && (
                      <div className="mt-2 text-xs text-blue-600">
                        Selected: {classes.find(cls => (cls.id || cls.classId).toString() === selectedClass)?.name}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleAssignToClass}
                    disabled={!selectedClass || assigningStudents}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    size="sm"
                  >
                    {assigningStudents ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {t('assigning') || 'កំពុងកំណត់...'}
                      </>
                    ) : (
                      <>{t('assignStudents') || 'កំណត់សិស្ស'}</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Clear Selection Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="w-full"
            >
              {t('clearSelection') || 'សម្អាតការជ្រើសរើស'}
            </Button>
          </div>
        }
      >
        {/* Selected Students List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {selectedStudents.map(studentId => {
            const student = selectedStudentsData[studentId];

            // Handle case where student data might be missing
            const studentName = student
              ? (student.name ||
                  `${student.firstName || ''} ${student.lastName || ''}`.trim() ||
                  student.username || 'No Name')
              : `Student ID: ${studentId}`;

            const studentInfo = student
              ? `${student.email || 'No email'} • ${student.studentId || 'No ID'}`
              : 'Student data not available';

            return (
              <div
                key={studentId}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  student
                    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      student ? 'bg-blue-500' : 'bg-orange-500'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {studentName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {studentInfo}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveStudent(studentId)}
                  className={`ml-2 flex justify-center items-center h-8 w-8 p-0  transition-all duration-200 ${
                    student
                      ? 'text-red-500 border-red-300 hover:text-white hover:rounded-md hover:bg-red-500 hover:border-red-400 hover:scale-110'
                      : 'text-orange-500 border-orange-300 hover:text-orange-700 hover:bg-orange-50 hover:border-orange-400 hover:scale-110'
                  }`}
                  title={t('remove') || 'ដកចេញ'}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
};

export default SelectedStudentsManager;