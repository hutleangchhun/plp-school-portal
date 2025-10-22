import { useState } from 'react';
import { User, Trash2, Users, UserPlus, Folder, FolderOpen } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import SelectedCard from '../ui/SelectedCard';
import Dropdown from '../ui/Dropdown';

const ParentActionsModal = ({
  isOpen,
  onClose,
  selectedParents,
  selectedParentsData,
  onRemove,
  loading = false,
  onRemoveParent,
  onClearAll,
  students = [],
  onAddStudent
}) => {
  const { t } = useLanguage();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('addStudent'); // 'addStudent' or 'delete'
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [relationship, setRelationship] = useState('FATHER');
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);

  // Get array of parent data from selected IDs
  const parentsArray = selectedParents.map(id => selectedParentsData[id]).filter(Boolean);

  const handleRemove = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmRemove = () => {
    onRemove();
    handleClose();
  };

  const handleAddStudent = () => {
    if (!selectedStudentId) return;
    onAddStudent({
      studentId: selectedStudentId,
      relationship,
      isPrimaryContact
    });
  };

  const handleClose = () => {
    setActiveTab('addStudent');
    setSelectedStudentId('');
    setRelationship('FATHER');
    setIsPrimaryContact(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-blue-600" />
          <span>{t('manageSelectedParents', 'Manage Selected Parents')}</span>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
            {parentsArray.length}
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
            {activeTab === 'addStudent' ? (
              <Button
                variant="primary"
                onClick={handleAddStudent}
                disabled={!selectedStudentId || loading || parentsArray.length === 0}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {loading ? t('adding', 'Adding...') : t('addStudent', 'Add Student')}
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={handleRemove}
                disabled={loading || parentsArray.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {loading ? t('removing', 'Removing...') : t('delete', 'Delete')}
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
            onClick={() => setActiveTab('addStudent')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'addStudent'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserPlus className="h-4 w-4 inline mr-2" />
            {t('addStudentToParents', 'Add Student to Parents')}
          </button>
          <button
            onClick={() => setActiveTab('delete')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'delete'
                ? 'border-b-2 border-red-600 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Trash2 className="h-4 w-4 inline mr-2" />
            {t('deleteParents', 'Delete Parents')}
          </button>
        </div>

        {/* Add Student Tab Content */}
        {activeTab === 'addStudent' && (
          <div className="space-y-4">
            {/* Student Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('selectStudent', 'Select Student')}
              </label>
              <Dropdown
                options={students.map(student => {
                  const firstName = student.firstName || student.first_name || student.user?.first_name || '';
                  const lastName = student.lastName || student.last_name || student.user?.last_name || '';
                  const fullName = firstName && lastName
                    ? `${firstName} ${lastName}`.trim()
                    : student.user?.username || student.name || student.username || '';
                  const studentName = fullName || `Student ${student.userId || student.id}`;
                  const studentId = student.userId || student.id;

                  return {
                    value: studentId.toString(),
                    label: studentName
                  };
                })}
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                placeholder={t('selectStudent', 'Select Student')}
              />
            </div>

            {/* Relationship */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('relationship', 'Relationship')}
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="FATHER">{t('father', 'Father')}</option>
                <option value="MOTHER">{t('mother', 'Mother')}</option>
                <option value="GUARDIAN">{t('guardian', 'Guardian')}</option>
                <option value="OTHER">{t('other', 'Other')}</option>
              </select>
            </div>

            {/* Primary Contact */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="bulkPrimaryContact"
                checked={isPrimaryContact}
                onChange={(e) => setIsPrimaryContact(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="bulkPrimaryContact" className="ml-2 text-sm text-gray-700">
                {t('setPrimaryContact', 'Set as Primary Contact')}
              </label>
            </div>

            {/* Summary */}
            {selectedStudentId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <UserPlus className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">
                      {t('readyToAddStudent', 'Ready to Add Student')}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {t('studentWillBeAddedToParents', `Selected student will be added to ${parentsArray.length} parent(s) as ${relationship.toLowerCase()}`)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete Tab Content */}
        {activeTab === 'delete' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <Trash2 className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">
                    {t('deleteParentsWarning', 'Delete Parents')}
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    {t('deleteParentsDescription', `This will permanently delete ${parentsArray.length} parent(s). This action cannot be undone.`)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selected Parents List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">
              {t('selectedParents', 'Selected Parents')} ({parentsArray.length})
            </h3>
          </div>

          {/* Parent Cards Grid - Max 2 rows visible, then scroll */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-2">
            {parentsArray.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('noParentsSelected', 'No parents selected')}</p>
              </div>
            ) : (
              parentsArray.map(parent => {
                const parentId = parent.id || parent.parentId;
                const displayName = parent.fullname ||
                  `${parent.firstName || ''} ${parent.lastName || ''}`.trim() ||
                  'Unknown';

                // Get student names
                const studentNames = parent.students?.map(student =>
                  student.user?.first_name && student.user?.last_name
                    ? `${student.user.first_name} ${student.user.last_name}`
                    : student.user?.username || 'Unknown Student'
                ) || [];

                const subtitle = parent.phone
                  ? `${parent.phone}${studentNames.length > 0 ? ' • ' + studentNames.slice(0, 2).join(', ') : ''}`
                  : (studentNames.length > 0 ? studentNames.slice(0, 2).join(', ') : 'No phone');

                return (
                  <SelectedCard
                    key={parentId}
                    title={displayName}
                    subtitle={subtitle}
                    statusColor="blue"
                    onRemove={() => onRemoveParent(parentId)}
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
        title={t('confirmDeleteParents', 'Confirm Delete Parents')}
        message={t('confirmDeleteParentsMessage', `Are you sure you want to delete ${parentsArray.length} parent(s)? This action cannot be undone.`)}
        type="danger"
        confirmText={t('delete', 'Delete')}
        cancelText={t('cancel', 'Cancel')}
        loading={loading}
      />
    </Modal>
  );
};

export default ParentActionsModal;
