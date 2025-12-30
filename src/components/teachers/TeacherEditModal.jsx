import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Mail, Phone, Eye, EyeOff, Lock, X, Weight, Ruler, ArrowLeft, BookOpen, Wand2 } from 'lucide-react';
import BookSelectionModal from '../modals/BookSelectionModal';
import SelectedBooksDisplay from '../modals/SelectedBooksDisplay';
import { sanitizeUsername } from '../../utils/usernameUtils';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { decryptId, isValidEncryptedId } from '../../utils/encryption';
import { convertHeightToCm, convertWeightToKg, calculateBMI } from '../../utils/physicalMeasurementUtils';
import { Button } from '../ui/Button';
import { DatePickerWithDropdowns } from '../ui/date-picker-with-dropdowns';
import Dropdown from '../ui/Dropdown';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';
import SalaryTypeDropdown from '../ui/SalaryTypeDropdown';
import ErrorDisplay from '../ui/ErrorDisplay';
import { PageLoader } from '../ui/DynamicLoader';
import ValidationSummary from '../ui/ValidationSummary';
import { useLocationData } from '../../hooks/useLocationData';
import { userService } from '../../utils/api/services/userService';
import { ethnicGroupOptions, accessibilityOptions, gradeLevelOptions, employmentTypeOptions, educationLevelOptions, trainingTypeOptions, teacherStatusOptions, subjectOptions, roleOptions, maritalStatusOptions, teachingTypeOptions, spouseJobOptions, childStatusOptions } from '../../utils/formOptions';
import { utils } from '../../utils/api';
import GroupedDropdown from '../ui/GroupedDropdown';

const TeacherEditModal = () => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { error, handleError, clearError, retry } = useErrorHandler();

  // Get encrypted teacher ID from URL
  const encryptedTeacherId = searchParams.get('id');
  const mode = searchParams.get('mode') || 'edit'; // 'create' or 'edit'

  // Track if we've already fetched the teacher data to prevent duplicate requests
  const fetchedRef = useRef(false);
  const abortControllerRef = useRef(null);

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [schoolId, setSchoolId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [showUsernameSuggestions, setShowUsernameSuggestions] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [originalUsername, setOriginalUsername] = useState('');
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [originalEmail, setOriginalEmail] = useState('');
  const [showBookModal, setShowBookModal] = useState(false);
  const [teacherNumberAvailable, setTeacherNumberAvailable] = useState(null);
  const [originalTeacherNumber, setOriginalTeacherNumber] = useState('');
  const usernameContainerRef = useRef(null);
  const usernameDebounceRef = useRef(null);
  const emailDebounceRef = useRef(null);
  const teacherNumberDebounceRef = useRef(null);

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
    gradeLevel: null, // Single grade level as string or null for មិនមាន
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
    appointed: false,
    burden: false,
    hire_date: null,
    bookIds: [],
    teacherExtraLearningTool: {
      reading_material_package: {
        _hasPackage: false,
        picture_cards: false,
      },
      math_grade1_package: {
        _hasPackage: false,
        manipulatives: false,
      },
    },
    extraLearningTool: {
      reading_material_package: {
        _hasPackage: false,
        status: '',
      },
      math_grade1_package: {
        _hasPackage: false,
        status: '',
      },
    },
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
    setInitialValues: setResidenceInitialValues
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
    setInitialValues: setBirthInitialValues
  } = useLocationData();

  // Fetch teacher data if editing
  useEffect(() => {
    // Prevent duplicate requests in React Strict Mode
    if (fetchedRef.current) {
      return;
    }

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

    fetchedRef.current = true;
    fetchTeacherData();
  }, [mode, encryptedTeacherId]);

  // Initialize form data when teacher changes
  useEffect(() => {
    if (teacher) {
      initializeFormData();
    }
  }, [teacher]);

  // Close username suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
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

      // Use teacher data already fetched in useEffect
      // No need to fetch again - avoid duplicate API call
      const fullData = teacher;

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
      const childrenArray = Array.isArray(familyData.children)
        ? familyData.children.map(child => ({
            child_name: child.child_name || '',
            status: child.status || ''
          }))
        : [];

      // Initialize teacher extra learning tools (supports new English keys + legacy Khmer keys)
      const rawTeacherExtra =
        teacherData.teacherExtraLearningTool ||
        fullData.teacherExtraLearningTool ||
        teacherData.extraLearningTool ||
        fullData.extraLearningTool ||
        {};

      let teacherExtraLearningTool;

      if (rawTeacherExtra.reading_material_package || rawTeacherExtra.math_grade1_package) {
        // New English-key structure from backend
        const readingNew = rawTeacherExtra.reading_material_package || {};
        const mathNew = rawTeacherExtra.math_grade1_package || {};

        teacherExtraLearningTool = {
          reading_material_package: {
            _hasPackage: readingNew._hasPackage === true,
            picture_cards: readingNew.picture_cards === true,
          },
          math_grade1_package: {
            _hasPackage: mathNew._hasPackage === true,
            manipulatives: mathNew.manipulatives === true,
          },
        };
      } else {
        // Legacy Khmer-key structure
        const readingLegacy = rawTeacherExtra['កញ្ចប់សម្ភារៈអំណាន'] || {};
        const mathLegacy = rawTeacherExtra['គណិតវិទ្យាថ្នាក់ដំបូង'] || {};

        teacherExtraLearningTool = {
          reading_material_package: {
            _hasPackage:
              typeof readingLegacy === 'object'
                ? readingLegacy._hasPackage === true
                : readingLegacy === true,
            picture_cards:
              typeof readingLegacy === 'object'
                ? readingLegacy['ប័ណ្ឌរូបភាព'] === true
                : false,
          },
          math_grade1_package: {
            _hasPackage:
              typeof mathLegacy === 'object'
                ? mathLegacy._hasPackage === true
                : mathLegacy === true,
            manipulatives:
              typeof mathLegacy === 'object'
                ? mathLegacy['សម្ភារឧបទេស'] === true
                : false,
          },
        };
      }

      // Initialize extraLearningTool (package metadata) with new English-key structure, mapping legacy if needed
      const rawExtraTool =
        teacherData.extraLearningTool ||
        fullData.extraLearningTool ||
        {};

      let extraLearningTool;

      if (rawExtraTool.reading_material_package || rawExtraTool.math_grade1_package) {
        const readingExtra = rawExtraTool.reading_material_package || {};
        const mathExtra = rawExtraTool.math_grade1_package || {};

        extraLearningTool = {
          reading_material_package: {
            _hasPackage: readingExtra._hasPackage === true,
            status: readingExtra.status || '',
          },
          math_grade1_package: {
            _hasPackage: mathExtra._hasPackage === true,
            status: mathExtra.status || '',
          },
        };
      } else {
        // Legacy structure with Khmer keys or flat values
        const readingLegacyStatus = rawExtraTool['កញ្ចប់សម្ភារៈអំណាន'];
        const mathLegacyStatus = rawExtraTool['គណិតវិទ្យាថ្នាក់ដំបូង'];

        extraLearningTool = {
          reading_material_package: {
            _hasPackage: !!readingLegacyStatus,
            status: typeof readingLegacyStatus === 'string' ? readingLegacyStatus : '',
          },
          math_grade1_package: {
            _hasPackage: !!mathLegacyStatus,
            status: typeof mathLegacyStatus === 'string' ? mathLegacyStatus : '',
          },
        };
      }

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
        gradeLevel: teacherData.gradeLevel !== undefined ? teacherData.gradeLevel : null,
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
        appointed: typeof teacherData.appointed === 'boolean' ? teacherData.appointed : false,
        burden: typeof teacherData.burden === 'boolean' ? teacherData.burden : false,
        hire_date: teacherData.hire_date ? new Date(teacherData.hire_date) : null,
        bookIds: Array.isArray(fullData.bookIds) ? fullData.bookIds : [],
        teacherExtraLearningTool,
        extraLearningTool,
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
      setOriginalEmail(fullData.email || '');
      setEmailAvailable(null);
      setOriginalTeacherNumber((teacherData.teacher_number || teacherData.teacherNumber) || '');
      setTeacherNumberAvailable(null);

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

  const handleClose = () => {
    // Redirect based on user role
    const currentUser = utils.user.getUserData();
    const redirectPath = currentUser?.roleId === 14 ? '/teachers' : '/teachers';
    navigate(redirectPath, { replace: true });
  };

  const isValidEmailFormat = (email) => {
    // Basic email format validation using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
    if (field === 'email') {
      const trimmedEmail = value?.trim() || '';

      // If email is empty, mark as invalid
      if (!trimmedEmail) {
        setEmailAvailable(false);
      }
      // If email format is invalid, mark as invalid
      else if (!isValidEmailFormat(trimmedEmail)) {
        setEmailAvailable(false);
      }
      // If email is unchanged from the original, treat it as available
      else if (trimmedEmail === (originalEmail || '')) {
        setEmailAvailable(true);
      } else {
        setEmailAvailable(null);
        // Debounce email validation API call
        if (emailDebounceRef.current) {
          clearTimeout(emailDebounceRef.current);
        }
        emailDebounceRef.current = setTimeout(async () => {
          try {
            const result = await userService.validateEmail(trimmedEmail);
            // If email exists, it's not available; if it doesn't exist, it's available
            setEmailAvailable(!result.exists);
          } catch (error) {
            console.error('Error validating email:', error);
          }
        }, 500);
      }
    }
    if (field === 'teacher_number') {
      const trimmedTeacherNumber = value?.trim() || '';

      // If teacher number is unchanged from the original, treat it as available
      if (trimmedTeacherNumber === (originalTeacherNumber || '')) {
        setTeacherNumberAvailable(true);
      } else if (!trimmedTeacherNumber) {
        setTeacherNumberAvailable(null);
      } else {
        setTeacherNumberAvailable(null);
        // Debounce teacher number validation API call
        if (teacherNumberDebounceRef.current) {
          clearTimeout(teacherNumberDebounceRef.current);
        }
        teacherNumberDebounceRef.current = setTimeout(async () => {
          try {
            const result = await userService.checkTeacherNumber(trimmedTeacherNumber);
            console.log('🔍 Full result object:', result);
            console.log('🔍 Result type:', typeof result);
            console.log('🔍 Result.exists:', result?.exists);
            console.log('🔍 Result.data:', result?.data);

            // The API returns { exists: boolean } directly (axios interceptor extracts data)
            const exists = result?.exists;
            console.log('🔍 Final exists value:', exists, 'Type:', typeof exists);

            // If teacher number exists (exists: true), it's not available (false)
            // If teacher number doesn't exist (exists: false), it's available (true)
            console.log('🔍 Setting teacherNumberAvailable to:', exists === false);
            setTeacherNumberAvailable(exists === false);
          } catch (error) {
            console.error('Error checking teacher number:', error);
          }
        }, 500);
      }
    }
  };

  const isUsernameInvalid = () => {
    const username = editForm.username || '';
    if (!username.trim()) return false;
    // Only allow English letters, numbers, dot, underscore, hyphen
    const usernameRegex = /^[A-Za-z0-9._-]+$/;
    return !usernameRegex.test(username);
  };

  const isPasswordInvalid = () => {
    const password = mode === 'create' ? editForm.password : editForm.newPassword;
    if (!password) return false;
    if (password.length < 8) return true;
    // Reject if contains non-English characters (only accept ASCII)
    const hasNonEnglish = /[^\x00-\x7F]/.test(password);
    return hasNonEnglish;
  };

  const getPasswordStrength = (password) => {
    if (!password) return { level: 0, label: '', color: 'bg-gray-300' };

    let strength = 0;

    // Length check
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (password.length >= 16) strength++;

    // Has lowercase
    if (/[a-z]/.test(password)) strength++;

    // Has uppercase
    if (/[A-Z]/.test(password)) strength++;

    // Has numbers
    if (/[0-9]/.test(password)) strength++;

    // Has special characters
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

    if (strength <= 2) {
      return { level: 1, label: t('weakPassword', 'Weak'), color: 'bg-red-500' };
    } else if (strength <= 4) {
      return { level: 2, label: t('mediumPassword', 'Medium'), color: 'bg-orange-500' };
    } else {
      return { level: 3, label: t('strongPassword', 'Strong'), color: 'bg-green-500' };
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
      .map(child => ({
        child_name: (child?.child_name || '').trim(),
        status: (child?.status || '').toString().trim() || undefined
      }))
      // Keep only children that have a non-empty name, same as before
      .filter(child => child.child_name);

    // Align children array with number_of_children to avoid sending
    // an outdated longer children list when the count has been reduced.
    let effectiveChildren = cleanedChildren;

    if (typeof parsedNumber === 'number' && !Number.isNaN(parsedNumber)) {
      if (parsedNumber <= 0) {
        // No children expected -> do not send any children array
        effectiveChildren = [];
      } else if (effectiveChildren.length > parsedNumber) {
        // Trim extra children so length matches the new count
        effectiveChildren = effectiveChildren.slice(0, parsedNumber);
      }
    }

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
      children: effectiveChildren.length > 0 ? effectiveChildren : undefined
    };

    return payload;
  };

  const isWeightInvalid = () => {
    const { weight } = editForm;
    if (!weight) return false;
    const weightStr = String(weight).trim();
    const weightRegex = /^[0-9]{1,3}(\.[0-9]{1,2})?$/; // numeric(5,2)
    if (!weightRegex.test(weightStr)) return true;
    const w = parseFloat(weightStr);
    return !Number.isNaN(w) && (w < 10 || w > 200);
  };

  const isHeightInvalid = () => {
    const { height } = editForm;
    if (!height) return false;
    const heightStr = String(height).trim();
    const heightRegex = /^[0-9]{1,3}(\.[0-9])?$/; // numeric(4,1)
    if (!heightRegex.test(heightStr)) return true;
    const h = parseFloat(heightStr);
    return !Number.isNaN(h) && (h < 10 || h > 250);
  };

  const isPhysicalInvalid = () => {
    return isWeightInvalid() || isHeightInvalid();
  };

  const getValidationErrors = () => {
    const errorsList = [];

    // Check required fields
    if (!editForm.firstName?.trim()) {
      errorsList.push({
        field: t('firstName', 'នាម'),
        messages: [t('fieldRequired', 'ត្រូវបំពេញជាចាំបាច់')]
      });
    }

    if (!editForm.lastName?.trim()) {
      errorsList.push({
        field: t('lastName', 'គោត្តនាម'),
        messages: [t('fieldRequired', 'ត្រូវបំពេញជាចាំបាច់')]
      });
    }

    if (!editForm.gender) {
      errorsList.push({
        field: t('gender', 'ភេទ'),
        messages: [t('fieldRequired', 'ត្រូវបំពេញជាចាំបាច់')]
      });
    }

    if (!editForm.dateOfBirth) {
      errorsList.push({
        field: t('dateOfBirth', 'ថ្ងៃខែឆ្នាំកំណើត'),
        messages: [t('fieldRequired', 'ត្រូវបំពេញជាចាំបាច់')]
      });
    }

    if (!editForm.nationality) {
      errorsList.push({
        field: t('nationality', 'សញ្ជាតិ'),
        messages: [t('fieldRequired', 'ត្រូវបំពេញជាចាំបាច់')]
      });
    }

    if (!editForm.username?.trim()) {
      errorsList.push({
        field: t('username', 'ឈ្មោះអ្នកប្រើ'),
        messages: [t('fieldRequired', 'ត្រូវបំពេញជាចាំបាច់')]
      });
    } else if (isUsernameInvalid()) {
      errorsList.push({
        field: t('username', 'ឈ្មោះអ្នកប្រើ'),
        messages: [t('usernameContainsInvalidChars', 'ឈ្មោះអ្នកប្រើមានលក្ខណៈដែលមិនត្រឹមត្រូវ')]
      });
    } else if (usernameAvailable === false) {
      errorsList.push({
        field: t('username', 'ឈ្មោះអ្នកប្រើ'),
        messages: [t('usernameNotAvailable', 'ឈ្មោះអ្នកប្រើនេះត្រូវបានប្រើរួចហើយ')]
      });
    }

    if (!editForm.employment_type) {
      errorsList.push({
        field: t('employmentType', 'ប្រភេទការងារ'),
        messages: [t('fieldRequired', 'ាលលេខនេះគឺចាំបាច់')]
      });
    }

    if (!editForm.hire_date) {
      errorsList.push({
        field: t('hireDate', 'ថ្ងៃឡើងងារ'),
        messages: [t('fieldRequired', 'ត្រូវបំពេញជាចាំបាច់')]
      });
    }

    if (!editForm.role) {
      errorsList.push({
        field: t('role', 'តួនាទី'),
        messages: [t('fieldRequired', 'ត្រូវបំពេញជាចាំបាច់')]
      });
    }

    // Password validation for create mode
    if (mode === 'create' && !editForm.password?.trim()) {
      errorsList.push({
        field: t('password', 'ពាក្យសម្ងាត់'),
        messages: [t('fieldRequired', 'ត្រូវបំពេញជាចាំបាច់')]
      });
    } else if (mode === 'create' && isPasswordInvalid()) {
      errorsList.push({
        field: t('password', 'ពាក្យសម្ងាត់'),
        messages: [t('passwordTooShort', 'ពាក្យសម្ងាត់ត្រូវមាន​យ៉ាងហោចណាស់ 8 តួអក្សរ')]
      });
    }

    // Password validation for edit mode (if new password provided)
    if (mode === 'edit' && editForm.newPassword?.trim() && isPasswordInvalid()) {
      errorsList.push({
        field: t('newPassword', 'ពាក្យសម្ងាត់ថ្មី'),
        messages: [t('passwordTooShort', 'ពាក្យសម្ងាត់ត្រូវមាន​យ៉ាងហោចណាស់ 8 តួអក្សរ')]
      });
    }

    // Email validation (if provided)
    if (editForm.email?.trim() && emailAvailable === false) {
      errorsList.push({
        field: t('email', 'អ៊ីមែល'),
        messages: [t('emailNotAvailable', 'អ៊ីមែលនេះត្រូវបានប្រើរួចហើយ')]
      });
    }

    // Teacher number validation (if provided)
    if (editForm.teacher_number?.trim() && teacherNumberAvailable === false) {
      errorsList.push({
        field: t('teacherNumber', 'លេខគ្រូ'),
        messages: [t('teacherNumberNotAvailable', 'លេខគ្រូនេះត្រូវបានប្រើរួចហើយ')]
      });
    }

    // Weight validation
    if (editForm.weight && isWeightInvalid()) {
      const weightStr = String(editForm.weight).trim();
      const weightRegex = /^[0-9]{1,3}(\.[0-9]{1,2})?$/;
      const weightMessages = [];

      if (!weightRegex.test(weightStr)) {
        weightMessages.push(t('weightFormatError', 'សូមបញ្ចូលលេខត្រឹមត្រូវ (10-200 គីឡូក្រាម)'));
      } else {
        const w = parseFloat(weightStr);
        if (w < 10) {
          weightMessages.push(t('weightMinError', 'ទម្ងន់ត្រូវតែធំជាង ឬស្មើ 10 គីឡូក្រាម'));
        }
        if (w > 200) {
          weightMessages.push(t('weightMaxError', 'ទម្ងន់ត្រូវតែតិចជាង ឬស្មើ 200 គីឡូក្រាម'));
        }
      }

      if (weightMessages.length > 0) {
        errorsList.push({
          field: t('weight', 'ទម្ងន់'),
          messages: weightMessages
        });
      }
    }

    // Height validation
    if (editForm.height && isHeightInvalid()) {
      const heightStr = String(editForm.height).trim();
      const heightRegex = /^[0-9]{1,3}(\.[0-9])?$/;
      const heightMessages = [];

      if (!heightRegex.test(heightStr)) {
        heightMessages.push(t('heightFormatError', 'សូមបញ្ចូលលេខត្រឹមត្រូវ (10-250 សង់ទីម៉ែត្រ)'));
      } else {
        const h = parseFloat(heightStr);
        if (h < 10) {
          heightMessages.push(t('heightMinError', 'កម្ពស់ត្រូវតែធំជាង ឬស្មើ 10 សង់ទីម៉ែត្រ'));
        }
        if (h > 250) {
          heightMessages.push(t('heightMaxError', 'កម្ពស់ត្រូវតែតិចជាង ឬស្មើ 250 សង់ទីម៉ែត្រ'));
        }
      }

      if (heightMessages.length > 0) {
        errorsList.push({
          field: t('height', 'កម្ពស់'),
          messages: heightMessages
        });
      }
    }

    return errorsList;
  };

  const validationErrorsList = getValidationErrors();
  const hasValidationErrors = validationErrorsList.length > 0;

  const validatePhysicalFields = () => {
    const { weight, height } = editForm;

    // Allow empty values (both fields are optional)
    if (weight) {
      const weightStr = String(weight).trim();
      const weightRegex = /^[0-9]{1,3}(\.[0-9]{1,2})?$/; // numeric(5,2)
      if (!weightRegex.test(weightStr)) {
        showError(
          t(
            'invalidWeightFormat',
            'សូមបញ្ចូលទម្ងន់ជាលេខដោយមានខ្ទង់ទសភាគអតិបរមា ២ ខ្ទង់ (ឧ. 45, 45.5 ឬ 45.75)'
          )
        );
        return false;
      }
      const w = parseFloat(weightStr);
      if (!Number.isNaN(w) && w < 10) {
        showError(
          t(
            'invalidWeightRange',
            'ទម្ងន់ត្រូវតែធំជាង ឬស្មើ 10 គីឡូក្រាម'
          )
        );
        return false;
      }
      if (!Number.isNaN(w) && w > 200) {
        showError(
          t(
            'invalidWeightMax',
            'ទម្ងន់ត្រូវតែតិចជាង ឬស្មើ 200 គីឡូក្រាម'
          )
        );
        return false;
      }
    }

    if (height) {
      const heightStr = String(height).trim();
      const heightRegex = /^[0-9]{1,3}(\.[0-9])?$/; // numeric(4,1)
      if (!heightRegex.test(heightStr)) {
        showError(
          t(
            'invalidHeightFormat',
            'សូមបញ្ចូលកម្ពស់ជាលេខដោយមានខ្ទង់ទសភាគអតិបរមា ១ ខ្ទង់ (ឧ. 150 ឬ 150.5)'
          )
        );
        return false;
      }
      const h = parseFloat(heightStr);
      if (!Number.isNaN(h) && h < 10) {
        showError(
          t(
            'invalidHeightRange',
            'កម្ពស់ត្រូវតែធំជាង ឬស្មើ 10 សង់ទីម៉ែត្រ'
          )
        );
        return false;
      }
      if (!Number.isNaN(h) && h > 250) {
        showError(
          t(
            'invalidHeightMax',
            'កម្ពស់ត្រូវតែតិចជាង ឬស្មើ 250 សង់ទីម៉ែត្រ'
          )
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validatePhysicalFields()) {
      return;
    }

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
          // Basic Personal Information
          username: editForm.username.trim(),
          first_name: editForm.firstName.trim(),
          last_name: editForm.lastName.trim(),
          email: editForm.email?.trim() || undefined,
          phone: editForm.phone?.trim() || undefined,
          password: editForm.password.trim(),
          roleId: editForm.role ? parseInt(editForm.role) : 8,

          // Date & Identity
          date_of_birth: formatDate(editForm.dateOfBirth),
          gender: editForm.gender || undefined,
          nationality: editForm.nationality?.trim() || undefined,
          profile_picture: editForm.profilePicture || undefined,

          // Physical Information
          weight_kg: editForm.weight ? parseFloat(editForm.weight) : undefined,
          height_cm: editForm.height ? parseFloat(editForm.height) : undefined,
          bmi: editForm.bmi ? parseFloat(editForm.bmi) : undefined,

          // Location Information
          ethnic_group: editForm.ethnicGroup?.trim() || undefined,
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

          // Health & Accessibility
          accessibility: editForm.accessibility.length > 0 ? editForm.accessibility : undefined,

          // Teacher-Specific Fields
          teacher_number: editForm.teacher_number || undefined,
          schoolId: schoolId || undefined,
          gradeLevel: editForm.gradeLevel === null ? null : (editForm.gradeLevel?.trim() || undefined),
          employment_type: editForm.employment_type || undefined,
          salaryTypeId: editForm.salary_type ? parseInt(editForm.salary_type) : undefined,
          educationLevel: editForm.education_level || undefined,
          trainingType: editForm.training_type || undefined,
          teachingType: editForm.teaching_type || undefined,
          teacherStatus: editForm.teacher_status || undefined,
          subject: editForm.subject.length > 0 ? editForm.subject : undefined,
          hire_date: editForm.hire_date ? formatDate(editForm.hire_date) : undefined,
          appointed: editForm.appointed,
          burden: editForm.burden,

          // Teacher Learning Tools
          teacherExtraLearningTool: editForm.teacherExtraLearningTool || undefined,
          extraLearningTool: editForm.extraLearningTool || undefined,

          // Books Assignment
          bookIds: editForm.bookIds.length > 0 ? editForm.bookIds : null,

          // Family Information
          teacher_family: buildTeacherFamilyPayload()
        };

        // Remove undefined/empty values - but keep bookIds, gradeLevel, and teacherExtraLearningTool even when null
        const cleanPayload = Object.keys(createPayload).reduce((acc, k) => {
          // Special cases: keep bookIds, gradeLevel, and learning tool objects even when null/false so backend sees explicit values
          if (k === 'bookIds' || k === 'gradeLevel' || k === 'teacherExtraLearningTool' || k === 'extraLearningTool') {
            acc[k] = createPayload[k];
            return acc;
          }

          // For objects (residence, placeOfBirth, teacher_family), only keep if they have at least one defined value
          if (typeof createPayload[k] === 'object' && createPayload[k] !== null) {
            const hasDefinedValue = Object.values(createPayload[k]).some(v => v !== undefined && v !== null && v !== '');
            if (hasDefinedValue) {
              acc[k] = createPayload[k];
            }
            return acc;
          }

          // For other values, only keep if defined, not null, and not empty string
          if (createPayload[k] !== undefined && createPayload[k] !== null && createPayload[k] !== '') {
            acc[k] = createPayload[k];
          }
          return acc;
        }, {});

        Object.assign(createPayload, cleanPayload);

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
          // Basic Personal Information
          username: editForm.username?.trim(),
          first_name: editForm.firstName?.trim(),
          last_name: editForm.lastName?.trim(),
          email: editForm.email?.trim() || undefined,
          phone: editForm.phone?.trim() || undefined,
          roleId: editForm.role ? parseInt(editForm.role) : undefined,

          // Date & Identity
          date_of_birth: formatDate(editForm.dateOfBirth),
          gender: editForm.gender || undefined,
          nationality: editForm.nationality?.trim() || undefined,
          profile_picture: editForm.profilePicture || undefined,

          // Physical Information
          weight_kg: editForm.weight ? parseFloat(editForm.weight) : undefined,
          height_cm: editForm.height ? parseFloat(editForm.height) : undefined,
          bmi: editForm.bmi ? parseFloat(editForm.bmi) : undefined,

          // Location Information
          ethnic_group: editForm.ethnicGroup?.trim() || undefined,
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

          // Health & Accessibility
          accessibility: editForm.accessibility.length > 0 ? editForm.accessibility : undefined,

          // Teacher-Specific Fields
          teacher_number: editForm.teacher_number || undefined,
          schoolId: schoolId || undefined,
          gradeLevel: editForm.gradeLevel === null ? null : (editForm.gradeLevel?.trim() || undefined),
          employment_type: editForm.employment_type || undefined,
          salaryTypeId: editForm.salary_type ? parseInt(editForm.salary_type) : undefined,
          educationLevel: editForm.education_level || undefined,
          trainingType: editForm.training_type || undefined,
          teachingType: editForm.teaching_type || undefined,
          teacherStatus: editForm.teacher_status || undefined,
          subject: editForm.subject.length > 0 ? editForm.subject : undefined,
          hire_date: editForm.hire_date ? formatDate(editForm.hire_date) : undefined,
          appointed: typeof editForm.appointed === 'boolean' ? editForm.appointed : undefined,
          burden: typeof editForm.burden === 'boolean' ? editForm.burden : undefined,

          // Teacher Learning Tools
          teacherExtraLearningTool: editForm.teacherExtraLearningTool || undefined,

          // Books Assignment
          bookIds: editForm.bookIds.length > 0 ? editForm.bookIds : null,

          // Family Information
          teacher_family: buildTeacherFamilyPayload()
        };

        // Add password if provided
        if (editForm.newPassword && editForm.newPassword.trim()) {
          updatePayload.newPassword = editForm.newPassword.trim();
        }

        // Remove undefined/empty values - but keep bookIds, gradeLevel, and learning tool objects even when null
        const cleanUpdatePayload = Object.keys(updatePayload).reduce((acc, k) => {
          // Special cases: keep bookIds, gradeLevel, and learning tool objects even when null/false so backend sees explicit values
          if (k === 'bookIds' || k === 'gradeLevel' || k === 'teacherExtraLearningTool' || k === 'extraLearningTool') {
            acc[k] = updatePayload[k];
            return acc;
          }

          // For objects (residence, placeOfBirth, teacher_family), only keep if they have at least one defined value
          if (typeof updatePayload[k] === 'object' && updatePayload[k] !== null) {
            const hasDefinedValue = Object.values(updatePayload[k]).some(v => v !== undefined && v !== null && v !== '');
            if (hasDefinedValue) {
              acc[k] = updatePayload[k];
            }
            return acc;
          }

          // For other values, only keep if defined, not null, and not empty string
          if (updatePayload[k] !== undefined && updatePayload[k] !== null && updatePayload[k] !== '') {
            acc[k] = updatePayload[k];
          }
          return acc;
        }, {});

        Object.assign(updatePayload, cleanUpdatePayload);

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
    !editForm.hire_date ||
    !editForm.role ||
    (mode === 'create' && !editForm.password?.trim()) ||
    (mode === 'create' && isPasswordInvalid()) ||
    (mode === 'edit' && editForm.newPassword?.trim() && isPasswordInvalid()) ||
    usernameAvailable === false ||
    (editForm.email?.trim() && emailAvailable === false) ||
    (editForm.email?.trim() && emailAvailable === null && (editForm.email || '') !== (originalEmail || '')) ||
    (editForm.teacher_number?.trim() && teacherNumberAvailable === false) ||
    isPhysicalInvalid() ||
    isUsernameInvalid();

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
          message={t('loadingTeachers', 'Loading teacher...')}
          className="min-h-screen"
        />
      </div>
    );
  }

  // Form content JSX
  const formContent = (
    <form id="edit-teacher-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information Card */}
      <div className="bg-white rounded-md border border-gray-200 p-6">
        <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('personalInformation', 'Personal Information')}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              {t('lastName', 'Last Name')} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
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
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              {t('firstName', 'First Name')} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
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
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <Weight className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                id="weight"
                value={editForm.weight}
                onChange={(e) => handleFormChange('weight', e.target.value)}
                onBlur={(e) => {
                  const converted = convertWeightToKg(e.target.value);
                  handleFormChange('weight', converted);
                  // Auto-calculate BMI if height is available
                  if (converted && editForm.height) {
                    const bmi = calculateBMI(converted, editForm.height);
                    handleFormChange('bmi', bmi);
                  }
                }}
                className={`mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border focus:scale-[1.01] hover:shadow-md ${isWeightInvalid()
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-green-500 focus:border-green-500 hover:border-gray-400'
                  }`}
                placeholder={t('enterWeight', 'e.g., 45 or 0.45')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
              {t('height', 'Height')} ({t('cm', 'cm')})
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <Ruler className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                id="height"
                value={editForm.height}
                onChange={(e) => handleFormChange('height', e.target.value)}
                onBlur={(e) => {
                  const converted = convertHeightToCm(e.target.value);
                  handleFormChange('height', converted);
                  // Auto-calculate BMI if weight is available
                  if (converted && editForm.weight) {
                    const bmi = calculateBMI(editForm.weight, converted);
                    handleFormChange('bmi', bmi);
                  }
                }}
                className={`mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border focus:scale-[1.01] hover:shadow-md ${isHeightInvalid()
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-green-500 focus:border-green-500 hover:border-gray-400'
                  }`}
                placeholder={t('enterHeight', 'e.g., 170 or 1.7')}
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
        <div className='flex sm:flex-row flex-col justify-between items-start border-b border-gray-100'>
          <div className="flex items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('employmentInformation', 'Employment Information')}
            </h3>
          </div>

        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6'>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <BookOpen className="inline w-4 h-4 mr-2" />
              {t('gradeLevel', 'Grade Level')}
            </label>
            <Dropdown
              options={[
                { value: null, label: t('noGradeLevel', 'មិនមាន') },
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
            {editForm.role === '14' ? (
              <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-700">
                {roleOptions.find(role => role.value === '14')?.label || 'នាយកសាលារៀន'}
                <span className="ml-2 text-xs text-gray-500">({t('cannotChange', 'Cannot change')})</span>
              </div>
            ) : (
              <Dropdown
                options={[
                  { value: '', label: t('selectRole', 'Select Role') },
                  ...roleOptions.filter(role => role.value !== '14')
                ]}
                value={editForm.role}
                onValueChange={(value) => handleFormChange('role', value)}
                placeholder={t('selectRole', 'Select Role')}
                contentClassName="max-h-[200px] overflow-y-auto"
                disabled={false}
                className='w-full'
              />
            )}
          </div>

          {(editForm.employment_type === 'កិច្ចសន្យា' || editForm.employment_type === 'កិច្ចព្រមព្រៀង') && (
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
          )}

          <div>
            <label htmlFor="teacher_number" className="block text-sm font-medium text-gray-700 mb-1">
              {t('teacherNumber', 'Teacher Number')}
            </label>
            <div className="relative">
              <input
                type="text"
                id="teacher_number"
                value={editForm.teacher_number}
                onChange={(e) => handleFormChange('teacher_number', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm text-sm transition-all duration-300 border focus:scale-[1.01] hover:shadow-md ${
                  editForm.teacher_number && teacherNumberAvailable === false
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : editForm.teacher_number && teacherNumberAvailable === true
                      ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400'
                }`}
                placeholder={t('teacherNumber', 'e.g., T00000001')}
              />
              {editForm.teacher_number && teacherNumberAvailable === false && (
                <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  ✕ {t('teacherNumberExists', 'This teacher number is already in use')}
                </div>
              )}
              {editForm.teacher_number && teacherNumberAvailable === true && (
                <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  ✓ {t('teacherNumberAvailable', 'Teacher number is available')}
                </div>
              )}
            </div>
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
          {/* Appointment and burden status - only for specific roles (14, 15) */}
          {['14', '15'].includes(editForm.role) && (
            <div className="flex flex-col gap-3 mt-6 md:mt-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('appointmentStatus', 'Appointment / Burden')}
              </label>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    checked={!!editForm.appointed}
                    onChange={(e) =>
                      setEditForm(prev => ({
                        ...prev,
                        appointed: e.target.checked
                      }))
                    }
                  />
                  <span>{t('appointed', 'Appointed')}</span>
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    checked={!!editForm.burden}
                    onChange={(e) =>
                      setEditForm(prev => ({
                        ...prev,
                        burden: e.target.checked
                      }))
                    }
                  />
                  <span>{t('burden', 'Burden')}</span>
                </label>
              </div>
            </div>
          )}
        </div>
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('trainingInformation', 'Training Information')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>
        </div>

        {/* Extra Learning Tool Section */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('extraLearningTool', 'Extra Learning Tool')}</h3>

          {(() => {
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(editForm.teacherExtraLearningTool).map(([category, tools]) => {
                  const obj = tools || {};

                  // Determine main detail key (first non-_hasPackage key)
                  const detailKeys = Object.keys(obj).filter(k => k !== '_hasPackage');
                  const detailKey = detailKeys[0];

                  const hasPackage = !!obj._hasPackage;
                  const detailFlag = detailKey ? !!obj[detailKey] : false;

                  return (
                    <div
                      key={category}
                      className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white shadow-sm"
                    >
                      <div className="font-medium text-gray-900 mb-2">
                        {getCategoryLabel(category)}
                      </div>

                      <div className="space-y-3 text-sm">
                        {/* Has Package checkbox */}
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-gray-700">
                            {t('hasPackage', 'Has Package')}
                          </span>
                          <span className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={hasPackage}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setEditForm(prev => ({
                                  ...prev,
                                  teacherExtraLearningTool: {
                                    ...prev.teacherExtraLearningTool,
                                    [category]: {
                                      ...(prev.teacherExtraLearningTool[category] || {}),
                                      _hasPackage: checked,
                                      // Clear detail checkbox if unchecking hasPackage
                                      ...(detailKey && !checked ? { [detailKey]: false } : {})
                                    },
                                  },
                                }));
                              }}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </span>
                        </label>

                        {/* Detail tool checkbox - only show if hasPackage is true */}
                        {detailKey && hasPackage && (
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-gray-700">
                              {getDetailLabel(detailKey)}
                            </span>
                            <span className="inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={detailFlag}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setEditForm(prev => ({
                                    ...prev,
                                    teacherExtraLearningTool: {
                                      ...prev.teacherExtraLearningTool,
                                      [category]: {
                                        ...(prev.teacherExtraLearningTool[category] || {}),
                                        [detailKey]: checked,
                                      },
                                    },
                                  }));
                                }}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </span>
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Family Information Section */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('familyInformation', 'Family Information')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <label
                    htmlFor="spouse_occupation"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t('partnerJobPlace', 'Spouse Occupation')}
                  </label>

                  <GroupedDropdown
                    options={[
                      ...spouseJobOptions, // Your grouped job options
                    ]}
                    value={editForm.teacher_family.spouse_info.spouse_occupation}
                    onValueChange={(value) => {
                      setEditForm((prev) => ({
                        ...prev,
                        teacher_family: {
                          ...prev.teacher_family,
                          spouse_info: {
                            ...prev.teacher_family.spouse_info,
                            spouse_occupation: value,
                          },
                        },
                      }));
                    }}
                    placeholder={t('selectSpouseJob', 'ជ្រើសរើសមុខរបររបស់ដៃគូរស្វាមីភរិយា')}
                    contentClassName="max-h-[200px] overflow-y-auto"
                    disabled={false}
                    className="w-full"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: parseInt(editForm.teacher_family.number_of_children) || 0 }).map((_, index) => (
                  <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-3">
                        <div>
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
                                  newChildren[index] = { child_name: '', status: '' };
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
                        <div>
                          <label htmlFor={`child_status_${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                            {t('childStatus', 'Child Status')}
                          </label>
                          <Dropdown
                            id={`child_status_${index}`}
                            options={childStatusOptions}
                            value={editForm.teacher_family.children[index]?.status || ''}
                            onValueChange={(value) => {
                              setEditForm(prev => {
                                const newChildren = [...prev.teacher_family.children];
                                if (!newChildren[index]) {
                                  newChildren[index] = { child_name: '', status: '' };
                                }
                                newChildren[index].status = value;
                                return {
                                  ...prev,
                                  teacher_family: {
                                    ...prev.teacher_family,
                                    children: newChildren
                                  }
                                };
                              });
                            }}
                            placeholder={t('selectChildStatus', 'Select status')}
                            contentClassName="max-h-[200px] overflow-y-auto"
                            disabled={false}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mt-6 inline-flex items-center justify-center h-10 w-10 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                        onClick={() => {
                          setEditForm(prev => {
                            const prevCount = parseInt(prev.teacher_family.number_of_children) || 0;
                            const newChildren = (prev.teacher_family.children || []).filter((_, i) => i !== index);
                            const newCount = Math.max(0, prevCount - 1);
                            return {
                              ...prev,
                              teacher_family: {
                                ...prev.teacher_family,
                                number_of_children: newCount ? String(newCount) : '',
                                children: newChildren
                              }
                            };
                          });
                        }}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">{t('remove', 'Remove')}</span>
                      </button>
                    </div>
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
              <div className='relative'>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
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
                  className={`mt-1 block w-full pl-10 pr-10 rounded-md shadow-sm text-sm transition-all duration-300 border focus:scale-[1.01] hover:shadow-md ${isUsernameInvalid()
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400'
                    }`}
                  placeholder={t('enterUsername', 'Enter username')}
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    handleGenerateUsernameSuggestions(editForm.username || '');
                  }}
                  title={t('suggestion', 'Generate suggestions')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <Wand2 className="h-4 w-4" />
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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {mode === 'create' ? t('password', 'Password') : t('newPassword', 'New Password')} {mode === 'create' && '*'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={mode === 'create' ? editForm.password : editForm.newPassword}
                onChange={(e) => handleFormChange(mode === 'create' ? 'password' : 'newPassword', e.target.value)}
                className="mt-1 block w-full pl-10 pr-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                placeholder={mode === 'create' ? t('enterPassword', 'Enter password') : t('enterNewPassword')}
                autoComplete="new-password"
                required={mode === 'create'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-10"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {(mode === 'create' ? editForm.password : editForm.newPassword) && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">{t('passwordStrength', 'Password Strength')}</span>
                  <span className={`text-xs font-medium ${getPasswordStrength(mode === 'create' ? editForm.password : editForm.newPassword).color.replace('bg-', 'text-')}`}>
                    {getPasswordStrength(mode === 'create' ? editForm.password : editForm.newPassword).label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${getPasswordStrength(mode === 'create' ? editForm.password : editForm.newPassword).color}`}
                    style={{ width: `${Math.min(((mode === 'create' ? editForm.password : editForm.newPassword).length / 8) * 100, 100)}%` }}
                  />
                </div>
                {(mode === 'create' ? editForm.password : editForm.newPassword).length < 8 && (
                  <p className="text-xs text-orange-600 mt-1">
                    {t('passwordTooShort', 'Password must be at least 8 characters')}
                  </p>
                )}
                {(mode === 'create' ? editForm.password : editForm.newPassword).length >= 8 && /[^\x00-\x7F]/.test(mode === 'create' ? editForm.password : editForm.newPassword) && (
                  <p className="text-xs text-red-600 mt-1">
                    {t('passwordEnglishOnly', 'Password must contain only English characters')}
                  </p>
                )}
                {(mode === 'create' ? editForm.password : editForm.newPassword).length >= 8 && !/[^\x00-\x7F]/.test(mode === 'create' ? editForm.password : editForm.newPassword) && (
                  <p className="text-xs text-green-600 mt-1">
                    {t('passwordSufficient', 'Password length is sufficient')}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('email', 'Email')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                value={editForm.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                className={`mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 ${emailAvailable === false
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500 hover:border-red-400'
                    : emailAvailable === true
                      ? 'border-green-500 focus:ring-green-500 focus:border-green-500 hover:border-green-400'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400'
                  } focus:scale-[1.01] hover:shadow-md`}
                placeholder={t('enterEmail', 'Enter email address')}
              />
            </div>
            {emailAvailable === true && (
              <p className="mt-1 text-xs text-green-600">
                {t('emailAvailable', 'This email is available.')}
              </p>
            )}
            {emailAvailable === false && (
              <p className="mt-1 text-xs text-red-600">
                {t('emailNotAvailable', 'This email is already in use')}
              </p>
            )}
            {emailAvailable === null && editForm.email && editForm.email.trim() && (
              <p className="mt-1 text-xs text-gray-500">
                {t('emailValidationHint', 'Checking email availability...')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              {t('phone', 'Phone')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
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
    <div className="relative">
      <div className="p-3 sm:p-6">
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
        {formContent}

        {/* Books Section */}
        <div className="bg-white rounded-md border border-gray-200 p-6 my-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('teacherBooks', 'Teacher Books')}
            </h3>
            <Button
              type="button"
              onClick={() => setShowBookModal(true)}
              variant="success"
              size="sm"
              className="flex items-center justify-center gap-2 h-11"
            >
              <BookOpen className="w-4 h-4" />
              {editForm.bookIds.length > 0
                ? `${t('booksSelected', 'Books Selected')} (${editForm.bookIds.length})`
                : t('chooseBooks', 'Choose Books')}
            </Button>
          </div>
          <SelectedBooksDisplay
            selectedBookIds={editForm.bookIds}
            onRemoveBook={(bookId) => {
              const newBookIds = editForm.bookIds.filter(id => id !== bookId);
              handleFormChange('bookIds', newBookIds);
            }}
            t={t}
          />
        </div>

        {/* Book Selection Modal */}
        <BookSelectionModal
          isOpen={showBookModal}
          onClose={() => setShowBookModal(false)}
          selectedBookIds={editForm.bookIds}
          onBookIdsChange={(newBookIds) => handleFormChange('bookIds', newBookIds)}
          t={t}
          allowedCategoryIds={[38, 42, 46, 47, 49, 51]}
        />
      </div>

      {/* Validation Summary */}
      {hasValidationErrors && (
        <div className="bg-white rounded-md border border-gray-200 p-6 mb-6">
          <ValidationSummary
            errors={validationErrorsList}
            t={t}
          />
        </div>
      )}

      {/* Action Buttons for Page Mode - Sticky */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 sm:p-6 flex items-center justify-end space-x-3 shadow-lg z-10">
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
    </div>
  );
};

export default TeacherEditModal;
