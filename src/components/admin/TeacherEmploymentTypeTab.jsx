import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { dashboardService } from '../../utils/api/services/dashboardService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users } from 'lucide-react';
import DynamicLoader from '../ui/DynamicLoader';

const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const TeacherEmploymentTypeTab = ({ filters }) => {
  const { t } = useLanguage();
  const { error, handleError, clearError } = useErrorHandler();
  const [employmentStats, setEmploymentStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const fetchStats = useCallback(async () => {
    // Prevent duplicate requests
    if (fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      setLoading(true);
      clearError();

      const params = {};
      if (filters.selectedProvince) params.provinceId = parseInt(filters.selectedProvince, 10);
      if (filters.selectedDistrict) params.districtId = parseInt(filters.selectedDistrict, 10);
      if (filters.selectedSchool) params.schoolId = parseInt(filters.selectedSchool, 10);

      const response = await dashboardService.getTeacherEmploymentTypeStats(params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load employment type statistics');
      }

      const data = response.data;
      setEmploymentStats(data);

      // Transform data for chart
      if (data.employmentTypeCounts) {
        const chartData = Object.entries(data.employmentTypeCounts).map(([type, count]) => ({
          name: type,
          count: count
        })).sort((a, b) => b.count - a.count);

        setChartData(chartData);
      }
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadStats', 'Failed to load employment type statistics'),
      });
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [filters?.selectedProvince, filters?.selectedDistrict, filters?.selectedSchool, handleError, clearError, t]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Show loading state
  if (loading && !employmentStats) {
    return (
      <DynamicLoader
        type="skeleton"
        lines={8}
        className="w-full"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {employmentStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-gray-200 shadow-sm rounded-md">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                {t('totalTeachers', 'Total Teachers')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {employmentStats.overall?.totalTeachers || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm rounded-md">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                {t('employmentTypes', 'Employment Types')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {Object.keys(employmentStats.employmentTypeCounts || {}).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="border border-gray-200 shadow-sm rounded-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {t('teacherDistribution', 'Teacher Distribution by Employment Type')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details Table */}
      {employmentStats && chartData.length > 0 && (
        <Card className="border border-gray-200 shadow-sm rounded-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {t('details', 'Details')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      {t('employmentType', 'Employment Type')}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      {t('count', 'Count')}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      {t('percentage', 'Percentage')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((item, index) => {
                    const percentage = employmentStats.overall?.totalTeachers > 0
                      ? ((item.count / employmentStats.overall.totalTeachers) * 100).toFixed(2)
                      : 0;
                    return (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-right text-gray-600 font-semibold">
                          {item.count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!employmentStats && !loading && (
        <Card className="border border-gray-200 shadow-sm rounded-md">
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">
                {t('noData', 'No data available')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeacherEmploymentTypeTab;
