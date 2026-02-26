import React, { useState, useEffect } from 'react';
import { graphqlService } from '../../utils/api/services/graphqlService';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { BarChart3, Search, RefreshCw } from 'lucide-react';
import locationService from '../../utils/api/services/locationService';
import schoolService from '../../utils/api/services/schoolService';
import { Table } from '../../components/ui/Table';
import Dropdown from '../../components/ui/Dropdown';
import SearchableDropdown from '../../components/ui/SearchableDropdown';
import { Button } from '../../components/ui/Button';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import SidebarFilter from '../../components/ui/SidebarFilter';
import TooltipChart from '../../components/ui/TooltipChart';
import { Checkbox } from '../../components/ui/Checkbox';
import { ListFilter } from 'lucide-react';

export default function AdminUserStatistics() {
    const { t } = useLanguage();
    const { showToast } = useToast();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [chartData, setChartData] = useState([]);
    const [chartLoading, setChartLoading] = useState(true);

    // Pagination and filtering states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalRecords, setTotalRecords] = useState(0);

    const [provinceId, setProvinceId] = useState('');
    const [districtId, setDistrictId] = useState('');
    const [schoolId, setSchoolId] = useState('');

    const [noClasses, setNoClasses] = useState(false);
    const [noTeachers, setNoTeachers] = useState(false);
    const [noStudents, setNoStudents] = useState(false);

    // Locations states
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [schools, setSchools] = useState([]);

    // Sidebar state
    const [showFilters, setShowFilters] = useState(false);

    // Fetch Provinces
    useEffect(() => {
        const fetchProvinces = async () => {
            try {
                const response = await locationService.getProvinces();
                const data = Array.isArray(response) ? response : (response?.data || []);
                setProvinces(data);
            } catch (err) {
                console.error('Error fetching provinces:', err);
            }
        };
        fetchProvinces();
    }, []);

    // Fetch Districts when Province changes
    useEffect(() => {
        const fetchDistricts = async () => {
            if (!provinceId) {
                setDistricts([]);
                return;
            }
            try {
                const response = await locationService.getDistrictsByProvince(provinceId);
                const data = Array.isArray(response) ? response : (response?.data || []);
                setDistricts(data);
            } catch (err) {
                console.error('Error fetching districts:', err);
            }
        };
        fetchDistricts();
    }, [provinceId]);

    // Fetch Schools when District changes
    useEffect(() => {
        const fetchSchools = async () => {
            if (!districtId) {
                setSchools([]);
                return;
            }
            try {
                const response = await schoolService.getSchoolsByDistrict(districtId);
                const data = response?.data || [];
                setSchools(data);
            } catch (err) {
                console.error('Error fetching schools:', err);
            }
        };
        fetchSchools();
    }, [districtId]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const query = `
        query($provinceId: Int, $districtId: Int, $schoolId: Int, $noClasses: Boolean, $noTeachers: Boolean, $noStudents: Boolean, $page: Int, $limit: Int) {
          schoolStatus(
            provinceId: $provinceId
            districtId: $districtId
            schoolId: $schoolId
            noClasses: $noClasses
            noTeachers: $noTeachers
            noStudents: $noStudents
            page: $page
            limit: $limit
          ) {
            total
            page
            limit
            totalPages
            data {
              schoolId
              schoolName
              schoolCode
              classCount
              teacherCount
              studentCount
            }
          }
        }
      `;

            const variables = {
                page: parseInt(page),
                limit: parseInt(limit)
            };

            if (provinceId) variables.provinceId = parseInt(provinceId);
            if (districtId) variables.districtId = parseInt(districtId);
            if (schoolId) variables.schoolId = parseInt(schoolId);
            if (noClasses) variables.noClasses = true;
            if (noTeachers) variables.noTeachers = true;
            if (noStudents) variables.noStudents = true;

            const result = await graphqlService.query(query, variables);

            if (result && result.schoolStatus) {
                setData(result.schoolStatus.data || []);
                setTotalPages(result.schoolStatus.totalPages || 0);
                setTotalRecords(result.schoolStatus.total || 0);
            }
        } catch (err) {
            console.error('GraphQL Fetch Error:', err);
            setError(err.message || 'Failed to fetch user statistics');
            showToast('error', t('errorFetchingData', 'បញ្ហាក្នុងការទាញយកទិន្នន័យ'));
        } finally {
            setLoading(false);
        }
    };

    const fetchChartData = async () => {
        setChartLoading(true);
        try {
            const query = `
                query {
                  provinceSchoolStatus {
                    provinceId
                    provinceNameEn
                    provinceNameKh
                    totalSchools
                    schoolsWithClasses
                    schoolsWithClassesPct
                    schoolsWithTeachers
                    schoolsWithTeachersPct
                    schoolsWithStudents
                    schoolsWithStudentsPct
                  }
                }
            `;
            const result = await graphqlService.query(query, {});
            if (result && result.provinceSchoolStatus) {
                // Parse percentage strings to numbers for accurate charting
                const processedData = result.provinceSchoolStatus.map(item => ({
                    ...item,
                    schoolsWithClassesPctNum: parseFloat(item.schoolsWithClassesPct) || 0,
                    schoolsWithTeachersPctNum: parseFloat(item.schoolsWithTeachersPct) || 0,
                    schoolsWithStudentsPctNum: parseFloat(item.schoolsWithStudentsPct) || 0,
                }));
                setChartData(processedData);
            }
        } catch (err) {
            console.error('Error fetching chart data:', err);
        } finally {
            setChartLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, limit]);

    useEffect(() => {
        fetchChartData();
    }, []);

    const handleFilterSubmit = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (page === 1) {
            fetchData();
        } else {
            setPage(1); // Will trigger the useEffect
        }
        setShowFilters(false);
    };

    const handleClearFilters = () => {
        setProvinceId('');
        setDistrictId('');
        setSchoolId('');
        setSchools([]);
        setNoClasses(false);
        setNoTeachers(false);
        setNoStudents(false);
        if (page === 1) {
            setTimeout(() => fetchData(), 0);
        } else {
            setPage(1);
        }
        setShowFilters(false);
    };

    const hasActiveFilters = Boolean(
        provinceId || districtId || schoolId || noClasses || noTeachers || noStudents
    );

    const tableColumns = [
        { key: 'schoolCode', header: t('schoolCode', 'លេខកូដសាលា'), render: (row) => row.schoolCode || 'N/A' },
        { key: 'schoolName', header: t('schoolName', 'ឈ្មោះសាលា'), render: (row) => <span className="font-medium text-slate-900">{row.schoolName}</span> },
        { key: 'classCount', header: t('classes', 'ថ្នាក់រៀន'), render: (row) => row.classCount?.toLocaleString(), headerClassName: "text-right", cellClassName: "text-right" },
        { key: 'teacherCount', header: t('teachers', 'គ្រូបង្រៀន'), render: (row) => row.teacherCount?.toLocaleString(), headerClassName: "text-right", cellClassName: "text-right" },
        { key: 'studentCount', header: t('students', 'សិស្ស'), render: (row) => <span className="font-medium text-blue-600">{row.studentCount?.toLocaleString()}</span>, headerClassName: "text-right", cellClassName: "text-right" },
    ];

    return (
        <PageTransition variant="fade" className="flex-1 bg-gray-50">
            <div className='p-3 sm:p-6'>
                <FadeInSection delay={0.1} className='mb-4 mx-2'>
                    <div className="flex flex-row items-start sm:items-center justify-between gap-4">
                        <div className='space-y-1'>
                            <h4 className="text-lg sm:text-xl font-bold text-slate-800">
                                {t('userStatistics', 'ស្ថិតិទិន្នន័យអ្នកប្រើប្រាស់')}
                            </h4>
                            <p className="text-gray-700 text-sm">
                                {t('userStatisticsDesc', 'មើលចំនួនថ្នាក់រៀន គ្រូបង្រៀន និងសិស្សសរុបតាមសាលារៀន។')}
                            </p>
                        </div>
                    </div>
                </FadeInSection>

                {/* Sidebar Filter */}
                <SidebarFilter
                    isOpen={showFilters}
                    onClose={() => setShowFilters(false)}
                    title={t('filterStatistics', 'ចម្រោះស្ថិតិ')}
                    subtitle={t('filterStatisticsDesc', 'ចម្រោះតាមទីតាំង និងស្ថានភាពសាលា')}
                    onApply={handleFilterSubmit}
                    onClearFilters={handleClearFilters}
                    hasFilters={hasActiveFilters}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('province', 'ខេត្ត')}</label>
                            <Dropdown
                                value={provinceId ? provinceId.toString() : 'all'}
                                onValueChange={(val) => {
                                    setProvinceId(val === 'all' ? '' : val);
                                    setDistrictId('');
                                }}
                                options={[
                                    { value: 'all', label: t('allProvinces', 'ខេត្តទាំងអស់') },
                                    ...provinces.map(p => ({
                                        value: p.id.toString(),
                                        label: p.provinceNameKh || p.provinceNameEn || p.provinceName
                                    }))
                                ]}
                                placeholder={t('allProvinces', 'ខេត្តទាំងអស់')}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('district', 'ស្រុក')}</label>
                            <Dropdown
                                value={districtId ? districtId.toString() : 'all'}
                                onValueChange={(val) => setDistrictId(val === 'all' ? '' : val)}
                                disabled={!provinceId}
                                options={[
                                    { value: 'all', label: t('allDistricts', 'ស្រុកទាំងអស់') },
                                    ...districts.map(d => ({
                                        value: d.id.toString(),
                                        label: d.districtNameKh || d.districtNameEn || d.districtName || d.name_km || d.name_en || d.name
                                    }))
                                ]}
                                placeholder={t('allDistricts', 'ស្រុកទាំងអស់')}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('school', 'សាលា')}</label>
                            <SearchableDropdown
                                value={schoolId ? schoolId.toString() : ''}
                                onValueChange={(val) => setSchoolId(val)}
                                disabled={!districtId || loading}
                                options={[
                                    { value: '', label: t('allSchools', 'សាលាទាំងអស់') },
                                    ...schools.map(s => ({
                                        value: s.id.toString(),
                                        label: s.name || s.schoolName || `School ${s.id}`,
                                        secondary: s.code || s.schoolCode
                                    }))
                                ]}
                                placeholder={t('allSchools', 'សាលាទាំងអស់')}
                                searchPlaceholder={t('searchSchool', 'ស្វែងរកសាលា...')}
                                showSecondaryInfo={true}
                                secondaryInfoKey="secondary"
                                className="w-full"
                            />
                        </div>

                        <div className="pt-2 border-t border-slate-100 space-y-3">
                            <label className="flex items-center text-sm font-medium text-slate-700 cursor-pointer hover:text-blue-600 transition-colors">
                                <Checkbox
                                    checked={noClasses}
                                    onCheckedChange={setNoClasses}
                                    className="mr-2 border-slate-300 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 text-white"
                                />
                                {t('noClasses', 'គ្មានថ្នាក់រៀន')}
                            </label>
                            <label className="flex items-center text-sm font-medium text-slate-700 cursor-pointer hover:text-blue-600 transition-colors">
                                <Checkbox
                                    checked={noTeachers}
                                    onCheckedChange={setNoTeachers}
                                    className="mr-2 border-slate-300 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 text-white"
                                />
                                {t('noTeachers', 'គ្មានគ្រូបង្រៀន')}
                            </label>
                            <label className="flex items-center text-sm font-medium text-slate-700 cursor-pointer hover:text-blue-600 transition-colors">
                                <Checkbox
                                    checked={noStudents}
                                    onCheckedChange={setNoStudents}
                                    className="mr-2 border-slate-300 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 text-white"
                                />
                                {t('noStudents', 'គ្មានសិស្ស')}
                            </label>
                        </div>
                    </div>
                </SidebarFilter>

                {/* Chart Section */}
                <FadeInSection delay={0.2}>
                    <div className="bg-white p-4 rounded-sm shadow-sm border border-slate-200 mb-6">
                        <div className='flex justify-between items-center mb-4 border-b border-slate-100'>
                            <h5 className="text-md font-bold text-slate-800 mb-4">{t('provinceSchoolStatus', 'ស្ថានភាពសាលាតាមខេត្ត')}</h5>
                        </div>
                        <div className="h-80 w-full mt-4">
                            {chartLoading ? (
                                <div className="flex justify-center items-center h-full">
                                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                                </div>
                            ) : chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={chartData}
                                        margin={{
                                            top: 5,
                                            right: 30,
                                            left: 20,
                                            bottom: 40,
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="provinceNameKh"
                                            interval={0}
                                            angle={-45}
                                            textAnchor="end"
                                            tick={{ fontSize: 10, fill: '#64748b' }}
                                            height={60}
                                        />
                                        <YAxis tickFormatter={(val) => `${val}%`} domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} />
                                        <RechartsTooltip
                                            content={<TooltipChart
                                                valueFormatter={(val) => `${val}%`}
                                                extraContent={(data) => (
                                                    <div className="mb-2">
                                                        <span className="text-sm text-slate-600">{t('totalSchools', 'សាលាសរុប')}:</span>
                                                        <span className="ml-1 font-semibold text-slate-900">{data.totalSchools}</span>
                                                    </div>
                                                )}
                                            />}
                                        />
                                        <Legend />
                                        <Bar dataKey="schoolsWithClassesPctNum" name={t('schoolsWithClassesPct', 'សាលាដែលមានថ្នាក់រៀន (%)')} fill="#10b981" />
                                        <Bar dataKey="schoolsWithTeachersPctNum" name={t('schoolsWithTeachersPct', 'សាលាដែលមានគ្រូបង្រៀន (%)')} fill="#f59e0b" />
                                        <Bar dataKey="schoolsWithStudentsPctNum" name={t('schoolsWithStudentsPct', 'សាលាដែលមានសិស្ស (%)')} fill="#6366f1" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex justify-center items-center h-full text-slate-500">
                                    {t('noDataFound', 'រកមិនឃើញទិន្នន័យទេ')}
                                </div>
                            )}
                        </div>
                    </div>
                </FadeInSection>

                {/* Data Table Card */}
                <FadeInSection delay={0.3}>
                    <div className="bg-white p-4 rounded-sm shadow-sm border border-slate-200 mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h5 className="text-md font-bold text-slate-800">{t('schoolData', 'ទិន្នន័យសាលា')}</h5>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="primary"
                                    onClick={() => setShowFilters(true)}
                                    className="flex items-center gap-2 relative"
                                    size="sm"
                                >
                                    <ListFilter className="w-4 h-4" />
                                    {hasActiveFilters && (
                                        <span className="flex h-2 w-2 rounded-full bg-blue-600 absolute -top-1 -right-1"></span>
                                    )}
                                </Button>
                                <Button
                                    variant="success"
                                    onClick={() => fetchData()}
                                    disabled={loading}
                                    size="sm"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'text-white'}`} />
                                </Button>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            {error ? (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-8 text-center text-red-500">
                                    <p>{error}</p>
                                </div>
                            ) : (
                                <Table
                                    columns={tableColumns}
                                    data={data}
                                    loading={loading}
                                    showPagination={true}
                                    pagination={{ page, pages: totalPages || 1, total: totalRecords, limit }}
                                    onPageChange={(newPage) => setPage(newPage)}
                                    onLimitChange={(newLimit) => {
                                        setLimit(newLimit);
                                        setPage(1);
                                    }}
                                    showLimitSelector={true}
                                    t={t}
                                    emptyMessage={t('noDataFound', 'រកមិនឃើញទិន្នន័យទេ')}
                                />
                            )}
                        </div>
                    </div>
                </FadeInSection>
            </div>
        </PageTransition>
    );
}
