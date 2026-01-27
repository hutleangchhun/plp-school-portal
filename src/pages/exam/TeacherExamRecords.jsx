import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { formatClassIdentifier } from "../../utils/helpers";
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
import { Button } from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Dropdown from "../../components/ui/Dropdown";
import { YearPicker } from "../../components/ui/year-picker";
import SidebarFilter from "../../components/ui/SidebarFilter";
import ExamRecordsTab from "./ExamRecordsTab";
import ScoreInputTab from "./ScoreInputTab";
import HonorRollTab from "./HonorRollTab";
import { ListFilter } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState("honor"); // 'honor', 'records', or 'scores'
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterAcademicYear, setFilterAcademicYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);

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
            <div className="flex items-center justify-between gap-3 mb-4">
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
              <Button
                onClick={() => setFilterSidebarOpen(true)}
                variant="primary"
                size="sm"
                className="flex items-center gap-2"
                title={t("openFilters", "Open Filters")}
              >
                <ListFilter className="w-4 h-4" />
                {t("filters", "Filters")}
              </Button>
            </div>

            {/* Tab Navigation */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="mt-6"
            >
              <TabsList>
                <TabsTrigger value="honor">
                  {t("honorRoll", "Honor Roll")}
                </TabsTrigger>
                <TabsTrigger value="records">
                  {t("examRecords", "Exam Records")}
                </TabsTrigger>
                <TabsTrigger value="scores">
                  {t("scoreInput", "Score Input")}
                </TabsTrigger>
                
              </TabsList>

              {/* Active Filters Display */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {t("activeFilters", "Active Filters")}:
                </span>
                {selectedClass ? (
                  <Badge color="blue" variant="outline">
                    {t("class", "Class")}:{" "}
                    {classes.find((c) => (c.classId || c.id) === selectedClass)
                      ?.gradeLevel
                      ? formatClassIdentifier(
                          classes.find(
                            (c) => (c.classId || c.id) === selectedClass,
                          )?.gradeLevel,
                          classes.find(
                            (c) => (c.classId || c.id) === selectedClass,
                          )?.section,
                        )
                      : classes.find((c) => (c.classId || c.id) === selectedClass)
                          ?.name || t("unknown", "Unknown")}
                  </Badge>
                ) : (
                  <Badge color="gray" variant="outline">
                    {t("class", "Class")}: {t("all", "All")}
                  </Badge>
                )}
                <Badge color="purple" variant="outline">
                  {t("month", "Month")}:{" "}
                  {
                    [
                      t("january", "January"),
                      t("february", "February"),
                      t("march", "March"),
                      t("april", "April"),
                      t("may", "May"),
                      t("june", "June"),
                      t("july", "July"),
                      t("august", "August"),
                      t("september", "September"),
                      t("october", "October"),
                      t("november", "November"),
                      t("december", "December"),
                    ][filterMonth - 1]
                  }
                </Badge>
                <Badge color="green" variant="outline">
                  {t("year", "Year")}: {filterAcademicYear}
                </Badge>
              </div>

              {/* Honor Roll Tab */}
              <TabsContent value="honor">
                <HonorRollTab
                  selectedClass={selectedClass}
                  selectedClassName={
                    selectedClass
                      ? formatClassIdentifier(
                          classes.find((c) => (c.classId || c.id) === selectedClass)?.gradeLevel,
                          classes.find((c) => (c.classId || c.id) === selectedClass)?.section,
                          t
                        ) || classes.find((c) => (c.classId || c.id) === selectedClass)?.name
                      : null
                  }
                  globalFilterMonth={filterMonth}
                  globalFilterYear={filterAcademicYear}
                  t={t}
                />
              </TabsContent>

              {/* Exam Records Tab */}
              <TabsContent value="records">
                <ExamRecordsTab
                  selectedClass={selectedClass}
                  globalFilterMonth={filterMonth}
                  globalFilterYear={filterAcademicYear}
                  t={t}
                />
              </TabsContent>

              {/* Score Input Tab */}
              <TabsContent value="scores">
                <ScoreInputTab
                  classes={classes}
                  selectedClass={selectedClass}
                  onClassChange={setSelectedClass}
                  globalFilterMonth={filterMonth}
                  globalFilterYear={filterAcademicYear}
                  user={user}
                  t={t}
                />
              </TabsContent>
            </Tabs>
          </div>
        </FadeInSection>
      </div>

      {/* Global Filter Sidebar */}
      <SidebarFilter
        isOpen={filterSidebarOpen}
        onClose={() => setFilterSidebarOpen(false)}
        title={t("filters", "Filters")}
        subtitle={t("filterDesc", "Filter exam data across all tabs")}
        hasFilters={selectedClass !== null}
        onClearFilters={() => {
          setSelectedClass(null);
          setFilterMonth(new Date().getMonth() + 1);
          setFilterAcademicYear(new Date().getFullYear().toString());
        }}
        onApply={() => setFilterSidebarOpen(false)}
      >
        {/* Class Selection */}
        {classes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("selectClass", "Select Class")}
            </label>
            <Dropdown
              value={selectedClass ? selectedClass.toString() : ""}
              onValueChange={(value) =>
                setSelectedClass(value ? parseInt(value) : null)
              }
              options={[
                { value: "", label: t("allClasses", "All Classes") },
                ...classes.map((cls) => ({
                  value: (cls.classId || cls.id).toString(),
                  label: cls.gradeLevel
                    ? `${t("class", "Class")} ${formatClassIdentifier(cls.gradeLevel, cls.section)}`
                    : cls.name || `${t("class", "Class")} ${cls.gradeLevel || ""}`,
                })),
              ]}
              placeholder={t("chooseOption", "Choose an option")}
              className="w-full"
            />
          </div>
        )}

        {/* Year Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("year", "Year")}
          </label>
          <YearPicker
            value={filterAcademicYear}
            onChange={(value) => setFilterAcademicYear(value)}
            placeholder={t("selectYear", "Select Year")}
            fromYear={2000}
            toYear={new Date().getFullYear() + 1}
          />
        </div>

        {/* Month Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("month", "Month")}
          </label>
          <Dropdown
            value={filterMonth.toString()}
            onValueChange={(value) => setFilterMonth(parseInt(value))}
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
      </SidebarFilter>
    </PageTransition>
  );
}
