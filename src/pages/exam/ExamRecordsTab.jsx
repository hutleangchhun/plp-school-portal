import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { useLoading } from "../../contexts/LoadingContext";
import { examHistoryService } from "../../utils/api/services/examHistoryService";
import { studentService } from "@/utils/api";
import { encryptId } from "../../utils/encryption";
import { exportExamResultsToExcel } from "../../utils/examExportUtils";
import { formatClassIdentifier } from "../../utils/helpers";
import { getFullName } from "../../utils/usernameUtils";
import { PageLoader } from "../../components/ui/DynamicLoader";
import EmptyState from "../../components/ui/EmptyState";
import Table from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Dropdown from "../../components/ui/Dropdown";
import Modal from "../../components/ui/Modal";
import { BookOpen, Eye, Download } from "lucide-react";

/**
 * ExamRecordsTab Component
 * Displays student exam records with filtering and download functionality
 */
export default function ExamRecordsTab({
  classes,
  selectedClass,
  onClassChange,
  selectedMonth,
  selectedAcademicYear,
  user,
  t,
}) {
  const { showError, showSuccess } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const navigate = useNavigate();

  // State for Exam Records
  const [studentRecords, setStudentRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalStudents: 0,
    totalPages: 1,
    allStudents: [],
  });

  // State for Download Modal
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedStudentForDownload, setSelectedStudentForDownload] =
    useState(null);
  const [selectedExamsForDownload, setSelectedExamsForDownload] = useState(
    new Set(),
  );
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Fetch all students from teacher's classes using school API with pagination
   */
  const fetchAllStudents = useCallback(
    async (page = 1, pageSize = 10) => {
      try {
        let studentsList = [];
        const schoolId = user?.teacher?.schoolId || user?.schoolId;

        if (selectedClass && schoolId) {
          const apiParams = {
            classId: selectedClass,
            page: page,
            limit: pageSize,
          };

          console.log("Fetching students with pagination params:", apiParams);

          const response = await studentService.getStudentsBySchoolClasses(
            schoolId,
            apiParams,
          );

          console.log("API Response:", response);
          console.log("Pagination from API:", response.pagination);

          if (response.success) {
            studentsList = response.data || [];

            // Update pagination info from API response directly
            console.log("=== PAGINATION DEBUG ===");
            console.log("Requested pageSize:", pageSize);
            console.log("API returned students count:", studentsList.length);
            console.log("API pagination object:", response.pagination);
            console.log("=== END DEBUG ===");

            if (response.pagination) {
              setPagination((prev) => ({
                ...prev,
                currentPage: response.pagination.page,
                pageSize: response.pagination.limit,
                totalStudents: response.pagination.total,
                totalPages: response.pagination.pages,
                allStudents: studentsList,
              }));
            }
          }
        }

        return studentsList;
      } catch (error) {
        console.error("Error fetching students:", error);
        return [];
      }
    },
    [selectedClass, user],
  );

  /**
   * Fetch exam records for the current page
   */
  const fetchExamRecords = useCallback(
    async (page = 1) => {
      try {
        // Only proceed if a class is selected
        if (!selectedClass) {
          setStudentRecords([]);
          setLoading(false);
          stopLoading("fetchExamRecords");
          return;
        }

        setLoading(true);
        setError(null);
        startLoading(
          "fetchExamRecords",
          t("loadingExamRecords", "Loading exam records..."),
        );

        // Fetch students for the current page with the current pageSize limit (pagination handled by API)
        const studentsList = await fetchAllStudents(page, pagination.pageSize);

        // Fetch exam records for each student using the new endpoint
        const studentRecordsMap = new Map();

        for (const student of studentsList) {
          try {
            // Extract userId from nested user object or use direct id
            const userId = student.user?.id || student.userId || student.id;

            if (!userId) {
              console.warn("Student has no userId:", student);
              studentRecordsMap.set(student.studentId || student.id, {
                student: student,
                exams: [],
                hasRecords: false,
              });
              continue;
            }

            console.log(
              `Fetching exam history for student userId: ${userId}, studentId: ${student.studentId}`,
            );

            // Construct date range for the selected month
            const year = parseInt(selectedAcademicYear);
            const month = selectedMonth;
            const startDate = `${year}-${String(month).padStart(2, "0")}-01`;

            // Calculate last day of the month
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

            const response =
              await examHistoryService.getUserExamHistoryFiltered(userId, {
                startDate,
                endDate,
                page: 1,
                limit: 10,
              });

            // API returns array of exam records for the user
            const exams = Array.isArray(response.data)
              ? response.data
              : response.data
                ? [response.data]
                : [];

            console.log(
              `Found ${exams.length} exam records for userId ${userId}`,
            );

            studentRecordsMap.set(student.studentId || student.id, {
              student: student,
              exams: exams,
              hasRecords: exams.length > 0,
            });
          } catch (error) {
            const userId = student.user?.id || student.userId || student.id;
            console.warn(
              `Failed to fetch exam history for student ${userId}:`,
              error,
            );
            // Continue with other students even if one fails
            studentRecordsMap.set(student.studentId || student.id, {
              student: student,
              exams: [],
              hasRecords: false,
            });
          }
        }

        // Convert map to array, maintaining student order
        const merged = studentsList.map(
          (student) =>
            studentRecordsMap.get(student.studentId || student.id) || {
              student: student,
              exams: [],
              hasRecords: false,
            },
        );

        setStudentRecords(merged);
      } catch (error) {
        console.error("Error fetching exam records:", error);
        setError(
          error?.response?.data?.message ||
            t("errorFetchingExamRecords", "Failed to fetch exam records"),
        );
        setStudentRecords([]);
      } finally {
        setLoading(false);
        stopLoading("fetchExamRecords");
      }
    },
    [
      selectedClass,
      selectedMonth,
      selectedAcademicYear,
      startLoading,
      stopLoading,
      t,
      pagination.pageSize,
      user,
      fetchAllStudents,
    ],
  );

  /**
   * Fetch exam records when class or filters change
   */
  useEffect(() => {
    if (selectedClass) {
      setPagination((prev) => ({
        ...prev,
        currentPage: 1,
      }));
      fetchExamRecords(1);
    }
  }, [selectedClass, selectedMonth, selectedAcademicYear]);

  /**
   * Handle viewing student exam records
   */
  const handleViewStudentRecords = (studentRecord) => {
    const userId =
      studentRecord.student.user?.id ||
      studentRecord.student.userId ||
      studentRecord.student.id;
    const encryptedUserId = encryptId(userId);

    // Get selected class info for context
    const selectedClassInfo = classes.find(
      (c) => c.classId === selectedClass || c.id === selectedClass,
    );

    navigate(`/exam-records/${encryptedUserId}`, {
      state: {
        student: studentRecord.student,
        exams: studentRecord.exams || [],
        // Pass additional context from TeacherExamRecords
        context: {
          sourceClass: selectedClassInfo,
          sourceRoute: "/my-students-exams",
          totalStats: {
            totalExams: studentRecord.exams?.length || 0,
            passedCount:
              studentRecord.exams?.filter(
                (e) => e.status === "COMPLETED" && e.passed,
              ).length || 0,
            failedCount:
              studentRecord.exams?.filter(
                (e) => e.status === "COMPLETED" && !e.passed,
              ).length || 0,
            completedCount:
              studentRecord.exams?.filter((e) => e.status === "COMPLETED")
                .length || 0,
          },
        },
      },
    });
  };

  /**
   * Open download modal for a student
   */
  const handleOpenDownloadModal = (studentRecord) => {
    setSelectedStudentForDownload(studentRecord);
    setSelectedExamsForDownload(
      new Set(studentRecord.exams.map((_, idx) => idx)),
    );
    setShowDownloadModal(true);
  };

  /**
   * Toggle exam selection in the modal
   */
  const toggleExamSelection = (examIndex) => {
    const newSelection = new Set(selectedExamsForDownload);
    if (newSelection.has(examIndex)) {
      newSelection.delete(examIndex);
    } else {
      newSelection.add(examIndex);
    }
    setSelectedExamsForDownload(newSelection);
  };

  /**
   * Export selected exams to Excel
   */
  const handleExportSelectedExams = async () => {
    try {
      if (!selectedStudentForDownload || selectedExamsForDownload.size === 0) {
        showError(
          t(
            "selectExamsToDownload",
            "Please select at least one exam to download",
          ),
        );
        return;
      }

      setIsExporting(true);
      startLoading("exportExams", t("exportingExams", "Exporting exams..."));

      // Filter selected exams
      const selectedExams = selectedStudentForDownload.exams.filter((_, idx) =>
        selectedExamsForDownload.has(idx),
      );

      // Export to Excel
      await exportExamResultsToExcel(
        selectedExams,
        selectedStudentForDownload.student,
        t,
      );

      showSuccess(
        t(
          "studentDownloadSuccess",
          "Student exam records downloaded successfully",
        ),
      );
      setShowDownloadModal(false);
    } catch (error) {
      console.error("Error exporting exams:", error);
      showError(t("studentDownloadError", "Failed to download exam records"));
    } finally {
      setIsExporting(false);
      stopLoading("exportExams");
    }
  };

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
      key: "totalExams",
      header: t("totalExams", "Total Exams"),
      accessor: "totalExams",
      render: (item) => (
        <Badge color="blue" variant="outline">
          {item.totalExams}
        </Badge>
      ),
      disableSort: false,
    },
    {
      key: "passedCount",
      header: t("passed", "Passed"),
      accessor: "passedCount",
      render: (item) => (
        <Badge color="green" variant="solid" size="sm">
          {item.passedCount}
        </Badge>
      ),
      disableSort: false,
    },
    {
      key: "failedCount",
      header: t("failed", "Failed"),
      accessor: "failedCount",
      render: (item) => (
        <Badge color="red" variant="solid" size="sm">
          {item.failedCount}
        </Badge>
      ),
      disableSort: false,
    },
    {
      key: "completedCount",
      header: t("completed", "Completed"),
      accessor: "completedCount",
      render: (item) => (
        <Badge color="gray" variant="outline" size="sm">
          {item.completedCount}
        </Badge>
      ),
      disableSort: false,
    },
    {
      key: "actions",
      header: t("actions", "Actions"),
      disableSort: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewStudentRecords(item.studentRecord)}
            className="flex items-center gap-1"
          >
            <Eye className="w-4 h-4" />
            {t("viewRecords", "View Records")}
          </Button>
          {item.totalExams > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenDownloadModal(item.studentRecord)}
              className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Download className="w-4 h-4" />
              {t("download", "Download")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  /**
   * Get table data
   */
  const getTableData = useMemo(() => {
    const rows = [];

    studentRecords.forEach((sr) => {
      // Handle nested user structure
      const studentName = getFullName(sr.student.user || sr.student, "-");
      const studentId =
        sr.student.studentId || sr.student.user?.id || sr.student.id;

      // Calculate statistics
      const totalExams = sr.exams?.length || 0;
      const passedCount =
        sr.exams?.filter((e) => e.status === "COMPLETED" && e.passed).length ||
        0;
      const failedCount =
        sr.exams?.filter((e) => e.status === "COMPLETED" && !e.passed).length ||
        0;
      const completedCount =
        sr.exams?.filter((e) => e.status === "COMPLETED").length || 0;

      rows.push({
        id: `student-${studentId}`,
        studentName,
        totalExams,
        passedCount,
        failedCount,
        completedCount,
        studentRecord: sr, // Keep full record for modal
        hasRecords: sr.hasRecords, // Flag to filter in display
      });
    });

    return rows;
  }, [studentRecords, t]);

  /**
   * Apply search filter to table data
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
      {/* Primary Filters: Class, Search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Class Selection - Mandatory */}
        {classes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("selectClass", "Select Class")}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <Dropdown
              value={selectedClass ? selectedClass.toString() : ""}
              onValueChange={(value) =>
                onClassChange(value ? parseInt(value) : null)
              }
              options={classes.map((cls) => ({
                value: (cls.classId || cls.id).toString(),
                label: cls.gradeLevel
                  ? `${t("class", "Class")} ${formatClassIdentifier(cls.gradeLevel, cls.section)}`
                  : cls.name ||
                    `${t("class", "Class")} ${cls.gradeLevel || ""} ${cls.section || ""}`.trim(),
              }))}
              placeholder={t("chooseOption", "ជ្រើសរើសជម្រើស")}
              className="w-full"
              disabled={loading}
            />
          </div>
        )}

        {/* Search */}
        <div className="">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("search", "Search")}
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t(
              "searchStudents",
              "Search by student name...",
            )}
            disabled={loading || !selectedClass}
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
          />
        </div>
      </div>

      <div className="bg-white overflow-hidden mt-4">
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
            message={t(
              "loadingExamRecords",
              "Loading exam records...",
            )}
          />
        ) : filteredTableData.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={t("noStudents", "No Students")}
            description={t(
              "noStudentsInClass",
              "No students found in this class",
            )}
            actionLabel={t("clearSearch", "Clear Search")}
            onAction={() => {
              setSearchTerm("");
            }}
          />
        ) : (
          <>
            <Table
              columns={getTableColumns()}
              data={filteredTableData}
              loading={loading}
              t={t}
              showPagination={pagination.totalPages > 1}
              pagination={{
                page: pagination.currentPage,
                pages: pagination.totalPages,
                total: pagination.totalStudents,
                limit: pagination.pageSize,
              }}
              onPageChange={(newPage) => {
                setPagination((prev) => ({
                  ...prev,
                  currentPage: newPage,
                }));
                fetchExamRecords(newPage);
              }}
            />
          </>
        )}
      </div>

      {/* Download Modal */}
      <Modal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        title={t("selectExamsToDownload", "Select Exams to Download")}
        size="2xl"
        height="full"
        stickyFooter={true}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => setShowDownloadModal(false)}
              disabled={isExporting}
            >
              {t("cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleExportSelectedExams}
              disabled={isExporting || selectedExamsForDownload.size === 0}
              className="flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("exporting", "Exporting...")}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {t("downloadSelected", "Download Selected")}
                </>
              )}
            </Button>
          </div>
        }
      >
        {selectedStudentForDownload ? (
          <div className="h-96 overflow-y-auto">
            {selectedStudentForDownload.exams ? (
              selectedStudentForDownload.exams.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {t("noExams", "No exam records found")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Select All / Deselect All */}
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                    <input
                      type="checkbox"
                      checked={
                        selectedExamsForDownload.size ===
                        selectedStudentForDownload.exams.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedExamsForDownload(
                            new Set(
                              selectedStudentForDownload.exams.map(
                                (_, idx) => idx,
                              ),
                            ),
                          );
                        } else {
                          setSelectedExamsForDownload(new Set());
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      {t("selectAll", "Select All")}
                    </label>
                  </div>

                  {/* Exam List */}
                  {selectedStudentForDownload.exams.map((exam, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedExamsForDownload.has(idx)}
                        onChange={() => toggleExamSelection(idx)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {exam.examTitle || t("exam", "Exam")}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">
                              {t("subject", "Subject")}:
                            </span>{" "}
                            {exam.subjectKhmerName || exam.subjectName || "-"}
                          </div>
                          <div>
                            <span className="font-medium">
                              {t("score", "Score")}:
                            </span>{" "}
                            {exam.percentage !== undefined &&
                            exam.percentage !== null
                              ? `${exam.percentage}%`
                              : exam.score !== undefined &&
                                  exam.score !== null
                                ? `${exam.score}/${exam.totalScore || 100}`
                                : "-"}
                          </div>
                          <div>
                            <span className="font-medium">
                              {t("grade", "Grade")}:
                            </span>{" "}
                            {exam.letterGrade || "-"}
                          </div>
                          <div>
                            <span className="font-medium">
                              {t("status", "Status")}:
                            </span>{" "}
                            {exam.status || "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
