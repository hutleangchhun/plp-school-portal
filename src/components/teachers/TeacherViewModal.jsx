import { X, User, Mail, Phone, Calendar, MapPin, Heart, Ruler, Weight, Activity, Shield, Clock, Key, Hash, User2, BookOpen, Building, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../ui/Modal';
import { Badge } from '../ui/Badge';
import ProfileImage from '../ui/ProfileImage';
import { Button } from '../ui/Button';
import { formatDateKhmer, genderToKhmer, calculateExperience } from '../../utils/formatters';
import { formatClassIdentifier } from '../../utils/helpers';
import { userService } from '../../utils/api/services/userService';
import salaryTypeService from '../../utils/api/services/salaryTypeService';
import { teacherService } from '../../utils/api/services/teacherService';
import { handleApiResponse } from '../../utils/api/client.js';
import { getGradeLabel } from '../../constants/grades';
import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import BookCard from '../books/BookCard';
import { useBookCategories } from '../../hooks/useBookCategories';
import { useAllBooks } from '../../hooks/useAllBooks';

/**
 * TeacherViewModal - Read-only modal to display teacher details
 */
export default function TeacherViewModal({ isOpen, onClose, teacher }) {
  const { t } = useLanguage();
  const { showError } = useToast();
  // Use shared hooks to fetch book categories, subjects, and all books (prevents duplicates)
  const { bookCategories, subjects } = useBookCategories();
  const { allBooks, loading: loadingAllBooks } = useAllBooks();

  const [fullTeacherData, setFullTeacherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [salaryTypeName, setSalaryTypeName] = useState(null);
  const [books, setBooks] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

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

  // Fetch salary type name when data is available
  useEffect(() => {
    const loadSalaryType = async () => {
      try {
        const src = fullTeacherData || teacher;
        if (!src) return;
        const tData = src.teacher || src;
        const id = tData.salaryTypeId;
        if (!id) {
          setSalaryTypeName(null);
          return;
        }

        const detail = await salaryTypeService.getSalaryTypeById(id);
        setSalaryTypeName(detail?.name || null);
      } catch (e) {
        console.error('Error loading salary type for view:', e);
        setSalaryTypeName(null);
      }
    };

    if (isOpen) {
      loadSalaryType();
    }
  }, [isOpen, fullTeacherData, teacher]);

  // Filter books by IDs when modal opens and allBooks are loaded
  useEffect(() => {
    const src = fullTeacherData || teacher;
    console.log('TeacherViewModal - teacher object:', src);
    console.log('TeacherViewModal - bookIds:', src?.bookIds);
    if (isOpen && src?.bookIds && Array.isArray(src.bookIds) && src.bookIds.length > 0 && allBooks.length > 0) {
      console.log('Filtering books for IDs:', src.bookIds);
      // Filter books to only include those in bookIds array
      const filteredBooks = allBooks.filter(book => src.bookIds.includes(book.id));
      console.log('Filtered books:', filteredBooks);
      setBooks(filteredBooks);
    } else if (!isOpen || !src?.bookIds?.length) {
      setBooks([]);
    }
  }, [isOpen, fullTeacherData, teacher?.bookIds, allBooks]);

  // Fetch teacher's classes when modal opens
  useEffect(() => {
    const fetchTeacherClasses = async () => {
      const src = fullTeacherData || teacher;
      // IMPORTANT: Use teacherId from the teacher object, not the user ID
      // fullTeacherData might have id as userId, so we need teacherId from original teacher prop
      const teacherId = teacher?.teacherId || src?.teacherId || teacher?.id;

      if (!isOpen || !teacherId) {
        setTeacherClasses([]);
        return;
      }

      try {
        setLoadingClasses(true);
        console.log('🎓 TeacherViewModal - Fetching classes for teacher ID:', teacherId);

        const response = await teacherService.getTeacherClasses(teacherId);

        console.log('🎓 TeacherViewModal - Teacher classes response:', response);
        console.log('🎓 TeacherViewModal - Response success:', response.success);
        console.log('🎓 TeacherViewModal - Response data:', response.data);
        console.log('🎓 TeacherViewModal - Is data an array?', Array.isArray(response.data));

        if (response.success && response.data) {
          const classesArray = Array.isArray(response.data) ? response.data : [];
          console.log('🎓 TeacherViewModal - Setting classes array with', classesArray.length, 'items');
          setTeacherClasses(classesArray);
        } else {
          console.log('🎓 TeacherViewModal - Response not successful or no data');
          setTeacherClasses([]);
        }
      } catch (error) {
        console.error('🎓 TeacherViewModal - Error fetching teacher classes:', error);
        setTeacherClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchTeacherClasses();
  }, [isOpen, teacher?.teacherId, teacher?.id]);

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
  const familyData = teacherData.teacherFamily || teacherData.teacher_family || displayTeacher.teacherFamily || displayTeacher.teacher_family || {};
  const residence = displayTeacher.residence || {};
  const birthPlace = displayTeacher.placeOfBirth || {};

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
      displayTeacher.firstName || displayTeacher.first_name ||
      displayTeacher.lastName || displayTeacher.last_name ||
      displayTeacher.dateOfBirth || displayTeacher.date_of_birth ||
      displayTeacher.gender ||
      displayTeacher.nationality ||
      displayTeacher.ethnicGroup || displayTeacher.ethnic_group
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
    if (!displayTeacher.firstName && !displayTeacher.first_name) missingFields.push(t('firstName', 'First Name'));
    if (!displayTeacher.lastName && !displayTeacher.last_name) missingFields.push(t('lastName', 'Last Name'));
    if (!displayTeacher.dateOfBirth && !displayTeacher.date_of_birth) missingFields.push(t('dateOfBirth', 'Date of Birth'));
    if (!displayTeacher.gender) missingFields.push(t('gender', 'Gender'));
    if (!displayTeacher.email) missingFields.push(t('email', 'Email'));
    if (!displayTeacher.phone) missingFields.push(t('phone', 'Phone'));
    if (!displayTeacher.nationality) missingFields.push(t('nationality', 'Nationality'));
    if (!displayTeacher.ethnicGroup && !displayTeacher.ethnic_group) missingFields.push(t('ethnicGroup', 'Ethnic Group'));

    // Employment information
    if (!teacherData.employmentType && !teacherData.employment_type) missingFields.push(t('employmentType', 'Employment Type'));
    if (!teacherData.hireDate && !teacherData.hire_date) missingFields.push(t('hireDate', 'Hire Date'));

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
              value={formatDate(displayTeacher.dateOfBirth || displayTeacher.date_of_birth)}
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
              value={(displayTeacher.ethnicGroup || displayTeacher.ethnic_group) || getEmptyDisplay()}
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
              value={teacherData.gradeLevel ? getGradeLabel(String(teacherData.gradeLevel), t) : getEmptyDisplay()}
            />
            <InfoItem
              icon={Key}
              label={t('role', 'Role')}
              value={displayTeacher.roleNameKh || displayTeacher.roleNameEn || teacherData.roleId || getEmptyDisplay()}
            />
            <InfoItem
              icon={Building}
              label={t('employmentType', 'Employment Type')}
              value={(teacherData.employmentType || teacherData.employment_type) || getEmptyDisplay()}
            />
            <InfoItem
              icon={BookOpen}
              label={t('educationLevel', 'Education Level')}
              value={teacherData.educationLevel || getEmptyDisplay()}
            />
            <InfoItem
              icon={BookOpen}
              label={t('trainingType', 'Training Type')}
              value={teacherData.trainingType || getEmptyDisplay()}
            />
            <InfoItem
              icon={Shield}
              label={t('teacherStatus', 'Teacher Status')}
              value={teacherData.teacherStatus || getEmptyDisplay()}
            />
            <InfoItem
              icon={Clock}
              label={t('teachingType', 'Teaching Type')}
              value={teacherData.teachingType || getEmptyDisplay()}
            />
            <InfoItem
              icon={BookOpen}
              label={t('subjects', 'Subjects')}
              value={Array.isArray(teacherData.subject) && teacherData.subject.length > 0 ? teacherData.subject.join(', ') : getEmptyDisplay()}
            />
            <InfoItem
              icon={Calendar}
              label={t('hireDate', 'Hire Date')}
              value={formatDate(teacherData.hireDate || teacherData.hire_date)}
            />
            <InfoItem
              icon={Hash}
              label={t('salaryType', 'Salary Type')}
              value={salaryTypeName || (teacherData.salaryTypeId ? String(teacherData.salaryTypeId) : getEmptyDisplay())}
            />
            {(() => {
              const rawHireDate = teacherData.hireDate || teacherData.hire_date;
              const expText = calculateExperience(rawHireDate, {
                years: t('years', 'years'),
                months: t('months', 'months'),
                lessThanOneMonth: t('lessThanOneMonth', 'Less than 1 month')
              });

              const value = expText || getEmptyDisplay();

              return (
                <InfoItem
                  icon={Clock}
                  label={t('experience', 'Experience')}
                  value={value}
                />
              );
            })()}
            <InfoItem
              icon={Clock}
              label={t('appointed', 'Appointed')}
              value={teacherData.appointed === true ? t('yes', 'Yes') : t('no', 'No')}
            />
            <InfoItem
              icon={Clock}
              label={t('burden', 'Burden')}
              value={teacherData.burden === true ? t('yes', 'Yes') : t('no', 'No')}
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

        {/* Extra Learning Tool */}
        {(() => {
          const teacherToolObj =
            teacherData.teacherExtraLearningTool ||
            displayTeacher.teacherExtraLearningTool ||
            {};

          const extraToolObj =
            teacherData.extraLearningTool ||
            {};

          // Build a merged view per category so we can show _hasPackage from teacherExtraLearningTool
          // and status from extraLearningTool for ALL packages
          const categoryKeys = Array.from(
            new Set([
              ...Object.keys(teacherToolObj || {}),
              ...Object.keys(extraToolObj || {}),
            ])
          );

          if (categoryKeys.length === 0) return null;

          const mergedExtra = categoryKeys.reduce((acc, key) => {
            const teacherVal = teacherToolObj ? teacherToolObj[key] : undefined;
            const extraVal = extraToolObj ? extraToolObj[key] : undefined;

            const teacherObj =
              teacherVal && typeof teacherVal === 'object'
                ? teacherVal
                : teacherVal === true
                  ? { _hasPackage: true }
                  : {};

            let extraObj = {};
            if (extraVal && typeof extraVal === 'object') {
              extraObj = extraVal;
            } else if (typeof extraVal === 'string' && extraVal) {
              // Legacy: treat string as status
              extraObj = { status: extraVal };
            }

            acc[key] = { ...teacherObj, ...extraObj };
            return acc;
          }, {});

          const entries = Object.entries(mergedExtra);

          const renderBool = (flag) =>
            flag === true ? t('have', 'Yes') : t('notHave', 'No');

          const renderStatus = (status) => {
            if (status === 'new') return t('statusNew', 'ថ្មី');
            if (status === 'old') return t('statusOld', 'ចាស់');
            return status;
          };

          const getCategoryLabel = (key) => {
            if (key === 'reading_material_package') {
              return t('learningPackage', 'កញ្ចប់សម្ភារៈអំណាន');
            }
            if (key === 'math_grade1_package') {
              return t('mathGrade1', 'គណិតវិទ្យាថ្នាក់ដំបូង');
            }
            return key;
          };

          const getDetailLabel = (key) => {
            if (key === 'picture_cards') {
              return t('pictureCards', 'ប័ណ្ឌរូបភាព');
            }
            if (key === 'manipulatives') {
              return t('manipulatives', 'សម្ភារឧបទេស');
            }
            return key;
          };

          return (
            <div className="border-t pt-4">
              <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
                <div className='bg-blue-500 p-2 rounded-sm'>
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="ml-2">
                  {t('extraLearningTool', 'Extra Learning Tool')}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {entries.map(([category, tools]) => {
                  const obj = tools && typeof tools === 'object' ? tools : {};
                  const hasPackage = obj._hasPackage === true || tools === true;

                  // Try to find a human tool key other than _hasPackage
                  const detailKeys = Object.keys(obj).filter(k => k !== '_hasPackage');
                  const detailKey = detailKeys[0];
                  const detailFlag = detailKey ? obj[detailKey] === true : false;

                  return (
                    <div
                      key={category}
                      className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white shadow-sm"
                    >
                      <div className="font-medium text-gray-900 mb-2">
                        {getCategoryLabel(category)}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">
                            {t('hasPackage', 'Has Package')}
                          </span>
                          <span className="inline-flex items-center text-gray-900">
                            <span
                              className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded border ${
                                hasPackage
                                  ? 'bg-green-500 border-green-500'
                                  : 'bg-white border-gray-300'
                              }`}
                            >
                              {hasPackage && (
                                <span className="block h-2 w-2 rounded-sm bg-white" />
                              )}
                            </span>
                            {renderBool(hasPackage)}
                          </span>
                        </div>

                        {/* Optional status display when extraLearningTool uses status string */}
                        {typeof obj.status === 'string' && obj.status && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">
                              {t('statusBook', 'ស្ថានភាព')}
                            </span>
                            <span className="text-gray-900">
                              {renderStatus(obj.status)}
                            </span>
                          </div>
                        )}

                        {detailKey && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">
                              {getDetailLabel(detailKey)}
                            </span>
                            <span className="inline-flex items-center text-gray-900">
                              <span
                                className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded border ${
                                  detailFlag
                                    ? 'bg-green-500 border-green-500'
                                    : 'bg-white border-gray-300'
                                }`}
                              >
                                {detailFlag && (
                                  <span className="block h-2 w-2 rounded-sm bg-white" />
                                )}
                              </span>
                              {renderBool(detailFlag)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Selected Books */}
        {displayTeacher.bookIds && Array.isArray(displayTeacher.bookIds) && displayTeacher.bookIds.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
              <div className='bg-blue-500 p-2 rounded-sm'>
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="ml-2">
                {t('selectedBooks', 'Selected Books')}
              </div>
            </div>
            {loadingAllBooks ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-gray-500">{t('loading', 'Loading...')}</div>
              </div>
            ) : books.length > 0 ? (
              <div className="grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {books.map((book) => {
                  const categoryName = bookCategories.find(cat => cat.id === book.bookCategoryId)?.name || 'N/A';
                  const subjectName = subjects.find(subj => subj.id === book.subjectId)?.khmer_name || subjects.find(subj => subj.id === book.subjectId)?.name || 'N/A';

                  return (
                    <BookCard
                      key={book.id}
                      book={book}
                      t={t}
                      getEmptyDisplay={getEmptyDisplay}
                      layout="portrait"
                      categoryName={categoryName}
                      subjectName={subjectName}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                {t('noBooks', 'No books found')}
              </div>
            )}
          </div>
        )}

        {/* Family Information */}
        {(familyData && (familyData.livingStatus || familyData.living_status || familyData.spouseInfo || familyData.spouse_info || familyData.numberOfChildren || familyData.number_of_children || (Array.isArray(familyData.children) && familyData.children.length > 0))) && (
          <div className="border-t pt-4">
            <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
              <div className='bg-blue-500 p-2 rounded-sm'>
                <User2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="ml-2">
                {t('familyInformation', 'Family Information')}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <InfoItem
                icon={User}
                label={t('maritalStatus', 'Marital Status')}
                value={(familyData.livingStatus || familyData.living_status) || getEmptyDisplay()}
              />
              {((familyData.livingStatus || familyData.living_status) === 'រៀបការ' && (familyData.spouseInfo || familyData.spouse_info)) && (
                <InfoItem
                  icon={User}
                  label={t('partnerName', 'Spouse Name')}
                  value={(familyData.spouseInfo?.spouseName || familyData.spouse_info?.spouse_name) || getEmptyDisplay()}
                />
              )}
              {((familyData.livingStatus || familyData.living_status) === 'រៀបការ' && (familyData.spouseInfo || familyData.spouse_info)) && (
                <InfoItem
                  icon={Building}
                  label={t('partnerJobPlace', 'Spouse Occupation')}
                  value={(familyData.spouseInfo?.spouseOccupation || familyData.spouse_info?.spouse_occupation) || getEmptyDisplay()}
                />
              )}
              {((familyData.livingStatus || familyData.living_status) === 'រៀបការ' && (familyData.spouseInfo || familyData.spouse_info)) && (
                <InfoItem
                  icon={MapPin}
                  label={t('partnerPlaceOfBirth', 'Spouse Place of Birth')}
                  value={(familyData.spouseInfo?.spousePlaceOfBirth || familyData.spouse_info?.spouse_place_of_birth) || getEmptyDisplay()}
                />
              )}
              {((familyData.livingStatus || familyData.living_status) === 'រៀបការ' && (familyData.spouseInfo || familyData.spouse_info)) && (
                <InfoItem
                  icon={Phone}
                  label={t('partnerPhone', 'Spouse Phone')}
                  value={(familyData.spouseInfo?.spousePhone || familyData.spouse_info?.spouse_phone) || getEmptyDisplay()}
                />
              )}
              {(familyData.livingStatus || familyData.living_status) !== 'នៅលីវ' && (familyData.numberOfChildren !== undefined && familyData.numberOfChildren !== null && familyData.numberOfChildren !== '' || familyData.number_of_children !== undefined && familyData.number_of_children !== null && familyData.number_of_children !== '') && (
                <InfoItem
                  icon={User}
                  label={t('numberOfChildren', 'Number of Children')}
                  value={String(familyData.numberOfChildren !== undefined ? familyData.numberOfChildren : familyData.number_of_children)}
                />
              )}
            </div>

            {(familyData.livingStatus || familyData.living_status) !== 'នៅលីវ' && Array.isArray(familyData.children) && familyData.children.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {familyData.children.map((child, index) => (
                  <InfoItem
                    key={index}
                    icon={User}
                    label={`${t('childName', 'Child Name')} ${index + 1}`}
                    value={child.childName || child.child_name || ''}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Residence Information */}
        {(residence && (residence.province || residence.district || residence.commune || residence.village)) && (
          <div className="border-t pt-4">
            <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
              <div className='bg-blue-500 p-2 rounded-sm'>
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="ml-2">
                {t('residence', 'Residence')}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <InfoItem
                icon={MapPin}
                label={t('province', 'Province')}
                value={residence.province?.provinceNameKh || residence.province?.province_name_kh || residence.province?.provinceNameEn || residence.province?.province_name_en || getEmptyDisplay()}
              />
              <InfoItem
                icon={MapPin}
                label={t('district', 'District')}
                value={residence.district?.districtNameKh || residence.district?.district_name_kh || residence.district?.districtNameEn || residence.district?.district_name_en || getEmptyDisplay()}
              />
              <InfoItem
                icon={MapPin}
                label={t('commune', 'Commune')}
                value={residence.commune?.communeNameKh || residence.commune?.commune_name_kh || residence.commune?.communeNameEn || residence.commune?.commune_name_en || getEmptyDisplay()}
              />
              <InfoItem
                icon={MapPin}
                label={t('village', 'Village')}
                value={residence.village?.villageNameKh || residence.village?.village_name_kh || residence.village?.villageNameEn || residence.village?.village_name_en || getEmptyDisplay()}
              />
            </div>
          </div>
        )}

        {/* Place of Birth Information */}
        {(birthPlace && (birthPlace.province || birthPlace.district || birthPlace.commune || birthPlace.village)) && (
          <div className="border-t pt-4">
            <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
              <div className='bg-blue-500 p-2 rounded-sm'>
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="ml-2">
                {t('placeOfBirth', 'Place of Birth')}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <InfoItem
                icon={MapPin}
                label={t('province', 'Province')}
                value={birthPlace.province?.provinceNameKh || birthPlace.province?.province_name_kh || birthPlace.province?.provinceNameEn || birthPlace.province?.province_name_en || getEmptyDisplay()}
              />
              <InfoItem
                icon={MapPin}
                label={t('district', 'District')}
                value={birthPlace.district?.districtNameKh || birthPlace.district?.district_name_kh || birthPlace.district?.districtNameEn || birthPlace.district?.district_name_en || getEmptyDisplay()}
              />
              <InfoItem
                icon={MapPin}
                label={t('commune', 'Commune')}
                value={birthPlace.commune?.communeNameKh || birthPlace.commune?.commune_name_kh || birthPlace.commune?.communeNameEn || birthPlace.commune?.commune_name_en || getEmptyDisplay()}
              />
              <InfoItem
                icon={MapPin}
                label={t('village', 'Village')}
                value={birthPlace.village?.villageNameKh || birthPlace.village?.village_name_kh || birthPlace.village?.villageNameEn || birthPlace.village?.village_name_en || getEmptyDisplay()}
              />
            </div>
          </div>
        )}

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
                value={(displayTeacher.weightKg || displayTeacher.weight_kg || displayTeacher.weight) ? `${displayTeacher.weightKg || displayTeacher.weight_kg || displayTeacher.weight} kg` : getEmptyDisplay()}
              />
              <InfoItem
                icon={Ruler}
                label={t('height', 'Height (cm)')}
                value={(displayTeacher.heightCm || displayTeacher.height_cm || displayTeacher.height) ? `${displayTeacher.heightCm || displayTeacher.height_cm || displayTeacher.height} cm` : getEmptyDisplay()}
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

        {/* Current Classes Teaching (from API) */}
        {teacherClasses.length > 0 || loadingClasses ? (
          <div className="border-t pt-4">
            <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
              <div className='bg-blue-500 p-2 rounded-sm'>
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="ml-2">
                {t('currentClassesTeaching', 'Current Classes Teaching')}
              </div>
            </div>
            {loadingClasses ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="sm" variant="primary">
                  {t('loading', 'Loading...')}
                </LoadingSpinner>
              </div>
            ) : teacherClasses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {teacherClasses.map((classItem, index) => (
                  <div
                    key={classItem.classId || index}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {classItem.name || `${classItem.gradeLevel}${classItem.section}`}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {t('gradeLevel', 'Grade Level')}: {getGradeLabel(String(classItem.gradeLevel), t)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">{t('class', 'Class')}:</span>
                        <span className="text-gray-900 font-medium">
                          {formatClassIdentifier(classItem.gradeLevel, classItem.section)}
                        </span>
                      </div>
                      {classItem.maxStudents && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">{t('maxStudents', 'Max Students')}:</span>
                          <span className="text-gray-900 font-medium">{classItem.maxStudents}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                {t('noClasses', 'No classes found')}
              </div>
            )}
          </div>
        ) : null}

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
      <div className="flex-1 space-y-1 min-w-0 bg-gray-50 border-gray-100 border-2 p-4 rounded-md">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 break-words">{displayValue}</p>
      </div>
    </div>
  );
}
