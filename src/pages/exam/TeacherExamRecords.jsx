import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import { examHistoryService } from '../../utils/api/services/examHistoryService';
import { classService, studentService, scoreService } from '@/utils/api';
import { encryptId } from '../../utils/encryption';
import { exportExamResultsToExcel } from '../../utils/examExportUtils';
import { formatClassIdentifier } from '../../utils/helpers';
import { getFullName } from '../../utils/usernameUtils';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import EmptyState from '../../components/ui/EmptyState';
import Table from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Dropdown from '../../components/ui/Dropdown';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import Modal from '../../components/ui/Modal';
import {
  BookOpen,
  Eye,
  Save,
  Download,
  ClipboardList
} from 'lucide-react';

/**
 * Subject and Skills Configuration for Score Input
 * Defines all subjects with their skill categories
 */
const SUBJECT_SKILLS = {
  khmer: {
    name: 'Khmer',
    skills: ['Listening', 'Writing', 'Reading', 'Speaking']
  },
  math: {
    name: 'Math',
    skills: ['Number', 'Geometry', 'Statistics']
  },
  science: {
    name: 'Science',
    skills: ['Basic Concepts', 'Experiments', 'Analysis']
  },
  ethics: {
    name: 'Ethics-Civic Studies',
    skills: ['Ethics', 'Civic Studies']
  },
  sport: {
    name: 'Sport',
    skills: ['Physical Fitness', 'Skills', 'Participation']
  },
  health: {
    name: 'Health - Hygiene',
    skills: ['Health', 'Hygiene']
  },
  life_skills: {
    name: 'Life Skills Education',
    skills: ['Problem Solving', 'Communication', 'Creativity']
  },
  foreign_lang: {
    name: 'Foreign Languages',
    skills: ['Listening', 'Speaking', 'Reading', 'Writing']
  }
};

/**
 * Get exam type label in Khmer
 */
const getExamTypeLabel = (examType, t) => {
  const examTypeMap = {
    'exam': t('examTypeExam', 'ការប្រលង'),
    'test': t('examTypeTest', 'ការធ្វើតេស្ត'),
    'quiz': t('examTypeQuiz', 'សាកល្បង')
  };
  return examTypeMap[examType?.toLowerCase()] || examType || '-';
};

/**
 * Format time taken in hh:mm:ss format
 */
const formatTimeTaken = (seconds) => {
  if (!seconds || seconds <= 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (num) => String(num).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(minutes)}:${pad(secs)}`;
};

/**
 * TeacherExamRecords Component
 * Teachers can view exam records for students in their assigned classes
 * and input student scores by subject and skill
 */
export default function TeacherExamRecords({ user }) {
  const { t } = useLanguage();
  const { showError, showSuccess } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const navigate = useNavigate();

  // State for Exam Records Tab
  const [studentRecords, setStudentRecords] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalStudents: 0,
    totalPages: 1,
    allStudents: []
  });

  // State for Score Input Tab
  const [activeTab, setActiveTab] = useState('records'); // 'records' or 'scores'
  const [classStudents, setClassStudents] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(new Date().getFullYear().toString());
  const [scoreData, setScoreData] = useState({}); // { studentId: { subjectKey: { skillName: score } } }
  const [savingScores, setSavingScores] = useState(false);

  // State for Download Modal
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedStudentForDownload, setSelectedStudentForDownload] = useState(null);
  const [selectedExamsForDownload, setSelectedExamsForDownload] = useState(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // State for Exam History Modal
  const [showExamHistoryModal, setShowExamHistoryModal] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState(null);
  const [examHistoryLoading, setExamHistoryLoading] = useState(false);
  const [selectedExamsInHistory, setSelectedExamsInHistory] = useState(new Set()); // Track selected exams in modal

  /**
   * Fetch teacher's assigned classes
   */
  const fetchClasses = useCallback(async () => {
    try {
      if (user?.classIds?.length > 0) {
        const classPromises = user.classIds.map(classId =>
          classService.getClassById(classId)
        );
        const responses = await Promise.allSettled(classPromises);
        const teacherClasses = responses
          .filter(res => res.status === 'fulfilled' && res.value)
          .map(res => res.value);
        setClasses(teacherClasses);

        // If teacher has only one class, auto-select it
        if (teacherClasses.length === 1) {
          setSelectedClass(teacherClasses[0].classId || teacherClasses[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      showError(t('errorFetchingClasses', 'Failed to fetch classes'));
    }
  }, [user, showError, t]);

  /**
   * Fetch all students from teacher's classes using school API with pagination
   */
  const fetchAllStudents = useCallback(async (page = 1, pageSize = 10) => {
    try {
      let studentsList = [];
      const schoolId = user?.teacher?.schoolId || user?.schoolId;

      if (selectedClass && schoolId) {
        const apiParams = {
          classId: selectedClass,
          page: page,
          limit: pageSize
        };

        console.log('Fetching students with pagination params:', apiParams);

        const response = await studentService.getStudentsBySchoolClasses(schoolId, apiParams);

        console.log('API Response:', response);
        console.log('Pagination from API:', response.pagination);

        if (response.success) {
          studentsList = response.data || [];

          // Update pagination info from API response directly
          console.log('=== PAGINATION DEBUG ===');
          console.log('Requested pageSize:', pageSize);
          console.log('API returned students count:', studentsList.length);
          console.log('API pagination object:', response.pagination);
          console.log('=== END DEBUG ===');

          if (response.pagination) {
            setPagination(prev => ({
              ...prev,
              currentPage: response.pagination.page,
              pageSize: response.pagination.limit,
              totalStudents: response.pagination.total,
              totalPages: response.pagination.pages,
              allStudents: studentsList
            }));
          }
        }
      }

      return studentsList;
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  }, [selectedClass, user]);

  /**
   * Fetch exam records for the current page
   */
  const fetchExamRecords = useCallback(async (page = 1) => {
    try {
      // Only proceed if a class is selected
      if (!selectedClass) {
        setStudentRecords([]);
        setLoading(false);
        stopLoading('fetchExamRecords');
        return;
      }

      setLoading(true);
      setError(null);
      startLoading('fetchExamRecords', t('loadingExamRecords', 'Loading exam records...'));

      // Fetch students for the current page with the current pageSize limit (pagination handled by API)
      const studentsList = await fetchAllStudents(page, pagination.pageSize);

      // Fetch exam records for each student using the new endpoint
      const studentRecordsMap = new Map();

      for (const student of studentsList) {
        try {
          // Extract userId from nested user object or use direct id
          const userId = student.user?.id || student.userId || student.id;

          if (!userId) {
            console.warn('Student has no userId:', student);
            studentRecordsMap.set(student.studentId || student.id, {
              student: student,
              exams: [],
              hasRecords: false
            });
            continue;
          }

          console.log(`Fetching exam history for student userId: ${userId}, studentId: ${student.studentId}`);

          const response = await examHistoryService.getUserExamHistoryFiltered(userId);

          // API returns array of exam records for the user
          const exams = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);

          console.log(`Found ${exams.length} exam records for userId ${userId}`);

          studentRecordsMap.set(student.studentId || student.id, {
            student: student,
            exams: exams,
            hasRecords: exams.length > 0
          });
        } catch (error) {
          const userId = student.user?.id || student.userId || student.id;
          console.warn(`Failed to fetch exam history for student ${userId}:`, error);
          // Continue with other students even if one fails
          studentRecordsMap.set(student.studentId || student.id, {
            student: student,
            exams: [],
            hasRecords: false
          });
        }
      }

      // Convert map to array, maintaining student order
      const merged = studentsList.map(student =>
        studentRecordsMap.get(student.studentId || student.id) || {
          student: student,
          exams: [],
          hasRecords: false
        }
      );

      setStudentRecords(merged);
    } catch (error) {
      console.error('Error fetching exam records:', error);
      setError(error?.response?.data?.message || t('errorFetchingExamRecords', 'Failed to fetch exam records'));
      setStudentRecords([]);
    } finally {
      setLoading(false);
      stopLoading('fetchExamRecords');
    }
  }, [selectedClass, startLoading, stopLoading, t, fetchAllStudents, pagination.pageSize]);

  /**
   * Fetch all students from selected class for score input
   */
  const fetchClassStudentsForScores = useCallback(async () => {
    try {
      if (!selectedClass) {
        setClassStudents([]);
        return;
      }

      const schoolId = user?.teacher?.schoolId || user?.schoolId;
      if (!schoolId) return;

      // Fetch all students in the class (no pagination for score input)
      const response = await studentService.getStudentsBySchoolClasses(schoolId, {
        classId: selectedClass,
        limit: 100
      });

      if (response.success) {
        const students = response.data || [];
        setClassStudents(students);

        // Initialize score data structure for all students
        const initialScores = {};

        students.forEach(student => {
          const studentId = student.studentId || student.id;

          initialScores[studentId] = {};
          Object.keys(SUBJECT_SKILLS).forEach(subjectKey => {
            initialScores[studentId][subjectKey] = {};
            SUBJECT_SKILLS[subjectKey].skills.forEach(skill => {
              initialScores[studentId][subjectKey][skill] = '';
            });
          });
        });

        setScoreData(initialScores);
      }
    } catch (error) {
      console.error('Error fetching class students:', error);
      showError(t('errorFetchingStudents', 'Failed to fetch students'));
    }
  }, [selectedClass, user, showError, t]);

  /**
   * Handle score input change
   * Accepts float values with max of 10
   */
  const handleScoreChange = useCallback((studentId, subjectKey, skill, value) => {
    // Allow typing freely, but validate and clamp on complete numbers
    if (value === '' || value === '.') {
      // Allow empty or just decimal point
      setScoreData(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [subjectKey]: {
            ...prev[studentId]?.[subjectKey],
            [skill]: value
          }
        }
      }));
      return;
    }

    const parsed = parseFloat(value);

    // If it's a valid number, clamp to 0-10
    if (!isNaN(parsed)) {
      // Don't clamp while still typing (ends with .)
      if (value.endsWith('.')) {
        setScoreData(prev => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [subjectKey]: {
              ...prev[studentId]?.[subjectKey],
              [skill]: value
            }
          }
        }));
      } else {
        // Complete number - apply max limit of 10
        const clampedValue = Math.min(parsed, 10);
        setScoreData(prev => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [subjectKey]: {
              ...prev[studentId]?.[subjectKey],
              [skill]: clampedValue
            }
          }
        }));
      }
    } else {
      // Invalid number, store as-is for partial typing
      setScoreData(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [subjectKey]: {
            ...prev[studentId]?.[subjectKey],
            [skill]: value
          }
        }
      }));
    }
  }, []);

  /**
   * Get all skill cells in order for keyboard navigation
   */
  const getAllSkillCells = useMemo(() => {
    const cells = [];
    classStudents.forEach((student, rowIndex) => {
      const studentId = student.studentId || student.id;
      Object.entries(SUBJECT_SKILLS).forEach(([subjectKey, subject]) => {
        const hasSubheader = ['khmer', 'math'].includes(subjectKey);
        if (hasSubheader) {
          // For subjects with subheaders, add each skill separately
          subject.skills.forEach((skill, skillIndex) => {
            cells.push({
              rowIndex,
              studentId,
              subjectKey,
              skill,
              cellId: `cell-${rowIndex}-${subjectKey}-${skillIndex}`
            });
          });
        } else {
          // For subjects without subheaders, add first skill as representative (spans all skills)
          const firstSkill = subject.skills[0];
          cells.push({
            rowIndex,
            studentId,
            subjectKey,
            skill: firstSkill,
            cellId: `cell-${rowIndex}-${subjectKey}-0`
          });
        }
      });
    });
    return cells;
  }, [classStudents]);

  /**
   * Handle keyboard navigation in score table
   */
  const handleScoreCellKeyDown = useCallback((e, rowIndex, subjectKey, skill, studentId) => {
    const currentCellIndex = getAllSkillCells.findIndex(
      cell => cell.rowIndex === rowIndex && cell.studentId === studentId && cell.subjectKey === subjectKey && cell.skill === skill
    );

    if (currentCellIndex === -1) return;

    let nextCellIndex = -1;
    const totalCells = getAllSkillCells.length;
    const cellsPerRow = Object.values(SUBJECT_SKILLS).reduce((sum, subject) => sum + subject.skills.length, 0);

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        // Tab: move to next cell (right)
        if (e.shiftKey) {
          // Shift+Tab: move to previous cell (left)
          nextCellIndex = currentCellIndex - 1;
        } else {
          // Tab: move to next cell (right)
          nextCellIndex = currentCellIndex + 1;
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        // Move to next cell (right)
        nextCellIndex = currentCellIndex + 1;
        break;

      case 'ArrowLeft':
        e.preventDefault();
        // Move to previous cell (left)
        nextCellIndex = currentCellIndex - 1;
        break;

      case 'ArrowDown':
        e.preventDefault();
        // Move down to same cell position in next row
        nextCellIndex = currentCellIndex + cellsPerRow;
        break;

      case 'ArrowUp':
        e.preventDefault();
        // Move up to same cell position in previous row
        nextCellIndex = currentCellIndex - cellsPerRow;
        break;

      case 'Enter':
        e.preventDefault();
        // Enter: move down to same column in next row (or stay if last row)
        nextCellIndex = currentCellIndex + cellsPerRow;
        break;

      default:
        return;
    }

    // Wrap around or clamp to valid range
    if (nextCellIndex < 0) {
      nextCellIndex = 0;
    } else if (nextCellIndex >= totalCells) {
      nextCellIndex = totalCells - 1;
    }

    // Focus the next cell
    const nextCell = getAllSkillCells[nextCellIndex];
    if (nextCell) {
      const nextInput = document.getElementById(nextCell.cellId)?.querySelector('input');
      if (nextInput) {
        setTimeout(() => {
          nextInput.focus();
          nextInput.select();
        }, 0);
      }
    }
  }, [getAllSkillCells]);

  /**
   * Save all student scores
   */
  const handleSaveScores = useCallback(async () => {
    try {
      setSavingScores(true);
      startLoading('saveScores', t('savingScores', 'Saving scores...'));

      // Format month as YYYY-MM for API
      const monthFormatted = `${selectedAcademicYear}-${String(selectedMonth).padStart(2, '0')}`;

      // Prepare data for API
      const scoresToSave = [];
      Object.entries(scoreData).forEach(([studentId, subjects]) => {
        Object.entries(subjects).forEach(([subjectKey, skills]) => {
          Object.entries(skills).forEach(([skill, score]) => {
            if (score !== '') {
              scoresToSave.push({
                studentId: parseInt(studentId),
                subject: subjectKey,
                skill,
                score: parseFloat(score), // Keep as float for API
                month: monthFormatted
              });
            }
          });
        });
      });

      if (scoresToSave.length === 0) {
        showError(t('noScoresToSave', 'Please enter at least one score'));
        setSavingScores(false);
        stopLoading('saveScores');
        return;
      }

      // Call API to save scores using batch update
      const response = await scoreService.submitBatchScores(scoresToSave);

      if (response.success) {
        showSuccess(t('scoresSaved', 'Scores saved successfully'));
        // Reset score data after successful save
        setScoreData({});
      } else {
        showError(t('errorSavingScores', 'Failed to save scores'));
      }
    } catch (error) {
      console.error('Error saving scores:', error);
      showError(error?.response?.data?.message || t('errorSavingScores', 'Failed to save scores'));
    } finally {
      setSavingScores(false);
      stopLoading('saveScores');
    }
  }, [scoreData, selectedMonth, startLoading, stopLoading, showError, showSuccess, t]);

  /**
   * Initial load - fetch classes
   */
  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  /**
   * Fetch class students when switching to score input tab
   */
  useEffect(() => {
    if (activeTab === 'scores') {
      fetchClassStudentsForScores();
    }
  }, [activeTab, fetchClassStudentsForScores]);

  /**
   * Reset pagination and load exam records when class is selected
   */
  useEffect(() => {
    if (selectedClass) {
      setPagination(prev => ({
        ...prev,
        currentPage: 1
      }));
      fetchExamRecords(1);
    }
  }, [selectedClass, fetchExamRecords]);

  /**
   * Handle viewing student exam records
   * Navigate to the student exam records page with encrypted user ID
   * Passes additional context including class info, academic year, and exam stats
   */
  const handleViewStudentRecords = (studentRecord) => {
    const userId = studentRecord.student.user?.id || studentRecord.student.userId || studentRecord.student.id;
    const encryptedUserId = encryptId(userId);

    // Get selected class info for context
    const selectedClassInfo = classes.find(c => c.classId === selectedClass || c.id === selectedClass);

    navigate(`/exam-records/${encryptedUserId}`, {
      state: {
        student: studentRecord.student,
        exams: studentRecord.exams || [],
        // Pass additional context from TeacherExamRecords
        context: {
          sourceClass: selectedClassInfo,
          sourceRoute: '/my-students-exams',
          totalStats: {
            totalExams: studentRecord.exams?.length || 0,
            passedCount: studentRecord.exams?.filter(e => e.status === 'COMPLETED' && e.passed).length || 0,
            failedCount: studentRecord.exams?.filter(e => e.status === 'COMPLETED' && !e.passed).length || 0,
            completedCount: studentRecord.exams?.filter(e => e.status === 'COMPLETED').length || 0
          }
        }
      }
    });
  };

  /**
   * Open exam history modal for a student
   */
  const handleOpenExamHistoryModal = async (student) => {
    try {
      setExamHistoryLoading(true);
      const userId = student.user?.id || student.userId || student.id;

      // Fetch exam history from API
      const response = await examHistoryService.getUserExamHistoryFiltered(userId);
      const exams = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);

      setSelectedStudentForHistory({
        student,
        exams
      });
      setShowExamHistoryModal(true);
    } catch (error) {
      console.error('Error fetching exam history:', error);
      showError(t('errorFetchingExamHistory', 'Failed to fetch exam history'));
    } finally {
      setExamHistoryLoading(false);
    }
  };

  /**
   * Toggle exam selection in history modal
   */
  const toggleExamInHistory = (examIndex) => {
    const newSelection = new Set(selectedExamsInHistory);
    if (newSelection.has(examIndex)) {
      newSelection.delete(examIndex);
    } else {
      newSelection.add(examIndex);
    }
    setSelectedExamsInHistory(newSelection);
  };

  /**
   * Apply selected exams from history modal to score fields
   */
  const handleApplyExamsFromHistory = () => {
    if (!selectedStudentForHistory || selectedExamsInHistory.size === 0) {
      showError(t('selectExamsToApply', 'Please select at least one exam to apply'));
      return;
    }

    const studentId = selectedStudentForHistory.student.studentId || selectedStudentForHistory.student.id;
    const selectedExams = Array.from(selectedExamsInHistory)
      .map(idx => selectedStudentForHistory.exams[idx])
      .filter(Boolean);

    if (selectedExams.length === 0) return;

    // Collect scores from all selected exams by subject
    const scoresBySubject = {};
    let appliedCount = 0;

    selectedExams.forEach(exam => {
      const score = exam.percentage !== undefined && exam.percentage !== null
        ? exam.percentage
        : exam.score !== undefined && exam.score !== null
        ? exam.score
        : 0;

      // Try to match exam subject to SUBJECT_SKILLS
      const examSubject = exam.subjectName?.toLowerCase() || '';
      let matchedSubjectKey = null;

      // Map exam subject to our subject keys
      if (examSubject.includes('khmer')) matchedSubjectKey = 'khmer';
      else if (examSubject.includes('math') || examSubject.includes('mathematics')) matchedSubjectKey = 'math';
      else if (examSubject.includes('science')) matchedSubjectKey = 'science';
      else if (examSubject.includes('ethics') || examSubject.includes('civic')) matchedSubjectKey = 'ethics';
      else if (examSubject.includes('sport') || examSubject.includes('physical')) matchedSubjectKey = 'sport';
      else if (examSubject.includes('health')) matchedSubjectKey = 'health';
      else if (examSubject.includes('life skills')) matchedSubjectKey = 'life_skills';
      else if (examSubject.includes('language') || examSubject.includes('foreign')) matchedSubjectKey = 'foreign_lang';

      if (matchedSubjectKey) {
        if (!scoresBySubject[matchedSubjectKey]) {
          scoresBySubject[matchedSubjectKey] = [];
        }
        scoresBySubject[matchedSubjectKey].push(Math.min(score, 10));
        appliedCount++;
      }
    });

    // Apply averaged scores to all skills for matched subjects
    if (appliedCount > 0) {
      setScoreData(prev => {
        const updated = { ...prev };
        if (!updated[studentId]) updated[studentId] = {};

        Object.entries(scoresBySubject).forEach(([subjectKey, scores]) => {
          if (!updated[studentId][subjectKey]) updated[studentId][subjectKey] = {};

          // Calculate average score from all selected exams for this subject
          const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

          // Fill all skills with the averaged score
          SUBJECT_SKILLS[subjectKey].skills.forEach(skill => {
            updated[studentId][subjectKey][skill] = Math.round(averageScore * 100) / 100; // Round to 2 decimals
          });
        });

        return updated;
      });

      const subjectNames = Object.keys(scoresBySubject)
        .map(key => SUBJECT_SKILLS[key].name)
        .join(', ');
      showSuccess(t('examDataApplied', `Exam data applied to: ${subjectNames}`));

      // Clear selections and close modal
      setSelectedExamsInHistory(new Set());
      setShowExamHistoryModal(false);
    } else {
      showError(t('cannotMatchSubject', 'Could not match selected exams to any subject category'));
    }
  };

  /**
   * Open download modal for a student
   */
  const handleOpenDownloadModal = (studentRecord) => {
    setSelectedStudentForDownload(studentRecord);
    setSelectedExamsForDownload(new Set(studentRecord.exams.map((_, idx) => idx)));
    setShowDownloadModal(true);
  };

  /**
   * Toggle exam selection in the modal
   */
  const toggleExamSelection = (examIndex) => {
    const newSelection = new Set(selectedExamsForDownload);
    if (newSelection.has(examIndex)) {
      newSelection.delete(examIndex);
    } else {
      newSelection.add(examIndex);
    }
    setSelectedExamsForDownload(newSelection);
  };

  /**
   * Export selected exams to Excel
   */
  const handleExportSelectedExams = async () => {
    try {
      if (!selectedStudentForDownload || selectedExamsForDownload.size === 0) {
        showError(t('selectExamsToDownload', 'Please select at least one exam to download'));
        return;
      }

      setIsExporting(true);
      startLoading('exportExams', t('exportingExams', 'Exporting exams...'));

      // Filter selected exams
      const selectedExams = selectedStudentForDownload.exams.filter((_, idx) =>
        selectedExamsForDownload.has(idx)
      );

      // Export to Excel
      await exportExamResultsToExcel(selectedExams, selectedStudentForDownload.student, t);

      showSuccess(t('studentDownloadSuccess', 'Student exam records downloaded successfully'));
      setShowDownloadModal(false);
    } catch (error) {
      console.error('Error exporting exams:', error);
      showError(t('studentDownloadError', 'Failed to download exam records'));
    } finally {
      setIsExporting(false);
      stopLoading('exportExams');
    }
  };

  /**
   * Get table columns configuration - shows only students with records
   */
  const getTableColumns = () => [
    {
      key: 'studentName',
      header: t('student', 'Student'),
      accessor: 'studentName',
      disableSort: false
    },
    {
      key: 'totalExams',
      header: t('totalExams', 'Total Exams'),
      accessor: 'totalExams',
      render: (item) => (
        <Badge color="blue" variant="outline">
          {item.totalExams}
        </Badge>
      ),
      disableSort: false
    },
    {
      key: 'passedCount',
      header: t('passed', 'Passed'),
      accessor: 'passedCount',
      render: (item) => (
        <Badge color="green" variant="solid" size="sm">
          {item.passedCount}
        </Badge>
      ),
      disableSort: false
    },
    {
      key: 'failedCount',
      header: t('failed', 'Failed'),
      accessor: 'failedCount',
      render: (item) => (
        <Badge color="red" variant="solid" size="sm">
          {item.failedCount}
        </Badge>
      ),
      disableSort: false
    },
    {
      key: 'completedCount',
      header: t('completed', 'Completed'),
      accessor: 'completedCount',
      render: (item) => (
        <Badge color="gray" variant="outline" size="sm">
          {item.completedCount}
        </Badge>
      ),
      disableSort: false
    },
    {
      key: 'actions',
      header: t('actions', 'Actions'),
      disableSort: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewStudentRecords(item.studentRecord)}
            className="flex items-center gap-1"
          >
            <Eye className="w-4 h-4" />
            {t('viewRecords', 'View Records')}
          </Button>
          {item.totalExams > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenDownloadModal(item.studentRecord)}
              className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Download className="w-4 h-4" />
              {t('download', 'Download')}
            </Button>
          )}
        </div>
      )
    }
  ];

  /**
   * Get table data - ALL students, but calculate stats only for those with exam records
   */
  const getTableData = useMemo(() => {
    const rows = [];

    studentRecords.forEach((sr) => {
      // Handle nested user structure
      const studentName = getFullName(sr.student.user || sr.student, '-');
      const studentId = sr.student.studentId || sr.student.user?.id || sr.student.id;

      // Calculate statistics
      const totalExams = sr.exams?.length || 0;
      const passedCount = sr.exams?.filter(e => e.status === 'COMPLETED' && e.passed).length || 0;
      const failedCount = sr.exams?.filter(e => e.status === 'COMPLETED' && !e.passed).length || 0;
      const completedCount = sr.exams?.filter(e => e.status === 'COMPLETED').length || 0;

      rows.push({
        id: `student-${studentId}`,
        studentName,
        totalExams,
        passedCount,
        failedCount,
        completedCount,
        studentRecord: sr, // Keep full record for modal
        hasRecords: sr.hasRecords // Flag to filter in display
      });
    });

    return rows;
  }, [studentRecords, t]);

  /**
   * Apply search filter to table data (show all students)
   */
  const filteredTableData = useMemo(() => {
    if (!searchTerm.trim()) {
      return getTableData;
    }

    const search = searchTerm.toLowerCase();
    return getTableData.filter((row) => {
      const studentName = (row.studentName || '').toLowerCase();
      return studentName.includes(search);
    });
  }, [getTableData, searchTerm]);

  // Loading state
  if (loading && classes.length === 0) {
    return <PageLoader message={t('loadingExamRecords', 'Loading exam records...')} />;
  }

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        message={error}
        onRetry={fetchExamRecords}
      />
    );
  }

  return (
    <PageTransition variant="fade" className="flex-1">
      <div className="p-3 sm:p-6">
        {/* Header */}
        <FadeInSection className="mb-6">
          <div className="bg-white rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('studentExamRecords', 'Student Exam Records')}
                </h1>
                <p className="text-sm text-gray-600">
                  {t('viewClassStudentExams', 'View exam records for your students')}
                </p>
              </div>
            </div>

            {/* Tab Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList>
                <TabsTrigger value="records">
                  {t('examRecords', 'Exam Records')}
                </TabsTrigger>
                <TabsTrigger value="scores">
                  {t('scoreInput', 'Score Input')}
                </TabsTrigger>
              </TabsList>

              {/* Exam Records Tab */}
              <TabsContent value="records">
                <div className="mt-6">
                  {/* Primary Filters: Class, Search */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {/* Class Selection - Mandatory */}
                    {classes.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('selectClass', 'Select Class')}
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <Dropdown
                          value={selectedClass ? selectedClass.toString() : ''}
                          onValueChange={(value) => setSelectedClass(value ? parseInt(value) : null)}
                          options={classes.map(cls => ({
                            value: (cls.classId || cls.id).toString(),
                            label: cls.gradeLevel ? `${t('class', 'Class')} ${formatClassIdentifier(cls.gradeLevel, cls.section)}` : (cls.name || `${t('class', 'Class')} ${cls.gradeLevel || ''} ${cls.section || ''}`.trim())
                          }))}
                          placeholder={t('chooseOption', 'ជ្រើសរើសជម្រើស')}
                          className='w-full'
                        />
                      </div>
                    )}

                    {/* Search */}
                    <div className="">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('search', 'Search')}
                      </label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('searchStudents', 'Search by student name...')}
                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-white overflow-hidden mt-4">
                  {!selectedClass ? (
                    <EmptyState
                      icon={BookOpen}
                      title={t('selectClassFirst', 'Select a Class')}
                      description={t('selectClassFirstDesc', 'Please select a class from the filters above to view exam records')}
                    />
                  ) : loading ? (
                    <PageLoader message={t('loadingExamRecords', 'Loading exam records...')} />
                  ) : filteredTableData.length === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title={t('noStudents', 'No Students')}
                      description={t('noStudentsInClass', 'No students found in this class')}
                      actionLabel={t('clearSearch', 'Clear Search')}
                      onAction={() => {
                        setSearchTerm('');
                      }}
                    />
                  ) : (
                    <>
                      <Table
                        columns={getTableColumns()}
                        data={filteredTableData}
                        loading={loading}
                        t={t}
                        showPagination={pagination.totalPages > 1}
                        pagination={{
                          page: pagination.currentPage,
                          pages: pagination.totalPages,
                          total: pagination.totalStudents,
                          limit: pagination.pageSize
                        }}
                        onPageChange={(newPage) => {
                          setPagination(prev => ({
                            ...prev,
                            currentPage: newPage
                          }));
                          fetchExamRecords(newPage);
                        }}
                      />
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Score Input Tab */}
              <TabsContent value="scores">
                <div className="mt-6">
                {/* Class, Academic Year, and Month Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {/* Class Selection */}
                  {classes.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('selectClass', 'Select Class')}
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <Dropdown
                        value={selectedClass ? selectedClass.toString() : ''}
                        onValueChange={(value) => setSelectedClass(value ? parseInt(value) : null)}
                        options={classes.map(cls => ({
                          value: (cls.classId || cls.id).toString(),
                          label: cls.gradeLevel ? `${t('class', 'Class')} ${formatClassIdentifier(cls.gradeLevel, cls.section)}` : (cls.name || `${t('class', 'Class')} ${cls.gradeLevel || ''} ${cls.section || ''}`.trim())
                        }))}
                        placeholder={t('chooseOption', 'ជ្រើសរើសជម្រើស')}
                        className='w-full'
                      />
                    </div>
                  )}

                  {/* Academic Year Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('academicYear', 'Academic Year')}
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Dropdown
                      value={selectedAcademicYear}
                      onValueChange={(value) => setSelectedAcademicYear(value)}
                      options={Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return {
                          value: year.toString(),
                          label: `${year} - ${year + 1}`
                        };
                      })}
                      placeholder={t('chooseOption', 'ជ្រើសរើសជម្រើស')}
                      className='w-full'
                    />
                  </div>

                  {/* Month Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('month', 'Month')}
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Dropdown
                      value={selectedMonth.toString()}
                      onValueChange={(value) => setSelectedMonth(parseInt(value))}
                      options={[
                        { value: '1', label: t('january', 'January') },
                        { value: '2', label: t('february', 'February') },
                        { value: '3', label: t('march', 'March') },
                        { value: '4', label: t('april', 'April') },
                        { value: '5', label: t('may', 'May') },
                        { value: '6', label: t('june', 'June') },
                        { value: '7', label: t('july', 'July') },
                        { value: '8', label: t('august', 'August') },
                        { value: '9', label: t('september', 'September') },
                        { value: '10', label: t('october', 'October') },
                        { value: '11', label: t('november', 'November') },
                        { value: '12', label: t('december', 'December') }
                      ]}
                      placeholder={t('chooseOption', 'Choose an option')}
                      className='w-full'
                    />
                  </div>
                </div>

                {/* Score Input Section */}
                {!selectedClass ? (
                  <EmptyState
                    icon={BookOpen}
                    title={t('selectClassFirst', 'Select a Class')}
                    description={t('selectClassFirstDesc', 'Please select a class from the filters above to enter scores')}
                  />
                ) : classStudents.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title={t('noStudents', 'No Students')}
                    description={t('noStudentsInClass', 'No students found in this class')}
                  />
                ) : (
                  <div className="space-y-6">
                    {/* Score Table */}
                    <div className="shadow-lg rounded-sm overflow-hidden border border-gray-200 bg-transparent">
                      <div className="bg-white p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('scoreInput', 'Score Input')}</h2>
                        <p className="text-sm text-gray-600">{t('enterStudentScores', 'Enter student scores for each skill category')}</p>
                      </div>
                      <div className="overflow-auto" style={{ height: '700px' }}>
                        <table className="min-w-full border-collapse bg-white">
                          <thead className="sticky top-0 z-20 border-b border-gray-200">
                            {/* Main Header Row */}
                            <tr className="border-b border-gray-300 bg-gradient-to-r from-blue-600 to-blue-700">
                              <th rowSpan={2} className="px-6 py-3 text-left text-sm font-bold text-white border-r border-blue-500 min-w-80 bg-gradient-to-r from-blue-600 to-blue-700 sticky left-0 z-30">
                                {t('studentName', 'Student Name')}
                              </th>
                              {Object.entries(SUBJECT_SKILLS).map(([subjectKey, subject]) => {
                                const hasSubheader = ['khmer', 'math'].includes(subjectKey);
                                return (
                                  <th
                                    key={subjectKey}
                                    colSpan={subject.skills.length}
                                    rowSpan={hasSubheader ? 1 : 2}
                                    className="px-3 py-3 text-center text-xs font-bold text-white border-r border-blue-500"
                                  >
                                    {t(subjectKey, subject.name)}
                                  </th>
                                );
                              })}
                              <th rowSpan={2} className="px-4 py-3 text-center text-sm font-bold text-white border-r border-blue-500 bg-gradient-to-r from-green-600 to-green-700">
                                {t('totalScore', 'Total Score')}
                              </th>
                              <th rowSpan={2} className="px-4 py-3 text-center text-sm font-bold text-white border-r border-blue-500 bg-gradient-to-r from-purple-600 to-purple-700">
                                {t('average', 'Average')}
                              </th>
                              <th rowSpan={2} className="px-4 py-3 text-center text-sm font-bold text-white border-r border-blue-500 bg-gradient-to-r from-orange-600 to-orange-700">
                                {t('grading', 'Grade')}
                              </th>
                            </tr>
                            {/* Sub Header Row */}
                            <tr className="border-b border-gray-200 bg-blue-50">
                              {Object.entries(SUBJECT_SKILLS).map(([subjectKey, subject]) => {
                                const hasSubheader = ['khmer', 'math'].includes(subjectKey);
                                if (!hasSubheader) return null;
                                return subject.skills.map(skill => (
                                  <th
                                    key={`${subjectKey}-${skill}`}
                                    className="px-3 py-3 text-center text-xs font-semibold text-blue-900 border-r border-blue-200 bg-blue-50"
                                  >
                                    {t(skill.toLowerCase().replace(/\s+/g, '_'), skill)}
                                  </th>
                                ));
                              })}
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {classStudents.map((student, rowIndex) => {
                              const studentId = student.studentId || student.id;
                              const studentName = getFullName(student.user || student, '');

                              return (
                                <tr key={`${rowIndex}-${studentId}`} className="hover:bg-gray-50 border-b border-gray-100">
                                  <td className="text-left sticky left-0 z-10 min-w-80 bg-gray-50 border-r border-gray-200" style={{ position: 'sticky', left: 0 }}>
                                    <div className="flex flex-col gap-2 p-3">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <p className="text-sm font-semibold text-gray-900">{studentName}</p>
                                          <p className="text-xs text-gray-500">ID: {studentId}</p>
                                        </div>
                                        <Button
                                          variant="link"
                                          size="sm"
                                          onClick={() => handleOpenExamHistoryModal(student)}
                                          disabled={examHistoryLoading}
                                          title={t('viewExamHistory', 'View Exam History')}
                                        >
                                          <ClipboardList className="w-4 h-4 inline-block mr-1" />
                                        </Button>
                                      </div>
                                    </div>
                                  </td>
                                  {Object.entries(SUBJECT_SKILLS).map(([subjectKey, subject]) => {
                                    const hasSubheader = ['khmer', 'math'].includes(subjectKey);

                                    if (hasSubheader) {
                                      // For subjects with subheaders (khmer, math), show one cell per skill
                                      return subject.skills.map((skill, skillIndex) => (
                                        <td
                                          key={`${rowIndex}-${subjectKey}-${skillIndex}`}
                                          id={`cell-${rowIndex}-${subjectKey}-${skillIndex}`}
                                          className="border-r border-gray-200 relative cursor-pointer bg-white hover:bg-blue-50"
                                        >
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            value={scoreData[studentId]?.[subjectKey]?.[skill] ?? ''}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              let val = e.target.value;
                                              // Allow: "", digits, digit., .digit, digit.digit
                                              if (/^\d*\.?\d*$/.test(val)) {
                                                // If starts with ".", prefix zero
                                                if (val.startsWith(".")) {
                                                  val = "0" + val;
                                                }
                                                handleScoreChange(studentId, subjectKey, skill, val);
                                              }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => handleScoreCellKeyDown(e, rowIndex, subjectKey, skill, studentId)}
                                            className="w-full h-full p-4 text-sm border-0 focus:border focus:ring-1 bg-white focus:border-blue-500 focus:ring-blue-500 text-center"
                                          />
                                        </td>
                                      ));
                                    } else {
                                      // For subjects without subheaders, apply value to all skills
                                      const firstSkill = subject.skills[0];
                                      return (
                                        <td
                                          key={`${rowIndex}-${subjectKey}`}
                                          id={`cell-${rowIndex}-${subjectKey}-0`}
                                          colSpan={subject.skills.length}
                                          className="border-r border-gray-200 relative cursor-pointer bg-white hover:bg-blue-50"
                                        >
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            value={scoreData[studentId]?.[subjectKey]?.[firstSkill] ?? ''}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              // Only allow numbers and one decimal point
                                              let filtered = e.target.value.replace(/[^\d.]/g, '');
                                              // Prevent multiple decimal points - keep only the first one
                                              const parts = filtered.split('.');
                                              if (parts.length > 2) {
                                                filtered = parts[0] + '.' + parts.slice(1).join('');
                                              }
                                              // Update all skills with the same value
                                              subject.skills.forEach(skill => {
                                                handleScoreChange(studentId, subjectKey, skill, filtered);
                                              });
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => handleScoreCellKeyDown(e, rowIndex, subjectKey, firstSkill, studentId)}
                                            className="w-full h-full p-4 text-sm border-0 focus:border focus:ring-1 bg-white focus:border-blue-500 focus:ring-blue-500 text-center p-0"
                                          />
                                        </td>
                                      );
                                    }
                                  })}

                                  {/* Total Score Column */}
                                  <td className="px-4 py-4 text-center text-sm font-bold text-gray-900 border-r border-gray-200 bg-green-50">
                                    {(() => {
                                      let total = 0;
                                      Object.entries(SUBJECT_SKILLS).forEach(([subjectKey, subject]) => {
                                        const hasSubheader = ['khmer', 'math'].includes(subjectKey);
                                        if (hasSubheader) {
                                          subject.skills.forEach(skill => {
                                            const score = parseFloat(scoreData[studentId]?.[subjectKey]?.[skill] || 0);
                                            total += score;
                                          });
                                        } else {
                                          const firstSkill = subject.skills[0];
                                          const score = parseFloat(scoreData[studentId]?.[subjectKey]?.[firstSkill] || 0);
                                          total += score;
                                        }
                                      });
                                      return total.toFixed(2);
                                    })()}
                                  </td>

                                  {/* Average Column */}
                                  <td className="px-4 py-4 text-center text-sm font-bold text-gray-900 border-r border-gray-200 bg-purple-50">
                                    {(() => {
                                      let total = 0;
                                      let count = 0;
                                      Object.entries(SUBJECT_SKILLS).forEach(([subjectKey, subject]) => {
                                        const hasSubheader = ['khmer', 'math'].includes(subjectKey);
                                        if (hasSubheader) {
                                          subject.skills.forEach(skill => {
                                            const score = parseFloat(scoreData[studentId]?.[subjectKey]?.[skill] || 0);
                                            if (score > 0) {
                                              total += score;
                                              count++;
                                            }
                                          });
                                        } else {
                                          const firstSkill = subject.skills[0];
                                          const score = parseFloat(scoreData[studentId]?.[subjectKey]?.[firstSkill] || 0);
                                          if (score > 0) {
                                            total += score;
                                            count++;
                                          }
                                        }
                                      });
                                      return count > 0 ? (total / count).toFixed(2) : '0.00';
                                    })()}
                                  </td>

                                  {/* Grade Column */}
                                  <td className="px-4 py-4 text-center text-sm font-bold border-r border-gray-200 bg-orange-50">
                                    {(() => {
                                      let total = 0;
                                      let count = 0;
                                      Object.entries(SUBJECT_SKILLS).forEach(([subjectKey, subject]) => {
                                        const hasSubheader = ['khmer', 'math'].includes(subjectKey);
                                        if (hasSubheader) {
                                          subject.skills.forEach(skill => {
                                            const score = parseFloat(scoreData[studentId]?.[subjectKey]?.[skill] || 0);
                                            if (score > 0) {
                                              total += score;
                                              count++;
                                            }
                                          });
                                        } else {
                                          const firstSkill = subject.skills[0];
                                          const score = parseFloat(scoreData[studentId]?.[subjectKey]?.[firstSkill] || 0);
                                          if (score > 0) {
                                            total += score;
                                            count++;
                                          }
                                        }
                                      });
                                      const average = count > 0 ? (total / count) : 0;

                                      // Determine grade based on average
                                      let grade = '-';
                                      let gradeColor = 'text-gray-500';

                                      if (average >= 8.5) {
                                        grade = 'A';
                                        gradeColor = 'text-green-700';
                                      } else if (average >= 7) {
                                        grade = 'B';
                                        gradeColor = 'text-blue-700';
                                      } else if (average >= 5.5) {
                                        grade = 'C';
                                        gradeColor = 'text-yellow-700';
                                      } else if (average >= 4) {
                                        grade = 'D';
                                        gradeColor = 'text-orange-700';
                                      } else if (average > 0) {
                                        grade = 'F';
                                        gradeColor = 'text-red-700';
                                      }

                                      return <span className={gradeColor}>{grade}</span>;
                                    })()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setScoreData({})}
                        disabled={savingScores}
                      >
                        {t('clear', 'Clear')}
                      </Button>
                      <Button
                        onClick={handleSaveScores}
                        disabled={savingScores || !selectedMonth}
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {savingScores ? t('saving', 'Saving...') : t('saveScores', 'Save Scores')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              </TabsContent>
            </Tabs>
          </div>
        </FadeInSection>

        {/* Download Modal */}
        <Modal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          title={t('selectExamsToDownload', 'Select Exams to Download')}
          size="2xl"
          height="full"
          stickyFooter={true}
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setShowDownloadModal(false)}
                disabled={isExporting}
              >
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleExportSelectedExams}
                disabled={isExporting || selectedExamsForDownload.size === 0}
                className="flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('exporting', 'Exporting...')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {t('downloadSelected', 'Download Selected')}
                  </>
                )}
              </Button>
            </div>
          }
        >
          {selectedStudentForDownload && (
            <div>
                {selectedStudentForDownload.exams.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">{t('noExams', 'No exam records found')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Select All / Deselect All */}
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedExamsForDownload.size === selectedStudentForDownload.exams.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedExamsForDownload(
                              new Set(selectedStudentForDownload.exams.map((_, idx) => idx))
                            );
                          } else {
                            setSelectedExamsForDownload(new Set());
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        {t('selectAll', 'Select All')}
                      </label>
                    </div>

                    {/* Exam List */}
                    {selectedStudentForDownload.exams.map((exam, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedExamsForDownload.has(idx)}
                          onChange={() => toggleExamSelection(idx)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 mt-1"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {exam.examTitle || t('exam', 'Exam')}
                          </p>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
                            <div>
                              <span className="font-medium">{t('subject', 'Subject')}:</span> {exam.subjectKhmerName || exam.subjectName || '-'}
                            </div>
                            <div>
                              <span className="font-medium">{t('score', 'Score')}:</span>{' '}
                              {exam.percentage !== undefined && exam.percentage !== null
                                ? `${exam.percentage}%`
                                : exam.score !== undefined && exam.score !== null
                                ? `${exam.score}/${exam.totalScore || 100}`
                                : '-'}
                            </div>
                            <div>
                              <span className="font-medium">{t('grade', 'Grade')}:</span> {exam.letterGrade || '-'}
                            </div>
                            <div>
                              <span className="font-medium">{t('status', 'Status')}:</span> {exam.status || '-'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}
        </Modal>

      {/* Exam History Modal */}
      <Modal
        isOpen={showExamHistoryModal}
        onClose={() => setShowExamHistoryModal(false)}
        title={t('examHistory', 'Exam History')}
        size="2xl"
        height="full"
        stickyFooter={true}
        footer={
          <div className="flex justify-between items-center gap-2 w-full">
            <div className="text-sm text-gray-600">
              {selectedExamsInHistory.size > 0 && (
                <span>{selectedExamsInHistory.size} exam(s) selected</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowExamHistoryModal(false)}
                variant="outline"
              >
                {t('close', 'Close')}
              </Button>
              <Button
                onClick={handleApplyExamsFromHistory}
                disabled={selectedExamsInHistory.size === 0}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
              >
                {t('applyScores', 'Apply Scores')}
              </Button>
            </div>
          </div>
        }
      >
        {selectedStudentForHistory && (
          <div>
              {examHistoryLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : selectedStudentForHistory?.exams && selectedStudentForHistory.exams.length > 0 ? (
                <div className="space-y-4">
                  {selectedStudentForHistory.exams.map((exam, index) => {
                    const isSelected = selectedExamsInHistory.has(index);
                    return (
                      <div
                        key={index}
                        onClick={() => toggleExamInHistory(index)}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:shadow-md'
                        }`}
                      >
                        <div className="flex gap-4">
                          {/* Checkbox */}
                          <div className="flex items-start pt-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleExamInHistory(index)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer"
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left Column */}
                            <div>
                              <h3 className="font-bold text-lg text-gray-900 mb-2">
                                {exam.examTitle || '-'}
                              </h3>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t('subject', 'Subject')}:</span>
                                  <span className="font-semibold">{exam.subjectKhmerName || exam.subjectName || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t('examType', 'Exam Type')}:</span>
                                  <span className="font-semibold">{getExamTypeLabel(exam.examType, t)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t('examDate', 'Exam Date')}:</span>
                                  <span className="font-semibold">
                                    {exam.createdAt ? new Date(exam.createdAt).toLocaleDateString() : '-'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right Column */}
                            <div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">{t('score', 'Score')}:</span>
                                  <span className="text-lg font-bold text-blue-600">
                                    {exam.percentage !== undefined && exam.percentage !== null
                                      ? `${exam.percentage}%`
                                      : exam.score !== undefined && exam.score !== null
                                      ? `${exam.score}/${exam.totalScore || 100}`
                                      : '-'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t('grade', 'Grade')}:</span>
                                  <span className="font-semibold text-lg">{exam.letterGrade || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t('status', 'Status')}:</span>
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    exam.status === 'completed'
                                      ? 'bg-green-100 text-green-800'
                                      : exam.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {exam.status || '-'}
                                  </span>
                                </div>
                                {exam.timeTaken && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">{t('duration', 'Duration')}:</span>
                                    <span className="font-semibold">{formatTimeTaken(exam.timeTaken)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">{t('noExamsFound', 'No exam records found')}</p>
                </div>
              )}
          </div>
        )}
      </Modal>
      </div>
    </PageTransition>
  );
}
