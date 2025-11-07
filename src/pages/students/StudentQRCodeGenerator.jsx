import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Download,
  Loader,
  AlertCircle,
  Grid3X3,
  List
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoading } from '../../contexts/LoadingContext';
import { useToast } from '../../contexts/ToastContext';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import Badge from '../../components/ui/Badge';
import Dropdown from '../../components/ui/Dropdown';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { classService } from '../../utils/api/services/classService';
import { studentService } from '../../utils/api/services/studentService';
import { API_BASE_URL } from '../../utils/api/config';

/**
 * StudentQRCodeGenerator Component
 * Generates QR codes for students filtered by grade level and class
 */
export default function StudentQRCodeGenerator() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError } = useErrorHandler();

  // State
  const [schoolId, setSchoolId] = useState(null);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [classes, setClasses] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

  const generatingRef = useRef(false);

  // Get authenticated user data
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        const currentSchoolId = parsedUser?.school?.id || parsedUser?.schoolId;
        if (currentSchoolId) {
          setSchoolId(currentSchoolId);
        }
      }
    } catch (err) {
      console.error('Error parsing user data:', err);
      handleError(err);
    }
  }, [handleError]);

  // Fetch classes when school ID or grade level changes
  useEffect(() => {
    if (schoolId) {
      (async () => {
        try {
          setLoading(true);
          clearError();

          // Build query parameters - pass gradeLevel to API for server-side filtering
          const queryParams = {
            limit: 100
          };
          if (selectedGradeLevel && selectedGradeLevel !== 'all') {
            queryParams.gradeLevel = selectedGradeLevel;
          }

          console.log('📚 Fetching classes for school:', schoolId, 'with gradeLevel:', selectedGradeLevel);
          const response = await classService.getBySchool(schoolId, queryParams);

          if (response.success && response.classes) {
            setAllClasses(response.classes);
            setClasses([{ id: '', name: t('allClasses', 'All Classes') }, ...response.classes]);
            console.log('📚 Fetched', response.classes.length, 'classes');
          }
        } catch (err) {
          console.error('Error fetching classes:', err);
          handleError(err, {
            toastMessage: t('failedToLoadClasses', 'Failed to load classes')
          });
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [schoolId, selectedGradeLevel, t, handleError, clearError]);

  // Reset class selection when grade level changes
  useEffect(() => {
    setSelectedClass('all');
  }, [selectedGradeLevel]);

  // Fetch students when class selection changes
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true);
        setQrCodes([]);
        clearError();

        startLoading('fetchStudents', t('loadingStudents', 'Loading students...'));

        // Fetch students for the selected class using school classes endpoint
        const response = await studentService.getStudentsBySchoolClasses(schoolId, {
          page: 1,
          limit: 100, // Get more students for bulk QR generation
          classId: selectedClass !== 'all' ? parseInt(selectedClass) : undefined
        });

        if (response.success && response.data) {
          console.log('👥 Fetched', response.data.length, 'students');

          // Enrich students with full user profile information to get QR codes
          console.log('🔄 Enriching students with full user profile data...');
          const enrichedStudents = await studentService.utils.enrichStudentsWithUserProfiles(response.data);
          setStudents(enrichedStudents);

          // Auto-log QR code status for debugging
          console.log('🔍 QR Code Status Debug:');
          studentService.utils.debugStudentListQRData(enrichedStudents);

          // Extract and display existing QR codes from enriched students
          const existingQRCodes = [];
          enrichedStudents.forEach((student, idx) => {
            const qrData = studentService.utils.extractQRCodeFromProfile(student);
            if (qrData) {
              // Extract the correct student number from nested user profile
              // The user profile has nested student.student.studentNumber with the actual student number (e.g., "STU-2000")
              // Only use the actual student number, don't fall back to other values
              const actualStudentNumber = student.userProfile?.student?.studentNumber || '';

              console.log(`🔍 Student #${idx} data structure:`, {
                studentNumber: student.studentNumber,
                studentId: student.studentId,
                userProfileStudent: student.userProfile?.student?.studentNumber,
                actualStudentNumber: actualStudentNumber,
                name: student.name,
                allKeys: Object.keys(student).slice(0, 20)
              });

              const qrCodeObj = {
                userId: qrData.userId,
                studentNumber: actualStudentNumber,
                name: student.name,
                username: student.username,
                email: student.email,
                classId: selectedClass,
                className: allClasses.find(c => c.id === parseInt(selectedClass))?.name || 'Unknown',
                qrCode: qrData.qr_code, // This is already a base64 image from API
                qrToken: qrData.qr_token,
                qrGeneratedAt: qrData.qr_generated_at,
                isExisting: true // Mark as existing QR code from API
              };

              console.log(`📦 QR Code object being added:`, {
                studentNumber: qrCodeObj.studentNumber,
                name: qrCodeObj.name
              });

              existingQRCodes.push(qrCodeObj);
            }
          });
          if (existingQRCodes.length > 0) {
            console.log(`✅ Found ${existingQRCodes.length} existing QR codes from API`);
            console.log(`📊 First QR Code object:`, existingQRCodes[0]);
            setQrCodes(existingQRCodes);
          }
        }
      } catch (err) {
        console.error('Error fetching students:', err);
        handleError(err, {
          toastMessage: t('failedToLoadStudents', 'Failed to load students')
        });
        setStudents([]);
      } finally {
        setLoading(false);
        stopLoading('fetchStudents');
      }
    };

    if (schoolId && selectedClass !== 'all') {
      loadStudents();
    } else if (selectedClass === 'all') {
      setStudents([]);
      setQrCodes([]);
    }
  }, [selectedClass, schoolId, t, handleError, clearError, startLoading, stopLoading, allClasses]);

  const generateQRCodesForStudents = async () => {
    if (students.length === 0) {
      showError(t('noStudentsSelected', 'No students found for the selected class'));
      return;
    }

    try {
      setGenerating(true);
      generatingRef.current = true;
      clearError();
      setGenerationProgress({ current: 0, total: students.length });

      startLoading('generateQR', t('generatingQRCodes', 'Generating QR codes...'));

      const qrData = [];
      const DELAY_BETWEEN_REQUESTS = 500; // 500ms delay between each request to avoid overwhelming the API

      // Process students one by one with queue
      for (let i = 0; i < students.length; i++) {
        if (!generatingRef.current) break; // Allow cancellation

        const student = students[i];

        try {
          // Prepare QR payload with only username and password
          const qrPayload = {
            username: student.username,
            password: 'student@123' // Default student password
          };

          console.log(`📤 Posting QR code request for ${qrPayload.username}:`, qrPayload);

          // Send request to generate QR code on backend
          const response = await fetch(`${API_BASE_URL}/users/generate-qr-code`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify(qrPayload)
          });

          if (!response.ok) {
            throw new Error(`Failed to generate QR code: ${response.statusText}`);
          }

          const result = await response.json();
          console.log(`✅ Generated QR code for ${qrPayload.username}:`, result);

          // Extract the correct student number from nested user profile
          // Only use the actual student number, don't fall back to other values
          const actualStudentNumber = student.userProfile?.student?.studentNumber || '';

          qrData.push({
            userId: student.userId || student.id,
            studentNumber: actualStudentNumber,
            name: student.name,
            username: qrPayload.username,
            email: student.email,
            classId: selectedClass,
            className: allClasses.find(c => c.id === parseInt(selectedClass))?.name || 'Unknown',
            qrCode: result.qrCode || result.qr_code, // Handle both naming conventions
            qrToken: result.qrToken || result.qr_token,
            qrGeneratedAt: result.qrGeneratedAt || result.qr_generated_at,
            qrPayload: qrPayload
          });

          // Update loading progress
          const currentIndex = i + 1;
          const progress = Math.round((currentIndex / students.length) * 100);
          console.log(`Generated QR code ${currentIndex}/${students.length} (${progress}%)`);

          // Update state with generated QRs and progress
          setQrCodes([...qrData]);
          setGenerationProgress({ current: currentIndex, total: students.length });

          // Add delay between requests to prevent overwhelming the API
          // Skip delay on last item
          if (i < students.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
          }
        } catch (err) {
          console.error(`Error generating QR code for student ${student.id}:`, err);
        }
      }

      setQrCodes(qrData);
      showSuccess(
        t('qrCodesGenerated', 'QR codes generated successfully for {count} students').replace(
          '{count}',
          qrData.length
        )
      );

      generatingRef.current = false;
    } catch (err) {
      console.error('Error generating QR codes:', err);
      handleError(err, {
        toastMessage: t('failedToGenerateQRCodes', 'Failed to generate QR codes')
      });
      generatingRef.current = false;
    } finally {
      setGenerating(false);
      stopLoading('generateQR');
    }
  };

  const downloadQRCode = (qrCode) => {
    const link = document.createElement('a');
    link.href = qrCode.qrCode;
    link.download = `${qrCode.name}_${qrCode.studentNumber}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess(`${t('downloaded', 'Downloaded')}: ${qrCode.name}`);
  };

  const downloadAllQRCodes = async () => {
    if (qrCodes.length === 0) {
      showError(t('noQRCodesToDownload', 'No QR codes to download'));
      return;
    }

    try {
      startLoading('downloadAll', t('preparingDownload', 'Preparing download...'));

      // Create a ZIP file with all QR codes (using a simple approach)
      // For now, we'll create a JSON file with all QR code data
      const qrDataForExport = qrCodes.map(qr => ({
        studentNumber: qr.studentNumber,
        name: qr.name,
        username: qr.username,
        email: qr.email,
        className: qr.className,
        qrCodeBase64: qr.qrCode
      }));

      const dataStr = JSON.stringify(qrDataForExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student_qr_codes_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess(t('qrCodesExported', 'QR codes exported successfully'));
    } catch (err) {
      console.error('Error downloading QR codes:', err);
      showError(t('failedToExport', 'Failed to export QR codes'));
    } finally {
      stopLoading('downloadAll');
    }
  };

  // Get grade level options
  const getGradeLevelOptions = () => {
    return [
      { value: 'all', label: t('allGradeLevels', 'All Grade Levels') },
      ...Array.from([1, 2, 3, 4, 5, 6]).map(level => ({
        value: level,
        label: t(`Grade ${level}`, `Grade ${level}`)
      }))
    ];
  };

  // Get class options
  const getClassOptions = () => {
    return classes.map(cls => ({
      value: cls.id?.toString() || '',
      label: cls.name || 'Unknown Class'
    }));
  };

  // Show error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => {
          clearError();
          setSelectedClass('all');
        }}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Show initial loading state
  if (loading && students.length === 0 && qrCodes.length === 0) {
    return (
      <PageLoader
        message={t('loadingStudents', 'Loading students...')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  return (
    <PageTransition className="flex-1">
      <div className="p-3 sm:p-4">
        {/* Header */}
        <FadeInSection>
          <div className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <QrCode className="h-8 w-8 text-blue-600" />
                  {t('studentQRCodeGenerator', 'Student QR Code Generator')}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {t('generateQRCodesForStudents', 'Generate and download QR codes for students by grade level and class')}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
              {/* Grade Level Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('selectGradeLevel', 'Grade Level')}
                </label>
                <Dropdown
                  value={selectedGradeLevel}
                  onValueChange={setSelectedGradeLevel}
                  options={getGradeLevelOptions()}
                  placeholder={t('chooseGradeLevel', 'Choose grade level...')}
                  minWidth="min-w-full"
                  triggerClassName="w-full"
                />
              </div>

              {/* Class Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('selectClass', 'Class')}
                </label>
                <Dropdown
                  value={selectedClass}
                  onValueChange={setSelectedClass}
                  options={getClassOptions()}
                  placeholder={t('selectClass', 'Select class...')}
                  minWidth="min-w-full"
                  triggerClassName="w-full"
                  maxHeight="max-h-56"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <button
                onClick={generateQRCodesForStudents}
                disabled={students.length === 0 || generating || selectedClass === 'all'}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    {t('generatingQRCodes', 'Generating...')}
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4" />
                    {t('generateQRCodes', 'Generate QR Codes')}
                  </>
                )}
              </button>

              {qrCodes.length > 0 && (
                <>
                  <button
                    onClick={downloadAllQRCodes}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    {t('downloadAll', 'Download All')}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-2 rounded-lg ${
                        viewMode === 'grid'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      title={t('gridView', 'Grid View')}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-2 rounded-lg ${
                        viewMode === 'list'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      title={t('listView', 'List View')}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Generation Progress Bar */}
            {generating && generationProgress.total > 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-blue-900">
                    {t('generatingProgress', 'Generating QR codes...')}
                  </p>
                  <p className="text-sm font-semibold text-blue-900">
                    {generationProgress.current}/{generationProgress.total}
                  </p>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(generationProgress.current / generationProgress.total) * 100}%`
                    }}
                  ></div>
                </div>
                <p className="mt-2 text-xs text-blue-700">
                  {Math.round((generationProgress.current / generationProgress.total) * 100)}% Complete
                </p>
              </div>
            )}

            {/* No class selected message */}
            {selectedClass === 'all' && students.length === 0 && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-700">
                  {t('selectClassToGenerate', 'Please select a specific class to generate QR codes')}
                </p>
              </div>
            )}

            {/* QR Codes Display */}
            {qrCodes.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('generatedQRCodes', 'Generated QR Codes')} ({qrCodes.length})
                </h2>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {qrCodes.map((qrCode, index) => (
                      <div
                        key={index}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex justify-center mb-3">
                          <img
                            src={qrCode.qrCode}
                            alt={`QR Code for ${qrCode.name}`}
                            className="w-40 h-40 border border-gray-300 rounded"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {qrCode.name}
                          </p>
                          <p className="text-xs text-gray-500">{qrCode.username}</p>
                          <Badge color="blue" variant="outline" size="sm" className="text-xs">
                            {qrCode.studentNumber}
                          </Badge>
                          <button
                            onClick={() => downloadQRCode(qrCode)}
                            className="w-full mt-3 px-2 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            {t('download', 'Download')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            {t('name', 'Name')}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            {t('username', 'Username')}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            {t('studentNumber', 'Student Number')}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            {t('email', 'Email')}
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                            {t('actions', 'Actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {qrCodes.map((qrCode, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{qrCode.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{qrCode.username}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{qrCode.studentNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{qrCode.email}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => downloadQRCode(qrCode)}
                                className="text-blue-600 hover:text-blue-900"
                                title={t('download', 'Download')}
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
