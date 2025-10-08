import { useState } from 'react';
import { User, ArrowRightLeft, MinusCircle, X, Trash2, Users, Folder, FolderOpen } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';
import Modal from '../ui/Modal';
import { Badge } from '../ui/Badge';
import ConfirmDialog from '../ui/ConfirmDialog';

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
  onClearAll
}) => {
  const { t } = useLanguage();
  const [targetClassId, setTargetClassId] = useState('');
  const [activeTab, setActiveTab] = useState('transfer'); // 'transfer' or 'remove'
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Get array of student data from selected IDs
  const studentsArray = selectedStudents.map(id => selectedStudentsData[id]).filter(Boolean);

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
            >
              {t('cancel', 'Cancel')}
            </Button>
            {activeTab === 'transfer' ? (
              <Button
                variant="primary"
                onClick={handleTransfer}
                disabled={!targetClassId || loading || studentsArray.length === 0}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                {loading ? t('transferring', 'Transferring...') : t('transfer', 'Transfer')}
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={handleRemove}
                disabled={loading || studentsArray.length === 0}
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
          <div className="space-y-4 space-x-4 flex items-center">
            {/* Target Class Selector */}
            <div className='w-full'>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('selectTargetClass', 'Select Target Class')}
              </label>
              <div className={`border border-gray-300 rounded-md ${classes.length > 3 ? 'max-h-[180px] overflow-y-auto' : ''}`}>
                {classes.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {t('loadingClasses') || 'Loading classes...'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {classes.map((cls) => {
                      const classId = cls.classId.toString();
                      const isSelected = targetClassId === classId;
                      return (
                        <div
                          key={classId}
                          onClick={() => setTargetClassId(isSelected ? '' : classId)}
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
                                Grade {cls.gradeLevel} • {cls.academicYear} • {cls.studentCount || 0}/{cls.maxStudents || 50} students ({Math.round(((cls.studentCount || 0) / (cls.maxStudents || 50)) * 100)}%)
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {targetClassId && (
                <p className="text-xs text-blue-600 mt-2 font-medium">
                  {t('transferringCount', `Transferring ${studentsArray.length} student(s) to selected class`)}
                </p>
              )}
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

        {/* Remove Tab Content */}
        {activeTab === 'remove' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <Trash2 className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">
                    {t('removeStudentsWarning', 'Remove Students from Classes')}
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    {t('removeStudentsDescription', `This will remove ${studentsArray.length} student(s) from their current classes. They will be moved back to the master class.`)}
                  </p>
                </div>
              </div>
            </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-2">
            {studentsArray.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('noStudentsSelected', 'No students selected')}</p>
              </div>
            ) : (
              studentsArray.map(student => (
                <div
                  key={student.id}
                  className="relative bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  {/* Remove button */}
                  {onRemoveStudent && (
                    <button
                      onClick={() => onRemoveStudent(student.id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full p-1 transition-colors"
                      title={t('removeFromSelection', 'Remove from selection')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {/* Student Info */}
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <User className="h-6 w-6" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {student.username || student.email || 'N/A'}
                      </p>

                      {/* Current Class Badge */}
                      {student.class?.name && (
                        <div className="mt-2">
                          <Badge variant="outline" size="sm" className="text-xs">
                            {t('currentClass', 'Current')}: {student.class.name}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
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
