import { useState } from 'react';
import { User, ArrowRightLeft, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';
import Modal from '../ui/Modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/Badge';
import { formatClassIdentifier } from '../../utils/helpers';
import { getFullName } from '../../utils/usernameUtils';

const BulkTransferModal = ({
  isOpen,
  onClose,
  selectedStudents,
  selectedStudentsData,
  classes,
  onTransfer,
  loading = false,
  onRemoveStudent
}) => {
  const { t } = useLanguage();
  const [targetClassId, setTargetClassId] = useState('');

  // Get array of student data from selected IDs
  const studentsArray = selectedStudents.map(id => selectedStudentsData[id]).filter(Boolean);

  const handleConfirm = () => {
    if (targetClassId) {
      onTransfer(targetClassId);
    }
  };

  const handleClose = () => {
    setTargetClassId('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('transferStudents', 'Transfer Students')}
      size="xl"
      height="lg"
      footer={
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!targetClassId || loading || studentsArray.length === 0}
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            {loading ? t('transferring', 'Transferring...') : t('transfer', 'Transfer')}
          </Button>
        </div>
      }
      stickyFooter
    >
      <div className="space-y-6">
        {/* Target Class Selector */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('selectTargetClass', 'Select Target Class')}
          </label>
          <Select value={targetClassId} onValueChange={setTargetClassId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('chooseClass', 'Choose a class...')} />
            </SelectTrigger>
            <SelectContent>
              {classes.map(cls => (
                <SelectItem key={cls.classId} value={cls.classId.toString()}>
                  <div className="flex items-center justify-between w-full">
                    <span>{t('class') || 'Class'} {formatClassIdentifier(cls.gradeLevel, cls.section)}</span>
                    <span className="text-xs text-gray-500 ml-2">{cls.academicYear}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-600 mt-2">
            {t('transferringCount', `Transferring ${studentsArray.length} student(s) to selected class`)}
          </p>
        </div>

        {/* Selected Students List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">
              {t('selectedStudents', 'Selected Students')} ({studentsArray.length})
            </h3>
          </div>

          {/* Student Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
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
                        {getFullName(student, 'Unknown')}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {student.username || student.email || 'N/A'}
                      </p>

                      {/* Current Class Badge */}
                      {student.class && (
                        <div className="mt-2">
                          <Badge variant="outline" size="sm" className="text-xs">
                            {t('currentClass', 'Current')}: {student.class?.gradeLevel
                              ? formatClassIdentifier(student.class.gradeLevel, student.class.section)
                              : student.class?.name}
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

        {/* Summary */}
        {studentsArray.length > 0 && targetClassId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
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
                    {t('class') || 'Class'} {(() => {
                      const targetClass = classes.find(c => c.classId.toString() === targetClassId);
                      return formatClassIdentifier(targetClass?.gradeLevel, targetClass?.section);
                    })()}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BulkTransferModal;
