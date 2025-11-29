import { useState, useRef, useEffect } from 'react';
import { User, Eye, Upload, Edit, Mail, Lock, Phone, Globe, X, Building, Weight, Ruler, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { DatePickerWithDropdowns } from '../../components/ui/date-picker-with-dropdowns';
import ProfileImage from '../../components/ui/ProfileImage';
import ProfileInfoDisplay from '../../components/ui/ProfileInfoDisplay';
import { api, utils } from '../../utils/api';
import { userService } from '../../utils/api/services/userService';
import salaryTypeService from '../../utils/api/services/salaryTypeService';
import { sanitizeUsername, getFullName } from '../../utils/usernameUtils';
import { convertHeightToCm, convertWeightToKg, calculateBMI } from '../../utils/physicalMeasurementUtils';
import Dropdown from '../../components/ui/Dropdown';
import { useLocationData } from '../../hooks/useLocationData';
import { useStableCallback } from '../../utils/reactOptimization';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import { ethnicGroupOptions as baseEthnicGroupOptions, employmentTypeOptions, accessibilityOptions, educationLevelOptions, trainingTypeOptions, teachingTypeOptions, teacherStatusOptions, subjectOptions, roleOptions, maritalStatusOptions, spouseJobOptions, gradeLevelOptions } from '../../utils/formOptions';
import MultiSelectDropdown from '../../components/ui/MultiSelectDropdown';
import SalaryTypeDropdown from '../../components/ui/SalaryTypeDropdown';

export default function ProfileUpdate({ user, setUser }) {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    id: '',
    username: '',
    first_name: '',
    last_name: '',
    fullname: '',
    email: '',
    roleId: '',
    role: '',
    newPassword: '',
    date_of_birth: '',
    gender: 'MALE',
    profile_picture: '',
    phone: '',
    teacher_number: '',
    nationality: 'ខ្មែរ',
    roleNameEn: '',
    roleNameKh: '',
    school_name: '',
    weight_kg: '',
    height_cm: '',
    bmi: '',
    // Additional fields from API payload
    accessibility: [],
    employment_type: '',
    ethnic_group: '',
    gradeLevel: '',
    hire_date: '',
    salary_type: '',
    salary_type_name: '',
    education_level: '',
    training_type: '',
    teaching_type: '',
    teacher_status: '',
    subject: [],
    appointed: false,
    burden: false,
    bookIds: [],
    teacherExtraLearningTool: {
      'កញ្ចប់សម្ភារៈអំណាន': false,
      'គណិតវិទ្យាថ្នាក់ដំបូង': false
    },
    // Current residence location
    residence: {
      provinceId: '',
      districtId: '',
      communeId: '',
      villageId: ''
    },
    // Place of birth location
    placeOfBirth: {
      provinceId: '',
      districtId: '',
      communeId: '',
      villageId: ''
    },
    // Family information
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
    },
    // Legacy fields for backward compatibility
    provinceId: '',
    districtId: '',
    communeId: '',
    villageId: ''
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [pictureUploading, setPictureUploading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [showUsernameSuggestions, setShowUsernameSuggestions] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [originalUsername, setOriginalUsername] = useState('');
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [originalEmail, setOriginalEmail] = useState('');
  const usernameContainerRef = useRef(null);
  const usernameDebounceRef = useRef(null);
  const emailDebounceRef = useRef(null);

  // Store pending location data for setting initial values
  const [pendingResidenceData, setPendingResidenceData] = useState(null);
  const [pendingBirthData, setPendingBirthData] = useState(null);
  const [residenceInitialized, setResidenceInitialized] = useState(false);
  const [birthInitialized, setBirthInitialized] = useState(false);
  const [locationDataLoading, setLocationDataLoading] = useState(false);

  // Initialize location data hooks for residence
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

  // Initialize location data hooks for place of birth
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  // Fetch user data from database
  useEffect(() => {
    const fetchUserData = async () => {
      const startTime = performance.now();
      console.log('🚀 ProfileUpdate: fetchUserData called at', new Date().toISOString());

      setInitialLoading(true);
      try {
        // Get user data from localStorage
        const authUser = (() => {
          try {
            const storedUser = localStorage.getItem('user');
            return storedUser ? JSON.parse(storedUser) : null;
          } catch (error) {
            console.warn('Could not parse user from localStorage:', error);
            return null;
          }
        })();

        // Get user ID from props or auth
        const userId = user?.id || authUser?.id;
        if (!userId) {
          throw new Error('User ID not found in props or localStorage');
        }

        // Get detailed user data using /users/{userId} endpoint (includes profile picture)
        const userData = await api.user.getUserByID(userId);
        console.log('User data loaded:', userData);

        // Debug user data structure (can be removed in production)
        if (import.meta.env.DEV) {
          console.log('=== USER DATA DEBUG ===');
          console.log('Full userData object:', userData);
          console.log('Available keys:', Object.keys(userData));
          console.log('profile_picture value:', userData?.profile_picture);
          console.log('profile_picture_url value:', userData?.profile_picture_url);
          console.log('profilePicture value:', userData?.profilePicture);
          console.log('=== END USER DATA DEBUG ===');
        }

        // Normalize userData to handle incomplete payloads gracefully
        const normalizedData = userData;

        // Try to extract a valid user ID from various possible fields
        const possibleUserIds = [
          normalizedData.id,
          normalizedData.userId,
          normalizedData.user_id,
          normalizedData.teacher_id,
          normalizedData.userAccountId,
          normalizedData.accountId,
          normalizedData.profileId,
          normalizedData.account_id,
          authUser?.id, // Fallback to auth user ID
          normalizedData.roleId // Last resort - roleId might work as user identifier
        ];

        const extractedUserId = possibleUserIds.find(id => id !== null && id !== undefined && id !== '');
        console.log('Extracted user ID:', extractedUserId, 'from possible IDs:', possibleUserIds);

        // Extract teacher object if it exists (some fields are nested here)
        const teacher = normalizedData.teacher || {};

        // Create form data with all fields, using empty strings as defaults for missing optional fields
        const newFormData = {
          id: extractedUserId || '',
          username: normalizedData.username || '',
          first_name: normalizedData.first_name || '',
          last_name: normalizedData.last_name || '',
          fullname: normalizedData.fullname || '',
          email: normalizedData.email || '',
          roleId: normalizedData.roleId || '',
          newPassword: '',
          date_of_birth: normalizedData.date_of_birth || '',
          gender: normalizedData.gender || 'MALE',
          profile_picture: normalizedData.profile_picture || '',
          phone: normalizedData.phone || '',
          teacher_number: normalizedData.teacher_number || teacher.teacher_number || '',
          nationality: normalizedData.nationality || 'ខ្មែរ',
          roleNameEn: normalizedData.roleNameEn || '',
          roleNameKh: normalizedData.roleNameKh || '',
          school_name: teacher.school?.name || normalizedData.school_name || '',
          weight_kg: normalizedData.weight_kg || '',
          height_cm: normalizedData.height_cm || '',
          bmi: normalizedData.bmi || '',
          // Additional fields from API payload - check both top level and nested teacher object
          accessibility: normalizedData.accessibility || [],
          employment_type: normalizedData.employment_type || teacher.employment_type || '',
          ethnic_group: normalizedData.ethnic_group || '',
          gradeLevel: normalizedData.gradeLevel || teacher.gradeLevel || '',
          hire_date: normalizedData.hire_date || teacher.hire_date || '',
          role: normalizedData.role || normalizedData.roleId || '',
          salary_type: (normalizedData.salaryTypeId || teacher.salaryTypeId) ? String(normalizedData.salaryTypeId || teacher.salaryTypeId) : '',
          education_level: normalizedData.educationLevel || teacher.educationLevel || '',
          training_type: normalizedData.trainingType || teacher.trainingType || '',
          teaching_type: normalizedData.teachingType || teacher.teachingType || '',
          teacher_status: normalizedData.teacherStatus || teacher.teacherStatus || '',
          subject: Array.isArray(normalizedData.subject) ? normalizedData.subject : (Array.isArray(teacher.subject) ? teacher.subject : []),
          appointed: typeof normalizedData.appointed === 'boolean' ? normalizedData.appointed : (typeof teacher.appointed === 'boolean' ? teacher.appointed : false),
          burden: typeof normalizedData.burden === 'boolean' ? normalizedData.burden : (typeof teacher.burden === 'boolean' ? teacher.burden : false),
          bookIds: Array.isArray(normalizedData.bookIds) ? normalizedData.bookIds : [],
          teacherExtraLearningTool: {
            'កញ្ចប់សម្ភារៈអំណាន': normalizedData.teacherExtraLearningTool?.['កញ្ចប់សម្ភារៈអំណាន'] === true || teacher.extraLearningTool?.['កញ្ចប់សម្ភារៈអំណាន'] === true,
            'គណិតវិទ្យាថ្នាក់ដំបូង': normalizedData.teacherExtraLearningTool?.['គណិតវិទ្យាថ្នាក់ដំបូង'] === true || teacher.extraLearningTool?.['គណិតវិទ្យាថ្នាក់ដំបូង'] === true
          },
          // Handle nested residence object with full location data (Khmer names prioritized)
          residence: {
            provinceId: normalizedData.residence?.provinceId || normalizedData.province_id || '',
            province_name: normalizedData.residence?.province?.province_name_kh || normalizedData.residence?.province?.province_name_en || '',
            districtId: normalizedData.residence?.districtId || normalizedData.district_id || '',
            district_name: normalizedData.residence?.district?.district_name_kh || normalizedData.residence?.district?.district_name_en || '',
            communeId: normalizedData.residence?.communeId || normalizedData.commune_id || '',
            commune_name: normalizedData.residence?.commune?.commune_name_kh || normalizedData.residence?.commune?.commune_name_en || '',
            villageId: normalizedData.residence?.villageId || normalizedData.village_id || '',
            village_name: normalizedData.residence?.village?.village_name_kh || normalizedData.residence?.village?.village_name_en || ''
          },
          // Handle nested placeOfBirth object with full location data (Khmer names prioritized)
          placeOfBirth: {
            provinceId: normalizedData.placeOfBirth?.provinceId || normalizedData.residence?.provinceId || normalizedData.province_id || '',
            province_name: normalizedData.placeOfBirth?.province?.province_name_kh || normalizedData.placeOfBirth?.province?.province_name_en || normalizedData.residence?.province?.province_name_kh || '',
            districtId: normalizedData.placeOfBirth?.districtId || normalizedData.residence?.districtId || normalizedData.district_id || '',
            district_name: normalizedData.placeOfBirth?.district?.district_name_kh || normalizedData.placeOfBirth?.district?.district_name_en || normalizedData.residence?.district?.district_name_kh || '',
            communeId: normalizedData.placeOfBirth?.communeId || normalizedData.residence?.communeId || normalizedData.commune_id || '',
            commune_name: normalizedData.placeOfBirth?.commune?.commune_name_kh || normalizedData.placeOfBirth?.commune?.commune_name_en || normalizedData.residence?.commune?.commune_name_kh || '',
            villageId: normalizedData.placeOfBirth?.villageId || normalizedData.residence?.villageId || normalizedData.village_id || '',
            village_name: normalizedData.placeOfBirth?.village?.village_name_kh || normalizedData.placeOfBirth?.village?.village_name_en || normalizedData.residence?.village?.village_name_kh || ''
          },
          // Handle teacher family information
          teacher_family: {
            living_status: teacher.teacher_family?.living_status || normalizedData.teacher_family?.living_status || '',
            spouse_info: {
              spouse_name: teacher.teacher_family?.spouse_info?.spouse_name || normalizedData.teacher_family?.spouse_info?.spouse_name || '',
              spouse_occupation: teacher.teacher_family?.spouse_info?.spouse_occupation || normalizedData.teacher_family?.spouse_info?.spouse_occupation || '',
              spouse_place_of_birth: teacher.teacher_family?.spouse_info?.spouse_place_of_birth || normalizedData.teacher_family?.spouse_info?.spouse_place_of_birth || '',
              spouse_phone: teacher.teacher_family?.spouse_info?.spouse_phone || normalizedData.teacher_family?.spouse_info?.spouse_phone || ''
            },
            number_of_children: teacher.teacher_family?.number_of_children || normalizedData.teacher_family?.number_of_children || '',
            children: Array.isArray(teacher.teacher_family?.children) ? teacher.teacher_family.children : (Array.isArray(normalizedData.teacher_family?.children) ? normalizedData.teacher_family.children : [])
          },
          // Legacy fields for backward compatibility
          provinceId: normalizedData.residence?.provinceId || normalizedData.province_id || '',
          districtId: normalizedData.residence?.districtId || normalizedData.district_id || '',
          communeId: normalizedData.residence?.communeId || normalizedData.commune_id || '',
          villageId: normalizedData.residence?.villageId || normalizedData.village_id || ''
        };

        setFormData(newFormData);
        setOriginalUsername(newFormData.username || '');
        setOriginalEmail(newFormData.email || '');
        console.log('User data loaded into form, keys present:', Object.keys(newFormData).filter(k => newFormData[k]));

        // Fetch salary type name if salary type ID and employment type exist
        const currentEmploymentType = newFormData.employment_type;
        const currentSalaryTypeId = newFormData.salary_type;

        if (currentSalaryTypeId && currentEmploymentType) {
          try {
            const salaryTypes = await salaryTypeService.getSalaryTypesByEmploymentType(currentEmploymentType);
            if (Array.isArray(salaryTypes)) {
              const selectedSalaryType = salaryTypes.find(st => String(st.id || st.salaryTypeId) === currentSalaryTypeId);
              if (selectedSalaryType) {
                setFormData(prev => ({
                  ...prev,
                  salary_type_name: selectedSalaryType.name
                }));
              }
            }
          } catch (error) {
            console.warn('Failed to fetch salary type name:', error);
          }
        }

        // Store initial location data to set once provinces are loaded
        const residenceData = normalizedData.residence || {};
        const birthData = normalizedData.placeOfBirth || {};

        // Store the initial values to be set later using React state
        const residenceInitialData = residenceData.provinceId || residenceData.districtId || residenceData.communeId || residenceData.villageId ||
          normalizedData.province_id || normalizedData.district_id || normalizedData.commune_id || normalizedData.village_id ? {
          provinceId: residenceData.provinceId || normalizedData.province_id,
          districtId: residenceData.districtId || normalizedData.district_id,
          communeId: residenceData.communeId || normalizedData.commune_id,
          villageId: residenceData.villageId || normalizedData.village_id
        } : null;

        const birthInitialData = birthData.provinceId || birthData.districtId || birthData.communeId || birthData.villageId ? {
          provinceId: birthData.provinceId,
          districtId: birthData.districtId,
          communeId: birthData.communeId,
          villageId: birthData.villageId
        } : residenceInitialData;

        // Set pending location data for initialization
        setPendingResidenceData(residenceInitialData);
        setPendingBirthData(birthInitialData);

        // Reset initialization flags when new user data is loaded
        setResidenceInitialized(false);
        setBirthInitialized(false);

        // Also update the user context if needed
        if (setUser) {
          const updatedUser = {
            ...userData
          };
          setUser(updatedUser);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        showError(error.message || t('failedToLoadUserData') || 'Failed to load user data');
      } finally {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`⏱️ ProfileUpdate data fetch completed in ${duration.toFixed(2)}ms`);
        setInitialLoading(false);
      }
    };

    fetchUserData();
  }, []); // Remove setUser from dependencies as it can cause infinite loops

  // Initialize location data when pending data is available
  useEffect(() => {
    if (!residenceInitialized && pendingResidenceData) {
      const timer = setTimeout(() => {
        console.log('🏠 Setting residence data:', pendingResidenceData);
        setLocationDataLoading(true);

        setResidenceInitialValues(pendingResidenceData)
          .then(() => {
            console.log('✅ Residence data set successfully');
          })
          .catch(error => {
            console.error('❌ Error setting residence initial values:', error);
          })
          .finally(() => {
            setLocationDataLoading(false);
            setResidenceInitialized(true);
            setPendingResidenceData(null);
          });
      }, 1000); // Wait 1s for provinces to load

      return () => clearTimeout(timer);
    }
  }, [pendingResidenceData, residenceInitialized, setResidenceInitialValues]);

  useEffect(() => {
    if (!birthInitialized && pendingBirthData) {
      const timer = setTimeout(() => {
        console.log('🏥 Setting birth data:', pendingBirthData);
        setLocationDataLoading(true);

        setBirthInitialValues(pendingBirthData)
          .then(() => {
            console.log('✅ Birth data set successfully');
          })
          .catch(error => {
            console.error('❌ Error setting birth initial values:', error);
          })
          .finally(() => {
            setLocationDataLoading(false);
            setBirthInitialized(true);
            setPendingBirthData(null);
          });
      }, 1000); // Wait 1s for provinces to load

      return () => clearTimeout(timer);
    }
  }, [pendingBirthData, birthInitialized, setBirthInitialValues]);

  // Fallback timeout to ensure initialization happens even if there are issues
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!residenceInitialized && pendingResidenceData) {
        console.log('Fallback: Forcing residence initialization');
        setResidenceInitialized(true);
        setPendingResidenceData(null);
      }
      if (!birthInitialized && pendingBirthData) {
        console.log('Fallback: Forcing birth initialization');
        setBirthInitialized(true);
        setPendingBirthData(null);
      }
    }, 5000); // Reduced to 5 second fallback

    return () => clearTimeout(timeout);
  }, [residenceInitialized, birthInitialized, pendingResidenceData, pendingBirthData]);

  // Cleanup email debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (emailDebounceRef.current) {
        clearTimeout(emailDebounceRef.current);
      }
    };
  }, []);

  // Calculate BMI
  const calculateBMI = () => {
    const weight = parseFloat(formData.weight_kg);
    const height = parseFloat(formData.height_cm);

    if (!weight || !height || weight <= 0 || height <= 0) {
      return null;
    }

    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  // Get BMI category
  const getBMICategory = (bmi) => {
    if (!bmi) return null;
    const bmiValue = parseFloat(bmi);

    if (bmiValue < 18.5) return {
      label: 'ទាបពេក (Underweight)',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      bmi: bmiValue
    };
    if (bmiValue < 25) return {
      label: 'ធម្មតា (Normal)',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      bmi: bmiValue
    };
    if (bmiValue < 30) return {
      label: 'ច្រើន (Overweight)',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      bmi: bmiValue
    };
    return {
      label: 'ធ្ងន់ពេក (Obese)',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      bmi: bmiValue
    };
  };

  const handleViewPicture = () => {
    setShowImageModal(true);
    setShowDropdown(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
    setShowDropdown(false);
  };

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode);
  };

  // Download profile data as JSON with image
  const downloadProfileData = async () => {
    try {
      // Create a JSON object with all profile data
      const profileData = {
        personalInfo: {
          username: formData.username,
          email: formData.email,
          firstName: formData.first_name,
          lastName: formData.last_name,
          fullName: formData.fullname,
          gender: formData.gender,
          phone: formData.phone,
          dateOfBirth: formData.date_of_birth,
          nationality: formData.nationality
        },
        teacherInfo: {
          role: formData.roleNameKh,
          teacherNumber: formData.teacher_number,
          employmentType: formData.employment_type,
          hireDate: formData.hire_date,
          gradeLevel: formData.gradeLevel
        },
        healthInfo: {
          weight: formData.weight_kg,
          height: formData.height_cm,
          bmi: calculateBMI()
        },
        locationInfo: {
          residence: formData.residence,
          placeOfBirth: formData.placeOfBirth
        },
        additionalInfo: {
          ethnicity: formData.ethnic_group,
          accessibility: formData.accessibility
        },
        downloadedAt: new Date().toISOString()
      };

      // Create JSON string
      const jsonString = JSON.stringify(profileData, null, 2);

      // Create blob and download JSON
      const jsonBlob = new Blob([jsonString], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `profile-${formData.username || 'user'}-${new Date().getTime()}.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);

      showSuccess(t('downloadSuccess') || 'Profile data downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      showError(t('downloadFailed') || 'Failed to download profile data');
    }
  };

  const handleGenerateUsernameSuggestions = async (baseFromInput = null) => {
    try {
      const baseUsername = (baseFromInput && baseFromInput.trim()) ||
        (formData.username && formData.username.trim()) ||
        'user';

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

      // If this is the user's original username, always treat it as available
      // but still show suggestions as optional alternatives.
      const effectiveAvailable = sameAsOriginal ? true : availableFlag;

      setUsernameAvailable(effectiveAvailable);
      setUsernameSuggestions(suggestions);
      setShowUsernameSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Error generating username suggestions (profile):', error);
      setUsernameSuggestions([]);
      setShowUsernameSuggestions(false);
      showError(t('failedGenerateUsername', 'Failed to generate username suggestions'));
    }
  };

  const handleChooseUsernameSuggestion = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      username: suggestion
    }));
    setUsernameAvailable(true);
    setShowUsernameSuggestions(false);
  };

  const isWeightInvalid = () => {
    const { weight_kg } = formData;
    if (!weight_kg) return false;
    const weightStr = String(weight_kg).trim();
    const weightRegex = /^[0-9]{1,3}(\.[0-9]{1,2})?$/; // numeric(5,2)
    if (!weightRegex.test(weightStr)) return true;
    const w = parseFloat(weightStr);
    return !Number.isNaN(w) && w < 10;
  };

  const isHeightInvalid = () => {
    const { height_cm } = formData;
    if (!height_cm) return false;
    const heightStr = String(height_cm).trim();
    const heightRegex = /^[0-9]{1,3}(\.[0-9])?$/; // numeric(4,1)
    if (!heightRegex.test(heightStr)) return true;
    const h = parseFloat(heightStr);
    return !Number.isNaN(h) && h < 10;
  };

  const isPhysicalInvalid = () => {
    return isWeightInvalid() || isHeightInvalid();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setShowConfirmDialog(true);
  };

  const isProfileSubmitDisabled =
    loading ||
    !formData.first_name?.trim() ||
    !formData.last_name?.trim() ||
    !formData.gender ||
    !formData.date_of_birth ||
    !formData.nationality ||
    !formData.username?.trim() ||
    usernameAvailable === false ||
    (formData.email?.trim() && emailAvailable === false) ||
    (formData.email?.trim() && emailAvailable === null && (formData.email || '') !== (originalEmail || '')) ||
    isPhysicalInvalid();

  const buildTeacherFamilyPayload = () => {
    const tf = formData.teacher_family || {};
    const rawChildren = Array.isArray(tf.children) ? tf.children : [];

    const numberOfChildrenRaw = tf.number_of_children;
    const parsedNumber =
      numberOfChildrenRaw === '' || numberOfChildrenRaw === null || numberOfChildrenRaw === undefined
        ? undefined
        : parseInt(numberOfChildrenRaw, 10);

    const cleanedChildren = rawChildren
      .map(child => ({ child_name: (child?.child_name || '').trim() }))
      .filter(child => child.child_name);

    // Align children array with number_of_children
    let effectiveChildren = cleanedChildren;

    if (typeof parsedNumber === 'number' && !Number.isNaN(parsedNumber)) {
      if (parsedNumber <= 0) {
        effectiveChildren = [];
      } else if (effectiveChildren.length > parsedNumber) {
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

  const handleConfirmUpdate = async () => {
    setLoading(true);
    setShowConfirmDialog(false);

    const timeoutId = setTimeout(() => {
      setLoading(false);
      showError(t('requestTimeout'));
    }, 30000); // 30 second timeout for uploads

    try {
      // Upload profile picture first if there's a new one
      let profilePictureUrl = null;
      if (profilePictureFile) {
        profilePictureUrl = await uploadProfilePicture();
        if (profilePictureUrl === null) {
          clearTimeout(timeoutId);
          setLoading(false);
          return; // Stop if image upload failed
        }
      }

      // Transform formData to match API payload structure
      // Build update data similar to TeachersManagement pattern
      const updateData = {};

      // Always include core user fields (required fields)
      if (formData.first_name) {
        updateData.first_name = formData.first_name;
      }
      if (formData.last_name) {
        updateData.last_name = formData.last_name;
      }
      if (formData.email && formData.email.trim()) {
        updateData.email = formData.email.trim();
      }
      if (formData.date_of_birth) {
        updateData.date_of_birth = formData.date_of_birth;
      }
      if (formData.gender) {
        updateData.gender = formData.gender;
      }

      // Include optional fields only if they have values
      if (formData.username) {
        updateData.username = formData.username;
      }

      if (formData.phone) {
        updateData.phone = formData.phone;
      }

      if (profilePictureUrl || formData.profile_picture) {
        updateData.profile_picture = profilePictureUrl || formData.profile_picture;
      }

      if (formData.nationality) {
        updateData.nationality = formData.nationality;
      }

      if (formData.weight_kg) {
        updateData.weight_kg = parseFloat(formData.weight_kg);
      }

      if (formData.height_cm) {
        updateData.height_cm = parseFloat(formData.height_cm);
      }

      if (formData.bmi) {
        updateData.bmi = parseFloat(formData.bmi);
      }

      // Note: Do NOT include id or role fields - the API doesn't accept them for current user updates
      // Role is retrieved from the GET endpoint and cannot be changed via this endpoint

      // Include location fields if available - only send IDs, not location names
      if (formData.residence && (formData.residence.provinceId || formData.residence.districtId || formData.residence.communeId || formData.residence.villageId)) {
        updateData.residence = {
          provinceId: formData.residence.provinceId || undefined,
          districtId: formData.residence.districtId || undefined,
          communeId: formData.residence.communeId || undefined,
          villageId: formData.residence.villageId || undefined
        };
      }

      if (formData.placeOfBirth && (formData.placeOfBirth.provinceId || formData.placeOfBirth.districtId || formData.placeOfBirth.communeId || formData.placeOfBirth.villageId)) {
        updateData.placeOfBirth = {
          provinceId: formData.placeOfBirth.provinceId || undefined,
          districtId: formData.placeOfBirth.districtId || undefined,
          communeId: formData.placeOfBirth.communeId || undefined,
          villageId: formData.placeOfBirth.villageId || undefined
        };
      }

      // Include newPassword if provided
      if (formData.newPassword && formData.newPassword.trim()) {
        updateData.newPassword = formData.newPassword;
      }

      // Include additional teacher-specific fields if available
      if (formData.employment_type) {
        updateData.employment_type = formData.employment_type;
      }

      if (formData.ethnic_group) {
        updateData.ethnic_group = formData.ethnic_group;
      }

      if (formData.gradeLevel) {
        updateData.gradeLevel = formData.gradeLevel;
      }

      if (formData.hire_date) {
        updateData.hire_date = formData.hire_date;
      }

      if (formData.accessibility && formData.accessibility.length > 0) {
        updateData.accessibility = formData.accessibility;
      }

      // Note: Do NOT add role field - the API doesn't accept it and users cannot change their own role

      // Add salary type
      if (formData.salary_type) {
        updateData.salaryTypeId = parseInt(formData.salary_type);
      }

      // Add education level
      if (formData.education_level) {
        updateData.educationLevel = formData.education_level;
      }

      // Add training type
      if (formData.training_type) {
        updateData.trainingType = formData.training_type;
      }

      // Add teaching type
      if (formData.teaching_type) {
        updateData.teachingType = formData.teaching_type;
      }

      // Add teacher status
      if (formData.teacher_status) {
        updateData.teacherStatus = formData.teacher_status;
      }

      // Add subjects
      if (formData.subject && formData.subject.length > 0) {
        updateData.subject = formData.subject;
      }

      // Add appointment and burden status
      if (typeof formData.appointed === 'boolean') {
        updateData.appointed = formData.appointed;
      }

      if (typeof formData.burden === 'boolean') {
        updateData.burden = formData.burden;
      }

      // Add extra learning tools
      if (formData.teacherExtraLearningTool && Object.keys(formData.teacherExtraLearningTool).length > 0) {
        updateData.teacherExtraLearningTool = formData.teacherExtraLearningTool;
      }

      // Add book IDs if available
      if (formData.bookIds && formData.bookIds.length > 0) {
        updateData.bookIds = formData.bookIds;
      }

      // Add teacher family information
      if (formData.teacher_family && (formData.teacher_family.living_status || formData.teacher_family.spouse_info?.spouse_name || formData.teacher_family.children?.length > 0)) {
        updateData.teacher_family = buildTeacherFamilyPayload();
      }

      // Use the correct endpoint for updating user profile via PUT /users/{userId}
      const userId = formData.id;
      if (!userId) {
        throw new Error('User ID not found in form data');
      }
      const response = await api.user.updateUser(userId, updateData);
      clearTimeout(timeoutId);

      const updatedUser = {
        ...user,
        ...response
      };
      utils.user.saveUserData(updatedUser);
      setUser(updatedUser);

      // Update formData with the response data to refresh all displayed values
      // Also handle nested teacher object which may contain some fields
      const teacher = response.teacher || {};
      const familyData = teacher.teacher_family || response.teacher_family || {};
      const childrenArray = Array.isArray(familyData.children) ? familyData.children : [];
      const extraLearningToolData = teacher.extraLearningTool || response.teacherExtraLearningTool || {};

      setFormData(prev => ({
        ...prev,
        id: response.id || prev.id,
        username: response.username || prev.username,
        first_name: response.first_name || prev.first_name,
        last_name: response.last_name || prev.last_name,
        email: response.email || prev.email,
        roleId: response.roleId || prev.roleId,
        role: response.role || prev.role,
        date_of_birth: response.date_of_birth || prev.date_of_birth,
        gender: response.gender || prev.gender,
        phone: response.phone || prev.phone,
        profile_picture: response.profile_picture || prev.profile_picture,
        nationality: response.nationality || prev.nationality,
        weight_kg: response.weight_kg || prev.weight_kg,
        height_cm: response.height_cm || prev.height_cm,
        bmi: response.bmi || prev.bmi,
        teacher_number: response.teacher_number || prev.teacher_number,
        // Additional fields - check both top level and nested teacher object
        accessibility: response.accessibility || teacher.accessibility || prev.accessibility,
        employment_type: response.employment_type || teacher.employment_type || prev.employment_type,
        ethnic_group: response.ethnic_group || prev.ethnic_group,
        gradeLevel: response.gradeLevel || teacher.gradeLevel || prev.gradeLevel,
        hire_date: response.hire_date || teacher.hire_date || prev.hire_date,
        salary_type: response.salaryTypeId ? String(response.salaryTypeId) : prev.salary_type,
        salary_type_name: prev.salary_type_name,
        education_level: response.educationLevel || teacher.educationLevel || prev.education_level,
        training_type: response.trainingType || teacher.trainingType || prev.training_type,
        teaching_type: response.teachingType || teacher.teachingType || prev.teaching_type,
        teacher_status: response.teacherStatus || teacher.teacherStatus || prev.teacher_status,
        subject: Array.isArray(response.subject) ? response.subject : (Array.isArray(teacher.subject) ? teacher.subject : prev.subject),
        appointed: typeof response.appointed === 'boolean' ? response.appointed : (typeof teacher.appointed === 'boolean' ? teacher.appointed : prev.appointed),
        burden: typeof response.burden === 'boolean' ? response.burden : (typeof teacher.burden === 'boolean' ? teacher.burden : prev.burden),
        bookIds: Array.isArray(response.bookIds) ? response.bookIds : prev.bookIds,
        teacherExtraLearningTool: {
          'កញ្ចប់សម្ភារៈអំណាន': extraLearningToolData['កញ្ចប់សម្ភារៈអំណាន'] === true,
          'គណិតវិទ្យាថ្នាក់ដំបូង': extraLearningToolData['គណិតវិទ្យាថ្នាក់ដំបូង'] === true
        },
        residence: response.residence || prev.residence,
        placeOfBirth: response.placeOfBirth || prev.placeOfBirth,
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
      }));

      setProfilePictureFile(null); // Clear the selected file

      // Re-fetch user data to ensure all fields are properly displayed
      // This ensures the form shows the latest data from the server
      try {
        const freshUserData = await api.user.getUserByID(userId);
        // Update formData with fresh data from server
        const teacher = freshUserData.teacher || {};
        setFormData(prev => ({
          ...prev,
          profile_picture: freshUserData.profile_picture || prev.profile_picture,
          employment_type: freshUserData.employment_type || teacher.employment_type || prev.employment_type,
          ethnic_group: freshUserData.ethnic_group || prev.ethnic_group,
          gradeLevel: freshUserData.gradeLevel || teacher.gradeLevel || prev.gradeLevel,
          hire_date: freshUserData.hire_date || teacher.hire_date || prev.hire_date,
          accessibility: freshUserData.accessibility || teacher.accessibility || prev.accessibility
        }));
      } catch (refreshError) {
        console.warn('Could not refresh user data:', refreshError);
        // Continue anyway, as the initial update succeeded
      }

      showSuccess(t('profileUpdatedSuccess'));
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Profile update error:', err);
      showError(t('updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const isValidEmailFormat = (email) => {
    // Basic email format validation using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Handle email validation
    if (name === 'email') {
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

  const handleDateChange = useStableCallback((date) => {
    setFormData(prev => ({
      ...prev,
      date_of_birth: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : ''
    }));
  }, []);

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
    }
  };

  const uploadProfilePicture = async () => {
    if (!profilePictureFile) return null;

    setPictureUploading(true);
    try {
      // Validate auth token first
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication token missing. Please log in again.');
      }

      // Get user ID from form data or user prop - try multiple field names
      let userId = formData.id || user?.id || user?.userId || user?.user_id;

      // Try to extract user ID from localStorage as fallback
      if (!userId) {
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            userId = parsedUser.id || parsedUser.userId || parsedUser.user_id;
            console.log('Extracted user ID from localStorage:', userId);
          }
        } catch (error) {
          console.warn('Could not parse user from localStorage:', error);
        }
      }

      // Try to extract from JWT token as last resort
      if (!userId) {
        try {
          const token = localStorage.getItem('authToken');
          if (token) {
            // Decode JWT token to see if user ID is in there
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              userId = payload.userId || payload.user_id || payload.sub || payload.id;
              console.log('Extracted user ID from JWT token:', userId);

              // Check if token is expired
              if (payload.exp && payload.exp * 1000 < Date.now()) {
                throw new Error('Authentication token has expired. Please log in again.');
              }
            }
          }
        } catch (error) {
          console.warn('Could not decode JWT token:', error);
          if (error.message.includes('expired')) {
            throw error;
          }
        }
      }

      console.log('=== UPLOAD DEBUG ===');
      console.log('Auth token present:', !!authToken);
      console.log('File details:', {
        name: profilePictureFile.name,
        size: profilePictureFile.size,
        type: profilePictureFile.type
      });
      console.log('Form data ID fields:', {
        id: formData.id
      });
      console.log('User prop ID fields:', {
        id: user?.id,
        userId: user?.userId,
        user_id: user?.user_id
      });
      console.log('Final userId for upload:', userId);
      console.log('=== END UPLOAD DEBUG ===');

      // Validate file before upload
      if (!profilePictureFile.type.startsWith('image/')) {
        throw new Error('Please select a valid image file.');
      }

      if (profilePictureFile.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('Image file is too large. Please select a file smaller than 5MB.');
      }

      // Try upload with detailed error handling
      try {
        const response = await api.user.uploadProfilePicture(profilePictureFile, userId);
        console.log('Upload successful:', response);
        return response.profile_picture || response.url || response.path;
      } catch (uploadError) {
        console.error('Upload error details:', uploadError);

        // Handle specific error cases
        if (uploadError.status === 403) {
          if (uploadError.message?.includes('token')) {
            throw new Error('Authentication failed. Please log out and log in again.');
          } else if (uploadError.message?.includes('permission')) {
            throw new Error('You do not have permission to upload profile pictures. Please contact your administrator.');
          } else {
            throw new Error('Access denied. You may not have permission to upload profile pictures, or your session may have expired. Please try logging out and logging in again.');
          }
        } else if (uploadError.status === 401) {
          throw new Error('Authentication failed. Please log out and log in again.');
        } else if (uploadError.status === 413) {
          throw new Error('Image file is too large. Please select a smaller file.');
        } else if (uploadError.status === 415) {
          throw new Error('Unsupported file type. Please select a valid image file (JPG, PNG, GIF).');
        } else if (uploadError.status === 500) {
          throw new Error('Server error occurred while uploading. Please try again later.');
        } else {
          throw new Error(uploadError.message || 'Failed to upload profile picture. Please try again.');
        }
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      showError(error.message || t('failedUploadPicture'));
      return null;
    } finally {
      setPictureUploading(false);
    }
  };

  const validatePhysicalFields = () => {
    const { weight_kg, height_cm } = formData;

    // Allow empty values (both fields are optional)
    if (weight_kg) {
      const weightStr = String(weight_kg).trim();
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
    }

    if (height_cm) {
      const heightStr = String(height_cm).trim();
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
    }

    return true;
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      showError(t('usernameRequired'));
      return false;
    }
    if (!formData.first_name.trim()) {
      showError(t('firstNameRequired'));
      return false;
    }
    if (!formData.last_name.trim()) {
      showError(t('lastNameRequired'));
      return false;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      showError(t('validEmailRequired'));
      return false;
    }
    if (formData.newPassword && formData.newPassword.length < 6) {
      showError(t('passwordMinLength'));
      return false;
    }
    if (formData.phone && !/^[+]?[\d\s-()]+$/.test(formData.phone)) {
      showError(t('validPhoneRequired'));
      return false;
    }
    if (!validatePhysicalFields()) {
      return false;
    }
    return true;
  };


  // Show initial loading state
  if (initialLoading) {
    return (
      <PageLoader
        message={t('loadingProfile')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 w-full">
      {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                {t('profile', 'My Profile')}
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                {t('updateYourPersionalDetails','Update your personal details and preferences')}
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                onClick={handleEditToggle}
                variant="primary"
                size="sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                <span>{isEditMode ? t('cancel') || 'Cancel' : t('edit') || 'Edit'}</span>
              </Button>
              {isEditMode && (
                <Button
                  type="submit"
                  form="profile-form"
                  disabled={isProfileSubmitDisabled}
                  variant="success"
                  size="sm"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  <span>{loading ? t('updating') : t('save', 'Save Changes')}</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Picture Card - Full Width */}
        {isEditMode && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-8 transition-shadow">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8" ref={dropdownRef}>
              {/* Profile Picture */}
              <div
                className={`relative flex-shrink-0 ${isEditMode ? 'cursor-pointer group' : 'cursor-default'}`}
                onClick={isEditMode ? () => setShowDropdown(!showDropdown) : undefined}
              >
                {profilePictureFile ? (
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(profilePictureFile)}
                      alt="Profile Preview"
                      className="h-32 w-32 sm:h-40 sm:w-40 rounded-full object-cover border-4 border-blue-500 shadow-lg transition-all"
                    />
                    {isEditMode && (
                      <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 transition-all flex items-center justify-center">
                        <Upload className="h-5 w-5 text-white opacity-0 transition-opacity" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    {console.log('ProfileImage data:', {
                      profile_picture: formData.profile_picture,
                      profile_picture_value: formData.profile_picture ? `${formData.profile_picture}` : 'empty'
                    })}
                    <ProfileImage
                      user={formData}
                      size="custom"
                      customSize="h-32 w-32 sm:h-40 sm:w-40"
                      alt="Profile"
                      className="shadow-lg"
                      borderColor="border-blue-500"
                      fallbackType="image"
                      clickable={isEditMode}
                    />
                    {isEditMode && (
                      <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 transition-all flex items-center justify-center">
                        <Upload className="h-5 w-5 text-white opacity-0 transition-opacity" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Info Summary */}
              <div className="flex-1">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900">{formData.username || '-'}</h3>
                  {formData.is_director && (
                    <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full">
                      {t('director') || 'Director'}
                    </span>
                  )}
                  {formData.roleNameKh && (
                    <p className="text-sm text-gray-600">{formData.roleNameKh}</p>
                  )}
                  {formData.school_name && (
                    <p className="text-sm text-gray-500">{formData.school_name}</p>
                  )}
                </div>
              </div>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute z-10 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200">
                  <div className="py-2">
                    {formData.profile_picture && (
                      <Button
                        type="button"
                        onClick={handleViewPicture}
                        variant="ghost"
                        size="sm"
                        fullWidth
                        className="justify-start rounded-none px-4 py-2 text-gray-700"
                      >
                        <Eye className="h-4 w-4 mr-3 text-gray-500" />
                        <span className="text-sm">{t('viewPicture') || 'View Picture'}</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={handleUploadClick}
                      variant="ghost"
                      size="sm"
                      fullWidth
                      className="justify-start rounded-none px-4 py-2 text-gray-700"
                    >
                      <Upload className="h-4 w-4 mr-3 text-blue-500" />
                      <span className="text-sm">{t('uploadNewPicture') || 'Upload New Picture'}</span>
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
              <div className='w-full p-3 sm:p-4 bg-green-50 rounded-lg border border-green-300 mt-4'>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-green-600 mt-0.5">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800">
                      {t('newPictureSelected') || 'New picture selected'}
                    </p>
                    <p className="text-xs text-green-700 mt-1 truncate">
                      {profilePictureFile.name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {pictureUploading && (
              <div className='w-full p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-300 mt-4'>
                <div className="flex items-center gap-3">
                  <div className="animate-spin">
                    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  <p className="text-sm text-blue-700 font-medium">{t('uploadingImage')}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content - Full Width Form or Display */}
        {!isEditMode && (
          <>
            {/* Profile Picture Card - View Mode */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
                {/* Profile Picture */}
                <div className="relative flex-shrink-0">
                  <ProfileImage
                    user={formData}
                    size="custom"
                    customSize="h-32 w-32 sm:h-40 sm:w-40"
                    alt="Profile"
                    className="shadow-lg"
                    borderColor="border-gray-300"
                    fallbackType="image"
                  />
                </div>

                {/* User Info Summary */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {getFullName(formData, formData.username)}
                  </h2>
                  {formData.roleNameKh && (
                    <p className="text-sm text-gray-600 mb-1">
                      {formData.roleNameKh} ({formData.roleNameEn})
                    </p>
                  )}
                  {formData.school_name && (
                    <p className="text-gray-600 text-sm">{formData.school_name}</p>
                  )}
                  {formData.email && (
                    <p className="text-gray-600 text-sm mt-2">{formData.email}</p>
                  )}
                </div>
              </div>
            </div>

            <ProfileInfoDisplay
              formData={formData}
              calculateBMI={calculateBMI}
              getBMICategory={getBMICategory}
            />
          </>
        )}

        {isEditMode && (
        <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information Card */}
                <div className="bg-white rounded-md border border-gray-200 p-6">
                  <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('personalInformation')}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:gap-6 lg:grid-cols-4">
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                        {t('firstName')} *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="first_name"
                          id="first_name"
                          required
                          className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                          value={formData.first_name}
                          onChange={handleInputChange}
                          placeholder={t('enterFirstName')}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                        {t('lastName')} *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="last_name"
                          id="last_name"
                          required
                          className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500 focus:scale-[1.01]"
                          value={formData.last_name}
                          onChange={handleInputChange}
                          placeholder={t('enterLastName')}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('gender')} *
                      </label>
                      <Dropdown
                        options={[
                          { value: 'MALE', label: t('male') },
                          { value: 'FEMALE', label: t('female') }
                        ]}
                        value={formData.gender}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                        placeholder={t('selectGender')}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('dateOfBirth')} *
                      </label>
                      <DatePickerWithDropdowns
                        value={formData.date_of_birth ? new Date(formData.date_of_birth) : null}
                        onChange={handleDateChange}
                        placeholder={t('selectDate')}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('nationality')} *
                      </label>
                      <Dropdown
                        options={[
                          { value: 'ខ្មែរ', label: 'ខ្មែរ (Cambodian)' }
                        ]}
                        value={formData.nationality}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, nationality: value }))}
                        placeholder={t('selectNationality')}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('ethnicGroup')}
                      </label>
                      <Dropdown
                        options={[
                          { value: '', label: t('selectEthnicGroup') },
                          ...baseEthnicGroupOptions
                        ]}
                        value={formData.ethnic_group}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, ethnic_group: value }))}
                        placeholder={t('selectEthnicGroup')}
                        contentClassName="max-h-[200px] overflow-y-auto"
                        className='w-full'
                      />
                    </div>

                    <div>
                      <label htmlFor="weight_kg" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('weight')} ({t('kg')})
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Weight className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="weight_kg"
                          id="weight_kg"
                          className={`mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border focus:scale-[1.01] ${
                            isWeightInvalid()
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                          }`}
                          value={formData.weight_kg}
                          onChange={handleInputChange}
                          onBlur={(e) => {
                            const converted = convertWeightToKg(e.target.value);
                            setFormData(prev => {
                              const updated = { ...prev, weight_kg: converted };
                              if (updated.height_cm) {
                                updated.bmi = calculateBMI(converted, updated.height_cm);
                              }
                              return updated;
                            });
                          }}
                          placeholder={t('enterWeight')}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="height_cm" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('height')} ({t('cm')})
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Ruler className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="height_cm"
                          id="height_cm"
                          className={`mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border focus:scale-[1.01] ${
                            isHeightInvalid()
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                          }`}
                          value={formData.height_cm}
                          onChange={handleInputChange}
                          onBlur={(e) => {
                            const converted = convertHeightToCm(e.target.value);
                            setFormData(prev => {
                              const updated = { ...prev, height_cm: converted };
                              if (updated.weight_kg) {
                                updated.bmi = calculateBMI(updated.weight_kg, converted);
                              }
                              return updated;
                            });
                          }}
                          placeholder={t('enterHeight')}
                        />
                      </div>
                    </div>

                    {/* Accessibility */}
                    <div className='col-span-1 lg:col-span-4'>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('accessibility')}
                      </label>
                      <div className="mt-1 space-y-2 p-3 border border-gray-300 rounded-md bg-gray-50 max-h-40 overflow-y-auto">
                        {[
                          { value: 'ពិបាកក្នុងការធ្វើចលនា', label: 'ពិបាកក្នុងការធ្វើចលនា' },
                          { value: 'ពិបាកក្នុងការស្ដាប់', label: 'ពិបាកក្នុងការស្ដាប់' },
                          { value: 'ពិបាកក្នុងការនីយាយ', label: 'ពិបាកក្នុងការនីយាយ' },
                          { value: 'ពិបាកក្នុងការមើល', label: 'ពិបាកក្នុងការមើល' },
                          { value: 'ពិការសរីរាង្គខាងក្នុង', label: 'ពិការសរីរាង្គខាងក្នុង' },
                          { value: 'ពិការសតិបញ្ញា', label: 'ពិការសតិបញ្ញា' },
                          { value: 'ពិការផ្លូវចិត្ត', label: 'ពិការផ្លូវចិត្ត' },
                          { value: 'ពិការផ្សេងៗ', label: 'ពិការផ្សេងៗ' }
                        ].map((option) => (
                          <label key={option.value} className="flex items-center space-x-2 cursor-pointer p-2 rounded transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.accessibility.includes(option.value)}
                              onChange={(e) => {
                                const newAccessibility = e.target.checked
                                  ? [...formData.accessibility, option.value]
                                  : formData.accessibility.filter(item => item !== option.value);
                                setFormData(prev => ({ ...prev, accessibility: newAccessibility }));
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

                {/* Account Information Card */}
                <div className="bg-white rounded-md border border-gray-200 p-6">
                  <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('account', 'Account')}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:gap-6 lg:grid-cols-4">
                    <div ref={usernameContainerRef}>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        {t('username')} *
                      </label>
                      <div className="relative">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <User className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              name="username"
                              id="username"
                              required
                              className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500 focus:scale-[1.01] "
                              value={formData.username}
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                const newValue = sanitizeUsername(rawValue);
                                setFormData(prev => ({
                                  ...prev,
                                  username: newValue
                                }));

                                if (usernameDebounceRef.current) {
                                  clearTimeout(usernameDebounceRef.current);
                                }
                                usernameDebounceRef.current = setTimeout(() => {
                                  handleGenerateUsernameSuggestions(newValue);
                                }, 400);
                              }}
                              placeholder={t('enterUsername')}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleGenerateUsernameSuggestions(formData.username || '');
                            }}
                            className="mt-1 px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-700 whitespace-nowrap"
                          >
                            {t('suggestion')}
                          </button>
                        </div>

                        {showUsernameSuggestions && usernameSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 text-xs max-h-60 overflow-auto">
                            {usernameSuggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                type="button"
                                className="w-full text-left px-3 py-1"
                                onClick={() => handleChooseUsernameSuggestion(suggestion)}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}

                        {usernameAvailable === true && formData.username && (
                          <p className="mt-1 text-xs text-green-600">
                            {t('usernameAvailable')}
                          </p>
                        )}
                        {usernameAvailable === false && formData.username && (
                          <p className="mt-1 text-xs text-red-600">
                            {t('usernameNotAvailable')}
                          </p>
                        )}
                        {usernameAvailable === null && formData.username && formData.username.trim() && (
                          <p className="mt-1 text-xs text-gray-500">
                            {t('usernameSuggestionHint')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        {t('newPassword')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="password"
                          name="newPassword"
                          id="newPassword"
                          className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500 focus:scale-[1.01]"
                          value={formData.newPassword}
                          onChange={handleInputChange}
                          placeholder={t('enterNewPassword')}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        {t('email')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          name="email"
                          id="email"
                          className={`mt-1 block w-full pl-10 rounded-md shadow-sm text-sm ${
                            emailAvailable === false
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                              : emailAvailable === true
                              ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                          } focus:scale-[1.01] `}
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder={t('enterEmail')}
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
                      {emailAvailable === null && formData.email && formData.email.trim() && (
                        <p className="mt-1 text-xs text-gray-500">
                          {t('emailValidationHint', 'Checking email availability...')}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        {t('phone')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          name="phone"
                          id="phone"
                          className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500 focus:scale-[1.01]"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder={t('enterPhone')}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Residence Card */}
                <div className="bg-white rounded-md border border-gray-200 p-6">
                  <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('currentResidence')}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:gap-6 lg:grid-cols-4">
                    <div>
                      <label htmlFor="residence-province" className="block text-sm font-medium text-gray-700">
                        {t('province')}
                      </label>
                      <div className="mt-1">
                        <Dropdown
                          value={selectedResidenceProvince}
                          onValueChange={(value) => {
                            handleResidenceProvinceChange(value);
                            setFormData(prev => ({
                              ...prev,
                              residence: { ...prev.residence, provinceId: value },
                              provinceId: value
                            }));
                          }}
                          options={getResidenceProvinceOptions()}
                          placeholder={t('selectProvince')}
                          className="w-full"
                          maxHeight="max-h-40"
                          itemsToShow={5}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="residence-district" className="block text-sm font-medium text-gray-700">
                        {t('district')}
                      </label>
                      <div className="mt-1">
                        <Dropdown
                          value={selectedResidenceDistrict}
                          onValueChange={(value) => {
                            handleResidenceDistrictChange(value);
                            setFormData(prev => ({
                              ...prev,
                              residence: { ...prev.residence, districtId: value },
                              districtId: value
                            }));
                          }}
                          options={getResidenceDistrictOptions()}
                          placeholder={t('selectDistrict')}
                          className="w-full"
                          disabled={!selectedResidenceProvince}
                          maxHeight="max-h-40"
                          itemsToShow={5}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="residence-commune" className="block text-sm font-medium text-gray-700">
                        {t('commune')}
                      </label>
                      <div className="mt-1">
                        <Dropdown
                          value={selectedResidenceCommune}
                          onValueChange={(value) => {
                            handleResidenceCommuneChange(value);
                            setFormData(prev => ({
                              ...prev,
                              residence: { ...prev.residence, communeId: value },
                              communeId: value
                            }));
                          }}
                          options={getResidenceCommuneOptions()}
                          placeholder={t('selectCommune')}
                          className="w-full"
                          disabled={!selectedResidenceDistrict}
                          maxHeight="max-h-40"
                          itemsToShow={5}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="residence-village" className="block text-sm font-medium text-gray-700">
                        {t('village')}
                      </label>
                      <div className="mt-1">
                        <Dropdown
                          value={selectedResidenceVillage}
                          onValueChange={(value) => {
                            handleResidenceVillageChange(value);
                            setFormData(prev => ({
                              ...prev,
                              residence: { ...prev.residence, villageId: value },
                              villageId: value
                            }));
                          }}
                          options={getResidenceVillageOptions()}
                          placeholder={t('selectVillage')}
                          className="w-full"
                          disabled={!selectedResidenceCommune}
                          maxHeight="max-h-40"
                          itemsToShow={5}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Place of Birth Card */}
                <div className="bg-white rounded-md border border-gray-200 p-6">
                  <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('placeOfBirth')}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:gap-6 lg:grid-cols-4">
                    <div>
                      <label htmlFor="birth-province" className="block text-sm font-medium text-gray-700">
                        {t('province')}
                      </label>
                      <div className="mt-1">
                        <Dropdown
                          value={selectedBirthProvince}
                          onValueChange={(value) => {
                            handleBirthProvinceChange(value);
                            setFormData(prev => ({
                              ...prev,
                              placeOfBirth: { ...prev.placeOfBirth, provinceId: value }
                            }));
                          }}
                          options={getBirthProvinceOptions()}
                          placeholder={t('selectProvince')}
                          className="w-full"
                          maxHeight="max-h-40"
                          itemsToShow={5}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="birth-district" className="block text-sm font-medium text-gray-700">
                        {t('district')}
                      </label>
                      <div className="mt-1">
                        <Dropdown
                          value={selectedBirthDistrict}
                          onValueChange={(value) => {
                            handleBirthDistrictChange(value);
                            setFormData(prev => ({
                              ...prev,
                              placeOfBirth: { ...prev.placeOfBirth, districtId: value }
                            }));
                          }}
                          options={getBirthDistrictOptions()}
                          placeholder={t('selectDistrict')}
                          className="w-full"
                          disabled={!selectedBirthProvince}
                          maxHeight="max-h-40"
                          itemsToShow={5}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="birth-commune" className="block text-sm font-medium text-gray-700">
                        {t('commune')}
                      </label>
                      <div className="mt-1">
                        <Dropdown
                          value={selectedBirthCommune}
                          onValueChange={(value) => {
                            handleBirthCommuneChange(value);
                            setFormData(prev => ({
                              ...prev,
                              placeOfBirth: { ...prev.placeOfBirth, communeId: value }
                            }));
                          }}
                          options={getBirthCommuneOptions()}
                          placeholder={t('selectCommune')}
                          className="w-full"
                          disabled={!selectedBirthDistrict}
                          maxHeight="max-h-40"
                          itemsToShow={5}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="birth-village" className="block text-sm font-medium text-gray-700">
                        {t('village')}
                      </label>
                      <div className="mt-1">
                        <Dropdown
                          value={selectedBirthVillage}
                          onValueChange={(value) => {
                            handleBirthVillageChange(value);
                            setFormData(prev => ({
                              ...prev,
                              placeOfBirth: { ...prev.placeOfBirth, villageId: value }
                            }));
                          }}
                          options={getBirthVillageOptions()}
                          placeholder={t('selectVillage')}
                          className="w-full"
                          disabled={!selectedBirthCommune}
                          maxHeight="max-h-40"
                          itemsToShow={5}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Employment Information Card */}
                <div className="bg-white rounded-md border border-gray-200 p-6">
                  <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('employmentInformation')}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:gap-6 lg:grid-cols-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('gradeLevel')}
                      </label>
                      <Dropdown
                        options={[
                          { value: '', label: t('selectGradeLevel') },
                          ...gradeLevelOptions
                        ]}
                        value={formData.gradeLevel}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, gradeLevel: value }))}
                        placeholder={t('selectGradeLevel')}
                        className='w-full'
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('employmentType')}
                      </label>
                      <Dropdown
                        options={[
                          { value: '', label: t('selectEmploymentType') },
                          ...employmentTypeOptions
                        ]}
                        value={formData.employment_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, employment_type: value }))}
                        placeholder={t('selectEmploymentType')}
                        className='w-full'
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('salaryType')}
                      </label>
                      <SalaryTypeDropdown
                        employmentType={formData.employment_type}
                        value={formData.salary_type}
                        onValueChange={async (value) => {
                          setFormData(prev => ({ ...prev, salary_type: value, salary_type_name: '' }));
                          // Fetch salary type name for display
                          if (value && formData.employment_type) {
                            try {
                              const salaryTypes = await salaryTypeService.getSalaryTypesByEmploymentType(formData.employment_type);
                              if (Array.isArray(salaryTypes)) {
                                const selectedSalaryType = salaryTypes.find(st => String(st.id || st.salaryTypeId) === value);
                                if (selectedSalaryType) {
                                  setFormData(prev => ({
                                    ...prev,
                                    salary_type_name: selectedSalaryType.name
                                  }));
                                }
                              }
                            } catch (error) {
                              console.warn('Failed to fetch salary type name:', error);
                            }
                          }
                        }}
                        placeholder={t('selectSalaryType')}
                        disabled={!formData.employment_type}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('teachingType')}
                      </label>
                      <Dropdown
                        options={[
                          { value: '', label: t('selectTeachingType') },
                          ...teachingTypeOptions
                        ]}
                        value={formData.teaching_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, teaching_type: value }))}
                        placeholder={t('selectTeachingType')}
                        className='w-full'
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('teacherStatus')}
                      </label>
                      <Dropdown
                        options={[
                          { value: '', label: t('selectTeacherStatus') },
                          ...teacherStatusOptions
                        ]}
                        value={formData.teacher_status}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, teacher_status: value }))}
                        placeholder={t('selectTeacherStatus')}
                        className='w-full'
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('subjects')}
                      </label>
                      <MultiSelectDropdown
                        options={subjectOptions}
                        value={formData.subject}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                        placeholder={t('selectSubjects')}
                        maxHeight='max-h-[200px]'
                        className='w-full'
                      />
                    </div>

                    <div>
                      <label htmlFor="teacher_number" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('teacherNumber')}
                      </label>
                      <input
                        type="text"
                        id="teacher_number"
                        className="mt-1 block w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.teacher_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, teacher_number: e.target.value }))}
                        placeholder={t('enterTeacherNumber')}
                      />
                    </div>

                    <div>
                      <label htmlFor="hire_date" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('hireDate')}
                      </label>
                      <DatePickerWithDropdowns
                        value={formData.hire_date ? new Date(formData.hire_date) : null}
                        onChange={(date) => setFormData(prev => ({
                          ...prev,
                          hire_date: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : ''
                        }))}
                        placeholder={t('pickDate')}
                      />
                    </div>
                  </div>

                  {/* Appointment and Burden Status - Only for Principal (14) and Deputy Principal (15) */}
                  {(String(formData.roleId) === '14' || String(formData.roleId) === '15') && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        {t('appointmentStatus')}
                      </label>
                      <div className="flex items-center gap-6">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={!!formData.appointed}
                            onChange={(e) => setFormData(prev => ({ ...prev, appointed: e.target.checked }))}
                          />
                          <span>{t('appointed')}</span>
                        </label>

                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={!!formData.burden}
                            onChange={(e) => setFormData(prev => ({ ...prev, burden: e.target.checked }))}
                          />
                          <span>{t('burden')}</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Training Information Subsection */}
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <h4 className="text-base font-medium text-gray-900 mb-4">{t('trainingInformation')}</h4>
                    <div className="grid grid-cols-1 gap-3 lg:gap-6 lg:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('educationLevel')}
                        </label>
                        <Dropdown
                          options={[
                            { value: '', label: t('selectEducationLevel') },
                            ...educationLevelOptions
                          ]}
                          value={formData.education_level}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, education_level: value }))}
                          placeholder={t('selectEducationLevel')}
                          className='w-full'
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('trainingType')}
                        </label>
                        <Dropdown
                          options={[
                            { value: '', label: t('selectTrainingType') },
                            ...trainingTypeOptions
                          ]}
                          value={formData.training_type}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, training_type: value }))}
                          placeholder={t('selectTrainingType')}
                          className='w-full'
                        />
                      </div>
                    </div>
                  </div>

                  {/* Extra Learning Tools Subsection */}
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <h4 className="text-base font-medium text-gray-900 mb-4">{t('extraLearningTool')}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(formData.teacherExtraLearningTool).map(([key, value]) => (
                        <div key={key}>
                          <label className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-300 rounded-md transition-colors">
                            <input
                              type="checkbox"
                              checked={value === true}
                              onChange={(e) => {
                                setFormData(prev => ({
                                  ...prev,
                                  teacherExtraLearningTool: {
                                    ...prev.teacherExtraLearningTool,
                                    [key]: e.target.checked
                                  }
                                }));
                              }}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">{key}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Family Information Subsection */}
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <h4 className="text-base font-medium text-gray-900 mb-4">{t('familyInformation')}</h4>
                    <div className="grid grid-cols-1 gap-3 lg:gap-6 lg:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('maritalStatus')}
                        </label>
                        <Dropdown
                          options={[
                            { value: '', label: t('selectMaritalStatus') },
                            ...maritalStatusOptions
                          ]}
                          value={formData.teacher_family.living_status}
                          onValueChange={(value) => {
                            setFormData(prev => {
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

                              // Widow/Divorced: no spouse info, but allow children
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

                              // Married: keep spouse/children data
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
                          placeholder={t('selectMaritalStatus')}
                          className='w-full'
                        />
                      </div>

                      {/* Spouse Information - Show only if living_status is Married */}
                      {formData.teacher_family.living_status === 'រៀបការ' && (
                        <>
                          <div>
                            <label htmlFor="spouse_name" className="block text-sm font-medium text-gray-700 mb-1">
                              {t('partnerName')}
                            </label>
                            <input
                              type="text"
                              id="spouse_name"
                              className="mt-1 block w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                              value={formData.teacher_family.spouse_info.spouse_name}
                              onChange={(e) => {
                                setFormData(prev => ({
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
                              placeholder={t('enterPartnerName')}
                            />
                          </div>

                          <div>
                            <label htmlFor="spouse_occupation" className="block text-sm font-medium text-gray-700 mb-1">
                              {t('partnerJobPlace')}
                            </label>
                            <Dropdown
                              options={[
                                { value: '', label: t('selectSpouseJob') },
                                ...spouseJobOptions
                              ]}
                              value={formData.teacher_family.spouse_info.spouse_occupation}
                              onValueChange={(value) => {
                                setFormData(prev => ({
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
                              placeholder={t('selectSpouseJob')}
                              className='w-full'
                            />
                          </div>

                          <div>
                            <label htmlFor="spouse_phone" className="block text-sm font-medium text-gray-700 mb-1">
                              {t('partnerPhone')}
                            </label>
                            <input
                              type="tel"
                              id="spouse_phone"
                              className="mt-1 block w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                              value={formData.teacher_family.spouse_info.spouse_phone}
                              onChange={(e) => {
                                setFormData(prev => ({
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
                              placeholder={t('enterPhone')}
                            />
                          </div>

                          <div>
                            <label htmlFor="spouse_place_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
                              {t('placeOfBirth')}
                            </label>
                            <input
                              type="text"
                              id="spouse_place_of_birth"
                              className="mt-1 block w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                              value={formData.teacher_family.spouse_info.spouse_place_of_birth}
                              onChange={(e) => {
                                setFormData(prev => ({
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
                              placeholder={t('enterPlaceOfBirth')}
                            />
                          </div>
                        </>
                      )}

                      {/* Number of Children - Show when living_status is not Single */}
                      {formData.teacher_family.living_status && formData.teacher_family.living_status !== 'នៅលីវ' && (
                        <div>
                          <label htmlFor="number_of_children" className="block text-sm font-medium text-gray-700 mb-1">
                            {t('numberOfChildren')}
                          </label>
                          <input
                            type="number"
                            id="number_of_children"
                            min="0"
                            className="mt-1 block w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                            value={formData.teacher_family.number_of_children}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                teacher_family: {
                                  ...prev.teacher_family,
                                  number_of_children: e.target.value
                                }
                              }));
                            }}
                            placeholder={t('enterNumber')}
                          />
                        </div>
                      )}
                    </div>

                    {/* Children List - Show when number_of_children > 0 */}
                    {formData.teacher_family.number_of_children && parseInt(formData.teacher_family.number_of_children) > 0 && (
                      <div className="mt-6 border-t pt-6">
                        <h5 className="text-sm font-semibold text-gray-900 mb-4">{t('childrenInformation')}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Array.from({ length: parseInt(formData.teacher_family.number_of_children) || 0 }).map((_, index) => (
                            <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <label htmlFor={`child_name_${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('childName')} {index + 1}
                                  </label>
                                  <input
                                    type="text"
                                    id={`child_name_${index}`}
                                    value={formData.teacher_family.children[index]?.child_name || ''}
                                    onChange={(e) => {
                                      setFormData(prev => {
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
                                    placeholder={t('enterChildName')}
                                  />
                                </div>
                                <button
                                  type="button"
                                  className="mt-6 inline-flex items-center justify-center h-10 w-10 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50"
                                  onClick={() => {
                                    setFormData(prev => {
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
                                  <span className="sr-only">{t('remove')}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

          </form>
        )}

      {/* Image Modal */}
      {showImageModal && formData.profile_picture && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-4xl max-h-full p-4">
            <Button
              onClick={() => setShowImageModal(false)}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white z-10"
            >
              <X className="w-6 h-6" />
            </Button>
            <img
              src={utils.user.getProfilePictureUrl({ profile_picture: formData.profile_picture })}
              alt="Profile"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmUpdate}
        title={t('confirmUpdate')}
        message={t('confirmUpdateMessage')}
        type="info"
        confirmText={t('update')}
        cancelText={t('cancel')}
        loading={loading}
      />
    </div>
  );
}