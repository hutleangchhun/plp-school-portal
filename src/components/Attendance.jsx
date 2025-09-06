import { useState, useEffect } from 'react';
import { Calendar, Check, X, Clock, Users, Search, Filter } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';

export default function Attendance() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const classes = [
    { id: '', name: 'All Classes' },
    { id: 'math-101', name: 'Math 101 - Grade 1' },
    { id: 'science-201', name: 'Science Explorer - Grade 2' },
    { id: 'english-101', name: 'English Fundamentals - Grade 1' },
    { id: 'art-301', name: 'Art & Creativity - Grade 3' }
  ];

  useEffect(() => {
    fetchStudents();
  }, [selectedDate, selectedClass]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Mock data
      const mockStudents = [
        { id: 1, name: 'John Doe', studentId: 'STU001', class: 'Math 101 - Grade 1', grade: 'Grade 1' },
        { id: 2, name: 'Jane Smith', studentId: 'STU002', class: 'Science Explorer - Grade 2', grade: 'Grade 2' },
        { id: 3, name: 'Bob Johnson', studentId: 'STU003', class: 'Math 101 - Grade 1', grade: 'Grade 1' },
        { id: 4, name: 'Alice Brown', studentId: 'STU004', class: 'Art & Creativity - Grade 3', grade: 'Grade 3' },
        { id: 5, name: 'Charlie Davis', studentId: 'STU005', class: 'English Fundamentals - Grade 1', grade: 'Grade 1' },
        { id: 6, name: 'Emily Wilson', studentId: 'STU006', class: 'Science Explorer - Grade 2', grade: 'Grade 2' }
      ];

      // Mock attendance data
      const mockAttendance = {
        1: { status: 'present', time: '08:30 AM' },
        2: { status: 'present', time: '08:25 AM' },
        3: { status: 'absent', time: null },
        4: { status: 'present', time: '08:35 AM' },
        5: { status: 'late', time: '09:15 AM' },
        6: { status: 'present', time: '08:20 AM' }
      };

      await new Promise(resolve => setTimeout(resolve, 1000));
      setStudents(mockStudents);
      setAttendance(mockAttendance);
    } catch (error) {
      console.error('Error fetching students:', error);
      showError('Error fetching student data');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !selectedClass || student.class.toLowerCase().includes(selectedClass.replace('-', ' '));
    return matchesSearch && matchesClass;
  });

  const markAttendance = (studentId, status) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        status,
        time: status === 'absent' ? null : timeString
      }
    }));
  };

  const saveAttendance = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock API call
      showSuccess('Attendance saved successfully');
    } catch {
      showError('Error saving attendance');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStats = () => {
    const total = filteredStudents.length;
    const present = filteredStudents.filter(s => attendance[s.id]?.status === 'present').length;
    const absent = filteredStudents.filter(s => attendance[s.id]?.status === 'absent').length;
    const late = filteredStudents.filter(s => attendance[s.id]?.status === 'late').length;

    return { total, present, absent, late };
  };

  const stats = getAttendanceStats();

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('attendanceTracking') || 'Attendance Tracking'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('trackStudentAttendance') || 'Track and manage student attendance records'}
            </p>
          </div>
          <button
            onClick={saveAttendance}
            disabled={loading}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Saving...' : (t('saveAttendance') || 'Save Attendance')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('date') || 'Date'}
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('class') || 'Class'}
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('search') || 'Search'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchStudents') || 'Search students...'}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-end">
            <div className="bg-indigo-50 rounded-lg p-3 flex items-center w-full justify-center">
              <Users className="h-5 w-5 text-indigo-600 mr-2" />
              <span className="text-sm font-medium text-indigo-600">
                {stats.total} {t('students') || 'Students'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Present</p>
              <p className="text-2xl font-bold text-gray-900">{stats.present}</p>
              <p className="text-sm text-green-600">{stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-gray-900">{stats.absent}</p>
              <p className="text-sm text-red-600">{stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Late</p>
              <p className="text-2xl font-bold text-gray-900">{stats.late}</p>
              <p className="text-sm text-yellow-600">{stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-blue-600">Students</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('attendanceFor') || 'Attendance for'} {new Date(selectedDate).toLocaleDateString()}
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading students...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredStudents.map((student) => (
              <div key={student.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-indigo-600">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">{student.studentId} - {student.class}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {attendance[student.id] && (
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(attendance[student.id].status)}`}>
                          {attendance[student.id].status === 'present' && 'Present'}
                          {attendance[student.id].status === 'absent' && 'Absent'}
                          {attendance[student.id].status === 'late' && 'Late'}
                        </span>
                        {attendance[student.id].time && (
                          <span className="text-xs text-gray-500">
                            {attendance[student.id].time}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={() => markAttendance(student.id, 'present')}
                        className={`p-2 rounded-lg transition-colors ${
                          attendance[student.id]?.status === 'present'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => markAttendance(student.id, 'late')}
                        className={`p-2 rounded-lg transition-colors ${
                          attendance[student.id]?.status === 'late'
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-gray-100 text-gray-400 hover:bg-yellow-100 hover:text-yellow-600'
                        }`}
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => markAttendance(student.id, 'absent')}
                        className={`p-2 rounded-lg transition-colors ${
                          attendance[student.id]?.status === 'absent'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'
                        }`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}