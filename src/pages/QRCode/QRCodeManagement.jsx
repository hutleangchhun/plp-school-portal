import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Download, Loader, Grid3X3, List, Sparkles, Users } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoading } from '../../contexts/LoadingContext';
import { useToast } from '../../contexts/ToastContext';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Button } from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import Pagination from '../../components/ui/Pagination';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import EmptyState from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { classService } from '../../utils/api/services/classService';
import { studentService } from '../../utils/api/services/studentService';
import { userService } from '../../utils/api/services/userService';
import { schoolService } from '../../utils/api/services/schoolService';
import { teacherService } from '../../utils/api/services/teacherService';
import QRCodeDisplay from '@/components/qr-code/QRCodeDisplay';
import ExportProgressModal from '@/components/modals/ExportProgressModal';

export default function StudentQRCodeGenerator() {
  const { t, setLanguage } = useLanguage();
  const { showError, showSuccess } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError } = useErrorHandler();

  // Force Khmer as the base language for this page
  useEffect(() => {
    setLanguage && setLanguage('km');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only set language once on mount

  // Common state
  const [schoolId, setSchoolId] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('students');

  // Student tab state
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentQrCodes, setStudentQrCodes] = useState([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentGenerating, setStudentGenerating] = useState(false);
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [studentTotalPages, setStudentTotalPages] = useState(1);
  const studentItemsPerPage = 10;
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentProgress, setStudentProgress] = useState(0);
  const [showStudentProgress, setShowStudentProgress] = useState(false);

  // Teacher tab state
  const [selectedTeacherGradeLevel, setSelectedTeacherGradeLevel] = useState('all');
  const [teachers, setTeachers] = useState([]);
  const [teacherQrCodes, setTeacherQrCodes] = useState([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherGenerating, setTeacherGenerating] = useState(false);
  const [teacherCurrentPage, setTeacherCurrentPage] = useState(1);
  const [teacherTotalPages, setTeacherTotalPages] = useState(1);
  const teacherItemsPerPage = 10;
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [teacherProgress, setTeacherProgress] = useState(0);
  const [showTeacherProgress, setShowTeacherProgress] = useState(false);

  const cardRefsRef = useRef({});

  // 🔹 Get School ID
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const sid = user?.school?.id || user?.schoolId;
    if (sid) setSchoolId(sid);
  }, []);

  // 🔹 Fetch Classes filtered by grade level
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        setStudentLoading(true);
        clearError();
        
        // Build params for getBySchool
        const params = { limit: 100 };
        
        // Add gradeLevel filter if selected
        if (selectedGradeLevel && selectedGradeLevel !== 'all') {
          params.gradeLevel = selectedGradeLevel;
        }
        
        const response = await classService.getBySchool(schoolId, params);
        
        if (response.success && response.classes) {
          setClasses([{ id: 'all', name: t('allClasses', 'ថ្នាក់រៀនទាំងអស់') }, ...response.classes]);
          setSelectedClass('all'); // Reset class selection when grade level changes
        }
      } catch (err) {
        handleError(err);
      } finally {
        setStudentLoading(false);
      }
    })();
  }, [schoolId, selectedGradeLevel]);

  // 🔹 Fetch Students + QR Codes using getStudentsBySchoolClasses
  const fetchStudents = async () => {
    if (!schoolId || selectedClass === 'all') {
      setStudents([]);
      setStudentQrCodes([]);
      setStudentTotalPages(1);
      return;
    }

    try {
      setStudentLoading(true);
      clearError();

      // Use getStudentsBySchoolClasses to fetch students by classId
      const response = await studentService.getStudentsBySchoolClasses(schoolId, {
        limit: studentItemsPerPage,
        page: studentCurrentPage,
        classId: parseInt(selectedClass)
      });

      if (response.success && response.data) {
        // Enrich students with full user data including QR codes
        const enrichedStudents = [];
        const qrData = [];
        
        for (const student of response.data) {
          try {
            // Get userId from the student data
            const userId = student.userId || student.user?.id || student.id;
            
            if (!userId) {
              console.warn('Student has no user ID:', student);
              continue;
            }
            
            // Fetch full user data with QR code using getUserByID
            const userResponse = await userService.getUserByID(userId);
            const userData = userResponse?.data || userResponse;
            
            if (userData) {
              // Merge student data with user data
              const enrichedStudent = {
                ...student,
                qrCode: userData.qr_code,
                qrToken: userData.qr_token,
                qrGeneratedAt: userData.qr_generated_at,
                username: userData.username || student.username,
                email: userData.email || student.email,
                name: student.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
              };
              
              enrichedStudents.push(enrichedStudent);
              
              // Add to QR data - include all students, even without QR codes
              qrData.push({
                userId: userId,
                name: enrichedStudent.name,
                username: enrichedStudent.username,
                qrCode: userData.qr_code || null, // null if no QR code
                studentNumber: student.studentNumber,
                email: enrichedStudent.email,
                hasQrCode: !!userData.qr_code
              });
            }
          } catch (err) {
            console.warn(`Failed to fetch user data for student:`, err);
            // Continue with next student
          }
        }
        
        setStudents(enrichedStudents);
        setStudentQrCodes(qrData);

        // Handle pagination from response
        if (response.pagination) {
          setStudentTotalPages(response.pagination.pages || 1);
        } else {
          setStudentTotalPages(1);
        }
      }
    } catch (err) {
      handleError(err);
      showError(t('failedToLoadStudents', 'បរាជ័យក្នុងការផ្ទុកសិស្ស'));
    } finally {
      setStudentLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [schoolId, selectedClass, studentCurrentPage]);

  // 🔹 Fetch teachers when tab is active or grade level changes
  useEffect(() => {
    if (activeTab === 'teachers' && schoolId) {
      fetchTeachers();
    }
  }, [activeTab, schoolId, selectedTeacherGradeLevel, teacherCurrentPage]);

  // 🔹 Toggle student selection
  const toggleStudentSelection = (userId) => {
    setSelectedStudents(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // 🔹 Toggle all students selection
  const toggleAllStudents = () => {
    const studentsWithoutQR = studentQrCodes.filter(s => !s.hasQrCode);
    if (selectedStudents.length === studentsWithoutQR.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(studentsWithoutQR.map(s => s.userId));
    }
  };

  // 🔹 Generate QR codes for students who don't have one
  const generateQRCodesForStudents = async () => {
    // Use selected students if any, otherwise use all students without QR
    let studentsToGenerate = [];
    
    if (selectedStudents.length > 0) {
      // Generate for selected students only
      studentsToGenerate = studentQrCodes.filter(s => selectedStudents.includes(s.userId) && !s.hasQrCode);
    } else {
      // Generate for all students without QR
      studentsToGenerate = studentQrCodes.filter(s => !s.hasQrCode);
    }

    if (!studentsToGenerate.length) {
      showError(t('allHaveQR', 'សិស្សទាំងអស់មានលេខកូដ QR រួចហើយ'));
      return;
    }

    try {
      setStudentGenerating(true);
      setShowStudentProgress(true);
      setStudentProgress(0);

      console.log(`Generating QR codes for ${studentsToGenerate.length} students without QR`);

      let successCount = 0;
      let failureCount = 0;
      let skippedCount = 0;
      const total = studentsToGenerate.length;

      // Generate QR code for each student
      for (let i = 0; i < studentsToGenerate.length; i++) {
        const student = studentsToGenerate[i];
        try {
          // Skip if student already has QR code
          if (student.hasQrCode) {
            console.log(`⏭️ Skipping student ${student.username} - already has QR code`);
            continue;
          }

          // Generate QR code with empty password (API accepts this for existing users)
          const response = await userService.generateQRCode(student.username, '');

          // API returns: { sessionId, qrCode, expiresIn } or { qr_code }
          if (response && (response.qrCode || response.qr_code)) {
            successCount++;
            console.log(`✅ QR generated for student: ${student.username}`);
          } else {
            failureCount++;
            console.warn(`❌ Failed to generate QR for student: ${student.username}`);
          }
        } catch (err) {
          // Handle 409 Conflict - invalid credentials or QR already exists
          if (err.status === 409 || err.statusCode === 409) {
            console.log(`⏭️ Student ${student.username} - 409 Conflict (QR may already exist or invalid credentials)`);
            skippedCount++; // Count as skipped
          } else {
            failureCount++;
            console.error(`Error generating QR for student ${student.username}:`, err);
          }
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / total) * 100);
        setStudentProgress(progress);
      }

      // Show result message
      if (successCount > 0) {
        let message = t('qrGenerated', 'បង្កើតលេខកូដ QR ដោយជោគជ័យ') + ` (${successCount}/${studentsToGenerate.length})`;
        if (skippedCount > 0) {
          message += ` - ${skippedCount} ${t('skipped', 'skipped (already exist or invalid credentials)')}`;
        }
        showSuccess(message);
        setSelectedStudents([]); // Clear selection
        await fetchStudents(); // ✅ refresh only the QR list, not full page
      } else if (skippedCount > 0 && failureCount === 0) {
        showError(
          t('allSkipped', 'Cannot generate QR codes - API requires user passwords which are not available. QR codes may already exist or contact backend team to enable admin QR generation.') +
          ` (${skippedCount} ${t('skipped', 'skipped')})`
        );
      } else {
        showError(t('failedToGenerateQR', 'បរាជ័យក្នុងការបង្កើតលេខកូដ QR'));
      }
    } catch (err) {
      handleError(err);
      showError(t('failedToGenerateQR', 'បរាជ័យក្នុងការបង្កើតលេខកូដ QR'));
    } finally {
      setStudentGenerating(false);
      setShowStudentProgress(false);
      setStudentProgress(0);
    }
  };

  // 🔹 Toggle teacher selection
  const toggleTeacherSelection = (userId) => {
    setSelectedTeachers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // 🔹 Toggle all teachers selection
  const toggleAllTeachers = () => {
    const teachersWithoutQR = teacherQrCodes.filter(t => !t.hasQrCode);
    if (selectedTeachers.length === teachersWithoutQR.length) {
      setSelectedTeachers([]);
    } else {
      setSelectedTeachers(teachersWithoutQR.map(t => t.userId));
    }
  };

  // 🔹 Generate QR codes for teachers who don't have one
  const generateQRCodesForTeachers = async () => {
    // Use selected teachers if any, otherwise use all teachers without QR
    let teachersToGenerate = [];
    
    if (selectedTeachers.length > 0) {
      // Generate for selected teachers only
      teachersToGenerate = teacherQrCodes.filter(t => selectedTeachers.includes(t.userId) && !t.hasQrCode);
    } else {
      // Generate for all teachers without QR
      teachersToGenerate = teacherQrCodes.filter(t => !t.hasQrCode);
    }

    if (!teachersToGenerate.length) {
      showError(t('allTeachersHaveQR', 'គ្រូបង្រៀនទាំងអស់មានលេខកូដ QR រួចហើយ'));
      return;
    }

    try {
      setTeacherGenerating(true);
      setShowTeacherProgress(true);
      setTeacherProgress(0);

      console.log(`Generating QR codes for ${teachersToGenerate.length} teachers without QR`);

      let successCount = 0;
      let failureCount = 0;
      let skippedCount = 0;
      const total = teachersToGenerate.length;

      // Generate QR code for each teacher
      for (let i = 0; i < teachersToGenerate.length; i++) {
        const teacher = teachersToGenerate[i];
        try {
          // Skip if teacher already has QR code
          if (teacher.hasQrCode) {
            console.log(`⏭️ Skipping teacher ${teacher.username} - already has QR code`);
            continue;
          }

          // Generate QR code with empty password (API accepts this for existing users)
          const response = await userService.generateQRCode(teacher.username, '');

          // API returns: { sessionId, qrCode, expiresIn } or { qr_code }
          if (response && (response.qrCode || response.qr_code)) {
            successCount++;
            console.log(`✅ QR generated for teacher: ${teacher.username}`);
          } else {
            failureCount++;
            console.warn(`❌ Failed to generate QR for teacher: ${teacher.username}`);
          }
        } catch (err) {
          // Handle 409 Conflict - invalid credentials or QR already exists
          if (err.status === 409 || err.statusCode === 409) {
            console.log(`⏭️ Teacher ${teacher.username} - 409 Conflict (QR may already exist or invalid credentials)`);
            skippedCount++; // Count as skipped
          } else {
            failureCount++;
            console.error(`Error generating QR for teacher:`, err);
          }
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / total) * 100);
        setTeacherProgress(progress);
      }

      // Show result message
      if (successCount > 0) {
        let message = t('qrGenerated', 'បង្កើតលេខកូដ QR ដោយជោគជ័យ') + ` (${successCount}/${teachersToGenerate.length})`;
        if (skippedCount > 0) {
          message += ` - ${skippedCount} ${t('skipped', 'skipped (already exist or invalid credentials)')}`;
        }
        showSuccess(message);
        setSelectedTeachers([]); // Clear selection
        await fetchTeachers(); // ✅ refresh the QR list
      } else if (skippedCount > 0 && failureCount === 0) {
        showError(
          t('allSkipped', 'Cannot generate QR codes - API requires user passwords which are not available. QR codes may already exist or contact backend team to enable admin QR generation.') +
          ` (${skippedCount} ${t('skipped', 'skipped')})`
        );
      } else {
        showError(t('failedToGenerateQR', 'បរាជ័យក្នុងការបង្កើតលេខកូដ QR'));
      }
    } catch (err) {
      handleError(err);
      showError(t('failedToGenerateQR', 'បរាជ័យក្នុងការបង្កើតលេខកូដ QR'));
    } finally {
      setTeacherGenerating(false);
      setShowTeacherProgress(false);
      setTeacherProgress(0);
    }
  };

  // 🔹 Fetch Teachers + QR Codes using getTeachersBySchool
  const fetchTeachers = async () => {
    if (!schoolId) {
      setTeachers([]);
      setTeacherQrCodes([]);
      setTeacherTotalPages(1);
      return;
    }

    try {
      setTeacherLoading(true);
      clearError();

      // Build params for getTeachersBySchool
      const params = {
        page: teacherCurrentPage,
        limit: teacherItemsPerPage
      };

      // Add grade_level filter if selected
      if (selectedTeacherGradeLevel && selectedTeacherGradeLevel !== 'all') {
        params.grade_level = selectedTeacherGradeLevel;
      }

      // Fetch teachers by school with grade level filter
      const response = await teacherService.getTeachersBySchool(schoolId, params);

      if (response.success && response.data) {
        // Enrich teachers with full user data including QR codes
        const enrichedTeachers = [];
        const qrData = [];

        for (const teacher of response.data) {
          try {
            // Get userId from the teacher data
            const userId = teacher.user?.id || teacher.userId || teacher.user_id || teacher.id;

            if (!userId) {
              console.warn('Teacher has no user ID:', teacher);
              continue;
            }

            // Fetch full user data with QR code using getUserByID
            const userResponse = await userService.getUserByID(userId);
            const userData = userResponse?.data || userResponse;

            if (userData) {
              // Merge teacher data with user data
              const enrichedTeacher = {
                ...teacher,
                qrCode: userData.qr_code,
                qrToken: userData.qr_token,
                qrGeneratedAt: userData.qr_generated_at,
                username: userData.username || teacher.username,
                email: userData.email || teacher.email,
                name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username
              };

              enrichedTeachers.push(enrichedTeacher);

              // Add to QR data - include all teachers, even without QR codes
              qrData.push({
                userId: userId,
                name: enrichedTeacher.name,
                username: enrichedTeacher.username,
                qrCode: userData.qr_code || null, // null if no QR code
                email: enrichedTeacher.email,
                teacherNumber: teacher.teacher_number || teacher.teacherNumber,
                hasQrCode: !!userData.qr_code
              });
            }
          } catch (err) {
            console.warn(`Failed to fetch user data for teacher:`, err);
            // Continue with next teacher
          }
        }

        setTeachers(enrichedTeachers);
        setTeacherQrCodes(qrData);

        // Handle pagination from response
        if (response.pagination) {
          setTeacherTotalPages(response.pagination.pages || 1);
        } else {
          setTeacherTotalPages(1);
        }
      }
    } catch (err) {
      handleError(err);
      showError(t('failedToLoadTeachers', 'បរាជ័យក្នុងការផ្ទុកគ្រូបង្រៀន'));
    } finally {
      setTeacherLoading(false);
    }
  };

  const getGradeLevelOptions = () => [
    { value: 'all', label: t('allGradeLevels', 'កម្រិតទាំងអស់') },
    ...[1, 2, 3, 4, 5, 6].map((lvl) => ({ value: lvl, label: `ថ្នាក់ទី ${lvl}` }))
  ];

  const getClassOptions = () => classes.map((c) => ({ value: c.id?.toString(), label: c.name }));

  // Dummy download function
  const downloadQRCode = (qrCode) => {
    const link = document.createElement('a');
    link.href = qrCode.qrCode;
    link.download = `${qrCode.name}_QR.png`;
    link.click();
  };

  return (
    <>
      {/* Student Progress Modal */}
      <ExportProgressModal
        isOpen={showStudentProgress}
        progress={studentProgress}
        status="processing"
      />

      {/* Teacher Progress Modal */}
      <ExportProgressModal
        isOpen={showTeacherProgress}
        progress={teacherProgress}
        status="processing"
      />

    <PageTransition className="flex-1">
      <div className="p-4 sm:p-6">
        <FadeInSection>
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <QrCode className="h-7 w-7 text-blue-600" />
                {t('qrCodeGenerator', 'គ្រប់គ្រង QR-Code')}
              </h1>
              <p className="text-sm text-gray-500">
                {t('generateQRCodes', 'បង្កើត និងទាញយកលេខកូដ QR')}
              </p>
            </div>
          </div>

          {/* Tabs Container */}
          <Tabs.Root
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            {/* Tab List */}
            <Tabs.List className="flex border-b border-gray-200 mb-6">
              <Tabs.Trigger
                value="students"
                className="px-4 py-2 font-medium text-sm border-b-2 -mb-[2px] transition-colors data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-600 hover:text-gray-900"
              >
                {t('students', 'សិស្ស')}
              </Tabs.Trigger>
              <Tabs.Trigger
                value="teachers"
                className="px-4 py-2 font-medium text-sm border-b-2 -mb-[2px] transition-colors data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-600 hover:text-gray-900"
              >
                {t('teachers', 'គ្រូបង្រៀន')}
              </Tabs.Trigger>
            </Tabs.List>

            {/* Students Tab */}
            <Tabs.Content value="students" className="space-y-6">
              {/* Filters and Generate Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                {/* Grade Level Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('selectGradeLevel', 'ជ្រើសរើសកម្រិត')}
                  </label>
                  <Dropdown
                    value={selectedGradeLevel}
                    onValueChange={setSelectedGradeLevel}
                    options={getGradeLevelOptions()}
                    className="w-full"
                  />
                </div>

                {/* Class Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('selectClass', 'ជ្រើសរើសថ្នាក់')}
                  </label>
                  <Dropdown
                    value={selectedClass}
                    onValueChange={setSelectedClass}
                    options={getClassOptions()}
                    className="w-full"
                  />
                </div>

                {/* Generate Button */}
                <Button
                  onClick={generateQRCodesForStudents}
                  disabled={studentGenerating || selectedClass === 'all'}
                  variant="primary"
                  size="sm"
                  className="flex items-center justify-center gap-2 w-full"
                >
                  {studentGenerating ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">{t('generating', 'កំពុងបង្កើត...')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('generateQRCodes', 'បង្កើតលេខកូដ QR')}</span>
                      <span className="sm:hidden text-xs">{t('generate', 'បង្កើត')}</span>
                    </>
                  )}
                </Button>

                {/* View Toggle */}
                <div className="flex items-center gap-2 justify-start sm:justify-end">
                  <Button
                    onClick={() => setViewMode('grid')}
                    variant={viewMode === 'grid' ? 'primary' : 'outline'}
                    size="sm"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setViewMode('list')}
                    variant={viewMode === 'list' ? 'primary' : 'outline'}
                    size="sm"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* QR Display */}
              {studentLoading ? (
                <div className="flex justify-center items-center py-12">
                  <LoadingSpinner size="lg" variant="primary">
                    {t('loadingStudents', 'កំពុងផ្ទុកសិស្ស...')}
                  </LoadingSpinner>
                </div>
              ) : studentQrCodes.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={t('noQRCodes', 'គ្មានលេខកូដ QR')}
                  description={selectedClass === 'all'
                    ? t('selectClassFirst', 'សូមជ្រើសរើសថ្នាក់មួយដំបូង')
                    : t('noStudentQRCodes', 'គ្មានលេខកូដ QR សម្រាប់សិស្សក្នុងថ្នាក់នេះ')}
                  variant="info"
                />
              ) : (
                <>
                  <QRCodeDisplay
                    loading={false}
                    qrCodes={studentQrCodes}
                    viewMode={viewMode}
                    downloadQRCode={downloadQRCode}
                    cardRefsRef={cardRefsRef}
                    t={t}
                    selectedItems={selectedStudents}
                    onToggleSelection={toggleStudentSelection}
                    onToggleAll={toggleAllStudents}
                  />
                  {studentTotalPages > 1 && (
                    <Pagination
                      currentPage={studentCurrentPage}
                      totalPages={studentTotalPages}
                      total={studentQrCodes.length}
                      limit={studentItemsPerPage}
                      onPageChange={setStudentCurrentPage}
                      t={t}
                      className="border-t"
                    />
                  )}
                </>
              )}
            </Tabs.Content>

            {/* Teachers Tab */}
            <Tabs.Content value="teachers" className="space-y-6">
              {/* Grade Level Filter, Generate Button and View Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* Grade Level Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('selectGradeLevel', 'ជ្រើសរើសកម្រិត')}
                  </label>
                  <Dropdown
                    value={selectedTeacherGradeLevel}
                    onValueChange={setSelectedTeacherGradeLevel}
                    options={getGradeLevelOptions()}
                    className="w-full"
                  />
                </div>

                {/* Generate Button */}
                <Button
                  onClick={generateQRCodesForTeachers}
                  disabled={teacherGenerating || teachers.length === 0}
                  variant="primary"
                  size="sm"
                  className="flex items-center justify-center gap-2 w-full"
                >
                  {teacherGenerating ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">{t('generating', 'កំពុងបង្កើត...')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('generateQRCodes', 'បង្កើតលេខកូដ QR')}</span>
                      <span className="sm:hidden text-xs">{t('generate', 'បង្កើត')}</span>
                    </>
                  )}
                </Button>

                {/* View Toggle */}
                <div className="flex items-center gap-2 justify-start sm:justify-end">
                  <Button
                    onClick={() => setViewMode('grid')}
                    variant={viewMode === 'grid' ? 'primary' : 'outline'}
                    size="sm"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setViewMode('list')}
                    variant={viewMode === 'list' ? 'primary' : 'outline'}
                    size="sm"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* QR Display */}
              {teacherLoading ? (
                <div className="flex justify-center items-center py-12">
                  <LoadingSpinner size="lg" variant="primary">
                    {t('loadingTeachers', 'កំពុងផ្ទុកគ្រូបង្រៀន...')}
                  </LoadingSpinner>
                </div>
              ) : teacherQrCodes.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={t('noTeacherQRCodes', 'គ្មានលេខកូដ QR')}
                  description={t('noTeachersWithQR', 'គ្មានគ្រូបង្រៀនដែលមានលេខកូដ QR')}
                  variant="info"
                />
              ) : (
                <>
                  <QRCodeDisplay
                    loading={false}
                    qrCodes={teacherQrCodes}
                    viewMode={viewMode}
                    downloadQRCode={downloadQRCode}
                    cardRefsRef={cardRefsRef}
                    t={t}
                    selectedItems={selectedTeachers}
                    onToggleSelection={toggleTeacherSelection}
                    onToggleAll={toggleAllTeachers}
                  />
                  {teacherTotalPages > 1 && (
                    <Pagination
                      currentPage={teacherCurrentPage}
                      totalPages={teacherTotalPages}
                      total={teacherQrCodes.length}
                      limit={teacherItemsPerPage}
                      onPageChange={setTeacherCurrentPage}
                      t={t}
                      className="border-t"
                    />
                  )}
                </>
              )}
            </Tabs.Content>
          </Tabs.Root>
        </FadeInSection>
      </div>
    </PageTransition>
    </>
  );
}
