// Custom hook for managing location data (provinces, districts, communes, villages)
import { useState, useEffect, useCallback, useRef } from 'react';
import locationService from '../utils/api/services/locationService';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useStableCallback } from '../utils/reactOptimization';

// Create a shared cache for provinces to avoid duplicate API calls
let provincesCache = null;
let provincesPromise = null;

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

  // Re-format labels when language changes - optimized to prevent infinite loops
  const prevLanguageRef = useRef(language);
  
  // Only update labels when language actually changes, not when arrays change
  useEffect(() => {
    if (prevLanguageRef.current !== language) {
      prevLanguageRef.current = language;
      
      // Update provinces labels if they exist
      if (provinces.length > 0) {
        setProvinces(prevProvinces => 
          prevProvinces.map(province => ({
            ...province,
            label: language === 'km' 
              ? (province.labelKh || province.labelEn || `Province ${province.value}`)
              : (province.labelEn || province.labelKh || `Province ${province.value}`)
          }))
        );
      }
      
      // Update districts labels if they exist
      if (districts.length > 0) {
        setDistricts(prevDistricts => 
          prevDistricts.map(district => ({
            ...district,
            label: language === 'km' 
              ? (district.labelKh || district.labelEn || `District ${district.value}`)
              : (district.labelEn || district.labelKh || `District ${district.value}`)
          }))
        );
      }
      
      // Update communes labels if they exist
      if (communes.length > 0) {
        setCommunes(prevCommunes => 
          prevCommunes.map(commune => ({
            ...commune,
            label: language === 'km' 
              ? (commune.labelKh || commune.labelEn || `Commune ${commune.value}`)
              : (commune.labelEn || commune.labelKh || `Commune ${commune.value}`)
          }))
        );
      }
      
      // Update villages labels if they exist
      if (villages.length > 0) {
        setVillages(prevVillages => 
          prevVillages.map(village => ({
            ...village,
            label: language === 'km' 
              ? (village.labelKh || village.labelEn || `Village ${village.value}`)
              : (village.labelEn || village.labelKh || `Village ${village.value}`)
          }))
        );
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);


  const loadProvinces = useStableCallback(async () => {
    // Use cached provinces if available
    if (provincesCache) {
      const formattedProvinces = provincesCache.map(province => ({
        value: province.id.toString(),
        label: language === 'km' 
          ? (province.province_name_kh || province.province_name_en || `Province ${province.id}`)
          : (province.province_name_en || province.province_name_kh || `Province ${province.id}`),
        labelKh: province.province_name_kh,
        labelEn: province.province_name_en,
        code: province.province_code,
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
      provincesPromise = locationService.getProvinces();
      const data = await provincesPromise;
      
      // Cache the raw data
      provincesCache = Array.isArray(data) ? data : [];
      
      const formattedProvinces = provincesCache.map(province => ({
        value: province.id.toString(),
        label: language === 'km' 
          ? (province.province_name_kh || province.province_name_en || `Province ${province.id}`)
          : (province.province_name_en || province.province_name_kh || `Province ${province.id}`),
        labelKh: province.province_name_kh,
        labelEn: province.province_name_en,
        code: province.province_code,
        originalData: province
      }));
      setProvinces(formattedProvinces);
    } catch (error) {
      console.error('Error loading provinces:', error);
      showError(t('errorFetchingData'));
      provincesCache = [];
    } finally {
      setLoadingProvinces(false);
      provincesPromise = null;
    }
  }, [showError, t, language]);

  // Load provinces on mount
  useEffect(() => {
    loadProvinces();
  }, [loadProvinces]);


  const loadDistricts = useStableCallback(async (provinceId) => {
    setLoadingDistricts(true);
    try {
      const data = await locationService.getDistrictsByProvince(provinceId);
      const formattedDistricts = Array.isArray(data) ? data.map(district => ({
        value: district.id.toString(),
        label: language === 'km' 
          ? (district.district_name_kh || district.district_name_en || `District ${district.id}`)
          : (district.district_name_en || district.district_name_kh || `District ${district.id}`),
        labelKh: district.district_name_kh,
        labelEn: district.district_name_en,
        code: district.district_code,
        originalData: district
      })) : [];
      setDistricts(formattedDistricts);
    } catch (error) {
      console.error('Error loading districts:', error);
      showError(t('errorFetchingData'));
    } finally {
      setLoadingDistricts(false);
    }
  }, [showError, t, language]);

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
  }, [selectedProvince, loadDistricts]);

  const loadCommunes = useCallback(async () => {
    if (!selectedProvinceData || !selectedDistrictData) return;
    
    setLoadingCommunes(true);
    try {
      const data = await locationService.getCommunesByDistrict(
        selectedProvinceData.id, 
        selectedDistrictData.district_code
      );
      const formattedCommunes = Array.isArray(data) ? data.map(commune => ({
        value: commune.id.toString(),
        label: language === 'km' 
          ? (commune.commune_name_kh || commune.commune_name_en || `Commune ${commune.id}`)
          : (commune.commune_name_en || commune.commune_name_kh || `Commune ${commune.id}`),
        labelKh: commune.commune_name_kh,
        labelEn: commune.commune_name_en,
        code: commune.commune_code,
        originalData: commune
      })) : [];
      setCommunes(formattedCommunes);
    } catch (error) {
      console.error('Error loading communes:', error);
      showError(t('errorFetchingData'));
    } finally {
      setLoadingCommunes(false);
    }
  }, [selectedProvinceData, selectedDistrictData, showError, t, language]);

  // Load communes when district changes
  useEffect(() => {
    if (selectedDistrictData) {
      loadCommunes();
    } else {
      setCommunes([]);
      setSelectedCommune('');
      setSelectedVillage('');
    }
  }, [selectedDistrictData, loadCommunes]);

  const loadVillages = useCallback(async () => {
    if (!selectedProvinceData || !selectedDistrictData || !selectedCommuneData) return;
    
    setLoadingVillages(true);
    try {
      const data = await locationService.getVillagesByCommune(
        selectedProvinceData.id,
        selectedDistrictData.district_code,
        selectedCommuneData.commune_code
      );
      const formattedVillages = Array.isArray(data) ? data.map(village => ({
        value: village.id.toString(),
        label: language === 'km' 
          ? (village.village_name_kh || village.village_name_en || `Village ${village.id}`)
          : (village.village_name_en || village.village_name_kh || `Village ${village.id}`),
        labelKh: village.village_name_kh,
        labelEn: village.village_name_en,
        code: village.village_code,
        originalData: village
      })) : [];
      setVillages(formattedVillages);
    } catch (error) {
      console.error('Error loading villages:', error);
      showError(t('errorFetchingData'));
    } finally {
      setLoadingVillages(false);
    }
  }, [selectedProvinceData, selectedDistrictData, selectedCommuneData, showError, t, language]);

  // Load villages when commune changes
  useEffect(() => {
    if (selectedCommuneData) {
      loadVillages();
    } else {
      setVillages([]);
      setSelectedVillage('');
    }
  }, [selectedCommuneData, loadVillages]);

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
    // Skip if provinces haven't loaded yet
    if (provinces.length === 0) return;
    
    if (!values.provinceId) return;
    
    const provinceId = values.provinceId.toString();
    setSelectedProvince(provinceId);
    
    // Find and set province data
    const provinceData = provinces.find(p => p.value === provinceId);
    if (!provinceData) return;
    
    setSelectedProvinceData(provinceData.originalData);
    
    try {
      // Always load districts first
      const districtData = await locationService.getDistrictsByProvince(values.provinceId);
      const formattedDistricts = Array.isArray(districtData) ? districtData.map(district => ({
        value: district.id.toString(),
        label: language === 'km' 
          ? (district.district_name_kh || district.district_name_en || `District ${district.id}`)
          : (district.district_name_en || district.district_name_kh || `District ${district.id}`),
        labelKh: district.district_name_kh,
        labelEn: district.district_name_en,
        code: district.district_code,
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
              districtDataObj.originalData.district_code
            ).then(communeData => {
              const formattedCommunes = Array.isArray(communeData) ? communeData.map(commune => ({
                value: commune.id.toString(),
                label: language === 'km' 
                  ? (commune.commune_name_kh || commune.commune_name_en || `Commune ${commune.id}`)
                  : (commune.commune_name_en || commune.commune_name_kh || `Commune ${commune.id}`),
                labelKh: commune.commune_name_kh,
                labelEn: commune.commune_name_en,
                code: commune.commune_code,
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
                  districtDataObj.originalData.district_code,
                  communeDataObj.commune_code
                );
                const formattedVillages = Array.isArray(villageData) ? villageData.map(village => ({
                  value: village.id.toString(),
                  label: language === 'km' 
                    ? (village.village_name_kh || village.village_name_en || `Village ${village.id}`)
                    : (village.village_name_en || village.village_name_kh || `Village ${village.id}`),
                  labelKh: village.village_name_kh,
                  labelEn: village.village_name_en,
                  code: village.village_code,
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
  }, [provinces, language]);

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