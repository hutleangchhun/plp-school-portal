import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useLanguage } from '../../contexts/LanguageContext';

const SelectedStudentsManager = ({
  selectedStudents = [],
  selectedStudentsData = {},
  onRemoveStudent,
  onClearAll,
  onBulkAction,
  actions = [],
  className = '',
  showActions = true
}) => {
  const { t } = useLanguage();

  if (selectedStudents.length === 0) {
    return null;
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-medium text-blue-800 mb-3">
          {t('selectedStudents') || 'សិស្សបានជ្រើសរើស'} ({selectedStudents.length}):
        </h3>
        <div className="flex flex-wrap gap-2">
          {selectedStudents.map(studentId => {
            const student = selectedStudentsData[studentId];
            
            // Handle case where student data might be missing
            const studentName = student 
              ? (student.name || 
                 `${student.firstName || ''} ${student.lastName || ''}`.trim() || 
                 student.username || 'No Name')
              : `Student ID: ${studentId}`;
            
            return (
              <span 
                key={studentId} 
                className={`inline-flex items-center text-sm font-medium px-3 py-1 rounded-full ${
                  student 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-orange-100 text-orange-800'
                }`}
                title={student ? `${studentName} (${student.email || 'No email'})` : 'Student data not available'}
              >
                {studentName}
                {!student && (
                  <span className="ml-1 text-xs text-orange-600">⚠</span>
                )}
                <button
                  onClick={() => onRemoveStudent(studentId)}
                  className={`ml-2 flex-shrink-0 h-4 w-4 flex items-center justify-center rounded-full transition-colors ${
                    student
                      ? 'hover:bg-blue-200 text-blue-600 hover:text-blue-800'
                      : 'hover:bg-orange-200 text-orange-600 hover:text-orange-800'
                  }`}
                  title={t('remove') || 'ដកចេញ'}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      </div>
      
      {showActions && (
        <div className="flex items-center justify-between pt-3 border-t border-blue-200">
          <div className="text-xs text-blue-600">
            {t('selectedStudentsActions') || 'សកម្មភាពសម្រាប់សិស្សដែលបានជ្រើសរើស'}
          </div>
          <div className="space-x-2 flex items-center">
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={() => onBulkAction(action.key)}
                className={action.className || "bg-indigo-600 hover:bg-indigo-700 text-white"}
                size="sm"
              >
                {action.label}
              </Button>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClearAll}
            >
              {t('clearSelection') || 'សម្អាតការជ្រើសរើស'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectedStudentsManager;