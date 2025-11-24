import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Mail, Phone, Eye, Upload, Lock, X, Weight, Ruler, BookOpen, ArrowLeft } from 'lucide-react';
import { sanitizeUsername } from '../../utils/usernameUtils';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { decryptId, isValidEncryptedId } from '../../utils/encryption';
import { Button } from '../ui/Button';
import { DatePickerWithDropdowns } from '../ui/date-picker-with-dropdowns';
import ProfileImage from '../ui/ProfileImage';
import Dropdown from '../ui/Dropdown';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';
import SalaryTypeDropdown from '../ui/SalaryTypeDropdown';
import ErrorDisplay from '../ui/ErrorDisplay';
import { PageLoader } from '../ui/DynamicLoader';
import { useLocationData } from '../../hooks/useLocationData';
import { userService } from '../../utils/api/services/userService';
import { ethnicGroupOptions, accessibilityOptions, gradeLevelOptions, employmentTypeOptions, educationLevelOptions, trainingTypeOptions, teacherStatusOptions, subjectOptions, roleOptions, maritalStatusOptions, teachingTypeOptions, spouseJobOptions } from '../../utils/formOptions';
import { utils } from '../../utils/api';

const TeacherEditModal = () => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { error, handleError, clearError, retry } = useErrorHandler();

  // Get encrypted teacher ID from URL
  const encryptedTeacherId = searchParams.get('id');
  const mode = searchParams.get('mode') || 'edit'; // 'create' or 'edit'

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [schoolId, setSchoolId] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [showUsernameSuggestions, setShowUsernameSuggestions] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [originalUsername, setOriginalUsername] = useState('');
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const usernameContainerRef = useRef(null);
  const usernameDebounceRef = useRef(null);

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
    password: '', // Password for create mode
    newPassword: '', // Password change for edit mode
    weight: '',
    height: '',
    bmi: '',
    ethnicGroup: '',
    gradeLevel: '', // Single grade level as string
    accessibility: [],
    employment_type: '',
    salary_type: '',
    education_level: '',
    training_type: '',
    teaching_type: '',
    teacher_status: '',
    subject: [],
    role: '',
    teacher_number: '',
    hire_date: null,
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
    },
    teacher_family: {
      living_status: '',
      spouse_info: {
        spouse_name: '',
        spouse_occupation: '',
        spouse_place_of_birth: '',
        spouse_phone: ''
      },
      number_of_children: '',
      children: []
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

  // Fetch teacher data if editing
  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        if (mode === 'create') {
          // For create mode, we don't need to fetch data
          setLoading(false);
          return;
        }

        // For edit mode, validate and decrypt the teacher ID
        if (!encryptedTeacherId || !isValidEncryptedId(encryptedTeacherId)) {
          throw new Error(t('invalidTeacherId', 'Invalid teacher ID'));
        }

        const decryptedId = decryptId(encryptedTeacherId);
        if (!decryptedId) {
          throw new Error(t('failedToDecryptTeacherId', 'Failed to decrypt teacher ID'));
        }

        console.log('Fetching teacher with ID:', decryptedId);

        // Fetch teacher data
        const response = await userService.getUserByID(decryptedId);
        if (response && response.data) {
          setTeacher(response.data);
        } else if (response) {
          setTeacher(response);
        } else {
          throw new Error(t('failedToLoadTeacher', 'Failed to load teacher data'));
        }
      } catch (err) {
        console.error('Error fetching teacher:', err);
        handleError(err, {
          toastMessage: t('errorLoadingTeacher', 'Error loading teacher data')
        });
      } finally {
        setLoading(false);
      }
    };

    // Get school ID from localStorage
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setSchoolId(parsedUser.schoolId || parsedUser.school_id);
      }
    } catch (err) {
      console.error('Error getting school ID:', err);
    }

    fetchTeacherData();
  }, [mode, encryptedTeacherId, t, handleError]);

  // Initialize form data when teacher changes
  useEffect(() => {
    if (teacher) {
      initializeFormData();
    }
  }, [teacher]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }

      // Close username suggestions when clicking outside the username area
      if (
        usernameContainerRef.current &&
        !usernameContainerRef.current.contains(event.target)
      ) {
        setShowUsernameSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initializeFormData = async () => {
    if (!teacher) return;

    try {
      setLoading(true);

      const userId = teacher.userId || teacher.user_id || teacher.id;
      let fullData = teacher;

      if (userId) {
        try {
          const resp = await userService.getUserByID(userId);
          fullData = resp?.data || resp || teacher;
        } catch (error) {
          console.warn('Failed to fetch full user data:', error);
        }
      }

      // Calculate BMI from weight and height if available
      const calcBMI = (weight, height) => {
        if (weight && height) {
          const w = parseFloat(weight);
          const h = parseFloat(height) / 100; // Convert cm to meters
          return (w / (h * h)).toFixed(1);
        }
        return '';
      };

      const weight = fullData.weight_kg || fullData.weight || '';
      const height = fullData.height_cm || fullData.height || '';
      const bmiSource = fullData.bmi;
      const bmiValue =
        bmiSource && typeof bmiSource === 'object'
          ? bmiSource.value
          : bmiSource;
      const bmi = bmiValue || calcBMI(weight, height);

      // Extract teacher-specific fields from nested teacher object if available
      const teacherData = fullData.teacher || fullData;

      // Initialize family data from API response (prefer nested teacher.teacher_family)
      const familyData = teacherData.teacher_family || fullData.teacher_family || {};
      const childrenArray = Array.isArray(familyData.children) ? familyData.children : [];

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
        weight: weight,
        height: height,
        bmi: bmi,
        ethnicGroup: fullData.ethnic_group || fullData.ethnicGroup || '',
        gradeLevel: teacherData.gradeLevel || '',
        accessibility: Array.isArray(fullData.accessibility) ? fullData.accessibility : [],
        employment_type: teacherData.employment_type || '',
        salary_type: teacherData.salaryTypeId ? String(teacherData.salaryTypeId) : '',
        education_level: teacherData.educationLevel || '',
        training_type: teacherData.trainingType || '',
        teaching_type: teacherData.teachingType || '',
        teacher_status: teacherData.teacherStatus || '',
        subject: Array.isArray(teacherData.subject) ? teacherData.subject : [],
        role: fullData.roleId ? String(fullData.roleId) : '',
        teacher_number: teacherData.teacher_number || teacherData.teacherNumber || '',
        hire_date: teacherData.hire_date ? new Date(teacherData.hire_date) : null,
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
        },
        teacher_family: {
          living_status: familyData.living_status || '',
          spouse_info: {
            spouse_name: familyData.spouse_info?.spouse_name || '',
            spouse_occupation: familyData.spouse_info?.spouse_occupation || '',
            spouse_place_of_birth: familyData.spouse_info?.spouse_place_of_birth || '',
            spouse_phone: familyData.spouse_info?.spouse_phone || ''
          },
          number_of_children: familyData.number_of_children || '',
          children: childrenArray
        }
      });

      setOriginalUsername(fullData.username || '');
      setUsernameAvailable(null);

      // Log gradeLevels from API response for debugging
      console.log('Teacher data received from API:', {
        gradeLevels: teacherData.gradeLevels,
        gradeLevel: teacherData.gradeLevel,
        fullData: fullData
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
      showError(t('failedToLoadTeacherData', 'Failed to load teacher data'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateUsernameSuggestions = async (baseFromInput = null) => {
    try {
      const baseUsername = (baseFromInput && baseFromInput.trim()) ||
        (editForm.username && editForm.username.trim()) ||
        'teacher';

      const response = await userService.generateUsername(baseUsername);

      let suggestions = [];

      if (Array.isArray(response?.suggestions)) {
        suggestions = response.suggestions;
      } else if (Array.isArray(response?.data)) {
        suggestions = response.data;
      } else if (response?.username) {
        suggestions = [response.username];
      }

      suggestions = suggestions.filter(Boolean).slice(0, 20);

      const availableFlag = typeof response?.available === 'boolean'
        ? response.available
        : null;

      const sameAsOriginal = (baseUsername || '') === (originalUsername || '');

      // For the teacher's own original username, treat as available but still show suggestions.
      const effectiveAvailable = sameAsOriginal ? true : availableFlag;

      setUsernameAvailable(effectiveAvailable);
      setUsernameSuggestions(suggestions);
      setShowUsernameSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Error generating username suggestions (teacher):', error);
      setUsernameSuggestions([]);
      setShowUsernameSuggestions(false);
      showError(t('failedGenerateUsername', 'Failed to generate username suggestions'));
    }
  };

  const handleChooseUsernameSuggestion = (suggestion) => {
    setEditForm(prev => ({
      ...prev,
      username: suggestion
    }));
    setUsernameAvailable(true);
    setShowUsernameSuggestions(false);
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
      password: '',
      newPassword: '',
      weight: '',
      height: '',
      bmi: '',
      ethnicGroup: '',
      gradeLevel: '',
      accessibility: [],
      employment_type: '',
      salary_type: '',
      education_level: '',
      training_type: '',
      teaching_type: '',
      teacher_status: '',
      subject: [],
      role: '',
      teacher_number: '',
      hire_date: null,
      residence: { provinceId: '', districtId: '', communeId: '', villageId: '' },
      placeOfBirth: { provinceId: '', districtId: '', communeId: '', villageId: '' },
      teacher_family: {
        living_status: '',
        spouse_info: {
          spouse_name: '',
          spouse_occupation: '',
          spouse_place_of_birth: '',
          spouse_phone: ''
        },
        number_of_children: '',
        children: []
      }
    });
    resetResidenceSelections();
    resetBirthSelections();
    setProfilePictureFile(null);
    setShowDropdown(false);
  };

  const handleClose = () => {
    resetForm();
    // Redirect based on user role
    const currentUser = utils.user.getUserData();
    const redirectPath = currentUser?.roleId === 14 ? '/teachers' : '/teachers';
    navigate(redirectPath, { replace: true });
  };

  const handleFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'username') {
      // If username is unchanged from the original, treat it as available
      if ((value || '') === (originalUsername || '')) {
        setUsernameAvailable(true);
      } else {
        setUsernameAvailable(null);
      }
    }
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

  const buildTeacherFamilyPayload = () => {
    const tf = editForm.teacher_family || {};
    const rawChildren = Array.isArray(tf.children) ? tf.children : [];

    const numberOfChildrenRaw = tf.number_of_children;
    const parsedNumber =
      numberOfChildrenRaw === '' || numberOfChildrenRaw === null || numberOfChildrenRaw === undefined
        ? undefined
        : parseInt(numberOfChildrenRaw, 10);

    const cleanedChildren = rawChildren
      .map(child => ({ child_name: (child?.child_name || '').trim() }))
      .filter(child => child.child_name);

    const payload = {
      living_status: tf.living_status || undefined,
      spouse_info: {
        spouse_name: tf.spouse_info?.spouse_name || undefined,
        spouse_occupation: tf.spouse_info?.spouse_occupation || undefined,
        spouse_place_of_birth: tf.spouse_info?.spouse_place_of_birth || undefined,
        spouse_phone: tf.spouse_info?.spouse_phone || undefined
      },
      number_of_children:
        typeof parsedNumber === 'number' && !Number.isNaN(parsedNumber) ? parsedNumber : undefined,
      children: cleanedChildren.length > 0 ? cleanedChildren : undefined
    };

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setPageLoading(true);

      // Normalize date to YYYY-MM-DD
      const formatDate = (val) => {
        if (!val) return undefined;
        const d = val instanceof Date ? val : new Date(val);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      if (mode === 'create') {
        // CREATE MODE: Create a new teacher
        if (!editForm.username || !editForm.firstName || !editForm.lastName || !editForm.password) {
          throw new Error('Username, First Name, Last Name, and Password are required');
        }

        const createPayload = {
          username: editForm.username.trim(),
          first_name: editForm.firstName.trim(),
          last_name: editForm.lastName.trim(),
          email: editForm.email?.trim() || undefined,
          phone: editForm.phone?.trim() || undefined,
          password: editForm.password.trim(),
          roleId: editForm.role ? parseInt(editForm.role) : 8,
          date_of_birth: formatDate(editForm.dateOfBirth),
          gender: editForm.gender || undefined,
          nationality: editForm.nationality?.trim() || undefined,
          profile_picture: editForm.profilePicture || undefined,
          weight_kg: editForm.weight ? parseFloat(editForm.weight) : undefined,
          height_cm: editForm.height ? parseFloat(editForm.height) : undefined,
          bmi: editForm.bmi ? parseFloat(editForm.bmi) : undefined,
          ethnic_group: editForm.ethnicGroup?.trim() || undefined,
          gradeLevel: editForm.gradeLevel?.trim() || undefined,
          accessibility: editForm.accessibility.length > 0 ? editForm.accessibility : undefined,
          employment_type: editForm.employment_type || undefined,
          salaryTypeId: editForm.salary_type ? parseInt(editForm.salary_type) : undefined,
          educationLevel: editForm.education_level || undefined,
          trainingType: editForm.training_type || undefined,
          teachingType: editForm.teaching_type || undefined,
          teacherStatus: editForm.teacher_status || undefined,
          subject: editForm.subject.length > 0 ? editForm.subject : undefined,
          teacher_number: editForm.teacher_number || undefined,
          hire_date: editForm.hire_date ? formatDate(editForm.hire_date) : undefined,
          schoolId: schoolId || undefined,
          residence: {
            provinceId: selectedResidenceProvince || editForm.residence.provinceId || undefined,
            districtId: selectedResidenceDistrict || editForm.residence.districtId || undefined,
            communeId: selectedResidenceCommune || editForm.residence.communeId || undefined,
            villageId: selectedResidenceVillage || editForm.residence.villageId || undefined,
          },
          placeOfBirth: {
            provinceId: selectedBirthProvince || editForm.placeOfBirth.provinceId || undefined,
            districtId: selectedBirthDistrict || editForm.placeOfBirth.districtId || undefined,
            communeId: selectedBirthCommune || editForm.placeOfBirth.communeId || undefined,
            villageId: selectedBirthVillage || editForm.placeOfBirth.villageId || undefined,
          },
          teacher_family: buildTeacherFamilyPayload()
        };

        // Remove undefined/empty values
        Object.keys(createPayload).forEach(k => {
          if (createPayload[k] === undefined || createPayload[k] === null || createPayload[k] === '') delete createPayload[k];
        });

        console.log('Creating teacher with payload:', createPayload);
        console.log('gradeLevel being sent (CREATE):', createPayload.gradeLevel);

        // Call user service to create new teacher
        const response = await userService.createTeacher(createPayload);

        // Response is already unwrapped by axios interceptor, so response is the data itself
        if (response) {
          showSuccess(t('teacherCreatedSuccess', 'Teacher created successfully'));
          // Redirect back to teachers list after a short delay
          setTimeout(() => {
            const currentUser = utils.user.getUserData();
            const redirectPath = currentUser?.roleId === 14 ? '/teachers' : '/teachers';
            navigate(redirectPath, { replace: true });
          }, 1500);
        } else {
          throw new Error('Failed to create teacher');
        }
      } else {
        // EDIT MODE: Update existing teacher
        if (!teacher) return;

        const userId = teacher.userId || teacher.user_id || teacher.id;
        if (!userId) {
          throw new Error('User ID is required to update teacher information');
        }

        const updatePayload = {
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
          gradeLevel: editForm.gradeLevel?.trim() || undefined,
          accessibility: editForm.accessibility.length > 0 ? editForm.accessibility : undefined,
          employment_type: editForm.employment_type || undefined,
          salaryTypeId: editForm.salary_type ? parseInt(editForm.salary_type) : undefined,
          educationLevel: editForm.education_level || undefined,
          trainingType: editForm.training_type || undefined,
          teachingType: editForm.teaching_type || undefined,
          teacherStatus: editForm.teacher_status || undefined,
          subject: editForm.subject.length > 0 ? editForm.subject : undefined,
          roleId: editForm.role ? parseInt(editForm.role) : undefined,
          teacher_number: editForm.teacher_number || undefined,
          hire_date: editForm.hire_date ? formatDate(editForm.hire_date) : undefined,
          schoolId: schoolId || undefined,
          residence: {
            provinceId: selectedResidenceProvince || editForm.residence.provinceId || undefined,
            districtId: selectedResidenceDistrict || editForm.residence.districtId || undefined,
            communeId: selectedResidenceCommune || editForm.residence.communeId || undefined,
            villageId: selectedResidenceVillage || editForm.residence.villageId || undefined,
          },
          placeOfBirth: {
            provinceId: selectedBirthProvince || editForm.placeOfBirth.provinceId || undefined,
            districtId: selectedBirthDistrict || editForm.placeOfBirth.districtId || undefined,
            communeId: selectedBirthCommune || editForm.placeOfBirth.communeId || undefined,
            villageId: selectedBirthVillage || editForm.placeOfBirth.villageId || undefined,
          },
          teacher_family: buildTeacherFamilyPayload()
        };

        // Add password if provided
        if (editForm.newPassword && editForm.newPassword.trim()) {
          updatePayload.newPassword = editForm.newPassword.trim();
        }

        // Remove undefined/empty values
        Object.keys(updatePayload).forEach(k => {
          if (updatePayload[k] === undefined || updatePayload[k] === null || updatePayload[k] === '') delete updatePayload[k];
        });

        console.log('Updating teacher with payload:', updatePayload);
        console.log('gradeLevel being sent (UPDATE):', updatePayload.gradeLevel);

        // Use user service with PUT /users/{userId} endpoint
        const response = await userService.updateUser(userId, updatePayload);

        if (response) {
          showSuccess(t('teacherUpdatedSuccess', 'Teacher updated successfully'));
          // Redirect back to teachers list after a short delay
          setTimeout(() => {
            const currentUser = utils.user.getUserData();
            const redirectPath = currentUser?.roleId === 14 ? '/teachers' : '/teachers';
            navigate(redirectPath, { replace: true });
          }, 1500);
        } else {
          throw new Error('Failed to update teacher');
        }
      }
    } catch (error) {
      console.error('Error submitting teacher form:', error);
      const errorMsg = mode === 'create' ? 'failedCreateTeacher' : 'failedUpdateTeacher';
      showError(t(errorMsg, `Failed to ${mode === 'create' ? 'create' : 'update'} teacher: `) + (error.message || 'Unknown error'));
    } finally {
      setPageLoading(false);
    }
  };

  const isSubmitDisabled =
    pageLoading ||
    !editForm.firstName?.trim() ||
    !editForm.lastName?.trim() ||
    !editForm.gender ||
    !editForm.dateOfBirth ||
    !editForm.nationality ||
    !editForm.username?.trim() ||
    !editForm.employment_type ||
    !editForm.teacher_number?.trim() ||
    !editForm.hire_date ||
    (mode === 'create' && !editForm.password?.trim()) ||
    usernameAvailable === false;

  // Show error state
  if (error && mode === 'edit') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 sm:p-6">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back', 'Back')}
          </Button>

          <ErrorDisplay
            error={error}
            onRetry={() => {
              clearError();
              window.location.reload();
            }}
            size="lg"
            className="min-h-[400px]"
          />
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageLoader
          message={t('loadingTeacher', 'Loading teacher...')}
          className="min-h-screen"
        />
      </div>
    );
  }

  // Form content JSX
  const formContent = (
    <form id="edit-teacher-form" onSubmit={handleSubmit} className="space-y-6">
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

      {/* Personal Information Card */}
      <div className="bg-white rounded-md border border-gray-200 p-6">
        <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('personalInformation', 'Personal Information')}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-green-500 focus:border-green-500 hover:border-gray-400"
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
                className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-green-500 focus:border-green-500 hover:border-gray-400"
                placeholder={t('enterHeight', 'Enter height')}
              />
            </div>
          </div>

          <div className='flex-none gap-6'>
            {/* Accessibility */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('accessibility', 'Accessibility')}
                </label>
                <div className="mt-1 space-y-2 p-3 border border-gray-300 rounded-md bg-gray-50 max-h-40 overflow-y-auto">
                  {accessibilityOptions.map((option) => (
                    <label key={option.value} className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={editForm.accessibility.includes(option.value)}
                        onChange={(e) => {
                          const newAccessibility = e.target.checked
                            ? [...editForm.accessibility, option.value]
                            : editForm.accessibility.filter(item => item !== option.value);
                          handleFormChange('accessibility', newAccessibility);
                        }}
                        className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Employment Information Card */}
      <div className="bg-white rounded-md border border-gray-200 p-6">
        <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('employmentInformation', 'Employment Information')}
          </h3>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-4 gap-4'>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <BookOpen className="inline w-4 h-4 mr-2" />
              {t('gradeLevel', 'Grade Level')}
            </label>
            <Dropdown
              options={[
                { value: '', label: t('selectGradeLevel', 'Select Grade Level') },
                ...gradeLevelOptions
              ]}
              value={editForm.gradeLevel}
              onValueChange={(value) => handleFormChange('gradeLevel', value)}
              placeholder={t('selectGradeLevel', 'Select Grade Level')}
              contentClassName="max-h-[200px] overflow-y-auto"
              disabled={false}
              className='w-full'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('employmentType', 'Employment Type')} *
            </label>
            <Dropdown
              options={[
                { value: '', label: t('selectEmploymentType', 'Select Type') },
                ...employmentTypeOptions
              ]}
              value={editForm.employment_type}
              onValueChange={(value) => handleFormChange('employment_type', value)}
              placeholder={t('selectEmploymentType', 'Select Type')}
              required
              minWidth="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('salaryType', 'Salary Type')}
            </label>
            <SalaryTypeDropdown
              employmentType={editForm.employment_type}
              value={editForm.salary_type}
              onValueChange={(value) => handleFormChange('salary_type', value)}
              placeholder={t('selectSalaryType', 'Select Salary Type')}
              disabled={!editForm.employment_type}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('educationLevel', 'Education Level')}
            </label>
            <Dropdown
              options={[
                { value: '', label: t('selectEducationLevel', 'Select Education Level') },
                ...educationLevelOptions
              ]}
              value={editForm.education_level}
              onValueChange={(value) => handleFormChange('education_level', value)}
              placeholder={t('selectEducationLevel', 'Select Education Level')}
              contentClassName="max-h-[200px] overflow-y-auto"
              disabled={false}
              className='w-full'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('trainingType', 'Training Type')}
            </label>
            <Dropdown
              options={[
                { value: '', label: t('selectTrainingType', 'Select Training Type') },
                ...trainingTypeOptions
              ]}
              value={editForm.training_type}
              onValueChange={(value) => handleFormChange('training_type', value)}
              placeholder={t('selectTrainingType', 'Select Training Type')}
              contentClassName="max-h-[200px] overflow-y-auto"
              disabled={false}
              className='w-full'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('teachingType', 'Teaching Type')}
            </label>
            <Dropdown
              options={[
                { value: '', label: t('selectTeachingType', 'Select Teaching Type') },
                ...teachingTypeOptions
              ]}
              value={editForm.teaching_type}
              onValueChange={(value) => handleFormChange('teaching_type', value)}
              placeholder={t('selectTeachingType', 'Select Teaching Type')}
              contentClassName="max-h-[200px] overflow-y-auto"
              disabled={false}
              className='w-full'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('teacherStatus', 'Teacher Status')}
            </label>
            <Dropdown
              options={[
                { value: '', label: t('selectTeacherStatus', 'Select Teacher Status') },
                ...teacherStatusOptions
              ]}
              value={editForm.teacher_status}
              onValueChange={(value) => handleFormChange('teacher_status', value)}
              placeholder={t('selectTeacherStatus', 'Select Teacher Status')}
              contentClassName="max-h-[200px] overflow-y-auto"
              disabled={false}
              className='w-full'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('role', 'Role')} *
            </label>
            <Dropdown
              options={[
                { value: '', label: t('selectRole', 'Select Role') },
                ...roleOptions
              ]}
              value={editForm.role}
              onValueChange={(value) => handleFormChange('role', value)}
              placeholder={t('selectRole', 'Select Role')}
              contentClassName="max-h-[200px] overflow-y-auto"
              disabled={false}
              className='w-full'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('subjects', 'Subjects')}
            </label>
            <MultiSelectDropdown
              options={subjectOptions}
              value={editForm.subject}
              onValueChange={(value) => handleFormChange('subject', value)}
              placeholder={t('selectSubjects', 'Select Subjects')}
              maxHeight='max-h-[200px]'
              disabled={false}
              className='w-full'
            />
          </div>

          <div>
            <label htmlFor="teacher_number" className="block text-sm font-medium text-gray-700 mb-1">
              {t('teacherNumber', 'Teacher Number')} *
            </label>
            <input
              type="text"
              id="teacher_number"
              value={editForm.teacher_number}
              onChange={(e) => handleFormChange('teacher_number', e.target.value)}
              className="mt-1 block w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('enterTeacherNumber', 'e.g., T00000001')}
            />
          </div>

          <div>
            <label htmlFor="hire_date" className="block text-sm font-medium text-gray-700 mb-1">
              {t('hireDate', 'Hire Date')} *
            </label>
            <DatePickerWithDropdowns
              date={editForm.hire_date}
              onChange={(date) => handleFormChange('hire_date', date)}
              required
              placeholder={t('pickDate', 'Pick a date')}
            />
          </div>
        </div>

        {/* Family Information Section */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('familyInformation', 'Family Information')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('maritalStatus', 'Marital Status')}
              </label>
              <Dropdown
                options={[
                  { value: '', label: t('selectMaritalStatus', 'Select Marital Status') },
                  ...maritalStatusOptions
                ]}
                value={editForm.teacher_family.living_status}
                onValueChange={(value) => {
                  // Update teacher_family based on selected living_status
                  setEditForm(prev => {
                    let nextTeacherFamily = {
                      ...prev.teacher_family,
                      living_status: value
                    };

                    // Single: clear spouse info and children
                    if (value === 'នៅលីវ') {
                      nextTeacherFamily = {
                        living_status: value,
                        spouse_info: {
                          spouse_name: '',
                          spouse_occupation: '',
                          spouse_place_of_birth: '',
                          spouse_phone: ''
                        },
                        number_of_children: '',
                        children: []
                      };
                    }

                    // Widow/Divorced (ពោះម៉ាយ): no spouse info, but allow children
                    if (value === 'ពោះម៉ាយ') {
                      nextTeacherFamily = {
                        living_status: value,
                        spouse_info: {
                          spouse_name: '',
                          spouse_occupation: '',
                          spouse_place_of_birth: '',
                          spouse_phone: ''
                        },
                        number_of_children: prev.teacher_family?.number_of_children || '',
                        children: Array.isArray(prev.teacher_family?.children) ? prev.teacher_family.children : []
                      };
                    }

                    // Married (រៀបការ): keep spouse/children data but ensure living_status syncs
                    if (value === 'រៀបការ') {
                      nextTeacherFamily = {
                        ...prev.teacher_family,
                        living_status: value
                      };
                    }

                    return {
                      ...prev,
                      teacher_family: nextTeacherFamily
                    };
                  });
                }}
                placeholder={t('selectMaritalStatus', 'Select Marital Status')}
                contentClassName="max-h-[200px] overflow-y-auto"
                disabled={false}
                className='w-full'
              />
            </div>

            {/* Spouse Information - Show only if living_status is Married (រៀបការ) */}
            {editForm.teacher_family.living_status === 'រៀបការ' && (
              <>
                <div>
                  <label htmlFor="spouse_name" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('partnerName', 'Spouse Name')}
                  </label>
                  <input
                    type="text"
                    id="spouse_name"
                    value={editForm.teacher_family.spouse_info.spouse_name}
                    onChange={(e) => {
                      setEditForm(prev => ({
                        ...prev,
                        teacher_family: {
                          ...prev.teacher_family,
                          spouse_info: {
                            ...prev.teacher_family.spouse_info,
                            spouse_name: e.target.value
                          }
                        }
                      }));
                    }}
                    className="mt-1 block w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('enterPartnerName', 'e.g., Jane Doe')}
                  />
                </div>

                <div>
                  <label htmlFor="spouse_occupation" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('partnerJobPlace', 'Spouse Occupation')}
                  </label>
                  <Dropdown
                    options={[
                      { value: '', label: t('selectSpouseJob', 'ជ្រើសរើសមុខរបររបស់ដៃគូរស្វាមីភរិយា') },
                      ...spouseJobOptions
                    ]}
                    value={editForm.teacher_family.spouse_info.spouse_occupation}
                    onValueChange={(value) => {
                      setEditForm(prev => ({
                        ...prev,
                        teacher_family: {
                          ...prev.teacher_family,
                          spouse_info: {
                            ...prev.teacher_family.spouse_info,
                            spouse_occupation: value
                          }
                        }
                      }));
                    }}
                    placeholder={t('selectSpouseJob', 'ជ្រើសរើសមុខរបររបស់ដៃគូរស្វាមីភរិយា')}
                    contentClassName="max-h-[200px] overflow-y-auto"
                    disabled={false}
                    className='w-full'
                  />
                </div>

                <div>
                  <label htmlFor="spouse_phone" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('partnerPhone', 'Spouse Phone')}
                  </label>
                  <input
                    type="tel"
                    id="spouse_phone"
                    value={editForm.teacher_family.spouse_info.spouse_phone}
                    onChange={(e) => {
                      setEditForm(prev => ({
                        ...prev,
                        teacher_family: {
                          ...prev.teacher_family,
                          spouse_info: {
                            ...prev.teacher_family.spouse_info,
                            spouse_phone: e.target.value
                          }
                        }
                      }));
                    }}
                    className="mt-1 block w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('enterPhone', 'e.g., 0123456789')}
                  />
                </div>

                <div>
                  <label htmlFor="spouse_place_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('placeOfBirth', 'Spouse Place of Birth')}
                  </label>
                  <input
                    type="text"
                    id="spouse_place_of_birth"
                    value={editForm.teacher_family.spouse_info.spouse_place_of_birth}
                    onChange={(e) => {
                      setEditForm(prev => ({
                        ...prev,
                        teacher_family: {
                          ...prev.teacher_family,
                          spouse_info: {
                            ...prev.teacher_family.spouse_info,
                            spouse_place_of_birth: e.target.value
                          }
                        }
                      }));
                    }}
                    className="mt-1 block w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('enterPlaceOfBirth', 'e.g., Phnom Penh')}
                  />
                </div>
              </>
            )}

            {/* Number of Children - Show when living_status is not Single (នៅលីវ) */}
            {editForm.teacher_family.living_status && editForm.teacher_family.living_status !== 'នៅលីវ' && (
              <div>
                <label htmlFor="number_of_children" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('numberOfChildren', 'Number of Children')}
                </label>
                <input
                  type="number"
                  id="number_of_children"
                  min="0"
                  value={editForm.teacher_family.number_of_children}
                  onChange={(e) => {
                    setEditForm(prev => ({
                      ...prev,
                      teacher_family: {
                        ...prev.teacher_family,
                        number_of_children: e.target.value
                      }
                    }));
                  }}
                  className="mt-1 block w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('enterNumber', 'e.g., 2')}
                />
              </div>
            )}
          </div>

          {/* Children List - Show when number_of_children > 0 */}
          {editForm.teacher_family.number_of_children && parseInt(editForm.teacher_family.number_of_children) > 0 && (
            <div className="mt-6 border-t pt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">{t('childrenInformation', 'Children Information')}</h4>
              <div className="space-y-4">
                {Array.from({ length: parseInt(editForm.teacher_family.number_of_children) || 0 }).map((_, index) => (
                  <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <label htmlFor={`child_name_${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                      {t('childName', 'Child Name')} {index + 1}
                    </label>
                    <input
                      type="text"
                      id={`child_name_${index}`}
                      value={editForm.teacher_family.children[index]?.child_name || ''}
                      onChange={(e) => {
                        setEditForm(prev => {
                          const newChildren = [...prev.teacher_family.children];
                          if (!newChildren[index]) {
                            newChildren[index] = { child_name: '' };
                          }
                          newChildren[index].child_name = e.target.value;
                          return {
                            ...prev,
                            teacher_family: {
                              ...prev.teacher_family,
                              children: newChildren
                            }
                          };
                        });
                      }}
                      className="mt-1 block w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('enterChildName', 'e.g., សូថា')}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Information Card */}
      <div className="bg-white rounded-md border border-gray-200 p-6">
        <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('account', 'Account')}
          </h3>
        </div>
        {/* Contact Information */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <div ref={usernameContainerRef}>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              {t('username', 'Username')} *
            </label>
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className='relative'>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="username"
                    value={editForm.username}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const newValue = sanitizeUsername(rawValue);
                      handleFormChange('username', newValue);

                      if (usernameDebounceRef.current) {
                        clearTimeout(usernameDebounceRef.current);
                      }
                      usernameDebounceRef.current = setTimeout(() => {
                        handleGenerateUsernameSuggestions(newValue);
                      }, 400);
                    }}
                    className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                    placeholder={t('enterUsername', 'Enter username')}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleGenerateUsernameSuggestions(editForm.username || '');
                  }}
                  className="px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-blue-50 text-gray-700"
                >
                  {t('suggestion', 'Suggestion')}
                </button>
              </div>
              {showUsernameSuggestions && usernameSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 text-xs max-h-60 overflow-auto">
                  {usernameSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="w-full text-left px-3 py-1 hover:bg-blue-50"
                      onClick={() => handleChooseUsernameSuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              {usernameAvailable === true && (
                <p className="mt-1 text-xs text-green-600">
                  {t('usernameAvailable', 'This username is available.')}
                </p>
              )}
              {usernameAvailable === false && (
                <p className="mt-1 text-xs text-red-600">
                  {t('usernameNotAvailable', 'This username is already taken')}
                </p>
              )}
              {usernameAvailable === null && editForm.username && editForm.username.trim() && (
                <p className="mt-1 text-xs text-gray-500">
                  {t('usernameSuggestionHint', 'Use Suggestion to check available username.')}
                </p>
              )}
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

      {/* Current Residence Card */}
      <div className="bg-white rounded-md border border-gray-200 p-6">
        <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('currentResidence', 'Current Residence')}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Place of Birth Card */}
      <div className="bg-white rounded-md border border-gray-200 p-6">
        <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('placeOfBirth', 'Place of Birth')}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      );

  // Render as page
  return (
    <div className="p-3 sm:p-6 pb-32">
      <div className="min-h-screen">
        {/* Back Button */}
        <Button
          variant="link"
          onClick={handleClose}
          className="flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('goBack', 'Go Back')}
        </Button>

        {/* Teacher Edit Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {formContent}
        </div>

        {/* Action Buttons for Page Mode */}
        <div className="left-0 right-0 p-4 sm:p-6 flex items-center justify-end space-x-3">
          <Button
            type="button"
            onClick={handleClose}
            variant="outline"
            disabled={pageLoading}
          >
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            form="edit-teacher-form"
            variant="primary"
            disabled={isSubmitDisabled || pageLoading}
            className="min-w-[120px]"
          >
            {pageLoading
              ? (mode === 'create'
                ? t('creating', 'Creating...')
                : t('updating', 'Updating...'))
              : (mode === 'create'
                ? t('createTeacher', 'Create Teacher')
                : t('updateTeacher', 'Update Teacher'))}
          </Button>
        </div>

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
      </div>
    </div>
  );
};

export default TeacherEditModal;
