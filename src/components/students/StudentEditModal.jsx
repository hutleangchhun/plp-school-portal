import { useState, useRef, useEffect } from 'react';
import { User, User2, Building, Mail, Phone, Eye, Upload, Lock, X, Weight, Ruler, CircleUserRound, BookOpen } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import Modal from '../ui/Modal';
import { DatePickerWithDropdowns } from '../ui/date-picker-with-dropdowns';
import ProfileImage from '../ui/ProfileImage';
import Dropdown from '../ui/Dropdown';
import { useLocationData } from '../../hooks/useLocationData';
import { userService } from '../../utils/api/services/userService';
import { gradeLevelOptions, ethnicGroupOptions, accessibilityOptions } from '../../utils/formOptions';

const StudentEditModal = ({
  isOpen,
  onClose,
  student,
  onStudentUpdated
}) => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: null,
    nationality: '',
    profilePicture: '',
    newPassword: '',
    weight: '',
    height: '',
    bmi: '',
    ethnicGroup: '',
    accessibility: [],
    academicYear: '',
    gradeLevel: '',
    isKindergarten: false,
    studentNumber: '',
    residence: {
      provinceId: '',
      districtId: '',
      communeId: '',
      villageId: ''
    },
    placeOfBirth: {
      provinceId: '',
      districtId: '',
      communeId: '',
      villageId: ''
    }
  });

  // Location data hooks for residence
  const {
    selectedProvince: selectedResidenceProvince,
    selectedDistrict: selectedResidenceDistrict,
    selectedCommune: selectedResidenceCommune,
    selectedVillage: selectedResidenceVillage,
    handleProvinceChange: handleResidenceProvinceChange,
    handleDistrictChange: handleResidenceDistrictChange,
    handleCommuneChange: handleResidenceCommuneChange,
    handleVillageChange: handleResidenceVillageChange,
    getProvinceOptions: getResidenceProvinceOptions,
    getDistrictOptions: getResidenceDistrictOptions,
    getCommuneOptions: getResidenceCommuneOptions,
    getVillageOptions: getResidenceVillageOptions,
    setInitialValues: setResidenceInitialValues,
    resetSelections: resetResidenceSelections
  } = useLocationData();

  // Location data hooks for place of birth
  const {
    selectedProvince: selectedBirthProvince,
    selectedDistrict: selectedBirthDistrict,
    selectedCommune: selectedBirthCommune,
    selectedVillage: selectedBirthVillage,
    handleProvinceChange: handleBirthProvinceChange,
    handleDistrictChange: handleBirthDistrictChange,
    handleCommuneChange: handleBirthCommuneChange,
    handleVillageChange: handleBirthVillageChange,
    getProvinceOptions: getBirthProvinceOptions,
    getDistrictOptions: getBirthDistrictOptions,
    getCommuneOptions: getBirthCommuneOptions,
    getVillageOptions: getBirthVillageOptions,
    setInitialValues: setBirthInitialValues,
    resetSelections: resetBirthSelections
  } = useLocationData();

  // Initialize form data when student changes
  useEffect(() => {
    if (student && isOpen) {
      initializeFormData();
    }
  }, [student, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initializeFormData = async () => {
    if (!student) return;

    try {
      setLoading(true);

      const userId = student.userId || student.user_id || student.id;

      // Start with student data from the list
      let fullData = student;

      // Fetch full user details including nested student object
      if (userId) {
        try {
          const resp = await userService.getUserByID(userId);
          const fetchedUserData = resp?.data || resp;

          if (fetchedUserData) {
            fullData = fetchedUserData;
          }
        } catch (error) {
          console.warn('Failed to fetch full user data:', error);
          // Continue with list data
        }
      }

      // Extract student object - API returns nested student object with camelCase fields
      const studentObj = fullData.student || fullData;

      console.log('StudentEditModal: Extracted student data:', {
        gradeLevel: studentObj.gradeLevel,
        academicYear: studentObj.academicYear,
        studentNumber: studentObj.studentNumber,
        isKidgardener: studentObj.isKidgardener,
        is_kidgardener: studentObj.is_kidgardener,
        fullStudentObj: studentObj
      });

      setEditForm({
        firstName: fullData.firstName || fullData.first_name || '',
        lastName: fullData.lastName || fullData.last_name || '',
        username: fullData.username || '',
        email: fullData.email || '',
        phone: fullData.phone || '',
        gender: fullData.gender || '',
        dateOfBirth: fullData.dateOfBirth ? new Date(fullData.dateOfBirth) : (fullData.date_of_birth ? new Date(fullData.date_of_birth) : null),
        nationality: fullData.nationality || '',
        profilePicture: fullData.profile_picture || fullData.profilePicture || '',
        newPassword: '', // Always empty for security
        weight: fullData.weight_kg || fullData.weight || '',
        height: fullData.height_cm || fullData.height || '',
        bmi: fullData.bmi || '',
        ethnicGroup: fullData.ethnic_group || fullData.ethnicGroup || '',
        accessibility: Array.isArray(fullData.accessibility) ? fullData.accessibility : [],
        // Extract academic fields from nested student object (camelCase)
        academicYear: (studentObj.academicYear || '').toString(),
        gradeLevel: (studentObj.gradeLevel || '').toString(),
        isKindergarten: studentObj.isKidgardener !== undefined ? studentObj.isKidgardener : (studentObj.is_kidgardener || false),
        studentNumber: (studentObj.studentNumber || '').toString(),
        residence: {
          provinceId: fullData.residence?.provinceId || fullData.province_id || '',
          districtId: fullData.residence?.districtId || fullData.district_id || '',
          communeId: fullData.residence?.communeId || fullData.commune_id || '',
          villageId: fullData.residence?.villageId || fullData.village_id || ''
        },
        placeOfBirth: {
          provinceId: fullData.placeOfBirth?.provinceId || fullData.residence?.provinceId || fullData.province_id || '',
          districtId: fullData.placeOfBirth?.districtId || fullData.residence?.districtId || fullData.district_id || '',
          communeId: fullData.placeOfBirth?.communeId || fullData.residence?.communeId || fullData.commune_id || '',
          villageId: fullData.placeOfBirth?.villageId || fullData.residence?.villageId || fullData.village_id || ''
        }
      });

      // Initialize dropdown selections
      const res = fullData.residence || {};
      setResidenceInitialValues({
        provinceId: res.provinceId || fullData.province_id || '',
        districtId: res.districtId || fullData.district_id || '',
        communeId: res.communeId || fullData.commune_id || '',
        villageId: res.villageId || fullData.village_id || ''
      });

      const birth = fullData.placeOfBirth || {};
      setBirthInitialValues({
        provinceId: birth.provinceId || res.provinceId || fullData.province_id || '',
        districtId: birth.districtId || res.districtId || fullData.district_id || '',
        communeId: birth.communeId || res.communeId || fullData.commune_id || '',
        villageId: birth.villageId || res.villageId || fullData.village_id || ''
      });
    } catch (error) {
      console.error('Error initializing form data:', error);
      showError(t('failedToLoadStudentData', 'Failed to load student data'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditForm({
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      phone: '',
      gender: '',
      dateOfBirth: null,
      nationality: '',
      profilePicture: '',
      newPassword: '',
      weight: '',
      height: '',
      bmi: '',
      ethnicGroup: '',
      accessibility: [],
      academicYear: '',
      gradeLevel: '',
      isKindergarten: false,
      studentNumber: '',
      residence: { provinceId: '', districtId: '', communeId: '', villageId: '' },
      placeOfBirth: { provinceId: '', districtId: '', communeId: '', villageId: '' },
    });
    resetResidenceSelections();
    resetBirthSelections();
    setProfilePictureFile(null);
    setShowDropdown(false);
  };

  const getAcademicYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const options = [
      { value: '', label: t('selectAcademicYear', 'Select Academic Year') }
    ];

    // Generate options for current year and 10 years ahead
    for (let i = 0; i <= 10; i++) {
      const year = currentYear + i;
      const nextYear = year + 1;
      const label = `${year}-${nextYear}`;
      options.push({ value: label, label });
    }

    return options;
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleViewPicture = () => {
    setShowImageModal(true);
    setShowDropdown(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
    setShowDropdown(false);
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      const fileURL = URL.createObjectURL(file);
      handleFormChange('profilePicture', fileURL);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!student) return;

    try {
      setLoading(true);

      const userId = student.userId || student.user_id || student.id;

      // Normalize date to YYYY-MM-DD
      const formatDate = (val) => {
        if (!val) return undefined;
        const d = val instanceof Date ? val : new Date(val);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      // Backend expects snake_case keys on updateUser, but student fields in nested camelCase object
      const payload = {
        username: editForm.username?.trim(),
        first_name: editForm.firstName?.trim(),
        last_name: editForm.lastName?.trim(),
        email: editForm.email?.trim(),
        phone: editForm.phone?.trim(),
        date_of_birth: formatDate(editForm.dateOfBirth),
        gender: editForm.gender || undefined,
        nationality: editForm.nationality?.trim() || undefined,
        profile_picture: editForm.profilePicture || undefined,
        weight_kg: editForm.weight ? parseFloat(editForm.weight) : undefined,
        height_cm: editForm.height ? parseFloat(editForm.height) : undefined,
        bmi: editForm.bmi ? parseFloat(editForm.bmi) : undefined,
        ethnic_group: editForm.ethnicGroup?.trim() || undefined,
        accessibility: editForm.accessibility.length > 0 ? editForm.accessibility : undefined,
        // Student fields sent in nested object with camelCase names
        student: {
          academicYear: editForm.academicYear && editForm.academicYear.trim() ? editForm.academicYear.trim() : undefined,
          gradeLevel: editForm.gradeLevel && editForm.gradeLevel.trim() ? editForm.gradeLevel.trim() : undefined,
          isKidgardener: Boolean(editForm.isKindergarten),  // Always send boolean, even if false
          studentNumber: editForm.studentNumber && editForm.studentNumber.trim() ? editForm.studentNumber.trim() : undefined,
        },
        residence: {
          provinceId: selectedResidenceProvince ? Number(selectedResidenceProvince) : (editForm.residence.provinceId ? Number(editForm.residence.provinceId) : undefined),
          districtId: selectedResidenceDistrict ? Number(selectedResidenceDistrict) : (editForm.residence.districtId ? Number(editForm.residence.districtId) : undefined),
          communeId: selectedResidenceCommune ? Number(selectedResidenceCommune) : (editForm.residence.communeId ? Number(editForm.residence.communeId) : undefined),
          villageId: selectedResidenceVillage ? Number(selectedResidenceVillage) : (editForm.residence.villageId ? Number(editForm.residence.villageId) : undefined),
        },
        placeOfBirth: {
          provinceId: selectedBirthProvince ? Number(selectedBirthProvince) : (editForm.placeOfBirth.provinceId ? Number(editForm.placeOfBirth.provinceId) : undefined),
          districtId: selectedBirthDistrict ? Number(selectedBirthDistrict) : (editForm.placeOfBirth.districtId ? Number(editForm.placeOfBirth.districtId) : undefined),
          communeId: selectedBirthCommune ? Number(selectedBirthCommune) : (editForm.placeOfBirth.communeId ? Number(editForm.placeOfBirth.communeId) : undefined),
          villageId: selectedBirthVillage ? Number(selectedBirthVillage) : (editForm.placeOfBirth.villageId ? Number(editForm.placeOfBirth.villageId) : undefined),
        }
      };

      // Add password if provided
      if (editForm.newPassword && editForm.newPassword.trim()) {
        payload.newPassword = editForm.newPassword.trim();
      }

      console.log('StudentEditModal: Payload before cleanup:', payload);
      console.log('StudentEditModal: Form data:', {
        academicYear: editForm.academicYear,
        gradeLevel: editForm.gradeLevel,
        studentNumber: editForm.studentNumber,
        isKindergarten: editForm.isKindergarten
      });

      // Remove undefined/empty values - but keep empty strings and false booleans
      const cleanPayload = {};
      Object.keys(payload).forEach(k => {
        const value = payload[k];

        // Handle nested objects (residence, placeOfBirth, student)
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const cleanedObj = {};
          Object.keys(value).forEach(nestedKey => {
            const nestedValue = value[nestedKey];
            // Keep value if it's not undefined or null (includes false, 0, empty string, etc.)
            if (nestedValue !== undefined && nestedValue !== null) {
              cleanedObj[nestedKey] = nestedValue;
            }
          });
          // Only add the object if it has properties
          if (Object.keys(cleanedObj).length > 0) {
            cleanPayload[k] = cleanedObj;
          }
        } else if (value !== undefined && value !== null) {
          // Add non-null/undefined values (includes false, 0, empty string, etc.)
          cleanPayload[k] = value;
        }
      });

      console.log('StudentEditModal: Payload after cleanup:', cleanPayload);
      console.log('StudentEditModal: Student object in payload:', cleanPayload.student);
      console.log('StudentEditModal: isKidgardener value:', cleanPayload.student?.isKidgardener, 'type:', typeof cleanPayload.student?.isKidgardener);

      const response = await userService.updateUser(userId, cleanPayload);

      if (response) {
        showSuccess(t('studentUpdatedSuccess', 'Student updated successfully'));
        handleClose();
        if (onStudentUpdated) {
          onStudentUpdated(response);
        }
      } else {
        throw new Error('Failed to update student');
      }
    } catch (error) {
      console.error('Error updating student:', error);
      showError(t('failedUpdateStudent', 'Failed to update student: ') + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={t('editStudent', 'Edit Student')}
        size="full"
        height='2xl'
        stickyFooter={true}
        footer={
          <div className="flex items-center justify-end space-x-3">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              disabled={loading}
            >
              {t('cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              form="edit-student-form"
              variant="primary"
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? t('updating', 'Updating...') : t('updateStudent', 'Update Student')}
            </Button>
          </div>
        }
      >
        <form id="edit-student-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Section */}
          <div className="">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profilePicture', 'Profile Picture')}
            </label>

            {/* Profile Picture with Dropdown */}
            <div className="relative mb-4" ref={dropdownRef}>
              <div
                className="relative inline-block cursor-pointer"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {profilePictureFile ? (
                  <img
                    src={URL.createObjectURL(profilePictureFile)}
                    alt="Profile Preview"
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover border-2 border-gray-300 hover:border-blue-500 transition-colors"
                  />
                ) : (
                  <ProfileImage
                    user={{ profile_picture: editForm.profilePicture, firstName: editForm.firstName, lastName: editForm.lastName }}
                    size="lg"
                    alt="Profile"
                    className="hover:border-blue-500 transition-colors"
                    borderColor="border-gray-300"
                    fallbackType="image"
                    clickable={true}
                  />
                )}
              </div>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                  <div className="py-1">
                    {editForm.profilePicture && (
                      <Button
                        type="button"
                        onClick={handleViewPicture}
                        variant="ghost"
                        size="sm"
                        fullWidth
                        className="justify-start rounded-none"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t('viewPicture') || 'View Picture'}
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={handleUploadClick}
                      variant="ghost"
                      size="sm"
                      fullWidth
                      className="justify-start rounded-none"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {t('uploadNewPicture') || 'Upload New Picture'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              className="hidden"
            />

            {profilePictureFile && (
              <p className="mt-2 text-sm text-green-600 mb-4">
                {t('newPictureSelected') || 'New picture selected'}: {profilePictureFile.name}
              </p>
            )}
          </div>

          {/* Personal Information */}
          <div className='border-t pt-4'>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <User2 className="inline w-5 h-5 mr-2" />
              {t('personalInformation', 'Personal Information')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('firstName', 'First Name')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="firstName"
                    value={editForm.firstName}
                    onChange={(e) => handleFormChange('firstName', e.target.value)}
                    className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                    placeholder={t('enterFirstName', 'Enter first name')}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('lastName', 'Last Name')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="lastName"
                    value={editForm.lastName}
                    onChange={(e) => handleFormChange('lastName', e.target.value)}
                    className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                    placeholder={t('enterLastName', 'Enter last name')}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('gender', 'Gender')} *
                </label>
                <Dropdown
                  options={[
                    { value: '', label: t('selectGender', 'Select gender') },
                    { value: 'MALE', label: t('male', 'Male') },
                    { value: 'FEMALE', label: t('female', 'Female') }
                  ]}
                  value={editForm.gender}
                  onValueChange={(value) => handleFormChange('gender', value)}
                  placeholder={t('selectGender', 'Select gender')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={false}
                  className='w-full'
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('dateOfBirth', 'Date of Birth')} *
                </label>
                <DatePickerWithDropdowns
                  value={editForm.dateOfBirth}
                  onChange={(date) => handleFormChange('dateOfBirth', date)}
                  placeholder={t('pickDate', 'Pick a date')} 
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('nationality', 'Nationality')} *
                </label>
                <Dropdown
                  options={[
                    { value: '', label: t('selectNationality', 'Select Nationality') },
                    { value: 'ខ្មែរ', label: 'ខ្មែរ (Cambodian)' },
                    { value: 'ថៃ', label: 'ថៃ (Thai)' },
                    { value: 'វៀតណាម', label: 'វៀតណាម (Vietnamese)' },
                    { value: 'ឡាវ', label: 'ឡាវ (Laotian)' },
                    { value: 'អាមេរីក', label: 'អាមេរីក (American)' },
                    { value: 'អង់គ្លេស', label: 'អង់គ្លេស (British)' },
                    { value: 'ចិន', label: 'ចិន (Chinese)' },
                    { value: 'ឥណ្ឌា', label: 'ឥណ្ឌា (Indian)' },
                    { value: 'ជប៉ុន', label: 'ជប៉ុន (Japanese)' },
                    { value: 'កូរេ', label: 'កូរេ (Korean)' },
                    { value: 'បារាំង', label: 'បារាំង (French)' },
                    { value: 'ឺម៉ង់', label: 'ឺម៉ង់ (German)' },
                    { value: 'អេស្ប៉ាញ', label: 'អេស្ប៉ាញ (Spanish)' },
                    { value: 'អ៊ីតាលី', label: 'អ៊ីតាលី (Italian)' },
                    { value: 'កាណាដា', label: 'កាណាដា (Canadian)' },
                    { value: 'អូស្ត្រាលី', label: 'អូស្ត្រាលី (Australian)' },
                    { value: 'ផ្សេងទៀត', label: 'ផ្សេងទៀត (Other)' }
                  ]}
                  value={editForm.nationality}
                  onValueChange={(value) => handleFormChange('nationality', value)}
                  placeholder={t('selectNationality', 'Select Nationality')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={false}
                  className='w-full'
                  required
                />
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4'>
              <div className="grid grid-rows-3 gap-4">
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('weight', 'Weight')} ({t('kg', 'kg')}) 
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Weight className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      id="weight"
                      step="0.1"
                      min="0"
                      value={editForm.weight}
                      onChange={(e) => handleFormChange('weight', e.target.value)}
                      className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                      placeholder={t('enterWeight', 'Enter weight')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('height', 'Height')} ({t('cm', 'cm')}) 
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Ruler className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      id="height"
                      step="0.1"
                      min="0"
                      value={editForm.height}
                      onChange={(e) => handleFormChange('height', e.target.value)}
                      className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                      placeholder={t('enterHeight', 'Enter height')}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('ethnicGroup', 'Ethnic Group')}
                  </label>
                  <Dropdown
                    options={[
                      { value: '', label: t('selectEthnicGroup', 'ជ្រើសរើសជនជាតិភាគតិច') },
                      ...ethnicGroupOptions
                    ]}
                    value={editForm.ethnicGroup}
                    onValueChange={(value) => handleFormChange('ethnicGroup', value)}
                    placeholder={t('selectEthnicGroup', 'ជ្រើសរើសជនជាតិភាគតិច')}
                    contentClassName="max-h-[200px] overflow-y-auto"
                    disabled={false}
                    className='w-full'
                  />
                </div>
              </div>

              {/* Ethnic Group and Accessibility */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('accessibility', 'Accessibility')}
                  </label>
                  <div className="mt-1 space-y-2 p-3 border border-gray-300 rounded-md bg-white max-h-48 overflow-y-auto">
                    {accessibilityOptions.map((option) => (
                      <label key={option.value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={editForm.accessibility.includes(option.value)}
                          onChange={(e) => {
                            const newAccessibility = e.target.checked
                              ? [...editForm.accessibility, option.value]
                              : editForm.accessibility.filter(item => item !== option.value);
                            handleFormChange('accessibility', newAccessibility);
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className='border-t pt-4 mt-4'>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('academicInformation', 'Academic Information')}
              </h3>
              <div className='grid grid-cols-1 sm:grid-cols-4 gap-4'>
                <div>
                  <label htmlFor="studentNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('studentNumber', 'Student Number')} *
                  </label>
                  <input
                    type="text"
                    id="studentNumber"
                    value={editForm.studentNumber}
                    onChange={(e) => handleFormChange('studentNumber', e.target.value)}
                    className="mt-1 block w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('enterStudentNumber', 'Enter student number')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('academicYear', 'Academic Year')} *
                  </label>
                  <Dropdown
                    options={getAcademicYearOptions()}
                    value={editForm.academicYear}
                    onValueChange={(value) => handleFormChange('academicYear', value)}
                    placeholder={t('selectAcademicYear', 'Select Academic Year')}
                    contentClassName="max-h-[200px] overflow-y-auto"
                    disabled={false}
                    className='w-full'
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <BookOpen className="inline w-4 h-4 mr-2" />
                    {t('gradeLevel', 'Grade Level')} *
                  </label>
                  <Dropdown
                    options={[
                      { value: '', label: t('selectGradeLevel', 'Select Grade Level') },
                      ...gradeLevelOptions.map(option => ({
                        ...option,
                        label: option.translationKey ? t(option.translationKey, option.label) : option.label
                      }))
                    ]}
                    value={editForm.gradeLevel}
                    onValueChange={(value) => handleFormChange('gradeLevel', value)}
                    placeholder={t('selectGradeLevel', 'Select Grade Level')}
                    contentClassName="max-h-[200px] overflow-y-auto"
                    disabled={false}
                    className='w-full'
                    required
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isKindergarten}
                      onChange={(e) => handleFormChange('isKindergarten', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {t('isKindergarten', 'Is Kindergarten')}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <CircleUserRound className="inline w-5 h-5 mr-2" />
              {t('account', 'Account')}
            </h3>
            {/* Contact Information */}
            <div className='grid grid-cols-1 sm:grid-cols-4 gap-4'>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('username', 'Username')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="username"
                    value={editForm.username}
                    onChange={(e) => handleFormChange('username', e.target.value)}
                    className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                    placeholder={t('enterUsername', 'Enter username')}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('newPassword', 'New Password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    value={editForm.newPassword}
                    onChange={(e) => handleFormChange('newPassword', e.target.value)}
                    className="mt-1 block w-full pl-10 pr-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                    placeholder={t('enterNewPassword')}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex="-1"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('email', 'Email')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={editForm.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                    placeholder={t('enterEmail', 'Enter email address')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('phone', 'Phone')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                    placeholder={t('enterPhone', 'Enter phone number')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Current Residence */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Building className="inline w-5 h-5 mr-2" />
              {t('currentResidence', 'Current Residence')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('province', 'Province')}
                </label>
                <Dropdown
                  options={getResidenceProvinceOptions()}
                  value={selectedResidenceProvince}
                  onValueChange={handleResidenceProvinceChange}
                  placeholder={t('selectProvince', 'Select Province')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={false}
                  className='w-full'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('district', 'District')}
                </label>
                <Dropdown
                  options={getResidenceDistrictOptions()}
                  value={selectedResidenceDistrict}
                  onValueChange={handleResidenceDistrictChange}
                  placeholder={t('selectDistrict', 'Select District')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={!selectedResidenceProvince}
                  className='w-full'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('commune', 'Commune')}
                </label>
                <Dropdown
                  options={getResidenceCommuneOptions()}
                  value={selectedResidenceCommune}
                  onValueChange={handleResidenceCommuneChange}
                  placeholder={t('selectCommune', 'Select Commune')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={!selectedResidenceDistrict}
                  className='w-full'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('village', 'Village')}
                </label>
                <Dropdown
                  options={getResidenceVillageOptions()}
                  value={selectedResidenceVillage}
                  onValueChange={handleResidenceVillageChange}
                  placeholder={t('selectVillage', 'Select Village')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={!selectedResidenceCommune}
                  className='w-full'
                />
              </div>
            </div>
          </div>

          {/* Place of Birth */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Building className="inline w-5 h-5 mr-2" />
              {t('placeOfBirth', 'Place of Birth')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('province', 'Province')}
                </label>
                <Dropdown
                  options={getBirthProvinceOptions()}
                  value={selectedBirthProvince}
                  onValueChange={handleBirthProvinceChange}
                  placeholder={t('selectProvince', 'Select Province')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={false}
                  className='w-full'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('district', 'District')}
                </label>
                <Dropdown
                  options={getBirthDistrictOptions()}
                  value={selectedBirthDistrict}
                  onValueChange={handleBirthDistrictChange}
                  placeholder={t('selectDistrict', 'Select District')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={!selectedBirthProvince}
                  className='w-full'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('commune', 'Commune')}
                </label>
                <Dropdown
                  options={getBirthCommuneOptions()}
                  value={selectedBirthCommune}
                  onValueChange={handleBirthCommuneChange}
                  placeholder={t('selectCommune', 'Select Commune')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={!selectedBirthDistrict}
                  className='w-full'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('village', 'Village')}
                </label>
                <Dropdown
                  options={getBirthVillageOptions()}
                  value={selectedBirthVillage}
                  onValueChange={handleBirthVillageChange}
                  placeholder={t('selectVillage', 'Select Village')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={!selectedBirthCommune}
                  className='w-full'
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Image Modal */}
      {showImageModal && editForm.profilePicture && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-4xl max-h-full p-4">
            <Button
              onClick={() => setShowImageModal(false)}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:text-gray-300 hover:bg-white/10 z-10"
            >
              <X className="w-6 h-6" />
            </Button>
            <img
              src={editForm.profilePicture}
              alt="Profile"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default StudentEditModal;