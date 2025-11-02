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
    province_id: '',
    district_code: '',
    district_id: '', // Store numeric ID for API submission
    commune_code: '',
    commune_id: '' // Store numeric ID for API submission
  });
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Location cascade state
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [communes, setCommunes] = useState([]);

  const schoolId = user?.school_id || user?.schoolId;

  // Fetch school data
  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        setLoading(true);
        clearError();

        const response = await schoolService.getSchoolById(schoolId);

        if (response?.success && response.data) {
          setSchoolData(response.data);
          const newFormData = {
            name: response.data.name || '',
            code: response.data.code || '',
            profile: response.data.profile || '',
            status: response.data.status || 'ACTIVE',
            province_id: response.data.place?.provinceId ? String(response.data.place.provinceId) : '',
            district_code: response.data.place?.district_code ? String(response.data.place.district_code) : '',
            district_id: response.data.place?.districtId ? String(response.data.place.districtId) : '',
            commune_code: response.data.place?.commune_code ? String(response.data.place.commune_code) : '',
            commune_id: response.data.place?.communeId ? String(response.data.place.communeId) : ''
          };
          console.log('📍 School location data:', response.data.place);
          console.log('📍 Form data set:', newFormData);
          setFormData(newFormData);
          if (response.data.profile) {
            setPreviewUrl(response.data.profile);
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
    }
  }, [schoolId, clearError, handleError, t]);

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

  // Handle profile image selection
  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
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
      commune_id: selectedCommune ? String(selectedCommune.communeId || selectedCommune.id) : ''
    }));
  }, [communes]);

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

      // Prepare form data
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('code', formData.code);
      submitData.append('status', formData.status);

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

      if (Object.keys(placeData).length > 0) {
        submitData.append('place', JSON.stringify(placeData));
      }

      if (profileImage) {
        submitData.append('profile', profileImage);
      }

      console.log('📤 Submitting school update with place data:', placeData);
      const response = await schoolService.updateSchool(schoolId, submitData);

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
    <PageTransition className="flex-1 bg-gray-50 p-6">
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
            {/* Profile Image */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                {t('schoolProfile') || 'School Profile Image'}
              </label>
              <div className="flex items-start gap-6">
                {/* Preview - Clickable */}
                <div className="flex-shrink-0">
                  <div
                    className="cursor-pointer group relative"
                    onClick={() => document.getElementById('profileImageInput')?.click()}
                  >
                    {previewUrl ? (
                      <div className="relative">
                        <img
                          src={previewUrl}
                          alt="School profile"
                          className="w-32 h-32 rounded-lg object-cover border border-gray-200 group-hover:opacity-75 transition-opacity"
                        />
                        <div className="absolute inset-0 rounded-lg bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="text-white text-xs font-medium">Click to change</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center group-hover:bg-gray-50 transition-colors">
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
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={submitting}
                />

                {/* File Info */}
                <div className="flex-1">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-900 mb-2">
                      {t('supportedFormats') || 'Supported Formats'}
                    </p>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• JPG</li>
                      <li>• PNG</li>
                      <li>• GIF</li>
                    </ul>
                    <p className="text-xs text-blue-800 mt-2 pt-2 border-t border-blue-200">
                      <span className="font-medium">{t('maxSize') || 'Maximum size'}: </span>
                      5MB
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-200" />

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder={t('enterSchoolCode') || 'Enter school code'}
                />
              </div>
            </div>
            {/* Location Information */}
            <hr className="border-gray-200" />
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                {t('location') || 'Location Information'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={submitting}
              >
                {t('cancel') || 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {t('saving') || 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
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
