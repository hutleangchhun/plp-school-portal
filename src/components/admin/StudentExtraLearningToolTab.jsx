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
      case "new":
        return t("newYear", "ឆ្នាំថ្មី");
      case "old":
        return t("oldYear", "ឆ្នាំចាស់");
      case "សាលាផ្តល់ជូន":
        return t("schoolProvided", "សាលាផ្តល់ជូន");
      case "មាតាបិតា​ទិញឱ្យ":
      case "មាតាបិតាទិញឱ្យ":
        return t("parentPurchased", "មាតាបិតាទិញឱ្យ");
      case "unspecified":
        return t("unspecified", "Unspecified");
      default:
        return status;
    }
  };

  const getProviderLabel = (provider) => {
    switch(provider) {
      case "unspecified":
        return t("unspecified", "Unspecified");
      case "សាលាផ្តល់ជូន":
        return t("schoolProvided", "សាលាផ្តល់ជូន");
      case "មាតាបិតាទិញឱ្យ":
      case "មាតាបិតា​ទិញឱ្យ":
        return t("parentPurchased", "មាតាបិតាទិញឱ្យ");
      case "អាណាព្យាបាល":
        return t("other", "អាណាព្យាបាល");
      default:
        return provider;
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
  const toolsChartData = toolStats?.tools?.map(tool => {
    const newCount = tool.byStatus?.new || 0;
    const oldCount = tool.byStatus?.old || 0;
    return {
      name: getToolLabel(tool.packageName),
      newYear: newCount,
      oldYear: oldCount,
      total: tool.hasPackage
    };
  }) || [];

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

      {/* Chart and Table Grid - Responsive Layout */}
      {(toolsChartData.length > 0 || (toolStats?.tools && toolStats.tools.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Combined Tools Distribution Chart */}
          {toolsChartData.length > 0 && (
            <Card className="border border-gray-200 shadow-sm rounded-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  {t("toolDistribution", "Learning Tools Statistics by Status and Total")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full" style={{ height: '450px' }}>
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
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar
                        dataKey="newYear"
                        name={t("newYear", "ឆ្នាំថ្មី")}
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="oldYear"
                        name={t("oldYear", "ឆ្នាំចាស់")}
                        fill="#f59e0b"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="total"
                        name={t("totalWithPackages", "Total with Packages")}
                        fill="#3b82f6"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status & Provider Breakdown Table */}
          {toolStats?.tools && toolStats.tools.length > 0 && (
            <Card className="border border-gray-200 shadow-sm rounded-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  {t("statusAndProviderBreakdown", "Status & Provider Breakdown by Tool")}
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
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          {t("totalWithPackages", "Total with Packages")}
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          {t("status", "Status")}
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          {t("count", "Count")}
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          {t("percentage", "Percentage")}
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          {t("provider", "Provider")}
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          {t("count", "Count")}
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          {t("percentage", "Percentage")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {toolStats.tools.map((tool, toolIndex) => {
                        const statusEntries = Object.entries(tool.byStatus || {});
                        const providerEntries = Object.entries(tool.byProvider || {});
                        const maxRows = Math.max(statusEntries.length, providerEntries.length);

                        // Calculate percentages
                        const statusTotal = statusEntries.reduce((sum, [, count]) => sum + count, 0);
                        const providerTotal = providerEntries.reduce((sum, [, count]) => sum + count, 0);

                        return statusEntries.length > 0 || providerEntries.length > 0 ? (
                          Array.from({ length: maxRows }).map((_, rowIndex) => {
                            const [statusName, statusCount] = statusEntries[rowIndex] || [null, 0];
                            const [providerName, providerCount] = providerEntries[rowIndex] || [null, 0];
                            const statusPercentage = statusTotal > 0 ? (statusCount / statusTotal * 100) : 0;
                            const providerPercentage = providerTotal > 0 ? (providerCount / providerTotal * 100) : 0;

                            return (
                              <tr
                                key={`${toolIndex}-${rowIndex}`}
                                className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                              >
                                {rowIndex === 0 && (
                                  <td
                                    className="px-4 py-3 text-gray-900 font-semibold"
                                    rowSpan={maxRows}
                                  >
                                    {getToolLabel(tool.packageName)}
                                  </td>
                                )}
                                {rowIndex === 0 && (
                                  <td
                                    className="px-4 py-3 text-right text-gray-900 font-semibold bg-blue-50"
                                    rowSpan={maxRows}
                                  >
                                    {tool.hasPackage.toLocaleString()}
                                  </td>
                                )}
                                <td className="px-4 py-3 text-gray-700">
                                  {statusName ? getStatusLabel(statusName) : '-'}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600 font-semibold">
                                  {statusName ? statusCount.toLocaleString() : '-'}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">
                                  {statusName ? statusPercentage.toFixed(2) : '-'}%
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {providerName ? getProviderLabel(providerName) : '-'}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600 font-semibold">
                                  {providerName ? providerCount.toLocaleString() : '-'}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">
                                  {providerName ? providerPercentage.toFixed(2) : '-'}%
                                </td>
                              </tr>
                            );
                          })
                        ) : null;
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
