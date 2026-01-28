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
import DownloadOptionsModal from '../../components/qr-code/DownloadOptionsModal';
import { downloadQRCodesQueued, downloadQRCodesAsPDF } from '../../utils/qrCodeDownloadUtils';
import { classService } from '../../utils/api/services/classService';
import { studentService } from '../../utils/api/services/studentService';
import { userService } from '../../utils/api/services/userService';
import { teacherService } from '../../utils/api/services/teacherService';
import { getFullName } from '../../utils/usernameUtils';
import { formatClassIdentifier } from '../../utils/helpers';
import { createQRCodeDownloadCard } from '../../components/qr-code/QRCodeDownloadCard';

export default function TeacherQRCodeManagement({ user }) {
  const { t } = useLanguage();
  const { showError, showSuccess } = useToast();

  // Get teacher ID for API calls
  const teacherId = user?.teacherId || user?.id;
  
  // Get school ID from user data instead of API call
  const schoolId = user?.school_id || user?.schoolId;
  const schoolNameValue = user?.school?.name || user?.schoolName;

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

  const cardRefsRef = useRef({});
  const [schoolName, setSchoolName] = useState(schoolNameValue);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [pageLimit, setPageLimit] = useState(8);
  const [isLoadingAllStudents, setIsLoadingAllStudents] = useState(false);

  // Load teacher's classes on mount
  useEffect(() => {
    let mounted = true;

    async function loadClasses() {
      try {
        setLoading(true);

        console.log('🔍 Fetching teacher classes for teacherId:', teacherId);

        // Fetch teacher classes using teacherService
        const response = await teacherService.getTeacherClasses(teacherId);

        console.log('📋 Teacher classes response:', response);

        if (response.success && response.data) {
          const teacherClasses = response.data || [];

          console.log(`✅ Loaded ${teacherClasses.length} classes for teacher:`, teacherClasses);

          if (mounted) {
            setClasses(teacherClasses);

            // Auto-select first class if available
            if (teacherClasses.length > 0) {
              const firstClassId = teacherClasses[0].classId || teacherClasses[0].id;
              setSelectedClassId(String(firstClassId));
            }
          }
        } else {
          console.warn('⚠️ Failed to fetch teacher classes');
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
  }, [teacherId, showError, t]);

  // Fetch students for selected class
  useEffect(() => {
    if (!selectedClassId || loading) return;

    let mounted = true;

    async function fetchStudentsData() {
      try {
        setStudentsLoading(true);

        // Use school ID from user data instead of API call
        if (!schoolId) {
          showError(t('failedToFetchSchoolId', 'Failed to get school information'));
          return;
        }

        if (mounted && schoolNameValue) {
          setSchoolName(schoolNameValue);
        }

        // Fetch students for selected class
        const response = await studentService.getStudentsBySchoolClasses(schoolId, {
          limit: pageLimit,
          page: currentPage,
          classId: parseInt(selectedClassId)
        });

        if (response.success && response.data) {
          // Enrich students with QR codes from optimized endpoint
          const enrichedStudents = [];
          const qrData = [];

          for (const student of response.data) {
            try {
              const userId = student.userId || student.user?.id || student.id;

              if (!userId) {
                console.warn('Student has no user ID:', student);
                continue;
              }

              // Fetch only QR code data using optimized endpoint
              const qrCodeResponse = await userService.getQRCodeByUserId(userId);
              const qrCodeData = qrCodeResponse?.data || qrCodeResponse;

              if (qrCodeData) {
                const enrichedStudent = {
                  ...student,
                  qrCode: qrCodeData.qrCode,
                  hasQrCode: qrCodeData.hasQrCode
                };

                enrichedStudents.push(enrichedStudent);

                qrData.push({
                  userId: userId,
                  name: getFullName(student) || student.username || `Student ${userId}`,
                  username: student.username,
                  qrCode: qrCodeData.qrCode || null,
                  studentNumber: student.studentNumber,
                  email: student.email,
                  hasQrCode: qrCodeData.hasQrCode,
                  schoolName: schoolName,
                  role: t('student', 'Student'),
                  class: {
                    classId: student.class?.id || student.class?.classId,
                    name: student.class?.name || null,
                    gradeLevel: student.class?.gradeLevel,
                    section: student.class?.section
                  },
                  className: student.class?.name || null // Legacy field for backward compatibility
                });
              }
            } catch (err) {
              console.warn(`Failed to fetch QR code data for student ${student.userId}:`, err);
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
  }, [selectedClassId, currentPage, loading, showError, t, pageLimit, schoolId, schoolNameValue]);

  // Download entire card as image
  const downloadQRCode = async (qrCode, _cardRef, cardType = 'student') => {
    try {
      // Dynamically import html2canvas
      const { default: html2canvas } = await import('html2canvas');

      // Always create a professional card for download (ignore cardRef from grid view)
      // This ensures both grid and list views download the same styled card
      const element = createQRCodeDownloadCard(qrCode, cardType, t); // Use passed cardType for styling
      document.body.appendChild(element);

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture the card as canvas
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: true
      });

      // Remove temporary element
      document.body.removeChild(element);

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${qrCode.name}_QR_Card.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (error) {
      console.error('Error downloading card:', error);
      // Fallback: download just the QR code image
      if (qrCode.qrCode) {
        const link = document.createElement('a');
        link.href = qrCode.qrCode.startsWith('/') || qrCode.qrCode.startsWith('http')
          ? qrCode.qrCode
          : `/api/files/${qrCode.qrCode}`;
        link.download = `${qrCode.name}_QR.png`;
        link.click();
      } else {
        showError(t('noQRCodeAvailable', 'No QR code available for this student'));
      }
    }
  };

  // Get class options for dropdown (Kindergarten-aware formatting)
  const classOptions = classes.map(cls => {
    const rawGradeLevel =
      typeof cls.gradeLevel !== 'undefined' && cls.gradeLevel !== null
        ? String(cls.gradeLevel)
        : '';

    const displayGradeLevel =
      rawGradeLevel === '0'
        ? t('grade0', 'Kindergarten')
        : rawGradeLevel;

    return {
      value: String(cls.id || cls.classId),
      label: `${t('class') || 'Class'} ${formatClassIdentifier(displayGradeLevel, cls.section)}`
    };
  });

  // Fetch ALL students from the selected class (for export)
  const fetchAllStudentsForExport = async () => {
    try {
      setIsLoadingAllStudents(true);
      
      // Use school ID from user data instead of API call
      if (!schoolId) {
        showError(t('failedToFetchSchoolId', 'Failed to get school information'));
        return [];
      }

      let allStudents = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await studentService.getStudentsBySchoolClasses(schoolId, {
          limit: 100, // Fetch 100 at a time for efficiency
          page: page,
          classId: parseInt(selectedClassId)
        });

        if (!response.success || !response.data || response.data.length === 0) {
          hasMore = false;
          break;
        }

        // Enrich each student with QR code data from optimized endpoint
        for (const student of response.data) {
          try {
            const userId = student.userId || student.user?.id || student.id;
            if (!userId) continue;

            const qrCodeResponse = await userService.getQRCodeByUserId(userId);
            const qrCodeData = qrCodeResponse?.data || qrCodeResponse;

            if (qrCodeData) {
              allStudents.push({
                userId: userId,
                name: getFullName(student) || student.username || `Student ${userId}`,
                username: student.username,
                qrCode: qrCodeData.qrCode || null,
                studentNumber: student.studentNumber,
                email: student.email,
                hasQrCode: qrCodeData.hasQrCode,
                schoolName: schoolName,
                role: t('student', 'Student'),
                class: {
                  classId: student.class?.id || student.class?.classId,
                  name: student.class?.name || null,
                  gradeLevel: student.class?.gradeLevel,
                  section: student.class?.section
                },
                className: student.class?.name || null
              });
            }
          } catch (err) {
            console.warn(`Failed to fetch QR code data for student ${student.userId}:`, err);
          }
        }

        // Check if there are more pages
        if (response.pagination && response.pagination.pages) {
          hasMore = page < response.pagination.pages;
        } else {
          hasMore = response.data.length === 100;
        }

        page++;
      }

      return allStudents;
    } catch (error) {
      console.error('Error fetching all students:', error);
      showError(t('failedToLoadStudents', 'Failed to load students'));
      return [];
    } finally {
      setIsLoadingAllStudents(false);
    }
  };

  // Download handlers for new modal
  const handleDownloadCurrentPage = async () => {
    for (const qrCode of studentQrCodes) {
      await downloadQRCode(qrCode, null, 'student');
      // Add delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const handleDownloadAllQueued = async () => {
    const allStudents = await fetchAllStudentsForExport();
    if (allStudents.length === 0) {
      showError(t('noStudentsToExport', 'No students to export'));
      return;
    }

    await downloadQRCodesQueued(
      allStudents,
      'student',
      t,
      (current, total) => setDownloadProgress(Math.round((current / total) * 100)),
      showSuccess,
      showError
    );
  };

  const handleDownloadAllPDF = async () => {
    const allStudents = await fetchAllStudentsForExport();
    if (allStudents.length === 0) {
      showError(t('noStudentsToExport', 'No students to export'));
      return;
    }

    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (selectedClass) {
      // Convert grade level 0 to Kindergarten display (same as class filter)
      const rawGradeLevel = typeof selectedClass.gradeLevel !== 'undefined' && selectedClass.gradeLevel !== null
        ? String(selectedClass.gradeLevel)
        : '';
      const displayGradeLevel = rawGradeLevel === '0'
        ? t('grade0', 'Kindergarten')
        : rawGradeLevel;
      const classIdentifier = formatClassIdentifier(displayGradeLevel, selectedClass.section);
      const className = `ថ្នាក់_${classIdentifier}`;
      await downloadQRCodesAsPDF(allStudents, 'student', t, showSuccess, showError, className);
    } else {
      await downloadQRCodesAsPDF(allStudents, 'student', t, showSuccess, showError, 'QR_Codes');
    }
  };

  if (loading) {
    return <PageLoader message={t('loadingClasses', 'Loading classes...')} />;
  }

  return (
    <PageTransition className="flex-1 p-3 sm:p-4">
      <div className="p-4 sm:p-6">
        <FadeInSection>
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
                <QrCode className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
                {t('QRCodeManangement', 'My Students QR Codes')}
              </h1>
              <p className="text-sm text-gray-500">
                {t('generateQRCodesForStudents', 'View and download QR codes for your students')}
              </p>
            </div>
            {studentQrCodes.length > 0 && (
              <Button
                onClick={() => setShowDownloadModal(true)}
                variant="primary"
                size="sm"
                className="flex items-center gap-2 flex-shrink-0"
              >
                <Download className="h-4 w-4" />
                {t('downloadAll', 'Download All')}
              </Button>
            )}
          </div>

          {/* Class Selector, Limit Selector and View Toggle */}
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

            {/* Limit Selector */}
            <div className="flex-1 sm:flex-none">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('itemsPerPage', 'Items per page')}
              </label>
              <Dropdown
                value={String(pageLimit)}
                onValueChange={(value) => {
                  setPageLimit(parseInt(value));
                  setCurrentPage(1); // Reset to first page
                }}
                options={[
                  { value: '8', label: '8' },
                  { value: '12', label: '12' },
                  { value: '16', label: '16' },
                  { value: '20', label: '20' }
                ]}
                placeholder={t('selectLimit', 'Select limit...')}
              />
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
                cardType="student"
              />
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  total={studentQrCodes.length}
                  limit={pageLimit}
                  onPageChange={setCurrentPage}
                  t={t}
                  className="border-t mt-6"
                />
              )}
            </>
          )}
        </FadeInSection>

        {/* Download Options Modal */}
        <DownloadOptionsModal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          qrCodes={studentQrCodes}
          cardType="student"
          t={t}
          onDownloadQueued={handleDownloadAllQueued}
          onDownloadPDF={handleDownloadAllPDF}
          onDownloadSingle={handleDownloadCurrentPage}
        />
      </div>
    </PageTransition>
  );
}
