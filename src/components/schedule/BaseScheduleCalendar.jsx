import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardContent } from "../ui/card";
import { Clock, MapPin } from "lucide-react";
import Dropdown from "../ui/Dropdown";
import { formatClassIdentifier } from "../../utils/helpers";
import { gradeLevelOptions } from "../../utils/formOptions";

const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

/**
 * BaseScheduleCalendar - Reusable schedule calendar component
 *
 * @param {Array} schedules - Schedule data
 * @param {Array} classes - Classes data
 * @param {boolean} isDirector - Whether this is for director view (shows class names)
 * @param {Array} uniqueLevels - Unique grade levels for director view
 * @param {Function} classesByGradeLevel - Function to get classes by grade level (director only)
 * @param {number|null} selectedGradeLevel - Selected grade level (director only)
 * @param {number|null} selectedClass - Selected class
 * @param {string} selectedShift - Selected shift
 * @param {Function} onGradeLevelChange - Grade level change handler (director only)
 * @param {Function} onClassChange - Class change handler
 * @param {Function} onShiftChange - Shift change handler
 * @param {Function} onCardClick - Card click handler for teacher interactions
 * @param {Function} getStatusColor - Optional custom status color function
 * @param {boolean} loading - Loading state
 */
const BaseScheduleCalendar = ({
  schedules = [],
  classes = [],
  isDirector = false,
  uniqueLevels = [],
  classesByGradeLevel,
  selectedGradeLevel = null,
  selectedClass = null,
  selectedShift = "all",
  onGradeLevelChange,
  onClassChange,
  onShiftChange,
  onCardClick,
  getStatusColor,
  loading = false,
}) => {
  const { t } = useLanguage();

  // Ensure schedules is an array
  const schedulesArray = Array.isArray(schedules) ? schedules : [];

  console.log("📅 BaseScheduleCalendar - Received schedules:", schedules);
  console.log("📅 BaseScheduleCalendar - Schedules array:", schedulesArray);
  console.log("📅 BaseScheduleCalendar - Is Director:", isDirector);

  // Format grade levels for dropdown options
  const getGradeLevelDropdownOptions = () => {
    return gradeLevelOptions.map((option) => ({
      value: option.value,
      label: `${t("grade", "Grade")}: ${option.label}`,
    }));
  };

  // Format classes for dropdown options
  const getClassDropdownOptions = () => {
    if (isDirector && selectedGradeLevel === null) return [];

    const classesInGrade = isDirector
      ? classesByGradeLevel(selectedGradeLevel)
      : classes;

    console.log("📚 Selected grade level:", selectedGradeLevel);
    console.log("📚 Classes in grade:", classesInGrade);

    return classesInGrade.map((classItem) => {
      const displayGrade = classItem.gradeLevel === 0 || classItem.gradeLevel === "0"
        ? "មត្តេយ្យ​"
        : classItem.gradeLevel;
      const formattedClass = formatClassIdentifier(displayGrade, classItem.section);
      return {
        value: classItem.classId.toString(),
        label: `${t("class", "Class")}: ${formattedClass}`,
      };
    });
  };

  // Format shifts for dropdown options
  const getShiftDropdownOptions = () => {
    return [
      { value: "morning", label: t("morningShift", "Morning (7am-12pm)") },
      { value: "afternoon", label: t("afternoonShift", "Afternoon (1pm-5pm)") },
      { value: null, label: t("noShift", "No Shift (Flexible)") },
    ];
  };

  // Group schedules by day
  const schedulesByDay = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = schedulesArray
      .filter((s) => s.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {});

  console.log("📅 BaseScheduleCalendar - Schedules by day:", schedulesByDay);

  // Helper function to get breaktime slots between classes
  const getBreaktimeSlots = (daySchedules) => {
    const breaktimes = [];

    for (let i = 0; i < daySchedules.length - 1; i++) {
      const currentEnd = daySchedules[i].endTime;
      const nextStart = daySchedules[i + 1].startTime;

      // Check if there's a gap between end of current and start of next class
      if (currentEnd < nextStart) {
        breaktimes.push({
          id: `breaktime-${daySchedules[i].id}-${daySchedules[i + 1].id}`,
          startTime: currentEnd,
          endTime: nextStart,
          isBreaktime: true,
        });
      }
    }

    return breaktimes;
  };

  // Merge schedules and breaktimes for each day
  const getScheduleWithBreaktimes = (daySchedules) => {
    const breaktimes = getBreaktimeSlots(daySchedules);
    const combined = [...daySchedules, ...breaktimes].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    return combined;
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

  const defaultGetStatusColor = (status) => {
    const colors = {
      ACTIVE: "bg-green-50 text-green-800 border-green-400",
      CANCELLED: "bg-red-100 text-red-800 border-red-200",
      MODIFIED: "bg-yellow-100 text-yellow-800 border-yellow-200",
      COMPLETED: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const statusColorFunction = getStatusColor || defaultGetStatusColor;

  const formatTime = (time) => {
    // Convert HH:MM:SS to HH:MM
    return time?.substring(0, 5) || time;
  };

  const getClassDisplayName = (classId) => {
    const classItem = classes.find((c) => c.classId === classId);
    if (!classItem) return "";
    const displayGrade = classItem.gradeLevel === 0 || classItem.gradeLevel === "0"
      ? "មត្តេយ្យ​"
      : classItem.gradeLevel;
    return formatClassIdentifier(displayGrade, classItem.section);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Grade Level Filter Dropdown - Director Only */}
        {isDirector && uniqueLevels.length > 0 && (
          <div className="mb-6 pb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t("grade", "Grade")}
            </label>
            <Dropdown
              value={selectedGradeLevel?.toString()}
              onValueChange={(value) =>
                onGradeLevelChange && onGradeLevelChange(parseInt(value) || value)
              }
              options={getGradeLevelDropdownOptions()}
              placeholder={t("selectGrade", "Select Grade")}
              minWidth="min-w-[280px]"
            />
          </div>
        )}

        {/* Class Filter Dropdown */}
        {(!isDirector || (isDirector && selectedGradeLevel !== null && getClassDropdownOptions().length > 0)) && (
          <div className="mb-6 pb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t("class", "Class")}
            </label>
            <Dropdown
              value={selectedClass?.toString()}
              onValueChange={(value) =>
                onClassChange && onClassChange(value ? parseInt(value) : null)
              }
              options={[
                ...(isDirector ? [] : []),
                ...getClassDropdownOptions(),
              ]}
              placeholder={t("class", "Class")}
              minWidth="min-w-[280px]"
            />
          </div>
        )}

        {/* Shift Filter Dropdown */}
        <div className="mb-6 pb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            {t("selectShift", "Select Shift")}
          </label>
          <Dropdown
            value={selectedShift}
            onValueChange={(value) => onShiftChange && onShiftChange(value)}
            options={getShiftDropdownOptions()}
            placeholder={t("chooseShift", "Choose a shift...")}
            minWidth="min-w-[280px]"
          />
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Header */}
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className={`text-center font-semibold text-sm py-2 rounded-md border-2 ${
                  day === "SUNDAY"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-500 bg-white text-gray-700"
                }`}
              >
                {getDayLabel(day)}
              </div>
            ))}
          </div>

          {/* Schedule Grid */}
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const daySchedulesWithBreaktimes = getScheduleWithBreaktimes(
                schedulesByDay[day]
              );
              return (
                <div
                  key={day}
                  className={`space-y-2 min-h-[400px] p-2 rounded-b-md ${
                    day === "SUNDAY" ? "bg-red-50/30" : "bg-gray-50"
                  }`}
                >
                  {daySchedulesWithBreaktimes?.length > 0 ? (
                    daySchedulesWithBreaktimes.map((schedule) => {
                      // Render breaktime slot
                      if (schedule.isBreaktime) {
                        return (
                          <div
                            key={schedule.id}
                            className="border-1 border-orange-300 rounded-sm bg-orange-50 p-3 text-center"
                          >
                            <div className="flex items-center justify-center text-xs font-semibold text-orange-700">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{t("breaktime", "Break Time")}</span>
                            </div>
                            <div className="text-xs text-orange-600 mt-1">
                              {formatTime(schedule.startTime)} -{" "}
                              {formatTime(schedule.endTime)}
                            </div>
                          </div>
                        );
                      }

                      // Render regular schedule
                      return (
                        <Card
                          key={schedule.id}
                          className={`border rounded-sm shadow-sm ${
                            !isDirector
                              ? "hover:shadow-md transition-shadow cursor-pointer"
                              : ""
                          } ${statusColorFunction(schedule.status)}`}
                          onClick={() => !isDirector && onCardClick && onCardClick(schedule)}
                        >
                          <CardContent className="p-3 space-y-2">
                            {/* Time */}
                            <div className="flex items-center text-xs font-semibold">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>
                                {formatTime(schedule.startTime)} -{" "}
                                {formatTime(schedule.endTime)}
                              </span>
                            </div>

                            {/* Subject */}
                            <div className="text-sm font-bold text-gray-900">
                              {schedule.subject?.khmer_name ||
                                schedule.subject?.name ||
                                "Subject"}
                            </div>

                            {/* Teacher - Director Only */}
                            {isDirector && schedule.teacher && (
                              <div className="text-xs text-gray-600">
                                {t("teacher", "Teacher")}: {schedule.teacher?.firstName} {schedule.teacher?.lastName}
                              </div>
                            )}

                            {/* Location */}
                            {schedule.room && (
                              <div className="flex items-center text-xs text-gray-600">
                                <MapPin className="h-3 w-3 mr-1" />
                                <span>{schedule.room}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                      {t("noSchedule", "No schedule")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseScheduleCalendar;
