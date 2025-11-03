import { useState, useRef, useEffect } from 'react';
import { Save, User, Eye, Upload, Edit, Mail, Lock, Phone, Globe, X, Building, Weight, Ruler, Download, QrCode as QrCodeIcon } from 'lucide-react';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { DatePickerWithDropdowns } from '../../components/ui/date-picker-with-dropdowns';
import ProfileImage from '../../components/ui/ProfileImage';
import { api, utils } from '../../utils/api';
import Dropdown from '../../components/ui/Dropdown';
import { useLocationData } from '../../hooks/useLocationData';
import { useStableCallback } from '../../utils/reactOptimization';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';

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
    newPassword: '',
    date_of_birth: '',
    gender: 'MALE',
    profile_picture: '',
    phone: '',
    teacher_number: '',
    teacherId: '',
    nationality: 'Cambodian',
    roleNameEn: '',
    roleNameKh: '',
    weight_kg: '',
    height_cm: '',
    qr_code: '',
    qr_token: '',
    qr_generated_at: '',
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
  const [showQRModal, setShowQRModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

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
        // First try to get detailed user data with school information
        let userData = null;
        const authUser = (() => {
          try {
            const storedUser = localStorage.getItem('user');
            return storedUser ? JSON.parse(storedUser) : null;
          } catch (error) {
            console.warn('Could not parse user from localStorage:', error);
            return null;
          }
        })();

        // Try to get detailed user data first
        if (authUser?.id) {
          try {
            const detailedResponse = await api.user.getUserByID(authUser.id);
            userData = detailedResponse?.data || detailedResponse;
            console.log('Detailed user data with school:', userData);
          } catch (error) {
            console.warn('Failed to fetch detailed user data, falling back to getMyAccount:', error);
          }
        }

        // Fallback to getMyAccount if detailed fetch failed
        if (!userData) {
          userData = await api.user.getMyAccount();
        }

        // Debug user data structure (can be removed in production)
        if (import.meta.env.DEV) {
          console.log('=== USER DATA DEBUG ===');
          console.log('Full userData object:', userData);
          console.log('Available keys:', Object.keys(userData || {}));
          console.log('=== END USER DATA DEBUG ===');
        }

        // Normalize userData to handle incomplete payloads gracefully
        const normalizedData = userData || {};

        // Try to extract a valid user ID from various possible fields
        const possibleUserIds = [
          normalizedData.id,
          normalizedData.userId,
          normalizedData.user_id,
          normalizedData.teacherId,
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
          teacher_number: normalizedData.teacher_number || '',
          teacherId: normalizedData.teacherId || '',
          nationality: normalizedData.nationality || 'Cambodian',
          roleNameEn: normalizedData.roleNameEn || '',
          roleNameKh: normalizedData.roleNameKh || '',
          weight_kg: normalizedData.weight_kg || '',
          height_cm: normalizedData.height_cm || '',
          qr_code: normalizedData.qr_code || '',
          qr_token: normalizedData.qr_token || '',
          qr_generated_at: normalizedData.qr_generated_at || '',
          // Handle nested residence object
          residence: {
            provinceId: normalizedData.residence?.provinceId || normalizedData.province_id || '',
            districtId: normalizedData.residence?.districtId || normalizedData.district_id || '',
            communeId: normalizedData.residence?.communeId || normalizedData.commune_id || '',
            villageId: normalizedData.residence?.villageId || normalizedData.village_id || ''
          },
          // Handle nested placeOfBirth object
          placeOfBirth: {
            provinceId: normalizedData.placeOfBirth?.provinceId || normalizedData.residence?.provinceId || normalizedData.province_id || '',
            districtId: normalizedData.placeOfBirth?.districtId || normalizedData.residence?.districtId || normalizedData.district_id || '',
            communeId: normalizedData.placeOfBirth?.communeId || normalizedData.residence?.communeId || normalizedData.commune_id || '',
            villageId: normalizedData.placeOfBirth?.villageId || normalizedData.residence?.villageId || normalizedData.village_id || ''
          },
          // Legacy fields for backward compatibility
          provinceId: normalizedData.residence?.provinceId || normalizedData.province_id || '',
          districtId: normalizedData.residence?.districtId || normalizedData.district_id || '',
          communeId: normalizedData.residence?.communeId || normalizedData.commune_id || '',
          villageId: normalizedData.residence?.villageId || normalizedData.village_id || ''
        };

        setFormData(newFormData);
        console.log('User data loaded into form, keys present:', Object.keys(newFormData).filter(k => newFormData[k]));

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
        // IMPORTANT: Preserve isDirector from original user object if not in API response
        if (setUser) {
          const updatedUser = {
            ...userData,
            // Preserve isDirector from original user if it's not in the API response
            isDirector: userData.isDirector !== undefined ? userData.isDirector : user?.isDirector
          };
          console.log('ProfileUpdate - Preserving isDirector:', user?.isDirector, '→', updatedUser.isDirector);
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

  // View QR code
  const handleViewQRCode = () => {
    if (formData.qr_code) {
      setShowQRModal(true);
    } else {
      showError(t('noQRCode') || 'QR code not available');
    }
  };

  // Download QR code as image
  const downloadQRCode = () => {
    if (!formData.qr_code) return;

    const link = document.createElement('a');
    link.href = formData.qr_code;
    link.download = `qr-code-${formData.username || 'user'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setShowConfirmDialog(true);
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
      if (formData.email) {
        updateData.email = formData.email;
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
        updateData.weight_kg = formData.weight_kg;
      }

      if (formData.height_cm) {
        updateData.height_cm = formData.height_cm;
      }

      // Include ID field if available - crucial for update
      if (formData.id) {
        updateData.id = formData.id;
      }

      // Include roleId if available
      if (formData.roleId) {
        updateData.roleId = formData.roleId;
      }

      // Include location fields if available
      if (formData.residence && (formData.residence.provinceId || formData.residence.districtId || formData.residence.communeId || formData.residence.villageId)) {
        updateData.residence = formData.residence;
        // Also include legacy flat fields for compatibility
        if (formData.residence.provinceId) updateData.province_id = formData.residence.provinceId;
        if (formData.residence.districtId) updateData.district_id = formData.residence.districtId;
        if (formData.residence.communeId) updateData.commune_id = formData.residence.communeId;
        if (formData.residence.villageId) updateData.village_id = formData.residence.villageId;
      }

      if (formData.placeOfBirth && (formData.placeOfBirth.provinceId || formData.placeOfBirth.districtId || formData.placeOfBirth.communeId || formData.placeOfBirth.villageId)) {
        updateData.placeOfBirth = formData.placeOfBirth;
      }

      // Include QR code fields if available (read-only)
      if (formData.qr_code) {
        updateData.qr_code = formData.qr_code;
      }
      if (formData.qr_token) {
        updateData.qr_token = formData.qr_token;
      }
      if (formData.qr_generated_at) {
        updateData.qr_generated_at = formData.qr_generated_at;
      }

      // Include newPassword if provided
      if (formData.newPassword && formData.newPassword.trim()) {
        updateData.newPassword = formData.newPassword;
      }

      console.log('Update payload being sent:', updateData);

      const response = await api.user.updateUserProfile(updateData);
      clearTimeout(timeoutId);

      const updatedUser = {
        ...user,
        ...response,
        // Explicitly preserve isDirector to ensure it's not lost
        isDirector: response.isDirector !== undefined ? response.isDirector : user?.isDirector
      };
      utils.user.saveUserData(updatedUser);
      setUser(updatedUser);

      // Update formData with the response data to refresh all displayed values including BMI
      setFormData(prev => ({
        ...prev,
        id: response.id || prev.id,
        username: response.username || prev.username,
        first_name: response.first_name || prev.first_name,
        last_name: response.last_name || prev.last_name,
        email: response.email || prev.email,
        roleId: response.roleId || prev.roleId,
        date_of_birth: response.date_of_birth || prev.date_of_birth,
        gender: response.gender || prev.gender,
        phone: response.phone || prev.phone,
        profile_picture: response.profile_picture || prev.profile_picture,
        nationality: response.nationality || prev.nationality,
        weight_kg: response.weight_kg || prev.weight_kg,
        height_cm: response.height_cm || prev.height_cm,
        qr_code: response.qr_code || prev.qr_code,
        qr_token: response.qr_token || prev.qr_token,
        qr_generated_at: response.qr_generated_at || prev.qr_generated_at,
        residence: response.residence || prev.residence,
        placeOfBirth: response.placeOfBirth || prev.placeOfBirth
      }));

      setProfilePictureFile(null); // Clear the selected file
      showSuccess(t('profileUpdatedSuccess'));
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Profile update error:', err);
      showError(t('updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = useStableCallback((date) => {
    setFormData(prev => ({
      ...prev,
      date_of_birth: date ? date.toISOString().split('T')[0] : ''
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
      let userId = formData.id || formData.teacherId ||
        user?.id || user?.userId || user?.user_id || user?.teacherId;

      // Try to extract user ID from localStorage as fallback
      if (!userId) {
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            userId = parsedUser.id || parsedUser.userId || parsedUser.user_id || parsedUser.teacherId;
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
        id: formData.id,
        teacherId: formData.teacherId
      });
      console.log('User prop ID fields:', {
        id: user?.id,
        userId: user?.userId,
        user_id: user?.user_id,
        teacherId: user?.teacherId
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
    if (!formData.email.trim()) {
      showError(t('emailRequiredMsg'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="">
        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden">
          <div className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
              <div className="flex items-center min-w-0 flex-1">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                  <User className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
                    {t('personalInformation')}
                  </h3>
                  <p className="text-slate-500 text-xs sm:text-sm mt-1 hidden sm:block">Update your personal details and preferences</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleEditToggle}
                variant="primary"
                size="sm"
                className="rounded-lg w-full sm:w-auto"
              >
                <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">{isEditMode ? t('cancel') || 'Cancel' : t('edit') || 'Edit'}</span>
              </Button>
            </div>

            <div className='grid sm:grid-cols-3 grid-cols-1 gap-4'>
              {/* Profile Picture Section */}
              <div className="col-span-1 mb-8 p-6 rounded-xl border border-gray-100 shadow-sm">
                {/* Profile Picture with Dropdown */}
                <div className="grid grid-cols-1 gap-3 justify-center items-center" ref={dropdownRef}>

                  <div
                    className={`relative inline-block ${isEditMode ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    onClick={isEditMode ? () => setShowDropdown(!showDropdown) : undefined}
                  >
                    <label className="block text-sm font-semibold text-gray-900 mb-4">
                      {t('profilePicture')}
                    </label>
                    {profilePictureFile ? (
                      <img
                        src={URL.createObjectURL(profilePictureFile)}
                        alt="Profile Preview"
                        className="h-40 w-40 sm:h-40 sm:w-40 lg:h-40 lg:w-40 rounded-full object-cover border-4 border-white shadow-lg hover:shadow-xl transition-all"
                      />
                    ) : (
                      <ProfileImage
                        user={formData}
                        size="custom"
                        customSize="h-40 w-40 sm:h-40 sm:w-40 lg:h-40 lg:w-40"
                        alt="Profile"
                        className="shadow-lg"
                        borderColor="border-white"
                        fallbackType="image"
                        clickable={isEditMode}
                      />
                    )}

                  </div>
                  {/* QR Code Section */}
                  {formData.qr_code && (
                    <div className="">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <QrCodeIcon className="h-4 w-4" />
                        QR Code
                      </h4>
                      <div className=" gap-4 bg-white rounded-lg border border-gray-200">
                        <div className="flex flex-row justify-between items-center gap-2">
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={handleViewQRCode}
                            className="flex items-center gap-2 text-xs sm:text-sm"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />

                          </Button>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={downloadQRCode}
                            className="flex items-center gap-2 text-xs sm:text-sm"
                          >
                            <Download className="h-3 w-3 sm:h-4 sm:w-4" />

                          </Button>
                        </div>
                        <div className="p-2">
                          <img
                            src={formData.qr_code}
                            alt="QR Code"
                            className="h-32 w-32 object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                      <div className="py-1">
                        {formData.profile_picture && (
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
                  <p className="mt-2 text-sm text-green-600">
                    {t('newPictureSelected') || 'New picture selected'}: {profilePictureFile.name}
                  </p>
                )}

                {pictureUploading && (
                  <p className="mt-2 text-sm text-blue-600">{t('uploadingImage')}</p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 p-4 border border-gray-100 rounded-lg col-span-2">
                <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-3">
                  <div>
                    <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-gray-700">
                      {t('username')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="username"
                        id="username"
                        required
                        readOnly={!isEditMode}
                        className={`mt-1 block w-full pl-8 sm:pl-10 rounded-md shadow-sm text-sm transition-all duration-300 ${!isEditMode ? 'bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md'}`}
                        value={formData.username}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="teacher_number" className="block text-xs sm:text-sm font-medium text-gray-700">
                      {t('teacherNumber')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                        <Building className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="teacher_number"
                        id="teacher_number"
                        readOnly={!isEditMode}
                        className={`mt-1 block w-full pl-8 sm:pl-10 rounded-md shadow-sm text-sm transition-all duration-300 ${!isEditMode ? 'bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md'}`}
                        value={formData.teacher_number}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="teacherId" className="block text-xs sm:text-sm font-medium text-gray-700">
                      {t('teacherId') || 'Teacher ID'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                        <Building className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="teacherId"
                        id="teacherId"
                        readOnly
                        className="mt-1 block w-full pl-8 sm:pl-10 rounded-md shadow-sm text-sm bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none"
                        value={formData.teacherId}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-3">
                  <div>
                    <label htmlFor="roleNameKh" className="block text-xs sm:text-sm font-medium text-gray-700">
                      {t('role') || 'Role'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="roleNameKh"
                        id="roleNameKh"
                        readOnly
                        className="mt-1 block w-full pl-8 sm:pl-10 rounded-md shadow-sm text-sm bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none"
                        value={formData.roleNameKh}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="first_name" className="block text-xs sm:text-sm font-medium text-gray-700">
                      {t('firstNameRequired')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="first_name"
                        id="first_name"
                        required
                        readOnly={!isEditMode}
                        className={`mt-1 block w-full pl-8 sm:pl-10 rounded-md shadow-sm text-sm transition-all duration-300 ${!isEditMode ? 'bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md'}`}
                        value={formData.first_name}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="last_name" className="block text-xs sm:text-sm font-medium text-gray-700">
                      {t('lastNameRequired')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="last_name"
                        id="last_name"
                        required
                        readOnly={!isEditMode}
                        className={`mt-1 block w-full pl-8 sm:pl-10 rounded-md shadow-sm text-sm transition-all duration-300 ${!isEditMode ? 'bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md'}`}
                        value={formData.last_name}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      {t('emailRequired')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        readOnly={!isEditMode}
                        className={`mt-1 block w-full pl-10 rounded-md shadow-sm sm:text-sm transition-all duration-300 ${!isEditMode ? 'bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md'}`}
                        value={formData.email}
                        onChange={handleInputChange}
                      />
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
                        readOnly={!isEditMode}
                        className={`mt-1 block w-full pl-10 rounded-md shadow-sm sm:text-sm transition-all duration-300 ${!isEditMode ? 'bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md'}`}
                        value={formData.newPassword}
                        onChange={handleInputChange}
                      />
                    </div>
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
                        placeholder="+1234567890"
                        readOnly={!isEditMode}
                        className={`mt-1 block w-full pl-10 rounded-md shadow-sm sm:text-sm transition-all duration-300 ${!isEditMode ? 'bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md'}`}
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Date of Birth and Gender */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">
                      {t('nationality')}
                    </label>
                    <div className="mt-1">
                      {isEditMode ? (
                        <Dropdown
                          value={formData.nationality}
                          onValueChange={(value) => {
                            setFormData(prev => ({ ...prev, nationality: value }));
                          }}
                          options={[
                            { value: 'Cambodian', label: 'ខ្មែរ' },
                            { value: 'Thai', label: 'ថៃ' },
                            { value: 'Vietnamese', label: 'វៀតណាម' },
                            { value: 'Laotian', label: 'ឡាវ' },
                            { value: 'Chinese', label: 'ចិន' },
                            { value: 'Other', label: 'ផ្សេងទៀត' }
                          ]}
                          placeholder={t('selectNationality') || 'Select nationality'}
                          className="w-full"
                        />
                      ) : (
                        <div className="mt-1 block w-full px-3 py-2 bg-gray-50 border-0 rounded-md shadow-sm sm:text-sm text-gray-900">
                          {formData.nationality === 'Cambodian' ? 'ខ្មែរ' : formData.nationality === 'Thai' ? 'ថៃ' : formData.nationality === 'Vietnamese' ? 'វៀតណាម' : formData.nationality === 'Laotian' ? 'ឡាវ' : formData.nationality === 'Chinese' ? 'ចិន' : formData.nationality === 'Other' ? 'ផ្សេងទៀត' : formData.nationality}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">
                      {t('dateOfBirth') || 'Date of Birth'}
                    </label>
                    <div className="mt-1">
                      {isEditMode ? (
                        <DatePickerWithDropdowns
                          value={formData.date_of_birth ? new Date(formData.date_of_birth) : null}
                          onChange={handleDateChange}
                          placeholder={t('selectDate') || 'Select date'}
                          className="w-full"
                        />
                      ) : (
                        <div className="mt-1 block w-full px-3 py-2 bg-gray-50 border-0 rounded-md shadow-sm sm:text-sm text-gray-900">
                          {formData.date_of_birth ? new Date(formData.date_of_birth).toLocaleDateString() : '-'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className=''>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('gender') || 'Gender'}
                    </label>
                    <div className="mt-1">
                      {isEditMode ? (
                        <RadioGroup.Root
                          value={formData.gender}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                          className="flex items-center gap-3"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroup.Item
                              value="MALE"
                              id="male"
                              className="w-4 h-4 rounded-full border border-gray-300 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                              <RadioGroup.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:w-2 after:h-2 after:rounded-full after:bg-white" />
                            </RadioGroup.Item>
                            <label htmlFor="male" className="text-sm text-gray-700 cursor-pointer">
                              {t('male') || 'Male'}
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroup.Item
                              value="FEMALE"
                              id="female"
                              className="w-4 h-4 rounded-full border border-gray-300 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                              <RadioGroup.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:w-2 after:h-2 after:rounded-full after:bg-white" />
                            </RadioGroup.Item>
                            <label htmlFor="female" className="text-sm text-gray-700 cursor-pointer">
                              {t('female') || 'Female'}
                            </label>
                          </div>
                        </RadioGroup.Root>
                      ) : (
                        <div className="mt-1 block w-full px-3 py-2 bg-gray-50 border-0 rounded-md shadow-sm sm:text-sm text-gray-900">
                          {formData.gender === 'MALE' ? (t('male') || 'Male') : (t('female') || 'Female')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Weight and Height */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="weight_kg" className="block text-sm font-medium text-gray-700">
                      {t('weight', 'Weight')} ({t('kg', 'kg')}) <span className="text-gray-400 text-xs">{t('optional', '(Optional)')}</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Weight className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        name="weight_kg"
                        id="weight_kg"
                        step="0.1"
                        min="0"
                        readOnly={!isEditMode}
                        className={`mt-1 block w-full pl-10 rounded-md shadow-sm sm:text-sm transition-all duration-300 ${!isEditMode ? 'bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md'}`}
                        value={formData.weight_kg}
                        onChange={handleInputChange}
                        placeholder={t('enterWeight', 'Enter weight')}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="height_cm" className="block text-sm font-medium text-gray-700">
                      {t('height', 'Height')} ({t('cm', 'cm')}) <span className="text-gray-400 text-xs">{t('optional', '(Optional)')}</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Ruler className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        name="height_cm"
                        id="height_cm"
                        step="0.1"
                        min="0"
                        readOnly={!isEditMode}
                        className={`mt-1 block w-full pl-10 rounded-md shadow-sm sm:text-sm transition-all duration-300 ${!isEditMode ? 'bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md'}`}
                        value={formData.height_cm}
                        onChange={handleInputChange}
                        placeholder={t('enterHeight', 'Enter height')}
                      />
                    </div>
                  </div>
                </div>

                {/* BMI Display as Input Fields */}
                {(formData.weight_kg || formData.height_cm) && (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="bmi" className="block text-sm font-medium text-gray-700">
                        {t('bmi') || 'BMI'} <span className="text-gray-400 text-xs">{t('readonly', '(Read-only)')}</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="bmi"
                          readOnly
                          value={calculateBMI() || '-'}
                          className={`mt-1 block w-full px-3 py-2 rounded-md shadow-sm sm:text-sm font-bold transition-all duration-300 cursor-not-allowed border-2 ${
                            !calculateBMI()
                              ? 'bg-gray-50 border-gray-300 text-gray-900'
                              : getBMICategory(calculateBMI()).bmi < 18.5
                              ? 'bg-blue-50 border-blue-400 text-blue-900'
                              : getBMICategory(calculateBMI()).bmi < 25
                              ? 'bg-green-50 border-green-400 text-green-900'
                              : getBMICategory(calculateBMI()).bmi < 30
                              ? 'bg-yellow-50 border-yellow-400 text-yellow-900'
                              : 'bg-red-50 border-red-400 text-red-900'
                          }`}
                        />
                      </div>
                    </div>

                    {calculateBMI() && (
                      <div>
                        <label htmlFor="bmiStatus" className="block text-sm font-medium text-gray-700">
                          {t('bmiCategory') || 'Status'} <span className="text-gray-400 text-xs">{t('readonly', '(Read-only)')}</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            id="bmiStatus"
                            readOnly
                            value={getBMICategory(calculateBMI()).label}
                            className={`mt-1 block w-full px-3 py-2 rounded-md shadow-sm sm:text-sm font-semibold transition-all duration-300 cursor-not-allowed border-2 ${getBMICategory(calculateBMI()).bgColor} ${getBMICategory(calculateBMI()).color} border-opacity-50`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Current Residence Information */}
                <div className="border-t pt-4 sm:pt-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h4 className="text-base sm:text-lg font-medium text-gray-900">{t('currentResidence') || 'Current Residence'}</h4>
                    {locationDataLoading && (
                      <DynamicLoader
                        type="dots"
                        size="sm"
                        message="Loading location data..."
                        className="text-sm text-blue-600"
                      />
                    )}
                  </div>

                  {/* Province and District */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 mb-6">
                    <div>
                      <label htmlFor="residence-province" className="block text-sm font-medium text-gray-700">
                        {t('province')}
                      </label>
                      <div className="mt-1">
                        {isEditMode ? (
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
                        ) : (
                          <div className="mt-1 block w-full px-3 py-2 bg-gray-50 border-0 rounded-md shadow-sm sm:text-sm text-gray-900">
                            {getResidenceProvinceOptions().find(p => p.value === selectedResidenceProvince)?.label || '-'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="residence-district" className="block text-sm font-medium text-gray-700">
                        {t('district')}
                      </label>
                      <div className="mt-1">
                        {isEditMode ? (
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
                        ) : (
                          <div className="mt-1 block w-full px-3 py-2 bg-gray-50 border-0 rounded-md shadow-sm sm:text-sm text-gray-900">
                            {getResidenceDistrictOptions().find(d => d.value === selectedResidenceDistrict)?.label || '-'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Commune and Village */}
                    <div>
                      <label htmlFor="residence-commune" className="block text-sm font-medium text-gray-700">
                        {t('commune')}
                      </label>
                      <div className="mt-1">
                        {isEditMode ? (
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
                        ) : (
                          <div className="mt-1 block w-full px-3 py-2 bg-gray-50 border-0 rounded-md shadow-sm sm:text-sm text-gray-900">
                            {getResidenceCommuneOptions().find(c => c.value === selectedResidenceCommune)?.label || '-'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="residence-village" className="block text-sm font-medium text-gray-700">
                        {t('village')}
                      </label>
                      <div className="mt-1">
                        {isEditMode ? (
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
                        ) : (
                          <div className="mt-1 block w-full px-3 py-2 bg-gray-50 border-0 rounded-md shadow-sm sm:text-sm text-gray-900">
                            {getResidenceVillageOptions().find(v => v.value === selectedResidenceVillage)?.label || '-'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Place of Birth Information */}
                <div className="border-t pt-4 sm:pt-6">
                  <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">{t('placeOfBirth') || 'Place of Birth'}</h4>

                  {/* Province and District */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 mb-6">
                    <div>
                      <label htmlFor="birth-province" className="block text-sm font-medium text-gray-700">
                        {t('province')}
                      </label>
                      <div className="mt-1">
                        {isEditMode ? (
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
                        ) : (
                          <div className="mt-1 block w-full px-3 py-2 bg-gray-50 border-0 rounded-md shadow-sm sm:text-sm text-gray-900">
                            {getBirthProvinceOptions().find(p => p.value === selectedBirthProvince)?.label || '-'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="birth-district" className="block text-sm font-medium text-gray-700">
                        {t('district')}
                      </label>
                      <div className="mt-1">
                        {isEditMode ? (
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
                        ) : (
                          <div className="mt-1 block w-full px-3 py-2 bg-gray-50 border-0 rounded-md shadow-sm sm:text-sm text-gray-900">
                            {getBirthDistrictOptions().find(d => d.value === selectedBirthDistrict)?.label || '-'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Commune and Village */}
                    <div>
                      <label htmlFor="birth-commune" className="block text-sm font-medium text-gray-700">
                        {t('commune')}
                      </label>
                      <div className="mt-1">
                        {isEditMode ? (
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
                        ) : (
                          <div className="mt-1 block w-full px-3 py-2 bg-gray-50 border-0 rounded-md shadow-sm sm:text-sm text-gray-900">
                            {getBirthCommuneOptions().find(c => c.value === selectedBirthCommune)?.label || '-'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="birth-village" className="block text-sm font-medium text-gray-700">
                        {t('village')}
                      </label>
                      <div className="mt-1">
                        {isEditMode ? (
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
                        ) : (
                          <div className="mt-1 block w-full px-3 py-2 bg-gray-50 border-0 rounded-md shadow-sm sm:text-sm text-gray-900">
                            {getBirthVillageOptions().find(v => v.value === selectedBirthVillage)?.label || '-'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isEditMode && (
                  <div className="pt-4 sm:pt-6">
                    <Button
                      type="submit"
                      disabled={loading}
                      variant="primary"
                      size="default"
                      fullWidth
                      className="text-sm sm:text-base"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? t('updating') : t('updateProfile')}
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && formData.profile_picture && (
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
              src={utils.user.getProfilePictureUrl({ profile_picture: formData.profile_picture })}
              alt="Profile"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && formData.qr_code && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowQRModal(false)}>
          <div className="relative max-w-2xl max-h-full p-4 bg-white rounded-lg">
            <Button
              onClick={() => setShowQRModal(false)}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 z-10"
            >
              <X className="w-6 h-6" />
            </Button>
            <div className="flex flex-col items-center justify-center p-8">
              <img
                src={formData.qr_code}
                alt="QR Code"
                className="max-w-full max-h-96 object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              <p className="mt-4 text-sm text-gray-600">
                {formData.username}
              </p>
              <Button
                onClick={downloadQRCode}
                variant="secondary"
                size="default"
                className="mt-4 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {t('download') || 'Download'}
              </Button>
            </div>
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