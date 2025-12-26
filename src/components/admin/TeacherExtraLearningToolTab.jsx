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

const TeacherExtraLearningToolTab = ({ filters }) => {
  const { t } = useLanguage();
  const { error, handleError, clearError } = useErrorHandler();
  const [toolStats, setToolStats] = useState(null);
  const [toolChartData, setToolChartData] = useState([]);
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
      if (filters.selectedProvince)
        params.provinceId = parseInt(filters.selectedProvince, 10);
      if (filters.selectedDistrict)
        params.districtId = parseInt(filters.selectedDistrict, 10);
      if (filters.selectedSchool)
        params.schoolId = parseInt(filters.selectedSchool, 10);

      const response = await dashboardService.getTeacherExtraLearningToolStats(
        params
      );

      if (!response.success) {
        throw new Error(
          response.error || "Failed to load extra learning tool statistics"
        );
      }

      const data = response.data;
      setToolStats(data);

      // Transform tool data for chart with nested values
      if (data.toolCounts) {
        const allowedTools = ["math_grade1_package", "reading_material_package"];
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

        const getFieldLabel = (fieldName) => {
          switch(fieldName) {
            case "manipulatives":
              return t("manipulatives", "សម្ភារឧបទេស");
            case "picture_cards":
              return t("picture_cards", "ប័ណ្ឌរូបភាព");
            case "_hasPackage":
              return t("hasPackage", "មានកញ្ចប់");
            default:
              return fieldName;
          }
        };

        const toolData = Object.entries(data.toolCounts)
          .filter(([toolName]) => allowedTools.includes(toolName))
          .map(([toolName, toolDetails]) => {
            const item = {
              name: toolName,
              displayName: getToolLabel(toolName)
            };
            let totalCount = 0;
            if (typeof toolDetails === "object") {
              Object.entries(toolDetails).forEach(([key, val]) => {
                if (typeof val === "number") {
                  item[key] = val;
                  item[`${key}_label`] = getFieldLabel(key);
                  totalCount += val;
                }
              });
            }
            item.total = totalCount;
            return item;
          })
          .filter((item) => item.total > 0)
          .sort((a, b) => b.total - a.total);

        setToolChartData(toolData);
      }
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

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {toolStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatsCard
            title={t("totalTeachers", "Total Teachers")}
            value={toolStats.overall?.totalTeachers || 0}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
            valueColor="text-blue-600"
            enhanced
            responsive
          />
          <StatsCard
            title={t("learningTools", "Learning Tools")}
            value={Object.keys(toolStats.toolCounts || {}).length}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
            valueColor="text-green-600"
            hoverColor="hover:border-green-300"
            enhanced
            responsive
          />
          
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart */}
        {toolChartData.length > 0 && (
          <Card className="border border-gray-200 shadow-sm rounded-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {t(
                  "toolDistribution",
                  "Teacher Distribution by Extra Learning Tools"
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full" style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={toolChartData} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="displayName"
                      tick={{ fontSize: 11 }}
                      angle={360}
                      textAnchor="end"
                      height={10}
                      interval={0}
                    />
                    <YAxis type="number" tick={{ fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                      content={<CustomTooltip />}
                      labelFormatter={(value) => value}
                      formatter={(value, name) => {
                        const dataItem = toolChartData[0];
                        const label = dataItem[`${name}_label`] || name;
                        return [value.toLocaleString(), label];
                      }}
                    />
                    {toolChartData.length > 0 && Object.keys(toolChartData[0])
                      .filter(key => !key.endsWith("_label") && key !== "name" && key !== "displayName" && key !== "total")
                      .map((key, idx) => {
                        const label = toolChartData[0][`${key}_label`] || key;
                        return (
                          <Bar
                            key={key}
                            dataKey={key}
                            name={label}
                            stackId="stack"
                            fill={colors[idx % colors.length]}
                            radius={idx === 0 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                          />
                        );
                      })
                    }
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
                {t("details", "Details")}
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
                        {t("field", "Field")}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        {t("count", "Teachers")}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        {t("percentage", "Percentage")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {toolChartData.map((item, itemIndex) => {
                      const nestedFields = Object.keys(item).filter(
                        (key) => !key.endsWith("_label") && key !== "name" && key !== "displayName" && key !== "total"
                      );
                      return nestedFields.map((field, fieldIndex) => {
                        const count = item[field];
                        const fieldLabel = item[`${field}_label`] || field;
                        const percentage =
                          toolStats.overall?.totalTeachers > 0
                            ? (
                                (count / toolStats.overall.totalTeachers) *
                                100
                              ).toFixed(2)
                            : 0;
                        return (
                          <tr
                            key={`${itemIndex}-${fieldIndex}`}
                            className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            {fieldIndex === 0 && (
                              <td
                                className="px-4 py-3 text-gray-900 font-semibold"
                                rowSpan={nestedFields.length}
                              >
                                {item.displayName}
                              </td>
                            )}
                            <td className="px-4 py-3 text-gray-700">
                              {fieldLabel}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600 font-semibold">
                              {count.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {percentage}%
                            </td>
                          </tr>
                        );
                      });
                    })}
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

export default TeacherExtraLearningToolTab;
