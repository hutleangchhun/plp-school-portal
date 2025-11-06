import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import Dropdown from '../../components/ui/Dropdown';
import { schoolService } from '../../utils/api/services/schoolService';
import locationService from '../../utils/api/services/locationService';
import { getStaticAssetBaseUrl } from '../../utils/api/config';

/**
 * SchoolSettingsPage Component
 * Allows school administrators to update school information
 */
export default function SchoolSettingsPage({ user }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { error, handleError, clearError, retry } = useErrorHandler();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schoolData, setSchoolData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    profile: '',
    status: 'ACTIVE',
    schoolType: '',
    projectTypeId: '',
    province_id: '',
    district_code: '',
    district_id: '', // Store numeric ID for API submission
    commune_code: '',
    commune_id: '', // Store numeric ID for API submission
    village_code: '',
    village_id: '' // Store numeric ID for API submission
  });
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageError, setImageError] = useState(false);

  // Location cascade state
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [villages, setVillages] = useState([]);
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

    // Construct full URL from relative path
    // Backend serves static files from /uploads/ directory at the server root
    const baseUrl = getStaticAssetBaseUrl();
    return `${baseUrl}/uploads/${relativePath}`;
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
            // Extract location data from nested place object
            province_id: placeData.provinceId ? String(placeData.provinceId) : '',
            district_code: (placeData.district_code || placeData.districtCode) ? String(placeData.district_code || placeData.districtCode) : '',
            district_id: placeData.districtId ? String(placeData.districtId) : '',
            commune_code: (placeData.commune_code || placeData.communeCode) ? String(placeData.commune_code || placeData.communeCode) : '',
            commune_id: placeData.communeId ? String(placeData.communeId) : '',
            village_code: (placeData.village_code || placeData.villageCode) ? String(placeData.village_code || placeData.villageCode) : '',
            village_id: placeData.villageId ? String(placeData.villageId) : ''
          };
          console.log('📍 School location data from place object:', placeData);
          console.log('📍 Form data set:', newFormData);
          console.log('📍 Project type ID:', newFormData.projectTypeId);
          setFormData(newFormData);
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

  // Load districts, communes, and villages when school data is loaded with location data
  useEffect(() => {
    const loadLocationCascade = async () => {
      const provinceId = schoolData?.place?.provinceId;

      if (!provinceId) {
        console.log('⚠️ No provinceId found in school data');
        setDistricts([]);
        setCommunes([]);
        return;
      }

      try {
        console.log('📍 Loading location cascade for province:', provinceId);

        // Fetch districts for the current province
        const distResponse = await locationService.getDistrictsByProvince(provinceId);
        console.log('📍 Districts fetched:', distResponse?.data || distResponse);
        setDistricts(distResponse?.data || distResponse || []);

        const districtCode = schoolData?.place?.district_code;
        if (districtCode) {
          // Fetch communes for the current district
          const commResponse = await locationService.getCommunesByDistrict(provinceId, districtCode);
          setCommunes(commResponse?.data || commResponse || []);
        } else {
          setCommunes([]);
        }
      } catch (err) {
        console.error('Error loading location cascade:', err);
        setDistricts([]);
        setCommunes([]);
      }
    };

    if (schoolData?.place) {
      loadLocationCascade();
    }
  }, [schoolData?.place]);

  // Fetch provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await locationService.getProvinces();
        console.log('📍 Provinces fetched:', response?.data || response);
        setProvinces(response?.data || response || []);
      } catch (err) {
        console.error('Error fetching provinces:', err);
        setProvinces([]);
      }
    };
    fetchProvinces();
  }, []);

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

  // Fetch districts when province changes (only when user manually changes it, not on initial load)
  useEffect(() => {
    const fetchDistricts = async () => {
      if (!formData.province_id) {
        setDistricts([]);
        setCommunes([]);
        return;
      }

      // Skip if this is the initial load from schoolData
      if (schoolData?.place?.provinceId && formData.province_id === String(schoolData.place.provinceId)) {
        return;
      }

      try {
        const response = await locationService.getDistrictsByProvince(formData.province_id);
        setDistricts(response?.data || response || []);
        console.log('📍 Districts loaded:', response?.data || response);
        setCommunes([]);
      } catch (err) {
        console.error('Error fetching districts:', err);
        setDistricts([]);
        setCommunes([]);
      }
    };
    fetchDistricts();
  }, [formData.province_id, schoolData?.place?.provinceId]);

  // Fetch communes when district changes (only when user manually changes it, not on initial load)
  useEffect(() => {
    const fetchCommunes = async () => {
      if (!formData.province_id || !formData.district_code) {
        setCommunes([]);
        return;
      }

      // Skip if this is the initial load from schoolData
      if (schoolData?.place?.district_code && formData.district_code === String(schoolData.place.district_code)) {
        return;
      }

      try {
        const response = await locationService.getCommunesByDistrict(formData.province_id, formData.district_code);
        console.log('📍 Communes loaded:', response?.data || response);
        setCommunes(response?.data || response || []);
      } catch (err) {
        console.error('Error fetching communes:', err);
        setCommunes([]);
      }
    };
    fetchCommunes();
  }, [formData.province_id, formData.district_code, schoolData?.place?.district_code]);

  // Fetch villages when commune changes (only when user manually changes it, not on initial load)
  useEffect(() => {
    const fetchVillages = async () => {
      if (!formData.province_id || !formData.district_code || !formData.commune_code) {
        setVillages([]);
        return;
      }

      // Skip if this is the initial load from schoolData
      if (schoolData?.place?.commune_code && formData.commune_code === String(schoolData.place.commune_code)) {
        return;
      }

      try {
        const response = await locationService.getVillagesByCommune(
          formData.province_id,
          formData.district_code,
          formData.commune_code
        );
        console.log('📍 Villages loaded:', response?.data || response);
        setVillages(response?.data || response || []);
      } catch (err) {
        console.error('Error fetching villages:', err);
        setVillages([]);
      }
    };
    fetchVillages();
  }, [formData.province_id, formData.district_code, formData.commune_code, schoolData?.place?.commune_code]);

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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Handle province selection
  const handleProvinceChange = useCallback((value) => {
    console.log('📍 Province selected:', value);
    setFormData(prev => ({
      ...prev,
      province_id: value,
      // Clear district and communes when province changes
      district_code: '',
      district_id: '',
      commune_code: '',
      commune_id: ''
    }));
  }, []);

  // Handle district selection - capture both code and ID
  const handleDistrictChange = useCallback((value) => {
    const selectedDistrict = districts.find(d => String(d.district_code || d.code) === value);
    console.log('📍 District selected:', value, selectedDistrict);
    setFormData(prev => ({
      ...prev,
      district_code: value,
      // Use districtId from API response, fallback to id
      district_id: selectedDistrict ? String(selectedDistrict.districtId || selectedDistrict.id) : '',
      // Clear communes when district changes
      commune_code: '',
      commune_id: ''
    }));
  }, [districts]);

  // Handle commune selection - capture both code and ID
  const handleCommuneChange = useCallback((value) => {
    const selectedCommune = communes.find(c => String(c.commune_code || c.code) === value);
    console.log('📍 Commune selected:', value, selectedCommune);
    setFormData(prev => ({
      ...prev,
      commune_code: value,
      // Use communeId from API response, fallback to id
      commune_id: selectedCommune ? String(selectedCommune.communeId || selectedCommune.id) : '',
      // Clear village when commune changes
      village_code: '',
      village_id: ''
    }));
  }, [communes]);

  // Handle village selection - capture both code and ID
  const handleVillageChange = useCallback((value) => {
    const selectedVillage = villages.find(v => String(v.village_code || v.code) === value);
    console.log('📍 Village selected:', value, selectedVillage);
    setFormData(prev => ({
      ...prev,
      village_code: value,
      // Use villageId from API response, fallback to id
      village_id: selectedVillage ? String(selectedVillage.villageId || selectedVillage.id) : ''
    }));
  }, [villages]);

  // Handle school type selection
  const handleSchoolTypeChange = useCallback((value) => {
    console.log('🏢 School type selected:', value);
    setFormData(prev => ({
      ...prev,
      schoolType: value
    }));
  }, []);

  // Handle project type selection
  const handleProjectTypeChange = useCallback((value) => {
    console.log('🏫 Project type selected:', value);
    setFormData(prev => ({
      ...prev,
      projectTypeId: value
    }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

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

      // Add location data in nested place object format (as expected by API)
      const placeData = {};
      if (formData.province_id) {
        placeData.provinceId = parseInt(formData.province_id);
      }
      if (formData.district_id) {
        placeData.districtId = parseInt(formData.district_id);
      }
      if (formData.commune_id) {
        placeData.communeId = parseInt(formData.commune_id);
      }
      if (formData.village_id) {
        placeData.villageId = parseInt(formData.village_id);
      }

      if (Object.keys(placeData).length > 0) {
        payload.place = placeData;
      }

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
        place: placeData
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
  }, [formData, profileImage, schoolId, showSuccess, showError, t]);

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
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
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
        <FadeInSection className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
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
                      className="cursor-pointer group relative"
                      onClick={() => document.getElementById('profileImageInput')?.click()}
                    >
                      {imageError ? (
                        <div className="w-full aspect-square rounded-lg bg-red-50 border-2 border-red-300 flex items-center justify-center group-hover:bg-red-100 transition-colors">
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
                            className="w-full aspect-square rounded-lg object-cover border border-gray-200 group-hover:opacity-75 transition-opacity bg-white"
                            onError={handleImageLoadError}
                          />
                          <div className="absolute inset-0 rounded-lg bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="text-white text-xs font-medium">{t('clickToChan', 'Click to change')}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full aspect-square rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center group-hover:bg-gray-50 transition-colors">
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
                    disabled={submitting}
                  />

                  {/* File Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
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
                        disabled={submitting}
                        className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
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
                        disabled={submitting}
                        className="w-full px-4 py-2 border text-sm border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
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
                        className="w-full"
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
                        className="w-full"
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
                        value={formData.province_id}
                        onValueChange={handleProvinceChange}
                        options={provinces.map(prov => ({
                          value: String(prov.id || prov.province_id),
                          label: prov.province_name_kh || prov.province_name_en || prov.name_kh || prov.name_en || prov.name
                        }))}
                        placeholder={t('selectProvince') || 'Select Province'}
                        disabled={submitting}
                        className="w-full"
                        maxHeight="max-h-60"
                      />
                    </div>

                    {/* District */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t('district') || 'District'}
                      </label>
                      <Dropdown
                        value={formData.district_code}
                        onValueChange={handleDistrictChange}
                        options={districts.map(dist => ({
                          value: String(dist.district_code || dist.code),
                          label: dist.district_name_kh || dist.district_name_en || dist.name_kh || dist.name_en || dist.name
                        }))}
                        placeholder={t('selectDistrict') || 'Select District'}
                        disabled={submitting || !formData.province_id}
                        className="w-full"
                        maxHeight="max-h-60"
                      />
                    </div>

                    {/* Commune */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t('commune') || 'Commune'}
                      </label>
                      <Dropdown
                        value={formData.commune_code}
                        onValueChange={handleCommuneChange}
                        options={communes.map(comm => ({
                          value: String(comm.commune_code || comm.code),
                          label: comm.commune_name_kh || comm.commune_name_en || comm.name_kh || comm.name_en || comm.name
                        }))}
                        placeholder={t('selectCommune') || 'Select Commune'}
                        disabled={submitting || !formData.district_code}
                        className="w-full"
                        maxHeight="max-h-60"
                      />
                    </div>

                    {/* Village */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t('village') || 'Village'}
                      </label>
                      <Dropdown
                        value={formData.village_code}
                        onValueChange={handleVillageChange}
                        options={villages.map(vill => ({
                          value: String(vill.village_code || vill.code),
                          label: vill.village_name_kh || vill.village_name_en || vill.name_kh || vill.name_en || vill.name
                        }))}
                        placeholder={t('selectVillage') || 'Select Village'}
                        disabled={submitting || !formData.commune_code}
                        className="w-full"
                        maxHeight="max-h-60"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={submitting}
                size="sm"
              >
                {t('cancel') || 'Cancel'}
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
            </div>
          </form>
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
