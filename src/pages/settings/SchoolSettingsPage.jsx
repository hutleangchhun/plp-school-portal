import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useLocationData } from '../../hooks/useLocationData';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import Dropdown from '../../components/ui/Dropdown';
import { schoolService } from '../../utils/api/services/schoolService';
import { getSchoolProfileUrl } from '../../utils/api/config';
import SchoolLocationMap from '../../components/ui/SchoolLocationMap';

/**
 * SchoolSettingsPage Component
 * Allows school administrators to update school information
 */
export default function SchoolSettingsPage({ user }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { error, handleError, clearError, retry } = useErrorHandler();

  // Initialize location data hook
  const {
    provinces,
    districts,
    communes,
    villages,
    loadingProvinces,
    loadingDistricts,
    loadingCommunes,
    loadingVillages,
    selectedProvince,
    selectedDistrict,
    selectedCommune,
    selectedVillage,
    handleProvinceChange,
    handleDistrictChange,
    handleCommuneChange,
    handleVillageChange,
    getProvinceOptions,
    getDistrictOptions,
    getCommuneOptions,
    getVillageOptions,
    setInitialValues,
    resetSelections
  } = useLocationData();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [schoolData, setSchoolData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    profile: '',
    status: 'ACTIVE',
    schoolType: '',
    projectTypeId: '',
    gpsLatitude: '',
    gpsLongitude: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageError, setImageError] = useState(false);

  // Project types state (location cascade state is now managed by useLocationData hook)
  const [projectTypes, setProjectTypes] = useState([]);

  const schoolId = user?.teacher?.schoolId || user?.school_id || user?.schoolId;

  // Construct full image URL from relative path
  const getFullImageUrl = useCallback((relativePath) => {
    if (!relativePath) return null;

    // If it's already a full URL, return as is
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath;
    }

    // If it's a data URL (from file selection preview), return as is
    if (relativePath.startsWith('data:')) {
      return relativePath;
    }

    // Use the config function to construct the school profile URL
    return getSchoolProfileUrl(relativePath);
  }, []);

  // Fetch school data
  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        setLoading(true);
        clearError();

        const response = await schoolService.getSchoolById(schoolId);

        if (response?.success && response.data) {
          setSchoolData(response.data);
          const placeData = response.data.place || {};
          const newFormData = {
            name: response.data.name || '',
            code: response.data.code || '',
            profile: response.data.profile || '',
            status: response.data.status || 'ACTIVE',
            schoolType: response.data.schoolType || response.data.school_type || '',
            projectTypeId: response.data.projectTypeId ? String(response.data.projectTypeId) : '',
            gpsLatitude: placeData.gpsLatitude !== undefined && placeData.gpsLatitude !== null ? String(placeData.gpsLatitude) : '',
            gpsLongitude: placeData.gpsLongitude !== undefined && placeData.gpsLongitude !== null ? String(placeData.gpsLongitude) : ''
          };
          console.log('📍 School location data from place object:', placeData);
          console.log('📍 Form data set:', newFormData);
          console.log('📍 Project type ID:', newFormData.projectTypeId);
          setFormData(newFormData);

          // Initialize location dropdowns using the hook's setInitialValues
          if (placeData.provinceId) {
            setInitialValues({
              provinceId: placeData.provinceId,
              districtId: placeData.districtId || '',
              communeId: placeData.communeId || '',
              villageId: placeData.villageId || ''
            });
          }

          if (response.data.profile) {
            // Store the full image URL
            const fullImageUrl = getFullImageUrl(response.data.profile);
            setPreviewUrl(fullImageUrl);
            console.log('🖼️ School profile image URL:', fullImageUrl);
          }
        } else {
          handleError(new Error(t('errorFetchingSchoolData') || 'Failed to fetch school data'));
        }
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    };

    if (schoolId) {
      fetchSchoolData();
    } else {
      // If no schoolId, stop loading
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);



  // Fetch school project types on mount
  useEffect(() => {
    const fetchProjectTypes = async () => {
      try {
        const response = await schoolService.getSchoolProjectTypes();
        console.log('🏫 Project types fetched:', response?.data || response);
        if (response?.success && Array.isArray(response.data)) {
          setProjectTypes(response.data);
        } else if (Array.isArray(response?.data)) {
          setProjectTypes(response.data);
        } else {
          setProjectTypes([]);
        }
      } catch (err) {
        console.error('Error fetching project types:', err);
        setProjectTypes([]);
      }
    };
    fetchProjectTypes();
  }, []);

  // Try to get user's current location once to prefill GPS if school has no GPS yet
  useEffect(() => {
    if (formData.gpsLatitude || formData.gpsLongitude) {
      // Already have GPS (from backend or user input), don't overwrite
      return;
    }

    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords || {};
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          return;
        }
        setFormData(prev => ({
          ...prev,
          gpsLatitude: prev.gpsLatitude || String(latitude),
          gpsLongitude: prev.gpsLongitude || String(longitude)
        }));
      },
      (error) => {
        console.warn('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [formData.gpsLatitude, formData.gpsLongitude]);



  // Handle profile image selection
  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      setImageError(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.onerror = () => {
        console.error('Error reading file');
        setImageError(true);
        showError(t('errorReadingImage') || 'Error reading image file');
      };
      reader.readAsDataURL(file);
    }
  }, [showError, t]);

  // Handle image load error
  const handleImageLoadError = useCallback(() => {
    console.error('Error loading school profile image');
    setImageError(true);
  }, []);

  // Handle form input changes
  const handleInputChange = useCallback((e) => {
    if (!isEditMode || submitting) return;
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, [isEditMode, submitting]);

  // Wrapper handlers for location changes (hook manages cascade automatically)
  const handleProvinceChangeWrapper = useCallback((value) => {
    if (!isEditMode || submitting) return;
    console.log('📍 Province selected:', value);
    handleProvinceChange(value);
  }, [isEditMode, submitting, handleProvinceChange]);

  const handleDistrictChangeWrapper = useCallback((value) => {
    if (!isEditMode || submitting) return;
    console.log('📍 District selected:', value);
    handleDistrictChange(value);
  }, [isEditMode, submitting, handleDistrictChange]);

  const handleCommuneChangeWrapper = useCallback((value) => {
    if (!isEditMode || submitting) return;
    console.log('📍 Commune selected:', value);
    handleCommuneChange(value);
  }, [isEditMode, submitting, handleCommuneChange]);

  const handleVillageChangeWrapper = useCallback((value) => {
    if (!isEditMode || submitting) return;
    console.log('📍 Village selected:', value);
    handleVillageChange(value);
  }, [isEditMode, submitting, handleVillageChange]);

  // Handle school type selection
  const handleSchoolTypeChange = useCallback((value) => {
    if (!isEditMode || submitting) return;
    console.log('🏢 School type selected:', value);
    setFormData(prev => ({
      ...prev,
      schoolType: value
    }));
  }, [isEditMode, submitting]);

  // Handle project type selection
  const handleProjectTypeChange = useCallback((value) => {
    if (!isEditMode || submitting) return;
    console.log('🏫 Project type selected:', value);
    setFormData(prev => ({
      ...prev,
      projectTypeId: value
    }));
  }, [isEditMode, submitting]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Do not submit if not in edit mode
    if (!isEditMode) {
      return;
    }

    if (!formData.name.trim()) {
      showError(t('schoolNameRequired') || 'School name is required');
      return;
    }

    if (!formData.code.trim()) {
      showError(t('schoolCodeRequired') || 'School code is required');
      return;
    }

    try {
      setSubmitting(true);

      // Build the JSON payload for the API
      const payload = {
        name: formData.name,
        code: formData.code,
        status: formData.status
      };

      // Add school type if selected
      if (formData.schoolType) {
        payload.schoolType = formData.schoolType;
      }

      // Add project type if selected
      if (formData.projectTypeId) {
        payload.projectTypeId = parseInt(formData.projectTypeId);
      }

      // Helper function to normalize location data
      const normalizeLocation = (loc) => {
        if (!loc) return undefined;
        const normalized = {};
        if (loc.provinceId) normalized.provinceId = parseInt(loc.provinceId);
        if (loc.districtId) normalized.districtId = parseInt(loc.districtId);
        if (loc.communeId) normalized.communeId = parseInt(loc.communeId);
        if (loc.villageId) normalized.villageId = parseInt(loc.villageId);
        return Object.keys(normalized).length > 0 ? normalized : undefined;
      };

      // Add location data in nested place object format (as expected by API)
      // Use hook's selected values (which are numeric IDs)
      payload.place = normalizeLocation({
        provinceId: selectedProvince,
        districtId: selectedDistrict,
        communeId: selectedCommune,
        villageId: selectedVillage,
        gpsLatitude: formData.gpsLatitude ? parseFloat(formData.gpsLatitude) : undefined,
        gpsLongitude: formData.gpsLongitude ? parseFloat(formData.gpsLongitude) : undefined
      });

      // Step 1: Upload profile image if provided (separate POST request)
      if (profileImage) {
        console.log('📸 Uploading school profile image...');
        const imageResponse = await schoolService.uploadSchoolProfileImage(schoolId, profileImage);
        if (!imageResponse?.success) {
          showError(imageResponse?.error || 'Failed to upload school profile image');
          return;
        }
        console.log('📸 Profile image uploaded successfully');
      }

      // Step 2: Update school data (JSON payload)
      console.log('📤 Submitting school update with payload:', {
        schoolType: payload.schoolType,
        projectTypeId: payload.projectTypeId,
        place: payload.place
      });
      const response = await schoolService.updateSchool(schoolId, payload);

      if (response?.success) {
        showSuccess(t('schoolDataUpdated') || 'School data updated successfully');

        // Re-fetch school data to get complete updated information including place object
        const refetchResponse = await schoolService.getSchoolById(schoolId);
        if (refetchResponse?.success && refetchResponse.data) {
          setSchoolData(refetchResponse.data);
          console.log('📍 School data refetched after update:', refetchResponse.data);
        } else {
          // If refetch fails, use the update response
          setSchoolData(response.data);
        }
        setProfileImage(null);
      } else {
        showError(response?.error || t('errorUpdatingSchool') || 'Failed to update school');
      }
    } catch (err) {
      console.error('School update error:', err);
      showError(t('errorUpdatingSchool') || 'Failed to update school data');
    } finally {
      setSubmitting(false);
    }
  }, [formData, profileImage, schoolId, showSuccess, showError, t, isEditMode, selectedProvince, selectedDistrict, selectedCommune, selectedVillage]);

  if (loading && !schoolData) {
    return <PageLoader />;
  }

  return (
    <PageTransition className="flex-1 p-6">
      <div className="mx-auto">
        {/* Header */}
        <FadeInSection className="mb-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-200 rounded-sm transition-colors"
              title={t('back') || 'Back'}
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('schoolSettings') || 'School Settings'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {t('updateSchoolInformation') || 'Update your school information'}
              </p>
            </div>
          </div>
        </FadeInSection>

        {/* Error Display */}
        {error && (
          <FadeInSection className="mb-6">
            <ErrorDisplay
              error={error}
              onRetry={retry}
              onDismiss={clearError}
            />
          </FadeInSection>
        )}

        {/* School Settings Form */}
        <FadeInSection className="bg-white rounded-sm border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Two Column Layout: Image Left, Data Right */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* LEFT COLUMN: Profile Image */}
              <div className="lg:col-span-1 lg:max-w-xs">
                <label className="block text-sm font-medium text-gray-900 mb-4">
                  {t('schoolProfile') || 'School Profile Image'}
                </label>
                <div className="space-y-4">
                  {/* Preview - Clickable */}
                  <div>
                    <div
                      className="group relative"
                      onClick={() => {
                        if (!isEditMode || submitting) return;
                        document.getElementById('profileImageInput')?.click();
                      }}
                    >
                      {imageError ? (
                        <div className="w-full aspect-square rounded-sm bg-red-50 border-2 border-red-300 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                          <div className="text-center">
                            <span className="text-xs text-red-600 font-medium block">
                              {t('imageLoadFailed') || 'Image failed to load'}
                            </span>
                            <span className="text-xs text-red-500 block mt-1">
                              {t('clickToTryAgain') || 'Click to retry'}
                            </span>
                          </div>
                        </div>
                      ) : previewUrl ? (
                        <div className="relative">
                          <img
                            src={previewUrl}
                            alt="School profile"
                            className="w-full aspect-square rounded-sm object-cover border border-gray-200 group-hover:opacity-75 transition-opacity bg-white"
                            onError={handleImageLoadError}
                          />
                          <div className="absolute inset-0 rounded-sm bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="text-white text-xs font-medium">{t('clickToChan', 'Click to change')}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full aspect-square rounded-sm bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center group-hover:bg-gray-50 transition-colors">
                          <span className="text-xs text-gray-500 text-center px-2">
                            {t('clickToUpload') || 'Click to upload image'}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {t('imageSizeLimit') || 'Max 5MB'}
                    </p>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    id="profileImageInput"
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={!isEditMode || submitting}
                  />

                  {/* File Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-sm p-3">
                    <p className="text-xs font-medium text-blue-900 mb-2">
                      {t('supportedFormats') || 'Supported Formats'}
                    </p>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• JPG / JPEG</li>
                      <li>• PNG</li>
                    </ul>
                    <p className="text-xs text-blue-800 mt-2 pt-2 border-t border-blue-200">
                      <span className="font-medium">{t('maxSize') || 'Maximum size'}: </span>
                      5MB
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: School Data */}
              <div className="lg:col-span-4 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    {t('basicInformation') || 'Basic Information'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* School Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                        {t('schoolName') || 'School Name'} <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={!isEditMode || submitting}
                        className="w-full px-4 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder={t('enterSchoolName') || 'Enter school name'}
                      />
                    </div>

                    {/* School Code */}
                    <div>
                      <label htmlFor="code" className="block text-sm font-medium text-gray-900 mb-2">
                        {t('schoolCode') || 'School Code'} <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        id="code"
                        name="code"
                        value={formData.code}
                        onChange={handleInputChange}
                        disabled={true}
                        className="w-full px-4 py-2 border text-sm border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder={t('enterSchoolCode') || 'Enter school code'}
                      />
                    </div>

                    {/* School Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t('schoolType') || 'School Type'}
                      </label>
                      <Dropdown
                        value={formData.schoolType}
                        onValueChange={handleSchoolTypeChange}
                        options={[
                          { value: 'សាលារដ្ឋ', label: 'សាលារដ្ឋ (State/Public)' },
                          { value: 'សាលាឯកជន', label: 'សាលាឯកជន (Private)' },
                          { value: 'សាលាអង្គការ', label: 'សាលាអង្គការ (NGO)' }
                        ]}
                        placeholder={t('selectSchoolType') || 'Select School Type'}
                        disabled={submitting}
                        className={`w-full ${!isEditMode ? 'pointer-events-none opacity-80' : ''}`}
                        maxHeight="max-h-60"
                      />
                    </div>

                    {/* Project Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t('projectType') || 'Project Type'}
                      </label>
                      <Dropdown
                        value={formData.projectTypeId}
                        onValueChange={handleProjectTypeChange}
                        options={projectTypes.map(type => ({
                          value: String(type.id),
                          label: type.name || type.description
                        }))}
                        placeholder={t('selectProjectType') || 'Select Project Type'}
                        disabled={submitting}
                        className={`w-full ${!isEditMode ? 'pointer-events-none opacity-80' : ''}`}
                        maxHeight="max-h-60"
                      />
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    {t('location') || 'Location Information'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Province */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t('province') || 'Province'}
                      </label>
                      <Dropdown
                        value={selectedProvince}
                        onValueChange={handleProvinceChangeWrapper}
                        options={getProvinceOptions().map(prov => ({
                          value: prov.value,
                          label: prov.label
                        }))}
                        placeholder={t('selectProvince') || 'Select Province'}
                        disabled={submitting}
                        className={`w-full ${!isEditMode ? 'pointer-events-none opacity-80' : ''}`}
                        maxHeight="max-h-60"
                      />
                    </div>

                    {/* District */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t('district') || 'District'}
                      </label>
                      <Dropdown
                        value={selectedDistrict}
                        onValueChange={handleDistrictChangeWrapper}
                        options={getDistrictOptions().map(dist => ({
                          value: dist.value,
                          label: dist.label
                        }))}
                        placeholder={t('selectDistrict') || 'Select District'}
                        disabled={!isEditMode || submitting || !selectedProvince}
                        className={`w-full ${!isEditMode ? 'pointer-events-none opacity-80' : ''}`}
                        maxHeight="max-h-60"
                      />
                    </div>

                    {/* Commune */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t('commune') || 'Commune'}
                      </label>
                      <Dropdown
                        value={selectedCommune}
                        onValueChange={handleCommuneChangeWrapper}
                        options={getCommuneOptions().map(comm => ({
                          value: comm.value,
                          label: comm.label
                        }))}
                        placeholder={t('selectCommune') || 'Select Commune'}
                        disabled={!isEditMode || submitting || !selectedDistrict}
                        className={`w-full ${!isEditMode ? 'pointer-events-none opacity-80' : ''}`}
                        maxHeight="max-h-60"
                      />
                    </div>
                    {/* GPS Latitude */}
                    <div>
                      <label htmlFor="gpsLatitude" className="block text-sm font-medium text-gray-900 mb-2">
                        {t('gpsLatitude', 'GPS Latitude')}
                      </label>
                      <input
                        type="text"
                        id="gpsLatitude"
                        name="gpsLatitude"
                        value={formData.gpsLatitude}
                        onChange={handleInputChange}
                        disabled={!isEditMode || submitting}
                        className="w-full px-4 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder="11.5678901"
                      />
                    </div>

                    {/* GPS Longitude */}
                    <div>
                      <label htmlFor="gpsLongitude" className="block text-sm font-medium text-gray-900 mb-2">
                        {t('gpsLongitude', 'GPS Longitude')}
                      </label>
                      <input
                        type="text"
                        id="gpsLongitude"
                        name="gpsLongitude"
                        value={formData.gpsLongitude}
                        onChange={handleInputChange}
                        disabled={!isEditMode || submitting}
                        className="w-full px-4 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder="104.9123456"
                      />
                    </div>
                  </div>
                  {/* Interactive Map Picker */}
                  <div className="mt-4">
                    <h4 className="text-xs font-medium text-gray-700 mb-2">
                      {t('mapPicker', 'Click on the map to set GPS coordinates')}
                    </h4>
                    <SchoolLocationMap
                      latitude={formData.gpsLatitude ? parseFloat(formData.gpsLatitude) : undefined}
                      longitude={formData.gpsLongitude ? parseFloat(formData.gpsLongitude) : undefined}
                      onChange={(!isEditMode || submitting)
                        ? undefined
                        : (lat, lng) => {
                          setFormData(prev => ({
                            ...prev,
                            gpsLatitude: String(lat),
                            gpsLongitude: String(lng)
                          }));
                        }}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      {t('mapPickerHint', 'Click anywhere on the map to update the GPS latitude and longitude fields above.')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer actions: Edit in view mode, Cancel + Save in edit mode */}
            <div className="flex justify-end gap-3 pt-6 pb-12 border-t border-gray-200">
              {!isEditMode ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditMode(true)}
                  disabled={submitting}
                  size="sm"
                >
                  {t('edit', 'Edit')}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditMode(false)}
                    disabled={submitting}
                    size="sm"
                  >
                    {t('cancel', 'Cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    variant="primary"
                    size="sm"
                  >
                    {submitting ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        {t('saving') || 'Saving...'}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1" />
                        {t('save') || 'Save Changes'}
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </form>
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
