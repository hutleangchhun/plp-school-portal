import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumberWithCommas } from '@/utils/formatters';
import StatsCard from '../ui/StatsCard';

const TeacherAttendanceTimingChart = ({
  teacherAttendanceTiming,
  totalTeachersPresentCount,
  teachersWithoutCheckInOut,
  totalTeachersWithAttendance,
  totalTeachersInSchoolsWithAttendance,
  totalTeachersLateCount,
  totalTeachersLeaveCount,
  totalTeachersAbsentCount,
  loading = false
}) => {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="mb-4 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="w-full h-[400px] bg-gray-100 rounded animate-pulse flex items-end justify-around p-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-1 items-end h-full w-full mx-2">
              <div className="w-1/3 bg-gray-200 rounded-t h-[40%]"></div>
              <div className="w-1/3 bg-gray-300 rounded-t h-[60%]"></div>
              <div className="w-1/3 bg-gray-200 rounded-t h-[30%]"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Shift labels
  const morningShift = t('morningShiftAttendance', 'Morning Shift');
  const afternoonShift = t('afternoonShiftAttendance', 'Afternoon Shift');
  const eveningShift = t('eveningShiftAttendance', 'Evening Shift');

  // Calculate total for each shift
  const morningTotal = 
    (teacherAttendanceTiming?.session7am?.leftoverBefore || 0) +
    (teacherAttendanceTiming?.session7am?.before30min || 0) +
    (teacherAttendanceTiming?.session7am?.before15min || 0) +
    (teacherAttendanceTiming?.session7am?.after15min || 0) +
    (teacherAttendanceTiming?.session7am?.after30min || 0) +
    (teacherAttendanceTiming?.session7am?.leftoverAfter || 0);

  const afternoonTotal = 
    (teacherAttendanceTiming?.session11am?.leftoverBefore || 0) +
    (teacherAttendanceTiming?.session11am?.before30min || 0) +
    (teacherAttendanceTiming?.session11am?.before15min || 0) +
    (teacherAttendanceTiming?.session11am?.after15min || 0) +
    (teacherAttendanceTiming?.session11am?.after30min || 0) +
    (teacherAttendanceTiming?.session11am?.leftoverAfter || 0);

  const eveningTotal = 
    (teacherAttendanceTiming?.session1pm?.leftoverBefore || 0) +
    (teacherAttendanceTiming?.session1pm?.before30min || 0) +
    (teacherAttendanceTiming?.session1pm?.before15min || 0) +
    (teacherAttendanceTiming?.session1pm?.after15min || 0) +
    (teacherAttendanceTiming?.session1pm?.after30min || 0) +
    (teacherAttendanceTiming?.session1pm?.leftoverAfter || 0);

  // Sum of all shifts
  const totalAllShifts = morningTotal + afternoonTotal + eveningTotal;

  // Calculate totals for each timing category across all shifts
  const categoryTotals = {
    leftoverBefore: 
      (teacherAttendanceTiming?.session7am?.leftoverBefore || 0) +
      (teacherAttendanceTiming?.session11am?.leftoverBefore || 0) +
      (teacherAttendanceTiming?.session1pm?.leftoverBefore || 0),
    before30min:
      (teacherAttendanceTiming?.session7am?.before30min || 0) +
      (teacherAttendanceTiming?.session11am?.before30min || 0) +
      (teacherAttendanceTiming?.session1pm?.before30min || 0),
    before15min:
      (teacherAttendanceTiming?.session7am?.before15min || 0) +
      (teacherAttendanceTiming?.session11am?.before15min || 0) +
      (teacherAttendanceTiming?.session1pm?.before15min || 0),
    after15min:
      (teacherAttendanceTiming?.session7am?.after15min || 0) +
      (teacherAttendanceTiming?.session11am?.after15min || 0) +
      (teacherAttendanceTiming?.session1pm?.after15min || 0),
    after30min:
      (teacherAttendanceTiming?.session7am?.after30min || 0) +
      (teacherAttendanceTiming?.session11am?.after30min || 0) +
      (teacherAttendanceTiming?.session1pm?.after30min || 0),
    leftoverAfter:
      (teacherAttendanceTiming?.session7am?.leftoverAfter || 0) +
      (teacherAttendanceTiming?.session11am?.leftoverAfter || 0) +
      (teacherAttendanceTiming?.session1pm?.leftoverAfter || 0),
  };

  // Prepare data for grouped bar chart by timing category
  const chartData = [
    {
      category: t('leftoverBefore', 'Very Early (>30 min)'),
      categoryKey: 'leftoverBefore',
      [morningShift]: teacherAttendanceTiming?.session7am?.leftoverBefore || 0,
      [afternoonShift]: teacherAttendanceTiming?.session11am?.leftoverBefore || 0,
      [eveningShift]: teacherAttendanceTiming?.session1pm?.leftoverBefore || 0,
    },
    {
      category: t('before30min', 'Early (15-30 min)'),
      categoryKey: 'before30min',
      [morningShift]: teacherAttendanceTiming?.session7am?.before30min || 0,
      [afternoonShift]: teacherAttendanceTiming?.session11am?.before30min || 0,
      [eveningShift]: teacherAttendanceTiming?.session1pm?.before30min || 0,
    },
    {
      category: t('before15min', 'On Time (0-15 min)'),
      categoryKey: 'before15min',
      [morningShift]: teacherAttendanceTiming?.session7am?.before15min || 0,
      [afternoonShift]: teacherAttendanceTiming?.session11am?.before15min || 0,
      [eveningShift]: teacherAttendanceTiming?.session1pm?.before15min || 0,
    },
    {
      category: t('after15min', 'Late (0-15 min)'),
      categoryKey: 'after15min',
      [morningShift]: teacherAttendanceTiming?.session7am?.after15min || 0,
      [afternoonShift]: teacherAttendanceTiming?.session11am?.after15min || 0,
      [eveningShift]: teacherAttendanceTiming?.session1pm?.after15min || 0,
    },
    {
      category: t('after30min', 'Late (15-30 min)'),
      categoryKey: 'after30min',
      [morningShift]: teacherAttendanceTiming?.session7am?.after30min || 0,
      [afternoonShift]: teacherAttendanceTiming?.session11am?.after30min || 0,
      [eveningShift]: teacherAttendanceTiming?.session1pm?.after30min || 0,
    },
    {
      category: t('leftoverAfter', 'Very Late (>30 min)'),
      categoryKey: 'leftoverAfter',
      [morningShift]: teacherAttendanceTiming?.session7am?.leftoverAfter || 0,
      [afternoonShift]: teacherAttendanceTiming?.session11am?.leftoverAfter || 0,
      [eveningShift]: teacherAttendanceTiming?.session1pm?.leftoverAfter || 0,
    },
  ];

  // Custom label to show percentage on bars (compared to totalTeachersPresentCount)
  const renderCustomLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (!value || value === 0) return null;
    
    const percentage = totalTeachersPresentCount > 0 ? ((value / totalTeachersPresentCount) * 100).toFixed(1) : '0.0';
    
    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill="#374151"
        textAnchor="middle"
        fontSize={10}
        fontWeight="600"
      >
        {percentage}%
      </text>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
      const categoryKey = payload[0]?.payload?.categoryKey;
      const categoryTotal = categoryTotals[categoryKey] || 0;
      const categoryPercentage = totalTeachersPresentCount > 0 
        ? ((categoryTotal / totalTeachersPresentCount) * 100).toFixed(1) 
        : '0.0';

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => {
            const percentage = totalTeachersPresentCount > 0 ? ((entry.value / totalTeachersPresentCount) * 100).toFixed(1) : '0.0';
            
            return (
              <p key={index} className="text-sm text-gray-700">
                <span style={{ color: entry.color }}>●</span> {entry.name}: <span className="font-semibold">{formatNumberWithCommas(entry.value)}</span> ({percentage}%)
              </p>
            );
          })}
          <p className="text-sm text-gray-700 mt-1 pt-1 border-t border-gray-200">
            {t('total', 'Total')}: <span className="font-semibold">{formatNumberWithCommas(total)} ({categoryPercentage}%)</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6 mb-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('teacherAttendanceTiming', 'Teacher Attendance Timing')}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {t('totalShiftAttendance', 'Total across all shifts')}: <span className="font-semibold">{formatNumberWithCommas(totalAllShifts)}</span> 
        </p>
      </div>

      {/* Teacher Attendance Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatsCard
          title={t('teachersWithoutCheckInOut', 'Teachers Without Check-In/Out')}
          value={formatNumberWithCommas(teachersWithoutCheckInOut)}
          subtitle={
            totalTeachersInSchoolsWithAttendance > 0
              ? `${((teachersWithoutCheckInOut / totalTeachersInSchoolsWithAttendance) * 100).toFixed(1)}% ${t('ofTotal', 'of total')}`
              : '0.0%'
          }
          enhanced
          responsive
          gradientFrom="from-gray-500"
          gradientTo="to-gray-600"
          loading={loading}
        />
        <StatsCard
          title={t('teacherPresent', 'Teachers Present')}
          value={formatNumberWithCommas(totalTeachersPresentCount)}
          subtitle={
            totalTeachersWithAttendance > 0
              ? `${((totalTeachersPresentCount / totalTeachersWithAttendance) * 100).toFixed(1)}% ${t('ofTotal', 'of total')}`
              : '0.0%'
          }
          enhanced
          responsive
          gradientFrom="from-green-500"
          gradientTo="to-green-600"
          loading={loading}
        />
        <StatsCard
          title={t('teacherLate', 'Teachers Late')}
          value={formatNumberWithCommas(totalTeachersLateCount)}
          subtitle={
            totalTeachersWithAttendance > 0
              ? `${((totalTeachersLateCount / totalTeachersWithAttendance) * 100).toFixed(1)}% ${t('ofTotal', 'of total')}`
              : '0.0%'
          }
          enhanced
          responsive
          gradientFrom="from-yellow-500"
          gradientTo="to-yellow-600"
          loading={loading}
        />
        <StatsCard
          title={t('teacherLeave', 'Teachers on Leave')}
          value={formatNumberWithCommas(totalTeachersLeaveCount)}
          subtitle={
            totalTeachersWithAttendance > 0
              ? `${((totalTeachersLeaveCount / totalTeachersWithAttendance) * 100).toFixed(1)}% ${t('ofTotal', 'of total')}`
              : '0.0%'
          }
          enhanced
          responsive
          gradientFrom="from-blue-500"
          gradientTo="to-blue-600"
          loading={loading}
        />
        <StatsCard
          title={t('teacherAbsent', 'Teachers Absent')}
          value={formatNumberWithCommas(totalTeachersAbsentCount)}
          subtitle={
            totalTeachersWithAttendance > 0
              ? `${((totalTeachersAbsentCount / totalTeachersWithAttendance) * 100).toFixed(1)}% ${t('ofTotal', 'of total')}`
              : '0.0%'
          }
          enhanced
          responsive
          gradientFrom="from-red-500"
          gradientTo="to-red-600"
          loading={loading}
        />
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="category"
            angle={0}
            textAnchor="middle"
            height={60}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            interval={0}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            label={{
              value: t('numberOfTeachers', 'Number of Teachers'),
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#6b7280', fontSize: 12 }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="rect"
          />
          <Bar dataKey={morningShift} fill="#3b82f6" radius={[4, 4, 0, 0]}>
            <LabelList content={renderCustomLabel} />
          </Bar>
          <Bar dataKey={afternoonShift} fill="#10b981" radius={[4, 4, 0, 0]}>
            <LabelList content={renderCustomLabel} />
          </Bar>
          <Bar dataKey={eveningShift} fill="#f59e0b" radius={[4, 4, 0, 0]}>
            <LabelList content={renderCustomLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TeacherAttendanceTimingChart;
