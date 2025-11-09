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
import { teacherService } from '../../utils/api/services/teacherService';
import { userService } from '../../utils/api/services/userService';
import QRCodeDisplay from '@/components/qr-code/QRCodeDisplay';

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

  // Teacher tab state
  const [selectedTeacherGradeLevel, setSelectedTeacherGradeLevel] = useState('all');
  const [teachers, setTeachers] = useState([]);
  const [teacherQrCodes, setTeacherQrCodes] = useState([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherGenerating, setTeacherGenerating] = useState(false);
  const [teacherCurrentPage, setTeacherCurrentPage] = useState(1);
  const [teacherTotalPages, setTeacherTotalPages] = useState(1);
  const teacherItemsPerPage = 10;

  const cardRefsRef = useRef({});

  // 🔹 Get School ID
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const sid = user?.school?.id || user?.schoolId;
    if (sid) setSchoolId(sid);
  }, []);

  // 🔹 Fetch Classes
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        setStudentLoading(true);
        clearError();
        const response = await classService.getBySchool(schoolId, { limit: 100 });
        if (response.success && response.classes) {
          setClasses([{ id: 'all', name: t('allClasses', 'ថ្នាក់រៀនទាំងអស់') }, ...response.classes]);
        }
      } catch (err) {
        handleError(err);
      } finally {
        setStudentLoading(false);
      }
    })();
  }, [schoolId, selectedGradeLevel]);

  // 🔹 Fetch Students + QR Codes
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

      const response = await studentService.getStudentsBySchoolClasses(schoolId, {
        limit: studentItemsPerPage,
        page: studentCurrentPage,
        classId: parseInt(selectedClass)
      });

      if (response.success && response.data) {
        const enriched = await studentService.utils.enrichStudentsWithUserProfiles(response.data);
        setStudents(enriched);

        const qrData = [];
        enriched.forEach((student) => {
          const qr = studentService.utils.extractQRCodeFromProfile(student);
          if (qr) {
            qrData.push({
              userId: qr.userId,
              name: student.name,
              username: student.username,
              qrCode: qr.qr_code,
              studentNumber: student.userProfile?.student?.studentNumber,
              email: student.email
            });
          }
        });
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

  // 🔹 Generate QR codes for students who don't have one
  const generateQRCodesForStudents = async () => {
    if (!students.length) return;

    const studentsWithoutQR = students.filter(
      (student) => !studentService.utils.extractQRCodeFromProfile(student)
    );

    if (!studentsWithoutQR.length) {
      showError(t('allHaveQR', 'សិស្សទាំងអស់មានលេខកូដ QR រួចហើយ'));
      return;
    }

    try {
      setStudentGenerating(true);
      startLoading(t('generatingQRCodes', 'កំពុងបង្កើតលេខកូដ QR...'));

      console.log(`Generating QR codes for ${studentsWithoutQR.length} students without QR`);

      let successCount = 0;
      let failureCount = 0;

      // Generate QR code for each student
      for (const student of studentsWithoutQR) {
        try {
          // Use the student's username and a default/empty password for QR generation
          const response = await userService.generateQRCode(student.username, '');

          if (response && response.qr_code) {
            successCount++;
            console.log(`✅ QR generated for student: ${student.username}`);
          } else {
            failureCount++;
            console.warn(`❌ Failed to generate QR for student: ${student.username}`);
          }
        } catch (err) {
          failureCount++;
          console.error(`Error generating QR for student ${student.username}:`, err);
        }
      }

      // Show result message
      if (successCount > 0) {
        showSuccess(
          t('qrGenerated', 'បង្កើតលេខកូដ QR ដោយជោគជ័យ') +
          ` (${successCount}/${studentsWithoutQR.length})`
        );
        await fetchStudents(); // ✅ refresh only the QR list, not full page
      } else {
        showError(t('failedToGenerateQR', 'បរាជ័យក្នុងការបង្កើតលេខកូដ QR'));
      }
    } catch (err) {
      handleError(err);
      showError(t('failedToGenerateQR', 'បរាជ័យក្នុងការបង្កើតលេខកូដ QR'));
    } finally {
      setStudentGenerating(false);
      stopLoading();
    }
  };

  // 🔹 Generate QR codes for teachers who don't have one
  const generateQRCodesForTeachers = async () => {
    if (!teachers.length) return;

    // Find teachers without QR codes
    const teachersWithoutQR = teachers.filter((teacher) => {
      const userId = teacher.user?.id || teacher.userId || teacher.user_id;
      const hasQR = teacherQrCodes.some((qr) => qr.userId === userId);
      return !hasQR;
    });

    if (!teachersWithoutQR.length) {
      showError(t('allTeachersHaveQR', 'គ្រូបង្រៀនទាំងអស់មានលេខកូដ QR រួចហើយ'));
      return;
    }

    try {
      setTeacherGenerating(true);
      startLoading(t('generatingQRCodes', 'កំពុងបង្កើតលេខកូដ QR...'));

      console.log(`Generating QR codes for ${teachersWithoutQR.length} teachers without QR`);

      let successCount = 0;
      let failureCount = 0;

      // Generate QR code for each teacher
      for (const teacher of teachersWithoutQR) {
        try {
          // Get the teacher's username from full user data
          const userId = teacher.user?.id || teacher.userId || teacher.user_id;

          // Fetch user data to get username
          const userResponse = await userService.getUserByID(userId);
          const userData = userResponse?.data || userResponse;

          if (!userData || !userData.username) {
            failureCount++;
            console.warn(`❌ Could not find username for teacher ${userId}`);
            continue;
          }

          // Generate QR code using username and empty password
          const response = await userService.generateQRCode(userData.username, '');

          if (response && response.qr_code) {
            successCount++;
            console.log(`✅ QR generated for teacher: ${userData.username}`);
          } else {
            failureCount++;
            console.warn(`❌ Failed to generate QR for teacher: ${userData.username}`);
          }
        } catch (err) {
          failureCount++;
          console.error(`Error generating QR for teacher:`, err);
        }
      }

      // Show result message
      if (successCount > 0) {
        showSuccess(
          t('qrGenerated', 'បង្កើតលេខកូដ QR ដោយជោគជ័យ') +
          ` (${successCount}/${teachersWithoutQR.length})`
        );
        await fetchTeachers(); // ✅ refresh the QR list
      } else {
        showError(t('failedToGenerateQR', 'បរាជ័យក្នុងការបង្កើតលេខកូដ QR'));
      }
    } catch (err) {
      handleError(err);
      showError(t('failedToGenerateQR', 'បរាជ័យក្នុងការបង្កើតលេខកូដ QR'));
    } finally {
      setTeacherGenerating(false);
      stopLoading();
    }
  };

  // 🔹 Fetch Teachers + QR Codes (only those with QR codes)
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

      // Fetch teachers in school, filtered by grade level if selected
      const queryParams = {
        limit: teacherItemsPerPage,
        page: teacherCurrentPage
      };

      if (selectedTeacherGradeLevel && selectedTeacherGradeLevel !== 'all') {
        queryParams.grade_level = selectedTeacherGradeLevel;
      }

      const teachersResponse = await teacherService.getTeachersBySchool(schoolId, queryParams);

      if (teachersResponse.success && teachersResponse.data) {
        const teacherList = teachersResponse.data;
        console.log(`Fetched ${teacherList.length} teachers from school:`, teacherList);
        setTeachers(teacherList);

        // Fetch full user data for each teacher to get QR codes
        const qrData = [];
        for (const teacher of teacherList) {
          try {
            // Extract userId from nested teacher object
            const userId = teacher.user?.id || teacher.userId || teacher.user_id;
            if (!userId) {
              console.warn('Teacher has no user ID:', teacher);
              continue;
            }

            console.log(`Fetching user data for teacher userId: ${userId}`);

            // Fetch full user data with QR code
            const userResponse = await userService.getUserByID(userId);

            console.log(`User response for ${userId}:`, userResponse);

            // Handle both response formats: { data: {...} } and direct {...}
            const userData = userResponse?.data || userResponse;

            if (userData) {
              const qrCode = userData.qr_code;

              console.log(`Teacher ${userId} - Name: ${userData.first_name} ${userData.last_name}, Has QR: ${!!qrCode}`);

              // Only include teacher if they have a QR code
              if (qrCode) {
                qrData.push({
                  userId: userId,
                  name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
                  username: userData.username,
                  qrCode: qrCode,
                  email: userData.email,
                  hasQrCode: true
                });
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch user data for teacher:`, err);
            // Continue with next teacher
          }
        }
        setTeacherQrCodes(qrData);
        console.log(`Loaded ${qrData.length} teachers with QR code data`);

        // Handle pagination from response
        if (teachersResponse.pagination) {
          setTeacherTotalPages(teachersResponse.pagination.pages || 1);
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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
                  disabled={teacherGenerating || teacherQrCodes.length === 0}
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
  );
}
