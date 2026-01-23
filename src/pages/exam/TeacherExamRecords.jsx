import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { teacherService } from "../../utils/api/services/teacherService";
import {
  PageTransition,
  FadeInSection,
} from "../../components/ui/PageTransition";
import { PageLoader } from "../../components/ui/DynamicLoader";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/Tabs";
import ExamRecordsTab from "./ExamRecordsTab";
import ScoreInputTab from "./ScoreInputTab";

/**
 * TeacherExamRecords Component
 * Teachers can view exam records for students in their assigned classes
 * and input student scores by subject and skill
 */
export default function TeacherExamRecords({ user }) {
  const { t } = useLanguage();
  const { showError } = useToast();

  // Shared state
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [activeTab, setActiveTab] = useState("records"); // 'records' or 'scores'
  const [loading, setLoading] = useState(true);

  // State for passing to tabs
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(
    new Date().getFullYear().toString(),
  );

  /**
   * Fetch teacher's assigned classes
   */
  const fetchClasses = useCallback(async () => {
    try {
      const teacherId = user?.teacher?.id || user?.teacherId;

      if (teacherId) {
        const response = await teacherService.getTeacherClasses(teacherId);

        if (response.success) {
          const teacherClasses = response.data || [];
          setClasses(teacherClasses);

          // If teacher has only one class, auto-select it
          if (teacherClasses.length === 1) {
            setSelectedClass(teacherClasses[0].classId || teacherClasses[0].id);
          }
        } else {
          showError(t("errorFetchingClasses", "Failed to fetch classes"));
        }
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
      showError(t("errorFetchingClasses", "Failed to fetch classes"));
    } finally {
      setLoading(false);
    }
  }, [user, showError, t]);

  /**
   * Initial load - fetch classes
   */
  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Loading state
  if (loading && classes.length === 0) {
    return (
      <PageLoader
        message={t("loadingExamRecords", "Loading exam records...")}
      />
    );
  }

  return (
    <PageTransition variant="fade" className="flex-1">
      <div className="p-3 sm:p-6">
        {/* Header */}
        <FadeInSection className="mb-6">
          <div className="bg-white rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t("studentExamRecords", "Student Exam Records")}
                </h1>
                <p className="text-sm text-gray-600">
                  {t(
                    "viewClassStudentExams",
                    "View exam records for your students",
                  )}
                </p>
              </div>
            </div>

            {/* Tab Navigation */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="mt-6"
            >
              <TabsList>
                <TabsTrigger value="records">
                  {t("examRecords", "Exam Records")}
                </TabsTrigger>
                <TabsTrigger value="scores">
                  {t("scoreInput", "Score Input")}
                </TabsTrigger>
              </TabsList>

              {/* Exam Records Tab */}
              <TabsContent value="records">
                <ExamRecordsTab
                  classes={classes}
                  selectedClass={selectedClass}
                  onClassChange={setSelectedClass}
                  selectedMonth={selectedMonth}
                  selectedAcademicYear={selectedAcademicYear}
                  user={user}
                  t={t}
                />
              </TabsContent>

              {/* Score Input Tab */}
              <TabsContent value="scores">
                <ScoreInputTab
                  classes={classes}
                  selectedClass={selectedClass}
                  onClassChange={setSelectedClass}
                  user={user}
                  t={t}
                />
              </TabsContent>
            </Tabs>
          </div>
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
