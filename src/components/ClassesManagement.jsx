import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, BookOpen, Clock, Calendar } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import Modal from './ui/Modal';
import ConfirmDialog from './ui/ConfirmDialog';

export default function ClassesManagement() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [classes, setClasses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    subject: '',
    teacher: '',
    schedule: '',
    room: '',
    capacity: '',
    description: ''
  });

  const grades = [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'
  ];

  const subjects = [
    'Mathematics', 'Science', 'English', 'Social Studies', 'Art', 'Physical Education', 'Music'
  ];

  const teachers = [
    'Mr. Smith', 'Ms. Johnson', 'Dr. Wilson', 'Mrs. Brown', 'Mr. Davis'
  ];

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      // Mock data
      const mockClasses = [
        {
          id: 1,
          name: 'Math 101',
          grade: 'Grade 1',
          subject: 'Mathematics',
          teacher: 'Mr. Smith',
          schedule: 'Mon, Wed, Fri - 9:00 AM',
          room: 'Room 101',
          capacity: 25,
          enrolled: 22,
          description: 'Basic mathematics for grade 1 students'
        },
        {
          id: 2,
          name: 'Science Explorer',
          grade: 'Grade 2',
          subject: 'Science',
          teacher: 'Ms. Johnson',
          schedule: 'Tue, Thu - 10:00 AM',
          room: 'Room 205',
          capacity: 20,
          enrolled: 18,
          description: 'Introduction to basic science concepts'
        },
        {
          id: 3,
          name: 'English Fundamentals',
          grade: 'Grade 1',
          subject: 'English',
          teacher: 'Mrs. Brown',
          schedule: 'Mon, Tue, Wed, Thu, Fri - 11:00 AM',
          room: 'Room 102',
          capacity: 30,
          enrolled: 28,
          description: 'English language basics and reading comprehension'
        },
        {
          id: 4,
          name: 'Art & Creativity',
          grade: 'Grade 3',
          subject: 'Art',
          teacher: 'Dr. Wilson',
          schedule: 'Wed - 2:00 PM',
          room: 'Art Studio',
          capacity: 15,
          enrolled: 12,
          description: 'Creative arts and visual expression'
        }
      ];
      setClasses(mockClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
      showError('Error fetching classes');
    }
  };

  const handleAddClass = () => {
    setFormData({
      name: '',
      grade: '',
      subject: '',
      teacher: '',
      schedule: '',
      room: '',
      capacity: '',
      description: ''
    });
    setShowAddModal(true);
  };

  const handleEditClass = (classItem) => {
    setSelectedClass(classItem);
    setFormData({
      name: classItem.name,
      grade: classItem.grade,
      subject: classItem.subject,
      teacher: classItem.teacher,
      schedule: classItem.schedule,
      room: classItem.room,
      capacity: classItem.capacity.toString(),
      description: classItem.description
    });
    setShowEditModal(true);
  };

  const handleDeleteClass = (classItem) => {
    setSelectedClass(classItem);
    setShowDeleteDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call

      if (showAddModal) {
        const newClass = {
          id: Date.now(),
          ...formData,
          capacity: parseInt(formData.capacity),
          enrolled: 0
        };
        setClasses(prev => [...prev, newClass]);
        showSuccess('Class added successfully');
        setShowAddModal(false);
      } else if (showEditModal) {
        setClasses(prev => prev.map(c => 
          c.id === selectedClass.id 
            ? { ...c, ...formData, capacity: parseInt(formData.capacity) }
            : c
        ));
        showSuccess('Class updated successfully');
        setShowEditModal(false);
      }
    } catch (error) {
      showError('Error saving class');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      setClasses(prev => prev.filter(c => c.id !== selectedClass.id));
      showSuccess('Class deleted successfully');
      setShowDeleteDialog(false);
    } catch (error) {
      showError('Error deleting class');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getEnrollmentStatus = (enrolled, capacity) => {
    const percentage = (enrolled / capacity) * 100;
    if (percentage >= 90) return { status: 'full', color: 'bg-red-100 text-red-800' };
    if (percentage >= 70) return { status: 'high', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'available', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('classesManagement') || 'Classes Management'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('manageClassSchedules') || 'Manage class schedules, assignments, and enrollment'}
            </p>
          </div>
          <button
            onClick={handleAddClass}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addClass') || 'Add Class'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Classes</p>
              <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">
                {classes.reduce((sum, cls) => sum + cls.enrolled, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {classes.filter(cls => cls.schedule.includes('Mon')).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Load</p>
              <p className="text-2xl font-bold text-gray-900">
                {classes.length > 0 ? Math.round(classes.reduce((sum, cls) => sum + (cls.enrolled / cls.capacity), 0) / classes.length * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((classItem) => {
          const enrollmentStatus = getEnrollmentStatus(classItem.enrolled, classItem.capacity);
          return (
            <div key={classItem.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{classItem.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditClass(classItem)}
                      className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClass(classItem)}
                      className="text-red-600 hover:text-red-900 p-1 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {classItem.grade}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {classItem.subject}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p className="flex items-center mb-1">
                      <Users className="h-4 w-4 mr-2" />
                      Teacher: {classItem.teacher}
                    </p>
                    <p className="flex items-center mb-1">
                      <Clock className="h-4 w-4 mr-2" />
                      {classItem.schedule}
                    </p>
                    <p className="flex items-center mb-1">
                      <Calendar className="h-4 w-4 mr-2" />
                      {classItem.room}
                    </p>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Enrollment</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${enrollmentStatus.color}`}>
                        {classItem.enrolled}/{classItem.capacity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(classItem.enrolled / classItem.capacity) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {classItem.description && (
                    <p className="text-sm text-gray-500 border-t pt-3">
                      {classItem.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
        }}
        title={showAddModal ? (t('addClass') || 'Add Class') : (t('editClass') || 'Edit Class')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('className') || 'Class Name'} *
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('grade') || 'Grade'} *
              </label>
              <select
                name="grade"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.grade}
                onChange={handleInputChange}
              >
                <option value="">{t('selectGrade') || 'Select Grade'}</option>
                {grades.map(grade => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('subject') || 'Subject'} *
              </label>
              <select
                name="subject"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.subject}
                onChange={handleInputChange}
              >
                <option value="">{t('selectSubject') || 'Select Subject'}</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('teacher') || 'Teacher'} *
              </label>
              <select
                name="teacher"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.teacher}
                onChange={handleInputChange}
              >
                <option value="">{t('selectTeacher') || 'Select Teacher'}</option>
                {teachers.map(teacher => (
                  <option key={teacher} value={teacher}>
                    {teacher}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('schedule') || 'Schedule'} *
              </label>
              <input
                type="text"
                name="schedule"
                required
                placeholder="e.g., Mon, Wed, Fri - 9:00 AM"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.schedule}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('room') || 'Room'} *
              </label>
              <input
                type="text"
                name="room"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.room}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('capacity') || 'Capacity'} *
            </label>
            <input
              type="number"
              name="capacity"
              required
              min="1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.capacity}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('description') || 'Description'}
            </label>
            <textarea
              name="description"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {loading ? (t('saving') || 'Saving...') : (showAddModal ? (t('addClass') || 'Add Class') : (t('updateClass') || 'Update Class'))}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        title={t('confirmDelete') || 'Confirm Delete'}
        message={`${t('confirmDeleteClass') || 'Are you sure you want to delete'} ${selectedClass?.name}?`}
        type="danger"
        confirmText={t('delete') || 'Delete'}
        cancelText={t('cancel') || 'Cancel'}
        loading={loading}
      />
    </div>
  );
}