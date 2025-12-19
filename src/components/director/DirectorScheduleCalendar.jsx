import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useErrorHandler } from "../../hooks/useErrorHandler";
import { PageTransition, FadeInSection } from "../ui/PageTransition";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/Button";
import { Calendar, RefreshCw } from "lucide-react";
import BaseScheduleCalendar from "../schedule/BaseScheduleCalendar";
import DynamicLoader from "../ui/DynamicLoader";
import scheduleService from "../../utils/api/services/scheduleService";
import classService from "../../utils/api/services/classService";
import { userUtils } from "../../utils/api/services/userService";
import { subjectService } from "../../utils/api/services/subjectService";

/**
 * DirectorScheduleCalendar - Standalone page component for director schedule management
 *
 * Combines the DirectorSchedule page logic with the schedule calendar view
 * Can be used as a full page component or adapted for other uses
 */
const DirectorScheduleCalendar = () => {
  const { t } = useLanguage();
  const user = userUtils.getUserData();
  const { handleError } = useErrorHandler();

  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedShift, setSelectedShift] = useState("morning");

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

  // Fetch classes on mount
  useEffect(() => {
    if (user?.school_id) {
      fetchClasses();
    }
  }, [user?.school_id]);

  // Fetch schedules when filters change
  useEffect(() => {
    if (user?.school_id && (selectedGradeLevel !== null || selectedClass !== null)) {
      fetchSchedules();
    }
  }, [user?.school_id, selectedGradeLevel, selectedClass, selectedShift]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await classService.getBySchool(user.school_id, { limit: 1000 });

      // Extract array from response
      let classesData = [];
      if (Array.isArray(response)) {
        classesData = response;
      } else if (response?.classes && Array.isArray(response.classes)) {
        classesData = response.classes;
      } else if (response?.data && Array.isArray(response.data)) {
        classesData = response.data;
      }

      console.log("📚 Fetched classes:", classesData);
      setClasses(classesData);

      // Set default grade level if available
      if (classesData.length > 0 && selectedGradeLevel === null) {
        const uniqueGradeLevels = [...new Set(classesData.map(c => c.gradeLevel))].sort();
        if (uniqueGradeLevels.length > 0) {
          setSelectedGradeLevel(uniqueGradeLevels[0]);
        }
      }
    } catch (err) {
      handleError(err, {
        toastMessage: t("failedToLoadClasses", "Failed to load classes"),
      });
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

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

      console.log("📊 Fetching director schedules with filters:", filters);
      console.log("📊 Selected class:", selectedClass);
      console.log("📊 Selected grade level:", selectedGradeLevel);

      let response;
      let schedulesData = [];

      // If specific class is selected, fetch that class's schedules
      if (selectedClass) {
        console.log("📊 Using class-based endpoint for classId:", selectedClass);
        response = await scheduleService.getClassScheduleFiltered(selectedClass, filters);

        // Extract array from response
        if (Array.isArray(response)) {
          schedulesData = response;
        } else if (response?.data && Array.isArray(response.data)) {
          schedulesData = response.data;
        } else if (response?.schedules && Array.isArray(response.schedules)) {
          schedulesData = response.schedules;
        }
      } else if (selectedGradeLevel !== null) {
        // If grade level selected but no specific class, fetch all classes in that grade and get their schedules
        console.log("📊 Fetching all classes for gradeLevel:", selectedGradeLevel);
        const classesInGrade = classes.filter(c => c.gradeLevel === selectedGradeLevel);
        console.log("📊 Classes in grade:", classesInGrade);

        // Fetch schedules for each class in the grade level
        const allSchedules = [];
        for (const classItem of classesInGrade) {
          try {
            const classResponse = await scheduleService.getClassScheduleFiltered(classItem.classId, filters);
            let classSchedules = [];
            if (Array.isArray(classResponse)) {
              classSchedules = classResponse;
            } else if (classResponse?.data && Array.isArray(classResponse.data)) {
              classSchedules = classResponse.data;
            } else if (classResponse?.schedules && Array.isArray(classResponse.schedules)) {
              classSchedules = classResponse.schedules;
            }
            allSchedules.push(...classSchedules);
          } catch (err) {
            console.error(`Failed to fetch schedules for classId ${classItem.classId}:`, err);
          }
        }
        schedulesData = allSchedules;
      } else {
        return;
      }

      console.log("📊 Fetched schedules:", schedulesData);

      // Enrich schedules with subject details
      const enrichedSchedules = await enrichSchedulesWithSubjects(schedulesData);
      console.log("📊 Enriched schedules with subjects:", enrichedSchedules);

      setSchedules(enrichedSchedules);
    } catch (err) {
      handleError(err, {
        toastMessage: t("failedToLoadSchedules", "Failed to load schedules"),
      });
      setSchedules([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const handleShiftChange = (newShift) => {
    setSelectedShift(newShift);
  };

  const handleGradeLevelChange = (newGradeLevel) => {
    setSelectedGradeLevel(newGradeLevel);
    setSelectedClass(null); // Reset class filter when grade level changes
  };

  const handleClassChange = (newClass) => {
    setSelectedClass(newClass);
  };

  const getUniqueLevels = () => {
    return [...new Set(classes.map(c => c.gradeLevel))].sort((a, b) => {
      if (a === 0 || a === "0") return -1;
      if (b === 0 || b === "0") return 1;
      return a - b;
    });
  };

  const getClassesByGradeLevel = (gradeLevel) => {
    // Compare as strings to handle both string and number types
    const gradeLevelStr = gradeLevel?.toString();
    return classes.filter(c => c.gradeLevel?.toString() === gradeLevelStr);
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
                {t("schoolSchedule", "School Schedule")}
              </h1>
              <p className="text-sm text-gray-500">
                {t("viewAllSchedules", "View all class schedules by grade level")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSchedules}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
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
              {loading && classes.length === 0 ? (
                <DynamicLoader type="skeleton" lines={10} className="w-full" />
              ) : (
                <BaseScheduleCalendar
                  schedules={schedules}
                  classes={classes}
                  isDirector={true}
                  uniqueLevels={getUniqueLevels()}
                  classesByGradeLevel={getClassesByGradeLevel}
                  selectedGradeLevel={selectedGradeLevel}
                  selectedClass={selectedClass}
                  selectedShift={selectedShift}
                  onGradeLevelChange={handleGradeLevelChange}
                  onClassChange={handleClassChange}
                  onShiftChange={handleShiftChange}
                  loading={loading}
                />
              )}
            </CardContent>
          </Card>
        </FadeInSection>
      </div>
    </PageTransition>
  );
};

export default DirectorScheduleCalendar;
