import { X, User, Mail, Phone, Calendar, MapPin, Heart, Ruler, Weight, Activity, Shield, Clock, Key, Hash, User2, BookOpen, Building, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../ui/Modal';
import { Badge } from '../ui/Badge';
import ProfileImage from '../ui/ProfileImage';
import { Button } from '../ui/Button';
import { formatDateKhmer, genderToKhmer } from '../../utils/formatters';
import { userService } from '../../utils/api/services/userService';
import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

/**
 * TeacherViewModal - Read-only modal to display teacher details
 */
export default function TeacherViewModal({ isOpen, onClose, teacher }) {
  const { t } = useLanguage();
  const { showError } = useToast();
  const [fullTeacherData, setFullTeacherData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch full teacher data when modal opens
  useEffect(() => {
    if (!isOpen || !teacher) {
      setFullTeacherData(null);
      return;
    }

    const fetchTeacherData = async () => {
      try {
        setLoading(true);
        const userId = teacher.userId || teacher.id;

        if (!userId) {
          console.warn('No user ID found for teacher:', teacher);
          setFullTeacherData(teacher);
          return;
        }

        console.log('Fetching full teacher data for userId:', userId);
        const response = await userService.getUserByID(userId);
        console.log('Full teacher data fetched:', response);

        // Handle different response formats
        if (response) {
          // If response has a data property, use it
          if (response.data) {
            console.log('Using response.data');
            setFullTeacherData(response.data);
          }
          // If response is the user object directly (no data wrapper)
          else if (response.id || response.username || response.first_name) {
            console.log('Using response directly as user data');
            setFullTeacherData(response);
          }
          // Fallback to provided data
          else {
            console.warn('Unexpected response format, using provided data');
            setFullTeacherData(teacher);
          }
        } else {
          console.warn('Empty response, using provided data');
          setFullTeacherData(teacher);
        }
      } catch (error) {
        console.error('Error fetching teacher data:', error);
        showError(t('failedToLoadTeacherDetails', 'Failed to load complete teacher details'));
        setFullTeacherData(teacher);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [isOpen, teacher, showError, t]);

  if (!isOpen) return null;

  // Use fullTeacherData if it's been loaded, otherwise use the provided teacher data
  const displayTeacher = fullTeacherData || teacher;
  if (!displayTeacher) return null;

  // Log the displayTeacher for debugging
  console.log('TeacherViewModal displayTeacher:', displayTeacher);
  console.log('displayTeacher.date_of_birth:', displayTeacher.date_of_birth);
  console.log('displayTeacher.gender:', displayTeacher.gender);
  console.log('displayTeacher.email:', displayTeacher.email);

  // Extract nested teacher data if it exists
  const teacherData = displayTeacher.teacher || displayTeacher;
  const schoolData = teacherData.school || displayTeacher.school;

  // Helper function to display N/A in Khmer
  const getEmptyDisplay = () => 'មិនមាន';

  // Helper function to format date in Khmer
  const formatDate = (dateString) => {
    if (!dateString) return getEmptyDisplay();
    try {
      return formatDateKhmer(dateString, 'short') || getEmptyDisplay();
    } catch (error) {
      console.error('Error formatting date:', error, 'dateString:', dateString);
      return dateString || getEmptyDisplay();
    }
  };

  // Helper function to display array values
  const displayArray = (arr) => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return getEmptyDisplay();
    return arr.join(', ');
  };

  // Helper function to check if personal information exists
  const hasPersonalInfo = () => {
    return !!(
      displayTeacher.first_name || displayTeacher.firstName ||
      displayTeacher.last_name || displayTeacher.lastName ||
      displayTeacher.date_of_birth || displayTeacher.dateOfBirth ||
      displayTeacher.gender ||
      displayTeacher.nationality ||
      displayTeacher.ethnic_group || displayTeacher.ethnicGroup
    );
  };

  // Helper function to check if account information exists
  const hasAccountInfo = () => {
    return !!(displayTeacher.username || displayTeacher.email || displayTeacher.phone);
  };

  // Check for incomplete information
  const checkIncompleteFields = () => {
    const missingFields = [];

    // Required personal information (support both snake_case and camelCase)
    if (!displayTeacher.first_name && !displayTeacher.firstName) missingFields.push(t('firstName', 'First Name'));
    if (!displayTeacher.last_name && !displayTeacher.lastName) missingFields.push(t('lastName', 'Last Name'));
    if (!displayTeacher.date_of_birth && !displayTeacher.dateOfBirth) missingFields.push(t('dateOfBirth', 'Date of Birth'));
    if (!displayTeacher.gender) missingFields.push(t('gender', 'Gender'));
    if (!displayTeacher.email) missingFields.push(t('email', 'Email'));
    if (!displayTeacher.phone) missingFields.push(t('phone', 'Phone'));
    if (!displayTeacher.nationality) missingFields.push(t('nationality', 'Nationality'));
    if (!displayTeacher.ethnic_group && !displayTeacher.ethnicGroup) missingFields.push(t('ethnicGroup', 'Ethnic Group'));

    // Employment information
    if (!teacherData.employment_type && !teacherData.employmentType) missingFields.push(t('employmentType', 'Employment Type'));
    if (!teacherData.hire_date && !teacherData.hireDate) missingFields.push(t('hireDate', 'Hire Date'));

    return missingFields;
  };

  const incompleteFields = checkIncompleteFields();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('teacherDetails', 'Teacher Details')}
      size="full"
      height='2xl'
      stickyFooter={true}
      footer={
        <div className="flex items-center justify-end">
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="min-w-[100px] sm:min-w-[120px] w-full sm:w-auto"
          >
            {t('close', 'Close')}
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" variant="primary">
            {t('loadingTeacherDetails', 'Loading teacher details...')}
          </LoadingSpinner>
        </div>
      ) : (
      <div className="space-y-4 sm:space-y-6">
        {/* Incomplete Information Warning */}
        {incompleteFields.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 mb-2">
                  {t('incompleteInformation', 'Incomplete Information')}
                </h4>
                <p className="text-sm text-amber-800 mb-2">
                  {t('pleaseCompleteFields', 'Please complete the following information:')}
                </p>
                <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
                  {incompleteFields.map((field, index) => (
                    <li key={index}>{field}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Personal Information */}
        {hasPersonalInfo() && (
        <div className="border-t pt-4">
          <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
            <div className='bg-blue-500 p-2 rounded-sm'>
              <User2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="ml-2">
              {t('personalInformation', 'Personal Information')}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <InfoItem
              icon={User}
              label={t('firstName', 'First Name')}
              value={(displayTeacher.firstName || displayTeacher.first_name) || getEmptyDisplay()}
            />
            <InfoItem
              icon={User}
              label={t('lastName', 'Last Name')}
              value={(displayTeacher.lastName || displayTeacher.last_name) || getEmptyDisplay()}
            />
            <InfoItem
              icon={Calendar}
              label={t('dateOfBirth', 'Date of Birth')}
              value={formatDate(displayTeacher.date_of_birth)}
            />
            <InfoItem
              icon={User}
              label={t('gender', 'Gender')}
              value={displayTeacher.gender ? genderToKhmer(displayTeacher.gender) : getEmptyDisplay()}
            />
            <InfoItem
              icon={MapPin}
              label={t('nationality', 'Nationality')}
              value={displayTeacher.nationality || getEmptyDisplay()}
            />
            <InfoItem
              icon={User}
              label={t('ethnicGroup', 'Ethnic Group')}
              value={displayTeacher.ethnic_group || getEmptyDisplay()}
            />
          </div>
        </div>
        )}

        {/* Account Information */}
        {hasAccountInfo() && (
        <div className="border-t pt-4">
          <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
            <div className='bg-blue-500 p-2 rounded-sm'>
              <User2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="ml-2">
              {t('accountInformation', 'Account Information')}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <InfoItem
              label={t('username', 'Username')}
              value={displayTeacher.username || getEmptyDisplay()}
            />
            <InfoItem
              label={t('email', 'Email')}
              value={displayTeacher.email || getEmptyDisplay()}
            />
            <InfoItem
              label={t('phone', 'Phone')}
              value={displayTeacher.phone || getEmptyDisplay()}
            />
          </div>
        </div>
        )}

        {/* Employment Information */}
        <div className="border-t pt-4">
          <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
            <div className='bg-blue-500 p-2 rounded-sm'>
              <Building className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="ml-2">
              {t('employmentInformation', 'Employment Information')}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <InfoItem
              icon={Hash}
              label={t('teacherNumber', 'Teacher Number')}
              value={(teacherData.teacher_number || teacherData.teacherNumber) || getEmptyDisplay()}
            />
            <InfoItem
              icon={BookOpen}
              label={t('gradeLevel', 'Grade Level')}
              value={teacherData.gradeLevel ? `${t('gradeLevel', 'GradeLevel')} ${teacherData.gradeLevel}` : getEmptyDisplay()}
            />
            <InfoItem
              icon={Building}
              label={t('employmentType', 'Employment Type')}
              value={(teacherData.employment_type || teacherData.employmentType) || getEmptyDisplay()}
            />
            <InfoItem
              icon={Calendar}
              label={t('hireDate', 'Hire Date')}
              value={formatDate(teacherData.hire_date || teacherData.hireDate)}
            />
            <InfoItem
              icon={Shield}
              label={t('status', 'Status')}
              value={
                <Badge
                  color={teacherData.status === 'ACTIVE' ? 'green' : 'red'}
                  variant="filled"
                >
                  {teacherData.status || 'Unknown'}
                </Badge>
              }
            />
          </div>
        </div>

        {/* Health Information */}
        {(displayTeacher.weight_kg || displayTeacher.weight || displayTeacher.height_cm || displayTeacher.height) && (
          <div className="border-t pt-4">
            <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
              <div className='bg-blue-500 p-2 rounded-sm'>
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="ml-2">
                {t('healthInformation', 'Health Information')}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <InfoItem
                icon={Weight}
                label={t('weight', 'Weight (kg)')}
                value={(displayTeacher.weight_kg || displayTeacher.weight) ? `${displayTeacher.weight_kg || displayTeacher.weight} kg` : getEmptyDisplay()}
              />
              <InfoItem
                icon={Ruler}
                label={t('height', 'Height (cm)')}
                value={(displayTeacher.height_cm || displayTeacher.height) ? `${displayTeacher.height_cm || displayTeacher.height} cm` : getEmptyDisplay()}
              />
              {(() => {
                const bmiSource = displayTeacher.bmi;
                const rawBmi =
                  bmiSource && typeof bmiSource === 'object'
                    ? bmiSource.value
                    : bmiSource;
                const parsedBmi = rawBmi !== undefined && rawBmi !== null ? parseFloat(rawBmi) : NaN;
                const hasValidBmi = !Number.isNaN(parsedBmi);

                return (
                  <InfoItem
                    icon={Activity}
                    label={t('bmi', 'BMI')}
                    value={hasValidBmi ? parsedBmi.toFixed(1) : getEmptyDisplay()}
                  />
                );
              })()}
            </div>
          </div>
        )}

        {/* Classes Information */}
        {displayTeacher.classes && displayTeacher.classes.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
              <div className='bg-blue-500 p-2 rounded-sm'>
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="ml-2">
                {t('classesTeaching', 'Classes Teaching')}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {displayTeacher.classes.map((classItem, index) => (
                <Badge
                  key={classItem.classId || index}
                  color="blue"
                  variant="filled"
                  size="sm"
                >
                  {classItem.name || `${classItem.gradeLevel}${classItem.section}`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Accessibility Information */}
        {displayTeacher.accessibility && displayTeacher.accessibility.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
              <div className='bg-blue-500 p-2 rounded-sm'>
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="ml-2">
                {t('accessibility', 'Accessibility Needs')}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {displayTeacher.accessibility.map((item, index) => (
                <Badge key={index} color="orange" variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* School Information */}
        {(teacherData.schoolName || schoolData?.name) && (
          <div className="border-t pt-4">
            <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
              <div className='bg-blue-500 p-2 rounded-sm'>
                <Building className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="ml-2">
                {t('schoolInformation', 'School Information')}
              </div>
            </div>
            <InfoItem
              icon={Building}
              label={t('school', 'School')}
              value={teacherData.schoolName || schoolData?.name || getEmptyDisplay()}
            />
          </div>
        )}

      </div>
      )}
    </Modal>
  );
}

/**
 * InfoItem Component - Displays a label-value pair
 */
function InfoItem({ icon: Icon, label, value }) {
  // Convert N/A to Khmer "មិនមាន"
  const displayValue = value === 'N/A' ? 'មិនមាន' : value;

  return (
    <div className="flex items-start space-x-2">
      <div className="flex-1 min-w-0 bg-gray-50 border-gray-100 border-2 p-4 rounded-md">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 break-words">{displayValue}</p>
      </div>
    </div>
  );
}
