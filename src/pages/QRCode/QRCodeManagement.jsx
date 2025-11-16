import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Download, Grid3X3, List, Users } from 'lucide-react';
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

export default function StudentQRCodeGenerator() {
  const { t, setLanguage } = useLanguage();
  const { showError } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError } = useErrorHandler();

  // Force Khmer as the base language for this page
  useEffect(() => {
    setLanguage && setLanguage('km');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only set language once on mount

  // Common state
  const [schoolId, setSchoolId] = useState(null);
  const [schoolName, setSchoolName] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('students');

  // Student tab state
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentQrCodes, setStudentQrCodes] = useState([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [studentTotalPages, setStudentTotalPages] = useState(1);
  const studentItemsPerPage = 8;

  // Teacher tab state
  const [selectedTeacherGradeLevel, setSelectedTeacherGradeLevel] = useState('all');
  const [teachers, setTeachers] = useState([]);
  const [teacherQrCodes, setTeacherQrCodes] = useState([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherCurrentPage, setTeacherCurrentPage] = useState(1);
  const [teacherTotalPages, setTeacherTotalPages] = useState(1);
  const teacherItemsPerPage = 8;

  const cardRefsRef = useRef({});

  // 🔹 Get School ID and Name
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const sid = user?.school?.id || user?.schoolId;
    const sname = user?.school?.name || user?.schoolName;
    if (sid) setSchoolId(sid);
    if (sname) setSchoolName(sname);
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
                hasQrCode: !!userData.qr_code,
                schoolName: schoolName,
                className: student.class?.name || null
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
                hasQrCode: !!userData.qr_code,
                schoolName: schoolName
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

  // Download entire card as image
  const downloadQRCode = async (qrCode, cardRef) => {
    try {
      // Dynamically import html2canvas
      const { default: html2canvas } = await import('html2canvas');

      // If cardRef is provided, use it; otherwise, create a temporary card
      let element = cardRef;

      if (!element) {
        // Fallback: create a temporary div with card content
        element = document.createElement('div');
        element.style.padding = '20px';
        element.style.backgroundColor = 'white';
        element.style.borderRadius = '8px';
        element.style.border = '1px solid #e5e7eb';
        element.style.width = '320px';

        const content = `
          <div style="text-align: center; font-family: system-ui, -apple-system, sans-serif;">
            ${qrCode.qrCode ? `<img src="${qrCode.qrCode}" style="width: 200px; height: 200px; margin-bottom: 12px; border: 1px solid #e5e7eb; border-radius: 4px;" />` : '<div style="width: 200px; height: 200px; margin: 0 auto 12px; border: 2px dashed #e5e7eb; display: flex; align-items: center; justify-content: center; border-radius: 4px;"><p style="color: #a3a3a3; font-size: 12px;">No QR Code</p></div>'}
            <p style="font-size: 14px; font-weight: 500; margin: 8px 0; color: #111827;">${qrCode.name}</p>
            <p style="font-size: 12px; color: #6b7280; margin: 4px 0;">Username: ${qrCode.username}</p>
            ${qrCode.schoolName ? `<p style="font-size: 12px; color: #6b7280; margin: 4px 0;">School: ${qrCode.schoolName}</p>` : ''}
            ${qrCode.className ? `<p style="font-size: 12px; color: #6b7280; margin: 4px 0;">Class: ${qrCode.className}</p>` : ''}
          </div>
        `;
        element.innerHTML = content;
        document.body.appendChild(element);
      }

      // Capture the card as canvas
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });

      // Remove temporary element if created
      if (!cardRef) {
        document.body.removeChild(element);
      }

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${qrCode.name}_QR_Card.png`;
        link.click();
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Error downloading card:', error);
      // Fallback: download just the QR code image
      if (qrCode.qrCode) {
        const link = document.createElement('a');
        link.href = qrCode.qrCode;
        link.download = `${qrCode.name}_QR.png`;
        link.click();
      }
    }
  };

  return (
    <PageTransition className="flex-1 p-3 sm:p-4">
      <div className="p-4 sm:p-6">
        <FadeInSection>
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="sm:text-2xl text-lg font-bold text-gray-900 flex items-center gap-2">
                <QrCode className="h-7 w-7 text-blue-600" />
                {t('qrCodeGenerator', 'គ្រប់គ្រង QR-Code')}
              </h1>
              <p className="text-sm mt-1 text-gray-500">
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
              {/* Filters and View Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                {/* Filters Container */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
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
                </div>

                {/* View Toggle - Always on the right */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    onClick={() => setViewMode('grid')}
                    variant={viewMode === 'grid' ? 'primary' : 'outline'}
                    size="sm"
                    title={t('gridView', 'Grid View')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setViewMode('list')}
                    variant={viewMode === 'list' ? 'primary' : 'outline'}
                    size="sm"
                    title={t('listView', 'List View')}
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
              {/* Filters and View Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                {/* Grade Level Filter */}
                <div className="w-full sm:w-auto">
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

                {/* View Toggle - Always on the right */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    onClick={() => setViewMode('grid')}
                    variant={viewMode === 'grid' ? 'primary' : 'outline'}
                    size="sm"
                    title={t('gridView', 'Grid View')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setViewMode('list')}
                    variant={viewMode === 'list' ? 'primary' : 'outline'}
                    size="sm"
                    title={t('listView', 'List View')}
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
