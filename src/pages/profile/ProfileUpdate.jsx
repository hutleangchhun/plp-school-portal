import { useState, useRef, useEffect, useCallback } from 'react';
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
import Dropdown from '../../components/ui/Dropdown';
import { useLocationData } from '../../hooks/useLocationData';
import { useStableCallback } from '../../utils/reactOptimization';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import { roleOptions, nationalityOptionsProfile } from '../../utils/formOptions';
import MultiSelectDropdown from '../../components/ui/MultiSelectDropdown';
import SalaryTypeDropdown from '../../components/ui/SalaryTypeDropdown';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import ProfileOverviewTab from './tabs/ProfileOverviewTab';
import ResetPasswordTab from './tabs/ResetPasswordTab';
import AddRoleTab from './tabs/AddRoleTab';

export default function ProfileUpdate({ user, setUser }) {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    id: '',
    username: '',
    firstName: '',
    lastName: '',
    fullname: '',
    email: '',
    roleId: '',
    role: '',
    newPassword: '',
    dateOfBirth: '',
    gender: 'MALE',
    profilePicture: '',
    phone: '',
    teacherNumber: '',
    nationality: nationalityOptionsProfile[0]?.value || 'ខ្មែរ',
    roleNameEn: '',
    roleNameKh: '',
    schoolName: '',
    weightKg: '',
    heightCm: '',
    bmi: '',
    // Additional fields from API payload
    accessibility: [],
    employmentType: '',
    ethnicGroup: '',
    gradeLevel: '',
    hireDate: '',
    salaryType: '',
    salaryTypeName: '',
    educationLevel: '',
    trainingType: '',
    teachingType: '',
    teacherStatus: '',
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
    teacherFamily: {
      livingStatus: '',
      spouseInfo: {
        spouseName: '',
        spouseOccupation: '',
        spousePlaceOfBirth: '',
        spousePhone: ''
      },
      numberOfChildren: '',
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

  // Guard to prevent duplicate API calls due to React.StrictMode in development
  const userDataFetchedRef = useRef(false);
  const lastFetchedSecondaryRoleUserId = useRef(null);

  // Use separate location data instances for residence and birth to allow independent state
  // This ensures that selecting a province in residence doesn't affect the districts list in place of birth
  const residenceLocation = useLocationData();
  const birthLocation = useLocationData();

  // Separate state for residence location selections
  const [selectedResidenceProvince, setSelectedResidenceProvince] = useState('');
  const [selectedResidenceDistrict, setSelectedResidenceDistrict] = useState('');
  const [selectedResidenceCommune, setSelectedResidenceCommune] = useState('');
  const [selectedResidenceVillage, setSelectedResidenceVillage] = useState('');

  // Separate state for birth location selections
  const [selectedBirthProvince, setSelectedBirthProvince] = useState('');
  const [selectedBirthDistrict, setSelectedBirthDistrict] = useState('');
  const [selectedBirthCommune, setSelectedBirthCommune] = useState('');
  const [selectedBirthVillage, setSelectedBirthVillage] = useState('');

  // Residence location handlers
  const handleResidenceProvinceChange = useCallback((value) => {
    setSelectedResidenceProvince(value);
    residenceLocation.handleProvinceChange(value);
    
    setSelectedResidenceDistrict('');
    setSelectedResidenceCommune('');
    setSelectedResidenceVillage('');
  }, [residenceLocation]);

  const handleResidenceDistrictChange = useCallback((value) => {
    setSelectedResidenceDistrict(value);
    residenceLocation.handleDistrictChange(value);

    setSelectedResidenceCommune('');
    setSelectedResidenceVillage('');
  }, [residenceLocation]);

  const handleResidenceCommuneChange = useCallback((value) => {
    setSelectedResidenceCommune(value);
    residenceLocation.handleCommuneChange(value);

    setSelectedResidenceVillage('');
  }, [residenceLocation]);

  const handleResidenceVillageChange = useCallback((value) => {
    setSelectedResidenceVillage(value);
    residenceLocation.handleVillageChange(value);
  }, [residenceLocation]);

  // Birth location handlers
  const handleBirthProvinceChange = useCallback((value) => {
    setSelectedBirthProvince(value);
    birthLocation.handleProvinceChange(value);

    setSelectedBirthDistrict('');
    setSelectedBirthCommune('');
    setSelectedBirthVillage('');
  }, [birthLocation]);

  const handleBirthDistrictChange = useCallback((value) => {
    setSelectedBirthDistrict(value);
    birthLocation.handleDistrictChange(value);

    setSelectedBirthCommune('');
    setSelectedBirthVillage('');
  }, [birthLocation]);

  const handleBirthCommuneChange = useCallback((value) => {
    setSelectedBirthCommune(value);
    birthLocation.handleCommuneChange(value);

    setSelectedBirthVillage('');
  }, [birthLocation]);

  const handleBirthVillageChange = useCallback((value) => {
    setSelectedBirthVillage(value);
    birthLocation.handleVillageChange(value);
  }, [birthLocation]);

  // Wrapper functions for residence location getters
  const getResidenceProvinceOptions = useCallback(() => {
    return residenceLocation.provinces;
  }, [residenceLocation.provinces]);

  const getResidenceDistrictOptions = useCallback(() => {
    if (!selectedResidenceProvince) return [];
    if (residenceLocation.loadingDistricts) {
      return [{ value: '', label: t('loadingDistricts'), disabled: true }];
    }
    return residenceLocation.districts;
  }, [selectedResidenceProvince, residenceLocation.districts, residenceLocation.loadingDistricts, t]);

  const getResidenceCommuneOptions = useCallback(() => {
    if (!selectedResidenceDistrict) return [];
    if (residenceLocation.loadingCommunes) {
      return [{ value: '', label: t('loadingCommunes'), disabled: true }];
    }
    return residenceLocation.communes;
  }, [selectedResidenceDistrict, residenceLocation.communes, residenceLocation.loadingCommunes, t]);

  const getResidenceVillageOptions = useCallback(() => {
    if (!selectedResidenceCommune) return [];
    if (residenceLocation.loadingVillages) {
      return [{ value: '', label: t('loadingVillages'), disabled: true }];
    }
    return residenceLocation.villages;
  }, [selectedResidenceCommune, residenceLocation.villages, residenceLocation.loadingVillages, t]);

  // Wrapper functions for birth location getters
  const getBirthProvinceOptions = useCallback(() => {
    return birthLocation.provinces;
  }, [birthLocation.provinces]);

  const getBirthDistrictOptions = useCallback(() => {
    if (!selectedBirthProvince) return [];
    if (birthLocation.loadingDistricts) {
      return [{ value: '', label: t('loadingDistricts'), disabled: true }];
    }
    return birthLocation.districts;
  }, [selectedBirthProvince, birthLocation.districts, birthLocation.loadingDistricts, t]);

  const getBirthCommuneOptions = useCallback(() => {
    if (!selectedBirthDistrict) return [];
    if (birthLocation.loadingCommunes) {
      return [{ value: '', label: t('loadingCommunes'), disabled: true }];
    }
    return birthLocation.communes;
  }, [selectedBirthDistrict, birthLocation.communes, birthLocation.loadingCommunes, t]);

  const getBirthVillageOptions = useCallback(() => {
    if (!selectedBirthCommune) return [];
    if (birthLocation.loadingVillages) {
      return [{ value: '', label: t('loadingVillages'), disabled: true }];
    }
    return birthLocation.villages;
  }, [selectedBirthCommune, birthLocation.villages, birthLocation.loadingVillages, t]);

  // Wrapper for setting initial residence values - use the hook's built-in initialization
  // which handles loading districts, communes, and villages automatically
  const setResidenceInitialValues = useCallback(async (values) => {
    if (values?.provinceId) {
      // Set our local state first
      const provinceId = values.provinceId.toString();
      const districtId = values.districtId?.toString() || '';
      const communeId = values.communeId?.toString() || '';
      const villageId = values.villageId?.toString() || '';

      setSelectedResidenceProvince(provinceId);
      setSelectedResidenceDistrict(districtId);
      setSelectedResidenceCommune(communeId);
      setSelectedResidenceVillage(villageId);

      // Use residenceLocation's setInitialValues which handles all the cascading loads
      // This is async and will load districts, communes, and villages
      await residenceLocation.setInitialValues(values);
    }
  }, [residenceLocation.setInitialValues]);

  // Wrapper for setting initial birth values
  const setBirthInitialValues = useCallback(async (values) => {
    if (values?.provinceId) {
      // Set our local state first
      const provinceId = values.provinceId.toString();
      const districtId = values.districtId?.toString() || '';
      const communeId = values.communeId?.toString() || '';
      const villageId = values.villageId?.toString() || '';

      setSelectedBirthProvince(provinceId);
      setSelectedBirthDistrict(districtId);
      setSelectedBirthCommune(communeId);
      setSelectedBirthVillage(villageId);

      // Use birthLocation's setInitialValues which handles all the cascading loads
      // This is async and will load districts, communes, and villages
      await birthLocation.setInitialValues(values);
    }
  }, [birthLocation.setInitialValues]);

  // Expose loading states
  const residenceLoadingProvinces = residenceLocation.loadingProvinces;
  const birthLoadingProvinces = birthLocation.loadingProvinces;


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

  // Use shared provinces from residenceLocation for secondary officer role dropdowns
  // Instead of making a separate API call, reuse the provinces already loaded
  useEffect(() => {
    if (residenceLocation.provinces && residenceLocation.provinces.length > 0) {
      // Convert from location data format to the format expected by secondary provinces
      const secondaryProvinces = residenceLocation.provinces.map(p => ({
        id: p.originalData?.id || p.value,
        province_name_kh: p.originalData?.province_name_kh || p.labelKh,
        province_name_en: p.originalData?.province_name_en || p.labelEn,
        province_code: p.originalData?.province_code || p.code
      }));
      setSecondaryProvinces(secondaryProvinces);
      setSecondaryLocationLoading(false);
    }
  }, [residenceLocation.provinces]);

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
      // Guard against duplicate fetches due to React.StrictMode
      if (userDataFetchedRef.current) {
        console.log('🚀 ProfileUpdate: User data already fetched, skipping duplicate call');
        return;
      }
      userDataFetchedRef.current = true;

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
          console.log('profilePicture value:', userData?.profilePicture);
          console.log('profilePicture_url value:', userData?.profilePicture_url);
          console.log('profilePicture value:', userData?.profilePicture);
          console.log('=== END USER DATA DEBUG ===');
        }

        // Convert API response from snake_case to camelCase
        const convertSnakeToCamel = (obj) => {
          if (!obj || typeof obj !== 'object') return obj;
          if (Array.isArray(obj)) return obj.map(convertSnakeToCamel);

          const converted = {};
          for (const [key, value] of Object.entries(obj)) {
            // Convert snake_case to camelCase
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            converted[camelKey] = convertSnakeToCamel(value);
          }
          return converted;
        };

        // Normalize userData to handle incomplete payloads gracefully
        // Convert API response to camelCase while keeping original data as fallback
        const normalizedData = { ...convertSnakeToCamel(userData), ...userData };

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
        // Look up role label from roleOptions if roleId exists
        const roleIdString = normalizedData.roleId ? String(normalizedData.roleId) : '';
        const selectedRole = roleIdString ? roleOptions.find(r => r.value === roleIdString) : null;

        const newFormData = {
          id: extractedUserId || '',
          username: normalizedData.username || '',
          firstName: normalizedData.firstName || '',
          lastName: normalizedData.lastName || '',
          fullname: normalizedData.fullname || '',
          email: normalizedData.email || '',
          roleId: roleIdString,
          newPassword: '',
          dateOfBirth: normalizedData.dateOfBirth || '',
          gender: normalizedData.gender || 'MALE',
          profilePicture: normalizedData.profilePicture || '',
          phone: normalizedData.phone || '',
          teacherNumber: normalizedData.teacherNumber || teacher.teacherNumber || '',
          nationality: normalizedData.nationality || 'ខ្មែរ',
          roleNameEn: normalizedData.roleNameEn || (selectedRole?.label) || '',
          roleNameKh: normalizedData.roleNameKh || (selectedRole?.label) || '',
          schoolName: teacher.school?.name || normalizedData.schoolName || '',
          weightKg: normalizedData.weightKg || '',
          heightCm: normalizedData.heightCm || '',
          bmi: normalizedData.bmi || '',
          // Additional fields from API payload - check both top level and nested teacher object
          accessibility: normalizedData.accessibility || [],
          employmentType: normalizedData.employmentType || teacher.employmentType || '',
          ethnicGroup: normalizedData.ethnicGroup || '',
          gradeLevel: normalizedData.gradeLevel || teacher.gradeLevel || '',
          hireDate: normalizedData.hireDate || teacher.hireDate || '',
          role: normalizedData.role || normalizedData.roleId || '',
          salaryType: (normalizedData.salaryTypeId || teacher.salaryTypeId) ? String(normalizedData.salaryTypeId || teacher.salaryTypeId) : '',
          educationLevel: normalizedData.educationLevel || teacher.educationLevel || '',
          trainingType: normalizedData.trainingType || teacher.trainingType || '',
          teachingType: normalizedData.teachingType || teacher.teachingType || '',
          teacherStatus: normalizedData.teacherStatus || teacher.teacherStatus || '',
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
          // Handle nested residence object with full location data (Khmer names prioritized, camelCase)
          residence: {
            provinceId: String(normalizedData.residence?.provinceId || normalizedData.province_id || ''),
            provinceName: normalizedData.residence?.province?.provinceNameEn || '',
            provinceNameKh: normalizedData.residence?.province?.provinceNameKh || '',
            districtId: String(normalizedData.residence?.districtId || normalizedData.district_id || ''),
            districtCode: normalizedData.residence?.district?.districtCode || normalizedData.residence?.district?.code || normalizedData.district_code || String(normalizedData.residence?.districtId || normalizedData.district_id || ''),
            districtName: normalizedData.residence?.district?.districtNameEn || '',
            districtNameKh: normalizedData.residence?.district?.districtNameKh || '',
            communeId: String(normalizedData.residence?.communeId || normalizedData.commune_id || ''),
            communeCode: normalizedData.residence?.commune?.communeCode || normalizedData.residence?.commune?.code || normalizedData.commune_code || String(normalizedData.residence?.communeId || normalizedData.commune_id || ''),
            communeName: normalizedData.residence?.commune?.communeNameEn || '',
            communeNameKh: normalizedData.residence?.commune?.communeNameKh || '',
            villageId: String(normalizedData.residence?.villageId || normalizedData.village_id || ''),
            villageName: normalizedData.residence?.village?.villageNameEn || '',
            villageNameKh: normalizedData.residence?.village?.villageNameKh || ''
          },
          // Handle nested placeOfBirth object with full location data (Khmer names prioritized, camelCase)
          placeOfBirth: {
            provinceId: String(normalizedData.placeOfBirth?.provinceId || normalizedData.residence?.provinceId || normalizedData.province_id || ''),
            provinceName: normalizedData.placeOfBirth?.province?.provinceNameEn || normalizedData.residence?.province?.provinceNameEn || '',
            provinceNameKh: normalizedData.placeOfBirth?.province?.provinceNameKh || normalizedData.residence?.province?.provinceNameKh || '',
            districtId: String(normalizedData.placeOfBirth?.districtId || normalizedData.residence?.districtId || normalizedData.district_id || ''),
            districtCode: normalizedData.placeOfBirth?.district?.districtCode || normalizedData.placeOfBirth?.district?.code || normalizedData.residence?.district?.districtCode || String(normalizedData.placeOfBirth?.districtId || normalizedData.residence?.districtId || normalizedData.district_id || ''),
            districtName: normalizedData.placeOfBirth?.district?.districtNameEn || normalizedData.residence?.district?.districtNameEn || '',
            districtNameKh: normalizedData.placeOfBirth?.district?.districtNameKh || normalizedData.residence?.district?.districtNameKh || '',
            communeId: String(normalizedData.placeOfBirth?.communeId || normalizedData.residence?.communeId || normalizedData.commune_id || ''),
            communeCode: normalizedData.placeOfBirth?.commune?.communeCode || normalizedData.placeOfBirth?.commune?.code || normalizedData.residence?.commune?.communeCode || String(normalizedData.placeOfBirth?.communeId || normalizedData.residence?.communeId || normalizedData.commune_id || ''),
            communeName: normalizedData.placeOfBirth?.commune?.communeNameEn || normalizedData.residence?.commune?.communeNameEn || '',
            communeNameKh: normalizedData.placeOfBirth?.commune?.communeNameKh || normalizedData.residence?.commune?.communeNameKh || '',
            villageId: String(normalizedData.placeOfBirth?.villageId || normalizedData.residence?.villageId || normalizedData.village_id || ''),
            villageName: normalizedData.placeOfBirth?.village?.villageNameEn || normalizedData.residence?.village?.villageNameEn || '',
            villageNameKh: normalizedData.placeOfBirth?.village?.villageNameKh || normalizedData.residence?.village?.villageNameKh || ''
          },
          // Handle teacher family information (camelCase)
          teacherFamily: {
            livingStatus: teacher.teacherFamily?.livingStatus || teacher.teacher_family?.living_status || normalizedData.teacherFamily?.livingStatus || normalizedData.teacher_family?.living_status || '',
            spouseInfo: {
              spouseName: teacher.teacherFamily?.spouseInfo?.spouseName || teacher.teacher_family?.spouse_info?.spouse_name || normalizedData.teacherFamily?.spouseInfo?.spouseName || normalizedData.teacher_family?.spouse_info?.spouse_name || '',
              spouseOccupation: teacher.teacherFamily?.spouseInfo?.spouseOccupation || teacher.teacher_family?.spouse_info?.spouse_occupation || normalizedData.teacherFamily?.spouseInfo?.spouseOccupation || normalizedData.teacher_family?.spouse_info?.spouse_occupation || '',
              spousePlaceOfBirth: teacher.teacherFamily?.spouseInfo?.spousePlaceOfBirth || teacher.teacher_family?.spouse_info?.spouse_place_of_birth || normalizedData.teacherFamily?.spouseInfo?.spousePlaceOfBirth || normalizedData.teacher_family?.spouse_info?.spouse_place_of_birth || '',
              spousePhone: teacher.teacherFamily?.spouseInfo?.spousePhone || teacher.teacher_family?.spouse_info?.spouse_phone || normalizedData.teacherFamily?.spouseInfo?.spousePhone || normalizedData.teacher_family?.spouse_info?.spouse_phone || ''
            },
            numberOfChildren: teacher.teacherFamily?.numberOfChildren || teacher.teacher_family?.number_of_children || normalizedData.teacherFamily?.numberOfChildren || normalizedData.teacher_family?.number_of_children || '',
            children: Array.isArray(teacher.teacherFamily?.children) ? teacher.teacherFamily.children : (Array.isArray(teacher.teacher_family?.children) ? teacher.teacher_family.children : (Array.isArray(normalizedData.teacherFamily?.children) ? normalizedData.teacherFamily.children : (Array.isArray(normalizedData.teacher_family?.children) ? normalizedData.teacher_family.children : [])))
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
        setOriginalTeacherNumber(newFormData.teacherNumber || '');
        setTeacherNumberAvailable(null);

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
        const currentEmploymentType = newFormData.employmentType;
        const currentSalaryTypeId = newFormData.salaryType;

        if (currentSalaryTypeId && currentEmploymentType) {
          try {
            const salaryTypes = await salaryTypeService.getSalaryTypesByEmploymentType(currentEmploymentType);
            if (Array.isArray(salaryTypes)) {
              const selectedSalaryType = salaryTypes.find(st => String(st.id || st.salaryTypeId) === currentSalaryTypeId);
              if (selectedSalaryType) {
                setFormData(prev => ({
                  ...prev,
                  salaryTypeName: selectedSalaryType.name
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
      // Only fetch if we have a valid user ID
      if (!formData || !formData.id) {
        return;
      }

      // Prevent duplicate fetches for the same user
      if (lastFetchedSecondaryRoleUserId.current === formData.id) {
        return;
      }

      lastFetchedSecondaryRoleUserId.current = formData.id;
      console.log('Fetching secondary officer data from /auth/secondary-roles for user:', formData.id);

      try {
        const response = await userService.getSecondaryRoles();
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
        setExistingCommuneOfficer(null);
        setIsEditingCommuneOfficer(false);
      }
    };

    loadSecondaryOfficerData();
  }, [formData?.id]); // Depend on formData.id to trigger prompt fetching


  // Initialize location data when pending data is available and provinces are loaded
  useEffect(() => {
    const initializeResidence = async () => {
      const hasProvinces = residenceLocation.provinces && residenceLocation.provinces.length > 0;
      if (!residenceInitialized && pendingResidenceData && !residenceLoadingProvinces && hasProvinces) {
        setLocationDataLoading(true);
        await setResidenceInitialValues(pendingResidenceData);
        setLocationDataLoading(false);
        setResidenceInitialized(true);
        setPendingResidenceData(null);
      }
    };
    initializeResidence();
  }, [pendingResidenceData, residenceInitialized, residenceLoadingProvinces, setResidenceInitialValues, residenceLocation.provinces]);


  useEffect(() => {
    const initializeBirth = async () => {
      const hasProvinces = birthLocation.provinces && birthLocation.provinces.length > 0;
      if (!birthInitialized && pendingBirthData && !birthLoadingProvinces && hasProvinces) {
        setLocationDataLoading(true);
        await setBirthInitialValues(pendingBirthData);
        setLocationDataLoading(false);
        setBirthInitialized(true);
        setPendingBirthData(null);
      }
    };
    initializeBirth();
  }, [pendingBirthData, birthInitialized, birthLoadingProvinces, setBirthInitialValues, birthLocation.provinces]);

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
    const weight = parseFloat(formData.weightKg);
    const height = parseFloat(formData.heightCm);

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

  const handleEditToggle = async () => {
    if (!isEditMode) {
      // When entering edit mode, initialize location selectors from formData if not already set
      if (formData.residence?.provinceId && !selectedResidenceProvince) {
        await setResidenceInitialValues({
          provinceId: formData.residence.provinceId,
          districtId: formData.residence.districtId,
          communeId: formData.residence.communeId,
          villageId: formData.residence.villageId
        });
      }

      if (formData.placeOfBirth?.provinceId && !selectedBirthProvince) {
        await setBirthInitialValues({
          provinceId: formData.placeOfBirth.provinceId,
          districtId: formData.placeOfBirth.districtId,
          communeId: formData.placeOfBirth.communeId,
          villageId: formData.placeOfBirth.villageId
        });
      }
    }
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
          firstName: formData.firstName,
          lastName: formData.lastName,
          fullName: formData.fullname,
          gender: formData.gender,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          nationality: formData.nationality
        },
        teacherInfo: {
          role: formData.roleNameKh,
          teacherNumber: formData.teacherNumber,
          employmentType: formData.employmentType,
          hireDate: formData.hireDate,
          gradeLevel: formData.gradeLevel
        },
        healthInfo: {
          weight: formData.weightKg,
          height: formData.heightCm,
          bmi: calculateBMI()
        },
        locationInfo: {
          residence: formData.residence,
          placeOfBirth: formData.placeOfBirth
        },
        additionalInfo: {
          ethnicity: formData.ethnicGroup,
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
    const { weightKg } = formData;
    if (!weightKg) return false;
    const weightStr = String(weightKg).trim();
    const weightRegex = /^[0-9]{1,3}(\.[0-9]{1,2})?$/; // numeric(5,2)
    if (!weightRegex.test(weightStr)) return true;
    const w = parseFloat(weightStr);
    return !Number.isNaN(w) && w < 10;
  };

  const isHeightInvalid = () => {
    const { heightCm } = formData;
    if (!heightCm) return false;
    const heightStr = String(heightCm).trim();
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
    !formData.firstName?.trim() ||
    !formData.lastName?.trim() ||
    !formData.gender ||
    !formData.dateOfBirth ||
    !formData.nationality ||
    !formData.username?.trim() ||
    usernameAvailable === false ||
    (formData.email?.trim() && emailAvailable === false) ||
    (formData.email?.trim() && emailAvailable === null && (formData.email || '') !== (originalEmail || '')) ||
    (formData.teacherNumber?.trim() && teacherNumberAvailable === false) ||
    isPhysicalInvalid();

  const buildTeacherFamilyPayload = () => {
    const tf = formData.teacherFamily || {};
    const rawChildren = Array.isArray(tf.children) ? tf.children : [];

    const numberOfChildrenRaw = tf.numberOfChildren || tf.number_of_children;
    const parsedNumber =
      numberOfChildrenRaw === '' || numberOfChildrenRaw === null || numberOfChildrenRaw === undefined
        ? undefined
        : parseInt(numberOfChildrenRaw, 10);

    const cleanedChildren = rawChildren
      .map(child => ({ childName: (child?.childName || child?.child_name || '').trim() }))
      .filter(child => child.childName);

    // Align children array with numberOfChildren
    let effectiveChildren = cleanedChildren;

    if (typeof parsedNumber === 'number' && !Number.isNaN(parsedNumber)) {
      if (parsedNumber <= 0) {
        effectiveChildren = [];
      } else if (effectiveChildren.length > parsedNumber) {
        effectiveChildren = effectiveChildren.slice(0, parsedNumber);
      }
    }

    const payload = {
      livingStatus: tf.livingStatus || tf.living_status || undefined,
      spouseInfo: {
        spouseName: tf.spouseInfo?.spouseName || tf.spouse_info?.spouse_name || undefined,
        spouseOccupation: tf.spouseInfo?.spouseOccupation || tf.spouse_info?.spouse_occupation || undefined,
        spousePlaceOfBirth: tf.spouseInfo?.spousePlaceOfBirth || tf.spouse_info?.spouse_place_of_birth || undefined,
        spousePhone: tf.spouseInfo?.spousePhone || tf.spouse_info?.spouse_phone || undefined
      },
      numberOfChildren:
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
        firstName: formData.firstName?.trim() || undefined,
        lastName: formData.lastName?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,

        // Date & Identity
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        nationality: formData.nationality?.trim() || undefined,
        profilePicture: profilePictureUrl || formData.profilePicture || undefined,

        // Physical Information
        weightKg: formData.weightKg ? parseFloat(formData.weightKg) : undefined,
        heightCm: formData.heightCm ? parseFloat(formData.heightCm) : undefined,
        bmi: formData.bmi ? parseFloat(formData.bmi) : undefined,

        // Location Information
        ethnicGroup: formData.ethnicGroup?.trim() || undefined,
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
        employmentType: formData.employmentType || undefined,
        salaryTypeId: formData.salaryType ? parseInt(formData.salaryType) : undefined,
        educationLevel: formData.educationLevel || undefined,
        trainingType: formData.trainingType || undefined,
        teachingType: formData.teachingType || undefined,
        teacherStatus: formData.teacherStatus || undefined,
        subject: formData.subject && formData.subject.length > 0 ? formData.subject : undefined,
        gradeLevel: formData.gradeLevel === null ? null : (formData.gradeLevel?.trim() || undefined),
        hireDate: formData.hireDate || undefined,
        appointed: typeof formData.appointed === 'boolean' ? formData.appointed : undefined,
        burden: typeof formData.burden === 'boolean' ? formData.burden : undefined,

        // Teacher Learning Tools
        teacherExtraLearningTool: formData.teacherExtraLearningTool || undefined,
        extraLearningTool: formData.extraLearningTool || undefined,

        // Books Assignment
        bookIds: formData.bookIds && formData.bookIds.length > 0 ? formData.bookIds : null,

        // Family Information
        teacherFamily: buildTeacherFamilyPayload()
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

        // For objects (residence, placeOfBirth, teacherFamily), only keep if they have at least one defined value
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
        firstName: response.firstName || prev.firstName,
        lastName: response.lastName || prev.lastName,
        email: response.email || prev.email,
        roleId: response.roleId || prev.roleId,
        role: response.role || prev.role,
        dateOfBirth: response.dateOfBirth || prev.dateOfBirth,
        gender: response.gender || prev.gender,
        phone: response.phone || prev.phone,
        profilePicture: response.profilePicture || prev.profilePicture,
        nationality: response.nationality || prev.nationality,
        weightKg: response.weightKg || prev.weightKg,
        heightCm: response.heightCm || prev.heightCm,
        bmi: response.bmi || prev.bmi,
        teacherNumber: response.teacherNumber || prev.teacherNumber,
        // Additional fields - check both top level and nested teacher object
        accessibility: response.accessibility || teacher.accessibility || prev.accessibility,
        employmentType: response.employmentType || teacher.employmentType || prev.employmentType,
        ethnicGroup: response.ethnicGroup || prev.ethnicGroup,
        gradeLevel: response.gradeLevel || teacher.gradeLevel || prev.gradeLevel,
        hireDate: response.hireDate || teacher.hireDate || prev.hireDate,
        salaryType: response.salaryTypeId ? String(response.salaryTypeId) : prev.salaryType,
        salaryTypeName: prev.salaryTypeName,
        educationLevel: response.educationLevel || teacher.educationLevel || prev.educationLevel,
        trainingType: response.trainingType || teacher.trainingType || prev.trainingType,
        teachingType: response.teachingType || teacher.teachingType || prev.teachingType,
        teacherStatus: response.teacherStatus || teacher.teacherStatus || prev.teacherStatus,
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
          profilePicture: freshUserData.profilePicture || prev.profilePicture,
          employmentType: freshUserData.employmentType || teacher.employmentType || prev.employmentType,
          ethnicGroup: freshUserData.ethnicGroup || prev.ethnicGroup,
          gradeLevel: freshUserData.gradeLevel || teacher.gradeLevel || prev.gradeLevel,
          hireDate: freshUserData.hireDate || teacher.hireDate || prev.hireDate,
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

    // Handle teacherNumber validation
    if (name === 'teacherNumber') {
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
      dateOfBirth: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : ''
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
        return response.profilePicture || response.url || response.path;
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
    const { weightKg, heightCm } = formData;

    // Allow empty values (both fields are optional)
    if (weightKg) {
      const weightStr = String(weightKg).trim();
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

    if (heightCm) {
      const heightStr = String(heightCm).trim();
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
    if (!formData.firstName.trim()) {
      showError(t('firstNameRequired'));
      return false;
    }
    if (!formData.lastName.trim()) {
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
          <ProfileOverviewTab
            formData={formData}
            setFormData={setFormData}
            isEditMode={isEditMode}
            profilePictureFile={profilePictureFile}
            setProfilePictureFile={setProfilePictureFile}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            showUsernameSuggestions={showUsernameSuggestions}
            setShowUsernameSuggestions={setShowUsernameSuggestions}
            usernameSuggestions={usernameSuggestions}
            setUsernameSuggestions={setUsernameSuggestions}
            usernameAvailable={usernameAvailable}
            setUsernameAvailable={setUsernameAvailable}
            emailAvailable={emailAvailable}
            setEmailAvailable={setEmailAvailable}
            teacherNumberAvailable={teacherNumberAvailable}
            setTeacherNumberAvailable={setTeacherNumberAvailable}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            pictureUploading={pictureUploading}
            dropdownRef={dropdownRef}
            fileInputRef={fileInputRef}
            usernameContainerRef={usernameContainerRef}
            selectedResidenceProvince={selectedResidenceProvince}
            selectedResidenceDistrict={selectedResidenceDistrict}
            selectedResidenceCommune={selectedResidenceCommune}
            selectedResidenceVillage={selectedResidenceVillage}
            selectedBirthProvince={selectedBirthProvince}
            selectedBirthDistrict={selectedBirthDistrict}
            selectedBirthCommune={selectedBirthCommune}
            selectedBirthVillage={selectedBirthVillage}
            handleInputChange={handleInputChange}
            handleDateChange={handleDateChange}
            handleProfilePictureChange={handleProfilePictureChange}
            handleViewPicture={handleViewPicture}
            handleUploadClick={handleUploadClick}
            handleSubmit={handleSubmit}
            handleGenerateUsernameSuggestions={handleGenerateUsernameSuggestions}
            handleChooseUsernameSuggestion={handleChooseUsernameSuggestion}
            handleResidenceProvinceChange={handleResidenceProvinceChange}
            handleResidenceDistrictChange={handleResidenceDistrictChange}
            handleResidenceCommuneChange={handleResidenceCommuneChange}
            handleResidenceVillageChange={handleResidenceVillageChange}
            handleBirthProvinceChange={handleBirthProvinceChange}
            handleBirthDistrictChange={handleBirthDistrictChange}
            handleBirthCommuneChange={handleBirthCommuneChange}
            handleBirthVillageChange={handleBirthVillageChange}
            getResidenceProvinceOptions={getResidenceProvinceOptions}
            getResidenceDistrictOptions={getResidenceDistrictOptions}
            getResidenceCommuneOptions={getResidenceCommuneOptions}
            getResidenceVillageOptions={getResidenceVillageOptions}
            getBirthProvinceOptions={getBirthProvinceOptions}
            getBirthDistrictOptions={getBirthDistrictOptions}
            getBirthCommuneOptions={getBirthCommuneOptions}
            getBirthVillageOptions={getBirthVillageOptions}
            getPasswordStrength={getPasswordStrength}
            isWeightInvalid={isWeightInvalid}
            isHeightInvalid={isHeightInvalid}
            getBMICategory={getBMICategory}
            residenceLoadingProvinces={residenceLoadingProvinces}
            birthLoadingProvinces={birthLoadingProvinces}
            t={t}
            user={user}
          />
        </TabsContent>

        <TabsContent value="sample1">
          <ResetPasswordTab
            newPasswordInput={newPasswordInput}
            setNewPasswordInput={setNewPasswordInput}
            confirmNewPasswordInput={confirmNewPasswordInput}
            setConfirmNewPasswordInput={setConfirmNewPasswordInput}
            showNewPasswordTab={showNewPasswordTab}
            setShowNewPasswordTab={setShowNewPasswordTab}
            changePasswordLoading={changePasswordLoading}
            handleChangePasswordSubmit={handleChangePasswordSubmit}
            getPasswordStrength={getPasswordStrength}
            t={t}
          />
        </TabsContent>

        <TabsContent value="sample2">
          <AddRoleTab
            secondaryRoleType={secondaryRoleType}
            handleRoleTypeChange={handleRoleTypeChange}
            secondaryProvinceIds={secondaryProvinceIds}
            handleSecondaryProvinceChange={handleSecondaryProvinceChange}
            secondaryDistrictIds={secondaryDistrictIds}
            handleSecondaryDistrictChange={handleSecondaryDistrictChange}
            secondaryCommuneIds={secondaryCommuneIds}
            setSecondaryCommuneIds={setSecondaryCommuneIds}
            secondaryProvinces={secondaryProvinces}
            secondaryDistricts={secondaryDistricts}
            secondaryCommunes={secondaryCommunes}
            secondaryLocationLoading={secondaryLocationLoading}
            isEditingCommuneOfficer={isEditingCommuneOfficer}
            secondaryRoleLoading={secondaryRoleLoading}
            handleSecondaryRoleSubmit={handleSecondaryRoleSubmit}
            handleDeleteSecondaryRole={handleDeleteSecondaryRole}
            t={t}
          />
        </TabsContent>

      </div>

      </Tabs>

      {/* Image Modal */}
      {showImageModal && formData.profilePicture && (
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
              src={utils.user.getProfilePictureUrl({ profilePicture: formData.profilePicture })}
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