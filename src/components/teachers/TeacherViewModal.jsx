import { X, User, Mail, Phone, Calendar, MapPin, Heart, Ruler, Weight, Activity, Shield, Clock, Key, Hash, User2, BookOpen, Building, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import Modal from '../ui/Modal';
import { Badge } from '../ui/Badge';
import ProfileImage from '../ui/ProfileImage';
import { Button } from '../ui/Button';
import { formatDateKhmer, genderToKhmer } from '../../utils/formatters';

/**
 * TeacherViewModal - Read-only modal to display teacher details
 */
export default function TeacherViewModal({ isOpen, onClose, teacher }) {
  const { t } = useLanguage();

  if (!teacher) return null;

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

  // Check for incomplete information
  const checkIncompleteFields = () => {
    const missingFields = [];

    // Required personal information
    if (!teacher.dateOfBirth && !teacher.date_of_birth) missingFields.push(t('dateOfBirth', 'Date of Birth'));
    if (!teacher.gender) missingFields.push(t('gender', 'Gender'));
    if (!teacher.email) missingFields.push(t('email', 'Email'));
    if (!teacher.phone) missingFields.push(t('phone', 'Phone'));
    if (!teacher.nationality) missingFields.push(t('nationality', 'Nationality'));
    if (!teacher.ethnic_group && !teacher.ethnicGroup) missingFields.push(t('ethnicGroup', 'Ethnic Group'));

    // Employment information
    if (!teacher.employment_type && !teacher.employmentType) missingFields.push(t('employmentType', 'Employment Type'));
    if (!teacher.hire_date && !teacher.hireDate) missingFields.push(t('hireDate', 'Hire Date'));

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
        <div className="border-t pt-4">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">
            <User2 className="inline w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            {t('personalInformation', 'Personal Information')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <InfoItem
              icon={User}
              label={t('firstName', 'First Name')}
              value={(teacher.firstName || teacher.first_name) || getEmptyDisplay()}
            />
            <InfoItem
              icon={User}
              label={t('lastName', 'Last Name')}
              value={(teacher.lastName || teacher.last_name) || getEmptyDisplay()}
            />
            <InfoItem
              icon={User}
              label={t('username', 'Username')}
              value={teacher.username || getEmptyDisplay()}
            />
            <InfoItem
              icon={Calendar}
              label={t('dateOfBirth', 'Date of Birth')}
              value={formatDate(teacher.dateOfBirth || teacher.date_of_birth)}
            />
            <InfoItem
              icon={User}
              label={t('gender', 'Gender')}
              value={genderToKhmer(teacher.gender) || getEmptyDisplay()}
            />
            <InfoItem
              icon={Mail}
              label={t('email', 'Email')}
              value={teacher.email || getEmptyDisplay()}
            />
            <InfoItem
              icon={Phone}
              label={t('phone', 'Phone')}
              value={teacher.phone || getEmptyDisplay()}
            />
            <InfoItem
              icon={MapPin}
              label={t('nationality', 'Nationality')}
              value={teacher.nationality || getEmptyDisplay()}
            />
            <InfoItem
              icon={User}
              label={t('ethnicGroup', 'Ethnic Group')}
              value={(teacher.ethnic_group || teacher.ethnicGroup) || getEmptyDisplay()}
            />
          </div>
        </div>

        {/* Employment Information */}
        <div className="border-t pt-4">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">
            <Building className="inline w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            {t('employmentInformation', 'Employment Information')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <InfoItem
              icon={Hash}
              label={t('teacherId', 'Teacher ID')}
              value={(teacher.teacherId || teacher.teacher_id || teacher.id) || getEmptyDisplay()}
            />
            <InfoItem
              icon={BookOpen}
              label={t('gradeLevel', 'Grade Level')}
              value={teacher.gradeLevel ? `${t('gradeLevel', 'GradeLevel')} ${teacher.gradeLevel}` : getEmptyDisplay()}
            />
            <InfoItem
              icon={Building}
              label={t('employmentType', 'Employment Type')}
              value={(teacher.employment_type || teacher.employmentType) || getEmptyDisplay()}
            />
            <InfoItem
              icon={Calendar}
              label={t('hireDate', 'Hire Date')}
              value={formatDate(teacher.hire_date || teacher.hireDate)}
            />
            <InfoItem
              icon={Shield}
              label={t('status', 'Status')}
              value={
                <Badge 
                  color={teacher.status === 'ACTIVE' ? 'green' : 'red'} 
                  variant="filled"
                >
                  {teacher.status || 'Unknown'}
                </Badge>
              }
            />
            <InfoItem
              icon={Shield}
              label={t('isDirector', 'Is Director')}
              value={teacher.isDirector ? t('yes', 'Yes') : t('no', 'No')}
            />
          </div>
        </div>

        {/* Health Information */}
        {(teacher.weight_kg || teacher.weight || teacher.height_cm || teacher.height) && (
          <div className="border-t pt-4">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">
              <Heart className="inline w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {t('healthInformation', 'Health Information')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <InfoItem
                icon={Weight}
                label={t('weight', 'Weight (kg)')}
                value={(teacher.weight_kg || teacher.weight) ? `${teacher.weight_kg || teacher.weight} kg` : getEmptyDisplay()}
              />
              <InfoItem
                icon={Ruler}
                label={t('height', 'Height (cm)')}
                value={(teacher.height_cm || teacher.height) ? `${teacher.height_cm || teacher.height} cm` : getEmptyDisplay()}
              />
              <InfoItem
                icon={Activity}
                label={t('bmi', 'BMI')}
                value={teacher.bmi ? teacher.bmi.toFixed(1) : getEmptyDisplay()}
              />
            </div>
          </div>
        )}

        {/* Classes Information */}
        {teacher.classes && teacher.classes.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <BookOpen className="inline w-5 h-5 mr-2" />
              {t('classesTeaching', 'Classes Teaching')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {teacher.classes.map((classItem, index) => (
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
        {teacher.accessibility && teacher.accessibility.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Shield className="inline w-5 h-5 mr-2" />
              {t('accessibility', 'Accessibility Needs')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {teacher.accessibility.map((item, index) => (
                <Badge key={index} color="orange" variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* School Information */}
        {(teacher.schoolName || teacher.school?.name) && (
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Building className="inline w-5 h-5 mr-2" />
              {t('schoolInformation', 'School Information')}
            </h3>
            <InfoItem
              icon={Building}
              label={t('school', 'School')}
              value={teacher.schoolName || teacher.school?.name || getEmptyDisplay()}
            />
          </div>
        )}

      </div>
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
      {Icon && <Icon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className="text-sm text-gray-900 break-words">
          {typeof displayValue === 'string' ? displayValue : displayValue}
        </div>
      </div>
    </div>
  );
}
