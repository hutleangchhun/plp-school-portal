// Custom hook for managing location data (provinces, districts, communes, villages)
import { useState, useEffect, useCallback, useRef } from 'react';
import locationService from '../utils/api/services/locationService';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useStableCallback } from '../utils/reactOptimization';

// Create shared caches to avoid duplicate API calls
let provincesCache = null;
let provincesPromise = null;

// District cache by province ID
let districtsCache = {};
let districtPromises = {};

// Commune cache by "provinceId-districtCode" key
let communesCache = {};
let communePromises = {};

// Village cache by "provinceId-districtCode-communeCode" key
let villagesCache = {};
let villagePromises = {};

// Subscriber callbacks to notify all instances when data is fetched
let provincesSubscribers = [];
let districtsSubscribers = {};
let communesSubscribers = {};
let villagesSubscribers = {};

const notifyProvinces = (data) => {
  provincesSubscribers.forEach(callback => callback(data));
};

const notifyDistricts = (provinceId, data) => {
  if (districtsSubscribers[provinceId]) {
    districtsSubscribers[provinceId].forEach(callback => callback(data));
  }
};

const notifyCommunes = (key, data) => {
  if (communesSubscribers[key]) {
    communesSubscribers[key].forEach(callback => callback(data));
  }
};

const notifyVillages = (key, data) => {
  if (villagesSubscribers[key]) {
    villagesSubscribers[key].forEach(callback => callback(data));
  }
};

export const useLocationData = (initialValues = {}) => {
  const { t, language } = useLanguage();
  const { showError } = useToast();

  // Location data states
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [villages, setVillages] = useState([]);

  // Loading states
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  // Selected values
  const [selectedProvince, setSelectedProvince] = useState(initialValues.provinceId || '');
  const [selectedDistrict, setSelectedDistrict] = useState(initialValues.districtId || '');
  const [selectedCommune, setSelectedCommune] = useState(initialValues.communeId || '');
  const [selectedVillage, setSelectedVillage] = useState(initialValues.villageId || '');

  // Store selected data with codes for API calls
  const [selectedProvinceData, setSelectedProvinceData] = useState(null);
  const [selectedDistrictData, setSelectedDistrictData] = useState(null);
  const [selectedCommuneData, setSelectedCommuneData] = useState(null);


  const loadProvinces = useStableCallback(async () => {
    console.log('[useLocationData] loadProvinces called - cache:', !!provincesCache, 'promise:', !!provincesPromise);
    // Use cached provinces if available
    if (provincesCache) {
      console.log('[useLocationData] Using cached provinces');
      const formattedProvinces = provincesCache.map(province => ({
        value: province.id.toString(),
        label: province.provinceNameKh || province.province_name_kh || province.province_name_en || `Province ${province.id}`,
        labelKh: province.provinceNameKh || province.province_name_kh,
        labelEn: province.province_name_en,
        code: province.provinceCode || province.province_code,
        originalData: province
      }));
      setProvinces(formattedProvinces);
      return;
    }

    // Prevent duplicate API calls
    if (provincesPromise) {
      try {
        await provincesPromise;
        // After promise resolves, try again with cached data
        return loadProvinces();
      } catch {
        // If promise failed, continue with new call
      }
    }

    setLoadingProvinces(true);

    try {
      // Create and store promise immediately to prevent race conditions
      // This ensures simultaneous calls share the same request
      if (!provincesPromise) {
        provincesPromise = locationService.getProvinces();
      }
      const data = await provincesPromise;

      // Cache the raw data
      provincesCache = Array.isArray(data) ? data : [];

      const formattedProvinces = provincesCache.map(province => ({
        value: province.id.toString(),
        label: province.provinceNameKh || province.province_name_kh || province.province_name_en || `Province ${province.id}`,
        labelKh: province.provinceNameKh || province.province_name_kh,
        labelEn: province.province_name_en,
        code: province.provinceCode || province.province_code,
        originalData: province
      }));
      setProvinces(formattedProvinces);
      notifyProvinces(formattedProvinces);
    } catch (error) {
      console.error('Error loading provinces:', error);
      showError(t('errorFetchingData'));
      provincesCache = [];
      // Clear promise on error so next call retries
      provincesPromise = null;
    } finally {
      setLoadingProvinces(false);
      // Don't clear promise in finally - keep it for subsequent calls to reuse
      // This ensures multiple rapid calls share the same API request
    }
  }, [showError, t]);

  // Handle cross-instance provinces synchronization
  useEffect(() => {
    const callback = (data) => {
      if (provinces.length === 0 && data.length > 0) {
        setProvinces(data);
      }
    };
    provincesSubscribers.push(callback);
    return () => {
      provincesSubscribers = provincesSubscribers.filter(cb => cb !== callback);
    };
  }, [provinces.length]);

  // Load provinces on mount - only if not already cached
  useEffect(() => {
    // If cache exists, use it immediately without fetching
    if (provincesCache && provinces.length === 0) {
      const formattedProvinces = provincesCache.map(province => ({
        value: province.id.toString(),
        label: province.provinceNameKh || province.province_name_kh || province.province_name_en || `Province ${province.id}`,
        labelKh: province.provinceNameKh || province.province_name_kh,
        labelEn: province.province_name_en,
        code: province.provinceCode || province.province_code,
        originalData: province
      }));
      setProvinces(formattedProvinces);
    } else if (!provincesCache && !provincesPromise) {
      // Only fetch if not already cached or being fetched
      loadProvinces();
    }
  }, []);


  const loadDistricts = useStableCallback(async (provinceId) => {
    console.log(`[useLocationData] loadDistricts(${provinceId}) - cache:`, !!districtsCache[provinceId], 'promise:', !!districtPromises[provinceId]);
    // Check cache first
    if (districtsCache[provinceId]) {
      console.log(`[useLocationData] Using cached districts for province ${provinceId}`);
      const formattedDistricts = districtsCache[provinceId].map(district => ({
        value: district.id.toString(),
        label: district.districtNameKh || district.district_name_kh || district.district_name_en || `District ${district.id}`,
        labelKh: district.districtNameKh || district.district_name_kh,
        labelEn: district.district_name_en,
        code: district.districtCode || district.district_code,
        originalData: district
      }));
      setDistricts(formattedDistricts);
      return;
    }

    // Check if already fetching
    if (districtPromises[provinceId]) {
      try {
        await districtPromises[provinceId];
        // Recursively call to use cache
        return loadDistricts(provinceId);
      } catch {
        // Continue with new request
      }
    }

    setLoadingDistricts(true);
    try {
      // Create and store promise immediately to prevent race conditions
      // This ensures simultaneous calls to the same province share the same request
      if (!districtPromises[provinceId]) {
        console.log(`[useLocationData] Making API call for districts in province ${provinceId}`);
        districtPromises[provinceId] = locationService.getDistrictsByProvince(provinceId);
      } else {
        console.log(`[useLocationData] Reusing existing promise for districts in province ${provinceId}`);
      }
      const data = await districtPromises[provinceId];

      // Cache the raw data
      districtsCache[provinceId] = Array.isArray(data) ? data : [];

      const formattedDistricts = districtsCache[provinceId].map(district => ({
        value: district.id.toString(),
        label: district.districtNameKh || district.district_name_kh || district.district_name_en || `District ${district.id}`,
        labelKh: district.districtNameKh || district.district_name_kh,
        labelEn: district.district_name_en,
        code: district.districtCode || district.district_code,
        originalData: district
      }));
      setDistricts(formattedDistricts);
      notifyDistricts(provinceId, formattedDistricts);
    } catch (error) {
      console.error('Error loading districts:', error);
      showError(t('errorFetchingData'));
      districtsCache[provinceId] = [];
      // Clear promise on error so next call retries
      districtPromises[provinceId] = null;
    } finally {
      setLoadingDistricts(false);
      // Don't clear promise - keep it for subsequent calls to reuse
      // This ensures multiple rapid calls to the same province use the same API request
    }
  }, [showError, t]);

  // Handle cross-instance districts synchronization
  useEffect(() => {
    if (!selectedProvince) return;

    const callback = (data) => {
      if (districts.length === 0 && data.length > 0) {
        setDistricts(data);
      }
    };

    if (!districtsSubscribers[selectedProvince]) {
      districtsSubscribers[selectedProvince] = [];
    }
    districtsSubscribers[selectedProvince].push(callback);

    return () => {
      if (districtsSubscribers[selectedProvince]) {
        districtsSubscribers[selectedProvince] = districtsSubscribers[selectedProvince].filter(cb => cb !== callback);
      }
    };
  }, [selectedProvince, districts.length]);

  // Load districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      loadDistricts(selectedProvince);
    } else {
      setDistricts([]);
      setSelectedDistrict('');
      setSelectedCommune('');
      setSelectedVillage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvince]); // Re-fetch when province changes

  // Track if we've already initiated a fetch for this component instance (to prevent Strict Mode doubles)
  const communesFetchInitiatedRef = useRef(false);

  const loadCommunes = useCallback(async () => {
    if (!selectedProvinceData || !selectedDistrictData) return;

    const cacheKey = `${selectedProvinceData.id}-${selectedDistrictData.id}`;

    // Prevent Strict Mode from triggering duplicate fetches
    if (communesFetchInitiatedRef.current) {
      console.log(`[useLocationData] loadCommunes(${cacheKey}) already initiated - skipping (Strict Mode)`);
      return;
    }

    console.log(`[useLocationData] loadCommunes(${cacheKey}) - cache:`, !!communesCache[cacheKey], 'promise:', !!communePromises[cacheKey]);

    // Check cache first
    if (communesCache[cacheKey]) {
      console.log(`[useLocationData] Using cached communes for ${cacheKey}`);
      const formattedCommunes = communesCache[cacheKey].map(commune => ({
        value: commune.id.toString(),
        label: commune.communeNameKh || commune.commune_name_kh || commune.commune_name_en || `Commune ${commune.id}`,
        labelKh: commune.communeNameKh || commune.commune_name_kh,
        labelEn: commune.commune_name_en,
        code: commune.communeCode || commune.commune_code,
        originalData: commune
      }));
      setCommunes(formattedCommunes);
      return;
    }

    // Check if already fetching
    if (communePromises[cacheKey]) {
      try {
        await communePromises[cacheKey];
        return loadCommunes();
      } catch {
        // Continue with new request
      }
    }

    communesFetchInitiatedRef.current = true;
    setLoadingCommunes(true);
    try {
      // Create and store promise immediately to prevent race conditions
      // This ensures simultaneous calls to the same district use the same request
      if (!communePromises[cacheKey]) {
        console.log(`[useLocationData] Making API call for communes in ${cacheKey}`);
        communePromises[cacheKey] = locationService.getCommunesByDistrict(
          selectedProvinceData.id,
          selectedDistrictData.id
        );
      } else {
        console.log(`[useLocationData] Reusing existing promise for communes in ${cacheKey}`);
      }
      const data = await communePromises[cacheKey];

      // Cache the raw data
      communesCache[cacheKey] = Array.isArray(data) ? data : [];

      const formattedCommunes = communesCache[cacheKey].map(commune => ({
        value: commune.id.toString(),
        label: commune.communeNameKh || commune.commune_name_kh || commune.commune_name_en || `Commune ${commune.id}`,
        labelKh: commune.communeNameKh || commune.commune_name_kh,
        labelEn: commune.commune_name_en,
        code: commune.communeCode || commune.commune_code,
        originalData: commune
      }));
      setCommunes(formattedCommunes);
      notifyCommunes(cacheKey, formattedCommunes);
    } catch (error) {
      console.error('Error loading communes:', error);
      showError(t('errorFetchingData'));
      communesCache[cacheKey] = [];
    } finally {
      setLoadingCommunes(false);
      // Don't clear promise - keep it for subsequent calls to reuse
      // This ensures multiple rapid calls to the same district use the same API request
    }
  }, [selectedProvinceData, selectedDistrictData, showError, t]);

  // Load communes when district changes
  useEffect(() => {
    // Reset the fetch flag when district changes so we can fetch new data
    communesFetchInitiatedRef.current = false;

    if (selectedDistrictData) {
      loadCommunes();
    } else {
      setCommunes([]);
      setSelectedCommune('');
      setSelectedVillage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrictData, selectedProvinceData]); // Re-fetch when district or province changes

  // Track if we've already initiated a fetch for villages (to prevent Strict Mode doubles)
  const villagesFetchInitiatedRef = useRef(false);

  const loadVillages = useCallback(async () => {
    if (!selectedProvinceData || !selectedDistrictData || !selectedCommuneData) return;

    const cacheKey = `${selectedProvinceData.id}-${selectedDistrictData.id}-${selectedCommuneData.id}`;

    // Prevent Strict Mode from triggering duplicate fetches
    if (villagesFetchInitiatedRef.current) {
      console.log(`[useLocationData] loadVillages(${cacheKey}) already initiated - skipping (Strict Mode)`);
      return;
    }

    console.log(`[useLocationData] loadVillages(${cacheKey}) - cache:`, !!villagesCache[cacheKey], 'promise:', !!villagePromises[cacheKey]);

    // Check cache first
    if (villagesCache[cacheKey]) {
      console.log(`[useLocationData] Using cached villages for ${cacheKey}`);
      const formattedVillages = villagesCache[cacheKey].map(village => ({
        value: village.id.toString(),
        label: village.villageNameKh || village.village_name_kh || village.village_name_en || `Village ${village.id}`,
        labelKh: village.villageNameKh || village.village_name_kh,
        labelEn: village.village_name_en,
        code: village.villageCode || village.village_code,
        originalData: village
      }));
      setVillages(formattedVillages);
      return;
    }

    // Check if already fetching
    if (villagePromises[cacheKey]) {
      try {
        await villagePromises[cacheKey];
        return loadVillages();
      } catch {
        // Continue with new request
      }
    }

    villagesFetchInitiatedRef.current = true;
    setLoadingVillages(true);
    try {
      // Create and store promise immediately to prevent race conditions
      // This ensures simultaneous calls to the same commune use the same request
      if (!villagePromises[cacheKey]) {
        console.log(`[useLocationData] Making API call for villages in ${cacheKey}`);
        villagePromises[cacheKey] = locationService.getVillagesByCommune(
          selectedProvinceData.id,
          selectedDistrictData.id,
          selectedCommuneData.id
        );
      } else {
        console.log(`[useLocationData] Reusing existing promise for villages in ${cacheKey}`);
      }
      const data = await villagePromises[cacheKey];

      // Cache the raw data
      villagesCache[cacheKey] = Array.isArray(data) ? data : [];

      const formattedVillages = villagesCache[cacheKey].map(village => ({
        value: village.id.toString(),
        label: village.villageNameKh || village.village_name_kh || village.village_name_en || `Village ${village.id}`,
        labelKh: village.villageNameKh || village.village_name_kh,
        labelEn: village.village_name_en,
        code: village.villageCode || village.village_code,
        originalData: village
      }));
      setVillages(formattedVillages);
      notifyVillages(cacheKey, formattedVillages);
    } catch (error) {
      console.error('Error loading villages:', error);
      showError(t('errorFetchingData'));
      villagesCache[cacheKey] = [];
    } finally {
      setLoadingVillages(false);
      // Don't clear promise - keep it for subsequent calls to reuse
      // This ensures multiple rapid calls to the same commune use the same API request
    }
  }, [selectedProvinceData, selectedDistrictData, selectedCommuneData, showError, t]);

  // Load villages when commune changes
  useEffect(() => {
    // Reset the fetch flag when commune changes so we can fetch new data
    villagesFetchInitiatedRef.current = false;

    if (selectedCommuneData) {
      loadVillages();
    } else {
      setVillages([]);
      setSelectedVillage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCommuneData, selectedDistrictData, selectedProvinceData]); // Re-fetch when commune, district, or province changes

  const handleProvinceChange = useCallback((value) => {
    setSelectedProvince(value);

    // Find and store the selected province data
    const provinceData = provinces.find(p => p.value === value);
    setSelectedProvinceData(provinceData?.originalData || null);

    // Reset dependent selections
    setSelectedDistrict('');
    setSelectedCommune('');
    setSelectedVillage('');
    setSelectedDistrictData(null);
    setSelectedCommuneData(null);
    setDistricts([]);
    setCommunes([]);
    setVillages([]);
  }, [provinces]);

  const handleDistrictChange = useCallback((value) => {
    setSelectedDistrict(value);

    // Find and store the selected district data
    const districtData = districts.find(d => d.value === value);
    setSelectedDistrictData(districtData?.originalData || null);

    // Reset dependent selections
    setSelectedCommune('');
    setSelectedVillage('');
    setSelectedCommuneData(null);
    setCommunes([]);
    setVillages([]);
  }, [districts]);

  const handleCommuneChange = useCallback((value) => {
    setSelectedCommune(value);

    // Find and store the selected commune data
    const communeData = communes.find(c => c.value === value);
    setSelectedCommuneData(communeData?.originalData || null);

    // Reset dependent selections
    setSelectedVillage('');
    setVillages([]);
  }, [communes]);

  const handleVillageChange = useCallback((value) => {
    setSelectedVillage(value);
  }, []);

  // Get option arrays with loading placeholders
  const getProvinceOptions = () => {
    if (loadingProvinces) {
      return [{ value: '', label: t('loadingProvinces'), disabled: true }];
    }
    return provinces;
  };

  const getDistrictOptions = () => {
    if (loadingDistricts) {
      return [{ value: '', label: t('loadingDistricts'), disabled: true }];
    }
    if (!selectedProvince) {
      return [];
    }
    return districts;
  };

  const getCommuneOptions = () => {
    if (loadingCommunes) {
      return [{ value: '', label: t('loadingCommunes'), disabled: true }];
    }
    if (!selectedDistrict) {
      return [];
    }
    return communes;
  };

  const getVillageOptions = () => {
    if (loadingVillages) {
      return [{ value: '', label: t('loadingVillages'), disabled: true }];
    }
    if (!selectedCommune) {
      return [];
    }
    return villages;
  };

  // Get selected location names for display
  const getSelectedLocationNames = () => {
    return {
      provinceName: provinces.find(p => p.value === selectedProvince)?.label || '',
      districtName: districts.find(d => d.value === selectedDistrict)?.label || '',
      communeName: communes.find(c => c.value === selectedCommune)?.label || '',
      villageName: villages.find(v => v.value === selectedVillage)?.label || ''
    };
  };

  // Reset all selections
  const resetSelections = useCallback(() => {
    setSelectedProvince('');
    setSelectedDistrict('');
    setSelectedCommune('');
    setSelectedVillage('');
    setSelectedProvinceData(null);
    setSelectedDistrictData(null);
    setSelectedCommuneData(null);
    setDistricts([]);
    setCommunes([]);
    setVillages([]);
  }, []);

  // Set initial values from props with optimized parallel loading
  const setInitialValues = useCallback(async (values) => {
    // Wait for provinces to load if they haven't yet (this handles the case where setInitialValues is called before provinces are loaded)
    let provincesList = provinces;
    if (provincesList.length === 0 && provincesCache) {
      // Use cache if available while waiting for state to update
      const formattedProvinces = provincesCache.map(province => ({
        value: province.id.toString(),
        label: language === 'km'
          ? (province.provinceNameKh || province.province_name_kh || province.province_name_en || `Province ${province.id}`)
          : (province.province_name_en || province.provinceNameKh || province.province_name_kh || `Province ${province.id}`),
        labelKh: province.provinceNameKh || province.province_name_kh,
        labelEn: province.province_name_en,
        code: province.provinceCode || province.province_code,
        originalData: province
      }));
      provincesList = formattedProvinces;
    }

    // Skip if provinces haven't loaded yet
    if (provincesList.length === 0) return;

    if (!values.provinceId) return;

    const provinceId = values.provinceId.toString();
    setSelectedProvince(provinceId);

    // Set provinces list in state so dropdown displays them
    if (provinces.length === 0 && provincesList.length > 0) {
      setProvinces(provincesList);
    }

    // Find and set province data
    const provinceData = provincesList.find(p => p.value === provinceId);
    if (!provinceData) return;

    setSelectedProvinceData(provinceData.originalData);

    try {
      // Always load districts first
      const districtData = await locationService.getDistrictsByProvince(values.provinceId);
      const formattedDistricts = Array.isArray(districtData) ? districtData.map(district => ({
        value: district.id.toString(),
        label: district.districtNameKh || district.district_name_kh || district.district_name_en || `District ${district.id}`,
        labelKh: district.districtNameKh || district.district_name_kh,
        labelEn: district.district_name_en,
        code: district.districtCode || district.district_code,
        originalData: district
      })) : [];
      setDistricts(formattedDistricts);

      // Set district if provided
      if (values.districtId) {
        const districtId = values.districtId.toString();
        setSelectedDistrict(districtId);

        const districtDataObj = formattedDistricts.find(d => d.value === districtId);
        if (districtDataObj) {
          setSelectedDistrictData(districtDataObj.originalData);

          // Prepare parallel API calls for communes and villages if we have all required data
          const apiCalls = [];

          // Load communes if commune or village is provided
          if (values.communeId || values.villageId) {
            const communeCall = locationService.getCommunesByDistrict(
              values.provinceId,
              districtDataObj.originalData.id
            ).then(communeData => {
              const formattedCommunes = Array.isArray(communeData) ? communeData.map(commune => ({
                value: commune.id.toString(),
                label: commune.communeNameKh || commune.commune_name_kh || commune.commune_name_en || `Commune ${commune.id}`,
                labelKh: commune.communeNameKh || commune.commune_name_kh,
                labelEn: commune.commune_name_en,
                code: commune.communeCode || commune.commune_code,
                originalData: commune
              })) : [];
              setCommunes(formattedCommunes);

              if (values.communeId) {
                const communeId = values.communeId.toString();
                setSelectedCommune(communeId);

                const communeDataObj = formattedCommunes.find(c => c.value === communeId);
                if (communeDataObj) {
                  setSelectedCommuneData(communeDataObj.originalData);
                  return communeDataObj.originalData;
                }
              }
              return null;
            });
            apiCalls.push(communeCall);
          }

          // Execute API calls in parallel
          if (apiCalls.length > 0) {
            const [communeDataObj] = await Promise.all(apiCalls);

            // Load villages if provided and we have commune data
            if (values.villageId && communeDataObj) {
              try {
                const villageData = await locationService.getVillagesByCommune(
                  values.provinceId,
                  districtDataObj.originalData.id,
                  communeDataObj.id
                );
                const formattedVillages = Array.isArray(villageData) ? villageData.map(village => ({
                  value: village.id.toString(),
                  label: village.villageNameKh || village.village_name_kh || village.village_name_en || `Village ${village.id}`,
                  labelKh: village.villageNameKh || village.village_name_kh,
                  labelEn: village.village_name_en,
                  code: village.villageCode || village.village_code,
                  originalData: village
                })) : [];
                setVillages(formattedVillages);

                if (values.villageId) {
                  const villageId = values.villageId.toString();
                  setSelectedVillage(villageId);
                }
              } catch (error) {
                console.error('Error loading initial villages:', error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading initial location data:', error);
    }
  }, [provinces]);

  return {
    // Data
    provinces,
    districts,
    communes,
    villages,

    // Loading states
    loadingProvinces,
    loadingDistricts,
    loadingCommunes,
    loadingVillages,

    // Selected values
    selectedProvince,
    selectedDistrict,
    selectedCommune,
    selectedVillage,

    // Change handlers
    handleProvinceChange,
    handleDistrictChange,
    handleCommuneChange,
    handleVillageChange,

    // Option getters with loading states
    getProvinceOptions,
    getDistrictOptions,
    getCommuneOptions,
    getVillageOptions,

    // Utility functions
    getSelectedLocationNames,
    resetSelections,
    setInitialValues,

    // Manual refresh functions
    loadProvinces,
    loadDistricts: () => selectedProvince && loadDistricts(selectedProvince),
    loadCommunes,
    loadVillages
  };
};