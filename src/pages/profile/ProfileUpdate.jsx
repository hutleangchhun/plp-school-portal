import { useState, useRef, useEffect } from 'react';
import { Save, User, Eye, Upload, Edit, Mail, Lock, Phone, Globe, MapPin, Building, Home, Compass, X } from 'lucide-react';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { DatePickerWithDropdowns } from '../../components/ui/date-picker-with-dropdowns';
import ProfileImage from '../../components/ui/ProfileImage';
import { api, utils } from '../../utils/api';

export default function ProfileUpdate({ user, setUser }) {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    newPassword: '',
    date_of_birth: '',
    gender: 'MALE',
    profile_picture: '',
    phone: '',
    teacher_number: '',
    provinceId: '',
    districtId: '',
    communeId: '',
    villageId: '',
    nationality: 'Cambodian'
  });
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [pictureUploading, setPictureUploading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

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
      setDataLoading(true);
      try {
        const userData = await api.user.getMyAccount();
        setFormData({
          username: userData.username || '',
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || '',
          newPassword: '',
          date_of_birth: userData.date_of_birth || '',
          gender: userData.gender || 'MALE',
          profile_picture: userData.profile_picture || '',
          phone: userData.phone || '',
          teacher_number: userData.teacher_number || '',
          provinceId: userData.provinceId || '',
          districtId: userData.districtId || '',
          communeId: userData.communeId || '',
          villageId: userData.villageId || '',
          nationality: userData.nationality || 'Cambodian'
        });
        // Also update the user context if needed
        if (setUser) {
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        showError(error.message || t('failedToLoadUserData') || 'Failed to load user data');
      } finally {
        setDataLoading(false);
      }
    };

    fetchUserData();
  }, [setUser, showError, t]);

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

      const updateData = { ...formData };
      if (!updateData.newPassword) {
        delete updateData.newPassword;
      }
      
      // Update profile picture path if uploaded
      if (profilePictureUrl) {
        updateData.profile_picture = profilePictureUrl;
      }
      
      const response = await api.user.updateMyAccount(updateData);
      clearTimeout(timeoutId);

      const updatedUser = { ...user, ...response };
      utils.user.saveUserData(updatedUser);
      setUser(updatedUser);
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

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      date_of_birth: date ? date.toISOString().split('T')[0] : ''
    }));
  };

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
      const response = await api.user.uploadProfilePicture(profilePictureFile);
      return response.profile_picture;
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

  if (dataLoading) {
    return (
      <div className="p-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">{t('loading') || 'Loading...'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6">
        <div>
          <div className="bg-white shadow rounded-lg">
            <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
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

              {/* Profile Picture Section */}
              <div className="mb-6 sm:mb-8">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  {t('profilePicture')}
                </label>
                
                {/* Profile Picture with Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <div 
                    className={`relative inline-block ${isEditMode ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    onClick={isEditMode ? () => setShowDropdown(!showDropdown) : undefined}
                  >
                    {profilePictureFile ? (
                      <img 
                        src={URL.createObjectURL(profilePictureFile)}
                        alt="Profile Preview" 
                        className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover border-2 border-gray-300 hover:border-blue-500 transition-colors"
                      />
                    ) : (
                      <ProfileImage
                        user={formData}
                        size="lg"
                        alt="Profile"
                        className="hover:border-blue-500 transition-colors"
                        borderColor="border-gray-300"
                        fallbackType="image"
                        clickable={isEditMode}
                      />
                    )}
                    
                  </div>

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

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
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
                </div>

                <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
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

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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

                  <div>
                    <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">
                      {t('nationality')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="nationality"
                        id="nationality"
                        readOnly={!isEditMode}
                        className={`mt-1 block w-full pl-10 rounded-md shadow-sm sm:text-sm transition-all duration-300 ${!isEditMode ? 'bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md'}`}
                        value={formData.nationality}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('dateOfBirth')}
                    </label>
                    <DatePickerWithDropdowns
                      value={formData.date_of_birth ? new Date(formData.date_of_birth) : null}
                      onChange={handleDateChange}
                      placeholder={t('selectDateOfBirth', 'Select date of birth')}
                      disabled={!isEditMode}
                      fromYear={1960}
                      toYear={new Date().getFullYear()}
                      className={`transition-all duration-300 ${!isEditMode ? 'bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md'}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {t('genderRequired')}
                    </label>
                    <RadioGroup.Root
                      value={formData.gender}
                      onValueChange={(value) => {
                        if (isEditMode) {
                          setFormData(prev => ({
                            ...prev,
                            gender: value
                          }));
                        }
                      }}
                      disabled={!isEditMode}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroup.Item
                          value="MALE"
                          id="gender-male"
                          className={`w-4 h-4 rounded-full border-2 ${!isEditMode ? 'cursor-not-allowed border-gray-200 bg-gray-50' : 'border-blue-500 hover:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'} data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500`}
                        >
                          <RadioGroup.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-white" />
                        </RadioGroup.Item>
                        <label htmlFor="gender-male" className={`text-sm ${!isEditMode ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}>
                          {t('male')}
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroup.Item
                          value="FEMALE"
                          id="gender-female"
                          className={`w-4 h-4 rounded-full border-2 ${!isEditMode ? 'cursor-not-allowed border-gray-200 bg-gray-50' : 'border-blue-500 hover:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'} data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500`}
                        >
                          <RadioGroup.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-white" />
                        </RadioGroup.Item>
                        <label htmlFor="gender-female" className={`text-sm ${!isEditMode ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}>
                          {t('female')}
                        </label>
                      </div>
                    </RadioGroup.Root>
                  </div>
                </div>


                <div className="border-t pt-4 sm:pt-6">
                  <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">{t('locationInformation')}</h4>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="provinceId" className="block text-sm font-medium text-gray-700">
                        {t('provinceId')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          name="provinceId"
                          id="provinceId"
                          readOnly={!isEditMode}
                          className={`mt-1 block w-full pl-10 rounded-md shadow-sm sm:text-sm transition-all duration-300 ${!isEditMode ? 'bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md'}`}
                          value={formData.provinceId}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="districtId" className="block text-sm font-medium text-gray-700">
                        {t('districtId')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Building className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          name="districtId"
                          id="districtId"
                          readOnly={!isEditMode}
                          className={`mt-1 block w-full pl-10 rounded-md shadow-sm sm:text-sm transition-all duration-300 ${!isEditMode ? 'bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md'}`}
                          value={formData.districtId}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 mt-4 sm:mt-6">
                    <div>
                      <label htmlFor="communeId" className="block text-sm font-medium text-gray-700">
                        {t('communeId')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Compass className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          name="communeId"
                          id="communeId"
                          readOnly={!isEditMode}
                          className={`mt-1 block w-full pl-10 rounded-md shadow-sm sm:text-sm transition-all duration-300 ${!isEditMode ? 'bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md'}`}
                          value={formData.communeId}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="villageId" className="block text-sm font-medium text-gray-700">
                        {t('villageId')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Home className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          name="villageId"
                          id="villageId"
                          readOnly={!isEditMode}
                          className={`mt-1 block w-full pl-10 rounded-md shadow-sm sm:text-sm transition-all duration-300 ${!isEditMode ? 'bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md'}`}
                          value={formData.villageId}
                          onChange={handleInputChange}
                        />
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
                src={utils.user.getProfilePictureUrl({profile_picture: formData.profile_picture})}
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