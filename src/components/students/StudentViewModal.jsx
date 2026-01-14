import { X, User, Mail, Phone, Calendar, MapPin, Heart, Ruler, Weight, Activity, Shield, Clock, Key, Hash, User2, BookOpen, LibraryBig, AlertCircle, Accessibility, CircleUserRound } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Badge } from '../ui/Badge';
import ProfileImage from '../ui/ProfileImage';
import { Button } from '../ui/Button';
import BookCard from '../books/BookCard';
import { formatDateKhmer, genderToKhmer, bmiStatusToKhmer } from '../../utils/formatters';
import { useBookCategories } from '../../hooks/useBookCategories';
import { useAllBooks } from '../../hooks/useAllBooks';

/**
 * StudentViewModal - Read-only modal to display student details
 */
export default function StudentViewModal({ isOpen, onClose, student }) {
  const { t } = useLanguage();
  // Use shared hooks to fetch book categories and subjects, and all books (prevents duplicates)
  // Only fetch when modal is open
  const { bookCategories, subjects } = useBookCategories(isOpen);
  const { allBooks, loading: loadingAllBooks } = useAllBooks(isOpen);

  const [books, setBooks] = useState([]);

  // Filter books by IDs when modal opens and allBooks are loaded
  useEffect(() => {
    console.log('StudentViewModal - student object:', student);
    console.log('StudentViewModal - bookIds:', student?.bookIds);
    if (isOpen && student?.bookIds && Array.isArray(student.bookIds) && student.bookIds.length > 0 && allBooks.length > 0) {
      console.log('Filtering books for IDs:', student.bookIds);
      // Filter books to only include those in bookIds array
      const filteredBooks = allBooks.filter(book => student.bookIds.includes(book.id));
      console.log('Filtered books:', filteredBooks);
      setBooks(filteredBooks);
    } else if (!isOpen || !student?.bookIds?.length) {
      setBooks([]);
    }
  }, [isOpen, student?.bookIds, allBooks]);

  if (!student) return null;

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

    // Required personal information (support both snake_case and camelCase)
    if (!student.first_name && !student.firstName) missingFields.push(t('firstName', 'First Name'));
    if (!student.last_name && !student.lastName) missingFields.push(t('lastName', 'Last Name'));
    if (!student.date_of_birth && !student.dateOfBirth) missingFields.push(t('dateOfBirth', 'Date of Birth'));
    if (!student.gender) missingFields.push(t('gender', 'Gender'));
    if (!student.email) missingFields.push(t('email', 'Email'));
    if (!student.phone) missingFields.push(t('phone', 'Phone'));
    if (!student.nationality) missingFields.push(t('nationality', 'Nationality'));
    if (!student.ethnic_group && !student.ethnicGroup) missingFields.push(t('ethnicGroup', 'Ethnic Group'));

    // Health information
    if (!student.weight_kg) missingFields.push(t('weight', 'Weight'));
    if (!student.height_cm) missingFields.push(t('height', 'Height'));

    // Address information
    if (!student.residence) missingFields.push(t('currentResidence', 'Residence Information'));
    if (!student.placeOfBirth) missingFields.push(t('placeOfBirth', 'Place of Birth'));

    return missingFields;
  };

  const incompleteFields = checkIncompleteFields();

  // Helper function to check if personal information exists
  const hasPersonalInfo = () => {
    return !!(
      student.first_name || student.firstName ||
      student.last_name || student.lastName ||
      student.date_of_birth || student.dateOfBirth ||
      student.gender ||
      student.nationality ||
      student.ethnic_group || student.ethnicGroup
    );
  };

  // Helper function to check if account information exists
  const hasAccountInfo = () => {
    return !!(student.username || student.email || student.phone);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('studentDetails', 'Student Details')}
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
                value={student.first_name || student.firstName || getEmptyDisplay()}
              />
              <InfoItem
                icon={User}
                label={t('lastName', 'Last Name')}
                value={student.last_name || student.lastName || getEmptyDisplay()}
              />
              <InfoItem
                icon={Calendar}
                label={t('dateOfBirth', 'Date of Birth')}
                value={formatDate(student.date_of_birth || student.dateOfBirth)}
              />
              <InfoItem
                icon={User}
                label={t('gender', 'Gender')}
                value={genderToKhmer(student.gender) || getEmptyDisplay()}
              />
              <InfoItem
                icon={MapPin}
                label={t('nationality', 'Nationality')}
                value={student.nationality || getEmptyDisplay()}
              />
              <InfoItem
                icon={User}
                label={t('ethnicGroup', 'Ethnic Group')}
                value={student.ethnic_group || student.ethnicGroup || getEmptyDisplay()}
              />
            </div>
          </div>
        )}

        {/* Account Information */}
        {hasAccountInfo() && (
          <div className="border-t pt-4">
            <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
              <div className='bg-blue-500 p-2 rounded-sm'>
                <CircleUserRound className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="ml-2">
                {t('accountInformation', 'Account Information')}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <InfoItem
                icon={User}
                label={t('username', 'Username')}
                value={student.username || getEmptyDisplay()}
              />
              <InfoItem
                icon={Mail}
                label={t('email', 'Email')}
                value={student.email || getEmptyDisplay()}
              />
              <InfoItem
                icon={Phone}
                label={t('phone', 'Phone')}
                value={student.phone || getEmptyDisplay()}
              />
            </div>
          </div>
        )}

        {/* Academic Information */}
        {student.student && (
          <div className="border-t pt-4">
            <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
              <div className='bg-blue-500 p-2 rounded-sm'>
                <LibraryBig className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="ml-2">
                {t('academicInformation', 'Academic Information')}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <InfoItem
                label={t('studentNumber', 'Student Number')}
                value={student.student.studentNumber || getEmptyDisplay()}
              />
              <InfoItem
                label={t('gradeLevel', 'Grade Level')}
                value={student.student.gradeLevel || getEmptyDisplay()}
              />
              <InfoItem
                label={t('academicYear', 'Academic Year')}
                value={student.student.academicYear || getEmptyDisplay()}
              />
              <InfoItem
                label={t('isKindergartener', 'Is Kindergartener')}
                value={student.student.isKidgardener ? t('yes', 'Yes') : t('no', 'No')}
              />
              {student.student.poorCard_grade && (
                <InfoItem
                  label={t('poorCardGrade', 'Poor Card Grade')}
                  value={student.student.poorCard_grade === '1' ? 'កម្រិត 1' : student.student.poorCard_grade === '2' ? 'កម្រិត 2' : student.student.poorCard_grade}
                />
              )}
            </div>
          </div>
        )}

        {/* Extra Learning Tool */}
        {(() => {
          const extra =
            student.student?.extraLearningTool ||
            student.extraLearningTool ||
            null;

          if (!extra || typeof extra !== 'object' || Object.keys(extra).length === 0) {
            return null;
          }

          const reading = extra.reading_material_package || {};
          const math = extra.math_grade1_package || {};

          const renderBool = (flag) =>
            flag === true ? t('have', 'Yes') : t('notHave', 'No');

          const renderStatus = (status) => {
            if (status === 'new') return t('statusNew', 'ថ្មី');
            if (status === 'old') return t('statusOld', 'ចាស់');
            return status;
          };

          const hasAny =
            Object.keys(reading).length > 0 || Object.keys(math).length > 0;

          if (!hasAny) return null;

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
                {/* Reading material package */}
                {Object.keys(reading).length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white shadow-sm">
                    <div className="font-medium text-gray-900 mb-2">
                      {t('learningPackage', 'កញ្ចប់សម្ភារៈអំណាន')}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">
                          {t('hasPackage', 'Has Package')}
                        </span>
                        <span className="inline-flex items-center text-gray-900">
                          <span
                            className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded border ${
                              reading._hasPackage
                                ? 'bg-green-500 border-green-500'
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            {reading._hasPackage && (
                              <span className="block h-2 w-2 rounded-sm bg-white" />
                            )}
                          </span>
                          {renderBool(reading._hasPackage)}
                        </span>
                      </div>

                      {reading.status && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">
                            {t('statusBook', 'ស្ថានភាពសៀវភៅ')}
                          </span>
                          <span className="text-gray-900">
                            {renderStatus(reading.status)}
                          </span>
                        </div>
                      )}

                      {reading.providedBy && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">
                            {t('providedBy', 'អ្នកផ្តល់')}
                          </span>
                          <span className="text-gray-900">
                            {reading.providedBy}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Math grade 1 package */}
                {Object.keys(math).length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white shadow-sm">
                    <div className="font-medium text-gray-900 mb-2">
                      {t('mathGrade1', 'គណិតវិទ្យាថ្នាក់ដំបូង')}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">
                          {t('hasPackage', 'Has Package')}
                        </span>
                        <span className="inline-flex items-center text-gray-900">
                          <span
                            className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded border ${
                              math._hasPackage
                                ? 'bg-green-500 border-green-500'
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            {math._hasPackage && (
                              <span className="block h-2 w-2 rounded-sm bg-white" />
                            )}
                          </span>
                          {renderBool(math._hasPackage)}
                        </span>
                      </div>

                      {math.status && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">
                            {t('statusBook', 'ស្ថានភាពសៀវភៅ')}
                          </span>
                          <span className="text-gray-900">
                            {renderStatus(math.status)}
                          </span>
                        </div>
                      )}

                      {math.providedBy && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">
                            {t('providedBy', 'អ្នកផ្តល់')}
                          </span>
                          <span className="text-gray-900">
                            {math.providedBy}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Selected Books */}
        {student.bookIds && Array.isArray(student.bookIds) && student.bookIds.length > 0 && (
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
                      getEmptyDisplay={() => 'N/A'}
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

        {/* Health & BMI Information */}
        {((student.weight_kg || student.height_cm) || (student.bmi && typeof student.bmi === 'object')) && (
          <div className="border-t pt-4">
            <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
              <div className='bg-blue-500 p-2 rounded-sm'>
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="ml-2">
                {t('healthAndBmiInformation', 'Health & BMI Information')}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {(student.weight_kg || student.height_cm) && (
                <>
                  <InfoItem
                    icon={Weight}
                    label={t('weight', 'Weight (kg)')}
                    value={student.weight_kg ? `${student.weight_kg} kg` : getEmptyDisplay()}
                  />
                  <InfoItem
                    icon={Ruler}
                    label={t('height', 'Height (cm)')}
                    value={student.height_cm ? `${student.height_cm} cm` : getEmptyDisplay()}
                  />
                </>
              )}
              {student.bmi && typeof student.bmi === 'object' && (
                <>
                  <InfoItem
                    icon={Activity}
                    label={t('bmiValue', 'BMI Value')}
                    value={student.bmi.value !== undefined && student.bmi.value !== null ? student.bmi.value : getEmptyDisplay()}
                  />
                  <InfoItem
                    label={t('bmiCategory', 'BMI Category')}
                    value={student.bmi.category_km || student.bmi.category || getEmptyDisplay()}
                  />
                  <InfoItem
                    label={t('bmiStatus', 'BMI Status')}
                    value={bmiStatusToKhmer(student.bmi.status) || getEmptyDisplay()}
                  />
                  {student.bmi.age !== undefined && student.bmi.age !== null && (
                    <InfoItem
                      label={t('age', 'Age')}
                      value={student.bmi.age}
                    />
                  )}
                </>
              )}
            </div>
            {student.bmi && student.bmi.recommendations && Array.isArray(student.bmi.recommendations) && student.bmi.recommendations.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-md">
                <h5 className="font-semibold text-blue-900 mb-2">
                  {t('healthRecommendations', 'Health Recommendations')}
                </h5>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                  {student.bmi.recommendations.map((rec, index) => (
                    <li key={index}>{rec.km || rec.en}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Accessibility Information */}
        {student.accessibility && student.accessibility.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
              <div className='bg-blue-500 p-2 rounded-sm'>
                <Accessibility className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="ml-2">
                {t('accessibility', 'Accessibility Needs')}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {student.accessibility.map((item, index) => (
                <Badge key={index} color="orange" variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Residence Information */}
        {student.residence && (
          <div className="border-t pt-4">
            <div className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center justify-start">
              <div className='bg-blue-500 p-2 rounded-sm'>
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="ml-2">
                {t('currentResidence', 'Residence Information')}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <InfoItem
                label={t('province', 'Province')}
                value={student.residence.province
                  ? `${student.residence.province.province_name_kh}`
                  : getEmptyDisplay()}
              />
              <InfoItem
                label={t('district', 'District')}
                value={student.residence.district
                  ? `${student.residence.district.district_name_kh}`
                  : getEmptyDisplay()}
              />
              <InfoItem
                label={t('commune', 'Commune')}
                value={student.residence.commune
                  ? `${student.residence.commune.commune_name_kh}`
                  : getEmptyDisplay()}
              />
              <InfoItem
                label={t('village', 'Village')}
                value={student.residence.village
                  ? `${student.residence.village.village_name_kh}`
                  : getEmptyDisplay()}
              />
            </div>
          </div>
        )}

        {/* Place of Birth */}
        {student.placeOfBirth && (
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
                label={t('province', 'Province')}
                value={student.placeOfBirth.province
                  ? `${student.placeOfBirth.province.province_name_kh}`
                  : getEmptyDisplay()}
              />
              <InfoItem
                label={t('district', 'District')}
                value={student.placeOfBirth.district
                  ? `${student.placeOfBirth.district.district_name_kh}`
                  : getEmptyDisplay()}
              />
              <InfoItem
                label={t('commune', 'Commune')}
                value={student.placeOfBirth.commune
                  ? `${student.placeOfBirth.commune.commune_name_kh}`
                  : getEmptyDisplay()}
              />
              <InfoItem
                label={t('village', 'Village')}
                value={student.placeOfBirth.village
                  ? `${student.placeOfBirth.village.village_name_kh}`
                  : getEmptyDisplay()}
              />
            </div>
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
      <div className="flex-1 min-w-0 bg-gray-50 border-gray-100 border-2 p-4 rounded-md">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 break-words mt-1">{displayValue}</p>
      </div>
    </div>
  );
}

