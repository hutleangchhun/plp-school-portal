import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useToast } from "../../contexts/ToastContext";
import { useLoading } from "../../contexts/LoadingContext";
import { examHistoryService } from "../../utils/api/services/examHistoryService";
import { studentService, scoreService } from "@/utils/api";
import { API_BASE_URL } from "../../utils/api/config";
import { formatClassIdentifier } from "../../utils/helpers";
import { getFullName } from "../../utils/usernameUtils";
import { genderToKhmer } from "../../utils/formatters";
import { PageLoader } from "../../components/ui/DynamicLoader";
import EmptyState from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import Dropdown from "../../components/ui/Dropdown";
import Modal from "../../components/ui/Modal";
import ExportProgressModal from "../../components/modals/ExportProgressModal";
import ExamHistoryCard from "../../components/exam/ExamHistoryCard";
import ExamSkillSelectionView from "../../components/exam/ExamSkillSelectionView";
import { YearPicker } from "../../components/ui/year-picker";
import { DatePickerWithDropdowns } from "../../components/ui/date-picker-with-dropdowns";
import {
  BookOpen,
  Save,
  Download,
  ClipboardList,
  Loader,
} from "lucide-react";

/**
 * Subject and Skills Configuration for Score Input
 * Defines all subjects with their skill categories
 */
const SUBJECT_SKILLS = {
  khmer: {
    name: "Khmer",
    skills: ["Listening", "Writing", "Reading", "Speaking"],
  },
  math: {
    name: "Math",
    skills: ["Number", "Geometry", "Statistics"],
  },
  science: {
    name: "Science",
    skills: ["Basic Concepts", "Experiments", "Analysis"],
  },
  ethics: {
    name: "Ethics-Civic Studies",
    skills: ["Ethics", "Civic Studies"],
  },
  sport: {
    name: "Sport",
    skills: ["Physical Fitness", "Skills", "Participation"],
  },
  health: {
    name: "Health - Hygiene",
    skills: ["Health", "Hygiene"],
  },
  life_skills: {
    name: "Life Skills Education",
    skills: ["Problem Solving", "Communication", "Creativity"],
  },
  foreign_lang: {
    name: "Foreign Languages",
    skills: ["Listening", "Speaking", "Reading", "Writing"],
  },
};

/**
 * Mapping of subject + skill combinations to API field names
 */
const SUBJECT_SKILL_TO_API_FIELD = {
  khmer_Listening: "khmerListening",
  khmer_Writing: "khmerWriting",
  khmer_Reading: "khmerReading",
  khmer_Speaking: "khmerSpeaking",
  math_Number: "mathNumber",
  math_Geometry: "mathGeometry",
  math_Statistics: "mathStatistic",
  "science_Basic Concepts": "science",
  ethics_Ethics: "socialStudies",
  "ethics_Civic Studies": "socialStudies",
  "sport_Physical Fitness": "sport",
  sport_Skills: "sport",
  sport_Participation: "sport",
  health_Health: "healthHygiene",
  health_Hygiene: "healthHygiene",
  "life_skills_Problem Solving": "lifeSkills",
  life_skills_Communication: "lifeSkills",
  life_skills_Creativity: "lifeSkills",
  foreign_lang_Listening: "foreignLanguage",
  foreign_lang_Speaking: "foreignLanguage",
  foreign_lang_Reading: "foreignLanguage",
  foreign_lang_Writing: "foreignLanguage",
};

/**
 * Get exam type label in Khmer
 */
const getExamTypeLabel = (examType, t) => {
  const examTypeMap = {
    exam: t("examTypeExam", "ការប្រលង"),
    test: t("examTypeTest", "ការធ្វើតេស្ត"),
    quiz: t("examTypeQuiz", "សាកល្បង"),
  };
  return examTypeMap[examType?.toLowerCase()] || examType || "-";
};

/**
 * ScoreInputTab Component
 * Provides score input functionality for teachers to enter student scores
 */
export default function ScoreInputTab({
  classes,
  selectedClass,
  onClassChange,
  user,
  t,
}) {
  const { showError, showSuccess } = useToast();
  const { startLoading, stopLoading } = useLoading();

  // State for Score Input
  const [classStudents, setClassStudents] = useState([]);
  const [classStudentsLoading, setClassStudentsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [scoreData, setScoreData] = useState({}); // { studentId: { subjectKey: { skillName: score } } }
  const [savingScores, setSavingScores] = useState(false);

  // State for Class Score Export
  const [isExportingClassScores, setIsExportingClassScores] = useState(false);
  const [exportProgressModal, setExportProgressModal] = useState({
    isOpen: false,
    progress: 0,
    status: "processing", // 'processing', 'success', 'error'
  });

  // State for Exam History Modal
  const [showExamHistoryModal, setShowExamHistoryModal] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] =
    useState(null);
  const [examHistoryLoading, setExamHistoryLoading] = useState(false);
  const [selectedExamsInHistory, setSelectedExamsInHistory] = useState(
    new Set(),
  );
  const [examHistoryView, setExamHistoryView] = useState("list"); // 'list', 'skills'
  const [examForSkillSelection, setExamForSkillSelection] = useState(null);
  const [selectedSkillSubject, setSelectedSkillSubject] = useState(null);
  const [selectedSkillsForApply, setSelectedSkillsForApply] = useState(
    new Set(),
  );
  const [skillValues, setSkillValues] = useState({});

  // State for Exam History Modal Filters
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  };

  const getDefaultEndDate = () => new Date();

  const [examHistoryStartDate, setExamHistoryStartDate] = useState(
    getDefaultStartDate(),
  );
  const [examHistoryEndDate, setExamHistoryEndDate] =
    useState(getDefaultEndDate());

  // State for Applying Skills Progress Modal
  const [applyingSkillsProgressModal, setApplyingSkillsProgressModal] =
    useState({
      isOpen: false,
      progress: 0,
      status: "processing",
    });

  /**
   * Auto-fetch when filter dates change (only if modal is open)
   */
  useEffect(() => {
    if (
      selectedStudentForHistory &&
      showExamHistoryModal &&
      examHistoryStartDate &&
      examHistoryEndDate
    ) {
      handleRefetchExamHistoryWithFilters();
    }
  }, [examHistoryStartDate, examHistoryEndDate]);

  /**
   * Fetch all students from selected class for score input
   */
  const fetchClassStudentsForScores = useCallback(async () => {
    try {
      if (!selectedClass) {
        setClassStudents([]);
        setClassStudentsLoading(false);
        return;
      }

      setClassStudentsLoading(true);
      const schoolId = user?.teacher?.schoolId || user?.schoolId;
      if (!schoolId) {
        setClassStudentsLoading(false);
        return;
      }

      // Fetch all students in the class (no pagination for score input)
      const response = await studentService.getStudentsBySchoolClasses(
        schoolId,
        {
          classId: selectedClass,
          limit: 100,
        },
      );

      if (response.success) {
        const students = response.data || [];
        setClassStudents(students);

        // Initialize score data structure for all students
        const initialScores = {};

        students.forEach((student) => {
          const studentId = student.studentId || student.id;

          initialScores[studentId] = {};
          Object.keys(SUBJECT_SKILLS).forEach((subjectKey) => {
            initialScores[studentId][subjectKey] = {};
            SUBJECT_SKILLS[subjectKey].skills.forEach((skill) => {
              initialScores[studentId][subjectKey][skill] = "";
            });
          });
        });

        setScoreData(initialScores);
      }
    } catch (error) {
      console.error("Error fetching class students:", error);
      showError(t("errorFetchingStudents", "Failed to fetch students"));
    } finally {
      setClassStudentsLoading(false);
    }
  }, [selectedClass, user, showError, t]);

  /**
   * Fetch students when class changes
   */
  useEffect(() => {
    if (selectedClass) {
      fetchClassStudentsForScores();
    }
  }, [selectedClass]);

  /**
   * Handle score input change
   */
  const handleScoreChange = useCallback(
    (studentId, subjectKey, skill, value) => {
      // Allow typing freely, but validate and clamp on complete numbers
      if (value === "" || value === ".") {
        setScoreData((prev) => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [subjectKey]: {
              ...prev[studentId]?.[subjectKey],
              [skill]: value,
            },
          },
        }));
        return;
      }

      const parsed = parseFloat(value);

      if (!isNaN(parsed)) {
        if (value.endsWith(".")) {
          setScoreData((prev) => ({
            ...prev,
            [studentId]: {
              ...prev[studentId],
              [subjectKey]: {
                ...prev[studentId]?.[subjectKey],
                [skill]: value,
              },
            },
          }));
        } else {
          const clampedValue = Math.min(parsed, 10);
          setScoreData((prev) => ({
            ...prev,
            [studentId]: {
              ...prev[studentId],
              [subjectKey]: {
                ...prev[studentId]?.[subjectKey],
                [skill]: clampedValue,
              },
            },
          }));
        }
      } else {
        setScoreData((prev) => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [subjectKey]: {
              ...prev[studentId]?.[subjectKey],
              [skill]: value,
            },
          },
        }));
      }
    },
    [],
  );

  /**
   * Get all skill cells in order for keyboard navigation
   */
  const getAllSkillCells = useMemo(() => {
    const cells = [];
    classStudents.forEach((student, rowIndex) => {
      const studentId = student.studentId || student.id;
      Object.entries(SUBJECT_SKILLS).forEach(([subjectKey, subject]) => {
        const hasSubheader = ["khmer", "math"].includes(subjectKey);
        if (hasSubheader) {
          subject.skills.forEach((skill, skillIndex) => {
            cells.push({
              rowIndex,
              studentId,
              subjectKey,
              skill,
              cellId: `cell-${rowIndex}-${subjectKey}-${skillIndex}`,
            });
          });
        } else {
          const firstSkill = subject.skills[0];
          cells.push({
            rowIndex,
            studentId,
            subjectKey,
            skill: firstSkill,
            cellId: `cell-${rowIndex}-${subjectKey}-0`,
          });
        }
      });
    });
    return cells;
  }, [classStudents]);

  /**
   * Handle keyboard navigation in score table
   */
  const handleScoreCellKeyDown = useCallback(
    (e, rowIndex, subjectKey, skill, studentId) => {
      const currentCellIndex = getAllSkillCells.findIndex(
        (cell) =>
          cell.rowIndex === rowIndex &&
          cell.studentId === studentId &&
          cell.subjectKey === subjectKey &&
          cell.skill === skill,
      );

      if (currentCellIndex === -1) return;

      let nextCellIndex = -1;
      const totalCells = getAllSkillCells.length;
      const cellsPerRow = Object.values(SUBJECT_SKILLS).reduce(
        (sum, subject) => sum + subject.skills.length,
        0,
      );

      switch (e.key) {
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            nextCellIndex = currentCellIndex - 1;
          } else {
            nextCellIndex = currentCellIndex + 1;
          }
          break;

        case "ArrowRight":
          e.preventDefault();
          nextCellIndex = currentCellIndex + 1;
          break;

        case "ArrowLeft":
          e.preventDefault();
          nextCellIndex = currentCellIndex - 1;
          break;

        case "ArrowDown":
          e.preventDefault();
          nextCellIndex = currentCellIndex + cellsPerRow;
          break;

        case "ArrowUp":
          e.preventDefault();
          nextCellIndex = currentCellIndex - cellsPerRow;
          break;

        case "Enter":
          e.preventDefault();
          nextCellIndex = currentCellIndex + cellsPerRow;
          break;

        default:
          return;
      }

      // Wrap around or clamp to valid range
      if (nextCellIndex < 0) {
        nextCellIndex = 0;
      } else if (nextCellIndex >= totalCells) {
        nextCellIndex = totalCells - 1;
      }

      // Focus the next cell
      const nextCell = getAllSkillCells[nextCellIndex];
      if (nextCell) {
        const nextInput = document
          .getElementById(nextCell.cellId)
          ?.querySelector("input");
        if (nextInput) {
          setTimeout(() => {
            nextInput.focus();
            nextInput.select();
          }, 0);
        }
      }
    },
    [getAllSkillCells],
  );

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

      const year = parseInt(selectedAcademicYear);
      const month = selectedMonth;
      const token = localStorage.getItem("authToken");

      setExportProgressModal((prev) => ({
        ...prev,
        progress: 30,
      }));

      const response = await axios({
        method: "GET",
        baseURL: API_BASE_URL,
        url: `/student-monthly-exam/export/class/${selectedClass}?year=${year}&month=${month}`,
        responseType: "blob",
        validateStatus: () => true,
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });

      setExportProgressModal((prev) => ({
        ...prev,
        progress: 70,
      }));

      let blob = response.data;

      if (response.status && response.status >= 400) {
        if (blob && blob.type && blob.type.includes("text")) {
          const text = await blob.text();
          console.error("Error response text:", text);
          throw new Error(`Server error (${response.status}): ${text}`);
        }
        throw new Error(`Server error: HTTP ${response.status}`);
      }

      if (blob && blob.size < 1000) {
        if (blob.type && blob.type.includes("text")) {
          try {
            const text = await blob.text();
            console.error("Response text:", text);
            throw new Error("Invalid response from server: " + text);
          } catch (err) {
            console.error("Error reading blob:", err);
            throw new Error("Server returned empty or invalid response");
          }
        } else {
          throw new Error(
            `Server returned file that is too small (${blob.size} bytes) - may be corrupted`,
          );
        }
      }

      if (
        blob.type !==
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        blob = new Blob([blob], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
      }

      setExportProgressModal((prev) => ({
        ...prev,
        progress: 85,
      }));

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `student-exams-attendance-${year}-${month}.xlsx`;
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
    selectedAcademicYear,
    selectedMonth,
    showError,
    showSuccess,
    startLoading,
    stopLoading,
    t,
  ]);

  /**
   * Save all student scores
   */
  const handleSaveScores = useCallback(async () => {
    try {
      setSavingScores(true);
      startLoading("saveScores", t("savingScores", "Saving scores..."));

      const year = parseInt(selectedAcademicYear);
      const month = selectedMonth;

      // Validate that all required cells have values
      const missingCells = [];
      let studentRowCount = 0;

      Object.entries(scoreData).forEach(([studentId, subjects]) => {
        studentRowCount++;
        Object.entries(subjects).forEach(([subjectKey, skills]) => {
          const hasSubheader = ["khmer", "math"].includes(subjectKey);

          if (hasSubheader) {
            Object.entries(skills).forEach(([skill, score]) => {
              if (score === "") {
                missingCells.push({
                  studentId,
                  subject: SUBJECT_SKILLS[subjectKey].name,
                  skill,
                });
              }
            });
          } else {
            const firstSkill = SUBJECT_SKILLS[subjectKey].skills[0];
            const score = skills[firstSkill];
            if (score === "") {
              missingCells.push({
                studentId,
                subject: SUBJECT_SKILLS[subjectKey].name,
                skill: "All",
              });
            }
          }
        });
      });

      if (missingCells.length > 0) {
        const errorMessage =
          t(
            "incompletScores",
            "Please fill in all score cells. Missing scores for:",
          ) +
          "\n" +
          missingCells
            .slice(0, 5)
            .map((cell) => `Student ID: ${cell.studentId} - ${cell.subject}`)
            .join("\n") +
          (missingCells.length > 5
            ? `\n... ${t("andMore", "and")} ${missingCells.length - 5} ${t("more", "more")}`
            : "");
        showError(errorMessage);
        setSavingScores(false);
        stopLoading("saveScores");
        return;
      }

      // Transform scoreData to flat API format
      const recordsByStudent = {};

      Object.entries(scoreData).forEach(([studentId, subjects]) => {
        const studentIdNum = parseInt(studentId);

        if (!recordsByStudent[studentIdNum]) {
          recordsByStudent[studentIdNum] = {
            studentId: studentIdNum,
            month,
            year,
            classId: selectedClass || null,
          };
        }

        Object.entries(subjects).forEach(([subjectKey, skills]) => {
          Object.entries(skills).forEach(([skill, score]) => {
            if (score !== "") {
              const fieldKey = `${subjectKey}_${skill}`;
              const apiFieldName = SUBJECT_SKILL_TO_API_FIELD[fieldKey];

              if (apiFieldName) {
                recordsByStudent[studentIdNum][apiFieldName] =
                  parseFloat(score);
              }
            }
          });
        });
      });

      const recordsToSave = Object.values(recordsByStudent);

      if (recordsToSave.length === 0) {
        showError(t("noScoresToSave", "Please enter at least one score"));
        setSavingScores(false);
        stopLoading("saveScores");
        return;
      }

      const response = await scoreService.submitMonthlyExamBulk(recordsToSave);

      if (response.success) {
        showSuccess(t("scoresSaved", "Scores saved successfully"));
        setScoreData({});
      } else {
        showError(t("errorSavingScores", "Failed to save scores"));
      }
    } catch (error) {
      console.error("Error saving scores:", error);
      showError(
        error?.response?.data?.message ||
          t("errorSavingScores", "Failed to save scores"),
      );
    } finally {
      setSavingScores(false);
      stopLoading("saveScores");
    }
  }, [
    scoreData,
    selectedMonth,
    selectedAcademicYear,
    selectedClass,
    startLoading,
    stopLoading,
    showError,
    showSuccess,
    t,
  ]);

  /**
   * Refetch exam history with custom date filters
   */
  const handleRefetchExamHistoryWithFilters = async () => {
    if (!selectedStudentForHistory) return;

    try {
      setExamHistoryLoading(true);
      const userId =
        selectedStudentForHistory.student.user?.id ||
        selectedStudentForHistory.student.userId ||
        selectedStudentForHistory.student.id;

      let startDate = "";
      let endDate = "";

      if (examHistoryStartDate && examHistoryEndDate) {
        const startDateObj = new Date(examHistoryStartDate);
        const endDateObj = new Date(examHistoryEndDate);
        startDate = startDateObj.toISOString().split("T")[0];
        endDate = endDateObj.toISOString().split("T")[0];
      } else {
        const year = parseInt(selectedAcademicYear);
        const month = selectedMonth;
        startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      }

      const response = await examHistoryService.getUserExamHistoryFiltered(
        userId,
        {
          startDate,
          endDate,
          page: 1,
          limit: 10,
        },
      );

      const exams = Array.isArray(response.data)
        ? response.data
        : response.data
          ? [response.data]
          : [];

      setSelectedStudentForHistory((prev) => ({
        ...prev,
        exams,
      }));
    } catch (error) {
      console.error("Error fetching exam history:", error);
      showError(t("errorFetchingExamHistory", "Failed to fetch exam history"));
    } finally {
      setExamHistoryLoading(false);
    }
  };

  /**
   * Open exam history modal for a student
   */
  const handleOpenExamHistoryModal = async (student) => {
    const defaultEnd = new Date();
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 7);

    setExamHistoryStartDate(defaultStart);
    setExamHistoryEndDate(defaultEnd);

    setSelectedStudentForHistory({
      student,
      exams: [],
    });
    setShowExamHistoryModal(true);
  };

  /**
   * Toggle exam selection in history modal
   */
  const toggleExamInHistory = (examIndex) => {
    const newSelection = new Set(selectedExamsInHistory);
    if (newSelection.has(examIndex)) {
      newSelection.delete(examIndex);
    } else {
      newSelection.add(examIndex);
    }
    setSelectedExamsInHistory(newSelection);
  };

  /**
   * Detect subject from exam
   */
  const detectSubjectFromExam = (exam) => {
    const examSubject = exam.subjectName?.toLowerCase() || "";

    if (examSubject.includes("khmer")) return "khmer";
    if (examSubject.includes("math") || examSubject.includes("mathematics"))
      return "math";

    return "khmer";
  };

  /**
   * Open skill selection view for a selected exam
   */
  const handleSelectExamForSkills = () => {
    if (!selectedStudentForHistory || selectedExamsInHistory.size === 0) {
      showError(
        t("selectExamsToApply", "Please select at least one exam to apply"),
      );
      return;
    }

    if (selectedExamsInHistory.size > 1) {
      showError(
        t(
          "selectOneExam",
          "Please select only one exam to apply. You can apply multiple exams one at a time.",
        ),
      );
      return;
    }

    const examIdx = Array.from(selectedExamsInHistory)[0];
    const exam = selectedStudentForHistory.exams[examIdx];

    if (exam) {
      setExamForSkillSelection(exam);
      const detectedSubject = detectSubjectFromExam(exam);
      setSelectedSkillSubject(detectedSubject);
      setExamHistoryView("skills");
    }
  };

  /**
   * Handle applying selected skills from exam to score table
   */
  const handleApplyExamSkills = async (skillSelectionData) => {
    if (!selectedStudentForHistory) return;

    setApplyingSkillsProgressModal({
      isOpen: true,
      progress: 10,
      status: "processing",
    });

    await new Promise((resolve) => setTimeout(resolve, 300));
    setApplyingSkillsProgressModal((prev) => ({ ...prev, progress: 30 }));

    await new Promise((resolve) => setTimeout(resolve, 300));
    setApplyingSkillsProgressModal((prev) => ({ ...prev, progress: 60 }));

    const studentId =
      selectedStudentForHistory.student.studentId ||
      selectedStudentForHistory.student.id;
    const { subject, skills } = skillSelectionData;

    setScoreData((prev) => {
      const updated = { ...prev };
      if (!updated[studentId]) updated[studentId] = {};
      if (!updated[studentId][subject]) updated[studentId][subject] = {};

      Object.entries(skills).forEach(([skill, value]) => {
        updated[studentId][subject][skill] = value;
      });

      return updated;
    });

    await new Promise((resolve) => setTimeout(resolve, 300));
    setApplyingSkillsProgressModal((prev) => ({
      ...prev,
      progress: 100,
      status: "success",
    }));

    const skillNames = Object.keys(skills).join(", ");
    const subjectName = SUBJECT_SKILLS[subject]?.name || subject;
    showSuccess(
      t("examDataApplied", `Applied ${skillNames} to ${subjectName}`),
    );

    setTimeout(() => {
      setApplyingSkillsProgressModal({
        isOpen: false,
        progress: 0,
        status: "processing",
      });

      setShowExamHistoryModal(false);
      setExamHistoryView("list");
      setExamForSkillSelection(null);
      setSelectedExamsInHistory(new Set());
    }, 1000);
  };

  return (
    <div className="mt-6">
      {/* Class, Academic Year, Month Selection, and Export Button */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 items-end">
        {/* Class Selection */}
        {classes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("selectClass", "Select Class")}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <Dropdown
              disabled={classStudentsLoading}
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
            />
          </div>
        )}

        {/* Year Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("year", "Year")}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <YearPicker
            value={selectedAcademicYear}
            onChange={(value) => setSelectedAcademicYear(value)}
            placeholder={t("selectYear", "Select Year")}
            fromYear={2000}
            toYear={new Date().getFullYear() + 1}
          />
        </div>

        {/* Month Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("month", "Month")}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <Dropdown
            value={selectedMonth.toString()}
            onValueChange={(value) => setSelectedMonth(parseInt(value))}
            options={[
              { value: "1", label: t("january", "January") },
              { value: "2", label: t("february", "February") },
              { value: "3", label: t("march", "March") },
              { value: "4", label: t("april", "April") },
              { value: "5", label: t("may", "May") },
              { value: "6", label: t("june", "June") },
              { value: "7", label: t("july", "July") },
              { value: "8", label: t("august", "August") },
              { value: "9", label: t("september", "September") },
              { value: "10", label: t("october", "October") },
              { value: "11", label: t("november", "November") },
              { value: "12", label: t("december", "December") },
            ]}
            placeholder={t("chooseOption", "Choose an option")}
            className="w-full"
          />
        </div>

        {/* Export Button */}
        {selectedMonth && selectedClass && (
          <Button
            onClick={handleExportClassScores}
            disabled={isExportingClassScores}
            className="flex items-center gap-2"
            variant="primary"
            size="sm"
          >
            <Download className="w-4 h-4" />
            {isExportingClassScores
              ? t("loadingData", "Exporting...")
              : t("exportReport", "Export Class Scores")}
          </Button>
        )}
      </div>

      {/* Score Input Section */}
      {classStudentsLoading ? (
        <PageLoader
          message={t("loadingStudents", "Loading students...")}
        />
      ) : !selectedClass ? (
        <EmptyState
          icon={BookOpen}
          title={t("selectClassFirst", "Select a Class")}
          description={t(
            "selectClassFirstDesc",
            "Please select a class from the filters above to enter scores",
          )}
        />
      ) : classStudents.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t("noStudents", "No Students")}
          description={t(
            "noStudentsInClass",
            "No students found in this class",
          )}
        />
      ) : (
        <div className="space-y-6">
          {/* Score Table */}
          <div className="shadow-lg rounded-sm overflow-hidden border border-gray-200 bg-transparent">
            <div className="bg-white p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {t("scoreInput", "Score Input")}
              </h2>
              <p className="text-sm text-gray-600">
                {t(
                  "enterStudentScores",
                  "Enter student scores for each skill category",
                )}
              </p>
            </div>
            <div
              className="overflow-auto"
              style={{ height: "700px" }}
            >
              <table className="min-w-full border-collapse bg-white">
                <thead className="sticky top-0 z-20 border-b border-gray-200">
                  {/* Main Header Row */}
                  <tr className="border-b border-gray-300 bg-gradient-to-r from-blue-600 to-blue-700">
                    <th
                      rowSpan={2}
                      className="px-6 py-3 text-left text-sm font-bold text-white border-r border-blue-500 min-w-80 bg-gradient-to-r from-blue-600 to-blue-700 sticky left-0 z-30"
                    >
                      {t("studentName", "Student Name")}
                    </th>
                    {Object.entries(SUBJECT_SKILLS).map(
                      ([subjectKey, subject]) => {
                        const hasSubheader = [
                          "khmer",
                          "math",
                        ].includes(subjectKey);
                        return (
                          <th
                            key={subjectKey}
                            colSpan={subject.skills.length}
                            rowSpan={hasSubheader ? 1 : 2}
                            className="px-3 py-3 text-center text-xs font-bold text-white border-r border-blue-500"
                          >
                            {t(subjectKey, subject.name)}
                          </th>
                        );
                      },
                    )}
                    <th
                      rowSpan={2}
                      className="px-4 py-3 text-center text-sm font-bold text-white border-r border-blue-500 bg-gradient-to-r from-green-600 to-green-700"
                    >
                      {t("totalScore", "Total Score")}
                    </th>
                    <th
                      rowSpan={2}
                      className="px-4 py-3 text-center text-sm font-bold text-white border-r border-blue-500 bg-gradient-to-r from-purple-600 to-purple-700"
                    >
                      {t("average", "Average")}
                    </th>
                    <th
                      rowSpan={2}
                      className="px-4 py-3 text-center text-sm font-bold text-white border-r border-blue-500 bg-gradient-to-r from-orange-600 to-orange-700"
                    >
                      {t("grading", "Grade")}
                    </th>
                  </tr>
                  {/* Sub Header Row */}
                  <tr className="border-b border-gray-200 bg-blue-50">
                    {Object.entries(SUBJECT_SKILLS).map(
                      ([subjectKey, subject]) => {
                        const hasSubheader = [
                          "khmer",
                          "math",
                        ].includes(subjectKey);
                        if (!hasSubheader) return null;
                        return subject.skills.map((skill) => (
                          <th
                            key={`${subjectKey}-${skill}`}
                            className="px-3 py-3 text-center text-xs font-semibold text-blue-900 border-r border-blue-200 bg-blue-50"
                          >
                            {t(
                              skill
                                .toLowerCase()
                                .replace(/\s+/g, "_"),
                              skill,
                            )}
                          </th>
                        ));
                      },
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {classStudents.map((student, rowIndex) => {
                    const studentId =
                      student.studentId || student.id;
                    const rawGender = student?.gender;
                    const studentGender = genderToKhmer(rawGender);
                    const studentName = getFullName(
                      student.user || student,
                      "",
                    );

                    return (
                      <tr
                        key={`${rowIndex}-${studentId}`}
                        className="hover:bg-gray-50 border-b border-gray-100"
                      >
                        <td
                          className="text-left sticky left-0 z-10 min-w-80 bg-gray-50 border-r border-gray-200"
                          style={{ position: "sticky", left: 0 }}
                        >
                          <div className="flex flex-col gap-2 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {studentName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  ភេទ: {studentGender}
                                </p>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() =>
                                  handleOpenExamHistoryModal(
                                    student,
                                  )
                                }
                                disabled={examHistoryLoading}
                                title={t(
                                  "viewExamHistory",
                                  "View Exam History",
                                )}
                              >
                                {examHistoryLoading ? (
                                  <Loader className="w-4 h-4 inline-block mr-1 animate-spin" />
                                ) : (
                                  <ClipboardList className="w-4 h-4 inline-block mr-1" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </td>
                        {Object.entries(SUBJECT_SKILLS).map(
                          ([subjectKey, subject]) => {
                            const hasSubheader = [
                              "khmer",
                              "math",
                            ].includes(subjectKey);

                            if (hasSubheader) {
                              return subject.skills.map(
                                (skill, skillIndex) => (
                                  <td
                                    key={`${rowIndex}-${subjectKey}-${skillIndex}`}
                                    id={`cell-${rowIndex}-${subjectKey}-${skillIndex}`}
                                    className="border-r border-gray-200 relative cursor-pointer bg-white hover:bg-blue-50"
                                  >
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={
                                        scoreData[studentId]?.[
                                          subjectKey
                                        ]?.[skill] ?? ""
                                      }
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        let val = e.target.value;
                                        if (
                                          /^\d*\.?\d*$/.test(val)
                                        ) {
                                          if (val.startsWith(".")) {
                                            val = "0" + val;
                                          }
                                          handleScoreChange(
                                            studentId,
                                            subjectKey,
                                            skill,
                                            val,
                                          );
                                        }
                                      }}
                                      onClick={(e) =>
                                        e.stopPropagation()
                                      }
                                      onKeyDown={(e) =>
                                        handleScoreCellKeyDown(
                                          e,
                                          rowIndex,
                                          subjectKey,
                                          skill,
                                          studentId,
                                        )
                                      }
                                      className="w-full h-full p-4 text-sm border-0 focus:border focus:ring-1 bg-white focus:border-blue-500 focus:ring-blue-500 text-center"
                                    />
                                  </td>
                                ),
                              );
                            } else {
                              const firstSkill = subject.skills[0];
                              return (
                                <td
                                  key={`${rowIndex}-${subjectKey}`}
                                  id={`cell-${rowIndex}-${subjectKey}-0`}
                                  colSpan={subject.skills.length}
                                  className="border-r border-gray-200 relative cursor-pointer bg-white hover:bg-blue-50"
                                >
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={
                                      scoreData[studentId]?.[
                                        subjectKey
                                      ]?.[firstSkill] ?? ""
                                    }
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      let filtered =
                                        e.target.value.replace(
                                          /[^\d.]/g,
                                          "",
                                        );
                                      const parts =
                                        filtered.split(".");
                                      if (parts.length > 2) {
                                        filtered =
                                          parts[0] +
                                          "." +
                                          parts.slice(1).join("");
                                      }
                                      subject.skills.forEach(
                                        (skill) => {
                                          handleScoreChange(
                                            studentId,
                                            subjectKey,
                                            skill,
                                            filtered,
                                          );
                                        },
                                      );
                                    }}
                                    onClick={(e) =>
                                      e.stopPropagation()
                                    }
                                    onKeyDown={(e) =>
                                      handleScoreCellKeyDown(
                                        e,
                                        rowIndex,
                                        subjectKey,
                                        firstSkill,
                                        studentId,
                                      )
                                    }
                                    className="w-full h-full p-4 text-sm border-0 focus:border focus:ring-1 bg-white focus:border-blue-500 focus:ring-blue-500 text-center p-0"
                                  />
                                </td>
                              );
                            }
                          },
                        )}

                        {/* Total Score Column */}
                        <td className="px-4 py-4 text-center text-sm font-bold text-gray-900 border-r border-gray-200 bg-green-50">
                          {(() => {
                            let total = 0;
                            Object.entries(SUBJECT_SKILLS).forEach(
                              ([subjectKey, subject]) => {
                                const hasSubheader = [
                                  "khmer",
                                  "math",
                                ].includes(subjectKey);
                                if (hasSubheader) {
                                  subject.skills.forEach(
                                    (skill) => {
                                      const score = parseFloat(
                                        scoreData[studentId]?.[
                                          subjectKey
                                        ]?.[skill] || 0,
                                      );
                                      total += score;
                                    },
                                  );
                                } else {
                                  const firstSkill =
                                    subject.skills[0];
                                  const score = parseFloat(
                                    scoreData[studentId]?.[
                                      subjectKey
                                    ]?.[firstSkill] || 0,
                                  );
                                  total += score;
                                }
                              },
                            );
                            return total.toFixed(2);
                          })()}
                        </td>

                        {/* Average Column */}
                        <td className="px-4 py-4 text-center text-sm font-bold text-gray-900 border-r border-gray-200 bg-purple-50">
                          {(() => {
                            let total = 0;
                            let count = 0;
                            Object.entries(SUBJECT_SKILLS).forEach(
                              ([subjectKey, subject]) => {
                                const hasSubheader = [
                                  "khmer",
                                  "math",
                                ].includes(subjectKey);
                                if (hasSubheader) {
                                  subject.skills.forEach(
                                    (skill) => {
                                      const score = parseFloat(
                                        scoreData[studentId]?.[
                                          subjectKey
                                        ]?.[skill] || 0,
                                      );
                                      if (score > 0) {
                                        total += score;
                                        count++;
                                      }
                                    },
                                  );
                                } else {
                                  const firstSkill =
                                    subject.skills[0];
                                  const score = parseFloat(
                                    scoreData[studentId]?.[
                                      subjectKey
                                    ]?.[firstSkill] || 0,
                                  );
                                  if (score > 0) {
                                    total += score;
                                    count++;
                                  }
                                }
                              },
                            );
                            return count > 0
                              ? (total / count).toFixed(2)
                              : "0.00";
                          })()}
                        </td>

                        {/* Grade Column */}
                        <td className="px-4 py-4 text-center text-sm font-bold border-r border-gray-200 bg-orange-50">
                          {(() => {
                            let total = 0;
                            let count = 0;
                            Object.entries(SUBJECT_SKILLS).forEach(
                              ([subjectKey, subject]) => {
                                const hasSubheader = [
                                  "khmer",
                                  "math",
                                ].includes(subjectKey);
                                if (hasSubheader) {
                                  subject.skills.forEach(
                                    (skill) => {
                                      const score = parseFloat(
                                        scoreData[studentId]?.[
                                          subjectKey
                                        ]?.[skill] || 0,
                                      );
                                      if (score > 0) {
                                        total += score;
                                        count++;
                                      }
                                    },
                                  );
                                } else {
                                  const firstSkill =
                                    subject.skills[0];
                                  const score = parseFloat(
                                    scoreData[studentId]?.[
                                      subjectKey
                                    ]?.[firstSkill] || 0,
                                  );
                                  if (score > 0) {
                                    total += score;
                                    count++;
                                  }
                                }
                              },
                            );
                            const average =
                              count > 0 ? total / count : 0;

                            let grade = "-";
                            let gradeColor = "text-gray-500";

                            if (average >= 8.5) {
                              grade = "A";
                              gradeColor = "text-green-700";
                            } else if (average >= 7) {
                              grade = "B";
                              gradeColor = "text-blue-700";
                            } else if (average >= 5.5) {
                              grade = "C";
                              gradeColor = "text-yellow-700";
                            } else if (average >= 4) {
                              grade = "D";
                              gradeColor = "text-orange-700";
                            } else if (average > 0) {
                              grade = "F";
                              gradeColor = "text-red-700";
                            }

                            return (
                              <span className={gradeColor}>
                                {grade}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save and Export Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setScoreData({})}
              disabled={savingScores || isExportingClassScores}
            >
              {t("clear", "Clear")}
            </Button>
            <Button
              onClick={handleSaveScores}
              disabled={
                savingScores ||
                !selectedMonth ||
                isExportingClassScores
              }
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {savingScores
                ? t("saving", "Saving...")
                : t("saveScores", "Save Scores")}
            </Button>
          </div>
        </div>
      )}

      {/* Exam History Modal */}
      <Modal
        isOpen={showExamHistoryModal}
        onClose={() => {
          if (examHistoryView === "list") {
            setShowExamHistoryModal(false);
          } else {
            setExamHistoryView("list");
            setExamForSkillSelection(null);
            setSelectedExamsInHistory(new Set());
            setSelectedSkillSubject(null);
            setSelectedSkillsForApply(new Set());
            setSkillValues({});
          }
        }}
        title={
          examHistoryView === "list"
            ? t("examHistoryFromPLP", "Exam History")
            : examHistoryView === "skills"
              ? t("selectExamSkills", "Select Skills to Apply")
              : t("applyingSkills", "Applying Skills")
        }
        size="full"
        height="full"
        stickyFooter={true}
        footer={
          <div className="flex justify-between items-center gap-2 w-full">
            <div className="text-sm text-gray-600">
              {examHistoryView === "list" &&
                selectedExamsInHistory.size > 0 && (
                  <span>{selectedExamsInHistory.size} exam(s) selected</span>
                )}
              {examHistoryView === "skills" && examForSkillSelection && (
                <span>
                  {examForSkillSelection.examTitle || t("exam", "Exam")}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (examHistoryView === "list") {
                    setShowExamHistoryModal(false);
                  } else {
                    setExamHistoryView("list");
                    setExamForSkillSelection(null);
                    setSelectedExamsInHistory(new Set());
                    setSelectedSkillSubject(null);
                    setSelectedSkillsForApply(new Set());
                    setSkillValues({});
                  }
                }}
                variant="outline"
              >
                {examHistoryView === "list"
                  ? t("close", "Close")
                  : t("back", "Back")}
              </Button>
              {examHistoryView === "list" && (
                <Button
                  onClick={handleSelectExamForSkills}
                  disabled={selectedExamsInHistory.size === 0}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
                >
                  {t("selectSkills", "Select Skills")}
                </Button>
              )}
            </div>
          </div>
        }
      >
        {/* View 1: Exam List */}
        {examHistoryView === "list" && selectedStudentForHistory && (
          <div className="flex flex-col gap-4">
            {/* Date Filter Section */}
            <div className="space-y-3 mb-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600 font-medium">
                    {t("startDate", "Start Date")}
                  </label>
                  <DatePickerWithDropdowns
                    value={examHistoryStartDate}
                    onChange={setExamHistoryStartDate}
                    placeholder={t("selectStartDate", "Select start date")}
                    className="w-full text-xs"
                    closeOnOutsideClick={false}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600 font-medium">
                    {t("endDate", "End Date")}
                  </label>
                  <DatePickerWithDropdowns
                    value={examHistoryEndDate}
                    onChange={setExamHistoryEndDate}
                    placeholder={t("selectEndDate", "Select end date")}
                    className="w-full text-xs"
                    closeOnOutsideClick={false}
                  />
                </div>
              </div>
            </div>

            {/* Exam List */}
            <div className="h-96 sm:h-96 overflow-y-auto">
              {examHistoryLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : selectedStudentForHistory?.exams &&
                selectedStudentForHistory.exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedStudentForHistory.exams.map((exam, index) => {
                    const isSelected = selectedExamsInHistory.has(index);
                    return (
                      <ExamHistoryCard
                        key={index}
                        exam={exam}
                        isSelected={isSelected}
                        onToggle={() => toggleExamInHistory(index)}
                        getExamTypeLabel={getExamTypeLabel}
                        t={t}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">
                    {t("noExamsFound", "No exam records found")}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View 2: Skill Selection */}
        {examHistoryView === "skills" &&
          examForSkillSelection &&
          selectedSkillSubject && (
            <ExamSkillSelectionView
              exam={examForSkillSelection}
              subject={selectedSkillSubject}
              subjectName={SUBJECT_SKILLS[selectedSkillSubject]?.name}
              skills={SUBJECT_SKILLS[selectedSkillSubject]?.skills || []}
              selectedSkills={selectedSkillsForApply}
              skillValues={skillValues}
              onSkillToggle={(skill) => {
                const newSelection = new Set(selectedSkillsForApply);
                if (newSelection.has(skill)) {
                  newSelection.delete(skill);
                } else {
                  newSelection.add(skill);
                }
                setSelectedSkillsForApply(newSelection);
              }}
              onSkillValueChange={(skill, value) => {
                if (value === "" || value === ".") {
                  setSkillValues((prev) => ({
                    ...prev,
                    [skill]: value,
                  }));
                } else {
                  const parsed = parseFloat(value);
                  if (!isNaN(parsed)) {
                    const clamped = Math.max(0, Math.min(parsed, 10));
                    setSkillValues((prev) => ({
                      ...prev,
                      [skill]: clamped,
                    }));
                  }
                }
              }}
              onApply={handleApplyExamSkills}
              showError={showError}
              t={t}
            />
          )}
      </Modal>

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

      {/* Applying Skills Progress Modal */}
      <ExportProgressModal
        isOpen={applyingSkillsProgressModal.isOpen}
        progress={applyingSkillsProgressModal.progress}
        status={applyingSkillsProgressModal.status}
        onComplete={() => {
          setApplyingSkillsProgressModal({
            isOpen: false,
            progress: 0,
            status: "processing",
          });
        }}
      />
    </div>
  );
}
