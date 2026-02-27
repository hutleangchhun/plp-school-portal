import React, { useState, useEffect, useCallback } from 'react';
import { graphqlService } from '../../utils/api/services/graphqlService';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { RefreshCw, ListFilter, Users, CheckCircle, GraduationCap, BookOpen } from 'lucide-react';
import locationService from '../../utils/api/services/locationService';
import schoolService from '../../utils/api/services/schoolService';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import SidebarFilter from '../../components/ui/SidebarFilter';
import TooltipChart from '../../components/ui/TooltipChart';
import Dropdown from '../../components/ui/Dropdown';
import SearchableDropdown from '../../components/ui/SearchableDropdown';
import { Button } from '../../components/ui/Button';
import { roleOptions } from '../../utils/formOptions';

const getBarColor = (pct) => {
    if (pct >= 80) return '#10b981';
    if (pct >= 50) return '#f59e0b';
    return '#ef4444';
};

// ── Staff field key map ────────────────────────────────────────────────────────
const STAFF_FIELD_KEY_MAP = {
    'firstName': 'firstName', 'lastName': 'lastName', 'gender': 'gender',
    'dateOfBirth': 'dateOfBirth', 'nationality': 'nationality', 'phone': 'phone',
    'email': 'email', 'username': 'username', 'profilePicture': 'profilePicture',
    'ethnicGroup': 'ethnicGroup', 'accessibility': 'accessibility',
    'weight': 'weight', 'height': 'height', 'bmi': 'bmi',
    'weight_kg': 'weight', 'height_cm': 'height',
    'weightKg': 'weight', 'heightCm': 'height',
    'maritalStatus': 'maritalStatus', 'role': 'role', 'bookIds': 'bookIds',
    'residence': 'currentResidence', 'placeOfBirth': 'placeOfBirth',
    'repeated_class_info': 'repeated_class_info',
    'repeatedClassInfo': 'repeated_class_info',
    'repeated_grade_info': 'repeated_class_info',
    'repeatedGradeInfo': 'repeated_class_info',
    'teacher.gradeLevel': 'gradeLevel', 'teacher.employmentType': 'employmentType',
    'teacher.salaryType': 'salaryType', 'teacher.educationLevel': 'educationLevel',
    'teacher.trainingType': 'trainingType', 'teacher.teachingType': 'teachingType',
    'teacher.teacherStatus': 'teacherStatus', 'teacher.subject': 'subject',
    'teacher.teacherNumber': 'teacherNumber', 'teacher.appointed': 'appointed',
    'teacher.burden': 'burden', 'teacher.hireDate': 'hireDate',
    'teacher.residence': 'residence', 'teacher.placeOfBirth': 'placeOfBirth',
    'teacher.teacherFamily': 'teacherFamily', 'teacher.bookIds': 'bookIds',
    'teacher.role': 'role', 'teacher.maritalStatus': 'maritalStatus',
    'teacher.livingStatus': 'livingStatus', 'teacher.spouseInfo': 'spouseInfo',
    'teacher.numberOfChildren': 'numberOfChildren',
    'teacher.extraLearningTool': 'extraLearningTool',
    'teacher.teacherExtraLearningTool': 'extraLearningTool',
    'teacher.repeated_class_info': 'repeated_class_info',
    'teacher.repeatedClassInfo': 'repeated_class_info',
    'teacher.repeated_grade_info': 'repeated_class_info',
    'teacher.repeatedGradeInfo': 'repeated_class_info',
    'user.firstName': 'firstName', 'user.lastName': 'lastName', 'user.gender': 'gender',
    'user.dateOfBirth': 'dateOfBirth', 'user.nationality': 'nationality',
    'user.phone': 'phone', 'user.email': 'email', 'user.username': 'username',
    'user.profilePicture': 'profilePicture', 'user.ethnicGroup': 'ethnicGroup',
    'user.accessibility': 'accessibility', 'user.weight': 'weight',
    'user.height': 'height', 'user.bmi': 'bmi',
    'user.weight_kg': 'weight', 'user.height_cm': 'height',
    'user.maritalStatus': 'maritalStatus', 'user.role': 'role', 'user.bookIds': 'bookIds',
};

// ── Student field key map ──────────────────────────────────────────────────────
const STUDENT_FIELD_KEY_MAP = {
    'firstName': 'firstName', 'lastName': 'lastName', 'gender': 'gender',
    'dateOfBirth': 'dateOfBirth', 'nationality': 'nationality', 'phone': 'phone',
    'email': 'email', 'username': 'username', 'profilePicture': 'profilePicture',
    'ethnicGroup': 'ethnicGroup', 'accessibility': 'accessibility',
    'weight': 'weight', 'height': 'height', 'bmi': 'bmi',
    'weight_kg': 'weight', 'height_cm': 'height',
    'weightKg': 'weight', 'heightCm': 'height',
    'maritalStatus': 'maritalStatus', 'role': 'role',
    'residence': 'currentResidence', 'placeOfBirth': 'placeOfBirth',
    'repeated_class_info': 'repeated_class_info',
    'repeatedClassInfo': 'repeated_class_info',
    'repeated_grade_info': 'repeated_class_info',
    'repeatedGradeInfo': 'repeated_class_info',
    'student.studentNumber': 'studentNumber',
    'student.poorCardGrade': 'poorCardGrade',
    'student.academicYear': 'academicYear',
    'student.gradeLevel': 'gradeLevel',
    'student.extraLearningTool': 'extraLearningTool',
    'student.repeated_class_info': 'repeated_class_info',
    'student.repeatedClassInfo': 'repeated_class_info',
    'student.repeated_grade_info': 'repeated_class_info',
    'student.repeatedGradeInfo': 'repeated_class_info',
    'student.weight_kg': 'weight',
    'student.height_cm': 'height',
    'student.weightKg': 'weight',
    'student.heightCm': 'height',
};

// ── Shared category key map ────────────────────────────────────────────────────
const CATEGORY_KEY_MAP = {
    'Base Fields': 'baseFields',
    'Personal Info': 'personalInformation', 'Personal': 'personalInformation',
    'Contact': 'contactInformation',
    'Teacher Specific': 'teacherSpecific', 'Teacher': 'teacherSpecific',
    'Student Specific': 'studentSpecific', 'Student': 'studentSpecific',
    'Location': 'locationInfo', 'Family': 'familyInfo', 'Physical': 'physicalInfo',
    'Professional': 'professional', 'Academic': 'academic',
    'Learning': 'learning', 'System': 'system', 'Other': 'other',
};

// ── Reusable DataCompletionChart ───────────────────────────────────────────────
function DataCompletionChart({ fieldKeyMap, fetchFn, totalLabel, showRoleFilter, t, showToast }) {
    const translateField = (fieldName, fallback) => {
        const key = fieldKeyMap[fieldName];
        return key ? t(key, fallback) : fallback;
    };
    const translateCategory = (cat) => {
        const key = CATEGORY_KEY_MAP[cat];
        return key ? t(key, cat) : cat;
    };

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [provinceId, setProvinceId] = useState('');
    const [districtId, setDistrictId] = useState('');
    const [schoolId, setSchoolId] = useState('');
    const [roleId, setRoleId] = useState('');

    // Pending
    const [pendingProvinceId, setPendingProvinceId] = useState('');
    const [pendingDistrictId, setPendingDistrictId] = useState('');
    const [pendingSchoolId, setPendingSchoolId] = useState('');
    const [pendingRoleId, setPendingRoleId] = useState('');

    // Location
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [schools, setSchools] = useState([]);

    useEffect(() => {
        locationService.getProvinces().then(res => setProvinces(Array.isArray(res) ? res : (res?.data || []))).catch(() => { });
    }, []);

    useEffect(() => {
        if (!pendingProvinceId) { setDistricts([]); return; }
        locationService.getDistrictsByProvince(pendingProvinceId).then(res => setDistricts(Array.isArray(res) ? res : (res?.data || []))).catch(() => { });
    }, [pendingProvinceId]);

    useEffect(() => {
        if (!pendingDistrictId) { setSchools([]); return; }
        schoolService.getSchoolsByDistrict(pendingDistrictId).then(res => setSchools(res?.data || [])).catch(() => { });
    }, [pendingDistrictId]);

    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const variables = {};
            if (provinceId) variables.provinceId = parseInt(provinceId);
            if (districtId) variables.districtId = parseInt(districtId);
            if (schoolId) variables.schoolId = parseInt(schoolId);
            if (showRoleFilter && roleId) variables.roleId = parseInt(roleId);
            const result = await fetchFn(variables);
            setData(result ?? null);
            // 🔍 DEBUG: log untranslated fieldNames (remove after fixing)
            if (result?.fieldStatistics) {
                const untranslated = result.fieldStatistics
                    .filter(f => !fieldKeyMap[f.fieldName])
                    .map(f => `"${f.fieldName}" (${f.fieldDisplayName})`);
                if (untranslated.length) console.warn('[DataCompletion] Unmapped fields:', untranslated);
            }
        } catch (err) {
            setError(err.message);
            showToast('error', t('errorFetchingData', 'បញ្ហាក្នុងការទាញយកទិន្នន័យ'));
        } finally {
            setLoading(false);
        }
    }, [provinceId, districtId, schoolId, roleId, fetchFn, showRoleFilter, showToast, t]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleApply = () => {
        setProvinceId(pendingProvinceId);
        setDistrictId(pendingDistrictId);
        setSchoolId(pendingSchoolId);
        setRoleId(pendingRoleId);
        setShowFilters(false);
    };
    const handleClear = () => {
        setPendingProvinceId(''); setPendingDistrictId(''); setPendingSchoolId(''); setPendingRoleId('');
        setProvinceId(''); setDistrictId(''); setSchoolId(''); setRoleId('');
    };
    const hasActiveFilters = !!(provinceId || districtId || schoolId || roleId);

    const fieldStats = data?.fieldStatistics || [];
    const categories = [...new Set(fieldStats.map(f => f.category))].filter(Boolean);
    const filteredStats = selectedCategory ? fieldStats.filter(f => f.category === selectedCategory) : fieldStats;

    const chartData = filteredStats.map(f => ({
        name: translateField(f.fieldName, f.fieldDisplayName),
        filledPct: parseFloat(f.filledPercentage) || 0,
        emptyPct: parseFloat(f.emptyPercentage) || 0,
        filledCount: f.filledCount,
        emptyCount: f.emptyCount,
        category: f.category,
    }));

    const avgFilled = chartData.length > 0
        ? (chartData.reduce((s, d) => s + d.filledPct, 0) / chartData.length).toFixed(1)
        : 0;

    return (
        <>
            {/* Sidebar Filter */}
            <SidebarFilter
                isOpen={showFilters}
                onClose={() => setShowFilters(false)}
                title={t('filters', 'ចម្រោះ')}
                subtitle={t('filterByLocation', 'ចម្រោះតាមទីតាំង')}
                onApply={handleApply}
                onClearFilters={handleClear}
                hasFilters={hasActiveFilters}
            >
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-slate-700">{t('province', 'ខេត្ត')}</label>
                        <Dropdown
                            value={pendingProvinceId}
                            onValueChange={(v) => { setPendingProvinceId(v); setPendingDistrictId(''); setPendingSchoolId(''); }}
                            options={[{ value: '', label: t('allProvinces', 'ខេត្តទាំងអស់') }, ...provinces.map(p => ({ value: String(p.id), label: p.provinceNameKh || p.provinceNameEn || p.provinceName }))]}
                            placeholder={t('allProvinces', 'ខេត្តទាំងអស់')}
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-slate-700">{t('district', 'ស្រុក')}</label>
                        <Dropdown
                            value={pendingDistrictId}
                            onValueChange={(v) => { setPendingDistrictId(v); setPendingSchoolId(''); }}
                            options={[{ value: '', label: t('allDistricts', 'ស្រុកទាំងអស់') }, ...districts.map(d => ({ value: String(d.id), label: d.districtNameKh || d.districtNameEn || d.districtName || d.name }))]}
                            placeholder={t('allDistricts', 'ស្រុកទាំងអស់')}
                            className="w-full"
                            disabled={!pendingProvinceId}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-slate-700">{t('school', 'សាលា')}</label>
                        <SearchableDropdown
                            value={pendingSchoolId}
                            onValueChange={setPendingSchoolId}
                            options={[{ value: '', label: t('allSchools', 'សាលាទាំងអស់'), secondary: '' }, ...schools.map(s => ({ value: String(s.id), label: s.schoolName, secondary: s.schoolCode }))]}
                            placeholder={t('allSchools', 'សាលាទាំងអស់')}
                            searchPlaceholder={t('searchSchool', 'ស្វែងរកសាលា...')}
                            showSecondaryInfo={true}
                            secondaryInfoKey="secondary"
                            className="w-full"
                            disabled={!pendingDistrictId}
                        />
                    </div>
                    {showRoleFilter && (
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-700">{t('role', 'តួនាទី')}</label>
                            <Dropdown
                                value={pendingRoleId}
                                onValueChange={setPendingRoleId}
                                options={[{ value: '', label: t('allRoles', 'តួនាទីទាំងអស់') }, ...roleOptions]}
                                placeholder={t('allRoles', 'តួនាទីទាំងអស់')}
                                className="w-full"
                            />
                        </div>
                    )}
                </div>
            </SidebarFilter>

            {/* Summary cards */}
            {data && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white border border-slate-200 rounded-sm p-4 flex items-center gap-3 shadow-sm">
                        <div className="p-2 bg-blue-100 rounded-sm"><Users className="w-5 h-5 text-blue-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{data.total}</p>
                            <p className="text-xs text-slate-500">{totalLabel}</p>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-sm p-4 flex items-center gap-3 shadow-sm">
                        <div className="p-2 bg-emerald-100 rounded-sm"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-emerald-600">{avgFilled}%</p>
                            <p className="text-xs text-slate-500">{t('avgFillRate', 'មធ្យមភាគរយបំពេញ')}</p>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-sm p-4 flex items-center gap-3 shadow-sm">
                        <div className="p-2 bg-purple-100 rounded-sm"><ListFilter className="w-5 h-5 text-purple-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{fieldStats.length}</p>
                            <p className="text-xs text-slate-500">{t('totalFields', 'ចំនួនក្រឡាទិន្នន័យ')}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Chart */}
            <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                    <h5 className="text-md font-bold text-slate-800">{t('fieldCompletionChart', 'ក្រាហ្វការបំពេញទិន្នន័យ')}</h5>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant={selectedCategory === '' ? 'primary' : 'outline'} size="sm" onClick={() => setSelectedCategory('')}>
                            {t('all', 'ទាំងអស់')}
                        </Button>
                        {categories.map(cat => (
                            <Button key={cat} variant={selectedCategory === cat ? 'primary' : 'outline'} size="sm" onClick={() => setSelectedCategory(cat)}>
                                {translateCategory(cat)}
                            </Button>
                        ))}
                        <Button variant="primary" size="sm" onClick={() => setShowFilters(true)} className="relative">
                            <ListFilter className="w-4 h-4" />
                            {hasActiveFilters && <span className="flex h-2 w-2 rounded-full bg-white absolute -top-1 -right-1" />}
                        </Button>
                        <Button variant="success" size="sm" onClick={fetchData} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-72">
                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="flex justify-center items-center h-72 text-red-500"><p>{error}</p></div>
                ) : chartData.length === 0 ? (
                    <div className="flex justify-center items-center h-72 text-slate-500">{t('noDataFound', 'រកមិនឃើញទិន្នន័យទេ')}</div>
                ) : (
                    <div style={{ height: Math.max(300, chartData.length * 32) }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 60, left: 10, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
                                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10, fill: '#475569' }} />
                                <RechartsTooltip
                                    content={
                                        <TooltipChart
                                            valueFormatter={v => `${v}%`}
                                            extraContent={(d) => (
                                                <div className="mb-1 text-xs text-slate-500">
                                                    {t('category', 'ប្រភេទ')}: <span className="font-semibold text-slate-700">{translateCategory(d.category)}</span>
                                                    <br />
                                                    {t('filledCount', 'ចំនួនបំពេញ')}: <span className="font-semibold text-emerald-600">{d.filledCount}</span>&nbsp;|&nbsp;
                                                    {t('emptyCount', 'ចំនួនទំនេរ')}: <span className="font-semibold text-red-500">{d.emptyCount}</span>
                                                </div>
                                            )}
                                        />
                                    }
                                />
                                <Legend />
                                <Bar dataKey="filledPct" name={t('filledPercentage', 'ភាគរយបានបំពេញ')} radius={[0, 3, 3, 0]} maxBarSize={20}>
                                    {chartData.map((entry, i) => <Cell key={`cell-${i}`} fill={getBarColor(entry.filledPct)} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-emerald-500" /> {t('good', 'ល្អ')} ≥ 80%</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-amber-400" /> {t('moderate', 'មធ្យម')} 50–79%</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-red-500" /> {t('poor', 'ខ្សោយ')} &lt; 50%</span>
                </div>
            </div>
        </>
    );
}

// ── Main page with tabs ────────────────────────────────────────────────────────
export default function AdminStaffDataCompletion() {
    const { t } = useLanguage();
    const { showToast } = useToast();

    const TABS = [
        { key: 'staff', label: t('staff', 'បុគ្គលិក'), icon: GraduationCap },
        { key: 'student', label: t('student', 'សិស្ស'), icon: BookOpen },
    ];
    const [activeTab, setActiveTab] = useState('staff');

    const fetchStaff = useCallback((variables) =>
        graphqlService.getTeacherDataCompletion(variables).then(r => r?.teacherDataCompletion), []);

    const fetchStudent = useCallback((variables) =>
        graphqlService.getStudentDataCompletion(variables).then(r => r?.studentDataCompletion), []);

    return (
        <PageTransition>
            <div className="p-4 sm:p-6">
                {/* Header */}
                <FadeInSection delay={0}>
                    <div className="mb-6">
                        <h1 className="text-xl font-bold text-slate-900">{t('dataCompletion', 'ការបំពេញទិន្នន័យ')}</h1>
                        <p className="text-sm text-slate-500 mt-1">{t('dataCompletionDesc', 'តាមដានភាពពេញលេញនៃទិន្នន័យតាមក្រឡា')}</p>
                    </div>
                </FadeInSection>

                {/* Tab switcher */}
                <FadeInSection delay={0.05}>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-sm w-fit mb-6">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const active = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all duration-200
                                        ${active
                                            ? 'bg-white text-blue-700 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </FadeInSection>

                {/* Tab content */}
                <FadeInSection delay={0.1}>
                    {activeTab === 'staff' ? (
                        <DataCompletionChart
                            key="staff"
                            fieldKeyMap={STAFF_FIELD_KEY_MAP}
                            fetchFn={fetchStaff}
                            totalLabel={t('totalStaff', 'បុគ្គលិកសរុប')}
                            showRoleFilter={true}
                            t={t}
                            showToast={showToast}
                        />
                    ) : (
                        <DataCompletionChart
                            key="student"
                            fieldKeyMap={STUDENT_FIELD_KEY_MAP}
                            fetchFn={fetchStudent}
                            totalLabel={t('totalStudents', 'សិស្សសរុប')}
                            showRoleFilter={false}
                            t={t}
                            showToast={showToast}
                        />
                    )}
                </FadeInSection>
            </div>
        </PageTransition>
    );
}
