import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { dashboardService } from '../../utils/api/services/dashboardService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users } from 'lucide-react';

const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const TeacherExtraLearningToolTab = ({ filters }) => {
  const { t } = useLanguage();
  const { error, handleError, clearError } = useErrorHandler();
  const [toolStats, setToolStats] = useState(null);
  const [toolChartData, setToolChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [filters]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      clearError();

      const params = {};
      if (filters.selectedProvince) params.provinceId = parseInt(filters.selectedProvince, 10);
      if (filters.selectedDistrict) params.districtId = parseInt(filters.selectedDistrict, 10);
      if (filters.selectedSchool) params.schoolId = parseInt(filters.selectedSchool, 10);

      const response = await dashboardService.getTeacherExtraLearningToolStats(params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load extra learning tool statistics');
      }

      const data = response.data;
      setToolStats(data);

      // Transform tool data for chart
      if (data.toolCounts) {
        const toolData = Object.entries(data.toolCounts).map(([toolName, toolDetails]) => {
          let totalCount = 0;
          if (typeof toolDetails === 'object') {
            totalCount = Object.values(toolDetails).reduce((sum, val) => {
              return sum + (typeof val === 'number' ? val : 0);
            }, 0);
          }
          return {
            name: toolName,
            count: totalCount
          };
        }).filter(item => item.count > 0).sort((a, b) => b.count - a.count);

        setToolChartData(toolData);
      }
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadStats', 'Failed to load extra learning tool statistics'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {toolStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-gray-200 shadow-sm rounded-md">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                {t('totalTeachers', 'Total Teachers')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {toolStats.overall?.totalTeachers || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm rounded-md">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                {t('learningTools', 'Learning Tools')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {Object.keys(toolStats.toolCounts || {}).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      {toolChartData.length > 0 && (
        <Card className="border border-gray-200 shadow-sm rounded-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {t('toolDistribution', 'Teacher Distribution by Extra Learning Tools')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toolChartData}>
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
                    {toolChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tool Details Table */}
      {toolStats && toolChartData.length > 0 && (
        <Card className="border border-gray-200 shadow-sm rounded-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {t('toolDetails', 'Tool Details')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      {t('toolName', 'Tool Name')}
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
                  {toolChartData.map((item, index) => {
                    const percentage = toolStats.overall?.totalTeachers > 0
                      ? ((item.count / toolStats.overall.totalTeachers) * 100).toFixed(2)
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
      {!toolStats && (loading || (filters.selectedSchool || filters.selectedDistrict || filters.selectedProvince)) && (
        <Card className="border border-gray-200 shadow-sm rounded-md">
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">
                {loading ? t('loading', 'Loading...') : t('noData', 'No data available')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeacherExtraLearningToolTab;
