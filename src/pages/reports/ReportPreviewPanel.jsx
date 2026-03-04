import React from 'react';
import { Users, UserCheck, BarChart2, TrendingUp, Minus, Activity, Filter, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import DynamicLoader from '../../components/ui/DynamicLoader';
import EmptyState from '../../components/ui/EmptyState';
import StatsCard from '../../components/ui/StatsCard';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Displays preview stats returned from a GraphQL export check query.
 * Renders different layouts depending on the report type.
 */
export default function ReportPreviewPanel({ report, data, loading, reportData, selectedReport, selectedClass }) {
    const { t } = useLanguage();

    // 1. Loading — no preview data yet
    if (loading && !data) {
        return (
            <div className="mt-4 flex justify-center items-center py-10">
                <DynamicLoader type="spinner" size="xl" variant="primary" message={t('loadingReportData', 'Loading report data...')} />
            </div>
        );
    }

    // 2. No data — show only the relevant EmptyState
    if (!reportData || reportData.length === 0) {
        if (selectedReport === 'report1' && (!selectedClass || selectedClass === 'all')) {
            return (
                <div className="mt-4">
                    <EmptyState
                        icon={Filter}
                        title={t('classSelectionRequired', 'Class Selection Required')}
                        description={t('selectClassForReport1', 'Please select a specific class to generate the report')}
                        variant="warning"
                    />
                </div>
            );
        }
        if (selectedReport === 'report4' && (!selectedClass || selectedClass === 'all')) {
            return (
                <div className="mt-4">
                    <EmptyState
                        icon={Filter}
                        title={t('classSelectionRequired', 'Class Selection Required')}
                        description={t('selectClassForReport4', 'Please select a specific class for the absence report')}
                        variant="warning"
                    />
                </div>
            );
        }
        return (
            <div className="mt-4">
                <EmptyState
                    icon={BarChart3}
                    title={t('noDataAvailable', 'No Data Available')}
                    description={t('noDataMessage', 'Please select filters and wait for data to load.')}
                    variant="info"
                />
            </div>
        );
    }

    // 3. Data available — show preview panel only
    const hasPreview = data && ['report1', 'report8', 'report6', 'report9', 'report4', 'reportTeacherAttendance'].includes(report);
    if (!hasPreview) return null;

    return (
        <div className="mt-4 rounded-sm bg-white overflow-hidden">
            <div className="py-3 bg-white flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold text-gray-700">{t('preview', 'Preview')}</span>
            </div>
            <div>
                {report === 'report1' && <StudentListPreview data={data} t={t} />}
                {report === 'report8' && <BmiPreview data={data} t={t} />}
                {report === 'report6' && <AccessibilityPreview data={data} t={t} />}
                {report === 'report9' && <EthnicPreview data={data} t={t} />}
                {report === 'report4' && <AttendancePreview data={data} type="class" t={t} />}
                {report === 'reportTeacherAttendance' && <AttendancePreview data={data} type="teacher" t={t} />}
            </div>
        </div>
    );
}

// ── Student List Preview ───────────────────────────────────────────────────────
function StudentListPreview({ data, t }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                <StatsCard title={t('totalStudents', 'Total Students')} value={data.studentCount} />
                <StatsCard title={t('female', 'Female')} value={data.femaleCount} />
            </div>
        </div>
    );
}

// ── BMI Preview ────────────────────────────────────────────────────────────────
function BmiPreview({ data, t }) {
    const s = data.bmiStatus || {};
    const missingBoth = data.noMeasurementCount || 0;
    const missingHeight = data.noHeightCount || 0;
    const missingWeight = data.noWeightCount || 0;
    const missingAny = data.withoutBmiCount || 0;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
                <StatsCard title={t('totalStudents', 'Total Students')} value={data.studentCount} />
                <StatsCard title={t('female', 'Female')} value={data.femaleCount} />
                <StatsCard
                    title={t('withBMI', 'With BMI')}
                    value={data.withBmiCount}
                />
                <StatsCard
                    title={t('avgBMI', 'Avg BMI')}
                    value={data.avgBmi != null ? Number(data.avgBmi).toFixed(1) : '—'}
                />
            </div>

            {data.skipReason && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <Activity className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                {data.skipReason}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {missingAny > 0 && (missingBoth > 0 || missingHeight > 0 || missingWeight > 0) && (
                <div>
                    <p className="text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">{t('missingDataBreakdown', 'Missing Data Breakdown')}</p>
                    <div className="grid grid-cols-3 gap-3">
                        <StatsCard
                            title={t('withoutBMI', 'StudentsWithout BMI')}
                            value={data.withoutBmiCount}
                            className="bg-orange-50 border-orange-100 shadow-none"
                            titleColor="text-orange-600"
                            valueColor="text-orange-700"
                        />
                        <StatsCard
                            title={t('missingHeight', 'Missing Height')}
                            value={missingHeight}
                            className="bg-orange-50 border-orange-100 shadow-none"
                            titleColor="text-orange-600"
                            valueColor="text-orange-700"
                        />
                        <StatsCard
                            title={t('missingWeight', 'Missing Weight')}
                            value={missingWeight}
                            className="bg-orange-50 border-orange-100 shadow-none"
                            titleColor="text-orange-600"
                            valueColor="text-orange-700"
                        />
                    </div>
                </div>
            )}

            {Object.keys(s).length > 0 && (
                <div>
                    <p className="text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">{t('bmiStatusBreakdown', 'BMI Status Breakdown')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                            { key: 'thinness_grade_3', label: t('thinnessG3', 'Thinness G3'), color: 'red' },
                            { key: 'thinness_grade_2', label: t('thinnessG2', 'Thinness G2'), color: 'orange' },
                            { key: 'thinness_grade_1', label: t('thinnessG1', 'Thinness G1'), color: 'orange' },
                            { key: 'normal', label: t('normalBMI', 'Normal'), color: 'green' },
                            { key: 'overweight', label: t('overweight', 'Overweight'), color: 'orange' },
                            { key: 'obesity', label: t('obesity', 'Obesity'), color: 'red' },
                        ].map(({ key, label }) => (
                            <div key={key} className="text-center p-2 rounded-sm bg-white border border-gray-100">
                                <p className="text-sm font-bold text-gray-800">{s[key] ?? 0}</p>
                                <p className="text-xs text-gray-500 leading-tight mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Accessibility Preview ──────────────────────────────────────────────────────
const PIE_COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#f97316', '#14b8a6',
];

function AccessibilityPreview({ data, t }) {
    const byType = data.byType || [];
    const pieData = byType
        .filter(item => item.count > 0)
        .map(item => ({ name: item.label, value: item.count }));

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        if (percent < 0.05) return null;
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Left: Stat cards */}
            <div className="space-y-3 md:col-span-1">
                <StatsCard title={t('studentsWithDisability', 'Students with Disability')} value={data.studentCount} />
                <StatsCard title={t('female', 'Female')} value={data.femaleCount} />
            </div>

            {/* Right: Pie chart + legend */}
            <div className="md:col-span-2">
                {pieData.length > 0 ? (
                    <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{t('byDisabilityType', 'By Disability Type')}</p>
                        <div className="h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={72}
                                        paddingAngle={2}
                                        dataKey="value"
                                        labelLine={false}
                                        label={renderCustomLabel}
                                    >
                                        {pieData.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, name) => [value, name]}
                                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-1 mt-2">
                            {pieData.map(({ name, value }, i) => (
                                <div key={name} className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                    <span className="text-xs text-gray-600 flex-1 truncate" title={name}>{name}</span>
                                    <span className="text-xs font-semibold text-gray-800">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-gray-400 italic">{t('noBreakdownData', 'No breakdown data')}</p>
                )}
            </div>
        </div>
    );
}

// ── Ethnic Preview ─────────────────────────────────────────────────────────────
function EthnicPreview({ data, t }) {
    const byGroup = data.byEthnicGroup || [];
    const pieData = byGroup
        .filter(g => g.count > 0 && g.label !== 'Khmer ខ្មែរ' && g.label !== 'Khmer' && g.label !== 'ខ្មែរ')
        .map(g => ({ name: g.label, value: g.count }));

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        if (percent < 0.05) return null;
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Left: Stat cards */}
            <div className="space-y-3 md:col-span-1">
                <StatsCard title={t('totalStudents', 'Total Students')} value={data.studentCount} />
                <StatsCard title={t('female', 'Female')} value={data.femaleCount} />
            </div>

            {/* Right: Pie chart + legend */}
            <div className="md:col-span-2">
                {pieData.length > 0 ? (
                    <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{t('byEthnicGroup', 'By Ethnic Group')}</p>
                        <div className="flex flex-col xl:flex-row gap-4 xl:items-center">
                            <div className="w-full xl:w-56 h-44 shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={72}
                                            paddingAngle={2}
                                            dataKey="value"
                                            labelLine={false}
                                            label={renderCustomLabel}
                                        >
                                            {pieData.map((_, i) => (
                                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value, name) => [value, name]}
                                            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-1.5 flex-1 pr-1 max-h-44 overflow-y-auto w-full">
                                {pieData.map(({ name, value }, i) => (
                                    <div key={name} className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        <span className="text-xs text-gray-600 flex-1 truncate" title={name}>{name}</span>
                                        <span className="text-xs font-semibold text-gray-800">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-gray-400 italic">{t('noMinorityBreakdown', 'No minority breakdown data')}</p>
                )}
            </div>
        </div>
    );
}

// ── Attendance Preview ─────────────────────────────────────────────────────────
function AttendancePreview({ data, type, t }) {
    const attendanceStats = [
        { key: 'present', label: t('present', 'Present'), value: data.presentCount, color: 'green' },
        { key: 'absent', label: t('absent', 'Absent'), value: data.absentCount, color: 'red' },
        { key: 'late', label: t('late', 'Late'), value: data.lateCount, color: 'orange' },
        { key: 'leave', label: t('leave', 'Leave'), value: data.leaveCount, color: 'blue' },
    ];

    const renderTopList = (titleKey, titleFallback, items, colorClass) => {
        if (!items || items.length === 0) return null;
        return (
            <div className="bg-white p-3 rounded-sm border-2 border-gray-200">
                <h4 className={`text-sm font-semibold mb-2 uppercase tracking-wide ${colorClass}`}>
                    {t(titleKey, titleFallback)}
                </h4>
                <div className="space-y-1.5">
                    {items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 truncate mr-2" title={item.fullName}>
                                {item.fullName}
                            </span>
                            <span className="font-medium text-gray-800 shrink-0">
                                {item.count}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
                {attendanceStats.map(({ label, value }) => (
                    <StatsCard
                        key={label}
                        title={label}
                        value={value}
                        enhanced={true}
                        responsive={true} />
                ))}
            </div>

            {/* Top by Status Lists */}
            {data.topByStatus && (
                <div className="">
                    <div className="flex items-center gap-2 my-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <p className="text-sm font-semibold text-gray-700 tracking-wide">
                            {t('highestFrequencyRecords', 'Highest Frequency Records')}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        {renderTopList('topPresent', 'Top Present', data.topByStatus.present, 'text-green-600')}
                        {renderTopList('topAbsent', 'Top Absent', data.topByStatus.absent, 'text-red-600')}
                        {renderTopList('topLate', 'Top Late', data.topByStatus.late, 'text-orange-600')}
                        {renderTopList('topLeave', 'Top Leave', data.topByStatus.leave, 'text-blue-600')}
                    </div>
                </div>
            )}
        </div>
    );
}
