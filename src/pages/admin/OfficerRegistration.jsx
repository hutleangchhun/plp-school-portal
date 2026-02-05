import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { PageLoader } from '../../components/ui/DynamicLoader';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import locationService from '../../utils/api/services/locationService';
import { userService } from '../../utils/api/services/userService'; // Import userService
import { nationalityOptionsProfile } from '../../utils/formOptions';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import Dropdown from '@/components/ui/Dropdown';
import { DatePickerWithDropdowns } from '@/components/ui/date-picker-with-dropdowns';
import { UserPlus, Loader2, Wand2, Eye, EyeOff, Check, X, Lock, Mail, User } from 'lucide-react'; // Add icons
import { isValidUsername, isValidEmail, validatePassword } from '../../utils/validation';
import ValidationSummary from '../../components/ui/ValidationSummary';

const OfficerRegistration = () => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { error, handleError, clearError } = useErrorHandler();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showValidation, setShowValidation] = useState(false);

  // Track touched fields for inline validation
  const [touched, setTouched] = useState({});

  // Role Selection State
  // Values: 'provincial', 'district', 'commune'
  const [selectedRole, setSelectedRole] = useState('provincial');

  // Location data
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [communes, setCommunes] = useState([]);


  // Form states
  const initialFormState = {
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    dateOfBirth: null,
    gender: '',
    phone: '',
    nationality: 'ខ្មែរ',
    position: '',
    department: 'Ministry of Education',
    provinceIds: [], // Array of IDs
    districtIds: [], // Array of IDs
    communeIds: [], // Array of IDs
  };

  const [formData, setFormData] = useState(initialFormState);

  // Availability & Suggestions State
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [showUsernameSuggestions, setShowUsernameSuggestions] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Refs for debouncing and click outside
  const usernameDebounceRef = useRef(null);
  const emailDebounceRef = useRef(null);
  const usernameContainerRef = useRef(null);

  useEffect(() => {
    const initData = async () => {
      try {
        setInitializing(true);
        const response = await locationService.getProvinces();

        let provincesData = [];
        if (Array.isArray(response)) {
          provincesData = response;
        } else if (response?.data && Array.isArray(response.data)) {
          provincesData = response.data;
        } else if (response?.data?.data && Array.isArray(response.data.data)) {
          provincesData = response.data.data;
        }

        setProvinces(provincesData);
      } catch (err) {
        handleError(err);
      } finally {
        setInitializing(false);
      }
    };
    initData();
  }, [handleError]);

  // Close username suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (usernameContainerRef.current && !usernameContainerRef.current.contains(event.target)) {
        setShowUsernameSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleRoleChange = (value) => {
    setSelectedRole(value);
    // Don't reset entire form data to preserve personal info
    // setFormData(initialFormState);

    // Only reset location data if moving to a role with LESS granularity? 
    // Or just keep it. Let's keep it but ensure options are refreshed if needed.

    // Reset location OPTIONS, but we might want to refetch them immediately 
    // if provinces are already selected.
    setDistricts([]);
    setCommunes([]);

    // If we have provinces selected and we switch to District/Commune,
    // we should try to fetch districts.
    if (formData.provinceIds.length > 0 && (value === 'district' || value === 'commune')) {
      // We need to fetch districts. 
      // Note: fetchDistrictsForProvinces checks 'selectedRole'. 
      // Since setState is async, we can't rely on selectedRole being updated yet inside that function 
      // unless we modify it or use a useEffect.
      // For now, let's just trigger the fetch and handle the role check loosely or pass an override.
      fetchDistrictsForProvinces(formData.provinceIds, value);
    }

    // Don't reset availability
    // setUsernameAvailable(null);
    // setEmailAvailable(null);
    clearError();
    setShowValidation(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Username Availability Check
    if (name === 'username') {
      setUsernameAvailable(null); // Reset while typing
      if (usernameDebounceRef.current) {
        clearTimeout(usernameDebounceRef.current);
      }

      const trimmedValue = value.trim();
      if (trimmedValue && isValidUsername(trimmedValue)) {
        usernameDebounceRef.current = setTimeout(() => {
          handleGenerateUsernameSuggestions(trimmedValue);
        }, 500);
      }
    }

    // Email Availability Check
    if (name === 'email') {
      const trimmedEmail = value.trim();
      // If empty or invalid format, set null or false depending on preference. 
      // Here we just reset availability if empty. ValidationSummary handles format.
      if (!trimmedEmail) {
        setEmailAvailable(null);
      } else if (!isValidEmail(trimmedEmail)) {
        setEmailAvailable(false); // Invalid format implies not available for valid use
      } else {
        setEmailAvailable(null);
        if (emailDebounceRef.current) {
          clearTimeout(emailDebounceRef.current);
        }
        emailDebounceRef.current = setTimeout(async () => {
          try {
            const result = await userService.validateEmail(trimmedEmail);
            // result.exists is true if email is taken
            setEmailAvailable(!result.exists);
          } catch (err) {
            console.error('Error validating email:', err);
          }
        }, 500);
      }
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleGenerateUsernameSuggestions = async (baseFromInput) => {
    try {
      const baseUsername = baseFromInput || formData.username || 'officer';
      const response = await userService.generateUsername(baseUsername);

      let suggestions = [];
      if (Array.isArray(response?.suggestions)) {
        suggestions = response.suggestions;
      } else if (Array.isArray(response?.data)) {
        suggestions = response.data;
      } else if (response?.username) {
        suggestions = [response.username];
      }

      suggestions = suggestions.filter(Boolean).slice(0, 10);

      // Logic from TeacherEditModal: "available" boolean might be in response
      // If response.available is true, then the input username is available.
      const isAvailable = response?.available === true;

      // If the API says available and we strictly passed the current input, update status
      // Note: generateUsername might return suggestions even if available? 
      // Usually if available, suggestions might be empty or include the current one.

      setUsernameAvailable(isAvailable);
      setUsernameSuggestions(suggestions);
      // Only show suggestions if taken (not available) or explicit request
      if (!isAvailable && suggestions.length > 0) {
        setShowUsernameSuggestions(true);
      }
    } catch (err) {
      console.error("Error generating username suggestions", err);
      setUsernameAvailable(null); // convert to unknown on error
    }
  };

  const handleChooseUsernameSuggestion = (suggestion) => {
    setFormData(prev => ({ ...prev, username: suggestion }));
    setUsernameAvailable(true);
    setShowUsernameSuggestions(false);
    setTouched(prev => ({ ...prev, username: true })); // Mark as touched when selecting suggestion
  };


  const handleDateChange = (date) => {
    // Keep date object in state, format only when sending
    setFormData(prev => ({ ...prev, dateOfBirth: date }));
    setTouched(prev => ({ ...prev, dateOfBirth: true }));
  };

  const formatDateLocal = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleMultiSelectChange = (field, newValues) => {
    setFormData(prev => {
      // Side effects for location cascading
      if (field === 'provinceIds') {
        fetchDistrictsForProvinces(newValues);
      } else if (field === 'districtIds') {
        fetchCommunesOrSchools(newValues);
      }
      return { ...prev, [field]: newValues };
    });
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const fetchDistrictsForProvinces = async (provinceIds, roleOverride = null) => {
    if (!provinceIds.length) {
      setDistricts([]);
      setSchools([]);
      setCommunes([]);
      return;
    }

    // Role override for when state hasn't updated yet (e.g. handleRoleChange)
    const effectiveRole = roleOverride || selectedRole;

    // If "Provincial Officer", we don't need districts.
    if (effectiveRole === 'provincial') return;

    setLoading(true);
    try {
      // Fetch districts for each selected province
      // Fetch districts for each selected province and attach province_id
      const promises = provinceIds.map(async (id) => {
        const response = await locationService.getDistrictsByProvince(id);
        const fetchedDistricts = Array.isArray(response) ? response : (response.data || []);
        // Manually attach province_id to ensure it exists for subsequent lookups
        return fetchedDistricts.map(d => ({ ...d, province_id: id }));
      });

      const results = await Promise.all(promises);
      const allDistricts = results.flatMap(districts => districts);

      // Dedupe just in case
      const uniqueDistricts = [...new Map(allDistricts.map(item => [item.id, item])).values()];
      setDistricts(uniqueDistricts);

      // Clear downstream selections
      setFormData(prev => ({ ...prev, districtIds: [], communeIds: [] }));
      setCommunes([]);

    } catch (err) {
      console.error("Error fetching districts", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunesOrSchools = async (districtIds) => {
    if (!districtIds.length) {
      setCommunes([]);
      return;
    }

    setLoading(true);
    try {
      if (selectedRole === 'commune') {
        const promises = districtIds.map(dId => {
          const district = districts.find(d => String(d.id) === String(dId));
          if (district) {
            // Fix: district object might use province_id or provinceId. Check which one exists.
            const provinceId = district.province_id || district.provinceId || district.province?.id;
            return locationService.getCommunesByDistrict(provinceId, district.id);
          }
          return Promise.resolve([]);
        });

        const results = await Promise.all(promises);
        const allCommunes = results.flatMap(res => Array.isArray(res) ? res : (res.data || []));
        const uniqueCommunes = [...new Map(allCommunes.map(item => [item.id, item])).values()];
        setCommunes(uniqueCommunes);
        setFormData(prev => ({ ...prev, communeIds: [] }));
      }
    } catch (err) {
      console.error("Error fetching sub-location data", err);
    } finally {
      setLoading(false);
    }
  };

  const getValidationErrors = () => {
    const errorsList = [];

    // Username validation
    if (!formData.username) {
      errorsList.push({
        key: 'username',
        field: t('username', 'Username'),
        messages: [t('usernameRequiredMsg', 'Username is required')]
      });
    } else if (!isValidUsername(formData.username)) {
      errorsList.push({
        key: 'username',
        field: t('username', 'Username'),
        messages: [t('validationUsername', 'Username must be at least 3 characters')]
      });
    } else if (usernameAvailable === false) {
      errorsList.push({
        key: 'username',
        field: t('username', 'Username'),
        messages: [t('usernameNotAvailable', 'This username is already taken')]
      });
    }

    // First Name
    if (!formData.firstName) {
      errorsList.push({
        key: 'firstName',
        field: t('firstName', 'First Name'),
        messages: [t('firstNameRequiredMsg', 'First name is required')]
      });
    }

    // Last Name
    if (!formData.lastName) {
      errorsList.push({
        key: 'lastName',
        field: t('lastName', 'Last Name'),
        messages: [t('lastNameRequiredMsg', 'Last name is required')]
      });
    }

    // Password validation
    if (!formData.password) {
      errorsList.push({
        key: 'password',
        field: t('password', 'Password'),
        messages: [t('passwordMinLength', 'Password must be at least 8 characters')]
      });
    } else if (formData.password.length < 8) {
      errorsList.push({
        key: 'password',
        field: t('password', 'Password'),
        messages: [t('validationPassword', 'Password must be at least 8 characters')]
      });
    }

    // Date of Birth
    if (!formData.dateOfBirth) {
      errorsList.push({
        key: 'dateOfBirth',
        field: t('dateOfBirth', 'Date of Birth'),
        messages: [t('validationDateOfBirth', 'Date of birth is required')]
      });
    }

    // Gender
    if (!formData.gender) {
      errorsList.push({
        key: 'gender',
        field: t('gender', 'Gender'),
        messages: [t('genderRequired', 'Gender is required')]
      });
    }

    // Email (optional but if provided should be valid)
    if (formData.email && !isValidEmail(formData.email)) {
      errorsList.push({
        key: 'email',
        field: t('email', 'Email'),
        messages: [t('validEmailRequired', 'Please enter a valid email address')]
      });
    } else if (formData.email && emailAvailable === false) {
      errorsList.push({
        key: 'email',
        field: t('email', 'Email'),
        messages: [t('emailNotAvailable', 'This email is already in use')]
      });
    }

    return errorsList;
  };

  const validationErrorsList = getValidationErrors();
  const hasValidationErrors = validationErrorsList.length > 0;

  const getFieldError = (key) => {
    const error = validationErrorsList.find(err => err.key === key);
    return error ? error.messages[0] : null;
  };

  // Decide whether to show error for a field
  const shouldShowError = (field) => {
    return (touched[field] || showValidation) && getFieldError(field);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowValidation(true);
    if (hasValidationErrors) {
      showError(t('fixValidationErrors', 'Please fix validation errors'));
      return;
    }

    setLoading(true);
    clearError();

    try {
      // Construct payload
      // Format dateOfBirth to string YYYY-MM-DD
      const formattedDateOfBirth = formData.dateOfBirth ? formatDateLocal(formData.dateOfBirth) : '';
      const payload = {
        ...formData,
        dateOfBirth: formattedDateOfBirth,
        provinceIds: formData.provinceIds.map(Number),
        districtIds: formData.districtIds.map(Number),
        communeIds: formData.communeIds.map(Number)
      };

      // Clean up unneeded fields based on tab
      if (selectedRole === 'provincial') {
        delete payload.districtIds;
        delete payload.communeIds;
      } else if (selectedRole === 'district') {
        delete payload.communeIds;
      } else if (selectedRole === 'commune') {

      }

      // Map selectedRole to roleId
      let roleId = 4; // Default to provincial
      if (selectedRole === 'district') roleId = 5;
      else if (selectedRole === 'commune') roleId = 23;

      payload.roleId = roleId;

      const response = await userService.registerOfficer(selectedRole, payload);

      showSuccess(response.message || t('officerRegisteredSuccess', 'Officer registered successfully'));
      setFormData(initialFormState); // Reset form
      setUsernameAvailable(null);
      setEmailAvailable(null);
      setShowValidation(false);
      setTouched({});

    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Password Strength Visual helper
  const getPasswordStrength = (password) => {
    if (!password) return { level: 0, label: '', color: 'bg-gray-300' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { level: 1, label: t('weak', 'Weak'), color: 'bg-red-500' };
    if (strength <= 4) return { level: 2, label: t('medium', 'Medium'), color: 'bg-orange-500' };
    return { level: 3, label: t('strong', 'Strong'), color: 'bg-green-500' };
  };


  const inputClass = "w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  const roleOptions = [
    { value: 'provincial', label: t('provincialOfficerRole', 'Provincial Officer (Role 4)') },
    { value: 'district', label: t('districtOfficerRole', 'District Officer (Role 5)') },
    { value: 'commune', label: t('communeOfficerRole', 'Commune Officer (Role 23)') }
  ];

  if (initializing) {
    return <PageLoader message={t('loading', 'Loading...')} />;
  }

  return (
    <div className="bg-gray-50 space-y-6">
      <div className='p-3 sm:p-6 space-y-6'>
        <div className="flex px-3 justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('officerRegistration', 'Officer Registration')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('officerRegistrationDesc', 'Register new officers for Provincial, District, or Commune levels.')}</p>
          </div>
        </div>

        <div className="bg-white rounded-sm border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Common Fields Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">{t('sectionPersonalInformation', 'Personal Information')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('lastNameRequired', 'Last Name *')}</label>
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('lastName')}
                    className={`${inputClass} ${shouldShowError('lastName') ? "border-red-500" : ""}`}
                  />
                  {shouldShowError('lastName') && (
                    <p className="text-xs text-red-600 mt-1">{getFieldError('lastName')}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('firstNameRequired', 'First Name *')}</label>
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('firstName')}
                    className={`${inputClass} ${shouldShowError('firstName') ? "border-red-500" : ""}`}
                  />
                  {shouldShowError('firstName') && (
                    <p className="text-xs text-red-600 mt-1">{getFieldError('firstName')}</p>
                  )}
                </div>

                <div className='sm:col-span-2 md:col-span-3 lg:col-span-3 xl:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6'>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t('dateOfBirth', 'Date of Birth')} *</label>
                    <DatePickerWithDropdowns
                      value={formData.dateOfBirth}
                      onChange={handleDateChange}
                      className={`w-full h-10 border rounded-sm ${shouldShowError('dateOfBirth') ? "border-red-500" : "border-gray-300"}`}
                    />
                    {shouldShowError('dateOfBirth') && (
                      <p className="text-xs text-red-600 mt-1">{getFieldError('dateOfBirth')}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t('genderRequired', 'Gender *')}</label>
                    <Dropdown
                      value={formData.gender}
                      onValueChange={(val) => {
                        setFormData(prev => ({ ...prev, gender: val }));
                        setTouched(prev => ({ ...prev, gender: true }));
                      }}
                      options={[
                        { value: '', label: t('selectGender', 'Select Gender') },
                        { value: 'MALE', label: t('male', 'Male') },
                        { value: 'FEMALE', label: t('female', 'Female') },
                        { value: 'OTHER', label: t('other', 'Other') }
                      ]}
                      placeholder={t('selectGender', 'Select Gender')}
                      className={`w-full ${shouldShowError('gender') ? "border-red-500" : ""}`}
                    />
                    {shouldShowError('gender') && (
                      <p className="text-xs text-red-600 mt-1">{getFieldError('gender')}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t('nationality', 'Nationality')}</label>
                    <Dropdown
                      value={formData.nationality}
                      onValueChange={(val) => {
                        setFormData(prev => ({ ...prev, nationality: val }));
                        setTouched(prev => ({ ...prev, nationality: true }));
                      }}
                      options={nationalityOptionsProfile}
                      placeholder={t('selectNationality', 'Select Nationality')}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className='space-y-4'>
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">{t('accountInformation', 'Account Information')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <div className="space-y-2 relative" ref={usernameContainerRef}>
                  <label className="text-sm font-medium text-gray-700">{t('username', 'Username')}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('username')}
                      placeholder={t('username', 'Username')}
                      className={`pl-10 pr-16 ${inputClass} ${shouldShowError('username') || usernameAvailable === false
                        ? 'border-red-500 ring-1 ring-red-500'
                        : usernameAvailable === true
                          ? 'border-green-500 ring-1 ring-green-500'
                          : ''
                        }`}
                      autoComplete="off"
                    />
                    {/* Actions and Status Icons */}
                    {/* Actions and Status Icons */}
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
                      {/* Suggestion Button - Only show if not loading */}
                      {!loading && (
                        <button
                          type="button"
                          onClick={() => handleGenerateUsernameSuggestions(formData.username)}
                          className="text-gray-400 hover:text-blue-500 transition-colors focus:outline-none pointer-events-auto"
                          title={t('generateSuggestions', 'Generate Suggestions')}
                        >
                          <Wand2 className="h-4 w-4" />
                        </button>
                      )}

                      {/* Status Icons */}
                      <div className="flex items-center pointer-events-none">
                        {loading && formData.username && usernameAvailable === null && (
                          <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                        )}
                        {!loading && usernameAvailable === true && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                        {!loading && usernameAvailable === false && (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Validation Error */}
                  {shouldShowError('username') && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <X className="h-3 w-3" /> {getFieldError('username')}
                    </p>
                  )}

                  {/* Availability Status */}
                  {!getFieldError('username') && usernameAvailable === true && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3" /> {t('usernameAvailable', 'Username is available')}
                    </p>
                  )}
                  {!getFieldError('username') && usernameAvailable === false && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <X className="h-3 w-3" /> {t('usernameTaken', 'Username is already taken')}
                    </p>
                  )}

                  {/* Suggestions Dropdown */}
                  {showUsernameSuggestions && usernameSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div className="p-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">{t('suggestedUsernames', 'Suggested Usernames')}</span>
                        <Wand2 className="h-3 w-3 text-blue-500" />
                      </div>
                      <ul className="py-1">
                        {usernameSuggestions.map((suggestion, index) => (
                          <li
                            key={index}
                            onClick={() => handleChooseUsernameSuggestion(suggestion)}
                            className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer flex items-center justify-between group"
                          >
                            <span>{suggestion}</span>
                            <span className="opacity-0 group-hover:opacity-100 text-blue-500 text-xs">{t('select', 'Select')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {/* Password with Strength & Visibility */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('password', 'Password')} *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('password')}
                      placeholder={t('passwordMinLength', 'Password')}
                      className={`pl-10 pr-10 ${inputClass} ${shouldShowError('password') ? "border-red-500" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-10"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {shouldShowError('password') && (
                    <p className="text-xs text-red-600 mt-1">{getFieldError('password')}</p>
                  )}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{t('passwordStrength', 'Strength')}</span>
                        <span className={`text-xs font-medium ${getPasswordStrength(formData.password).color.replace('bg-', 'text-')}`}>
                          {getPasswordStrength(formData.password).label}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${getPasswordStrength(formData.password).color}`}
                          style={{ width: `${Math.min((formData.password.length / 10) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {/* Email with Availability */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('email', 'Email')}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('email')}
                      placeholder="officer@moeys.gov.kh"
                      className={`pl-10 ${inputClass} ${shouldShowError('email') || emailAvailable === false ? 'border-red-500 ring-1 ring-red-500' :
                        emailAvailable === true ? 'border-green-500 ring-1 ring-green-500' : ''
                        }`}
                    />
                  </div>

                  {/* Inline Error */}
                  {shouldShowError('email') && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <X className="h-3 w-3" /> {getFieldError('email')}
                    </p>
                  )}

                  {/* Available Status */}
                  {!getFieldError('email') && emailAvailable === true && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> {t('emailAvailable', 'Email is available')}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('phone', 'Phone')}</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('phone')}
                    placeholder={t('validPhoneRequired', 'Phone')}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Role Specific Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">{t('roleAndLocation', 'Role & Location')}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 block mb-2">{t('selectOfficerRole', 'Select Officer Role')} *</label>
                  <Dropdown
                    value={selectedRole}
                    onValueChange={handleRoleChange}
                    options={roleOptions}
                    placeholder={t('selectRole', 'Select Role')}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('position', 'Position')}</label>
                  <input
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    placeholder="e.g. Chief Officer"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('department', 'Department')}</label>
                  <input
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder={t('primaryEducationDepartment', 'Primary Education Department')}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Location Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                {/* Province - Always Visible */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('provinces', 'Provinces')}</label>
                  <MultiSelectDropdown
                    values={formData.provinceIds}
                    onValuesChange={(val) => handleMultiSelectChange('provinceIds', val)}
                    options={provinces.map(p => ({
                      value: String(p.id),
                      label: p.province_name_en || p.name || p.provinceNameKh || `Province ${p.id}`
                    }))}
                    placeholder={t('selectProvinces', 'Select Provinces')}
                    className="w-full"
                  />
                </div>

                {/* District - Visible for District & Commune */}
                {(selectedRole === 'district' || selectedRole === 'commune') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t('districts', 'Districts')}</label>
                    <MultiSelectDropdown
                      values={formData.districtIds}
                      onValuesChange={(val) => handleMultiSelectChange('districtIds', val)}
                      options={districts.map(d => ({
                        value: String(d.id),
                        label: d.district_name_en || d.name || d.districtNameKh || `District ${d.id}`
                      }))}
                      placeholder={t('selectDistricts', 'Select Districts')}
                      className="w-full"
                      disabled={!formData.provinceIds.length}
                    />
                  </div>
                )}
                {/* Commune - Visible for Commune only */}
                {selectedRole === 'commune' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t('communes', 'Communes')}</label>
                    <MultiSelectDropdown
                      values={formData.communeIds}
                      onValuesChange={(val) => handleMultiSelectChange('communeIds', val)}
                      options={communes.map(c => ({
                        value: String(c.id),
                        label: c.commune_name_en || c.name || c.communeNameKh || `Commune ${c.id}`
                      }))}
                      placeholder={t('selectCommunes', 'Select Communes')}
                      className="w-full"
                      disabled={!formData.districtIds.length}
                    />
                  </div>
                )}
                {hasValidationErrors && showValidation && (
                  <div className="mb-6">
                    <ValidationSummary errors={validationErrorsList} t={t} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-start">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={loading || hasValidationErrors}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('registering', 'Registering...')}
                  </>
                ) : (
                  <>
                    {t('registerOfficer', 'Register Officer')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OfficerRegistration;
