import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, User2, Building, Mail, Phone, Eye, EyeOff, Upload, Lock, X, Weight, Ruler, CircleUserRound, BookOpen, ArrowLeft, Wand2 } from 'lucide-react';
import { sanitizeUsername } from '../../utils/usernameUtils';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { decryptId, isValidEncryptedId } from '../../utils/encryption';
import { convertHeightToCm, convertWeightToKg, calculateBMI } from '../../utils/physicalMeasurementUtils';
import { Button } from '../ui/Button';
import { DatePickerWithDropdowns } from '../ui/date-picker-with-dropdowns';
import ProfileImage from '../ui/ProfileImage';
import Dropdown from '../ui/Dropdown';
import ErrorDisplay from '../ui/ErrorDisplay';
import { PageLoader } from '../ui/DynamicLoader';
import ValidationSummary from '../ui/ValidationSummary';
import BookSelectionModal from '../modals/BookSelectionModal';
import SelectedBooksDisplay from '../modals/SelectedBooksDisplay';
import { useLocationData } from '../../hooks/useLocationData';
import { userService } from '../../utils/api/services/userService';
import { gradeLevelOptions, ethnicGroupOptions, accessibilityOptions, getAcademicYearOptions, poorCardGradeOptions, extraLearningStatusOptions, extraLearningProvidedByOptions } from '../../utils/formOptions';
import { utils } from '../../utils/api';

const StudentEditModal = () => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { error, handleError, clearError, retry } = useErrorHandler();

  // Get encrypted student ID from URL
  const encryptedStudentId = searchParams.get('id');
  const mode = searchParams.get('mode') || 'edit'; // 'create' or 'edit'

  // Track if we've already fetched the student data to prevent duplicate requests
  const fetchedRef = useRef(false);
  const abortControllerRef = useRef(null);

  const [student, setStudent] = useState(null);
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
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [originalEmail, setOriginalEmail] = useState('');
  const [showBookModal, setShowBookModal] = useState(false);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const usernameContainerRef = useRef(null);
  const usernameDebounceRef = useRef(null);
  const emailDebounceRef = useRef(null);
  const hideUsernameSuggestionsTimeoutRef = useRef(null);

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
    newPassword: '', // Password change for edit mode
    weight: '',
    height: '',
    bmi: '',
    ethnicGroup: '',
    accessibility: [],
    academicYear: '',
    gradeLevel: '',
    isKindergarten: false,
    studentNumber: '',
    poorCardGrade: '',
    bookIds: [],
    extraLearningTool: {
      reading_material_package: {
        _hasPackage: false,
        status: '',
        providedBy: '',
      },
      math_grade1_package: {
        _hasPackage: false,
        status: '',
        providedBy: '',
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

  // Fetch student data if editing
  useEffect(() => {
    // Prevent duplicate requests in React Strict Mode
    if (fetchedRef.current) {
      return;
    }

    const fetchStudentData = async () => {
      try {
        // For edit mode, validate and decrypt the student ID
        if (!encryptedStudentId || !isValidEncryptedId(encryptedStudentId)) {
          throw new Error(t('invalidStudentId', 'Invalid student ID'));
        }

        const decryptedId = decryptId(encryptedStudentId);
        if (!decryptedId) {
          throw new Error(t('failedToDecryptStudentId', 'Failed to decrypt student ID'));
        }

        console.log('Fetching student with ID:', decryptedId);

        // Fetch student data
        const response = await userService.getUserByID(decryptedId);
        if (response && response.data) {
          setStudent(response.data);
        } else if (response) {
          setStudent(response);
        } else {
          throw new Error(t('failedToLoadStudent', 'Failed to load student data'));
        }
      } catch (err) {
        console.error('Error fetching student:', err);
        handleError(err, {
          toastMessage: t('errorLoadingStudent', 'Error loading student data')
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
    fetchStudentData();
  }, [encryptedStudentId]);

  // Initialize form data when student changes
  useEffect(() => {
    if (student) {
      initializeFormData();
    }
  }, [student]);

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
    if (!student) return;

    try {
      setLoading(true);

      // Use student data already fetched in useEffect
      // No need to fetch again - avoid duplicate API call
      const fullData = student;

      // Extract student object - API returns nested student object with camelCase fields
      const studentObj = fullData.student || fullData;

      console.log('StudentEditModal: Extracted student data:', {
        gradeLevel: studentObj.gradeLevel,
        academicYear: studentObj.academicYear,
        studentNumber: studentObj.studentNumber,
        poorCardGrade: studentObj.poorCardGrade,
        poorCard_grade: fullData.poorCard_grade,
        isKidgardener: studentObj.isKidgardener,
        is_kidgardener: studentObj.is_kidgardener,
        fullStudentObj: studentObj,
        fullData: fullData
      });

      const initialUsername = fullData.username || '';

      // Initialize extraLearningTool (supports new English keys + legacy Khmer keys)
      const rawExtraStudent =
        (studentObj.extraLearningTool && typeof studentObj.extraLearningTool === 'object')
          ? studentObj.extraLearningTool
          : (fullData.extraLearningTool && typeof fullData.extraLearningTool === 'object')
            ? fullData.extraLearningTool
            : {};

      let extraLearningTool;

      if (rawExtraStudent.reading_material_package || rawExtraStudent.math_grade1_package) {
        const readingExtra = rawExtraStudent.reading_material_package || {};
        const mathExtra = rawExtraStudent.math_grade1_package || {};

        extraLearningTool = {
          reading_material_package: {
            _hasPackage: readingExtra._hasPackage === true,
            status: readingExtra.status || '',
            providedBy: readingExtra.providedBy || '',
          },
          math_grade1_package: {
            _hasPackage: mathExtra._hasPackage === true,
            status: mathExtra.status || '',
            providedBy: mathExtra.providedBy || '',
          },
        };
      } else {
        // Legacy Khmer flat values
        const readingLegacy = rawExtraStudent['កញ្ចប់សម្ភារៈអំណាន'];
        const mathLegacy = rawExtraStudent['គណិតវិទ្យាថ្នាក់ដំបូង'];

        extraLearningTool = {
          reading_material_package: {
            _hasPackage: !!readingLegacy,
            status: typeof readingLegacy === 'string' ? readingLegacy : '',
            providedBy: '',
          },
          math_grade1_package: {
            _hasPackage: !!mathLegacy,
            status: typeof mathLegacy === 'string' ? mathLegacy : '',
            providedBy: '',
          },
        };
      }

      setEditForm({
        firstName: fullData.firstName || fullData.first_name || '',
        lastName: fullData.lastName || fullData.last_name || '',
        username: initialUsername,
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
        academicYear: (studentObj.academicYear || fullData.academicYear || ''),
        gradeLevel: (studentObj.gradeLevel || fullData.gradeLevel || ''),
        isKindergarten: studentObj.isKidgardener !== undefined ? studentObj.isKidgardener : (studentObj.is_kidgardener || fullData.is_kidgardener || fullData.isKindergarten || false),
        studentNumber: (studentObj.studentNumber || fullData.studentNumber || ''),
        poorCardGrade: (studentObj.poorCardGrade || fullData.poorCard_grade || fullData.poorCardGrade || ''),
        bookIds: Array.isArray(fullData.bookIds) ? fullData.bookIds : [],
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
        }
      });
      setOriginalUsername(initialUsername || '');
      setUsernameAvailable(null);
      setOriginalEmail(fullData.email || '');
      setEmailAvailable(null);

      console.log('StudentEditModal: Form initialized with:', {
        poorCardGrade: studentObj.poorCardGrade,
        poorCard_grade: fullData.poorCard_grade,
        academicYear: studentObj.academicYear,
        gradeLevel: studentObj.gradeLevel,
        studentNumber: studentObj.studentNumber,
        isKindergarten: studentObj.isKidgardener
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
      poorCardGrade: '',
      bookIds: [],
      extraLearningTool: {
        reading_material_package: {
          _hasPackage: false,
          status: '',
          providedBy: '',
        },
        math_grade1_package: {
          _hasPackage: false,
          status: '',
          providedBy: '',
        },
      },
      residence: { provinceId: '', districtId: '', communeId: '', villageId: '' },
      placeOfBirth: { provinceId: '', districtId: '', communeId: '', villageId: '' },
    });
    resetResidenceSelections();
    resetBirthSelections();
    setProfilePictureFile(null);
    setShowDropdown(false);
    setUsernameAvailable(null);
    setEmailAvailable(null);
    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
    }
  };


  const handleClose = () => {
    resetForm();
    // Redirect based on user role
    const currentUser = utils.user.getUserData();
    const redirectPath = currentUser?.roleId === 8 ? '/my-students' : '/students';
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
  };

  const isUsernameInvalid = () => {
    const username = editForm.username || '';
    if (!username.trim()) return false;
    const usernameRegex = /^[A-Za-z0-9._-]+$/;
    return !usernameRegex.test(username);
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

  const handleGenerateUsernameSuggestions = async (baseFromInput = null) => {
    try {
      const baseUsername = (baseFromInput && baseFromInput.trim()) ||
        (editForm.username && editForm.username.trim()) ||
        'student';

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

      // If this is the student's own original username, always treat it as available
      // but still show suggestions as optional alternatives.
      const effectiveAvailable = sameAsOriginal ? true : availableFlag;

      // Do not auto-apply any suggestion; just reflect availability
      // and show the list so the user can choose manually.
      setUsernameAvailable(effectiveAvailable);

      setUsernameSuggestions(suggestions);
      setShowUsernameSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Error generating username suggestions:', error);
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

  const handleUsernameBlur = () => {
    if (usernameDebounceRef.current) {
      clearTimeout(usernameDebounceRef.current);
      usernameDebounceRef.current = null;
    }
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
        field: t('firstName', 'នាមខ្លួន'),
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

    // Email validation (if provided)
    if (editForm.email?.trim() && emailAvailable === false) {
      errorsList.push({
        field: t('email', 'អ៊ីមែល'),
        messages: [t('emailNotAvailable', 'អ៊ីមែលនេះត្រូវបានប្រើរួចហើយ')]
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

  const isPasswordInvalid = () => {
    const password = editForm.newPassword;
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
    if (!student) return;

    if (!validatePhysicalFields()) {
      return;
    }

    try {
      setPageLoading(true);

      const userId = student.userId || student.user_id || student.id;

      const formatDate = (val) => {
        if (!val) return undefined;
        const d = val instanceof Date ? val : new Date(val);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const payload = {
        first_name: editForm.firstName?.trim(),
        last_name: editForm.lastName?.trim(),
        email: editForm.email?.trim() || undefined,
        phone: editForm.phone?.trim() || undefined,
        date_of_birth: formatDate(editForm.dateOfBirth),
        gender: editForm.gender || undefined,
        nationality: editForm.nationality?.trim() || undefined,
        profile_picture: editForm.profilePicture || undefined,
        weight_kg: editForm.weight ? parseFloat(editForm.weight) : undefined,
        height_cm: editForm.height ? parseFloat(editForm.height) : undefined,
        bmi: editForm.bmi ? parseFloat(editForm.bmi) : undefined,
        ethnic_group: editForm.ethnicGroup?.trim() || undefined,
        accessibility: editForm.accessibility.length > 0 ? editForm.accessibility : undefined,
        academicYear: editForm.academicYear || undefined,
        gradeLevel: editForm.gradeLevel || undefined,
        isKindergarten: editForm.isKindergarten || undefined,
        studentNumber: editForm.studentNumber?.trim() || undefined,
        poorCard_grade: editForm.poorCardGrade || undefined,
        // Always include bookIds: array when there are items, null when none
        bookIds: editForm.bookIds.length > 0 ? editForm.bookIds : null,
        // Include extraLearningTool with values
        extraLearningTool: editForm.extraLearningTool || undefined,
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

      // Remove undefined/empty values - but keep empty strings and false booleans
      const cleanPayload = {};
      Object.keys(payload).forEach(k => {
        const value = payload[k];

        // Special case: keep bookIds even when null so backend sees explicit null
        if (k === 'bookIds') {
          cleanPayload[k] = value;
          return;
        }

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
        } else if (Array.isArray(value)) {
          // Keep arrays only if they have items
          if (value.length > 0) {
            cleanPayload[k] = value;
          }
        } else if (value !== undefined && value !== null && value !== '') {
          // Add non-null/undefined/empty values
          cleanPayload[k] = value;
        }
      });

      console.log('StudentEditModal: Payload after cleanup:', cleanPayload);

      const response = await userService.updateUser(userId, cleanPayload);

      if (response) {
        showSuccess(t('studentUpdatedSuccess', 'Student updated successfully'));
        // Redirect back to appropriate students list based on user role
        setTimeout(() => {
          const currentUser = utils.user.getUserData();
          const redirectPath = currentUser?.roleId === 8 ? '/my-students' : '/students';
          navigate(redirectPath, { replace: true });
        }, 1500);
      } else {
        throw new Error('Failed to update student');
      }
    } catch (error) {
      console.error('Error updating student:', error);
      showError(t('failedUpdateStudent', 'Failed to update student: ') + (error.message || 'Unknown error'));
    } finally {
      setPageLoading(false);
    }
  };

  const isUpdateDisabled =
    pageLoading ||
    !editForm.firstName?.trim() ||
    !editForm.lastName?.trim() ||
    !editForm.gender ||
    !editForm.dateOfBirth ||
    !editForm.nationality ||
    !editForm.username?.trim() ||
    usernameAvailable === false ||
    (editForm.email?.trim() && emailAvailable === false) ||
    (editForm.email?.trim() && emailAvailable === null && (editForm.email || '') !== (originalEmail || '')) ||
    isPhysicalInvalid() ||
    isUsernameInvalid();

  // Show error state
  if (error) {
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
          message={t('loadingStudents', 'Loading student...')}
          className="min-h-screen"
        />
      </div>
    );
  }

  // Form content JSX - shared between page and modal rendering
  const formContent = (
    <form id="edit-student-form" onSubmit={handleSubmit} className="space-y-6">
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
                className={`mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border focus:scale-[1.01] hover:shadow-md ${
                  isWeightInvalid()
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
                className={`mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border focus:scale-[1.01] hover:shadow-md ${
                  isHeightInvalid()
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-green-500 focus:border-green-500 hover:border-gray-400'
                }`}
                placeholder={t('enterHeight', 'e.g., 170 or 1.7')}
              />
            </div>
          </div>
          <div className='flex-none gap-6'>
            {/* Ethnic Group and Accessibility */}
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
      {/* Academic Information Card */}
      <div className="bg-white rounded-md border border-gray-200 p-6">
        <div className='flex sm:flex-row flex-col justify-between items-start border-b border-gray-100'>
          <div className="flex items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('academicInformation', 'Academic Information')}
            </h3>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6'>
          <div>
            <label htmlFor="studentNumber" className="block text-sm font-medium text-gray-700 mb-1">
              {t('studentNumber', 'Student Number')}
            </label>
            <input
              type="text"
              id="studentNumber"
              value={editForm.studentNumber}
              onChange={(e) => handleFormChange('studentNumber', e.target.value)}
              className="mt-1 block w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('enterStudentNumber', 'Enter student number')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('poorCardGrade', 'Poor Card Grade')}
            </label>
            <Dropdown
              options={[
                { value: '', label: t('selectPoorCardGrade', 'Select Poor Card Grade') },
                ...poorCardGradeOptions
              ]}
              value={editForm.poorCardGrade}
              onValueChange={(value) => handleFormChange('poorCardGrade', value)}
              placeholder={t('selectPoorCardGrade', 'Select Poor Card Grade')}
              contentClassName="max-h-[200px] overflow-y-auto"
              disabled={false}
              className='w-full'
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

        {/* Extra Learning Tool Section */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('extraLearningTool', 'Extra Learning Tool')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reading material package card */}
            {(() => {
              const reading = editForm.extraLearningTool.reading_material_package || {};
              const hasPackage = !!reading._hasPackage;

              return (
                <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="font-medium text-gray-900 mb-3">
                    {t('learningPackage', 'កញ្ចប់សម្ភារៈអំណាន')}
                  </div>

                  <div className="space-y-3 text-sm">
                    {/* Has package checkbox */}
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-gray-700">
                        {t('hasPackage', 'Has Package')}
                      </span>
                      <span className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={hasPackage}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditForm(prev => ({
                              ...prev,
                              extraLearningTool: {
                                ...prev.extraLearningTool,
                                reading_material_package: {
                                  ...(prev.extraLearningTool.reading_material_package || {}),
                                  _hasPackage: checked,
                                  // Clear status and providedBy if unchecking
                                  status: checked ? (prev.extraLearningTool.reading_material_package?.status || '') : '',
                                  providedBy: checked ? (prev.extraLearningTool.reading_material_package?.providedBy || '') : '',
                                },
                              },
                            }));
                          }}
                        />
                      </span>
                    </label>

                    {/* Status dropdown - only show if hasPackage is true */}
                    {hasPackage && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('statusBook', 'ស្ថានភាពសៀវភៅ')}
                        </label>
                        <Dropdown
                          options={[
                            { value: '', label: t('selectOption', 'ជ្រើសរើស') },
                            ...extraLearningStatusOptions
                          ]}
                          value={reading.status || ''}
                          onValueChange={(value) => {
                            setEditForm(prev => ({
                              ...prev,
                              extraLearningTool: {
                                ...prev.extraLearningTool,
                                reading_material_package: {
                                  ...(prev.extraLearningTool.reading_material_package || {}),
                                  status: value,
                                },
                              },
                            }));
                          }}
                          placeholder={t('selectOption', 'ជ្រើសរើស')}
                          contentClassName="max-h-[200px] overflow-y-auto"
                          disabled={false}
                          className='w-full'
                        />
                      </div>
                    )}

                    {/* ProvidedBy dropdown - only show if hasPackage is true */}
                    {hasPackage && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('providedBy', 'Provided By')}
                        </label>
                        <Dropdown
                          options={[
                            { value: '', label: t('selectOption', 'ជ្រើសរើស') },
                            ...extraLearningProvidedByOptions
                          ]}
                          value={reading.providedBy || ''}
                          onValueChange={(value) => {
                            setEditForm(prev => ({
                              ...prev,
                              extraLearningTool: {
                                ...prev.extraLearningTool,
                                reading_material_package: {
                                  ...(prev.extraLearningTool.reading_material_package || {}),
                                  providedBy: value,
                                },
                              },
                            }));
                          }}
                          placeholder={t('selectOption', 'ជ្រើសរើស')}
                          contentClassName="max-h-[200px] overflow-y-auto"
                          disabled={false}
                          className='w-full'
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Math grade 1 package card */}
            {(() => {
              const math = editForm.extraLearningTool.math_grade1_package || {};
              const hasPackage = !!math._hasPackage;

              return (
                <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="font-medium text-gray-900 mb-3">
                    {t('mathGrade1', 'គណិតវិទ្យាថ្នាក់ដំបូង')}
                  </div>

                  <div className="space-y-3 text-sm">
                    {/* Has package checkbox */}
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-gray-700">
                        {t('hasPackage', 'Has Package')}
                      </span>
                      <span className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={hasPackage}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditForm(prev => ({
                              ...prev,
                              extraLearningTool: {
                                ...prev.extraLearningTool,
                                math_grade1_package: {
                                  ...(prev.extraLearningTool.math_grade1_package || {}),
                                  _hasPackage: checked,
                                  // Clear status and providedBy if unchecking
                                  status: checked ? (prev.extraLearningTool.math_grade1_package?.status || '') : '',
                                  providedBy: checked ? (prev.extraLearningTool.math_grade1_package?.providedBy || '') : '',
                                },
                              },
                            }));
                          }}
                        />
                      </span>
                    </label>

                    {/* Status dropdown - only show if hasPackage is true */}
                    {hasPackage && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('statusBook', 'ស្ថានភាពសៀវភៅ')}
                        </label>
                        <Dropdown
                          options={[
                            { value: '', label: t('selectOption', 'ជ្រើសរើស') },
                            ...extraLearningStatusOptions
                          ]}
                          value={math.status || ''}
                          onValueChange={(value) => {
                            setEditForm(prev => ({
                              ...prev,
                              extraLearningTool: {
                                ...prev.extraLearningTool,
                                math_grade1_package: {
                                  ...(prev.extraLearningTool.math_grade1_package || {}),
                                  status: value,
                                },
                              },
                            }));
                          }}
                          placeholder={t('selectOption', 'ជ្រើសរើស')}
                          contentClassName="max-h-[200px] overflow-y-auto"
                          disabled={false}
                          className='w-full'
                        />
                      </div>
                    )}

                    {/* ProvidedBy dropdown - only show if hasPackage is true */}
                    {hasPackage && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('providedBy', 'Provided By')}
                        </label>
                        <Dropdown
                          options={[
                            { value: '', label: t('selectOption', 'ជ្រើសរើស') },
                            ...extraLearningProvidedByOptions
                          ]}
                          value={math.providedBy || ''}
                          onValueChange={(value) => {
                            setEditForm(prev => ({
                              ...prev,
                              extraLearningTool: {
                                ...prev.extraLearningTool,
                                math_grade1_package: {
                                  ...(prev.extraLearningTool.math_grade1_package || {}),
                                  providedBy: value,
                                },
                              },
                            }));
                          }}
                          placeholder={t('selectOption', 'ជ្រើសរើស')}
                          contentClassName="max-h-[200px] overflow-y-auto"
                          disabled={false}
                          className='w-full'
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
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
                  onBlur={handleUsernameBlur}
                  className={`mt-1 block w-full pl-10 pr-10 rounded-md shadow-sm text-sm transition-all duration-300 border focus:scale-[1.01] hover:shadow-md ${
                    isUsernameInvalid()
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400'
                  }`}
                  placeholder={t('enterUsername', 'Enter username')}
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    if (hideUsernameSuggestionsTimeoutRef.current) {
                      clearTimeout(hideUsernameSuggestionsTimeoutRef.current);
                    }
                    handleGenerateUsernameSuggestions(editForm.username || '');
                  }}
                  title={t('suggestion', 'Generate suggestions')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-blue-600 transition-colors z-10"
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
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              {t('newPassword', 'New Password')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
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
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-10"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {editForm.newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">{t('passwordStrength', 'Password Strength')}</span>
                  <span className={`text-xs font-medium ${getPasswordStrength(editForm.newPassword).color.replace('bg-', 'text-')}`}>
                    {getPasswordStrength(editForm.newPassword).label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${getPasswordStrength(editForm.newPassword).color}`}
                    style={{ width: `${Math.min((editForm.newPassword.length / 8) * 100, 100)}%` }}
                  />
                </div>
                {editForm.newPassword.length < 8 && (
                  <p className="text-xs text-orange-600 mt-1">
                    {t('passwordTooShort', 'Password must be at least 8 characters')}
                  </p>
                )}
                {editForm.newPassword.length >= 8 && /[^\x00-\x7F]/.test(editForm.newPassword) && (
                  <p className="text-xs text-red-600 mt-1">
                    {t('passwordEnglishOnly', 'Password must contain only English characters')}
                  </p>
                )}
                {editForm.newPassword.length >= 8 && !/[^\x00-\x7F]/.test(editForm.newPassword) && (
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
                className={`mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 ${
                  emailAvailable === false
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

        {/* Student Edit Form */}
        {formContent}

        {/* Selected Books Display */}
        {editForm.gradeLevel && (
          <div className="bg-white rounded-md border border-gray-200 p-6 my-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('chooseBooks', 'Student Books')}
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
        )}

        {/* Validation Summary */}
        {hasValidationErrors && (
          <div className="bg-white rounded-md border border-gray-200 p-6 mb-6">
            <ValidationSummary
              errors={validationErrorsList}
              t={t}
            />
          </div>
        )}

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
            form="edit-student-form"
            variant="primary"
            disabled={isUpdateDisabled || pageLoading}
            className="min-w-[120px]"
          >
            {pageLoading
              ? t('updating', 'Updating...')
              : t('updateStudent', 'Update Student')}
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

        {/* Book Selection Modal */}
        <BookSelectionModal
          isOpen={showBookModal}
          onClose={() => setShowBookModal(false)}
          selectedBookIds={editForm.bookIds}
          onBookIdsChange={(newBookIds) => handleFormChange('bookIds', newBookIds)}
          t={t}
          allowedCategoryIds={[32, 33, 40, 52]}
        />

      </div>
    </div>
  );
};

export default StudentEditModal;