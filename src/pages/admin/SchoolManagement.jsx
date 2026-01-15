import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useToast } from '../../contexts/ToastContext';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import schoolService from '../../utils/api/services/schoolService';
import locationService from '../../utils/api/services/locationService';
import apiClient from '../../utils/api/client';
import Table from '../../components/ui/Table';
import SearchableDropdown from '../../components/ui/SearchableDropdown';
import { Search, X, Edit2, Trash2, RefreshCw, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Dropdown from '../../components/ui/Dropdown';
import ConfirmDialog from '../../components/ui/ConfirmDialog';


const SchoolManagement = () => {
  const { t } = useLanguage();
  const { error, handleError, clearError } = useErrorHandler();
  const { showSuccess } = useToast();

  // Location and school states
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [schools, setSchools] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');

  const [loading, setLoading] = useState(false);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [projectTypesLoading, setProjectTypesLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSchools, setTotalSchools] = useState(0);
  const [pageLimit, setPageLimit] = useState(10);

  const [showSchools, setShowSchools] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal and form state for CRUD operations
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    profile: '',
    schoolType: '',
    projectTypeId: '',
    status: 'ACTIVE',
    place: {
      provinceId: '',
      districtCode: '',
      districtId: '', // Store numeric ID for API submission
      communeCode: '',
      communeId: '', // Store numeric ID for API submission
      gpsLatitude: '',
      gpsLongitude: ''
    }
  });
  const [isSaving, setIsSaving] = useState(false);

  // Confirm dialog state for delete
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    schoolToDelete: null,
    isDeleting: false
  });

  // Use ref to prevent duplicate API calls in React StrictMode
  // Note: This tracks initialization within a single mount cycle, not across unmounts
  const hasInitialized = useRef(false);

  // Load provinces and all schools on component mount
  useEffect(() => {
    // Reset initialization flag on mount to allow reloading when component remounts
    hasInitialized.current = false;

    let isMounted = true;

    const loadInitialData = async () => {
      // Skip if already initialized during this mount cycle (prevents StrictMode double-call)
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      try {
        await Promise.all([
          loadProvinces(),
          loadAllSchools(),
          loadProjectTypes()
        ]);
      } catch (error) {
        if (isMounted) {
          console.error('Error loading initial data:', error);
        }
      }
    };

    loadInitialData();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      // Reset flag when component unmounts so it reloads next time
      hasInitialized.current = false;
    };
  }, []);

  const loadProjectTypes = async () => {
    setProjectTypesLoading(true);
    try {
      const response = await schoolService.getSchoolProjectTypes();
      console.log('📦 Project types API response:', response);

      // Handle different response formats
      let typesData = [];

      // Try different paths to find the array
      if (Array.isArray(response?.data)) {
        typesData = response.data;
      } else if (Array.isArray(response)) {
        typesData = response;
      } else if (response?.success && Array.isArray(response?.data)) {
        typesData = response.data;
      }

      console.log('📦 Resolved project types array:', typesData, 'length:', typesData.length);

      // If still empty after all attempts, set empty array (not a fallback, we want to know if API returns nothing)
      setProjectTypes(typesData);
    } catch (error) {
      console.error('Error loading project types:', error);
      setProjectTypes([]);
    } finally {
      setProjectTypesLoading(false);
    }
  };

  const loadProvinces = async () => {
    try {
      setLoading(true);
      const response = await locationService.getProvinces();

      if (response && (response.data || Array.isArray(response))) {
        const provincesData = response.data || response;
        setProvinces(provincesData);
      }
    } catch (error) {
      console.error('Error loading provinces:', error);
      handleError(error, {
        toastMessage: t('failedToLoadProvinces', 'Unable to load provinces')
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDistricts = async (provinceId) => {
    try {
      setLoading(true);

      if (!provinceId || provinceId === '') {
        throw new Error('Province ID is required');
      }

      const provinceIdStr = String(provinceId);
      if (!/^\d+$/.test(provinceIdStr)) {
        throw new Error(`Invalid province ID format: ${provinceIdStr}`);
      }

      const response = await locationService.getDistrictsByProvince(provinceIdStr);

      if (response && (response.data || Array.isArray(response))) {
        const districtsData = response.data || response;

        if (Array.isArray(districtsData)) {
          setDistricts(districtsData);
        } else {
          console.warn('Districts data is not an array:', districtsData);
          setDistricts([]);
        }
      } else {
        console.warn('No districts data in response');
        setDistricts([]);
      }

      setSchools([]);
      setSelectedDistrict('');
      setSelectedCommune('');
      setCommunes([]);
      setShowSchools(false);
    } catch (error) {
      console.error('Error loading districts:', error);
      handleError(error, {
        toastMessage: t('failedToLoadDistricts', 'Unable to load districts')
      });
      setDistricts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCommunes = async (districtCode) => {
    try {
      setLoading(true);

      if (!districtCode || districtCode === '') {
        throw new Error('District code is required');
      }

      if (!selectedProvince) {
        throw new Error('Province ID is required');
      }

      const response = await locationService.getCommunesByDistrict(selectedProvince, districtCode);

      if (response && (response.data || Array.isArray(response))) {
        const communesData = response.data || response;

        if (Array.isArray(communesData)) {
          setCommunes(communesData);
        } else {
          console.warn('Communes data is not an array:', communesData);
          setCommunes([]);
        }
      } else {
        console.warn('No communes data in response');
        setCommunes([]);
      }

      setSelectedCommune('');
      setSchools([]);
      setShowSchools(false);
    } catch (error) {
      console.error('Error loading communes:', error);
      handleError(error, {
        toastMessage: t('failedToLoadCommunes', 'Unable to load communes')
      });
      setCommunes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSchools = async (districtCode, communeCode = '') => {
    if (!districtCode) {
      setSchools([]);
      setShowSchools(false);
      return;
    }

    try {
      setSchoolsLoading(true);
      clearError();

      // Find the district object to get the district ID
      const districtObj = districts.find(d => d.district_code === districtCode);

      if (!districtObj) {
        throw new Error('District not found in the districts list');
      }

      // Check all possible ID fields
      const possibleIds = [
        districtObj.district_id,
        districtObj.id,
        districtObj.districtId
      ];

      const districtId = possibleIds.find(id => id != null);
      if (!districtId) {
        throw new Error('District ID is missing from district object');
      }

      // Build query parameters with province, district, and optionally commune
      const params = new URLSearchParams();
      if (selectedProvince) {
        params.append('provinceId', selectedProvince);
      }
      params.append('districtId', districtId);
      if (communeCode) {
        params.append('communeCode', communeCode);
      }
      params.append('limit', pageLimit);
      params.append('offset', 0);

      const data = await apiClient.get('/schools', {
        params: Object.fromEntries(params.entries())
      });

      if (data && (data.data || Array.isArray(data))) {
        const schoolsData = data.data || data;

        if (Array.isArray(schoolsData)) {
          // Format the schools data using the service formatter
          const formattedSchools = schoolsData.map(school =>
            schoolService.utils.formatSchoolData(school)
          );
          setSchools(formattedSchools);
          // Use API's pagination metadata if available, otherwise calculate client-side
          if (data.total !== undefined) {
            setTotalSchools(data.total);
            setTotalPages(data.totalPages || Math.ceil(data.total / pageLimit));
          } else {
            setTotalSchools(formattedSchools.length);
            setTotalPages(Math.ceil(formattedSchools.length / pageLimit));
          }
          setCurrentPage(1);
          setShowSchools(true);
        } else {
          setSchools([]);
          setShowSchools(false);
        }
      } else {
        console.warn('No schools data in response');
        setSchools([]);
        setShowSchools(false);
      }
    } catch (error) {
      console.error('Error loading schools by district:', error);
      // Fall back to service method if API with parameters fails
      try {
        const response = await schoolService.getSchoolsByDistrict(districtId);
        if (response && response.data) {
          const schoolsData = response.data || [];
          setSchools(schoolsData);
          setTotalSchools(schoolsData.length);
          setTotalPages(Math.ceil(schoolsData.length / pageLimit));
          setCurrentPage(1);
          setShowSchools(true);
        }
      } catch (fallbackError) {
        handleError(fallbackError, {
          toastMessage: t('failedToLoadSchools', 'Error loading schools')
        });
        setSchools([]);
        setShowSchools(false);
      }
    } finally {
      setSchoolsLoading(false);
    }
  };

  const loadSchoolsByProvince = async (provinceId) => {
    try {
      setSchoolsLoading(true);
      clearError();

      // Build query parameters
      const params = new URLSearchParams();
      params.append('provinceId', provinceId);
      params.append('limit', pageLimit);
      params.append('offset', 0);

      const data = await apiClient.get('/schools', {
        params: Object.fromEntries(params.entries())
      });

      if (data && (data.data || Array.isArray(data))) {
        const schoolsData = data.data || data;

        if (Array.isArray(schoolsData)) {
          // Format the schools data using the service formatter
          const formattedSchools = schoolsData.map(school =>
            schoolService.utils.formatSchoolData(school)
          );
          setSchools(formattedSchools);
          // Use API's pagination metadata if available, otherwise calculate client-side
          if (data.total !== undefined) {
            setTotalSchools(data.total);
            setTotalPages(data.totalPages || Math.ceil(data.total / pageLimit));
          } else {
            setTotalSchools(formattedSchools.length);
            setTotalPages(Math.ceil(formattedSchools.length / pageLimit));
          }
          setShowSchools(true);
        } else {
          setSchools([]);
          setShowSchools(false);
        }
      } else {
        setSchools([]);
        setShowSchools(false);
      }
    } catch (error) {
      console.error('Error loading schools by province:', error);
      // Fall back to getAllSchools and filter client-side if API fails
      try {
        const response = await schoolService.getAllSchools();
        if (response && response.data) {
          const schoolsData = response.data || [];
          const filteredByProvince = schoolsData.filter(school => {
            return school.placeObject?.provinceId === parseInt(provinceId) ||
                   school.placeObject?.province_code === provinceId.toString();
          });
          setSchools(filteredByProvince);
          setTotalSchools(filteredByProvince.length);
          setTotalPages(Math.ceil(filteredByProvince.length / pageLimit));
          setShowSchools(true);
        }
      } catch (fallbackError) {
        handleError(fallbackError, {
          toastMessage: t('failedToLoadSchools', 'Error loading schools')
        });
        setSchools([]);
        setShowSchools(false);
      }
    } finally {
      setSchoolsLoading(false);
    }
  };

  const handleProvinceChange = (provinceId) => {
    setSelectedProvince(provinceId);
    setSelectedDistrict('');
    setShowSchools(false);
    setSchools([]);
    setSearchQuery('');

    if (provinceId) {
      loadDistricts(provinceId);
      // Load schools for this province
      loadSchoolsByProvince(provinceId);
    } else {
      setDistricts([]);
      setSchools([]);
    }
  };

  const handleDistrictChange = (districtCode) => {
    setSelectedDistrict(districtCode);
    setSelectedCommune('');
    setSearchQuery('');

    if (districtCode) {
      loadCommunes(districtCode);
      loadSchools(districtCode);
    } else {
      // If district is cleared, show all schools for the province
      setCommunes([]);
      if (selectedProvince) {
        loadSchoolsByProvince(selectedProvince);
      } else {
        setSchools([]);
        setShowSchools(false);
      }
    }
  };

  const handleCommuneChange = (communeCode) => {
    setSelectedCommune(communeCode);
    setSearchQuery('');

    if (communeCode && selectedDistrict) {
      loadSchools(selectedDistrict, communeCode);
    } else if (selectedDistrict) {
      // If commune is cleared, show all schools for the district
      loadSchools(selectedDistrict);
    } else {
      setSchools([]);
      setShowSchools(false);
    }
  };

  // Handle search button click - combine search with current location filters
  const handleSearchButtonClick = async () => {
    if (searchQuery.trim()) {
      try {
        setSchoolsLoading(true);
        clearError();

        const params = new URLSearchParams();

        // Add current location filters
        if (selectedProvince && selectedDistrict) {
          const districtObj = districts.find(d => d.district_code === selectedDistrict);
          if (districtObj) {
            const districtId = districtObj.district_id || districtObj.id || districtObj.districtId;
            if (selectedProvince) params.append('provinceId', selectedProvince);
            params.append('districtId', districtId);
            if (selectedCommune) params.append('communeCode', selectedCommune);
          }
        } else if (selectedProvince) {
          params.append('provinceId', selectedProvince);
        }

        // Add search filter
        params.append('search', searchQuery.trim());
        params.append('limit', pageLimit);
        params.append('offset', 0);

        const data = await apiClient.get('/schools', {
          params: Object.fromEntries(params.entries())
        });

        if (data && data.data && Array.isArray(data.data)) {
          const formattedSchools = data.data.map(school =>
            schoolService.utils.formatSchoolData(school)
          );
          setSchools(formattedSchools);
          setShowSchools(true);

          // Update pagination from API response
          if (data.total !== undefined) {
            setTotalSchools(data.total);
            setTotalPages(data.totalPages || Math.ceil(data.total / pageLimit));
          } else {
            setTotalSchools(formattedSchools.length);
            setTotalPages(Math.ceil(formattedSchools.length / pageLimit));
          }
          setCurrentPage(1);
        } else {
          setSchools([]);
          setShowSchools(false);
        }
      } catch (error) {
        console.error('Error searching schools:', error);
        handleError(error, {
          toastMessage: t('failedToLoadSchools', 'Error loading schools')
        });
        setSchools([]);
        setShowSchools(false);
      } finally {
        setSchoolsLoading(false);
      }
    }
  };

  const loadAllSchools = async (searchQuery = '') => {
    try {
      setSchoolsLoading(true);
      clearError();

      // Build query parameters
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      params.append('limit', pageLimit);
      params.append('offset', 0);

      const data = await apiClient.get('/schools', {
        params: Object.fromEntries(params.entries())
      });

      if (data && (data.data || Array.isArray(data))) {
        const schoolsData = data.data || data;
        if (Array.isArray(schoolsData)) {
          const formattedSchools = schoolsData.map(school =>
            schoolService.utils.formatSchoolData(school)
          );
          setSchools(formattedSchools);
          if (data.total !== undefined) {
            setTotalSchools(data.total);
            setTotalPages(data.totalPages || Math.ceil(data.total / pageLimit));
          } else {
            setTotalSchools(formattedSchools.length);
            setTotalPages(Math.ceil(formattedSchools.length / pageLimit));
          }
          setShowSchools(true);
          return;
        }
      }

      // Fall back to service method if API fails
      const fallbackResponse = await schoolService.getAllSchools();
      if (fallbackResponse && fallbackResponse.data) {
        const schoolsData = fallbackResponse.data || [];
        setSchools(schoolsData);
        setTotalSchools(schoolsData.length);
        setTotalPages(Math.ceil(schoolsData.length / pageLimit));
        setShowSchools(true);
      } else {
        console.warn('No schools data in response');
        setSchools([]);
        setShowSchools(false);
      }
    } catch (error) {
      console.error('Error loading all schools:', error);
      try {
        // Final fallback to service method
        const response = await schoolService.getAllSchools();
        if (response && response.data) {
          const schoolsData = response.data || [];
          setSchools(schoolsData);
          setTotalSchools(schoolsData.length);
          setTotalPages(Math.ceil(schoolsData.length / pageLimit));
          setShowSchools(true);
        }
      } catch (fallbackError) {
        handleError(fallbackError, {
          toastMessage: t('failedToLoadSchools', 'Error loading schools')
        });
        setSchools([]);
        setShowSchools(false);
      }
    } finally {
      setSchoolsLoading(false);
    }
  };

  // Schools are already paginated by the API, no need for client-side filtering/pagination
  const paginatedSchools = useMemo(() => {
    // API handles pagination, so just return the schools as-is
    return schools;
  }, [schools]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Fetch data for the new page
    const offset = (page - 1) * pageLimit;
    reloadCurrentPageData(offset);
  };

  const handleLimitChange = (limit) => {
    setPageLimit(limit);
    setCurrentPage(1);
    // Reload data with new limit
    reloadCurrentPageData(0, limit);
  };

  // Helper function to reload data for current filters with new pagination
  const reloadCurrentPageData = async (offset, newLimit = pageLimit) => {
    try {
      setSchoolsLoading(true);
      clearError();

      const params = new URLSearchParams();

      // Add current filters
      if (selectedProvince && selectedDistrict) {
        const districtObj = districts.find(d => d.district_code === selectedDistrict);
        if (districtObj) {
          const districtId = districtObj.district_id || districtObj.id || districtObj.districtId;
          if (selectedProvince) params.append('provinceId', selectedProvince);
          params.append('districtId', districtId);
          if (selectedCommune) params.append('communeCode', selectedCommune);
        }
      } else if (selectedProvince) {
        params.append('provinceId', selectedProvince);
      }

      // Add search filter if present
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      // Add pagination
      params.append('limit', newLimit);
      params.append('offset', offset);

      const data = await apiClient.get('/schools', {
        params: Object.fromEntries(params.entries())
      });

      if (data && data.data && Array.isArray(data.data)) {
        const formattedSchools = data.data.map(school =>
          schoolService.utils.formatSchoolData(school)
        );
        setSchools(formattedSchools);

        // Update pagination from API response
        if (data.total !== undefined) {
          setTotalSchools(data.total);
          setTotalPages(data.totalPages || Math.ceil(data.total / newLimit));
        }
      }
    } catch (error) {
      console.error('Error reloading page data:', error);
      handleError(error, {
        toastMessage: t('failedToLoadPage', 'Failed to load page data')
      });
    } finally {
      setSchoolsLoading(false);
    }
  };

  // CRUD Handlers
  const openCreateModal = () => {
    setModalMode('create');
    setSelectedSchool(null);
    setFormData({
      name: '',
      code: '',
      profile: '',
      schoolType: '',
      projectTypeId: '',
      status: 'ACTIVE',
      place: {
        provinceId: '',
        districtCode: '',
        districtId: '',
        communeCode: '',
        communeId: '',
        gpsLatitude: '',
        gpsLongitude: ''
      }
    });
    setDistricts([]);
    setCommunes([]);
    setIsModalOpen(true);
  };

  const openEditModal = (school) => {
    setModalMode('edit');
    setSelectedSchool(school);

    // Determine correct property names for location data
    const provinceId = school.placeObject?.province_id || school.placeObject?.provinceId;
    const districtId = school.placeObject?.district_id || school.placeObject?.districtId;
    const districtCode = school.placeObject?.district_code || school.placeObject?.districtCode;
    const communeId = school.placeObject?.commune_id || school.placeObject?.communeId;
    const communeCode = school.placeObject?.commune_code || school.placeObject?.communeCode;

    setFormData({
      name: school.name || '',
      code: school.code || '',
      profile: school.profile || '',
      schoolType: school.schoolType || '',
      projectTypeId: school.projectTypeId ? String(school.projectTypeId) : '',
      status: school.status || 'ACTIVE',
      place: {
        // Convert to strings to match dropdown option values (which are stringified)
        provinceId: provinceId ? String(provinceId) : '',
        districtCode: (districtCode) ? String(districtCode) : '',
        districtId: (districtId) ? String(districtId) : '',
        communeCode: communeCode ? String(communeCode) : '',
        communeId: communeId ? String(communeId) : '',
        gpsLatitude: school.placeObject?.gpsLatitude || '',
        gpsLongitude: school.placeObject?.gpsLongitude || ''
      }
    });
    setIsModalOpen(true);

    // Load districts if province is selected
    if (provinceId) {
      loadDistrictsForModal(provinceId);
    }
    // Load communes if district is selected
    if (districtCode && provinceId) {
      loadCommunesForModal(districtCode, provinceId);
    }
  };

  const handleModalProvinceChange = (provinceId) => {
    setFormData({
      ...formData,
      place: {
        ...formData.place,
        provinceId,
        districtCode: '',
        districtId: '',
        communeCode: '',
        communeId: ''
      }
    });
    setCommunes([]);

    if (provinceId) {
      loadDistrictsForModal(provinceId);
    } else {
      setDistricts([]);
    }
  };

  const handleModalDistrictChange = (districtCode) => {
    // Find the selected district to extract its ID
    const selectedDistrict = districts.find(d => String(d.district_code || d.code) === districtCode);

    setFormData({
      ...formData,
      place: {
        ...formData.place,
        districtCode,
        districtId: selectedDistrict ? String(selectedDistrict.districtId || selectedDistrict.id) : '',
        communeCode: '',
        communeId: ''
      }
    });

    if (districtCode && formData.place.provinceId) {
      loadCommunesForModal(districtCode, formData.place.provinceId);
    } else {
      setCommunes([]);
    }
  };

  const handleModalCommuneChange = (communeCode) => {
    // Find the selected commune to extract its ID
    const selectedCommune = communes.find(c => String(c.commune_code || c.code) === communeCode);

    setFormData({
      ...formData,
      place: {
        ...formData.place,
        communeCode,
        communeId: selectedCommune ? String(selectedCommune.communeId || selectedCommune.id) : ''
      }
    });
  };

  const loadDistrictsForModal = async (provinceId) => {
    try {
      const response = await locationService.getDistrictsByProvince(String(provinceId));
      if (response && (response.data || Array.isArray(response))) {
        const districtsData = response.data || response;
        if (Array.isArray(districtsData)) {
          setDistricts(districtsData);
        }
      }
    } catch (error) {
      console.error('Error loading districts for modal:', error);
    }
  };

  const loadCommunesForModal = async (districtCode, provinceId) => {
    try {
      // Fix: getCommunesByDistrict expects (provinceId, districtCode) not (districtCode, provinceId)
      const response = await locationService.getCommunesByDistrict(
        String(provinceId),
        String(districtCode)
      );
      if (response && (response.data || Array.isArray(response))) {
        const communesData = response.data || response;
        if (Array.isArray(communesData)) {
          setCommunes(communesData);
        }
      }
    } catch (error) {
      console.error('Error loading communes for modal:', error);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalMode('create');
    setSelectedSchool(null);
    setFormData({
      name: '',
      code: '',
      profile: '',
      schoolType: '',
      projectTypeId: '',
      status: 'ACTIVE',
      place: {
        provinceId: '',
        districtCode: '',
        districtId: '',
        communeCode: '',
        communeId: '',
        gpsLatitude: '',
        gpsLongitude: ''
      }
    });
    setDistricts([]);
    setCommunes([]);
  };

  const handleSaveSchool = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      handleError({ message: 'School name is required' });
      return;
    }
    if (!formData.code.trim()) {
      handleError({ message: 'School code is required' });
      return;
    }

    setIsSaving(true);
    try {
      // Build the complete payload (API only accepts: name, code, status, schoolType, projectTypeId, place, profile)
      const payload = {
        name: formData.name,
        code: formData.code,
        status: formData.status
      };

      // Only include profile if provided
      if (formData.profile) {
        payload.profile = formData.profile;
      }

      // Add school type if selected
      if (formData.schoolType) {
        payload.schoolType = formData.schoolType;
      }

      // Add project type if selected
      if (formData.projectTypeId) {
        payload.projectTypeId = parseInt(formData.projectTypeId);
      }

      // Add location data in nested place object format (use numeric IDs, not codes)
      const placeData = {};
      if (formData.place.provinceId) {
        placeData.provinceId = parseInt(formData.place.provinceId);
      }
      if (formData.place.districtId) {
        placeData.districtId = parseInt(formData.place.districtId);
      }
      if (formData.place.communeId) {
        placeData.communeId = parseInt(formData.place.communeId);
      }
      if (formData.place.gpsLatitude) {
        const lat = parseFloat(formData.place.gpsLatitude);
        if (!Number.isNaN(lat)) {
          placeData.gpsLatitude = lat;
        }
      }
      if (formData.place.gpsLongitude) {
        const lng = parseFloat(formData.place.gpsLongitude);
        if (!Number.isNaN(lng)) {
          placeData.gpsLongitude = lng;
        }
      }

      if (Object.keys(placeData).length > 0) {
        payload.place = placeData;
      }

      if (modalMode === 'create') {
        const response = await schoolService.createSchool(payload);
        if (response.success || response.data) {
          showSuccess(t('schoolCreatedSuccessfully', 'School created successfully'));
          closeModal();
          // Reload schools
          await loadAllSchools(searchQuery);
        }
      } else {
        const response = await schoolService.updateSchool(selectedSchool.id, payload);
        if (response.success || response.data) {
          showSuccess(t('schoolUpdatedSuccessfully', 'School updated successfully'));
          closeModal();
          // Reload schools
          await loadAllSchools(searchQuery);
        }
      }
    } catch (error) {
      console.error('Error saving school:', error);
      handleError(error, {
        toastMessage: modalMode === 'create'
          ? t('failedToCreateSchool', 'Failed to create school')
          : t('failedToUpdateSchool', 'Failed to update school')
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSchool = (school) => {
    setConfirmDialog({
      isOpen: true,
      schoolToDelete: school,
      isDeleting: false
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDialog.schoolToDelete) return;

    setConfirmDialog(prev => ({ ...prev, isDeleting: true }));
    setSchoolsLoading(true);

    try {
      await schoolService.deleteSchool(confirmDialog.schoolToDelete.id);
      showSuccess(t('schoolDeletedSuccessfully', 'School deleted successfully'));
      // Close dialog and reload schools
      setConfirmDialog({ isOpen: false, schoolToDelete: null, isDeleting: false });
      await loadAllSchools(searchQuery);
    } catch (error) {
      console.error('Error deleting school:', error);
      handleError(error, {
        toastMessage: t('failedToDeleteSchool', 'Failed to delete school')
      });
      setConfirmDialog(prev => ({ ...prev, isDeleting: false }));
    } finally {
      setSchoolsLoading(false);
    }
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, schoolToDelete: null, isDeleting: false });
  };

  // Show loading on initial page load (loading provinces and schools)
  if ((loading || schoolsLoading) && !showSchools && !provinces.length) {
    return (
      <PageLoader
        message={t('loadingData', 'Loading data...')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <ErrorDisplay
          error={error}
          onRetry={loadProvinces}
          size="lg"
          className="min-h-[400px]"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
            {t('schoolManagementPage', 'School Management')}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {t('schoolManagementPageDescription', 'View create update and delete schools in the system.')}
          </p>
        </div>

        <div className='p-6 sm:p-6 mb-8 border border-gray-100 bg-white rounded-sm shadow-sm'>
          {/* Filter Form */}
        <div className="">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{t('schoolList', 'School List')}</h2>
            <div className="flex gap-2">
              <Button
                onClick={openCreateModal}
                variant="primary"
                size="sm"
                title={t('createSchool', 'Create School')}
              >
                <Plus className="h-5 w-5 mr-1" />
                {t('createSchool', 'Create School')}
              </Button>
              {(selectedProvince || selectedDistrict || selectedCommune || searchQuery) && (
                <Button
                  onClick={() => {
                    setSelectedProvince('');
                    setSelectedDistrict('');
                    setSelectedCommune('');
                    setSchools([]);
                    setShowSchools(false);
                    setDistricts([]);
                    setCommunes([]);
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  variant="success"
                  size="sm"
                  title={t('clearFilters', 'Clear Filters')}
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-6">
            {/* Province Selection */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">
                {t('province', 'Province')}
              </label>
              <SearchableDropdown
                value={selectedProvince}
                onValueChange={handleProvinceChange}
                options={[
                  { value: '', label: `${t('showAll', 'Show All')}` },
                  ...provinces.map((province) => ({
                    value: province.id.toString(),
                    label: province.province_name_kh || province.province_name_en
                  }))
                ]}
                placeholder={t('selectProvince', 'Select Province')}
                searchPlaceholder={t('search', 'Search...')}
                disabled={loading}
                className="w-full h-12 text-base"
                minWidth="w-full"
              />
            </div>

            {/* District Selection */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">
                {t('district', 'District')}
              </label>
              <SearchableDropdown
                value={selectedDistrict}
                onValueChange={handleDistrictChange}
                options={[
                  { value: '', label: `${t('showAll', 'Show All')}` },
                  ...districts.map((district) => ({
                    value: district.district_code,
                    label: district.district_name_kh || district.district_name_en
                  }))
                ]}
                placeholder={t('selectDistrict', 'Select District')}
                searchPlaceholder={t('search', 'Search...')}
                disabled={loading || !selectedProvince}
                className="w-full h-12 text-base"
                minWidth="w-full"
              />
            </div>

            {/* Commune Selection */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">
                {t('commune', 'Commune')}
              </label>
              <SearchableDropdown
                value={selectedCommune}
                onValueChange={handleCommuneChange}
                options={[
                  { value: '', label: `${t('showAll', 'Show All')}` },
                  ...communes.map((commune) => ({
                    value: commune.commune_code,
                    label: commune.commune_name_kh || commune.commune_name_en
                  }))
                ]}
                placeholder={t('selectCommune', 'Select Commune')}
                searchPlaceholder={t('search', 'Search...')}
                disabled={loading || !selectedDistrict}
                className="w-full h-12 text-base"
                minWidth="w-full"
              />
            </div>

            {/* Search Schools */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">
                {t('search', 'Search')}
              </label>
              <div className="relative w-full flex items-stretch">
                <input
                  type="text"
                  className="flex-1 border border-gray-200 rounded-sm leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
                  placeholder={t('search', 'Search by name or code...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchButtonClick();
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                      // Reload data with current location filters only
                      if (selectedProvince && selectedDistrict) {
                        loadSchools(selectedDistrict, selectedCommune);
                      } else if (selectedProvince) {
                        loadSchoolsByProvince(selectedProvince);
                      } else {
                        loadAllSchools();
                      }
                    }}
                    className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    title={t('search', 'Clear')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={handleSearchButtonClick}
                  disabled={!searchQuery.trim()}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50 text-blue-600"
                  title={t('search', 'Search')}
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Schools Section */}
        {(showSchools || schoolsLoading) && (
          <div className="space-y-4">
            {/* Table with total schools count */}
            <Table
              columns={[
                {
                  key: 'name',
                  header: t('schoolName', 'School Name'),
                  accessor: 'name'
                },
                {
                  key: 'code',
                  header: t('schoolCode', 'School Code'),
                  accessor: 'code'
                },
                {
                  key: 'province',
                  header: t('province', 'Province'),
                  render: (school) => (
                    <div className="text-sm text-gray-600 max-w-xs truncate">
                      {school.placeObject?.province_name_kh || school.placeObject?.province_name_en || '-'}
                    </div>
                  )
                },
                {
                  key: 'district',
                  header: t('district', 'District'),
                  render: (school) => (
                    <div className="text-sm text-gray-600 max-w-xs truncate">
                      {school.placeObject?.district_name_kh || school.placeObject?.district_name_en || '-'}
                    </div>
                  )
                },
                {
                  key: 'commune',
                  header: t('commune', 'Commune'),
                  render: (school) => (
                    <div className="text-sm text-gray-600 max-w-xs truncate">
                      {school.placeObject?.commune_name_kh || school.placeObject?.commune_name_en || '-'}
                    </div>
                  )
                },
                {
                  key: 'actions',
                  header: t('actions', 'Actions'),
                  render: (school) => (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(school)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t('edit', 'Edit')}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSchool(school)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('delete', 'Delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                }
              ]}
              data={paginatedSchools}
              loading={schoolsLoading}
              emptyMessage={t('noSchoolsFound', 'No schools found')}
              showPagination={true}
              pagination={{
                page: currentPage,
                pages: totalPages,
                limit: pageLimit,
                total: totalSchools
              }}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              limitOptions={[10, 20, 50, 100]}
              showLimitSelector={true}
              t={t}
              enableSort={true}
              defaultSortKey="name"
            />
          </div>
        )}
        </div>
      </div>

      {/* School Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalMode === 'create' ? t('createSchool', 'Create School') : t('editSchool', 'Edit School')}
        size="lg"
        height="full"
        stickyFooter={true}
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              onClick={closeModal}
              variant="outline"
              disabled={isSaving}
            >
              {t('cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleSaveSchool}
              variant="primary"
              disabled={isSaving}
            >
              {isSaving ? t('saving', 'Saving...') : t('save', 'Save')}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              {t('basicInformation', 'Basic Information')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* School Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                  {t('schoolName', 'School Name')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('enterSchoolName', 'Enter school name')}
                />
              </div>

              {/* School Code */}
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-900 mb-2">
                  {t('schoolCode', 'School Code')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('enterSchoolCode', 'Enter school code')}
                />
              </div>

              {/* School Type - ENUM with Khmer options */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('schoolType', 'School Type')}
                </label>
                <Dropdown
                  value={formData.schoolType}
                  onValueChange={(value) => setFormData({ ...formData, schoolType: value })}
                  options={[
                    { value: 'សាលារដ្ឋ', label: 'សាលារដ្ឋ (State/Public)' },
                    { value: 'សាលាឯកជន', label: 'សាលាឯកជន (Private)' },
                    { value: 'សាលាអង្គការ', label: 'សាលាអង្គការ (NGO)' }
                  ]}
                  placeholder={t('selectSchoolType', 'Select School Type')}
                  className="w-full"
                  minWidth="w-full"
                  maxHeight="max-h-60"
                />
              </div>

              {/* Project Type */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('projectType', 'Project Type')}
                </label>
                <Dropdown
                  value={formData.projectTypeId}
                  onValueChange={(value) => setFormData({ ...formData, projectTypeId: value })}
                  options={projectTypes.length > 0 ? projectTypes.map(type => ({
                    value: String(type.id || type.projectTypeId),
                    label: type.name || type.description || type.project_type_name
                  })) : projectTypesLoading ? [{ value: '', label: t('loading', 'Loading...'), disabled: true }] : []}
                  placeholder={projectTypesLoading ? t('loading', 'Loading...') : t('selectProjectType', 'Select Project Type')}
                  disabled={projectTypesLoading || projectTypes.length === 0}
                  className="w-full"
                  minWidth="w-full"
                  maxHeight="max-h-60"
                />
                {!projectTypesLoading && projectTypes.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {t('noProjectTypes', 'No project types available. Please contact administrator.')}
                  </p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('status', 'Status')}
                </label>
                <Dropdown
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  options={[
                    { value: 'ACTIVE', label: t('active', 'Active') },
                    { value: 'INACTIVE', label: t('inactive', 'Inactive') }
                  ]}
                  placeholder={t('selectStatus', 'Select Status')}
                  className="w-full"
                  minWidth="w-full"
                  maxHeight="max-h-60"
                />
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              {t('location', 'Location Information')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Province */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('province', 'Province')}
                </label>
                <Dropdown
                  value={formData.place.provinceId}
                  onValueChange={handleModalProvinceChange}
                  options={provinces.map(prov => ({
                    value: String(prov.id || prov.province_id),
                    label: prov.province_name_kh || prov.province_name_en || prov.name_kh || prov.name_en || prov.name
                  }))}
                  placeholder={t('selectProvince', 'Select Province')}
                  className="w-full"
                  minWidth="w-full"
                  maxHeight="max-h-60"
                />
              </div>

              {/* District */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('district', 'District')}
                </label>
                <Dropdown
                  value={formData.place.districtCode}
                  onValueChange={handleModalDistrictChange}
                  options={districts.map(dist => ({
                    value: String(dist.district_code || dist.code),
                    label: dist.district_name_kh || dist.district_name_en || dist.name_kh || dist.name_en || dist.name
                  }))}
                  placeholder={t('selectDistrict', 'Select District')}
                  disabled={!formData.place.provinceId}
                  className="w-full"
                  minWidth="w-full"
                  maxHeight="max-h-60"
                />
              </div>

              {/* Commune */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('commune', 'Commune')}
                </label>
                <Dropdown
                  value={formData.place.communeCode}
                  onValueChange={handleModalCommuneChange}
                  options={communes.map(comm => ({
                    value: String(comm.commune_code || comm.code),
                    label: comm.commune_name_kh || comm.commune_name_en || comm.name_kh || comm.name_en || comm.name
                  }))}
                  placeholder={t('selectCommune', 'Select Commune')}
                  disabled={!formData.place.districtCode}
                  className="w-full"
                  minWidth="w-full"
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
                  value={formData.place.gpsLatitude}
                  onChange={(e) => setFormData({
                    ...formData,
                    place: { ...formData.place, gpsLatitude: e.target.value }
                  })}
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  value={formData.place.gpsLongitude}
                  onChange={(e) => setFormData({
                    ...formData,
                    place: { ...formData.place, gpsLongitude: e.target.value }
                  })}
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="104.9123456"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={handleConfirmDelete}
        type="danger"
        title={t('deleteSchool', 'Delete School')}
        message={`${t('confirmDelete', 'Are you sure you want to delete')} "${confirmDialog.schoolToDelete?.name}"? ${t('thisActionCannotBeUndone', 'This action cannot be undone.')}`}
        confirmText={t('delete', 'Delete')}
        cancelText={t('cancel', 'Cancel')}
        loading={confirmDialog.isDeleting}
      />
    </div>
  );
};

export default SchoolManagement;
