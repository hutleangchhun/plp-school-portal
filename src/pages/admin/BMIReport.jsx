import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { bmiService } from '../../utils/api/services/bmiService';
import locationService from '../../utils/api/services/locationService';
import { schoolService } from '../../utils/api/services/schoolService';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import BMIDistributionChart from '../../components/charts/BMIDistributionChart';

const BMIReport = () => {
  const { t } = useLanguage();
  const { error, handleError, clearError } = useErrorHandler();

  // State management
  const [loading, setLoading] = useState(true);
  const [bmiData, setBmiData] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [academicYearOptions, setAcademicYearOptions] = useState([]);

  // BMI Dashboard state
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardFilters, setDashboardFilters] = useState({
    academicYear1: '',
    academicYear2: '',
    province: '',
    district: '',
    school: ''
  });
  const [locationOptions, setLocationOptions] = useState({
    provinces: [],
    districts: [],
    schools: []
  });

  // Generate academic year options
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -2; i <= 2; i++) {
      const year = currentYear + i;
      years.push({
        value: `${year}-${year + 1}`,
        label: `${year}-${year + 1}`
      });
    }
    setAcademicYearOptions(years);
  }, []);

  // Fetch BMI Dashboard data for growth comparison
  const fetchBmiDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      // Base location filters
      const baseParams = {};
      if (dashboardFilters.province) {
        baseParams.provinceId = dashboardFilters.province;
      }
      if (dashboardFilters.district) {
        baseParams.districtId = dashboardFilters.district;
      }
      if (dashboardFilters.school) {
        baseParams.schoolId = dashboardFilters.school;
      }

      // Fetch data for both years if selected
      const promises = [];

      if (dashboardFilters.academicYear1) {
        const params1 = { ...baseParams, academicYear: dashboardFilters.academicYear1 };
        console.log('📊 Fetching Year 1 BMI dashboard with params:', params1);
        promises.push(bmiService.getBmiDashboard('primary', params1));
      } else {
        promises.push(Promise.resolve({ success: true, data: { bmiDistribution: {} } }));
      }

      if (dashboardFilters.academicYear2) {
        const params2 = { ...baseParams, academicYear: dashboardFilters.academicYear2 };
        console.log('📊 Fetching Year 2 BMI dashboard with params:', params2);
        promises.push(bmiService.getBmiDashboard('primary', params2));
      } else {
        promises.push(Promise.resolve({ success: true, data: { bmiDistribution: {} } }));
      }

      const [response1, response2] = await Promise.all(promises);

      if (response1.success && response2.success) {
        // Combine both years' data
        setDashboardData({
          bmiDistribution: {
            year1: response1.data?.bmiDistribution || {},
            year2: response2.data?.bmiDistribution || {}
          }
        });
      } else {
        throw new Error('Failed to fetch BMI dashboard data');
      }
    } catch (err) {
      console.error('Error fetching BMI dashboard:', err);
      handleError(err, {
        toastMessage: t('failedToLoadBMIDashboard', 'Failed to load BMI dashboard')
      });
    } finally {
      setDashboardLoading(false);
    }
  }, [dashboardFilters, handleError, t]);

  // Fetch provinces
  const fetchProvinces = useCallback(async () => {
    try {
      const response = await locationService.getProvinces();
      console.log('Provinces response:', response);

      // Handle different response formats
      let provincesList = [];
      if (response && response.data) {
        provincesList = Array.isArray(response.data) ? response.data : response.data.data || [];
      } else if (Array.isArray(response)) {
        provincesList = response;
      }

      if (provincesList.length > 0) {
        const provinces = provincesList.map(p => ({
          value: (p.id || p.province_id).toString(),
          label: p.province_name_kh || p.province_name_en || p.name || p.province_name || 'Unknown'
        }));
        setLocationOptions(prev => ({
          ...prev,
          provinces
        }));
        console.log('Provinces set:', provinces);
      }
    } catch (err) {
      console.error('Error fetching provinces:', err);
    }
  }, []);

  // Fetch districts based on selected province
  const fetchDistricts = useCallback(async (provinceId) => {
    if (!provinceId) {
      setLocationOptions(prev => ({
        ...prev,
        districts: [],
        schools: []
      }));
      return;
    }

    try {
      const response = await locationService.getDistrictsByProvince(provinceId);
      console.log('Districts response:', response);

      // Handle different response formats
      let districtsList = [];
      if (response && response.data) {
        districtsList = Array.isArray(response.data) ? response.data : response.data.data || [];
      } else if (Array.isArray(response)) {
        districtsList = response;
      }

      if (districtsList.length > 0) {
        const districts = districtsList.map(d => ({
          value: (d.id || d.district_id).toString(),
          label: d.district_name_kh || d.district_name_en || d.name || d.district_name || 'Unknown'
        }));
        setLocationOptions(prev => ({
          ...prev,
          districts,
          schools: []
        }));
      }
    } catch (err) {
      console.error('Error fetching districts:', err);
    }
  }, []);

  // Fetch schools based on selected district
  const fetchSchools = useCallback(async (districtId) => {
    if (!districtId) {
      setLocationOptions(prev => ({
        ...prev,
        schools: []
      }));
      return;
    }

    try {
      const response = await schoolService.getSchoolsByDistrict(districtId);
      console.log('Schools response:', response);

      // Handle different response formats
      let schoolsList = [];
      if (response && response.data) {
        schoolsList = Array.isArray(response.data) ? response.data : response.data.data || [];
      } else if (Array.isArray(response)) {
        schoolsList = response;
      }

      if (schoolsList.length > 0) {
        const schools = schoolsList.map(s => ({
          value: (s.id || s.school_id).toString(),
          label: s.school_name_kh || s.school_name_en || s.name || s.school_name || 'Unknown'
        }));
        setLocationOptions(prev => ({
          ...prev,
          schools
        }));
      }
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  }, []);

  // Fetch BMI report data
  const fetchBmiReport = useCallback(async (page = 1) => {
    clearError();
    setLoading(true);

    try {
      const params = {
        page,
        limit: pagination.limit
      };

      console.log('📊 Fetching BMI report with params:', params);

      const response = await bmiService.getBmiReportAllUsers(params);

      if (response.success) {
        setBmiData(response.data || []);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            page: response.pagination.page || 1,
            total: response.pagination.total || 0,
            totalPages: response.pagination.totalPages || 1
          }));
        }
      } else {
        throw new Error(response.error || 'Failed to fetch BMI report');
      }
    } catch (err) {
      console.error('Error fetching BMI report:', err);
      handleError(err, {
        toastMessage: t('failedToLoadBMIReport', 'Failed to load BMI report')
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, clearError, handleError, t]);

  // Initial fetch
  useEffect(() => {
    fetchBmiReport(1);
  }, [fetchBmiReport]);

  // Load provinces on mount
  useEffect(() => {
    fetchProvinces();
  }, [fetchProvinces]);

  // Fetch BMI Dashboard on mount or when filters change
  useEffect(() => {
    fetchBmiDashboard();
  }, [fetchBmiDashboard]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!bmiData || bmiData.length === 0) {
      handleError(new Error('No data to export'));
      return;
    }

    try {
      // Prepare CSV headers
      const headers = [
        'User ID',
        'User Name',
        'Email',
        'Academic Year',
        'Weight (kg)',
        'Height (cm)',
        'BMI',
        'BMI Status',
        'Recorded At'
      ];

      // Prepare CSV rows
      const rows = bmiData.map(record => [
        record.userId || '-',
        record.userName || '-',
        record.email || '-',
        record.academicYear || '-',
        record.weight_kg || '-',
        record.height_cm || '-',
        typeof record.bmi === 'string' ? parseFloat(record.bmi).toFixed(2) : (record.bmi ? record.bmi.toFixed(2) : '-'),
        record.bmiStatus || '-',
        record.recordedAt ? new Date(record.recordedAt).toLocaleDateString() : '-'
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `bmi-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      handleError(err, {
        toastMessage: t('failedToExportData', 'Failed to export data')
      });
    }
  };

  // Loading state
  if (loading && bmiData.length === 0) {
    return (
      <PageLoader
        message={t('loadingBMIReport', 'Loading BMI report...')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Error state
  if (error && bmiData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back', 'Back')}
          </Button>
          <ErrorDisplay
            error={error}
            onRetry={() => fetchBmiReport(pagination.page)}
            size="lg"
            className="min-h-[400px]"
          />
        </div>
      </div>
    );
  }

  return (
    <div variant='fade' className="p-3 sm:p-4">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('bmiAnalysis', 'BMI Data Analysis')}</h1>
              <p className="text-sm text-gray-600 mt-2">{t('bmiReportDescription', 'Analys and manage BMI data for all users')}</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCSV}
              disabled={bmiData.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {t('export', 'Export')}
            </Button>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2'>
                      {/* BMI Distribution Chart with Integrated Filters */}
          <BMIDistributionChart
            dashboardData={dashboardData}
            academicYearOptions={academicYearOptions}
            dashboardFilters={dashboardFilters}
            locationOptions={locationOptions}
            onFilterChange={(field, value) => {
              if (field === 'province') {
                setDashboardFilters(prev => ({
                  ...prev,
                  province: value,
                  district: '',
                  school: ''
                }));
                // Clear districts and schools when province changes
                setLocationOptions(prev => ({
                  ...prev,
                  districts: [],
                  schools: []
                }));
                if (value) {
                  fetchDistricts(value);
                }
              } else if (field === 'district') {
                setDashboardFilters(prev => ({
                  ...prev,
                  district: value,
                  school: ''
                }));
                // Clear schools when district changes
                setLocationOptions(prev => ({
                  ...prev,
                  schools: []
                }));
                if (value) {
                  fetchSchools(value);
                }
              } else if (field === 'school') {
                setDashboardFilters(prev => ({
                  ...prev,
                  school: value
                }));
              } else if (field === 'academicYear1') {
                setDashboardFilters(prev => ({
                  ...prev,
                  academicYear1: value
                }));
              } else if (field === 'academicYear2') {
                setDashboardFilters(prev => ({
                  ...prev,
                  academicYear2: value
                }));
              }
            }}
            onClearFilters={() => {
              setDashboardFilters({
                academicYear1: '',
                academicYear2: '',
                province: '',
                district: '',
                school: ''
              });
              // Clear location options when resetting
              setLocationOptions({
                provinces: locationOptions.provinces,
                districts: [],
                schools: []
              });
            }}
            fetchDistricts={fetchDistricts}
            fetchSchools={fetchSchools}
          />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BMIReport;
