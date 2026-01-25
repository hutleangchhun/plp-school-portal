import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useLoading } from "../../contexts/LoadingContext";
import { API_BASE_URL } from "../../utils/api/config";
import { getFullName } from "../../utils/usernameUtils";
import { PageLoader } from "../../components/ui/DynamicLoader";
import EmptyState from "../../components/ui/EmptyState";
import Badge from "../../components/ui/Badge";
import { Trophy } from "lucide-react";

/**
 * Score calculation utilities
 */
const calculateAverageScore = (scores) => {
  const validScores = scores.filter((s) => typeof s === "number" && s > 0);
  if (validScores.length === 0) return 0;
  return validScores.reduce((a, b) => a + b, 0) / validScores.length;
};

const getGrade = (average) => {
  if (average >= 8.5) return "A";
  if (average >= 7) return "B";
  if (average >= 5.5) return "C";
  if (average >= 4) return "D";
  if (average > 0) return "F";
  return "-";
};

// Color mapping for top 5 students
const getRankColor = (rank) => {
  switch (rank) {
    case 1:
      return "#10b981"; // Green
    case 2:
      return "#3b82f6"; // Blue
    case 3:
      return "#8b5cf6"; // Purple
    case 4:
    case 5:
      return "#f59e0b"; // Orange
    default:
      return "#6b7280"; // Gray
  }
};

const getGradeBadgeColor = (grade) => {
  switch (grade) {
    case "A":
      return "green";
    case "B":
      return "blue";
    case "C":
      return "yellow";
    case "D":
      return "orange";
    case "F":
      return "red";
    default:
      return "gray";
  }
};

/**
 * HonorRollTab Component
 * Displays top 5 students in a class by monthly exam average
 */
export default function HonorRollTab({
  selectedClass,
  globalFilterMonth,
  globalFilterYear,
  t,
}) {
  const { startLoading, stopLoading } = useLoading();

  // State for Honor Roll Data
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterMonth, setFilterMonth] = useState(globalFilterMonth || new Date().getMonth() + 1);
  const [filterAcademicYear, setFilterAcademicYear] = useState(
    globalFilterYear || new Date().getFullYear().toString(),
  );

  // Sync with global filters
  useEffect(() => {
    if (globalFilterMonth) setFilterMonth(globalFilterMonth);
    if (globalFilterYear) setFilterAcademicYear(globalFilterYear);
  }, [globalFilterMonth, globalFilterYear]);

  /**
   * Fetch monthly exam scores for the selected class and month
   */
  const fetchMonthlyScores = useCallback(async () => {
    try {
      if (!selectedClass) {
        setMonthlyRecords([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      startLoading(
        "fetchHonorRollScores",
        t("loadingExamRecords", "Loading exam records..."),
      );

      const year = parseInt(filterAcademicYear);
      const month = filterMonth;

      // Fetch monthly scores from API
      const response = await axios.get(
        `${API_BASE_URL}/student-monthly-exam`,
        {
          params: {
            month,
            year,
            classId: selectedClass,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        },
      );


      if (Array.isArray(response.data)) {
        setMonthlyRecords(response.data);
        setError(null);
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        setMonthlyRecords(response.data.data);
        setError(null);
      } else {
        console.error("Unexpected response format:", response.data);
        setMonthlyRecords([]);
        setError(t("invalidDataFormat", "Invalid data format received"));
      }
    } catch (error) {
      console.error("Error fetching monthly scores:", error);
      setError(
        error?.response?.data?.message ||
          t("errorFetchingExamRecords", "Failed to fetch exam records"),
      );
      setMonthlyRecords([]);
    } finally {
      setLoading(false);
      stopLoading("fetchHonorRollScores");
    }
  }, [selectedClass, filterMonth, filterAcademicYear, startLoading, stopLoading, t]);

  /**
   * Fetch monthly scores when class or filters change
   */
  useEffect(() => {
    if (selectedClass) {
      // Reset data while fetching new data
      setMonthlyRecords([]);
      fetchMonthlyScores();
    }
  }, [selectedClass, filterMonth, filterAcademicYear, fetchMonthlyScores]);

  /**
   * Calculate top 5 students with averages
   */
  const topStudents = useMemo(() => {
    const studentsWithAverages = monthlyRecords.map((record) => {
      const studentName = getFullName(record.student || {}, "Unknown");

      // Calculate total average (all subjects)
      const allScores = [
        record.khmerListening,
        record.khmerWriting,
        record.khmerReading,
        record.khmerSpeaking,
        record.mathNumber,
        record.mathGeometry,
        record.mathStatistic,
        record.science,
        record.socialStudies,
        record.sport,
        record.healthHygiene,
        record.lifeSkills,
        record.foreignLanguage,
      ];
      const totalAverage = calculateAverageScore(allScores);
      const grade = getGrade(totalAverage);

      return {
        id: `student-${record.studentId}`,
        studentName,
        totalAverage,
        grade,
        record,
      };
    });

    // Sort by average descending and take top 5
    return studentsWithAverages
      .sort((a, b) => b.totalAverage - a.totalAverage)
      .slice(0, 5)
      .map((student, index) => ({
        ...student,
        rank: index + 1,
      }));
  }, [monthlyRecords]);

  return (
    <div className="mt-6">
      {/* Results */}
      <div className="bg-white overflow-hidden mt-4 rounded-lg shadow">
        {!selectedClass ? (
          <EmptyState
            icon={Trophy}
            title={t("selectClassFirst", "Select a Class")}
            description={t(
              "selectClassFirstDesc",
              "Please select a class from the filters above to view honor roll",
            )}
          />
        ) : loading ? (
          <PageLoader
            message={t("loadingExamRecords", "Loading exam records...")}
          />
        ) : error ? (
          <EmptyState
            icon={Trophy}
            title={t("error", "Error")}
            description={error}
            actionLabel={t("retry", "Retry")}
            onAction={fetchMonthlyScores}
          />
        ) : monthlyRecords.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title={t("noStudents", "No Students")}
            description={t(
              "noStudentsInClass",
              "No students found in this class for the selected month",
            )}
          />
        ) : (
          <div className="p-6">
            {topStudents.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  {t("honorRoll", "Honor Roll")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topStudents.map((student) => (
                    <div
                      key={student.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      style={{
                        borderLeft: `4px solid ${getRankColor(student.rank)}`,
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm text-gray-600 font-medium">
                            {student.rank === 1
                              ? "🥇 1st Place"
                              : student.rank === 2
                              ? "🥈 2nd Place"
                              : student.rank === 3
                              ? "🥉 3rd Place"
                              : `${student.rank}th Place`}
                          </p>
                          <p className="font-semibold text-gray-900">
                            {student.studentName}
                          </p>
                        </div>
                        <Badge color={getGradeBadgeColor(student.grade)} variant="solid">
                          {student.grade}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          {student.totalAverage.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">{t("average", "Average")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
