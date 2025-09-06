import { useState, useEffect } from 'react';
import { Search, Users, GraduationCap, ArrowRight, Save } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmDialog from './ui/ConfirmDialog';
// import { api } from '../utils/api'; // For future API integration

export default function StudentGradeManagement() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchGrades();
  }, []);

  const fetchStudents = async () => {
    try {
      // Mock data for demonstration
      const mockStudents = [
        { id: 1, name: 'John Doe', currentGrade: 'Grade 1', studentId: 'STU001' },
        { id: 2, name: 'Jane Smith', currentGrade: 'Grade 1', studentId: 'STU002' },
        { id: 3, name: 'Bob Johnson', currentGrade: 'Grade 2', studentId: 'STU003' },
        { id: 4, name: 'Alice Brown', currentGrade: 'Grade 2', studentId: 'STU004' },
      ];
      setStudents(mockStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      showError(t('errorFetchingStudents') || 'Error fetching students');
    }
  };

  const fetchGrades = async () => {
    try {
      // Mock grades for demonstration
      const mockGrades = [
        { id: 1, name: 'Grade 1' },
        { id: 2, name: 'Grade 2' },
        { id: 3, name: 'Grade 3' },
        { id: 4, name: 'Grade 4' },
        { id: 5, name: 'Grade 5' },
        { id: 6, name: 'Grade 6' },
      ];
      setGrades(mockGrades);
    } catch (error) {
      console.error('Error fetching grades:', error);
      showError(t('errorFetchingGrades') || 'Error fetching grades');
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStudentSelect = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const handlePromoteStudents = () => {
    if (selectedStudents.length === 0) {
      showError(t('selectStudents') || 'Please select students to promote');
      return;
    }
    if (!selectedGrade) {
      showError(t('selectTargetGrade') || 'Please select target grade');
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmPromotion = async () => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update students locally (in real app, refetch from server)
      setStudents(prev => 
        prev.map(student => 
          selectedStudents.includes(student.id) 
            ? { ...student, currentGrade: selectedGrade }
            : student
        )
      );

      setSelectedStudents([]);
      setSelectedGrade('');
      setShowConfirmDialog(false);
      showSuccess(t('studentsPromoted') || `Successfully promoted ${selectedStudents.length} student(s)`);
    } catch (error) {
      console.error('Error promoting students:', error);
      showError(t('errorPromotingStudents') || 'Error promoting students');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-white">
                    <h1 className="text-2xl font-bold">
                      {t('studentGradeManagement') || 'Student Grade Management'}
                    </h1>
                    <p className="text-indigo-100">
                      {t('promoteStudentsToNextGrade') || 'Promote students to the next grade level'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Students List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-gray-600" />
                    {t('students') || 'Students'} ({filteredStudents.length})
                  </h3>
                  
                  {/* Search */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder={t('searchStudents') || 'Search students...'}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Select All */}
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {t('selectAll') || 'Select All'}
                    </span>
                  </label>
                  
                  {selectedStudents.length > 0 && (
                    <span className="text-sm text-indigo-600 font-medium">
                      {selectedStudents.length} {t('selected') || 'selected'}
                    </span>
                  )}
                </div>

                {/* Students List */}
                <div className="space-y-2">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        selectedStudents.includes(student.id)
                          ? 'border-indigo-200 bg-indigo-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleStudentSelect(student.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">ID: {student.studentId}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {student.currentGrade}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Promotion Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden sticky top-8">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <ArrowRight className="h-5 w-5 mr-2 text-gray-600" />
                  {t('promoteStudents') || 'Promote Students'}
                </h3>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('selectedStudents') || 'Selected Students'}
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedStudents.length}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t('studentsSelected') || 'students selected'}
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="targetGrade" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('targetGrade') || 'Target Grade'}
                  </label>
                  <select
                    id="targetGrade"
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">{t('selectGrade') || 'Select Grade'}</option>
                    {grades.map((grade) => (
                      <option key={grade.id} value={grade.name}>
                        {grade.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handlePromoteStudents}
                  disabled={selectedStudents.length === 0 || !selectedGrade}
                  className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {t('promoteStudents') || 'Promote Students'}
                </button>

                {selectedStudents.length > 0 && selectedGrade && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>{selectedStudents.length}</strong> {t('studentsWillBePromoted') || 'student(s) will be promoted to'} <strong>{selectedGrade}</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmPromotion}
        title={t('confirmPromotion') || 'Confirm Student Promotion'}
        message={`${t('confirmPromotionMessage') || 'Are you sure you want to promote'} ${selectedStudents.length} ${t('studentsTo') || 'student(s) to'} ${selectedGrade}?`}
        type="info"
        confirmText={t('promote') || 'Promote'}
        cancelText={t('cancel') || 'Cancel'}
        loading={loading}
      />
    </div>
  );
}