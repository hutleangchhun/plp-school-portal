import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import locationService from '../../utils/api/services/locationService';
import schoolService from '../../utils/api/services/schoolService';
import { userService } from '../../utils/api/services/userService';
import Dropdown from '../../components/ui/Dropdown';
import SearchableDropdown from '../../components/ui/SearchableDropdown';
import Table from '../../components/ui/Table';
import { SquarePen, Building2, Users, Phone, Mail, ExternalLink, User, GraduationCap, Search, X } from 'lucide-react';

const SchoolLookup = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Location and school states
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [schools, setSchools] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');

  const [loading, setLoading] = useState(false);
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  // Teacher states
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('8'); // Default to teachers (8 = teacher, 14 = director)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [showUsers, setShowUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const limit = 10;

  // Load provinces on component mount
  useEffect(() => {
    loadProvinces();
  }, []);

  const loadProvinces = async () => {
    try {
      setLoading(true);
      const response = await locationService.getProvinces();
      console.log('Provinces response:', response);

      // Handle response format from locationService
      if (response && (response.data || Array.isArray(response))) {
        const provincesData = response.data || response;
        console.log('Provinces data structure:', provincesData[0]); // Log first province structure
        setProvinces(provincesData);
      }
    } catch (error) {
      console.error('Error loading provinces:', error);
      console.error('Province error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert(t('មិនអាចផ្ទុកបញ្ជីខេត្តបាន', 'Unable to load provinces'));
    } finally {
      setLoading(false);
    }
  };

  const loadDistricts = async (provinceId) => {
    try {
      setLoading(true);

      // Validate province ID
      if (!provinceId || provinceId === '') {
        throw new Error('Province ID is required');
      }

      // Find the selected province object to get more info
      const selectedProvinceObj = provinces.find(p => p.id == provinceId);
      console.log('Selected province object:', selectedProvinceObj);

      // Ensure provinceId is a numeric string
      const provinceIdStr = String(provinceId);
      if (!/^\d+$/.test(provinceIdStr)) {
        throw new Error(`Invalid province ID format: ${provinceIdStr}`);
      }

      console.log('Loading districts for province ID:', provinceIdStr);
      console.log('API URL will be:', `/locations/districts?province_id=${provinceIdStr}`);
      const response = await locationService.getDistrictsByProvince(provinceIdStr);
      console.log('Districts response:', response);
      console.log('Districts response type:', typeof response);
      console.log('Districts response keys:', Object.keys(response || {}));

      // Handle response format from locationService
      if (response && (response.data || Array.isArray(response))) {
        const districtsData = response.data || response;
        console.log('Districts data:', districtsData);
        console.log('Districts data length:', districtsData?.length);

        // Log first district structure for debugging
        if (districtsData && districtsData.length > 0) {
          console.log('🔍 DEBUG: First district structure:', districtsData[0]);
          console.log('🔍 DEBUG: District fields:', Object.keys(districtsData[0]));
        }

        if (Array.isArray(districtsData)) {
          setDistricts(districtsData);
          console.log(`✅ Loaded ${districtsData.length} districts`);
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
    } catch (error) {
      console.error('Error loading districts:', error);
      console.error('District error details:', {
        message: error.message,
        status: error.status || error.response?.status,
        data: error.data || error.response?.data
      });

      // Don't show alert for 401/403 as these are handled by the API interceptor
      if (error.status !== 401 && error.status !== 403) {
        alert(t('មិនអាចផ្ទុកបញ្ជីស្រុកបាន', 'Unable to load districts'));
      }
    } finally {
      setLoading(false);
    }
  };


  const loadSchools = async (districtCode) => {
    if (!districtCode) {
      setSchools([]);
      return;
    }

    try {
      setSchoolsLoading(true);

      // Find the district object
      const districtObj = districts.find(d => d.district_code === districtCode);
      console.log('🔍 DEBUG: Found district object:', districtObj);

      if (!districtObj) {
        console.error('❌ District not found in districts list');
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
        console.error('❌ No valid district ID found in:', districtObj);
        throw new Error('District ID is missing from district object');
      }

      console.log('🔍 DEBUG: Loading schools for district ID:', districtId);
      const response = await schoolService.getSchoolsByDistrict(districtId);
      console.log('Schools by district response:', response);

      if (response && response.data) {
        setSchools(response.data);
        console.log(`✅ Found ${response.data.length} schools in district`);
      } else {
        console.warn('No schools data in response');
        setSchools([]);
      }
    } catch (error) {
      console.error('Error loading schools:', error);

      // Don't show alert for 401/403 as these are handled by the API interceptor
      if (error.status !== 401 && error.status !== 403) {
        alert(t('មានបញ្ហាក្នុងការផ្ទុកសាលារៀន', 'Error loading schools'));
      }
      setSchools([]);
    } finally {
      setSchoolsLoading(false);
    }
  };

  const handleProvinceChange = (provinceId) => {
    setSelectedProvince(provinceId);
    setSelectedDistrict('');
    setSelectedSchool('');
    setShowUsers(false);
    setUsers([]);

    if (provinceId) {
      loadDistricts(provinceId);
    } else {
      setDistricts([]);
      setSchools([]);
    }
  };

  const handleDistrictChange = (districtCode) => {
    setSelectedDistrict(districtCode);
    setSelectedSchool('');
    setShowUsers(false);
    setUsers([]);

    if (districtCode) {
      loadSchools(districtCode);
    } else {
      setSchools([]);
    }
  };

  const handleSchoolChange = (schoolId) => {
    setSelectedSchool(schoolId);

    if (schoolId) {
      const selectedSchoolObj = schools.find(s => s.id.toString() === schoolId);
      if (selectedSchoolObj) {
        setSchoolInfo(selectedSchoolObj);
        setShowUsers(true);
        setCurrentPage(1);
        loadUsers(schoolId);
      }
    } else {
      setShowUsers(false);
      setUsers([]);
      setSchoolInfo(null);
    }
  };

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId);
    setCurrentPage(1);
    if (selectedSchool) {
      loadUsers(selectedSchool, roleId);
    }
  };

  // User-related functions (Teachers and Directors)
  const loadUsers = useCallback(async (schoolId, roleId = selectedRole) => {
    try {
      setUsersLoading(true);

      const params = {
        page: currentPage,
        limit: limit,
        roleId: roleId || selectedRole
      };

      const response = await userService.getPublicSchoolUsers(schoolId, params);
      console.log('Users response:', response);

      if (response && response.data) {
        setUsers(response.data);
        setTotalPages(response.totalPages || 1);
        setTotalUsers(response.total || 0);

        // Update school info if available
        if (response.schoolInfo) {
          setSchoolInfo({
            id: response.schoolInfo.schoolId,
            name: response.schoolInfo.name
          });
        }
      } else {
        setUsers([]);
        setTotalPages(1);
        setTotalUsers(0);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);

      // Don't show alert for 401/403 as these are handled by the API interceptor
      if (error.status !== 401 && error.status !== 403) {
        alert(t('មានបញ្ហាក្នុងការផ្ទុកបញ្ជីប្រើប្រាស់', 'Error loading users'));
      }
    } finally {
      setUsersLoading(false);
    }
  }, [currentPage, limit, selectedRole, t]);


  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRowClick = (teacher) => {
    // Navigate to login page with username pre-filled
    navigate(`/login?username=${encodeURIComponent(teacher.username)}`);
  };

  // Load users when page changes or school is selected
  useEffect(() => {
    if (selectedSchool && showUsers) {
      loadUsers(selectedSchool);
    }
  }, [currentPage, selectedSchool, showUsers]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users;
    }

    const query = searchQuery.toLowerCase().trim();
    return users.filter(user => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
      const username = (user.username || '').toLowerCase();
      const email = (user.email || '').toLowerCase();

      return fullName.includes(query) || username.includes(query) || email.includes(query);
    });
  }, [users, searchQuery]);

  // Define table columns for teachers
  const teacherColumns = [
    {
      key: 'name',
      header: t('name', 'Name'),
      accessor: 'name',
      render: (teacher) => (
        <div className="font-medium text-gray-900">
          {`${teacher.first_name || ''} ${teacher.last_name || ''}`.trim()}
        </div>
      )
    },
    {
      key: 'username',
      header: t('username', 'Username'),
      accessor: 'username',
      render: (teacher) => (
        <span className="font-mono text-xs text-gray-600">
          {teacher.username}
        </span>
      )
    },
    {
      key: 'role',
      header: t('role', 'Role'),
      accessor: 'roleNameKh',
      render: (teacher) => {
        const isDirector = teacher.roleId === 14;
        const roleText = isDirector ? 'នាយក' : 'គ្រូបង្រៀន';
        const bgColor = isDirector ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';

        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${bgColor}`}>
            <span>{roleText}</span>
          </span>
        );
      }
    },
  ];

  // Pagination object for Table component
  const pagination = {
    page: currentPage,
    pages: totalPages,
    total: totalUsers,
    limit: limit
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-green-500 p-4 rounded-full shadow-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4">
            ស្វែងរកគណនីសម្រាប់គ្រូ
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 leading-relaxed">
            កន្លែងស្វែងរកគណនីសម្រាប់គ្រូបង្រៀនប្រើប្រាស់នៅក្នុងប្រព័ន្ធគ្រប់គ្រងសាលារៀន
          </p>
          <div className="mt-6 h-1 w-24 bg-gradient-to-r from-blue-500 to-green-500 mx-auto rounded-full"></div>
        </div>

        {/* Filter Form */}
        <div className=" p-8 mb-12 border border-gray-100 bg-white rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Province Selection */}
            <div className="space-y-3">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                {t('province', 'Province')} *
              </label>
              <Dropdown
                value={selectedProvince}
                onValueChange={handleProvinceChange}
                options={provinces.map((province) => ({
                  value: province.id.toString(),
                  label: province.province_name_kh || province.province_name_en
                }))}
                placeholder={t('selectProvince', 'Select Province')}
                disabled={loading}
                className="w-full h-12 text-base"
                minWidth="w-full"
              />
            </div>

            {/* District Selection */}
            <div className="space-y-3">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                {t('district', 'District')} *
              </label>
              <Dropdown
                value={selectedDistrict}
                onValueChange={handleDistrictChange}
                options={districts.map((district) => ({
                  value: district.district_code,
                  label: district.district_name_kh || district.district_name_en
                }))}
                placeholder={t('selectDistrict', 'Select District')}
                disabled={loading || !selectedProvince}
                className="w-full h-12 text-base"
                minWidth="w-full"
              />
            </div>

            {/* School Selection */}
            <div className="space-y-3">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                {t('school', 'School')} *
              </label>
              <SearchableDropdown
                value={selectedSchool}
                onValueChange={handleSchoolChange}
                options={schools.map((school) => ({
                  value: school.id.toString(),
                  label: school.name
                }))}
                placeholder={t('selectSchool', 'Select School')}
                searchPlaceholder={t('searchSchool', 'Search schools...')}
                disabled={schoolsLoading || !selectedDistrict}
                isLoading={schoolsLoading}
                className="w-full h-12 text-base"
                minWidth="w-full"
                emptyMessage={t('noSchoolsFound', 'No schools found')}
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                {t('role', 'Role')}
              </label>
              <Dropdown
                value={selectedRole}
                onValueChange={handleRoleChange}
                options={[
                  { value: '8', label: 'គ្រូបង្រៀន (Teachers)' },
                  { value: '14', label: 'នាយក (Directors)' }
                ]}
                placeholder={t('selectRole', 'Select Role')}
                disabled={!selectedSchool}
                className="w-full h-12 text-base"
                minWidth="w-full"
              />
            </div>
          </div>
          {/* Instructions Card */}
          {!showUsers && (
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-md p-8 border border-blue-100 mt-4">
              <div className="">
                <div className='flex justify-start gap-2 items-center '>
                  <div className="bg-blue-600 p-2 rounded-md">
                    <SquarePen className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">
                      របៀបប្រើប្រាស់
                    </h3>
                  </div>
                </div>
                <div className="p-3 space-y-3 text-gray-600 text-start">
                  <ul className='list-disc pl-6 space-y-2 text-gray-700'>
                    <li>ជ្រើសរើសខេត្ត</li>
                    <li>ជ្រើសរើសស្រុក</li>
                    <li>ជ្រើសរើសសាលារៀន</li>
                    <li>មើលបញ្ជីប្រើប្រាស់</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          {/* Users Section */}
          {showUsers && schoolInfo && (
            <div className="space-y-8 mt-4">
              {/* Search Bar */}
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-2 uppercase">{t('search', 'Search')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-blue-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition-colors"
                    placeholder={t('search', 'Search ...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      title={t('clearSearch', 'Clear search')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-md overflow-hidden border border-gray-100">
                <div className=" px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-base font-semibold text-gray-800">
                        {selectedRole === '14' ? 'បញ្ជីនាយក' : 'បញ្ជីគ្រូបង្រៀន'}
                      </h3>
                      <span className="text-sm text-gray-500">
                        ({filteredUsers.length} / {totalUsers})
                      </span>
                    </div>
                  </div>
                </div>

                <Table
                  columns={teacherColumns}
                  data={filteredUsers}
                  loading={usersLoading}
                  emptyMessage={searchQuery ? t('noUsersFound', 'No users match your search') : 'មិនមានប្រើប្រាស់ក្នុងសាលារៀននេះទេ'}
                  emptyIcon={Users}
                  emptyVariant="neutral"
                  showPagination={totalPages > 1}
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  onRowClick={handleRowClick}
                  rowClassName="cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 transition-all duration-200"
                  t={t}
                  enableSort={true}
                  stickyHeader={false}
                  className="border-0 shadow-none"
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SchoolLookup;
