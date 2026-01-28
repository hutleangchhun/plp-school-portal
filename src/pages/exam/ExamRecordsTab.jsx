import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLoading } from "../../contexts/LoadingContext";
import { useToast } from "../../contexts/ToastContext";
import { scoreService } from "../../utils/api/services/scoreService";
import { getFullName } from "../../utils/usernameUtils";
import { genderToKhmer } from "../../utils/formatters";
import { PageLoader } from "../../components/ui/DynamicLoader";
import EmptyState from "../../components/ui/EmptyState";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import ExportProgressModal from "../../components/modals/ExportProgressModal";
import { BookOpen, Download } from "lucide-react";

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

/**
 * ExamRecordsTab Component
 * Displays student monthly exam scores with filtering functionality
 */
export default function ExamRecordsTab({
  selectedClass,
  globalFilterMonth,
  globalFilterYear,
  t,
}) {
  const { startLoading, stopLoading } = useLoading();
  const { showError, showSuccess } = useToast();

  // State for Monthly Exam Records
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for Class Score Export
  const [isExportingClassScores, setIsExportingClassScores] = useState(false);
  const [exportProgressModal, setExportProgressModal] = useState({
    isOpen: false,
    progress: 0,
    status: "processing", // 'processing', 'success', 'error'
  });

  /**
   * Export class scores to Excel
   */
  const handleExportClassScores = useCallback(async () => {
    try {
      if (!selectedClass) {
        showError(t("selectClassFirst", "Please select a class first"));
        return;
      }

      setIsExportingClassScores(true);
      setExportProgressModal({
        isOpen: true,
        progress: 10,
        status: "processing",
      });

      const year = parseInt(globalFilterYear);
      const month = globalFilterMonth;

      setExportProgressModal((prev) => ({
        ...prev,
        progress: 30,
      }));

      // Use service function to export class scores
      const blob = await scoreService.exportClassScores(selectedClass, year, month);

      setExportProgressModal((prev) => ({
        ...prev,
        progress: 70,
      }));

      // Ensure correct MIME type for Excel files
      const excelBlob = blob.type !==
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ? new Blob([blob], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          })
        : blob;

      setExportProgressModal((prev) => ({
        ...prev,
        progress: 85,
      }));

      // Download the file
      const url = window.URL.createObjectURL(excelBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `student-exams-records-${year}-${month}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportProgressModal((prev) => ({
        ...prev,
        progress: 100,
        status: "success",
      }));

      showSuccess(
        t("classScoresExported", "Class scores exported successfully"),
      );

      setTimeout(() => {
        setExportProgressModal({
          isOpen: false,
          progress: 0,
          status: "processing",
        });
      }, 1000);
    } catch (error) {
      console.error("Error exporting class scores:", error);
      setExportProgressModal((prev) => ({
        ...prev,
        status: "error",
      }));

      let errorMessage = t(
        "errorExportingClassScores",
        "Failed to export class scores",
      );

      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      showError(errorMessage);

      setTimeout(() => {
        setExportProgressModal({
          isOpen: false,
          progress: 0,
          status: "processing",
        });
      }, 2000);
    } finally {
      setIsExportingClassScores(false);
      stopLoading("exportClassScores");
    }
  }, [
    selectedClass,
    globalFilterYear,
    globalFilterMonth,
    showError,
    showSuccess,
    stopLoading,
    t,
  ]);

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
        "fetchMonthlyScores",
        t("loadingExamRecords", "Loading exam records..."),
      );

      const year = parseInt(globalFilterYear);
      const month = globalFilterMonth;

      // Use service function to fetch monthly scores
      const response = await scoreService.getMonthlyExamScores({
        classId: selectedClass,
        month,
        year,
      });

      if (response.success) {
        setMonthlyRecords(response.data);
        setError(null);
      } else {
        setMonthlyRecords([]);
        setError(t("errorFetchingExamRecords", "Failed to fetch exam records"));
      }
    } catch (error) {
      console.error("Error fetching monthly scores:", error);
      setError(
        error?.message ||
          t("errorFetchingExamRecords", "Failed to fetch exam records"),
      );
      setMonthlyRecords([]);
    } finally {
      setLoading(false);
      stopLoading("fetchMonthlyScores");
    }
  }, [selectedClass, globalFilterMonth, globalFilterYear, startLoading, stopLoading, t]);

  /**
   * Fetch monthly scores when class or global filters change
   */
  useEffect(() => {
    if (selectedClass) {
      // Reset data while fetching new data
      setMonthlyRecords([]);
      fetchMonthlyScores();
    }
  }, [selectedClass, fetchMonthlyScores]);

  /**
   * Get table columns configuration
   */
  const getTableColumns = () => [
    {
      key: "studentName",
      header: t("student", "Student"),
      accessor: "studentName",
      disableSort: false,
    },
    {
      key: "gender",
      header: t("gender", "Gender"),
      accessor: "gender",
      disableSort: false,
    },
    {
      key: "totalAverage",
      header: t("average", "Average"),
      accessor: "totalAverage",
      render: (item) => (
        <Badge color="purple" variant="solid">
          {typeof item.totalAverage === "number"
            ? item.totalAverage.toFixed(2)
            : "-"}
        </Badge>
      ),
      disableSort: false,
    },
    {
      key: "grade",
      header: t("grading", "Grade"),
      accessor: "grade",
      render: (item) => (
        <Badge
          color={
            item.grade === "A"
              ? "green"
              : item.grade === "B"
              ? "blue"
              : item.grade === "C"
              ? "yellow"
              : item.grade === "D"
              ? "orange"
              : item.grade === "F"
              ? "red"
              : "gray"
          }
          variant="solid"
        >
          {item.grade}
        </Badge>
      ),
      disableSort: false,
    },
  ];

  /**
   * Transform monthly records to table data
   */
  const getTableData = useMemo(() => {
    return monthlyRecords.map((record) => {
      const studentName = getFullName(record.student || {}, "Unknown");
      const studentGender = genderToKhmer(record.student?.gender);

      // Calculate total average (all subjects) - new subject-based structure
      const allScores = [
        record.khmer,
        record.math,
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
        gender: studentGender,
        totalAverage,
        grade,
        record,
      };
    });
  }, [monthlyRecords]);

  /**
   * Filter table data by search term
   */
  const filteredTableData = useMemo(() => {
    if (!searchTerm.trim()) {
      return getTableData;
    }

    const search = searchTerm.toLowerCase();
    return getTableData.filter((row) => {
      const studentName = (row.studentName || "").toLowerCase();
      return studentName.includes(search);
    });
  }, [getTableData, searchTerm]);

  return (
    <div className="mt-6">
      {/* Search and Export in same row */}
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 mb-4 items-end w-full">
        {/* Search */}
        <div className="col-span-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("search", "Search")}
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("searchStudents", "Search by student name...")}
            disabled={loading || !selectedClass}
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
          />
        </div>

        {/* Export Button */}
        {selectedClass && (
          <div>
            <Button
              onClick={handleExportClassScores}
              disabled={isExportingClassScores}
              className="flex items-center gap-2 w-full"
              variant="primary"
              size="sm"
            >
              <Download className="w-4 h-4" />
              {isExportingClassScores
                ? t("loadingData", "Exporting...")
                : t("exportReport", "Export Class Records")}
            </Button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white overflow-hidden mt-4 rounded-lg shadow">
        {!selectedClass ? (
          <EmptyState
            icon={BookOpen}
            title={t("selectClassFirst", "Select a Class")}
            description={t(
              "selectClassFirstDesc",
              "Please select a class from the filters above to view exam records",
            )}
          />
        ) : loading ? (
          <PageLoader
            message={t("loadingExamRecords", "Loading exam records...")}
          />
        ) : error ? (
          <EmptyState
            icon={BookOpen}
            title={t("error", "Error")}
            description={error}
            actionLabel={t("retry", "Retry")}
            onAction={fetchMonthlyScores}
          />
        ) : filteredTableData.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={t("noStudents", "No Students")}
            description={t(
              "noStudentsInClass",
              "No students found in this class for the selected month",
            )}
            actionLabel={t("clearSearch", "Clear Search")}
            onAction={() => setSearchTerm("")}
          />
        ) : (
          <Table
            columns={getTableColumns()}
            data={filteredTableData}
            loading={loading}
            t={t}
            showPagination={false}
          />
        )}
      </div>

      {/* Export Progress Modal */}
      <ExportProgressModal
        isOpen={exportProgressModal.isOpen}
        progress={exportProgressModal.progress}
        status={exportProgressModal.status}
        onComplete={() => {
          setExportProgressModal({
            isOpen: false,
            progress: 0,
            status: "processing",
          });
        }}
      />
    </div>
  );
}
