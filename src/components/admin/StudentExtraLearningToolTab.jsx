import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useErrorHandler } from "../../hooks/useErrorHandler";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { dashboardService } from "../../utils/api/services/dashboardService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Users } from "lucide-react";
import DynamicLoader from "../ui/DynamicLoader";
import StatsCard from "../ui/StatsCard";
import CustomTooltip from "../ui/TooltipChart";
import Badge from "../ui/Badge";

const colors = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

const StudentExtraLearningToolTab = ({ filters }) => {
  const { t } = useLanguage();
  const { error, handleError, clearError } = useErrorHandler();
  const [toolStats, setToolStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const getToolLabel = (toolName) => {
    switch(toolName) {
      case "math_grade1_package":
        return t("math_grade1_package", "គណិតវិទ្យាថ្នាក់ដំបូង");
      case "reading_material_package":
        return t("reading_material_package", "កញ្ចប់សម្ភារៈអំណាន");
      default:
        return toolName;
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case "newStatusCount":
        return t("new", "ថ្មី");
      case "oldStatusCount":
        return t("old", "ចាស់");
      default:
        return status;
    }
  };

  const fetchStats = useCallback(async () => {
    // Prevent duplicate requests
    if (fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      setLoading(true);
      clearError();

      const params = {};
      if (filters.selectedProvince)
        params.provinceId = parseInt(filters.selectedProvince, 10);
      if (filters.selectedDistrict)
        params.districtId = parseInt(filters.selectedDistrict, 10);
      if (filters.selectedSchool)
        params.schoolId = parseInt(filters.selectedSchool, 10);

      const response = await dashboardService.getStudentExtraLearningToolStats(
        params
      );

      if (!response.success) {
        throw new Error(
          response.error || "Failed to load extra learning tool statistics"
        );
      }

      const data = response.data;
      setToolStats(data);
    } catch (err) {
      handleError(err, {
        toastMessage: t(
          "failedToLoadStats",
          "Failed to load extra learning tool statistics"
        ),
      });
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [
    filters?.selectedProvince,
    filters?.selectedDistrict,
    filters?.selectedSchool,
    handleError,
    clearError,
    t,
  ]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Show loading state
  if (loading && !toolStats) {
    return <DynamicLoader type="skeleton" lines={8} className="w-full" />;
  }

  // Prepare chart data for tools and status breakdown
  const toolsChartData = toolStats?.tools?.map(tool => ({
    name: getToolLabel(tool.packageName),
    [t("new", "ថ្មី")]: tool.newStatusCount,
    [t("old", "ចាស់")]: tool.oldStatusCount,
    total: tool.totalStudents
  })) || [];

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {toolStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title={t("totalStudents", "Total Students")}
            value={toolStats.totalStudents || 0}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
            valueColor="text-blue-600"
            enhanced
            responsive
          />
          <StatsCard
            title={t("withPackages", "Students with Packages")}
            value={toolStats.studentsWithPackages || 0}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
            valueColor="text-green-600"
            enhanced
            responsive
          />
          <StatsCard
            title={t("withoutPackages", "Students without Packages")}
            value={toolStats.studentsWithoutPackages || 0}
            iconBgColor="bg-orange-100"
            iconColor="text-orange-600"
            valueColor="text-orange-600"
            enhanced
            responsive
          />
          <StatsCard
            title={t("coverage", "Coverage")}
            value={`${toolStats.coveragePercentage?.toFixed(2) || 0}%`}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
            valueColor="text-purple-600"
            enhanced
            responsive
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* Tools Breakdown Chart */}
      {toolsChartData.length > 0 && (
        <Card className="border border-gray-200 shadow-sm rounded-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {t("toolDistribution", "Student Distribution by Learning Tools")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full" style={{ height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toolsChartData} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={0}
                    textAnchor="end"
                    height={30}
                  />
                  <YAxis type="number" tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                    content={<CustomTooltip />}
                    formatter={(value) => value.toLocaleString()}
                  />
                  <Legend />
                  <Bar
                    dataKey={t("new", "ថ្មី")}
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey={t("old", "ចាស់")}
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Breakdown Table */}
      {toolStats?.tools && toolStats.tools.length > 0 && (
        <Card className="border border-gray-200 shadow-sm rounded-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {t("providerBreakdown", "Provider Breakdown by Tool")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      {t("toolName", "Tool Name")}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      {t("providerName", "Provider Name")}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      {t("count", "Count")}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      {t("percentage", "Percentage")}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      {t("status", "Status")}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      {t("statusCount", "Count")}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      {t("statusPercentage", "Percentage")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {toolStats.tools.map((tool, toolIndex) =>
                    tool.providerBreakdown.map((provider, providerIndex) =>
                      provider.statusBreakdown.map((status, statusIndex) => (
                        <tr
                          key={`${toolIndex}-${providerIndex}-${statusIndex}`}
                          className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          {providerIndex === 0 && statusIndex === 0 && (
                            <td
                              className="px-4 py-3 text-gray-900 font-semibold"
                              rowSpan={tool.providerBreakdown.reduce((sum, p) => sum + p.statusBreakdown.length, 0)}
                            >
                              {getToolLabel(tool.packageName)}
                            </td>
                          )}
                          {statusIndex === 0 && (
                            <td
                              className="px-4 py-3 text-gray-700 font-medium"
                              rowSpan={provider.statusBreakdown.length}
                            >
                              {provider.providerName}
                            </td>
                          )}
                          {statusIndex === 0 && (
                            <td
                              className="px-4 py-3 text-right text-gray-600 font-semibold"
                              rowSpan={provider.statusBreakdown.length}
                            >
                              {provider.count.toLocaleString()}
                            </td>
                          )}
                          {statusIndex === 0 && (
                            <td
                              className="px-4 py-3 text-right text-gray-600"
                              rowSpan={provider.statusBreakdown.length}
                            >
                              {provider.percentage?.toFixed(2)}%
                            </td>
                          )}
                          <td className="px-4 py-3 text-right text-gray-600">
                            <Badge
                              color={status.status === 'new' ? 'green' : 'orange'}
                              variant="outline"
                              size="sm"
                            >
                              {status.status === 'new' ? t("newYear", "ឆ្នាំថ្មី") : t("oldYear", "ឆ្នាំចាស់")}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 font-semibold">
                            {status.count}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {status.percentage?.toFixed(2)}%
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      </div>

      {/* Empty State */}
      {!toolStats && !loading && (
        <Card className="border border-gray-200 shadow-sm rounded-md">
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">
                {t("noData", "No data available")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentExtraLearningToolTab;
