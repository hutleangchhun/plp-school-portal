import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, BookOpen, Clock, Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatsCard from '../../components/ui/StatsCard';
import classService from '../../utils/api/services/classService'; // Import the classService
import studentService from '../../utils/api/services/studentService'; // Import the studentService

export default function ClassesManagement() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  
  // Get authenticated user data
  const [user] = useState(() => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  });
  
  // Add this useEffect to log the user object when the component mounts
  useEffect(() => {
    console.log('Current user from localStorage:', user);
    console.log('User schoolId:', user?.schoolId);
  }, [user]);

  const [classes, setClasses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => {
    const currentYear = new Date().getFullYear();
    return {
      name: '',
      gradeLevel: '',
      section: '',
      schoolId: user?.schoolId || '',
      teacherId: user?.teacherId || user?.id || '',
      academicYear: `${currentYear}-${currentYear + 1}`,
      maxStudents: '30',
      subject: '',
      schedule: 'Mon, Wed, Fri',
      room: '',
      description: ''
    };
  });

  const grades = [
    { value: '1', label: 'Grade 1' },
    { value: '2', label: 'Grade 2' },
    { value: '3', label: 'Grade 3' },
    { value: '4', label: 'Grade 4' },
    { value: '5', label: 'Grade 5' },
    { value: '6', label: 'Grade 6' }
  ];

  const academicYears = [
    '2023-2024',
    '2024-2025',
    '2025-2026'
  ];

  const subjects = [
    'Mathematics', 'Science', 'English', 'Social Studies', 'Art', 'Physical Education', 'Music'
  ];


  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      
      if (!user || !user.classIds || !user.classNames) {
        console.log('No user data or classes found in authentication');
        setClasses([]);
        return;
      }

      // First, fetch all class details including maxStudents
      const classDetailsPromises = user.classIds.map(classId => 
        classService.getClassById(classId).catch(error => {
          console.error(`Error fetching details for class ${classId}:`, error);
          return null;
        })
      );

      const classDetails = await Promise.all(classDetailsPromises);
      
      // Create an array of promises to fetch students for each authorized class
      const classPromises = classDetails.map(async (classDetail, index) => {
        if (!classDetail) return null;
        
        const classId = user.classIds[index];
        const className = user.classNames[index] || `Class ${classId}`;
        const gradeLevel = user.gradeLevels ? user.gradeLevels[index] : 'Unknown';
        const maxStudents = classDetail.maxStudents || 50; // Default to 50 if not provided
        
        try {
          // Get students for this class
          const studentsResponse = await studentService.getMyStudents({
            classId: classId,
            status: true
          });
          
          const studentCount = studentsResponse.data?.length || 0;
          
          return {
            id: classId,
            name: className,
            grade: `Grade ${gradeLevel}`,
            section: classDetail.section || 'A',
            subject: classDetail.subject || `Subject ${gradeLevel}`,
            teacher: classDetail.teacherName || `Teacher ${classDetail.teacherId || user.teacherId}`,
            schedule: classDetail.schedule || 'Mon, Wed, Fri',
            room: classDetail.room || `Room ${classId}`,
            capacity: maxStudents, // Use maxStudents from the class details
            enrolled: studentCount,
            description: classDetail.description || `Class ${className} - Grade ${gradeLevel} (${classDetail.section || 'A'})`,
            classId: classId,
            maxStudents: maxStudents // Also include maxStudents at the root level for consistency
          };
        } catch (error) {
          console.error(`Error fetching students for class ${classId}:`, error);
          // Return the class with 0 students if there's an error
          return {
            id: classId,
            name: className,
            grade: `Grade ${gradeLevel}`,
            section: classDetail.section || 'A',
            subject: classDetail.subject || `Subject ${gradeLevel}`,
            teacher: classDetail.teacherName || `Teacher ${classDetail.teacherId || user.teacherId}`,
            schedule: classDetail.schedule || 'Mon, Wed, Fri',
            room: classDetail.room || `Room ${classId}`,
            capacity: maxStudents,
            enrolled: 0,
            description: classDetail.description || `Class ${className} - Grade ${gradeLevel} (${classDetail.section || 'A'})`,
            classId: classId,
            maxStudents: maxStudents
          };
        }
      });

      // Wait for all class promises to resolve and filter out any null values
      const formattedClasses = (await Promise.all(classPromises)).filter(cls => cls !== null);
      setClasses(formattedClasses);
      
      console.log(`Loaded ${formattedClasses.length} classes for teacher ${user.username}`);
      
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      showError(t('error.fetchingClasses') || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = () => {
    setFormData({
      name: '',
      gradeLevel: '',
      section: '',
      schoolId: user?.schoolId || '',
      teacherId: user?.teacherId || user?.id || '', // Prefer teacherId, fallback to id if not available
      academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      maxStudents: '',
      subject: '',
      schedule: '',
      room: '',
      description: ''
    });
    setShowAddModal(true);
  };

  const handleEditClass = async (classItem) => {
    try {
      setLoading(true);
      
      // Fetch the latest class data from the API
      const response = await classService.getClassById(classItem.classId || classItem.id);
      
      if (!response) {
        throw new Error('Failed to fetch class details');
      }
      
      const classData = response.data || response;
      
      // SECURITY: Validate that the class belongs to the authenticated teacher
      if (!user?.classIds?.includes(classData.classId)) {
        console.warn(`Teacher ${user?.username} attempted to edit unauthorized class ${classData.classId}`);
        showError(t('unauthorizedAction') || 'Unauthorized action');
        return;
      }
      
      console.log('Fetched class data for editing:', classData);
      
      // Extract grade level from class name if not available in gradeLevel
      let gradeLevel = classData.gradeLevel || classData.grade?.replace('Grade ', '') || '';
      if (!gradeLevel && classData.name) {
        const gradeMatch = classData.name.match(/\d+/);
        if (gradeMatch) {
          gradeLevel = gradeMatch[0];
        }
      }
      
      // Convert gradeLevel to string to match select option values
      gradeLevel = gradeLevel ? gradeLevel.toString() : '';
      
      // Get academic year from class data
      let academicYear = classData.academicYear || '';
      
      // If we don't have an academic year, use the current academic year
      if (!academicYear) {
        const currentYear = new Date().getFullYear();
        academicYear = `${currentYear}-${currentYear + 1}`;
      }
      
      // Create form data with schoolId from the API response
      const formDataToSet = {
        name: classData.name || '',
        gradeLevel: gradeLevel,
        section: classData.section || '',
        schoolId: classData.schoolId?.toString() || '',
        teacherId: classData.teacherId?.toString() || '',
        academicYear: academicYear,
        maxStudents: classData.maxStudents?.toString() || '30',
        subject: classData.subject || `Subject ${gradeLevel || ''}`.trim(),
        schedule: classData.schedule || 'Mon, Wed, Fri',
        room: classData.room || `Room ${classData.classId || ''}`.trim(),
        description: classData.description || ''
      };
      
      console.log('Setting form data with schoolId from API:', formDataToSet);
      
      setSelectedClass(classData);
      setFormData(formDataToSet);
      setShowEditModal(true);
    } catch (error) {
      console.error('Error fetching class details:', error);
      showError(t('errorFetchingClassDetails') || 'Error fetching class details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = (classItem) => {
    // SECURITY: Validate that the class belongs to the authenticated teacher
    if (!user?.classIds?.includes(classItem.classId)) {
      console.warn(`Teacher ${user?.username} attempted to delete unauthorized class ${classItem.classId}`);
      showError(t('unauthorizedAction') || 'Unauthorized action');
      return;
    }
    
    setSelectedClass(classItem);
    setShowDeleteDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.gradeLevel || !formData.academicYear || !formData.maxStudents) {
        showError(t('pleaseCompleteAllRequiredFields') || 'Please complete all required fields');
        return;
      }

      const classData = {
        name: formData.name.trim(),
        gradeLevel: parseInt(formData.gradeLevel),
        section: formData.section?.trim() || 'A',
        schoolId: parseInt(formData.schoolId) || 0,
        teacherId: parseInt(formData.teacherId) || 0,
        academicYear: formData.academicYear.trim(),
        maxStudents: parseInt(formData.maxStudents) || 200
      };

      // Additional validation
      if (isNaN(classData.gradeLevel) || classData.gradeLevel < 1 || classData.gradeLevel > 12) {
        showError(t('invalidGradeLevel') || 'Grade level must be between 1 and 12');
        return;
      }

      if (classData.maxStudents < 1 || classData.maxStudents > 200) {
        showError(t('invalidMaxStudents') || 'Maximum students must be between 1 and 200');
        return;
      }

      if (showAddModal) {
        const response = await classService.createClass(classData);
        if (response.success) {
          showSuccess(t('classAddedSuccessfully') || 'Class added successfully');
          setShowAddModal(false);
          await fetchClasses(); // Refresh the classes list
        }
      } else if (showEditModal) {
        const response = await classService.updateClass(selectedClass.classId, classData);
        if (response.success) {
          showSuccess(t('classUpdatedSuccessfully') || 'Class updated successfully');
          setShowEditModal(false);
          await fetchClasses(); // Refresh the classes list
        }
      }
    } catch (error) {
      console.error('Error saving class:', error);
      showError(t('errorSavingClass') || 'Error saving class');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setLoading(true);
    try {
      const response = await classService.deleteClass(selectedClass.classId);
      if (response.success) {
        showSuccess(t('classDeletedSuccessfully') || 'Class deleted successfully');
        setShowDeleteDialog(false);
        await fetchClasses(); // Refresh the classes list
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      showError(t('errorDeletingClass') || 'Error deleting class');
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
        <StatsCard
          title={t('totalClasses') || 'ថ្នាក់រៀនសរុប'}
          value={classes.length}
          icon={BookOpen}
          enhanced={true}
          responsive={true}
          hoverColor="hover:border-blue-200"
          gradientFrom="from-blue-500"
          gradientTo="to-blue-600"
        />
        
        <StatsCard
          title={t('totalStudents') || 'សិស្សសរុប'}
          value={classes.reduce((sum, cls) => sum + cls.enrolled, 0)}
          icon={Users}
          enhanced={true}
          responsive={true}
          hoverColor="hover:border-green-200"
          gradientFrom="from-green-500"
          gradientTo="to-green-600"
        />
        
        <StatsCard
          title={t('activeToday') || 'សកម្មថ្ងៃនេះ'}
          value={classes.filter(cls => cls.schedule && cls.schedule.includes('Mon')).length}
          icon={Calendar}
          enhanced={true}
          responsive={true}
          hoverColor="hover:border-purple-200"
          gradientFrom="from-purple-500"
          gradientTo="to-purple-600"
        />
        
        <StatsCard
          title={t('averageLoad') || 'ការទាក់ទញជាមធ្យម'}
          value={`${classes.length > 0 ? Math.round(classes.reduce((sum, cls) => sum + (cls.enrolled / cls.capacity), 0) / classes.length * 100) : 0}%`}
          icon={Clock}
          enhanced={true}
          responsive={true}
          hoverColor="hover:border-orange-200"
          gradientFrom="from-orange-500"
          gradientTo="to-orange-400"
        />
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
                      {t(classItem.grade) || classItem.grade}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {t(classItem.subject) || classItem.subject}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p className="flex items-center mb-1">
                      <Users className="h-4 w-4 mr-2" />
                      {t('Teacher:') || 'គ្រូ:'} {classItem.teacher}
                    </p>
                    <p className="flex items-center mb-1">
                      <Clock className="h-4 w-4 mr-2" />
                      {t(classItem.schedule) || classItem.schedule}
                    </p>
                    <p className="flex items-center mb-1">
                      <Calendar className="h-4 w-4 mr-2" />
                      {t(classItem.room) || classItem.room}
                    </p>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{t('Enrollment') || 'ចុះឈ្មោះ'}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${enrollmentStatus.color}`}>
                        {classItem.enrolled}/{classItem.capacity}
                      </span>
                    </div>
                    <div className="w-full bg-green-100 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
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
                {t('grade') || 'Grade Level'} *
              </label>
              <select
                name="gradeLevel"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.gradeLevel}
                onChange={handleInputChange}
              >
                <option value="">{t('selectGrade') || 'Select Grade'}</option>
                {grades.map(grade => (
                  <option key={grade.value} value={grade.value}>
                    {grade.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('section') || 'Section'} *
              </label>
              <input
                type="text"
                name="section"
                required
                placeholder="e.g., A, B, C"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.section}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('academicYear') || 'Academic Year'} *
              </label>
              <select
                name="academicYear"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.academicYear}
                onChange={handleInputChange}
              >
                <option value="">{t('selectAcademicYear') || 'Select Academic Year'}</option>
                {academicYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('schoolId') || 'School ID'} *
              </label>
              <input
                type="text"
                name="schoolId"
                required
                readOnly
                value={formData.schoolId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('teacherId') || 'Teacher ID'} *
              </label>
              <input
                type="text"
                name="teacherId"
                required
                readOnly
                value={formData.teacherId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('maxStudents') || 'Maximum Students'} *
            </label>
            <input
              type="number"
              name="maxStudents"
              required
              min="1"
              max="200"
              placeholder="Maximum 200 students"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.maxStudents}
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