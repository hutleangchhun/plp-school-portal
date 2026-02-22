import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "../../contexts/ToastContext";
import { useLoading } from "../../contexts/LoadingContext";
import { examScoreTemplateService } from "../../utils/api/services/examScoreTemplateService";
import { classService } from "../../utils/api/services/classService";
import { getFullName } from "../../utils/usernameUtils";
import { genderToKhmer } from "../../utils/formatters";
import { PageLoader } from "../../components/ui/DynamicLoader";
import EmptyState from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Save, FileQuestion, Loader } from "lucide-react";

/**
 * ScoreInputTemplateTab Component
 * Input scores for students based on applied template structure
 */
export default function ScoreInputTemplateTab({
  user,
  classes,
  selectedClass,
  globalFilterMonth,
  globalFilterYear,
  onNavigateToTemplates,
  t,
}) {
  const { showError, showSuccess } = useToast();
  const { startLoading, stopLoading } = useLoading();

  const [loading, setLoading] = useState(false);
  const [scoreInputs, setScoreInputs] = useState({}); // { scoreId: value }
  const [templateColumns, setTemplateColumns] = useState([]);
  const [scores, setScores] = useState([]); // Raw scores from API
  const [students, setStudents] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [savingStudentId, setSavingStudentId] = useState(null);

  /**
  /* 
   * Fetch data: Template, Students, and Scores
   */
  const fetchData = useCallback(async () => {
    try {
      if (!selectedClass || !globalFilterMonth || !globalFilterYear) {
        setScores([]);
        setTemplateColumns([]);
        setStudents([]);
        setActiveTemplate(null);
        return;
      }

      setLoading(true);

      const teacherId = user?.teacher?.id || user?.teacherId;
      const selectedClassObj = classes.find(c => (c.classId || c.id) === selectedClass);
      const gradeLevel = selectedClassObj?.gradeLevel;

      // 1. Fetch Template (Must use teacherId and isActive=true as per user request)
      const templatePromise = (teacherId)
        ? examScoreTemplateService.getTemplates({ teacherId, isActive: true })
        : Promise.resolve({ success: false });

      // Get School ID from storage or user object
      const schoolId = localStorage.getItem('selectedSchoolId') || user?.schoolId || user?.school?.id;

      // 2. Fetch Students (Must use /students/school/:schoolId/classes?classId=... as per user request)
      // We use classService.getClassesBySchool which maps to this endpoint
      const studentsPromise = schoolId
        ? classService.getClassesBySchool(schoolId, {
          classId: selectedClass,
          page: 1,
          limit: 100 // Ensure we get enough students
        })
        : Promise.resolve({ success: false, data: [] });

      const [templateRes, studentsRes] = await Promise.all([
        templatePromise,
        studentsPromise
      ]);

      // Process Template
      let currentTemplate = null;
      let allTemplates = [];

      if (templateRes.success && templateRes.data) {
        allTemplates = Array.isArray(templateRes.data)
          ? templateRes.data
          : (templateRes.data.templates || []);
      }
      // Auto-select template based on grade level
      let validTemplates = allTemplates;
      if (gradeLevel) {
        validTemplates = allTemplates.filter(t => t.gradeLevel === gradeLevel);
      }

      // If strict filtering yields nothing, fallback to first one
      if (validTemplates.length === 0 && allTemplates.length > 0) {
        validTemplates = allTemplates;
      }

      if (validTemplates.length > 0) {
        currentTemplate = validTemplates[0];
      }
      setActiveTemplate(currentTemplate);

      // Process Students
      // The endpoint returns { success: true, data: [...classes], ... }
      // AND we filtered by classId.
      let studentList = [];
      const classesData = studentsRes.data || [];

      if (classesData.length > 0) {
        // If the endpoint returns students directly (array of students)
        if (classesData[0].firstName || classesData[0].studentId) {
          studentList = classesData;
        }
        // If the endpoint returns class objects which contain students
        else if (classesData[0].students && Array.isArray(classesData[0].students)) {
          studentList = classesData[0].students;
        }
        // Otherwise, fallback to treating entire data as student list
        else {
          studentList = classesData;
        }
      }
      setStudents(studentList);

      // First, fetch scores WITHOUT templateId to detect which template was used
      let scoresData = [];
      let detectedTemplateId = null;

      if (selectedClass && globalFilterMonth && globalFilterYear) {
        const initialScoresRes = await examScoreTemplateService.getScores({
          classId: selectedClass,
          month: globalFilterMonth,
          year: parseInt(globalFilterYear)
        });
        scoresData = initialScoresRes.success ? (initialScoresRes.data || []) : [];

        // Try to detect which template was used by checking score structure
        if (scoresData.length > 0 && allTemplates.length > 0) {
          // Get unique subject/subSubject combinations from scores
          const scoreStructure = new Set();
          scoresData.forEach(score => {
            const key = `${score.subjectId}-${score.subSubjectId || 'main'}`;
            scoreStructure.add(key);
          });

          // Find template that matches this structure
          for (const template of allTemplates) {
            const subjects = template.subjects || [];
            const templateStructure = new Set();

            subjects.forEach(subjItem => {
              const subSubjects = subjItem.subSubjects || [];
              if (subSubjects.length > 0) {
                subSubjects.forEach(subItem => {
                  templateStructure.add(`${subjItem.subject.id}-${subItem.subSubjectId}`);
                });
              } else {
                templateStructure.add(`${subjItem.subject.id}-main`);
              }
            });

            // Check if structures match
            if (templateStructure.size === scoreStructure.size) {
              let matches = true;
              for (const key of scoreStructure) {
                if (!templateStructure.has(key)) {
                  matches = false;
                  break;
                }
              }
              if (matches) {
                detectedTemplateId = template.id;
                currentTemplate = template;
                break;
              }
            }
          }
        }
      }

      // If we detected a different template from scores, use it
      // Otherwise keep the grade-level based selection
      if (detectedTemplateId && currentTemplate) {
        setActiveTemplate(currentTemplate);

        // Re-fetch scores with the detected templateId for proper sorting
        if (selectedClass && globalFilterMonth && globalFilterYear) {
          const sortedScoresRes = await examScoreTemplateService.getScores({
            classId: selectedClass,
            month: globalFilterMonth,
            year: parseInt(globalFilterYear),
            templateId: currentTemplate.id
          });
          scoresData = sortedScoresRes.success ? (sortedScoresRes.data || []) : [];
        }
      } else {
        // No existing scores - leave activeTemplate as null to show empty state
        setActiveTemplate(null);
      }

      setScores(scoresData);

      // Initialize Inputs
      const inputs = {};

      // Map existing scores to inputs
      scoresData.forEach(score => {
        const key = score.id; // Use score ID as key for existing scores
        // Only set the input if score has a value (not null)
        if (score.score !== null && score.score !== undefined) {
          inputs[key] = score.score;
        }
      });
      setScoreInputs(inputs);
    } catch (error) {
      console.error("Error fetching data:", error);
      showError(t("errorFetchingData", "Failed to load data"));
    } finally {
      setLoading(false);
    }
  }, [selectedClass, globalFilterMonth, globalFilterYear, showError, t, user, classes]);

  // Effect to rebuild columns when activeTemplate changes
  useEffect(() => {
    let columns = [];
    let templateItemsOrderMap = new Map();

    if (activeTemplate) {
      // Handle new nested structure: template -> subjects -> subSubjects
      const subjects = activeTemplate.subjects || [];

      // If subjects is empty, check for old 'items' structure just in case
      if (subjects.length === 0 && activeTemplate.items) {
        // Fallback to old logic
        activeTemplate.items.forEach((item, index) => {
          const key = `${item.subjectId}-${item.subSubjectId || "main"}`;
          templateItemsOrderMap.set(key, index);
          columns.push({
            subjectId: item.subjectId,
            subSubjectId: item.subSubjectId,
            subject: item.subject,
            subSubject: item.subSubject
          });
        });
      } else {
        // Process nested structure
        let globalIndex = 0;
        subjects.forEach((subjItem) => {
          // subjItem is { subjectId, subject, order, subSubjects: [...] }
          const subject = subjItem.subject;
          const subSubjects = subjItem.subSubjects || [];

          if (subSubjects.length > 0) {
            // Sort subSubjects by order if needed? Assuming API order is correct or we sort
            subSubjects.sort((a, b) => (a.order || 0) - (b.order || 0));

            subSubjects.forEach((subItem) => {
              const key = `${subject.id}-${subItem.subSubjectId}`;
              templateItemsOrderMap.set(key, globalIndex++);
              columns.push({
                subjectId: subject.id,
                subSubjectId: subItem.subSubjectId,
                subject: subject,
                subSubject: subItem.subSubject
              });
            });
          } else {
            // Single subject column
            const key = `${subject.id}-main`;
            templateItemsOrderMap.set(key, globalIndex++);
            columns.push({
              subjectId: subject.id,
              subSubjectId: null,
              subject: subject,
              subSubject: null
            });
          }
        });
      }
    }

    // Fallback: Infer columns from scores if no active template
    // Note: scores is in state, so we can use it
    if (columns.length === 0 && scores.length > 0) {
      const columnsMap = new Map();
      scores.forEach((score) => {
        const key = `${score.subjectId}-${score.subSubjectId || "main"}`;
        if (!columnsMap.has(key)) {
          columnsMap.set(key, {
            subjectId: score.subjectId,
            subSubjectId: score.subSubjectId,
            subject: score.subject,
            subSubject: score.subSubject,
          });
        }
      });
      columns = Array.from(columnsMap.values());
    }

    // Sort columns
    if (templateItemsOrderMap.size > 0) {
      columns.sort((a, b) => {
        const keyA = `${a.subjectId}-${a.subSubjectId || "main"}`;
        const keyB = `${b.subjectId}-${b.subSubjectId || "main"}`;
        const indexA = templateItemsOrderMap.has(keyA) ? templateItemsOrderMap.get(keyA) : 9999;
        const indexB = templateItemsOrderMap.has(keyB) ? templateItemsOrderMap.get(keyB) : 9999;
        return indexA - indexB;
      });
    } else {
      columns.sort((a, b) => {
        if (a.subjectId !== b.subjectId) return a.subjectId - b.subjectId;
        return (a.subSubjectId || 0) - (b.subSubjectId || 0);
      });
    }

    setTemplateColumns(columns);
  }, [activeTemplate, scores]);




  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Group scores by student for rendering
   * Now driven by student list + template columns
   */
  const groupedScores = useCallback(() => {
    if (!students.length) return [];

    return students.map(student => {
      // Get student ID - handle both id and studentId properties
      const studentIdValue = student.studentId || student.id;

      // Find scores for this student
      const studentScores = scores.filter(s => s.studentId === studentIdValue);
      return {
        student,
        scores: studentScores
      };
    });
  }, [students, scores]);

  /**
   * Handle score input change
   */
  const handleScoreChange = (key, value) => {
    // Allow empty string
    if (value === "") {
      setScoreInputs((prev) => ({
        ...prev,
        [key]: value,
      }));
      return;
    }

    const numValue = parseFloat(value);
    // Allow valid numbers <= 10
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
      setScoreInputs((prev) => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  /**
   * Save multiple scores (helper)
   */
  const saveScoreInputs = async (inputsToSave) => {
    try {
      startLoading("saveScores", t("savingScores", "Saving scores..."));

      const hasTempInputs = Object.keys(inputsToSave).some(k => typeof k === 'string' && k.startsWith('temp-'));
      let newScoreMap = null;

      if (hasTempInputs) {
        if (!activeTemplate) {
          throw new Error(t("noActiveTemplateError", "No active template found to initialize scores"));
        }

        await examScoreTemplateService.applyTemplate({
          classId: parseInt(selectedClass),
          month: globalFilterMonth,
          year: parseInt(globalFilterYear),
          templateId: activeTemplate.id
        });

        // Fetch new scores to get IDs
        const response = await examScoreTemplateService.getScores({
          classId: selectedClass,
          month: globalFilterMonth,
          year: parseInt(globalFilterYear),
        });

        if (response.success) {
          const newScores = response.data || [];
          newScoreMap = new Map();
          newScores.forEach(s => {
            const key = `${s.studentId}-${s.subjectId}-${s.subSubjectId || 'main'}`;
            newScoreMap.set(key, s.id);
          });
        }
      }

      // Prepare scores array for bulk update
      const scoresToUpdate = [];

      for (const [key, value] of Object.entries(inputsToSave)) {
        let realScoreId = key;

        if (typeof key === 'string' && key.startsWith('temp-')) {
          const parts = key.split('-');
          // parts[0] = temp
          // parts[1] = studentId
          // parts[2] = subjectId
          // parts[3] = subSubjectId (or 'main')
          if (newScoreMap) {
            const mapKey = `${parts[1]}-${parts[2]}-${parts[3]}`;
            if (newScoreMap.has(mapKey)) {
              realScoreId = newScoreMap.get(mapKey);
            } else {
              continue; // Failed to map, skip this score
            }
          } else {
            continue; // Should not happen if logic flows correctly
          }
        }

        const scoreValue = value === "" ? null : parseFloat(value);
        scoresToUpdate.push({
          id: parseInt(realScoreId),
          score: scoreValue
        });
      }

      // Use bulk update instead of individual updates
      if (scoresToUpdate.length > 0) {
        const result = await examScoreTemplateService.bulkUpdateScores(scoresToUpdate);

        if (result.success) {
          const { updated, notFound } = result.data;

          if (notFound && notFound.length > 0) {
            console.warn(`Some scores were not found:`, notFound);
            showSuccess(t("scoresSavedPartial", `${updated} scores saved. ${notFound.length} not found.`));
          } else {
            showSuccess(t("scoresSaved", "Scores saved successfully"));
          }
        }
      }

      fetchData(); // Refresh
    } catch (error) {
      console.error("Error saving scores:", error);
      showError(error?.message || t("errorSavingScores", "Failed to save scores"));
    } finally {
      stopLoading("saveScores");
    }
  };

  /**
   * Save individual score (wrapper)
   */
  const handleSaveScore = async (key) => {
    const inputs = { [key]: scoreInputs[key] };
    await saveScoreInputs(inputs);
  };

  /**
   * Handle arrow key navigation
   */
  const handleKeyDown = (e, rowIndex, colIndex) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      let nextRow = rowIndex;
      let nextCol = colIndex;

      if (e.key === 'ArrowUp') nextRow = Math.max(0, rowIndex - 1);
      if (e.key === 'ArrowDown') nextRow = Math.min(students.length - 1, rowIndex + 1);
      if (e.key === 'ArrowLeft') nextCol = Math.max(0, colIndex - 1);
      if (e.key === 'ArrowRight') nextCol = Math.min(templateColumns.length - 1, colIndex + 1);

      const nextInput = document.querySelector(
        `input[data-row-index="${nextRow}"][data-col-index="${nextCol}"]`
      );
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  /**
   * Save all scores
   */
  const handleSaveAllScores = async () => {
    await saveScoreInputs(scoreInputs);
  };

  /**
   * Get score for specific student and column
   */
  const getScoreForColumn = (studentScores, column) => {
    return studentScores.find(
      (s) =>
        s.subjectId === column.subjectId &&
        (s.subSubjectId || null) === (column.subSubjectId || null),
    );
  };

  if (loading) {
    return <PageLoader message={t("loadingScores", "Loading scores...")} />;
  }

  if (!selectedClass) {
    return (
      <EmptyState
        icon={FileQuestion}
        title={t("selectClass", "Select a Class")}
        description={t(
          "selectClassToViewScores",
          "Please select a class from the filters to view scores",
        )}
      />
    );
  }

  if (students.length === 0) {
    return (
      <EmptyState
        icon={FileQuestion}
        title={t("noStudents", "No Students Found")}
        description={t(
          "noStudentsDesc",
          "There are no students in this class."
        )}
      />
    );
  }

  // Check if no template is selected/available
  if (activeTemplate === null && templateColumns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <EmptyState
          icon={FileQuestion}
          title={t("noTemplateApplied", "No Template Applied")}
          description={t(
            "applyTemplateFirst",
            "This class doesn't have a template applied yet. Please go to Template Management to create and apply a template."
          )}
        />
        {onNavigateToTemplates && (
          <Button
            onClick={onNavigateToTemplates}
            className="mt-6"
          >
            {t("goToTemplateManagement", "Go to Template Management")}
          </Button>
        )}
      </div>
    );
  }

  const studentGroups = groupedScores();

  return (
    <div className="mt-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {t("scoreInput", "Score Input")}
        </h2>
        <Button
          onClick={handleSaveAllScores}
          variant="primary"
          size="sm"
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {t("saveAll", "Save All")}
        </Button>
      </div>

      {/* Scores Table */}
      <div className="bg-white rounded-sm border border-gray-200 overflow-hidden shadow-lg h-[700px] flex flex-col">
        <div className="overflow-auto flex-1 h-[700px]">
          <table className="min-w-full border-collapse bg-white">
            <thead className="sticky top-0 z-20 border-b border-gray-200">
              {/* Generates grouped headers logic */}
              {(() => {
                const groups = [];
                let currentGroup = null;

                templateColumns.forEach((col) => {
                  if (!currentGroup || currentGroup.subjectId !== col.subjectId) {
                    currentGroup = {
                      subjectId: col.subjectId,
                      subjectName: col.subject?.khmerName || col.subject?.name,
                      subSubjects: []
                    };
                    groups.push(currentGroup);
                  }

                  if (col.subSubjectId) {
                    currentGroup.subSubjects.push(col);
                  }
                });

                return (
                  <>
                    <tr className="border-b border-blue-800 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                      <th
                        rowSpan={2}
                        className="px-6 py-3 text-left text-sm font-bold text-white border-r border-blue-500 min-w-80 bg-blue-700 sticky left-0 z-30"
                      >
                        {t("studentName", "Student Name")}
                      </th>
                      {groups.map((group, idx) => (
                        <th
                          key={idx}
                          colSpan={group.subSubjects.length || 1}
                          rowSpan={group.subSubjects.length > 0 ? 1 : 2}
                          className="px-3 py-3 text-center text-sm font-bold text-white border-r border-blue-500 bg-blue-700 whitespace-nowrap"
                        >
                          {group.subjectName}
                        </th>
                      ))}
                      <th
                        rowSpan={2}
                        className="px-4 py-3 text-center text-sm font-bold text-white border-r border-gray-200 bg-green-700 whitespace-nowrap"
                      >
                        {t("totalScore", "Total Score")}
                      </th>
                      <th
                        rowSpan={2}
                        className="px-4 py-3 text-center text-sm font-bold text-white border-r border-gray-200 bg-purple-700 whitespace-nowrap"
                      >
                        {t("average", "Average")}
                      </th>
                      <th
                        rowSpan={2}
                        className="px-4 py-3 text-center text-sm font-bold text-white border-r border-gray-200 bg-orange-700 whitespace-nowrap"
                      >
                        {t("grading", "Grade")}
                      </th>
                    </tr>
                    <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                      {groups.map((group) =>
                        group.subSubjects.length > 0 &&
                        group.subSubjects.map((subCol, subIdx) => (
                          <th
                            key={`${group.subjectId}-${subIdx}`}
                            className="px-3 py-2 text-center text-xs font-bold text-white border-r border-blue-500 border-t whitespace-nowrap"
                          >
                            {subCol.subSubject?.khmerName || subCol.subSubject?.name}
                          </th>
                        ))
                      )}
                    </tr>
                  </>
                );
              })()}
            </thead>
            <tbody className="bg-white">
              {studentGroups.map((group, groupIdx) => {
                const studentName = getFullName({
                  firstName: group.student?.user?.firstName || group.student?.firstName,
                  lastName: group.student?.user?.lastName || group.student?.lastName
                });
                const rawGender = group.student?.gender || group.student?.user?.gender;
                const studentGender = genderToKhmer(rawGender);
                const studentId = group.student?.id || group.student?.studentId;

                // Calculate totals for this student row
                let totalScore = 0;
                let count = 0;

                // Helper to get score value safely
                const getScoreValue = (col) => {
                  const scoreRecord = getScoreForColumn(group.scores, col);
                  const key = scoreRecord ? scoreRecord.id : `temp-${studentId}-${col.subjectId}-${col.subSubjectId || 'main'}`;
                  const val = parseFloat(scoreInputs[key]);
                  return isNaN(val) ? 0 : val;
                };

                // Sum all columns that map to inputs
                templateColumns.forEach(col => {
                  const val = getScoreValue(col);
                  if (val > 0) {
                    totalScore += val;
                    count++;
                  }
                });

                // Avg logic
                const average = count > 0 ? totalScore / count : 0;

                // Grade Logic
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
                  <tr key={groupIdx} className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="text-left sticky left-0 z-10 min-w-80 bg-gray-50 border-r border-gray-200">
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
                          <div className="flex gap-1">
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={async () => {
                                try {
                                  setSavingStudentId(studentId);
                                  // Save all scores for this student
                                  const studentInputsToSave = {};
                                  templateColumns.forEach(col => {
                                    const scoreRecord = getScoreForColumn(group.scores, col);
                                    const key = scoreRecord ? scoreRecord.id : `temp-${studentId}-${col.subjectId}-${col.subSubjectId || 'main'}`;
                                    if (scoreInputs[key] !== undefined) {
                                      studentInputsToSave[key] = scoreInputs[key];
                                    }
                                  });

                                  // We can reuse handleSaveAllScores logic but filtering keys
                                  // For now, simpler to call save for filtered inputs
                                  await saveScoreInputs(studentInputsToSave);
                                } finally {
                                  setSavingStudentId(null);
                                }
                              }}
                              disabled={savingStudentId === studentId}
                              title={t("saveStudentScores", "Save this student's scores")}
                              className="whitespace-nowrap"
                            >
                              {savingStudentId === studentId ? (
                                <Loader className="w-3 h-3 inline-block animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </td>
                    {templateColumns.map((column, colIdx) => {
                      const scoreRecord = getScoreForColumn(group.scores, column);
                      // Use existing ID or composite key for temporary input
                      const key = scoreRecord ? scoreRecord.id : `temp-${studentId}-${column.subjectId}-${column.subSubjectId || 'main'}`;

                      return (
                        <td key={colIdx} className="border-r border-gray-200 relative cursor-pointer bg-white hover:bg-blue-50 text-center p-0 min-w-[80px]">

                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="10"
                            value={scoreInputs[key] ?? ""}
                            data-row-index={groupIdx}
                            data-col-index={colIdx}
                            onKeyDown={(e) => handleKeyDown(e, groupIdx, colIdx)}
                            onChange={(e) =>
                              handleScoreChange(key, e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-full p-4 text-sm border-0 focus:border focus:ring-1 bg-transparent focus:border-blue-500 focus:ring-blue-500 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder=""
                          />
                        </td>
                      );
                    })}
                    {/* Summary Columns */}
                    <td className="px-4 py-4 text-center text-sm font-bold text-gray-900 border-r border-gray-200 bg-green-50">
                      {totalScore.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-bold text-gray-900 border-r border-gray-200 bg-purple-50">
                      {count > 0 ? average.toFixed(2) : "0.00"}
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-bold border-r border-gray-200 bg-orange-50">
                      <span className={gradeColor}>
                        {grade}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 p-4 bg-blue-50 rounded-sm border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>{t("totalStudents", "Total Students")}:</strong>{" "}
          {studentGroups.length}
          {" | "}
          <strong>{t("totalSubject", "Total Subjectkm")}:</strong>{" "}
          {templateColumns.length}
          {" | "}
          <strong>{t("totalScores", "Total Scores")}:</strong> {Object.keys(scoreInputs).filter(k => scoreInputs[k] !== "").length}
        </p>
      </div>
    </div>
  );
}
