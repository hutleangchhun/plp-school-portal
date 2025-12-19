import React, { useState, useEffect, useRef } from "react";
import BaseScheduleCalendar from "./BaseScheduleCalendar";
import Modal from "../ui/Modal";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { useErrorHandler } from "../../hooks/useErrorHandler";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { PageTransition, FadeInSection } from "../ui/PageTransition";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/Button";
import { Calendar, Plus, RefreshCw, Download } from "lucide-react";
import { formatClassIdentifier } from "../../utils/helpers";
import ScheduleFormModal from "../teacher/ScheduleFormModal";
import DynamicLoader from "../ui/DynamicLoader";
import scheduleService from "../../utils/api/services/scheduleService";
import { userUtils } from "../../utils/api/services/userService";
import { subjectService } from "../../utils/api/services/subjectService";
import { getCurrentAcademicYear } from "../../utils/academicYear";
import { exportScheduleToPDF, getScheduleFilename } from "../../utils/scheduleExportUtils";

/**
 * TeacherScheduleCalendar - Standalone page component for teacher schedule management
 *
 * Combines the WeeklySchedule page logic with the schedule calendar view
 * Includes schedule creation, editing, and deletion capabilities
 */
const TeacherScheduleCalendar = () => {
  const { t } = useLanguage();
  const user = userUtils.getUserData();
  const { showSuccess, showError } = useToast();
  const { handleError } = useErrorHandler();

  // Get teacher's classes from localStorage
  const [storedClasses] = useLocalStorage("teacherClasses", []);

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedShift, setSelectedShift] = useState("morning");
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(getCurrentAcademicYear());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Prevent duplicate fetches
  const fetchingRef = useRef(false);

  // Helper function to enrich schedules with subject details
  const enrichSchedulesWithSubjects = async (schedules) => {
    if (!Array.isArray(schedules) || schedules.length === 0) {
      return schedules;
    }

    try {
      // Get unique subject IDs (handle both snake_case and camelCase)
      const subjectIds = [...new Set(schedules.map(s => s.subjectid || s.subjectId).filter(Boolean))];

      console.log("📚 Fetching subjects for IDs:", subjectIds);

      // Fetch all subjects in parallel
      const subjectPromises = subjectIds.map(id =>
        subjectService.getById(id).catch(err => {
          console.warn(`Failed to fetch subject ${id}:`, err);
          return null;
        })
      );

      const subjectResponses = await Promise.all(subjectPromises);
      console.log("📚 Subject responses:", subjectResponses);

      // Create a map of subject ID to subject data
      const subjectsMap = {};
      subjectResponses.forEach((response, index) => {
        if (response && response.data) {
          subjectsMap[subjectIds[index]] = response.data;
        }
      });

      console.log("📚 Subjects map:", subjectsMap);

      // Enrich schedules with subject data
      const enriched = schedules.map(schedule => {
        const subjectId = schedule.subjectid || schedule.subjectId;
        const subject = subjectsMap[subjectId];

        console.log(`📚 Schedule ${schedule.id}: subjectId=${subjectId}, subject=`, subject);

        return {
          ...schedule,
          // Normalize field names to camelCase for consistency
          dayOfWeek: schedule.dayofweek || schedule.dayOfWeek,
          startTime: schedule.starttime || schedule.startTime,
          endTime: schedule.endtime || schedule.endTime,
          subjectId: subjectId,
          subject: subject || null
        };
      });

      console.log("📚 Enriched schedules:", enriched);
      return enriched;
    } catch (error) {
      console.error('Error enriching schedules with subjects:', error);
      return schedules;
    }
  };

  useEffect(() => {
    if (user?.id) {
      console.log("📚 Loaded teacher classes from localStorage:", storedClasses);
      console.log("📚 StoredClasses length:", storedClasses?.length);
      // Set default class if available and none selected
      if (storedClasses && storedClasses.length > 0 && selectedClass === null) {
        setSelectedClass(storedClasses[0].classId);
      }
    }
  }, [user?.id, storedClasses]);

  // Separate effect for fetching when filters change
  useEffect(() => {
    if (user?.id) {
      fetchSchedules();
    }
  }, [user?.id, selectedShift, selectedClass, selectedAcademicYear]);

  const fetchSchedules = async () => {
    if (fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      setLoading(true);

      // Build filter parameters
      const filters = {};

      // Add optional filters - add shift (can be null, convert null to string "null" for API)
      if (selectedShift !== undefined) {
        filters.shift = selectedShift === null ? 'null' : selectedShift;
      }

      if (selectedAcademicYear) {
        filters.academicYear = selectedAcademicYear;
      }

      console.log("📊 Fetching with filters:", filters);
      console.log("📊 Selected class:", selectedClass);
      console.log("📊 Selected academic year:", selectedAcademicYear);

      let response;

      // Use class-based endpoint if a class is selected, otherwise use teacher-based endpoint
      if (selectedClass) {
        console.log("📊 Using class-based endpoint for classId:", selectedClass);
        response = await scheduleService.getClassScheduleFiltered(selectedClass, filters);
      } else {
        console.log("📊 Using teacher-based endpoint for teacherId:", user.teacherId || user.id);
        response = await scheduleService.getTeacherScheduleFiltered(user.teacherId || user.id, filters);
      }

      console.log("📊 Raw API Response:", response);
      console.log("📊 Response type:", typeof response);
      console.log("📊 Is Array?:", Array.isArray(response));
      console.log("📊 Response.data:", response?.data);
      console.log("📊 Response.schedules:", response?.schedules);

      // Extract array from response - handle different response structures
      let schedulesData = [];
      if (Array.isArray(response)) {
        console.log("✅ Response is array");
        schedulesData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        console.log("✅ Response.data is array");
        schedulesData = response.data;
      } else if (response?.schedules && Array.isArray(response.schedules)) {
        console.log("✅ Response.schedules is array");
        schedulesData = response.schedules;
      } else {
        console.log("❌ Could not find schedules array in response");
      }

      console.log("Fetched schedules:", schedulesData);

      // Enrich schedules with subject details
      const enrichedSchedules = await enrichSchedulesWithSubjects(schedulesData);
      console.log("Enriched schedules with subjects:", enrichedSchedules);

      setSchedules(enrichedSchedules);
    } catch (err) {
      handleError(err, {
        toastMessage: t("failedToLoadSchedules", "Failed to load schedules"),
      });
      setSchedules([]); // Set empty array on error
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const handleCreateSchedule = async (scheduleData) => {
    try {
      const response = await scheduleService.createSchedule(scheduleData);

      // Check if the response indicates an error (handleApiResponse catches errors)
      if (!response.success) {
        if (response.status === 409) {
          const conflictMessage = response.error ||
            t("scheduleConflict", "Schedule conflict detected. Please choose a different time.");
          showError(conflictMessage);
          return false; // Conflict - don't close modal
        } else {
          showError(response.error || t("failedToCreateSchedule", "Failed to create schedule"));
          throw new Error(response.error);
        }
      }

      showSuccess(t("scheduleCreated", "Schedule created successfully"));
      fetchSchedules();
      return true; // Success
    } catch (err) {
      console.error("Error in handleCreateSchedule:", err);
      showError(t("failedToCreateSchedule", "Failed to create schedule"));
      return false;
    }
  };

  const handleUpdateSchedule = async (scheduleData) => {
    try {
      console.log("🔄 Updating schedule with ID:", selectedSchedule.id);
      console.log("🔄 Update data:", scheduleData);
      console.log("🔄 Calling scheduleService.updateSchedule...");
      const response = await scheduleService.updateSchedule(selectedSchedule.id, scheduleData);
      console.log("✅ Update response:", response);

      // Check if the response indicates an error (handleApiResponse catches errors)
      if (!response.success) {
        if (response.status === 409) {
          const conflictMessage = response.error ||
            t("scheduleConflict", "Schedule conflict detected. Please choose a different time.");
          showError(conflictMessage);
          return false; // Conflict - don't close modal
        } else {
          showError(response.error || t("failedToUpdateSchedule", "Failed to update schedule"));
          throw new Error(response.error);
        }
      }

      showSuccess(t("scheduleUpdated", "Schedule updated successfully"));
      fetchSchedules();
      return true; // Success
    } catch (err) {
      console.error("❌ Update error:", err);
      console.error("❌ Error details:", err.message);
      showError(t("failedToUpdateSchedule", "Failed to update schedule"));
      return false;
    }
  };

  const handleDeleteSchedule = async () => {
    if (!selectedSchedule) return;

    try {
      await scheduleService.deleteSchedule(selectedSchedule.id);
      showSuccess(t("scheduleDeleted", "Schedule deleted successfully"));
      fetchSchedules();
      setDeleteConfirmOpen(false);
      setIsModalOpen(false);
      setSelectedSchedule(null);
    } catch (err) {
      showError(t("failedToDeleteSchedule", "Failed to delete schedule"));
    }
  };

  const handleShiftChange = (newShift) => {
    setSelectedShift(newShift);
  };

  const handleClassChange = (newClass) => {
    setSelectedClass(newClass);
  };

  const handleCardClick = (schedule) => {
    setSelectedSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedSchedule(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSchedule(null);
  };

  const handleSubmit = async (scheduleData) => {
    let success;
    if (selectedSchedule) {
      success = await handleUpdateSchedule(scheduleData);
    } else {
      success = await handleCreateSchedule(scheduleData);
    }

    if (success) {
      handleCloseModal();
    }
    return success;
  };

  const getClassDisplayName = (classId) => {
    const classItem = storedClasses.find((c) => c.classId === classId);
    if (!classItem) return "";
    return formatClassIdentifier(classItem.gradeLevel, classItem.section);
  };

  const getDayLabel = (day) => {
    const labels = {
      MONDAY: t("monday", "Monday"),
      TUESDAY: t("tuesday", "Tuesday"),
      WEDNESDAY: t("wednesday", "Wednesday"),
      THURSDAY: t("thursday", "Thursday"),
      FRIDAY: t("friday", "Friday"),
      SATURDAY: t("saturday", "Saturday"),
      SUNDAY: t("sunday", "Sunday"),
    };
    return labels[day] || day;
  };

  const formatTime = (time) => {
    return time?.substring(0, 5) || time;
  };

  const handleExportPDF = () => {
    try {
      // Get the selected class info for the header
      const classInfo = selectedClass
        ? storedClasses.find((c) => c.classId === selectedClass)
        : null;

      // Get teacher name
      const teacherName = user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.username || '';

      // Prepare export options
      const exportOptions = {
        t,
        classInfo: classInfo ? {
          gradeLevel: classInfo.gradeLevel,
          section: classInfo.section,
          name: getClassDisplayName(selectedClass)
        } : null,
        teacherName,
        academicYear: selectedAcademicYear,
        shift: selectedShift
      };

      // Generate filename
      const filename = getScheduleFilename('teacher_schedule', 'pdf');

      // Export to PDF
      exportScheduleToPDF(schedules, exportOptions, filename);

      // Show success message
      showSuccess(t("exportSuccess", "Schedule exported successfully"));
    } catch (error) {
      console.error('Error exporting schedule:', error);
      showError(t("exportFailed", "Failed to export schedule"));
    }
  };

  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="p-3 sm:p-6">
        {/* Header */}
        <FadeInSection delay={100} className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-6 w-6 text-blue-600" />
                {t("myWeeklySchedule", "My Weekly Schedule")}
              </h1>
              <p className="text-sm text-gray-500">
                {t("manageYourSchedule", "Manage your teaching schedule for the week")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSchedules}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={loading || schedules.length === 0}
                title={schedules.length === 0 ? t("noScheduleToExport", "No schedule to export") : t("exportToPDF", "Export to PDF")}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddNew}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("addSchedule", "Add Schedule")}
              </Button>
            </div>
          </div>
        </FadeInSection>

        {/* Schedule Calendar */}
        <FadeInSection delay={200}>
          <Card className="border border-gray-200 shadow-sm rounded-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {t("weeklyView", "Weekly View")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <DynamicLoader type="skeleton" lines={10} className="w-full" />
              ) : (
                <BaseScheduleCalendar
                  schedules={schedules}
                  classes={storedClasses}
                  isDirector={false}
                  selectedShift={selectedShift}
                  selectedClass={selectedClass}
                  onShiftChange={handleShiftChange}
                  onClassChange={handleClassChange}
                  onCardClick={handleCardClick}
                  loading={loading}
                />
              )}
            </CardContent>
          </Card>
        </FadeInSection>

        {/* Schedule Form Modal */}
        <ScheduleFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
          schedule={selectedSchedule}
          selectedShift={selectedShift}
          selectedClass={selectedClass}
          teacherId={user?.teacherId || user?.id}
          schoolId={user?.school_id}
          onDelete={() => setDeleteConfirmOpen(true)}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={handleDeleteSchedule}
          title={t("deleteSchedule", "Delete Schedule")}
          message={
            selectedSchedule
              ? `${t(
                  "confirmDeleteSchedule",
                  "Are you sure you want to delete this schedule?"
                )}\n\n${
                  selectedSchedule.subject?.khmer_name ||
                  selectedSchedule.subject?.name
                }\n${getDayLabel(selectedSchedule.dayOfWeek)} · ${formatTime(
                  selectedSchedule.startTime
                )} - ${formatTime(selectedSchedule.endTime)}`
              : t("deleteScheduleConfirm", "Are you sure you want to delete this schedule? This action cannot be undone.")
          }
          type="danger"
          confirmText={t("delete", "Delete")}
          cancelText={t("cancel", "Cancel")}
        />
      </div>
    </PageTransition>
  );
};

export default TeacherScheduleCalendar;
