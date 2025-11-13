import { useState, useEffect } from 'react';
import { User, ArrowRightLeft, MinusCircle, Trash2, Users } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import SelectedCard from '../ui/SelectedCard';
import Dropdown from '../ui/Dropdown';
import classService from '../../utils/api/services/classService';

const StudentActionsModal = ({
  isOpen,
  onClose,
  selectedStudents,
  selectedStudentsData,
  classes,
  onTransfer,
  onRemove,
  loading = false,
  onRemoveStudent,
  onClearAll,
  schoolId // New prop to support cascading filters
}) => {
  const { t } = useLanguage();
  const [targetClassId, setTargetClassId] = useState('');
  const [activeTab, setActiveTab] = useState('transfer'); // 'transfer' or 'remove'
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('all');
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Get array of student data from selected IDs
  const studentsArray = selectedStudents.map(id => selectedStudentsData[id]).filter(Boolean);

  // Fetch classes by grade level when grade level changes
  useEffect(() => {
    if (!isOpen || !schoolId) {
      setFilteredClasses([]);
      return;
    }

    const fetchClassesByGradeLevel = async () => {
      try {
        setLoadingClasses(true);

        if (selectedGradeLevel === 'all') {
          // Use all available classes if 'all' is selected
          setFilteredClasses(classes);
        } else {
          // Fetch classes for the selected grade level from API
          const response = await classService.getBySchool(schoolId, {
            gradeLevel: selectedGradeLevel,
            limit: 100
          });

          if (response && response.classes && Array.isArray(response.classes)) {
            setFilteredClasses(response.classes);
          } else {
            setFilteredClasses([]);
          }
        }
      } catch (error) {
        console.error('Error fetching classes by grade level:', error);
        setFilteredClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClassesByGradeLevel();
  }, [selectedGradeLevel, isOpen, schoolId, classes]);

  // Reset filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedGradeLevel('all');
      setTargetClassId('');
      setFilteredClasses(classes);
    }
  }, [isOpen, classes]);

  // Get unique grade levels from all available classes
  const getGradeLevelOptions = () => {
    const uniqueLevels = new Set();
    classes.forEach(cls => {
      if (cls.gradeLevel) {
        uniqueLevels.add(cls.gradeLevel);
      }
    });

    return [
      { value: 'all', label: t('allGradeLevels', 'All Grade Levels') },
      ...Array.from(uniqueLevels)
        .sort((a, b) => Number(a) - Number(b))
        .map(level => ({
          value: level,
          label: t(`Grade ${level}`, `Grade ${level}`)
        }))
    ];
  };

  const handleTransfer = () => {
    if (targetClassId) {
      onTransfer(targetClassId);
      handleClose();
    }
  };

  const handleRemove = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmRemove = () => {
    onRemove();
    handleClose();
  };

  const handleClose = () => {
    setTargetClassId('');
    setActiveTab('transfer');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-blue-600" />
          <span>{t('manageSelectedStudents', 'Manage Selected Students')}</span>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
            {studentsArray.length}
          </span>
        </div>
      }
      size="2xl"
      height="xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <Button
            variant="outline"
            onClick={onClearAll}
            disabled={loading}
            size="sm"
          >
            {t('clearSelection', 'Clear Selection')}
          </Button>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              size="sm"
            >
              {t('cancel', 'Cancel')}
            </Button>
            {activeTab === 'transfer' ? (
              <Button
                variant="primary"
                onClick={handleTransfer}
                disabled={!targetClassId || loading || studentsArray.length === 0}
                size="sm"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                {loading ? t('transferring', 'Transferring...') : t('transfer', 'Transfer')}
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={handleRemove}
                disabled={loading || studentsArray.length === 0}
                size="sm"
              >
                <MinusCircle className="h-4 w-4 mr-2" />
                {loading ? t('removing', 'Removing...') : t('remove', 'Remove')}
              </Button>
            )}
          </div>
        </div>
      }
      stickyFooter
    >
      <div className="space-y-6">
        {/* Action Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'transfer'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ArrowRightLeft className="h-4 w-4 inline mr-2" />
            {t('transferStudent', 'Transfer Students')}
          </button>
          <button
            onClick={() => setActiveTab('remove')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'remove'
                ? 'border-b-2 border-red-600 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MinusCircle className="h-4 w-4 inline mr-2" />
            {t('removeStudents', 'Remove from Class')}
          </button>
        </div>

        {/* Transfer Tab Content */}
        {activeTab === 'transfer' && (
          <div className="space-y-4">
            {/* Grade Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('selectGradeLevel', 'Grade Level')}
              </label>
              <Dropdown
                value={selectedGradeLevel}
                onValueChange={setSelectedGradeLevel}
                options={getGradeLevelOptions()}
                placeholder={t('chooseGradeLevel', 'Choose grade level...')}
                minWidth="w-full"
                disabled={loadingClasses}
              />
            </div>

            {/* Target Class Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('selectTargetClass', 'Select Target Class')}
              </label>
              <Dropdown
                value={targetClassId}
                onValueChange={setTargetClassId}
                options={filteredClasses.map(cls => ({
                  value: cls.classId.toString(),
                  label: `${cls.name} - ${cls.academicYear}`
                }))}
                placeholder={loadingClasses ? (t('loadingClasses') || 'Loading classes...') : (filteredClasses.length === 0 ? t('noClassesAvailable', 'No classes available') : t('selectTargetClass', 'Select Target Class'))}
                minWidth="w-full"
                disabled={loadingClasses || filteredClasses.length === 0}
                maxHeight="max-h-[250px]"
              />
            </div>

            {/* Summary */}
            {studentsArray.length > 0 && targetClassId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full">
                <div className="flex items-start">
                  <ArrowRightLeft className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">
                      {t('readyToTransfer', 'Ready to Transfer')}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {studentsArray.length} {studentsArray.length === 1 ? t('student', 'student') : t('students', 'students')} {' '}
                      {t('willBeTransferredTo', 'will be transferred to')}{' '}
                      <span className="font-semibold">
                        {classes.find(c => c.classId.toString() === targetClassId)?.name}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        

        {/* Selected Students List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">
              {t('selectedStudents', 'Selected Students')} ({studentsArray.length})
            </h3>
          </div>

          {/* Student Cards Grid - Max 2 rows visible, then scroll */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-2">
            {studentsArray.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('noStudentsSelected', 'No students selected')}</p>
              </div>
            ) : (
              studentsArray.map(student => {
                const displayName = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown';
                const subtitle = student.class?.name
                  ? `${student.username || student.email || 'N/A'} • ${student.class.name}`
                  : (student.username || student.email || 'N/A');

                return (
                  <SelectedCard
                    key={student.id}
                    title={displayName}
                    subtitle={subtitle}
                    statusColor=""
                    onRemove={() => onRemoveStudent(student.id)}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmRemove}
        title={t('confirmRemoveStudents', 'Confirm Remove Students')}
        message={t('confirmRemoveStudentsMessage', `Are you sure you want to remove ${studentsArray.length} student(s) from their classes? This action cannot be undone.`)}
        type="danger"
        confirmText={t('remove', 'Remove')}
        cancelText={t('cancel', 'Cancel')}
        loading={loading}
      />
    </Modal>
  );
};

export default StudentActionsModal;
