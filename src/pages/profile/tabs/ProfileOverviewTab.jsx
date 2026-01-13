import { User, Eye, EyeOff, Upload, Mail, Lock, Phone, Weight, Ruler, X, CheckCircle2, Wand2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { DatePickerWithDropdowns } from '../../../components/ui/date-picker-with-dropdowns';
import ProfileImage from '../../../components/ui/ProfileImage';
import ProfileInfoDisplay from '../../../components/ui/ProfileInfoDisplay';
import Dropdown from '../../../components/ui/Dropdown';
import MultiSelectDropdown from '../../../components/ui/MultiSelectDropdown';
import SalaryTypeDropdown from '../../../components/ui/SalaryTypeDropdown';
import {
  genderOptions,
  roleOptions,
  ethnicGroupOptions as baseEthnicGroupOptions,
  gradeLevelOptions,
  employmentTypeOptions,
  teachingTypeOptions,
  teacherStatusOptions,
  subjectOptions,
  educationLevelOptions,
  trainingTypeOptions,
  maritalStatusOptions,
  spouseJobOptions,
  accessibilityOptions,
  nationalityOptionsProfile,
} from '../../../utils/formOptions';

/**
 * ProfileOverviewTab Component
 * Main profile editing and viewing component with comprehensive user information forms
 */
export default function ProfileOverviewTab({
  // State
  formData,
  setFormData,
  isEditMode,
  profilePictureFile,
  setProfilePictureFile,
  showDropdown,
  setShowDropdown,
  showUsernameSuggestions,
  setShowUsernameSuggestions,
  usernameSuggestions,
  setUsernameSuggestions,
  usernameAvailable,
  emailAvailable,
  teacherNumberAvailable,
  showPassword,
  setShowPassword,
  pictureUploading,

  // Refs
  dropdownRef,
  fileInputRef,
  usernameContainerRef,

  // Location state
  selectedResidenceProvince,
  selectedResidenceDistrict,
  selectedResidenceCommune,
  selectedResidenceVillage,
  selectedBirthProvince,
  selectedBirthDistrict,
  selectedBirthCommune,
  selectedBirthVillage,

  // Functions
  handleInputChange,
  handleDateChange,
  handleProfilePictureChange,
  handleViewPicture,
  handleUploadClick,
  handleSubmit,
  handleGenerateUsernameSuggestions,
  handleChooseUsernameSuggestion,
  handleResidenceProvinceChange,
  handleResidenceDistrictChange,
  handleResidenceCommuneChange,
  handleResidenceVillageChange,
  handleBirthProvinceChange,
  handleBirthDistrictChange,
  handleBirthCommuneChange,
  handleBirthVillageChange,
  getResidenceProvinceOptions,
  getResidenceDistrictOptions,
  getResidenceCommuneOptions,
  getResidenceVillageOptions,
  getBirthProvinceOptions,
  getBirthDistrictOptions,
  getBirthCommuneOptions,
  getBirthVillageOptions,
  getPasswordStrength,
  isWeightInvalid,
  isHeightInvalid,
  convertHeightToCm,
  convertWeightToKg,
  calculateBMI,
  getBMICategory,
  sanitizeUsername,

  // Translation
  t,
  user,
}) {
  return (
    <>
      {/* Profile Picture Card - Edit Mode */}
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
                {formData.roleNameKh && <p className="text-sm text-gray-600">{formData.roleNameKh}</p>}
                {formData.school_name && <p className="text-sm text-gray-500">{formData.school_name}</p>}
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
            <div className="w-full p-3 sm:p-4 bg-green-50 rounded-md border border-green-300 mt-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-green-600 mt-0.5">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800">{t('newPictureSelected') || 'New picture selected'}</p>
                  <p className="text-xs text-green-700 mt-1 truncate">{profilePictureFile.name}</p>
                </div>
              </div>
            </div>
          )}

          {pictureUploading && (
            <div className="w-full p-3 sm:p-4 bg-blue-50 rounded-md border border-blue-300 mt-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin">
                  <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
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
                  {formData.first_name && formData.last_name
                    ? `${formData.first_name} ${formData.last_name}`
                    : formData.username || '-'}
                </h2>
                {formData.roleNameKh && (
                  <p className="text-sm text-gray-600 mb-1">
                    {formData.roleNameKh} ({formData.roleNameEn})
                  </p>
                )}
                {formData.school_name && <p className="text-gray-600 text-sm">{formData.school_name}</p>}
                {formData.email && <p className="text-gray-600 text-sm mt-2">{formData.email}</p>}
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
              <h3 className="text-lg font-semibold text-gray-900">{t('personalInformation')}</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:gap-6 lg:grid-cols-4">
              {/* First Name */}
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

              {/* Last Name */}
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

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('gender')} *
                </label>
                <Dropdown
                  options={genderOptions}
                  value={formData.gender}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}
                  placeholder={t('selectGender')}
                  className="w-full"
                />
              </div>

              {/* Date of Birth */}
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

              {/* Nationality */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('nationality')} *
                </label>
                <Dropdown
                  options={nationalityOptionsProfile}
                  value={formData.nationality}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, nationality: value }))}
                  placeholder={t('selectNationality')}
                  className="w-full"
                />
              </div>



              {/* Ethnic Group */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('ethnicGroup')}
                </label>
                <Dropdown
                  options={[{ value: '', label: t('selectEthnicGroup') }, ...baseEthnicGroupOptions]}
                  value={formData.ethnic_group}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, ethnic_group: value }))}
                  placeholder={t('selectEthnicGroup')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  className="w-full"
                />
              </div>

              {/* Weight */}
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
                      setFormData((prev) => {
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

              {/* Height */}
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
                      setFormData((prev) => {
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
              <div className="col-span-1 lg:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('accessibility')}
                </label>
                <div className="mt-1 space-y-2 p-3 border border-gray-300 rounded-md bg-gray-50 max-h-40 overflow-y-auto">
                  {accessibilityOptions.map((option) => (
                    <label key={option.value} className="flex items-center space-x-2 cursor-pointer p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.accessibility.includes(option.value)}
                        onChange={(e) => {
                          const newAccessibility = e.target.checked
                            ? [...formData.accessibility, option.value]
                            : formData.accessibility.filter((item) => item !== option.value);
                          setFormData((prev) => ({ ...prev, accessibility: newAccessibility }));
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
              <h3 className="text-lg font-semibold text-gray-900">{t('account', 'Account')}</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:gap-6 lg:grid-cols-4">
              {/* Username */}
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
                      className="mt-1 block w-full pl-10 pr-10 rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500 focus:scale-[1.01]"
                      value={formData.username}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        const newValue = sanitizeUsername(rawValue);
                        setFormData((prev) => ({ ...prev, username: newValue }));

                        // Debounce username suggestions
                        if (window.usernameDebounceRef?.current) {
                          clearTimeout(window.usernameDebounceRef.current);
                        }
                        window.usernameDebounceRef = setTimeout(() => {
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
                    <p className="mt-1 text-xs text-green-600">{t('usernameAvailable')}</p>
                  )}
                  {usernameAvailable === false && formData.username && (
                    <p className="mt-1 text-xs text-red-600">{t('usernameNotAvailable')}</p>
                  )}
                  {usernameAvailable === null && formData.username && formData.username.trim() && (
                    <p className="mt-1 text-xs text-gray-500">{t('usernameSuggestionHint')}</p>
                  )}
                </div>
              </div>

              {/* New Password */}
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
                      <span
                        className={`text-xs font-medium ${getPasswordStrength(formData.newPassword).color.replace('bg-', 'text-')}`}
                      >
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

              {/* Email */}
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
                    } focus:scale-[1.01]`}
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder={t('enterEmail')}
                  />
                </div>
                {emailAvailable === true && (
                  <p className="mt-1 text-xs text-green-600">{t('emailAvailable', 'This email is available.')}</p>
                )}
                {emailAvailable === false && (
                  <p className="mt-1 text-xs text-red-600">{t('emailNotAvailable', 'This email is already in use')}</p>
                )}
                {emailAvailable === null && formData.email && formData.email.trim() && (
                  <p className="mt-1 text-xs text-gray-500">{t('emailValidationHint', 'Checking email availability...')}</p>
                )}
              </div>

              {/* Phone */}
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
              <h3 className="text-lg font-semibold text-gray-900">{t('currentResidence')}</h3>
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
                      setFormData((prev) => ({
                        ...prev,
                        residence: { ...prev.residence, provinceId: value },
                        provinceId: value,
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
                      setFormData((prev) => ({
                        ...prev,
                        residence: { ...prev.residence, districtId: value },
                        districtId: value,
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
                      setFormData((prev) => ({
                        ...prev,
                        residence: { ...prev.residence, communeId: value },
                        communeId: value,
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
                      setFormData((prev) => ({
                        ...prev,
                        residence: { ...prev.residence, villageId: value },
                        villageId: value,
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
              <h3 className="text-lg font-semibold text-gray-900">{t('placeOfBirth')}</h3>
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
                      setFormData((prev) => ({
                        ...prev,
                        placeOfBirth: { ...prev.placeOfBirth, provinceId: value },
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
                      setFormData((prev) => ({
                        ...prev,
                        placeOfBirth: { ...prev.placeOfBirth, districtId: value },
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
                      setFormData((prev) => ({
                        ...prev,
                        placeOfBirth: { ...prev.placeOfBirth, communeId: value },
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
                      setFormData((prev) => ({
                        ...prev,
                        placeOfBirth: { ...prev.placeOfBirth, villageId: value },
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

          {/* Employment Information Card - Continues in next part due to size */}
          <EmploymentInformationCard
            formData={formData}
            setFormData={setFormData}
            gradeLevelOptions={gradeLevelOptions}
            employmentTypeOptions={employmentTypeOptions}
            teachingTypeOptions={teachingTypeOptions}
            teacherStatusOptions={teacherStatusOptions}
            subjectOptions={subjectOptions}
            educationLevelOptions={educationLevelOptions}
            trainingTypeOptions={trainingTypeOptions}
            t={t}
          />

          {/* Family Information Card - Continues in next part due to size */}
          <FamilyInformationCard
            formData={formData}
            setFormData={setFormData}
            maritalStatusOptions={maritalStatusOptions}
            spouseJobOptions={spouseJobOptions}
            t={t}
          />

          {/* Submit Button */}
          <div className="flex justify-start gap-3 pt-2">
            <Button type="submit" variant="primary" size="sm">
              {t('saveChanges', 'Save Changes')}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}

/**
 * Employment Information Card Sub-component
 */
function EmploymentInformationCard({
  formData,
  setFormData,
  gradeLevelOptions,
  employmentTypeOptions,
  teachingTypeOptions,
  teacherStatusOptions,
  subjectOptions,
  educationLevelOptions,
  trainingTypeOptions,
  t,
}) {
  return (
    <div className="bg-white rounded-md border border-gray-200 p-6">
      <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">{t('employmentInformation')}</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:gap-6 lg:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('gradeLevel')}
          </label>
          <Dropdown
            options={[{ value: '', label: t('selectGradeLevel') }, ...gradeLevelOptions]}
            value={formData.gradeLevel}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, gradeLevel: value }))}
            placeholder={t('selectGradeLevel')}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('employmentType')}
          </label>
          <Dropdown
            options={[{ value: '', label: t('selectEmploymentType') }, ...employmentTypeOptions]}
            value={formData.employment_type}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, employment_type: value }))}
            placeholder={t('selectEmploymentType')}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('teachingType')}
          </label>
          <Dropdown
            options={[{ value: '', label: t('selectTeachingType') }, ...teachingTypeOptions]}
            value={formData.teaching_type}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, teaching_type: value }))}
            placeholder={t('selectTeachingType')}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('teacherStatus')}
          </label>
          <Dropdown
            options={[{ value: '', label: t('selectTeacherStatus') }, ...teacherStatusOptions]}
            value={formData.teacher_status}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, teacher_status: value }))}
            placeholder={t('selectTeacherStatus')}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('subjects')}
          </label>
          <MultiSelectDropdown
            options={subjectOptions}
            values={formData.subject}
            onValuesChange={(value) => setFormData((prev) => ({ ...prev, subject: value }))}
            placeholder={t('selectSubjects')}
            maxHeight="max-h-[200px]"
            className="w-full"
          />
        </div>
      </div>

      {/* Training Information Subsection */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h4 className="text-base font-medium text-gray-900 mb-4">{t('trainingInformation')}</h4>
        <div className="grid grid-cols-1 gap-3 lg:gap-6 lg:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('educationLevel')}
            </label>
            <Dropdown
              options={[{ value: '', label: t('selectEducationLevel') }, ...educationLevelOptions]}
              value={formData.education_level}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, education_level: value }))}
              placeholder={t('selectEducationLevel')}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('trainingType')}
            </label>
            <Dropdown
              options={[{ value: '', label: t('selectTrainingType') }, ...trainingTypeOptions]}
              value={formData.training_type}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, training_type: value }))}
              placeholder={t('selectTrainingType')}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Family Information Card Sub-component
 */
function FamilyInformationCard({
  formData,
  setFormData,
  maritalStatusOptions,
  spouseJobOptions,
  t,
}) {
  return (
    <div className="bg-white rounded-md border border-gray-200 p-6">
      <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">{t('familyInformation')}</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:gap-6 lg:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('maritalStatus')}
          </label>
          <Dropdown
            options={[{ value: '', label: t('selectMaritalStatus') }, ...maritalStatusOptions]}
            value={formData.teacher_family.living_status}
            onValueChange={(value) => {
              setFormData((prev) => {
                let nextTeacherFamily = {
                  ...prev.teacher_family,
                  living_status: value,
                };

                // Single: clear spouse info and children
                if (value === 'នៅលីវ') {
                  nextTeacherFamily = {
                    living_status: value,
                    spouse_info: {
                      spouse_name: '',
                      spouse_occupation: '',
                      spouse_place_of_birth: '',
                      spouse_phone: '',
                    },
                    number_of_children: '',
                    children: [],
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
                      spouse_phone: '',
                    },
                    number_of_children: prev.teacher_family?.number_of_children || '',
                    children: Array.isArray(prev.teacher_family?.children) ? prev.teacher_family.children : [],
                  };
                }

                // Married: keep spouse/children data
                if (value === 'រៀបការ') {
                  nextTeacherFamily = {
                    ...prev.teacher_family,
                    living_status: value,
                  };
                }

                return {
                  ...prev,
                  teacher_family: nextTeacherFamily,
                };
              });
            }}
            placeholder={t('selectMaritalStatus')}
            className="w-full"
          />
        </div>

        {/* Spouse Information - Show only if married */}
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
                  setFormData((prev) => ({
                    ...prev,
                    teacher_family: {
                      ...prev.teacher_family,
                      spouse_info: {
                        ...prev.teacher_family.spouse_info,
                        spouse_name: e.target.value,
                      },
                    },
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
                options={[{ value: '', label: t('selectSpouseJob') }, ...spouseJobOptions]}
                value={formData.teacher_family.spouse_info.spouse_occupation}
                onValueChange={(value) => {
                  setFormData((prev) => ({
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
                placeholder={t('selectSpouseJob')}
                className="w-full"
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
                  setFormData((prev) => ({
                    ...prev,
                    teacher_family: {
                      ...prev.teacher_family,
                      spouse_info: {
                        ...prev.teacher_family.spouse_info,
                        spouse_phone: e.target.value,
                      },
                    },
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
                  setFormData((prev) => ({
                    ...prev,
                    teacher_family: {
                      ...prev.teacher_family,
                      spouse_info: {
                        ...prev.teacher_family.spouse_info,
                        spouse_place_of_birth: e.target.value,
                      },
                    },
                  }));
                }}
                placeholder={t('enterPlaceOfBirth')}
              />
            </div>
          </>
        )}

        {/* Number of Children - Show when not single */}
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
                setFormData((prev) => ({
                  ...prev,
                  teacher_family: {
                    ...prev.teacher_family,
                    number_of_children: e.target.value,
                  },
                }));
              }}
              placeholder={t('enterNumber')}
            />
          </div>
        )}
      </div>

      {/* Children List */}
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
                        setFormData((prev) => {
                          const newChildren = [...prev.teacher_family.children];
                          if (!newChildren[index]) {
                            newChildren[index] = { child_name: '' };
                          }
                          newChildren[index].child_name = e.target.value;
                          return {
                            ...prev,
                            teacher_family: {
                              ...prev.teacher_family,
                              children: newChildren,
                            },
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
                      setFormData((prev) => {
                        const prevCount = parseInt(prev.teacher_family.number_of_children) || 0;
                        const newChildren = (prev.teacher_family.children || []).filter((_, i) => i !== index);
                        const newCount = Math.max(0, prevCount - 1);
                        return {
                          ...prev,
                          teacher_family: {
                            ...prev.teacher_family,
                            number_of_children: newCount ? String(newCount) : '',
                            children: newChildren,
                          },
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
  );
}
