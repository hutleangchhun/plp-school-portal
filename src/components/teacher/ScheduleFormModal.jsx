import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import SearchableDropdown from '../ui/SearchableDropdown';
import { subjectService } from '../../utils/api/services/subjectService';
import { getCurrentAcademicYear, generateAcademicYears } from '../../utils/academicYear';

const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'MODIFIED', label: 'Modified' },
  { value: 'COMPLETED', label: 'Completed' },
];

const ScheduleFormModal = ({ isOpen, onClose, onSubmit, schedule = null, selectedShift = null, selectedClass = null, teacherId, schoolId, onDelete }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subjects, setSubjects] = useState([]);

  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    academicYear: getCurrentAcademicYear(),
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    room: '',
    location: '',
    status: 'ACTIVE',
    notes: '',
    shift: selectedShift,
  });

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const loadData = async () => {
        // Load subjects
        await fetchSubjects();

        // Then set form data after subjects are populated
        if (schedule) {
          console.log('📝 Editing schedule:', schedule);
          const formDataToSet = {
            classId: String(schedule.classId || schedule.class_id || ''),
            subjectId: String(schedule.subjectId || schedule.subject_id || ''),
            academicYear: schedule.academicYear || schedule.academic_year || getCurrentAcademicYear(),
            dayOfWeek: schedule.dayOfWeek || schedule.day_of_week || '',
            startTime: schedule.startTime?.substring(0, 5) || '',
            endTime: schedule.endTime?.substring(0, 5) || '',
            room: schedule.room || '',
            location: schedule.location || '',
            status: schedule.status || 'ACTIVE',
            notes: schedule.notes || '',
            shift: schedule.shift !== undefined ? schedule.shift : selectedShift,
          };
          console.log('📝 Form data to set:', formDataToSet);
          setFormData(formDataToSet);
        } else {
          resetForm();
          // Auto-populate classId and shift from props when creating new schedule
          if (selectedClass) {
            setFormData(prev => ({
              ...prev,
              classId: String(selectedClass),
              shift: selectedShift
            }));
          }
        }
      };

      loadData();
    }
  }, [isOpen, schedule, selectedClass]);

  const fetchSubjects = async () => {
    try {
      const response = await subjectService.getAll();
      // Extract array from response
      const subjectsData = Array.isArray(response) ? response : (response?.data || []);
      console.log('📚 Loaded subjects:', subjectsData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      setSubjects([]);
    }
  };

  const resetForm = () => {
    setFormData({
      classId: '',
      subjectId: '',
      academicYear: getCurrentAcademicYear(),
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      room: '',
      location: '',
      status: 'ACTIVE',
      notes: '',
      shift: selectedShift,
    });
  };

  // Get min and max time based on selected shift
  const getTimeRestrictions = () => {
    if (!selectedShift || selectedShift === 'all') {
      return { minTime: '07:00', maxTime: '17:00', label: '' };
    }
    if (selectedShift === 'morning') {
      return { minTime: '07:00', maxTime: '12:00', label: t('morningShift', 'Morning (7am-12pm)') };
    }
    if (selectedShift === 'afternoon') {
      return { minTime: '13:00', maxTime: '17:00', label: t('afternoonShift', 'Afternoon (1pm-5pm)') };
    }
    if (selectedShift === 'noshift') {
      return { minTime: '07:00', maxTime: '17:00', label: t('noShift', 'No Shift (Flexible)') };
    }
    return { minTime: '07:00', maxTime: '17:00', label: '' };
  };

  const timeRestrictions = getTimeRestrictions();

  // Validate form data
  const validateForm = () => {
    const errors = {};

    // Required fields
    if (!formData.subjectId) {
      errors.subjectId = t('subjectRequired', 'Subject is required');
    }
    if (!formData.dayOfWeek) {
      errors.dayOfWeek = t('dayRequired', 'Day of week is required');
    }
    if (!formData.startTime) {
      errors.startTime = t('startTimeRequired', 'Start time is required');
    }
    if (!formData.endTime) {
      errors.endTime = t('endTimeRequired', 'End time is required');
    }

    // Validate time range
    if (formData.startTime && formData.endTime) {
      if (formData.startTime >= formData.endTime) {
        errors.endTime = t('endTimeAfterStart', 'End time must be after start time');
      }

      // Validate against shift restrictions
      const startHour = parseInt(formData.startTime.substring(0, 2));
      const endHour = parseInt(formData.endTime.substring(0, 2));

      if (selectedShift === 'morning') {
        if (startHour < 7 || startHour >= 12 || endHour <= 7 || endHour > 12) {
          errors.startTime = t('morningHoursOnly', 'Morning shift only allows times between 7am-12pm');
        }
      } else if (selectedShift === 'afternoon') {
        if (startHour < 13 || startHour >= 17 || endHour <= 13 || endHour > 17) {
          errors.startTime = t('afternoonHoursOnly', 'Afternoon shift only allows times between 1pm-5pm');
        }
      }
    }

    return errors;
  };

  const [formErrors, setFormErrors] = useState({});
  const isFormValid = Object.keys(validateForm()).length === 0;

  const handleChange = (field, value) => {
    console.log(`🔄 Field changed: ${field} = ${value}`);
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('📋 Updated formData:', newData);
      // Clear error for this field when user starts editing
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form before submission
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setError(t('pleaseFixErrors', 'Please fix the errors below'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📋 Form data at submit time:', formData);
      console.log('📋 selectedClass prop:', selectedClass);

      // Use selectedClass prop as fallback if formData.classId is empty
      const classIdToUse = formData.classId || selectedClass;

      if (!classIdToUse) {
        setError(t('classRequired', 'Class is required'));
        return;
      }

      const submitData = {
        classId: parseInt(classIdToUse),
        subjectId: parseInt(formData.subjectId),
        academicYear: formData.academicYear,
        schoolId: parseInt(schoolId),
        dayOfWeek: formData.dayOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime,
        room: formData.room || '',
        location: formData.location || '',
        status: formData.status || 'ACTIVE',
        notes: formData.notes || '',
        shift: formData.shift !== undefined ? formData.shift : (selectedShift || null),
      };

      console.log('📤 Submitting schedule data:', submitData);
      const success = await onSubmit(submitData);

      // Only close modal if submission was successful
      if (success) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to submit schedule:', err);
      // Extract error message from API response
      const errorMessage = err.response?.data?.message ||
        err.message ||
        'An error occurred while submitting the schedule';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={schedule ? t('editSchedule', 'Edit Schedule') : t('addSchedule', 'Add Schedule')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Subject Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('subject', 'Subject')} <span className="text-red-500">*</span>
          </label>
          <SearchableDropdown
            options={subjects.map(s => {
              const option = {
                value: String(s.id || ''),
                label: s.khmer_name || s.subject_name_kh || s.subject_name_en || s.name || 'Unknown Subject'
              };
              console.log('📚 Subject option:', option);
              return option;
            })}
            value={formData.subjectId}
            onValueChange={(value) => {
              console.log('📚 Subject dropdown changed to:', value);
              handleChange('subjectId', value);
            }}
            placeholder={t('selectSubject', 'Select Subject')}
            searchPlaceholder={t('searchSubject', 'Search subject...')}
            minWidth="w-full"
          />
          {formErrors.subjectId && (
            <p className="text-sm text-red-600 mt-1">{formErrors.subjectId}</p>
          )}
        </div>

        {/* Academic Year Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('academicYear', 'Academic Year')} <span className="text-red-500">*</span>
          </label>
          <SearchableDropdown
            options={generateAcademicYears(3, 2).map(year => ({
              value: year,
              label: year
            }))}
            value={formData.academicYear}
            onValueChange={(value) => handleChange('academicYear', value)}
            placeholder={t('selectAcademicYear', 'Select Academic Year')}
            minWidth="w-full"
          />
        </div>

        {/* Day of Week */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('dayOfWeek', 'Day of Week')} <span className="text-red-500">*</span>
          </label>
          <SearchableDropdown
            options={DAYS_OF_WEEK.map(d => ({
              value: d.value,
              label: t(d.value.toLowerCase(), d.label)
            }))}
            value={formData.dayOfWeek}
            onValueChange={(value) => handleChange('dayOfWeek', value)}
            placeholder={t('selectDay', 'Select Day')}
            minWidth="w-full"
          />
          {formErrors.dayOfWeek && (
            <p className="text-sm text-red-600 mt-1">{formErrors.dayOfWeek}</p>
          )}
        </div>

        {/* Time Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('startTime', 'Start Time')} <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              min={timeRestrictions.minTime}
              max={timeRestrictions.maxTime}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                formErrors.startTime ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {timeRestrictions.label && (
              <p className="text-xs text-gray-500 mt-1">{timeRestrictions.label}</p>
            )}
            {formErrors.startTime && (
              <p className="text-sm text-red-600 mt-1">{formErrors.startTime}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('endTime', 'End Time')} <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => handleChange('endTime', e.target.value)}
              min={timeRestrictions.minTime}
              max={timeRestrictions.maxTime}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                formErrors.endTime ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {timeRestrictions.label && (
              <p className="text-xs text-gray-500 mt-1">{timeRestrictions.label}</p>
            )}
            {formErrors.endTime && (
              <p className="text-sm text-red-600 mt-1">{formErrors.endTime}</p>
            )}
          </div>
        </div>

        {/* Room and Location */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('room', 'Room')}
            </label>
            <input
              type="text"
              value={formData.room}
              onChange={(e) => handleChange('room', e.target.value)}
              placeholder={t('roomPlaceholder', 'e.g. Room 301')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('location', 'Location')}
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder={t('locationPlaceholder', 'e.g. Building A')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('status', 'Status')}
          </label>
          <SearchableDropdown
            options={STATUS_OPTIONS.map(s => ({
              value: s.value,
              label: t(s.value.toLowerCase(), s.label)
            }))}
            value={formData.status}
            onValueChange={(value) => handleChange('status', value)}
            placeholder={t('selectStatus', 'Select Status')}
            minWidth="w-full"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('notes', 'Notes')}
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            placeholder={t('notesPlaceholder', 'Add any additional notes...')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-4 border-t">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {t('cancel', 'Cancel')}
            </Button>
            {schedule && onDelete && (
              <Button
                type="button"
                variant="danger"
                onClick={onDelete}
                disabled={loading}
              >
                {t('delete', 'Delete')}
              </Button>
            )}
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !isFormValid}
            title={!isFormValid ? t('pleaseCompleteForm', 'Please complete all required fields') : ''}
          >
            {loading ? t('saving', 'Saving...') : (schedule ? t('update', 'Update') : t('create', 'Create'))}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ScheduleFormModal;
