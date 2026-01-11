import { useState, useRef, useEffect } from 'react';
import { User, Eye, EyeOff, Upload, Edit, Mail, Lock, Phone, Globe, X, Building, Weight, Ruler, CheckCircle2, Wand2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { DatePickerWithDropdowns } from '../../components/ui/date-picker-with-dropdowns';
import ProfileImage from '../../components/ui/ProfileImage';
import ProfileInfoDisplay from '../../components/ui/ProfileInfoDisplay';
import { api, utils, apiClient } from '../../utils/api';
import { userService, userUtils } from '../../utils/api/services/userService';
import salaryTypeService from '../../utils/api/services/salaryTypeService';
import locationService from '../../utils/api/services/locationService';
import { sanitizeUsername, getFullName } from '../../utils/usernameUtils';
import { convertHeightToCm, convertWeightToKg, calculateBMI } from '../../utils/physicalMeasurementUtils';
import Dropdown from '../../components/ui/Dropdown';
import { useLocationData } from '../../hooks/useLocationData';
import { useStableCallback } from '../../utils/reactOptimization';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import { ethnicGroupOptions as baseEthnicGroupOptions, employmentTypeOptions, accessibilityOptions, educationLevelOptions, trainingTypeOptions, teachingTypeOptions, teacherStatusOptions, subjectOptions, roleOptions, maritalStatusOptions, spouseJobOptions, gradeLevelOptions } from '../../utils/formOptions';
import MultiSelectDropdown from '../../components/ui/MultiSelectDropdown';
import SalaryTypeDropdown from '../../components/ui/SalaryTypeDropdown';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';

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
  const [showDeleteSecondaryRoleDialog, setShowDeleteSecondaryRoleDialog] = useState(false);
  const [showSwitchRoleDialog, setShowSwitchRoleDialog] = useState(false);
  const [pendingRoleSwitch, setPendingRoleSwitch] = useState(null);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [pictureUploading, setPictureUploading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [showCurrentPasswordTab, setShowCurrentPasswordTab] = useState(false);
  const [showNewPasswordTab, setShowNewPasswordTab] = useState(false);
  const [secondaryRoleType, setSecondaryRoleType] = useState(''); // 'PROVINCIAL' | 'DISTRICT' | 'COMMUNE'
  const [secondaryProvinceIds, setSecondaryProvinceIds] = useState([]); // Array of province IDs
  const [secondaryDistrictIds, setSecondaryDistrictIds] = useState([]); // Array of district IDs
  const [secondaryCommuneIds, setSecondaryCommuneIds] = useState([]); // Array of commune IDs
  const [secondaryRoleLoading, setSecondaryRoleLoading] = useState(false);
  const [secondaryProvinces, setSecondaryProvinces] = useState([]);
  const [secondaryDistricts, setSecondaryDistricts] = useState([]);
  const [secondaryCommunes, setSecondaryCommunes] = useState([]);
  const [secondaryLocationLoading, setSecondaryLocationLoading] = useState(false);
  const [existingCommuneOfficer, setExistingCommuneOfficer] = useState(null);
  const [isEditingCommuneOfficer, setIsEditingCommuneOfficer] = useState(false);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [showUsernameSuggestions, setShowUsernameSuggestions] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [originalUsername, setOriginalUsername] = useState('');
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [originalEmail, setOriginalEmail] = useState('');
  const [teacherNumberAvailable, setTeacherNumberAvailable] = useState(null);
  const [originalTeacherNumber, setOriginalTeacherNumber] = useState('');
  const usernameContainerRef = useRef(null);
  const usernameDebounceRef = useRef(null);
  const emailDebounceRef = useRef(null);
  const teacherNumberDebounceRef = useRef(null);

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
    setInitialValues: setResidenceInitialValues,
    loadingProvinces: residenceLoadingProvinces
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
    setInitialValues: setBirthInitialValues,
    loadingProvinces: birthLoadingProvinces
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

  // Load provinces for secondary officer role dropdowns
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        setSecondaryLocationLoading(true);
        const response = await locationService.getProvinces();
        const provinces = Array.isArray(response) ? response : (response?.data || []);
        setSecondaryProvinces(provinces);
      } catch (error) {
        console.error('Error loading secondary provinces:', error);
      } finally {
        setSecondaryLocationLoading(false);
      }
    };

    loadProvinces();
  }, []);

  const handleSecondaryProvinceChange = async (provinceIds) => {
    setSecondaryProvinceIds(provinceIds);
    setSecondaryDistrictIds([]);
    setSecondaryCommuneIds([]);
    setSecondaryDistricts([]);
    setSecondaryCommunes([]);

    if (!provinceIds || provinceIds.length === 0) {
      return;
    }

    try {
      setSecondaryLocationLoading(true);
      const firstProvinceId = provinceIds[0];
      const districtsResponse = await locationService.getDistrictsByProvince(Number(firstProvinceId));
      const districts = Array.isArray(districtsResponse) ? districtsResponse : (districtsResponse?.data || []);
      setSecondaryDistricts(districts);
    } catch (error) {
      console.error('Error loading secondary districts:', error);
    } finally {
      setSecondaryLocationLoading(false);
    }
  };

  const handleSecondaryDistrictChange = async (districtIds) => {
    setSecondaryDistrictIds(districtIds);
    setSecondaryCommuneIds([]);
    setSecondaryCommunes([]);

    if (!districtIds || districtIds.length === 0 || !secondaryProvinceIds || secondaryProvinceIds.length === 0) {
      return;
    }

    try {
      setSecondaryLocationLoading(true);

      const firstDistrictId = districtIds[0];
      const firstProvinceId = secondaryProvinceIds[0];

      // Find the district object to get its code
      const selectedDistrict = secondaryDistricts.find(d => d.id === Number(firstDistrictId));
      const districtCode = selectedDistrict?.district_code || selectedDistrict?.code || firstDistrictId;

      console.log('📍 Loading communes for district:', firstDistrictId, 'with code:', districtCode);

      const communesResponse = await locationService.getCommunesByDistrict(Number(firstProvinceId), Number(districtCode));
      const communes = Array.isArray(communesResponse) ? communesResponse : (communesResponse?.data || []);
      console.log('📍 Communes loaded:', communes.length);
      setSecondaryCommunes(communes);
    } catch (error) {
      console.error('Error loading secondary communes:', error);
    } finally {
      setSecondaryLocationLoading(false);
    }
  };


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
          teacherExtraLearningTool: (() => {
            // Initialize teacher extra learning tools (supports new English keys + legacy Khmer keys)
            const rawTeacherExtra =
              normalizedData.teacherExtraLearningTool ||
              teacher.teacherExtraLearningTool ||
              normalizedData.extraLearningTool ||
              teacher.extraLearningTool ||
              {};

            if (rawTeacherExtra.reading_material_package || rawTeacherExtra.math_grade1_package) {
              // New English-key structure from backend
              const readingNew = rawTeacherExtra.reading_material_package || {};
              const mathNew = rawTeacherExtra.math_grade1_package || {};

              return {
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

              return {
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
          })(),
          extraLearningTool: (() => {
            // Initialize extraLearningTool (package metadata) with new English-key structure, mapping legacy if needed
            const rawExtraTool =
              normalizedData.extraLearningTool ||
              teacher.extraLearningTool ||
              {};

            if (rawExtraTool.reading_material_package || rawExtraTool.math_grade1_package) {
              const readingExtra = rawExtraTool.reading_material_package || {};
              const mathExtra = rawExtraTool.math_grade1_package || {};

              return {
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

              return {
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
          })(),
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
          villageId: normalizedData.residence?.villageId || normalizedData.village_id || '',
          // Secondary officer data
          provincialOfficer: normalizedData.provincialOfficer || null,
          districtOfficer: normalizedData.districtOfficer || null,
          communeOfficer: normalizedData.communeOfficer || null
        };

        setFormData(newFormData);
        setOriginalUsername(newFormData.username || '');
        setOriginalEmail(newFormData.email || '');
        setOriginalTeacherNumber(newFormData.teacher_number || '');
        setTeacherNumberAvailable(null);
        console.log('User data loaded into form, keys present:', Object.keys(newFormData).filter(k => newFormData[k]));

        // Fetch officer data separately if not included in user response
        if (!newFormData.provincialOfficer && !newFormData.districtOfficer && !newFormData.communeOfficer) {
          console.log('Officer data not in main response, fetching additional data...');
          try {
            const officerResponse = await api.user.getUserByID(extractedUserId);
            if (officerResponse?.provincialOfficer || officerResponse?.districtOfficer || officerResponse?.communeOfficer) {
              console.log('✓ Found officer data in additional fetch:', {
                provincialOfficer: officerResponse.provincialOfficer,
                districtOfficer: officerResponse.districtOfficer,
                communeOfficer: officerResponse.communeOfficer
              });
              setFormData(prev => ({
                ...prev,
                provincialOfficer: officerResponse.provincialOfficer || null,
                districtOfficer: officerResponse.districtOfficer || null,
                communeOfficer: officerResponse.communeOfficer || null
              }));
            }
          } catch (error) {
            console.log('Could not fetch officer data:', error.message);
          }
        }

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
          provinceId: (residenceData.provinceId || normalizedData.province_id)?.toString(),
          districtId: (residenceData.districtId || normalizedData.district_id)?.toString(),
          communeId: (residenceData.communeId || normalizedData.commune_id)?.toString(),
          villageId: (residenceData.villageId || normalizedData.village_id)?.toString()
        } : null;

        const birthInitialData = birthData.provinceId || birthData.districtId || birthData.communeId || birthData.villageId ? {
          provinceId: birthData.provinceId?.toString(),
          districtId: birthData.districtId?.toString(),
          communeId: birthData.communeId?.toString(),
          villageId: birthData.villageId?.toString()
        } : residenceInitialData;

        // Set pending location data for initialization
        setPendingResidenceData(residenceInitialData);
        setPendingBirthData(birthInitialData);

        // Reset initialization flags when new user data is loaded
        setResidenceInitialized(false);
        setBirthInitialized(false);

        // Also update the user context if needed
        // Preserve secondary role data from localStorage to avoid losing it
        if (setUser) {
          const storedUser = localStorage.getItem('user');
          const storedUserData = storedUser ? JSON.parse(storedUser) : {};

          const updatedUser = {
            ...userData,
            // Preserve secondary role fields from localStorage
            officerRoles: storedUserData.officerRoles || userData.officerRoles,
            provincialOfficer: storedUserData.provincialOfficer || userData.provincialOfficer,
            districtOfficer: storedUserData.districtOfficer || userData.districtOfficer,
            communeOfficer: storedUserData.communeOfficer || userData.communeOfficer
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

  // Fetch existing secondary officer data from /auth/secondary-roles endpoint
  useEffect(() => {
    const loadSecondaryOfficerData = async () => {
      if (!formData || !formData.id) {
        console.log('FormData or formData.id not ready yet');
        return;
      }

      console.log('Fetching secondary officer data from /auth/secondary-roles');

      try {
        const response = await apiClient.get('/auth/secondary-roles');
        console.log('🔍 Secondary roles API response:', response);
        console.log('🔍 Response.data:', response?.data);
        console.log('🔍 Response.role:', response?.role);

        // The API returns { role, data: {...} } at the top level
        // But apiClient wraps it, so we need to check both response and response.data
        let role = response?.role;
        let data = response?.data;

        // If no role at top level, check if it's nested in data
        if (!role && response?.data?.role) {
          role = response.data.role;
          data = response.data.data;
        }

        console.log('🔍 Extracted role:', role, 'data:', data);

        // If no role or data is null, user has no secondary role
        if (!role || role === null || !data || data === null) {
          console.log('✓ User has no secondary role assigned (role=null, data=null)');
          setExistingCommuneOfficer(null);
          setIsEditingCommuneOfficer(false);
          return;
        }

        let roleType = null;
        let officerData = null;

        console.log('🔍 Mapping role:', role, 'to roleType');

        // Map role name to role type and extract data
        if (role === 'PROVINCIAL_OFFICER') {
          roleType = 'PROVINCIAL';
          officerData = {
            provincialOfficerId: data.provincialOfficerId,
            provinceId: data.provinceId
          };
          console.log('✓ Found Provincial Officer data:', officerData);
        } else if (role === 'DISTRICT_OFFICER') {
          roleType = 'DISTRICT';
          officerData = {
            districtOfficerId: data.districtOfficerId,
            provinceId: data.provinceId,
            districtId: data.districtId
          };
          console.log('✓ Found District Officer data:', officerData);
        } else if (role === 'COMMUNE_OFFICER') {
          roleType = 'COMMUNE';
          officerData = {
            communeOfficerId: data.communeOfficerId,
            provinceId: data.provinceId,
            districtId: data.districtId,
            communeId: data.communeId
          };
          console.log('✓ Found Commune Officer data:', officerData);
        } else {
          console.log('🔍 Unknown role type:', role, 'Data received:', data);
        }

        if (!roleType || !officerData) {
          console.log('❌ Unknown secondary role type:', role);
          setExistingCommuneOfficer(null);
          setIsEditingCommuneOfficer(false);
          return;
        }

        // Pre-fill form with existing data
        setExistingCommuneOfficer(officerData);
        setSecondaryRoleType(roleType);

        // Handle both array and single value formats from API
        const provinceIdsArray = Array.isArray(data.provinceIds)
          ? data.provinceIds.map(String)
          : [String(data.provinceId)];
        setSecondaryProvinceIds(provinceIdsArray);

        if (roleType === 'DISTRICT' || roleType === 'COMMUNE') {
          const districtIdsArray = Array.isArray(data.districtIds)
            ? data.districtIds.map(String)
            : [String(data.districtId)];
          setSecondaryDistrictIds(districtIdsArray);
        }

        if (roleType === 'COMMUNE') {
          const communeIdsArray = Array.isArray(data.communeIds)
            ? data.communeIds.map(String)
            : [String(data.communeId)];
          setSecondaryCommuneIds(communeIdsArray);
        }

        setIsEditingCommuneOfficer(true);

        console.log('✅ Secondary role form pre-filled with', roleType, 'officer data');

        // Load districts for the first selected province
        try {
          const firstProvinceId = Array.isArray(data.provinceIds) ? data.provinceIds[0] : data.provinceId;
          const firstDistrictId = Array.isArray(data.districtIds) ? data.districtIds[0] : data.districtId;

          const districtsResponse = await locationService.getDistrictsByProvince(Number(firstProvinceId));
          const districts = Array.isArray(districtsResponse) ? districtsResponse : (districtsResponse?.data || []);
          setSecondaryDistricts(districts);
          console.log('📍 Loaded districts for province', firstProvinceId, ':', districts.length, 'districts');

          // Load communes for the district if district is selected
          if (firstDistrictId) {
            // Find the district to get its code
            const selectedDistrict = districts.find(d => d.id === firstDistrictId);
            const districtCode = selectedDistrict?.district_code || selectedDistrict?.code || firstDistrictId;

            console.log('🔍 Loading communes for district ID:', firstDistrictId, 'with code:', districtCode);

            const communesResponse = await locationService.getCommunesByDistrict(Number(firstProvinceId), Number(districtCode));
            const communes = Array.isArray(communesResponse) ? communesResponse : (communesResponse?.data || []);
            setSecondaryCommunes(communes);
            console.log('📍 Loaded communes:', communes.length, 'communes');
          }
        } catch (error) {
          console.error('Error loading location data:', error);
        }
      } catch (error) {
        console.error('❌ Could not fetch secondary roles:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        setExistingCommuneOfficer(null);
        setIsEditingCommuneOfficer(false);
      }
    };

    loadSecondaryOfficerData();
  }, [formData?.id]);

  // Initialize location data when pending data is available and provinces are loaded
  useEffect(() => {
    if (!residenceInitialized && pendingResidenceData && !residenceLoadingProvinces) {
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
    }
  }, [pendingResidenceData, residenceInitialized, residenceLoadingProvinces, setResidenceInitialValues]);

  useEffect(() => {
    if (!birthInitialized && pendingBirthData && !birthLoadingProvinces) {
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
    }
  }, [pendingBirthData, birthInitialized, birthLoadingProvinces, setBirthInitialValues]);

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

  const handleSecondaryRoleSubmit = async (e) => {
    e.preventDefault();

    if (!secondaryRoleType) {
      showError(t('secondaryRoleTypeRequired', 'សូមជ្រើសរើសតួនាទីបន្ថែមមួយ')); 
      return;
    }

    if (secondaryProvinceIds.length === 0) {
      showError(t('provinceIdRequired', 'សូមបំពេញលេខកូដខេត្ត'));
      return;
    }

    if (secondaryRoleType === 'DISTRICT' && secondaryDistrictIds.length === 0) {
      showError(t('districtIdRequired', 'សូមបំពេញលេខកូដស្រុក'));
      return;
    }

    if (secondaryRoleType === 'COMMUNE' && (secondaryDistrictIds.length === 0 || secondaryCommuneIds.length === 0)) {
      showError(t('communeIdRequired', 'សូមបំពេញលេខកូដស្រុក និងលេខកូដឃុំ'));
      return;
    }

    const authUser = (() => {
      try {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
      } catch (error) {
        console.warn('Could not parse user from localStorage in secondary role:', error);
        return null;
      }
    })();

    const targetUserId = formData.id || formData.userId || user?.id || authUser?.id;

    if (!targetUserId) {
      showError(t('userIdNotFound', 'មិនអាចស្វែងរកលេខអ្នកប្រើសម្រាប់បន្ថែមតួនាទីបានទេ'));
      return;
    }

    // Auto-generate position and department based on secondary role type
    let position = '';
    let department = 'Education Department';

    if (secondaryRoleType === 'PROVINCIAL') {
      position = t('provincialOfficer', 'មន្ត្រីខេត្ត');
      department = t('department', 'នាយកដ្ឋានអប់រំ');
    } else if (secondaryRoleType === 'DISTRICT') {
      position = t('districtOfficer', 'មន្ត្រីស្រុក');
      department = t('department', 'នាយកដ្ឋានអប់រំ');
    } else if (secondaryRoleType === 'COMMUNE') {
      position = t('communeOfficer', 'មន្ត្រីឃុំ');
      department = t('department', 'នាយកដ្ឋានអប់រំ');
    }

    // Convert string IDs to numbers for API payload
    const provinceIds = secondaryProvinceIds.map(id => Number(id));
    const districtIds = secondaryDistrictIds.map(id => Number(id));
    const communeIds = secondaryCommuneIds.map(id => Number(id));

    // Payload for CREATE - includes userId since API needs to know which user
    const createPayload = {
      userId: targetUserId,
      provinceIds: provinceIds,
      position: position,
      department: department,
    };

    // Payload for UPDATE - excludes userId since it's in the URL path
    const updateBasePayload = {
      provinceIds: provinceIds,
      position: position,
      department: department,
    };

    let createData = createPayload;
    let updateData = updateBasePayload;

    if (secondaryRoleType === 'DISTRICT') {
      createData = {
        ...createPayload,
        districtIds: districtIds,
      };
      updateData = {
        ...updateBasePayload,
        districtIds: districtIds,
      };
    } else if (secondaryRoleType === 'COMMUNE') {
      createData = {
        ...createPayload,
        districtIds: districtIds,
        communeIds: communeIds,
      };
      updateData = {
        ...updateBasePayload,
        districtIds: districtIds,
        communeIds: communeIds,
      };
    }

    if (!secondaryRoleType) {
      showError(t('secondaryRoleTypeRequired', 'សូមជ្រើសរើសតួនាទីបន្ថែមមួយ'));
      return;
    }

    setSecondaryRoleLoading(true);
    try {
      if (isEditingCommuneOfficer && existingCommuneOfficer) {
        // Update existing officer - determine which service method to use based on role type
        if (secondaryRoleType === 'PROVINCIAL') {
          await userService.updateProvincialOfficer(targetUserId, updateData);
          showSuccess(t('secondaryRoleUpdated', 'បានរក្សាទុកតួនាទីបន្ថែមដោយជោគជ័យ'));
        } else if (secondaryRoleType === 'DISTRICT') {
          await userService.updateDistrictOfficer(targetUserId, updateData);
          showSuccess(t('secondaryRoleUpdated', 'បានរក្សាទុកតួនាទីបន្ថែមដោយជោគជ័យ'));
        } else if (secondaryRoleType === 'COMMUNE') {
          await userService.updateCommuneOfficer(targetUserId, updateData);
          showSuccess(t('secondaryRoleUpdated', 'បានរក្សាទុកតួនាទីបន្ថែមដោយជោគជ័យ'));
        }
      } else {
        // Create new officer
        if (secondaryRoleType === 'PROVINCIAL') {
          await userService.createProvincialOfficer(createData);
        } else if (secondaryRoleType === 'DISTRICT') {
          await userService.createDistrictOfficer(createData);
        } else if (secondaryRoleType === 'COMMUNE') {
          await userService.createCommuneOfficer(createData);
        }
        showSuccess(t('secondaryRoleCreated', 'បានបន្ថែមតួនាទីបន្ថែមដោយជោគជ័យ'));
      }

      // Refresh secondary role data from API after successful operation
      try {
        console.log('🔄 Refreshing secondary role data after successful save...');
        const response = await userService.getSecondaryRoles();
        console.log('📥 Refresh response:', response);

        // Parse response similar to initial load - handle both top-level and nested structures
        let role = response?.role;
        let data = response?.data;

        // If no role at top level, check if it's nested in data
        if (!role && response?.data?.role) {
          role = response.data.role;
          data = response.data.data;
        }

        console.log('🔍 Extracted role:', role, 'data:', data);

        if (role && role !== null && data && data !== null) {
          let roleType = null;

          if (role === 'PROVINCIAL_OFFICER') {
            roleType = 'PROVINCIAL';
          } else if (role === 'DISTRICT_OFFICER') {
            roleType = 'DISTRICT';
          } else if (role === 'COMMUNE_OFFICER') {
            roleType = 'COMMUNE';
          }

          if (roleType) {
            // Pre-fill form with refreshed data
            setSecondaryRoleType(roleType);

            // Handle both array and single value formats from API
            const provinceIdsArray = Array.isArray(data.provinceIds)
              ? data.provinceIds.map(String)
              : [String(data.provinceId)];
            setSecondaryProvinceIds(provinceIdsArray);

            if (roleType === 'DISTRICT' || roleType === 'COMMUNE') {
              const districtIdsArray = Array.isArray(data.districtIds)
                ? data.districtIds.map(String)
                : [String(data.districtId)];
              setSecondaryDistrictIds(districtIdsArray);
            }

            if (roleType === 'COMMUNE') {
              const communeIdsArray = Array.isArray(data.communeIds)
                ? data.communeIds.map(String)
                : [String(data.communeId)];
              setSecondaryCommuneIds(communeIdsArray);
            }

            // Set edit mode for refreshed data
            let officerData = null;
            const firstProvinceId = Array.isArray(data.provinceIds) ? data.provinceIds[0] : data.provinceId;
            const firstDistrictId = Array.isArray(data.districtIds) ? data.districtIds[0] : data.districtId;
            const firstCommuneId = Array.isArray(data.communeIds) ? data.communeIds[0] : data.communeId;

            if (roleType === 'PROVINCIAL') {
              officerData = {
                provincialOfficerId: data.provincialOfficerId,
                provinceId: firstProvinceId
              };
            } else if (roleType === 'DISTRICT') {
              officerData = {
                districtOfficerId: data.districtOfficerId,
                provinceId: firstProvinceId,
                districtId: firstDistrictId
              };
            } else if (roleType === 'COMMUNE') {
              officerData = {
                communeOfficerId: data.communeOfficerId,
                provinceId: firstProvinceId,
                districtId: firstDistrictId,
                communeId: firstCommuneId
              };
            }

            setExistingCommuneOfficer(officerData);
            setIsEditingCommuneOfficer(true);

            // Update localStorage with new secondary role data to notify sidebar
            try {
              const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

              // Build complete officer data with arrays
              let completeOfficerData = {};
              if (roleType === 'PROVINCIAL') {
                completeOfficerData.provincialOfficer = {
                  provincialOfficerId: data.provincialOfficerId,
                  provinceIds: Array.isArray(data.provinceIds) ? data.provinceIds : [data.provinceId],
                  status: data.status
                };
              } else if (roleType === 'DISTRICT') {
                completeOfficerData.districtOfficer = {
                  districtOfficerId: data.districtOfficerId,
                  provinceIds: Array.isArray(data.provinceIds) ? data.provinceIds : [data.provinceId],
                  districtIds: Array.isArray(data.districtIds) ? data.districtIds : [data.districtId],
                  status: data.status
                };
              } else if (roleType === 'COMMUNE') {
                completeOfficerData.communeOfficer = {
                  communeOfficerId: data.communeOfficerId,
                  provinceIds: Array.isArray(data.provinceIds) ? data.provinceIds : [data.provinceId],
                  districtIds: Array.isArray(data.districtIds) ? data.districtIds : [data.districtId],
                  communeIds: Array.isArray(data.communeIds) ? data.communeIds : [data.communeId],
                  status: data.status
                };
              }

              const updatedUser = {
                ...currentUser,
                officerRoles: [role],
                ...completeOfficerData
              };
              userUtils.saveUserData(updatedUser);
              console.log('✅ Updated localStorage with secondary role data:', completeOfficerData);
            } catch (err) {
              console.error('⚠️ Error updating localStorage:', err);
            }

            // Reload location dropdowns
            try {
              const districtsResponse = await locationService.getDistrictsByProvince(Number(firstProvinceId));
              const districts = Array.isArray(districtsResponse) ? districtsResponse : (districtsResponse?.data || []);
              setSecondaryDistricts(districts);

              if (firstDistrictId) {
                const selectedDistrict = districts.find(d => d.id === firstDistrictId);
                const districtCode = selectedDistrict?.district_code || selectedDistrict?.code || firstDistrictId;

                const communesResponse = await locationService.getCommunesByDistrict(Number(firstProvinceId), Number(districtCode));
                const communes = Array.isArray(communesResponse) ? communesResponse : (communesResponse?.data || []);
                setSecondaryCommunes(communes);
              }
            } catch (error) {
              console.error('Error reloading location data:', error);
            }

            console.log('✅ Secondary role data refreshed successfully');
          }
        } else {
          console.log('ℹ️ User has no secondary role after save');
          setSecondaryRoleType('');
          setSecondaryProvinceIds([]);
          setSecondaryDistrictIds([]);
          setSecondaryCommuneIds([]);
          setExistingCommuneOfficer(null);
          setIsEditingCommuneOfficer(false);
        }
      } catch (refreshError) {
        console.error('❌ Error refreshing secondary role data:', refreshError);
        // Keep current form data if refresh fails - don't reset
        // The data was already saved successfully, just the refresh failed
        console.log('⚠️ Keeping current form data despite refresh error');
      }
    } catch (error) {
      console.error('Error saving secondary officer role:', error);
      const apiMessage = error?.response?.data?.message || error?.message;
      const errorMsg = isEditingCommuneOfficer
        ? t('secondaryRoleUpdateFailed', 'រក្សាទុកតួនាទីបន្ថែមមិនបានជោគជ័យ')
        : t('secondaryRoleCreateFailed', 'បន្ថែមតួនាទីបន្ថែមមិនបានជោគជ័យ');
      showError(apiMessage || errorMsg);
    } finally {
      setSecondaryRoleLoading(false);
    }
  };

  const handleDeleteSecondaryRole = () => {
    if (!isEditingCommuneOfficer || !existingCommuneOfficer) {
      showError(t('noSecondaryRoleToDelete', 'No secondary role to delete'));
      return;
    }

    // Show confirmation dialog
    setShowDeleteSecondaryRoleDialog(true);
  };

  const handleConfirmDeleteSecondaryRole = async () => {
    try {
      setSecondaryRoleLoading(true);
      const targetUserId = formData.id;

      console.log('🗑️ Deleting secondary role for user:', targetUserId, 'Type:', secondaryRoleType);

      // Call appropriate delete method based on role type
      if (secondaryRoleType === 'PROVINCIAL') {
        await userService.deleteProvincialOfficer(targetUserId);
        showSuccess(t('secondaryRoleDeleted', 'បានលុបតួនាទីបន្ថែមដោយជោគជ័យ'));
      } else if (secondaryRoleType === 'DISTRICT') {
        await userService.deleteDistrictOfficer(targetUserId);
        showSuccess(t('secondaryRoleDeleted', 'បានលុបតួនាទីបន្ថែមដោយជោគជ័យ'));
      } else if (secondaryRoleType === 'COMMUNE') {
        await userService.deleteCommuneOfficer(targetUserId);
        showSuccess(t('secondaryRoleDeleted', 'បានលុបតួនាទីបន្ថែមដោយជោគជ័យ'));
      }

      // Reset form after successful deletion
      setSecondaryRoleType('');
      setSecondaryProvinceIds([]);
      setSecondaryDistrictIds([]);
      setSecondaryCommuneIds([]);
      setSecondaryDistricts([]);
      setSecondaryCommunes([]);
      setExistingCommuneOfficer(null);
      setIsEditingCommuneOfficer(false);

      // Update localStorage to remove secondary role data and notify sidebar
      try {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = {
          ...currentUser,
          officerRoles: [],
          provincialOfficer: null,
          districtOfficer: null,
          communeOfficer: null
        };
        userUtils.saveUserData(updatedUser);
        console.log('✅ Cleared secondary role from localStorage');
      } catch (err) {
        console.error('⚠️ Error updating localStorage:', err);
      }

      // Close dialog
      setShowDeleteSecondaryRoleDialog(false);

      console.log('✅ Secondary role deleted successfully');
    } catch (error) {
      console.error('Error deleting secondary officer role:', error);
      const apiMessage = error?.response?.data?.message || error?.message;
      const errorMsg = t('secondaryRoleDeleteFailed', 'Failed to delete secondary role');
      showError(apiMessage || errorMsg);
    } finally {
      setSecondaryRoleLoading(false);
    }
  };

  const handleRoleTypeChange = (newRoleType) => {
    // Check if we're switching to a different role type while editing
    if (isEditingCommuneOfficer && existingCommuneOfficer) {
      // Determine current role type
      let currentRoleType = '';
      if (existingCommuneOfficer.provincialOfficerId) {
        currentRoleType = 'PROVINCIAL';
      } else if (existingCommuneOfficer.districtOfficerId) {
        currentRoleType = 'DISTRICT';
      } else if (existingCommuneOfficer.communeOfficerId) {
        currentRoleType = 'COMMUNE';
      }

      // If switching to a different role type, show confirmation dialog
      if (newRoleType && newRoleType !== currentRoleType && newRoleType !== '') {
        console.log('🔄 User switching from', currentRoleType, 'to', newRoleType);
        setPendingRoleSwitch(newRoleType);
        setShowSwitchRoleDialog(true);
        return; // Don't change role type yet
      }
    }

    // Normal role type change (restore or reset)
    let shouldRestoreData = false;
    let dataToRestore = null;

    if (isEditingCommuneOfficer && existingCommuneOfficer) {
      // Determine what the original role type is based on existing officer data
      let originalRoleType = '';
      if (existingCommuneOfficer.provincialOfficerId) {
        originalRoleType = 'PROVINCIAL';
      } else if (existingCommuneOfficer.districtOfficerId) {
        originalRoleType = 'DISTRICT';
      } else if (existingCommuneOfficer.communeOfficerId) {
        originalRoleType = 'COMMUNE';
      }

      // If selecting the same role type as the existing data, restore it
      if (newRoleType === originalRoleType) {
        shouldRestoreData = true;
        dataToRestore = existingCommuneOfficer;
      }
    }

    setSecondaryRoleType(newRoleType);

    // Restore pre-filled data if switching back to original role type
    if (shouldRestoreData && dataToRestore) {
      console.log('🔄 Restoring pre-filled data for', newRoleType, ':', dataToRestore);
      setSecondaryProvinceIds([String(dataToRestore.provinceId)]);

      if (newRoleType === 'DISTRICT' || newRoleType === 'COMMUNE') {
        setSecondaryDistrictIds([String(dataToRestore.districtId)]);
      }

      if (newRoleType === 'COMMUNE') {
        setSecondaryCommuneIds([String(dataToRestore.communeId)]);
      }

      // Reload location dropdowns
      (async () => {
        try {
          const districtsResponse = await locationService.getDistrictsByProvince(Number(dataToRestore.provinceId));
          const districts = Array.isArray(districtsResponse) ? districtsResponse : (districtsResponse?.data || []);
          setSecondaryDistricts(districts);

          if (dataToRestore.districtId) {
            const selectedDistrict = districts.find(d => d.id === dataToRestore.districtId);
            const districtCode = selectedDistrict?.district_code || selectedDistrict?.code || dataToRestore.districtId;

            const communesResponse = await locationService.getCommunesByDistrict(Number(dataToRestore.provinceId), Number(districtCode));
            const communes = Array.isArray(communesResponse) ? communesResponse : (communesResponse?.data || []);
            setSecondaryCommunes(communes);
          }
        } catch (error) {
          console.error('Error reloading location data:', error);
        }
      })();
    } else if (newRoleType !== secondaryRoleType) {
      // Reset location fields when changing to a different role type
      setSecondaryProvinceIds([]);
      setSecondaryDistrictIds([]);
      setSecondaryCommuneIds([]);
      setSecondaryDistricts([]);
      setSecondaryCommunes([]);
    }
  };

  const handleConfirmSwitchRole = async () => {
    if (!pendingRoleSwitch) {
      return;
    }

    try {
      setSecondaryRoleLoading(true);
      const targetUserId = formData.id;
      const currentRoleType = secondaryRoleType;

      console.log('🔄 Switching from', currentRoleType, 'to', pendingRoleSwitch);

      // Delete the current secondary role
      if (currentRoleType === 'PROVINCIAL') {
        await userService.deleteProvincialOfficer(targetUserId);
      } else if (currentRoleType === 'DISTRICT') {
        await userService.deleteDistrictOfficer(targetUserId);
      } else if (currentRoleType === 'COMMUNE') {
        await userService.deleteCommuneOfficer(targetUserId);
      }

      console.log('✅ Current role deleted, switching to', pendingRoleSwitch);

      // Reset form for new role type
      setSecondaryRoleType(pendingRoleSwitch);
      setSecondaryProvinceIds([]);
      setSecondaryDistrictIds([]);
      setSecondaryCommuneIds([]);
      setSecondaryDistricts([]);
      setSecondaryCommunes([]);
      setExistingCommuneOfficer(null);
      setIsEditingCommuneOfficer(false);
      setPendingRoleSwitch(null);
      setShowSwitchRoleDialog(false);

      showSuccess(t('secondaryRoleSwitched', 'បាន切换តួនាទីបន្ថែមដោយជោគជ័យ'));
      console.log('✅ Secondary role switched successfully');
    } catch (error) {
      console.error('Error switching secondary role:', error);
      const apiMessage = error?.response?.data?.message || error?.message;
      const errorMsg = t('secondaryRoleSwitchFailed', 'Failed to switch secondary role');
      showError(apiMessage || errorMsg);
    } finally {
      setSecondaryRoleLoading(false);
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
    (formData.teacher_number?.trim() && teacherNumberAvailable === false) ||
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
      // Build update data with upfront construction and cleanup pattern (matching TeacherEditModal)
      const updateData = {
        // Basic Personal Information
        username: formData.username?.trim() || undefined,
        first_name: formData.first_name?.trim() || undefined,
        last_name: formData.last_name?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,

        // Date & Identity
        date_of_birth: formData.date_of_birth || undefined,
        gender: formData.gender || undefined,
        nationality: formData.nationality?.trim() || undefined,
        profile_picture: profilePictureUrl || formData.profile_picture || undefined,

        // Physical Information
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined,
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : undefined,
        bmi: formData.bmi ? parseFloat(formData.bmi) : undefined,

        // Location Information
        ethnic_group: formData.ethnic_group?.trim() || undefined,
        residence: {
          provinceId: selectedResidenceProvince || formData.residence?.provinceId || undefined,
          districtId: selectedResidenceDistrict || formData.residence?.districtId || undefined,
          communeId: selectedResidenceCommune || formData.residence?.communeId || undefined,
          villageId: selectedResidenceVillage || formData.residence?.villageId || undefined,
        },
        placeOfBirth: {
          provinceId: selectedBirthProvince || formData.placeOfBirth?.provinceId || undefined,
          districtId: selectedBirthDistrict || formData.placeOfBirth?.districtId || undefined,
          communeId: selectedBirthCommune || formData.placeOfBirth?.communeId || undefined,
          villageId: selectedBirthVillage || formData.placeOfBirth?.villageId || undefined,
        },

        // Health & Accessibility
        accessibility: formData.accessibility && formData.accessibility.length > 0 ? formData.accessibility : undefined,

        // Teacher-Specific Fields
        employment_type: formData.employment_type || undefined,
        salaryTypeId: formData.salary_type ? parseInt(formData.salary_type) : undefined,
        educationLevel: formData.education_level || undefined,
        trainingType: formData.training_type || undefined,
        teachingType: formData.teaching_type || undefined,
        teacherStatus: formData.teacher_status || undefined,
        subject: formData.subject && formData.subject.length > 0 ? formData.subject : undefined,
        gradeLevel: formData.gradeLevel === null ? null : (formData.gradeLevel?.trim() || undefined),
        hire_date: formData.hire_date || undefined,
        appointed: typeof formData.appointed === 'boolean' ? formData.appointed : undefined,
        burden: typeof formData.burden === 'boolean' ? formData.burden : undefined,

        // Teacher Learning Tools
        teacherExtraLearningTool: formData.teacherExtraLearningTool || undefined,
        extraLearningTool: formData.extraLearningTool || undefined,

        // Books Assignment
        bookIds: formData.bookIds && formData.bookIds.length > 0 ? formData.bookIds : null,

        // Family Information
        teacher_family: buildTeacherFamilyPayload()
      };

      // Add password if provided
      if (formData.newPassword && formData.newPassword.trim()) {
        updateData.newPassword = formData.newPassword.trim();
      }

      // Remove undefined/empty values - but keep bookIds, gradeLevel, and learning tool objects even when null
      const cleanUpdateData = Object.keys(updateData).reduce((acc, k) => {
        // Special cases: keep bookIds, gradeLevel, and learning tool objects even when null so backend sees explicit values
        if (k === 'bookIds' || k === 'gradeLevel' || k === 'teacherExtraLearningTool' || k === 'extraLearningTool') {
          acc[k] = updateData[k];
          return acc;
        }

        // For objects (residence, placeOfBirth, teacher_family), only keep if they have at least one defined value
        if (typeof updateData[k] === 'object' && updateData[k] !== null) {
          const hasDefinedValue = Object.values(updateData[k]).some(v => v !== undefined && v !== null && v !== '');
          if (hasDefinedValue) {
            acc[k] = updateData[k];
          }
          return acc;
        }

        // For other values, only keep if defined, not null, and not empty string
        if (updateData[k] !== undefined && updateData[k] !== null && updateData[k] !== '') {
          acc[k] = updateData[k];
        }
        return acc;
      }, {});

      Object.assign(updateData, cleanUpdateData);

      // Use the correct endpoint for updating user profile via PUT /users/{userId}
      const userId = formData.id;
      if (!userId) {
        throw new Error('User ID not found in form data');
      }
      const response = await api.user.updateUser(userId, updateData);
      clearTimeout(timeoutId);

      // Preserve secondary role data from localStorage when updating user
      const storedUser = localStorage.getItem('user');
      const storedUserData = storedUser ? JSON.parse(storedUser) : {};

      const updatedUser = {
        ...user,
        ...response,
        // Preserve secondary role fields from localStorage
        officerRoles: storedUserData.officerRoles || user.officerRoles,
        provincialOfficer: storedUserData.provincialOfficer || user.provincialOfficer,
        districtOfficer: storedUserData.districtOfficer || user.districtOfficer,
        communeOfficer: storedUserData.communeOfficer || user.communeOfficer
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

    // Handle teacher_number validation
    if (name === 'teacher_number') {
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
            // If teacher number exists, it's not available; if it doesn't exist, it's available
            setTeacherNumberAvailable(!result.exists);
          } catch (error) {
            console.error('Error checking teacher number:', error);
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
    if (formData.newPassword) {
      if (formData.newPassword.length < 8) {
        showError(t('passwordMinLength'));
        return false;
      }
      // Reject if contains non-English characters (only accept ASCII)
      const hasNonEnglish = /[^\x00-\x7F]/.test(formData.newPassword);
      if (hasNonEnglish) {
        showError(t('passwordEnglishOnly', 'Password must contain only English characters'));
        return false;
      }
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

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!newPasswordInput || !confirmNewPasswordInput) {
      showError(t('passwordFieldsRequired', 'សូមបំពេញពាក្យសម្ងាត់ទាំងអស់'));
      return;
    }

    if (newPasswordInput !== confirmNewPasswordInput) {
      showError(t('passwordsDoNotMatch', 'ពាក្យសម្ងាត់ថ្មី និងការបញ្ជាក់ម្តងទៀត មិនត្រូវគ្នា'));
      return;
    }

    if (newPasswordInput.length < 8) {
      showError(t('passwordMinLength', 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 8 តួអក្សរ'));
      return;
    }

    const hasNonEnglish = /[^\x00-\x7F]/.test(newPasswordInput);
    if (hasNonEnglish) {
      showError(t('passwordEnglishOnly', 'ពាក្យសម្ងាត់ត្រូវប្រើតែអក្សរអង់គ្លេសប៉ុណ្ណោះ'));
      return;
    }

    // Use same admin reset endpoint logic as ResetPasswordModal
    const authUser = (() => {
      try {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
      } catch (error) {
        console.warn('Could not parse user from localStorage in password reset:', error);
        return null;
      }
    })();

    const targetUserId = formData.id || formData.userId || user?.id || authUser?.id;

    if (!targetUserId) {
      showError(t('userIdNotFound', 'មិនអាចស្វែងរកលេខអ្នកប្រើសម្រាប់កំណត់ពាក្យសម្ងាត់ឡើងវិញបានទេ'));
      return;
    }

    setChangePasswordLoading(true);
    try {
      const response = await api.admin.resetTeacherPassword(targetUserId, newPasswordInput);

      if (response?.success) {
        showSuccess(t('passwordChangedSuccess', 'បានប្តូរពាក្យសម្ងាត់ដោយជោគជ័យ'));
        setNewPasswordInput('');
        setConfirmNewPasswordInput('');
      } else {
        const apiMessage = response?.error || t('passwordChangeFailed', 'ប្តូរពាក្យសម្ងាត់មិនបានជោគជ័យ');
        showError(apiMessage);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      const apiMessage = error?.response?.data?.message || error?.message;
      showError(apiMessage || t('passwordChangeFailed', 'ប្តូរពាក្យសម្ងាត់មិនបានជោគជ័យ'));
    } finally {
      setChangePasswordLoading(false);
    }
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
      <Tabs defaultValue="overview" className="w-full">
        {/* Sticky Header + Tabs Container */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-2 pb-3 bg-gray-50/95 backdrop-blur">
          {/* Header Section */}
          <div className="mb-3 sm:mb-4">
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

          <TabsList className="w-full justify-start overflow-x-auto border border-gray-200 rounded-sm bg-white shadow-sm">
            <TabsTrigger value="overview">{t('profileOverview', 'Profile overview')}</TabsTrigger>
            <TabsTrigger value="sample1">{t('resetPassword', 'Reset password')}</TabsTrigger>
            <TabsTrigger value="sample2">{t('addRole', 'Add role')}</TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4">

        <TabsContent value="overview">

        {/* Profile Picture Card - Full Width */}
        {isEditMode && (
          <div className="bg-white rounded-md border border-gray-200 shadow-sm p-8 mb-8 transition-shadow">
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
                <div className="absolute z-10 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200">
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
              <div className='w-full p-3 sm:p-4 bg-green-50 rounded-md border border-green-300 mt-4'>
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
              <div className='w-full p-3 sm:p-4 bg-blue-50 rounded-md border border-blue-300 mt-4'>
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
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-8 mb-8">
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
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
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
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
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
                        {t('role', 'Role')}
                      </label>
                      <Dropdown
                        value={formData.roleId}
                        onValueChange={(value) => {
                          const selectedRole = roleOptions.find(r => r.value === value);
                          setFormData(prev => ({
                            ...prev,
                            roleId: value,
                            role: value,
                            roleNameKh: selectedRole?.label || ''
                          }));
                        }}
                        options={roleOptions}
                        placeholder={t('selectRole', 'Select Role')}
                        className="w-full"
                        maxHeight="max-h-40"
                      />
                      {formData.roleId && (
                        <p className="mt-1 text-xs text-green-600">
                          ✓ {roleOptions.find(r => r.value === formData.roleId)?.label}
                        </p>
                      )}
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
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
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
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
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
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                            <User className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            name="username"
                            id="username"
                            required
                            className="mt-1 block w-full pl-10 pr-10 rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500 focus:scale-[1.01] "
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
                          <button
                            type="button"
                            onClick={() => {
                              handleGenerateUsernameSuggestions(formData.username || '');
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
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <Lock className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="newPassword"
                          id="newPassword"
                          className="mt-1 block w-full pl-10 pr-10 rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500 focus:scale-[1.01]"
                          value={formData.newPassword}
                          onChange={handleInputChange}
                          placeholder={t('enterNewPassword')}
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
                      {formData.newPassword && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">{t('passwordStrength', 'Password Strength')}</span>
                            <span className={`text-xs font-medium ${getPasswordStrength(formData.newPassword).color.replace('bg-', 'text-')}`}>
                              {getPasswordStrength(formData.newPassword).label}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${getPasswordStrength(formData.newPassword).color}`}
                              style={{ width: `${Math.min((formData.newPassword.length / 8) * 100, 100)}%` }}
                            />
                          </div>
                          {formData.newPassword.length < 8 && (
                            <p className="text-xs text-orange-600 mt-1">
                              {t('passwordTooShort', 'Password must be at least 8 characters')}
                            </p>
                          )}
                          {formData.newPassword.length >= 8 && /[^\x00-\x7F]/.test(formData.newPassword) && (
                            <p className="text-xs text-red-600 mt-1">
                              {t('passwordEnglishOnly', 'Password must contain only English characters')}
                            </p>
                          )}
                          {formData.newPassword.length >= 8 && !/[^\x00-\x7F]/.test(formData.newPassword) && (
                            <p className="text-xs text-green-600 mt-1">
                              {t('passwordSufficient', 'Password length is sufficient')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        {t('email')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
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
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
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
                      <div className="relative">
                        <input
                          type="text"
                          id="teacher_number"
                          name="teacher_number"
                          className={`mt-1 block w-full rounded-md shadow-sm text-sm transition-all duration-300 border focus:scale-[1.01] hover:shadow-md ${
                            formData.teacher_number && teacherNumberAvailable === false
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                              : formData.teacher_number && teacherNumberAvailable === true
                                ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400'
                          }`}
                          value={formData.teacher_number}
                          onChange={handleInputChange}
                          placeholder={t('enterTeacherNumber')}
                        />
                        {formData.teacher_number && teacherNumberAvailable === false && (
                          <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
                            ✕ {t('teacherNumberExists', 'This teacher number is already in use')}
                          </div>
                        )}
                        {formData.teacher_number && teacherNumberAvailable === true && (
                          <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                            ✓ {t('teacherNumberAvailable', 'Teacher number is available')}
                          </div>
                        )}
                      </div>
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
                          {Object.entries(formData.teacherExtraLearningTool).map(([category, tools]) => {
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
                                          setFormData(prev => ({
                                            ...prev,
                                            teacherExtraLearningTool: {
                                              ...prev.teacherExtraLearningTool,
                                              [category]: {
                                                ...(prev.teacherExtraLearningTool[category] || {}),
                                                _hasPackage: checked,
                                              },
                                            },
                                          }));
                                        }}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                    </span>
                                  </label>

                                  {/* Detail tool checkbox */}
                                  {detailKey && (
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
                                            setFormData(prev => ({
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

        </TabsContent>

        <TabsContent value="sample1">
          <div className="mt-6 bg-white rounded-md border border-gray-200 p-6 sm:p-8 w-full shadow-sm">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
              {t('resetPassword', 'Change password')}
            </h2>
            <p className="text-sm text-gray-600 mb-6 max-w-3xl">
              {t('changePasswordDescription', 'Update your account password. Make sure to use a strong password that you can remember.')}
            </p>

            <form onSubmit={handleChangePasswordSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('newPassword', 'New password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type={showNewPasswordTab ? 'text' : 'password'}
                    className="mt-1 block w-full pl-10 pr-10 rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder={t('enterNewPassword', 'Enter new password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPasswordTab(!showNewPasswordTab)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-10"
                    tabIndex="-1"
                  >
                    {showNewPasswordTab ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {newPasswordInput && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{t('passwordStrength', 'Password Strength')}</span>
                      <span className={`text-xs font-medium ${getPasswordStrength(newPasswordInput).color.replace('bg-', 'text-')}`}>
                        {getPasswordStrength(newPasswordInput).label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${getPasswordStrength(newPasswordInput).color}`}
                        style={{ width: `${Math.min((newPasswordInput.length / 8) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('confirmNewPassword', 'Confirm new password')}
                </label>
                <input
                  type="password"
                  className="mt-1 block w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  value={confirmNewPasswordInput}
                  onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                  placeholder={t('confirmNewPasswordPlaceholder', 'Re-enter new password')}
                />
              </div>

              <div className="col-span-1 md:col-span-2 pt-2 flex justify-start">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={changePasswordLoading}
                >
                  {changePasswordLoading ? t('updating', 'Updating...') : t('resetPassword', 'Change password')}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="sample2">
          <div className="mt-6 bg-white rounded-md border border-gray-200 p-6 sm:p-8 w-full shadow-sm">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
              {t('secondaryRoleTitle', 'បន្ថែមតួនាទីបន្ថែមជាមន្ត្រី')}
            </h2>
            <p className="text-sm text-gray-600 mb-6 max-w-3xl">
              {t(
                'secondaryRoleDescription',
                'អ្នកអាចបន្ថែមតួនាទីបន្ថែមមួយក្នុងនាមជាមន្ត្រីខេត្ត ស្រុក ឬឃុំ តាមខ្លួនឯង។ សូមជ្រើសរើសតែតួនាទីមួយប៉ុណ្ណោះ។'
              )}
            </p>

            <form onSubmit={handleSecondaryRoleSubmit} className="space-y-6">
              {/* Step 1: Select Secondary Role Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('secondaryRoleType', 'ប្រភេទតួនាទីបន្ថែម')} *
                </label>
                <Dropdown
                  value={secondaryRoleType}
                  onValueChange={handleRoleTypeChange}
                  options={[
                    { value: '', label: t('selectSecondaryRoleType', 'ជ្រើសរើសប្រភេទតួនាទីបន្ថែម') },
                    { value: 'PROVINCIAL', label: t('provincialOfficer', 'មន្ត្រីខេត្ត') },
                    { value: 'DISTRICT', label: t('districtOfficer', 'មន្ត្រីស្រុក') },
                    { value: 'COMMUNE', label: t('communeOfficer', 'មន្ត្រីឃុំ') }
                  ]}
                  placeholder={t('selectSecondaryRoleType', 'ជ្រើសរើសប្រភេទតួនាទីបន្ថែម')}
                  className="w-full md:w-1/2"
                />
                {secondaryRoleType && (
                  <p className="mt-2 text-sm text-green-600">
                    ✓ {secondaryRoleType === 'PROVINCIAL' ? t('provincialOfficer', 'មន្ត្រីខេត្ត') : secondaryRoleType === 'DISTRICT' ? t('districtOfficer', 'មន្ត្រីស្រុក') : t('communeOfficer', 'មន្ត្រីឃុំ')}
                  </p>
                )}
              </div>

              {/* Step 2 & 3: Location and Additional Information in Same Row */}
              {secondaryRoleType && (
                <div className="border-t pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Province - MultiSelectDropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('selectProvince', 'ខេត្ត')} *
                      </label>
                      <MultiSelectDropdown
                        values={secondaryProvinceIds}
                        onValuesChange={handleSecondaryProvinceChange}
                        options={secondaryProvinces.map((p) => ({
                          value: String(p.id),
                          label:
                            p.name ||
                            p.province_name_kh ||
                            p.province_name_en ||
                            `Province ${p.id}`,
                        }))}
                        placeholder={t('enterProvinceId', 'ជ្រើសរើសខេត្ត')}
                        className="w-full"
                        disabled={secondaryLocationLoading}
                      />
                    </div>

                    {/* District - only for district/commune */}
                    {(secondaryRoleType === 'DISTRICT' || secondaryRoleType === 'COMMUNE') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('selectDistrict', 'ស្រុក')} *
                        </label>
                        <MultiSelectDropdown
                          values={secondaryDistrictIds}
                          onValuesChange={handleSecondaryDistrictChange}
                          options={secondaryDistricts.map((d) => ({
                            value: String(d.id),
                            label:
                              d.name ||
                              d.district_name_kh ||
                              d.district_name_en ||
                              `District ${d.id}`,
                          }))}
                          placeholder={t('enterDistrictId', 'ជ្រើសរើសស្រុក')}
                          className="w-full"
                          disabled={secondaryProvinceIds.length === 0 || secondaryLocationLoading}
                        />
                      </div>
                    )}

                    {/* Commune - only for commune */}
                    {secondaryRoleType === 'COMMUNE' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('selectCommune', 'ឃុំ')} *
                        </label>
                        <MultiSelectDropdown
                          values={secondaryCommuneIds}
                          onValuesChange={setSecondaryCommuneIds}
                          options={secondaryCommunes.map((c) => ({
                            value: String(c.id),
                            label:
                              c.name ||
                              c.commune_name_kh ||
                              c.commune_name_en ||
                              `Commune ${c.id}`,
                          }))}
                          placeholder={t('enterCommuneId', 'ជ្រើសរើសឃុំ')}
                          className="w-full"
                          disabled={secondaryDistrictIds.length === 0 || secondaryLocationLoading}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              {secondaryRoleType && (
                <div className="flex justify-start gap-3 pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={secondaryRoleLoading}
                  >
                    {secondaryRoleLoading
                      ? t('saving', 'កំពុងរក្សាទុក...')
                      : isEditingCommuneOfficer
                      ? t('updateSecondaryRole', 'ធ្វើបច្ចុប្បន្នភាពតួនាទីបន្ថែម')
                      : t('saveSecondaryRole', 'រក្សាទុកតួនាទីបន្ថែម')}
                  </Button>
                  {isEditingCommuneOfficer && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={secondaryRoleLoading}
                      onClick={handleDeleteSecondaryRole}
                    >
                      {secondaryRoleLoading
                        ? t('deleting', 'កំពុងលុប...')
                        : t('deleteSecondaryRole', 'លុបតួនាទីបន្ថែម')}
                    </Button>
                  )}
                </div>
              )}
            </form>
          </div>
        </TabsContent>

      </div>

      </Tabs>

      {/* Image Modal */}
      {showImageModal && formData.profile_picture && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowImageModal(false)}
        >
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

      {/* Delete Secondary Role Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteSecondaryRoleDialog}
        onClose={() => setShowDeleteSecondaryRoleDialog(false)}
        onConfirm={handleConfirmDeleteSecondaryRole}
        title={t('deleteSecondaryRoleTitle', 'Delete Secondary Officer Role')}
        message={t('deleteSecondaryRoleMessage', 'Are you sure you want to delete this secondary officer role? This action cannot be undone.')}
        type="danger"
        confirmText={t('delete', 'Delete')}
        cancelText={t('cancel', 'Cancel')}
        loading={secondaryRoleLoading}
      />

      {/* Switch Secondary Role Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSwitchRoleDialog}
        onClose={() => {
          setShowSwitchRoleDialog(false);
          setPendingRoleSwitch(null);
        }}
        onConfirm={handleConfirmSwitchRole}
        title={t('switchSecondaryRoleTitle', 'Switch Secondary Officer Role')}
        message={t('switchSecondaryRoleMessage', 'You already have a secondary officer role. Your current role will be deleted and replaced with the new one. Continue?')}
        type="warning"
        confirmText={t('switchRole', 'Switch Role')}
        cancelText={t('cancel', 'Cancel')}
        loading={secondaryRoleLoading}
      />
    </div>
  );
}