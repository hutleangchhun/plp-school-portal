import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Download, Grid3X3, List, Users } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Button } from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import QRCodeDisplay from '../../components/qr-code/QRCodeDisplay';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import { classService } from '../../utils/api/services/classService';
import { studentService } from '../../utils/api/services/studentService';
import { userService } from '../../utils/api/services/userService';

export default function TeacherQRCodeManagement({ user }) {
  const { t } = useLanguage();
  const { showError, showSuccess } = useToast();

  // State management
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentQrCodes, setStudentQrCodes] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState('grid');
  const itemsPerPage = 8;

  const cardRefsRef = useRef({});

  // Load teacher's classes on mount
  useEffect(() => {
    let mounted = true;

    async function loadClasses() {
      try {
        setLoading(true);

        // Check if teacher has assigned classes
        if (user?.classIds?.length > 0) {
          console.log('🎓 Teacher has classIds:', user.classIds);

          // Fetch each assigned class using classIds
          const classPromises = user.classIds.map(classId =>
            classService.getClassById(classId)
          );

          const responses = await Promise.allSettled(classPromises);
          const teacherClasses = responses
            .filter(res => res.status === 'fulfilled' && res.value)
            .map(res => res.value);

          console.log(`✅ Loaded ${teacherClasses.length} classes for teacher:`, teacherClasses);

          if (mounted) {
            setClasses(teacherClasses);

            // Auto-select first class if available
            if (teacherClasses.length > 0) {
              setSelectedClassId(String(teacherClasses[0].id || teacherClasses[0].classId));
            }
          }
        } else {
          console.warn('⚠️ Teacher has no classIds assigned');
          if (mounted) {
            setClasses([]);
          }
        }
      } catch (error) {
        console.error('Error loading classes:', error);
        showError(t('failedToFetchClasses', 'Failed to fetch classes'));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadClasses();

    return () => {
      mounted = false;
    };
  }, [user, showError, t]);

  // Fetch students for selected class
  useEffect(() => {
    if (!selectedClassId || loading) return;

    let mounted = true;

    async function fetchStudentsData() {
      try {
        setStudentsLoading(true);

        // Get school ID first
        const accountData = await userService.getMyAccount();
        const schoolId = accountData?.school_id;

        if (!schoolId) {
          showError(t('failedToFetchSchoolId', 'Failed to get school information'));
          return;
        }

        // Fetch students for selected class
        const response = await studentService.getStudentsBySchoolClasses(schoolId, {
          limit: itemsPerPage,
          page: currentPage,
          classId: parseInt(selectedClassId)
        });

        if (response.success && response.data) {
          // Enrich students with QR codes
          const enrichedStudents = [];
          const qrData = [];

          for (const student of response.data) {
            try {
              const userId = student.userId || student.user?.id || student.id;

              if (!userId) {
                console.warn('Student has no user ID:', student);
                continue;
              }

              // Fetch full user data with QR code
              const userResponse = await userService.getUserByID(userId);
              const userData = userResponse?.data || userResponse;

              if (userData) {
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

                qrData.push({
                  userId: userId,
                  name: enrichedStudent.name,
                  username: enrichedStudent.username,
                  qrCode: userData.qr_code || null,
                  studentNumber: student.studentNumber,
                  email: enrichedStudent.email,
                  hasQrCode: !!userData.qr_code
                });
              }
            } catch (err) {
              console.warn(`Failed to fetch user data for student:`, err);
            }
          }

          if (mounted) {
            setStudents(enrichedStudents);
            setStudentQrCodes(qrData);

            if (response.pagination) {
              setTotalPages(response.pagination.pages || 1);
            } else {
              setTotalPages(1);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        showError(t('failedToLoadStudents', 'Failed to load students'));
      } finally {
        if (mounted) {
          setStudentsLoading(false);
        }
      }
    }

    fetchStudentsData();

    return () => {
      mounted = false;
    };
  }, [selectedClassId, currentPage, loading, showError, t]);

  // Download QR code
  const downloadQRCode = (qrCode) => {
    if (!qrCode.qrCode) {
      showError(t('noQRCodeAvailable', 'No QR code available for this student'));
      return;
    }

    const link = document.createElement('a');
    link.href = qrCode.qrCode;
    link.download = `${qrCode.name}_QR.png`;
    link.click();
  };

  // Get class options for dropdown
  const classOptions = classes.map(cls => ({
    value: String(cls.id || cls.classId),
    label: cls.name
  }));

  if (loading) {
    return <PageLoader message={t('loadingClasses', 'Loading classes...')} />;
  }

  return (
    <PageTransition className="flex-1 p-3 sm:p-4">
      <div className="p-4 sm:p-6">
        <FadeInSection>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <QrCode className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
              {t('QRCodeManangement', 'My Students QR Codes')}
            </h1>
            <p className="text-sm text-gray-500">
              {t('generateQRCodesForStudents', 'View and download QR codes for your students')}
            </p>
          </div>

          {/* Class Selector and View Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
            {/* Class Dropdown */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('selectClass', 'Select Class')} <span className="text-red-500">*</span>
              </label>
              {classOptions.length > 0 ? (
                <Dropdown
                  value={selectedClassId}
                  onValueChange={(classId) => {
                    setSelectedClassId(classId);
                    setCurrentPage(1); // Reset to first page
                  }}
                  options={classOptions}
                  placeholder={t('selectClass', 'Select class...')}
                />
              ) : (
                <div className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 text-center">
                  {t('noClassesAssigned', 'No classes assigned')}
                </div>
              )}
            </div>

            {/* View Toggle */}
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

          {/* QR Codes Display */}
          {studentsLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" variant="primary">
                {t('loadingStudents', 'Loading students...')}
              </LoadingSpinner>
            </div>
          ) : studentQrCodes.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('noStudents', 'No Students')}
              description={t('noStudentsInClass', 'No students found in this class')}
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
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  total={studentQrCodes.length}
                  limit={itemsPerPage}
                  onPageChange={setCurrentPage}
                  t={t}
                  className="border-t mt-6"
                />
              )}
            </>
          )}
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
