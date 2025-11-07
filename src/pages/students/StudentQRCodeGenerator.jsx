import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
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
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { Button } from '../../components/ui/button';
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
  const cardRefsRef = useRef({}); // Store refs to all card elements

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

  // Capture card element and download as image
  const downloadQRCode = async (qrCode, cardElement) => {
    try {
      startLoading('downloadCard', t('capturingCard', 'Capturing card...'));

      let elementToCapture = cardElement;
      let isTemporaryElement = false;

      // If cardElement is not provided (table view), create a temporary card element
      if (!cardElement) {
        // Create a temporary card element for table view
        const tempCard = document.createElement('div');
        tempCard.style.position = 'absolute';
        tempCard.style.left = '-9999px';
        tempCard.style.top = '-9999px';
        tempCard.style.width = '200px';
        tempCard.style.padding = '16px';
        tempCard.style.backgroundColor = '#ffffff';
        tempCard.style.border = '1px solid #e5e7eb';
        tempCard.style.borderRadius = '8px';
        tempCard.innerHTML = `
          <div style="display: flex; justify-content: center; margin-bottom: 12px;">
            <img src="${qrCode.qrCode}" alt="QR Code" style="width: 160px; height: 160px; border: 1px solid #d1d5db; border-radius: 4px;" />
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <p style="font-size: 14px; font-weight: 500; color: #111827; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${qrCode.name}
            </p>
            <p style="font-size: 12px; color: #6b7280; margin: 0;">
              ${qrCode.username}
            </p>
            <p style="font-size: 12px; color: #6b7280; margin: 0;">
              ${qrCode.studentNumber}
            </p>
          </div>
        `;
        document.body.appendChild(tempCard);
        elementToCapture = tempCard;
        isTemporaryElement = true;
      } else {
        // Clone the element to avoid modifying the original
        elementToCapture = cardElement.cloneNode(true);
      }

      // Remove any buttons from the captured element
      const buttons = elementToCapture.querySelectorAll('button');
      buttons.forEach(button => button.remove());

      // If it's from grid view, we need to append to body for html2canvas
      if (!isTemporaryElement) {
        document.body.appendChild(elementToCapture);
      }

      // Capture the card with html2canvas
      const canvas = await html2canvas(elementToCapture, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      // Remove temporary or cloned element
      document.body.removeChild(elementToCapture);

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${qrCode.name}_${qrCode.studentNumber}_QR_Card.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess(`${t('downloaded', 'Downloaded')}: ${qrCode.name}`);
    } catch (err) {
      console.error('Error downloading QR code card:', err);
      showError(t('failedToDownloadCard', 'Failed to download card'));
    } finally {
      stopLoading('downloadCard');
    }
  };

  const downloadAllQRCodes = async () => {
    if (qrCodes.length === 0) {
      showError(t('noQRCodesToDownload', 'No QR codes to download'));
      return;
    }

    try {
      startLoading('downloadAll', t('downloadingAllCards', 'Creating combined QR code image...'));

      // Create a container for all cards
      const containerDiv = document.createElement('div');
      containerDiv.style.position = 'absolute';
      containerDiv.style.left = '-9999px';
      containerDiv.style.top = '-9999px';
      containerDiv.style.padding = '20px';
      containerDiv.style.backgroundColor = '#ffffff';
      containerDiv.style.display = 'grid';
      containerDiv.style.gridTemplateColumns = 'repeat(4, 1fr)';
      containerDiv.style.gap = '16px';
      containerDiv.style.maxWidth = '1200px';

      // Create card elements for all QR codes
      for (const qrCode of qrCodes) {
        let cardElement = cardRefsRef.current[qrCode.userId];

        // If card element doesn't exist (table view), create a temporary one
        if (!cardElement) {
          const tempCard = document.createElement('div');
          tempCard.style.width = '200px';
          tempCard.style.padding = '16px';
          tempCard.style.backgroundColor = '#ffffff';
          tempCard.style.border = '1px solid #e5e7eb';
          tempCard.style.borderRadius = '8px';
          tempCard.innerHTML = `
            <div style="display: flex; justify-content: center; margin-bottom: 12px;">
              <img src="${qrCode.qrCode}" alt="QR Code" style="width: 160px; height: 160px; border: 1px solid #d1d5db; border-radius: 4px;" />
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <p style="font-size: 14px; font-weight: 500; color: #111827; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; word-break: break-word;">
                ${qrCode.name}
              </p>
              <p style="font-size: 12px; color: #6b7280; margin: 0;">
                ${qrCode.username}
              </p>
              <p style="font-size: 12px; color: #6b7280; margin: 0;">
                ${qrCode.studentNumber}
              </p>
            </div>
          `;
          cardElement = tempCard;
        } else {
          // Clone the card element to avoid modifying the original
          cardElement = cardElement.cloneNode(true);
          // Remove any buttons from the cloned card
          const buttons = cardElement.querySelectorAll('button');
          buttons.forEach(button => button.remove());
        }

        containerDiv.appendChild(cardElement);
      }

      document.body.appendChild(containerDiv);

      // Capture the entire container as a single image
      const canvas = await html2canvas(containerDiv, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1240 // Set consistent width for the capture
      });

      // Remove the temporary container
      document.body.removeChild(containerDiv);

      // Create download link for the combined image
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `QR_Codes_All_${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess(
        t('allCardsDownloaded', 'Successfully downloaded all {count} QR codes as a single image.').replace(
          '{count}',
          qrCodes.length
        )
      );
    } catch (err) {
      console.error('Error downloading all QR codes:', err);
      showError(t('failedToDownloadAllCards', 'Failed to download all QR codes'));
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
              <Button
                onClick={generateQRCodesForStudents}
                disabled={students.length === 0 || generating || selectedClass === 'all'}
                variant="primary"
                className="flex items-center gap-2"
                size="sm"
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
              </Button>

              {qrCodes.length > 0 && (
                <>
                  <Button
                    onClick={downloadAllQRCodes}
                    variant="success"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {t('downloadAll', 'Download All')}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setViewMode('grid')}
                      variant={viewMode === 'grid' ? 'primary' : 'outline'}
                      size="sm"
                      className="flex items-center gap-2"
                      title={t('gridView', 'Grid View')}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setViewMode('list')}
                      variant={viewMode === 'list' ? 'primary' : 'outline'}
                      size="sm"
                      className="flex items-center gap-2"
                      title={t('listView', 'List View')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
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
                        ref={(el) => {
                          if (el) {
                            cardRefsRef.current[qrCode.userId] = el;
                          }
                        }}
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
                          <Button
                            onClick={() => downloadQRCode(qrCode, cardRefsRef.current[qrCode.userId])}
                            variant="primary"
                            size="sm"
                            className="w-full mt-3 flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            {t('download', 'Download')}
                          </Button>
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
                              <Button
                                onClick={() => downloadQRCode(qrCode)}
                                variant="ghost"
                                size="icon"
                                title={t('download', 'Download')}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
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
