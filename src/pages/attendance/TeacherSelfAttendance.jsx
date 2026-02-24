import { useState, useEffect, useCallback } from "react";
import { Calendar, Check, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { useLoading } from "../../contexts/LoadingContext";
import { PageLoader } from "../../components/ui/DynamicLoader";
import {
  PageTransition,
  FadeInSection,
} from "../../components/ui/PageTransition";
import ErrorDisplay from "../../components/ui/ErrorDisplay";
import { useErrorHandler } from "../../hooks/useErrorHandler";
import { Button } from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Table from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import Dropdown from "../../components/ui/Dropdown";
import { attendanceService } from "../../utils/api/services/attendanceService";
import { classService } from "../../utils/api/services/classService";
import shiftService from "../../utils/api/services/shiftService";
import { canAccessTeacherFeatures } from "../../utils/routePermissions";
import { formatClassIdentifier, formatTime, formatDuration } from "../../utils/helpers";
import { formatDateKhmer } from "../../utils/formatters";
import { DatePickerWithDropdowns } from "../../components/ui/date-picker-with-dropdowns";

/**
 * TeacherSelfAttendance Component
 * Allows teachers to mark their own attendance
 */
export default function TeacherSelfAttendance() {
  const { t, setLanguage } = useLanguage();
  // Force Khmer as the base language for this page
  useEffect(() => {
    setLanguage && setLanguage("km");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only set language once on mount

  const { showSuccess, showError } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError, retry } = useErrorHandler();

  const [monthlyAttendance, setMonthlyAttendance] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Class selection state
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);

  // Modal state for class/shift selection
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedShiftForSubmit, setSelectedShiftForSubmit] =
    useState(null);
  const [selectedClassForSubmit, setSelectedClassForSubmit] = useState(null);
  const [reasonInput, setReasonInput] = useState("");

  // Date filter for attendance history
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Real-time clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get authenticated user data
  const [user] = useState(() => {
    try {
      const userData = localStorage.getItem("user");
      return userData ? JSON.parse(userData) : null;
    } catch (err) {
      console.error("Error parsing user data:", err);
      return null;
    }
  });

  const userId = user?.teacherId || user?.id;
  const userLoginId = user?.id; // Use actual user ID for attendance marking
  const isTeacher = canAccessTeacherFeatures(user);

  // Fetch teacher's classes from teacherService
  const fetchTeacherClassesFromAPI = useCallback(async () => {
    if (!userId) return;

    try {
      setLoadingClasses(true);
      console.log("🔍 Fetching teacher classes for userId:", userId);
      const response = await classService.getTeacherClasses(userId);

      console.log("📋 Teacher classes response from classService:", {
        success: response.success,
        dataLength: response.data?.length,
        classesLength: response.classes?.length,
        fullResponse: response,
      });

      // Use the already formatted classes from classService
      // classService.getTeacherClasses returns { success, data: [], classes: [] }
      let teacherClasses = [];

      if (response.success) {
        // Prefer the 'data' property (formatted classes), fallback to 'classes'
        teacherClasses = response.data || response.classes || [];
      }

      console.log("📚 Processed teacher classes:", teacherClasses);

      if (teacherClasses.length > 0) {
        console.log("✅ Fetched teacher classes from API:", teacherClasses);
        setClasses(teacherClasses);
        // Store in localStorage for next time
        localStorage.setItem("teacherClasses", JSON.stringify(teacherClasses));

        // Auto-select first class if available
        const firstClass = teacherClasses[0];
        const firstClassId = firstClass.classId || firstClass.id;
        setSelectedClassId(firstClassId);
        localStorage.setItem("currentClassId", String(firstClassId));
        console.log("✅ Auto-selected first class:", firstClassId);
      } else {
        console.warn("⚠️ No classes found for teacher:", userId);
        setClasses([]);
        // Clear localStorage if no classes
        localStorage.removeItem("teacherClasses");
        localStorage.removeItem("currentClassId");
      }
    } catch (err) {
      console.error(
        "❌ Error fetching teacher classes from classService:",
        err,
      );
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  }, [userId, t]);

  // Load teacher's classes from localStorage (already fetched during login)
  useEffect(() => {
    if (!userId || !isTeacher) return;

    try {
      // Get classes from localStorage (set during login for roleId = 8)
      const storedClasses = localStorage.getItem("teacherClasses");
      const storedClassId = localStorage.getItem("currentClassId");

      if (storedClasses) {
        const parsedClasses = JSON.parse(storedClasses);
        setClasses(parsedClasses);
        console.log(
          "📚 Loaded",
          parsedClasses.length,
          "classes from localStorage",
        );

        // Use stored class ID or default to first class
        if (
          storedClassId &&
          parsedClasses.find(
            (c) => String(c.classId || c.id) === String(storedClassId),
          )
        ) {
          setSelectedClassId(Number(storedClassId));
          console.log("✅ Using stored class ID:", storedClassId);
        } else if (parsedClasses.length > 0) {
          const firstClassId = parsedClasses[0].classId || parsedClasses[0].id;
          setSelectedClassId(firstClassId);
          localStorage.setItem("currentClassId", String(firstClassId));
          console.log("✅ Using first class as default:", firstClassId);
        }
      } else {
        console.warn(
          "⚠️ No classes found in localStorage, fetching from API...",
        );
        // Fallback: fetch from API if not in localStorage
        fetchTeacherClassesFromAPI();
      }
    } catch (err) {
      console.error("Error loading classes from localStorage:", err);
      fetchTeacherClassesFromAPI();
    }
  }, [userId, isTeacher, fetchTeacherClassesFromAPI]);

  // Fetch shifts from API
  const fetchShifts = useCallback(async () => {
    try {
      setLoadingShifts(true);
      const response = await shiftService.getShifts();
      if (response.success && response.data) {
        setShifts(response.data);
      }
    } catch (err) {
      console.error("Error fetching shifts:", err);
    } finally {
      setLoadingShifts(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Helper function to get date string in YYYY-MM-DD format without timezone conversion
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Fetch attendance for the selected date
  const fetchMonthlyAttendance = useCallback(async () => {
    if (!userLoginId) return;

    clearError();

    try {
      const dateStr = getLocalDateString(selectedDate);
      const response = await attendanceService.getAttendance({
        userId: userLoginId,
        date: dateStr,
        limit: 50,
      });

      const dateData = {};
      if (response.success && response.data) {
        const records = Array.isArray(response.data)
          ? response.data
          : response.data.records || [];

        records.forEach((record) => {
          const recordClassId = record.classId;
          const shiftId = record.shiftId || "UNKNOWN";

          const classIdKey = recordClassId || "null";
          const key = `${classIdKey}_${shiftId}`;
          dateData[key] = {
            status: record.status?.toUpperCase() || "PRESENT",
            time: record.createdAt
              ? formatTime(record.createdAt)
              : null,
            id: record.id,
            createdAt: record.createdAt,
            reason: record.reason || "",
            shiftId,
            shift: record.shift || null,
            classId: recordClassId,
            classInfo: record.class || null,
            checkInTime: record.checkInTime || null,
            checkOutTime: record.checkOutTime || null,
            hoursWorked:
              record.hoursWorked !== undefined ? record.hoursWorked : null,
            isCheckedOut: record.isCheckedOut === true,
          };
        });
      }

      setMonthlyAttendance((prev) => ({ ...prev, [dateStr]: dateData }));
    } catch (err) {
      console.error("Error fetching attendance:", err);
      handleError(err, {
        toastMessage: t(
          "errorFetchingAttendance",
          "Error fetching attendance data",
        ),
      });
    } finally {
      setInitialLoading(false);
    }
  }, [userLoginId, selectedDate, t, handleError, clearError]);

  // Fetch today's attendance on mount
  useEffect(() => {
    if (userLoginId) {
      fetchMonthlyAttendance();
    }
  }, [userLoginId, fetchMonthlyAttendance]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer); // Cleanup on unmount
  }, []);

  // Check if date is today
  const isDateToday = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);
    return today.getTime() === checkDate.getTime();
  };

  // Mark attendance for today with specific class
  const markAttendance = async (
    status,
    shiftId = null,
    classId = null,
    userReason = "",
  ) => {
    if (!userLoginId) return; // Use userLoginId for attendance marking

    // Use provided classId or fall back to selectedClassId
    const targetClassId = classId || selectedClassId;

    // Validate class for teachers who have classes assigned
    if (isTeacher && classes.length > 0 && !targetClassId) {
      showError(t("pleaseSelectClass", "សូមជ្រើសរើសថ្នាក់រៀន"));
      return;
    }

    // Validate that we're only marking attendance for today
    const today = getLocalDateString();
    if (!isDateToday(today)) {
      showError(
        t(
          "canOnlyMarkTodayAttendance",
          "អ្នកអាចបញ្ជូនវត្តមានតែថ្ងៃនេះប៉ុណ្ណោះ",
        ),
      );
      return;
    }

    // Check if attendance already submitted for this shift and class
    const todayAttendanceData = monthlyAttendance[today];
    const attendanceKey = `${targetClassId}_${shiftId}`;
    if (todayAttendanceData && todayAttendanceData[attendanceKey]) {
      showError(t("alreadySubmittedForClass", "អ្នកបានបញ្ជូនវត្តមានសម្រាប់វេននេះរួចហើយ"));
      return;
    }

    try {
      setSubmitting(true);
      startLoading(
        "markAttendance",
        t("submittingAttendance", "Submitting attendance..."),
      );

      // Double-check the date before sending to API
      const requestDate = getLocalDateString();
      if (!isDateToday(requestDate)) {
        showError(
          t(
            "canOnlyMarkTodayAttendance",
            "អ្នកអាចបញ្ជូនវត្តមានតែថ្ងៃនេះប៉ុណ្ណោះ",
          ),
        );
        setSubmitting(false);
        stopLoading("markAttendance");
        return;
      }

      // Auto-determine status based on submission time and shift
      let finalStatus = status;
      if (status === "PRESENT" || status === "LATE") {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();

        const selectedShiftObj = shifts.find(s => s.id === shiftId);
        if (selectedShiftObj && selectedShiftObj.startTime) {
          const [startHour, startMin] = selectedShiftObj.startTime.split(':').map(Number);
          if (currentHour > startHour || (currentHour === startHour && currentMinutes > startMin)) {
            finalStatus = "LATE";
          } else {
            finalStatus = "PRESENT";
          }
        }
      }

      // Build attendance payload with check-in timestamp (except for LEAVE status)
      const attendancePayload = {
        userId: userLoginId,
        date: requestDate,
        status: finalStatus,
        reason: userReason.trim(),
        classId: targetClassId || null,
        shiftId: shiftId || null,
      };

      // Only add checkInTime if status is not LEAVE
      if (finalStatus !== "LEAVE") {
        attendancePayload.checkInTime = new Date().toISOString();
      }

      console.log("✅ Attendance payload:", attendancePayload);

      const attendanceResponse =
        await attendanceService.createAttendance(attendancePayload);

      showSuccess(
        t("attendanceMarkedSuccess", "វត្តមានត្រូវបានបញ្ជូនដោយជោគជ័យ"),
      );

      // If attendance requires approval, notify director
      if (attendanceResponse?.approvalStatus === "PENDING") {
        // This will be handled by the NotificationContext polling
        showSuccess(
          t(
            "awaitingApproval",
            "Your attendance is awaiting director approval",
          ),
        );
      }

      fetchMonthlyAttendance();
    } catch (error) {
      console.error("Error marking attendance:", error);

      // Check if error is related to date validation
      const errorMessage =
        error?.response?.data?.message || error?.message || "";
      if (
        errorMessage.includes("date") ||
        errorMessage.includes("past") ||
        errorMessage.includes("future")
      ) {
        showError(
          t(
            "canOnlyMarkTodayAttendance",
            "អ្នកអាចបញ្ជូនវត្តមានតែថ្ងៃនេះប៉ុណ្ណោះ",
          ),
        );
      } else {
        showError(t("failedToMarkAttendance", "បរាជ័យក្នុងការបញ្ជូនវត្តមាន"));
      }
    } finally {
      setSubmitting(false);
      stopLoading("markAttendance");
    }
  };

  // Check-out function for existing attendance
  const checkOutAttendance = async (
    attendanceId,
    classId = null,
    shiftId = null,
  ) => {
    if (!userLoginId || !attendanceId) return; // Use userLoginId for attendance operations

    try {
      setSubmitting(true);
      startLoading(
        "checkOutAttendance",
        t("checkingOut", "កំពុងចុះវត្តមាន..."),
      );

      // Build check-out payload with current timestamp
      const checkOutPayload = {
        checkOutTime: new Date().toISOString(),
      };

      console.log("✅ Check-out payload:", {
        attendanceId,
        ...checkOutPayload,
      });

      const response = await attendanceService.updateAttendance(
        attendanceId,
        checkOutPayload,
      );

      if (response) {
        showSuccess(t("checkOutSuccess", "ចុះវត្តមានដោយជោគជ័យ"));

        // Update local state immediately
        const today = getLocalDateString();
        const targetClassId = classId || selectedClassId;
        const key = `${targetClassId}_${shiftId}`;
        const checkOutTimeStamp = new Date().toISOString();

        console.log("✅ Checkout response:", response);
        console.log("✅ Updating state for key:", key, "on date:", today);

        // Update monthlyAttendance state immediately for instant UI update
        setMonthlyAttendance((prev) => {
          if (!prev[today] || !prev[today][key]) {
            console.log("⚠️ Cannot find attendance record to update:", {
              today,
              key,
              hasToday: !!prev[today],
            });
            return prev;
          }

          const updated = {
            ...prev,
            [today]: {
              ...prev[today],
              [key]: {
                ...prev[today][key],
                checkOutTime: checkOutTimeStamp,
                isCheckedOut: true,
                hoursWorked:
                  response.hoursWorked ||
                  response.data?.hoursWorked ||
                  prev[today][key].hoursWorked,
              },
            },
          };

          console.log("✅ Updated monthlyAttendance:", updated[today][key]);
          return updated;
        });

        console.log(
          "✅ Updated local state after checkout, refreshing data...",
        );

        // Refresh attendance data to get server values
        fetchMonthlyAttendance();
      } else {
        showError(t("checkOutFailed", "បរាជ័យក្នុងការចុះវត្តមាន"));
      }
    } catch (error) {
      console.error("Error checking out:", error);
      showError(t("checkOutFailed", "បរាជ័យក្នុងការចុះវត្តមាន"));
    } finally {
      setSubmitting(false);
      stopLoading("checkOutAttendance");
    }
  };

  // Check if user is teacher, director, or restricted roles (roleId = 8 for teacher, roleId = 14 for director, roleId 15-21 for restricted roles)
  const isDirector = user?.roleId === 14;
  const isRestrictedRole = user?.roleId >= 15 && user?.roleId <= 21;
  const isTeacherOrDirector = isTeacher || isDirector || isRestrictedRole;

  // Helper function to translate attendance status to Khmer
  const getStatusInKhmer = (status) => {
    const statusMap = {
      PRESENT: t("present", "វត្តមាន"),
      ABSENT: t("absent", "អវត្តមាន"),
      LATE: t("late", "យឺត"),
      LEAVE: t("leave", "ច្បាប់"),
    };
    return statusMap[status?.toUpperCase()] || status;
  };

  // Helper function to get badge color for attendance status
  const getStatusBadgeColor = (status) => {
    switch (status?.toUpperCase()) {
      case "PRESENT":
        return "green";
      case "LATE":
        return "orange";
      case "LEAVE":
        return "purple";
      default:
        return "gray";
    }
  };

  if (!isTeacherOrDirector) {
    return (
      <div className="p-4">
        <ErrorDisplay
          error={{
            message: t(
              "accessDenied",
              "Access denied. This page is only accessible by teachers and directors.",
            ),
          }}
          onRetry={() => window.history.back()}
          retryText={t("goBack", "Go Back")}
        />
      </div>
    );
  }

  // Initial loading state
  if (initialLoading || loadingClasses || loadingShifts) {
    return (
      <PageLoader
        message={t("loadingAttendance", "Loading attendance...")}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => retry(fetchMonthlyAttendance)}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  const todayStr = getLocalDateString();
  const displayDateStr = getLocalDateString(selectedDate);
  const isViewingToday = displayDateStr === todayStr;
  const isViewingFuture = displayDateStr > todayStr;
  const todayAttendanceData = monthlyAttendance[todayStr] || {};
  const displayAttendanceData = monthlyAttendance[displayDateStr] || {};

  const goToPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const goToNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const now = new Date();
  const currentHour = now.getHours();
  // Helper function to determine if current time is late for a shift
  const isLateForShift = (shiftId) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift || !shift.startTime) return false;

    const [startHour, startMin] = shift.startTime.split(':').map(Number);
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    return currentH > startHour || (currentH === startHour && currentM > startMin);
  };

  // Get current time display with real-time seconds
  const getCurrentTimeDisplay = () => {
    return currentTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  // Open submit modal
  const openSubmitModal = () => {
    console.log("🔓 Opening submit modal with current state:", {
      classes: classes,
      classesLength: classes.length,
      selectedClassId,
      currentHour,
    });

    fetchTeacherClassesFromAPI().then(() => {
      // Auto-detect current shift based on time
      let autoShiftId = null;
      if (shifts && shifts.length > 0) {
        const now = new Date();
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        const activeShift = shifts.find(s => {
          if (!s.endTime) return false;
          const [endH, endM] = s.endTime.split(':').map(Number);
          return currentH < endH || (currentH === endH && currentM <= endM);
        });
        autoShiftId = activeShift ? activeShift.id : shifts[0].id;
      }
      setSelectedShiftForSubmit(autoShiftId);

      // Auto-select first class from teacher's classes
      if (classes.length > 0) {
        const firstClass = classes[0];
        const firstClassId = firstClass.classId || firstClass.id;
        setSelectedClassForSubmit(firstClassId);
        console.log("✅ Auto-selected class for modal:", {
          firstClass,
          firstClassId,
          className: firstClass.name,
        });
      } else {
        console.warn("⚠️ No classes available for teacher to select");
        setSelectedClassForSubmit(null);
      }

      setShowSubmitModal(true);
    });
  };

  // Handle submit from modal
  const handleSubmitFromModal = async (status = "PRESENT") => {
    // Validate shift is selected
    if (!selectedShiftForSubmit) {
      showError(t("pleaseSelectShift", "សូមជ្រើសរើសវេន"));
      return;
    }

    // Validate class for teachers with classes only
    if (isTeacher && classes.length > 0 && !selectedClassForSubmit) {
      showError(t("pleaseSelectClass", "សូមជ្រើសរើសថ្នាក់រៀន"));
      return;
    }

    await markAttendance(
      status,
      selectedShiftForSubmit,
      selectedClassForSubmit,
      reasonInput,
    );
    setShowSubmitModal(false);
    setReasonInput(""); // Clear reason after submit
  };

  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="p-4 sm:p-6">
        {/* Header - Full Width */}
        <FadeInSection className="mb-4 mx-2">
          <div className="flex flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-lg sm:text-xl font-semibold text-gray-900">
                {t("myAttendance") || "វត្តមានរបស់ខ្ញុំ"}
              </h4>
              <p className="text-sm text-gray-600">
                {t(
                  "teacherAttendanceSubtitle",
                  "កត់ត្រាវត្តមានរបស់លោកគ្រូ/អ្នកគ្រូ",
                )}
              </p>
            </div>
          </div>
        </FadeInSection>

        {/* Layout */}
        <FadeInSection className="mx-auto grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Quick Submit Section */}
            <>
              {/* Current Time Display */}
              <div className="rounded-sm border bg-white border-gray-200 px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                  {/* Digital Clock - Left */}
                  <div className="flex flex-col gap-4 py-2">
                    <p className="text-sm font-bold text-gray-700 uppercase">
                      {t("currentTime", "ពេលវេលាបច្ចុប្បន្ន")}
                    </p>

                    {/* Time + AM/PM */}
                    <div className="flex items-end gap-2">
                      <span className="text-6xl font-light tabular-nums text-gray-900 leading-none tracking-tight">
                        {currentTime.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </span>
                      <span className="text-sm text-gray-700 mb-1">
                        {currentTime.getHours() < 12 ? "AM" : "PM"}
                      </span>
                    </div>

                    {/* Seconds progress bar */}
                    <div className="w-full h-px bg-gray-100 relative overflow-hidden rounded-full">
                      <div
                        className="absolute top-0 left-0 h-full bg-gray-400 transition-all duration-1000 ease-linear"
                        style={{
                          width: `${(currentTime.getSeconds() / 60) * 100}%`,
                        }}
                      />
                    </div>

                    {/* Date */}
                    <p className="text-xs text-gray-700 font-bold">
                      {formatDateKhmer(currentTime, "full")}
                    </p>

                    {/* Actions — hidden when viewing a future date */}
                    {!isViewingFuture && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Button
                          onClick={openSubmitModal}
                          disabled={submitting}
                          size="sm"
                          className="w-full h-full"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          {t("checkIn", "ចូលវត្តមាន")}
                        </Button>

                        {/* Only show check-out if there are active attendances hasn't checked out */}
                        {Object.entries(displayAttendanceData).filter(([_, att]) => !att.isCheckedOut && att.status !== "LEAVE").length > 0 && (
                          <div className="flex flex-col justify-center gap-2">
                            <div className="flex flex-col gap-2">
                              {Object.entries(displayAttendanceData)
                                .map(([key, attendance]) => {
                                  const parts = key.split("_");
                                  const classIdStr = parts[0];
                                  const shiftIdStr = parts.slice(1).join('_');
                                  const shiftId = shiftIdStr === "UNKNOWN" ? null : Number(shiftIdStr) || shiftIdStr;
                                  const classId = classIdStr === "null" ? null : Number(classIdStr);

                                  let shiftName = attendance.shift?.name;
                                  if (!shiftName && shiftId) {
                                    const foundShift = shifts.find(s => s.id == shiftId);
                                    if (foundShift) shiftName = foundShift.name;
                                  }

                                  return { key, shiftId, classId, attendance, shiftName: shiftName || t("unknownShift", "មិនស្គាល់វេន") };
                                })
                                .filter(row => !row.attendance.isCheckedOut && row.attendance.status !== "LEAVE")
                                .map((row) => (
                                  <Button
                                    key={row.key}
                                    onClick={() => checkOutAttendance(row.attendance.id, row.classId, row.shiftId)}
                                    disabled={submitting}
                                    title={`Check out for ${row.shiftName}`}
                                    size="sm"
                                    variant="warning"
                                    className="w-full h-full min-h-[36px]"
                                  >
                                    <span className="relative z-10 flex items-center gap-1.5 transition-transform duration-300 group-hover:-translate-x-0.5 truncate max-w-full">
                                      <LogOut className="h-3 w-3 flex-shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-800" />
                                      <span className="truncate">{row.shiftName} - {t("checkOut", "ចេញ")}</span>
                                    </span>
                                    <div className="absolute inset-0 z-0 bg-amber-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                  </Button>
                                ))
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Shift Status - Right */}
                  <div className="flex flex-col gap-1 py-2 sm:pl-6">
                    <p className="text-sm font-bold text-gray-700 uppercase mb-3">
                      {t("shift", "ស្ថានភាពវេន")}
                    </p>
                    {shifts.map((shift) => {
                      const isLate = isLateForShift(shift.id);
                      const onTime = !isLate;

                      let [h, m] = shift.startTime ? shift.startTime.split(':') : ['00', '00'];
                      const ampm = parseInt(h) >= 12 ? 'PM' : 'AM';
                      const h12 = parseInt(h) % 12 || 12;
                      const cutoff = `${h12}:${m} ${ampm}`;

                      return (
                        <div
                          key={shift.id}
                          className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${onTime ? "bg-green-500" : "bg-orange-400"}`}
                            />
                            <div>
                              <p className="text-sm text-gray-700">{shift.name}</p>
                              <p className="text-xs text-gray-400">
                                {onTime ? "មុន" : "ក្រោយ"} {cutoff}
                              </p>
                            </div>
                          </div>
                          <Badge
                            color={onTime ? "green" : "orange"}
                            variant="filled"
                            size="xs"
                          >
                            {onTime ? t("onTime", "ទាន់ម៉ោង") : t("late", "យឺត")}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Attendance History Table */}
              <div className="bg-white rounded-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 py-5 sm:px-5 sm:py-4 border-b border-gray-100 gap-2">
                  <div className="mb-1 sm:mb-0">
                    <p className="text-sm font-bold text-gray-900">
                      {isViewingToday
                        ? t("todayStatus", "ការចុះវត្តមានថ្ងៃនេះ")
                        : t("attendanceHistory", "ប្រវត្តិការចុះវត្តមាន")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 w-full sm:w-auto">
                    {!isViewingToday && (
                      <button
                        onClick={() => setSelectedDate(new Date())}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium mr-1 shrink-0"
                      >
                        {t("backToToday", "ថ្ងៃនេះ")}
                      </button>
                    )}
                    <button
                      onClick={goToPrevDay}
                      className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors shrink-0"
                      title={t("previousDay", "ថ្ងៃមុន")}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <DatePickerWithDropdowns
                      value={selectedDate}
                      onChange={(date) => date && setSelectedDate(date)}
                      fromYear={2020}
                      toYear={new Date().getFullYear() + 1}
                      className="h-8 text-xs flex-1 sm:flex-none sm:w-auto"
                    />
                    <button
                      onClick={goToNextDay}
                      className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors shrink-0"
                      title={t("nextDay", "ថ្ងៃបន្ទាប់")}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table
                    enableSort={false}
                    className="min-w-[520px] sm:min-w-0 md:min-w-[800px] whitespace-nowrap"
                    emptyMessage={t(
                      "noCheckInsToday",
                      "មិនទាន់មានការចូលវត្តមានថ្ងៃនេះ",
                    )}
                    data={Object.entries(displayAttendanceData).map(
                      ([key, attendance]) => {
                        const parts = key.split("_");
                        const classIdStr = parts[0];
                        const shiftIdStr = parts.slice(1).join('_');
                        const classId =
                          classIdStr === "null" ? null : Number(classIdStr);
                        // Prefer class info from API response, fall back to classes state
                        const cls =
                          attendance.classInfo ||
                          (classId
                            ? classes.find(
                              (c) => (c.classId || c.id) === classId,
                            )
                            : null);
                        return { key, shiftId: shiftIdStr === "UNKNOWN" ? null : Number(shiftIdStr) || shiftIdStr, classId, attendance, cls };
                      },
                    )}
                    columns={[
                      {
                        key: "class",
                        header: t("typeOfAttendance", "ប្រភេទការចុះវត្តមាន"),
                        render: (row) => {
                          const name = row.cls
                            ? row.cls.gradeLevel != null
                              ? formatClassIdentifier(
                                row.cls.gradeLevel,
                                row.cls.section,
                                t,
                              )
                              : row.cls.name ||
                              `${t("class", "ថ្នាក់")} ${row.classId}`
                            : row.classId
                              ? `${t("class", "ថ្នាក់")} ${row.classId}`
                              : t("personalAttendance", "វត្តមានផ្ទាល់ខ្លួន");
                          return (
                            <p className="font-medium text-gray-900">{name}</p>
                          );
                        },
                      },
                      {
                        key: "shift",
                        header: t("shift", "វេន"),
                        render: (row) => {
                          let shiftName = row.attendance.shift?.name;
                          if (!shiftName && row.shiftId) {
                            // Use == instead of === since row.shiftId might be a string from the dictionary key split
                            const foundShift = shifts.find(s => s.id == row.shiftId);
                            if (foundShift) shiftName = foundShift.name;
                          }
                          shiftName = shiftName || t("unknownShift", "មិនស្គាល់វេន");
                          return (
                            <p className="font-medium text-gray-700">{shiftName}</p>
                          );
                        },
                      },
                      {
                        key: "status",
                        header: t("status", "ស្ថានភាព"),
                        render: (row) => (
                          <Badge
                            color={getStatusBadgeColor(row.attendance.status)}
                            variant="filled"
                            size="xs"
                          >
                            {getStatusInKhmer(row.attendance.status)}
                          </Badge>
                        ),
                      },
                      {
                        key: "checkIn",
                        header: t("checkIn", "ចូល"),
                        render: (row) => {
                          const time = row.attendance.checkInTime
                            ? formatTime(row.attendance.checkInTime)
                            : row.attendance.time;
                          return row.attendance.status === "LEAVE" ? (
                            <span className="text-purple-600 font-medium">
                              {time}
                            </span>
                          ) : (
                            <span className="text-green-600 font-medium">
                              {time || "-"}
                            </span>
                          );
                        },
                      },
                      {
                        key: "checkOut",
                        header: t("checkOut", "ចេញ"),
                        render: (row) => {
                          if (row.attendance.status === "LEAVE")
                            return <span className="text-gray-400">-</span>;
                          if (row.attendance.isCheckedOut === true) {
                            const time = row.attendance.checkOutTime
                              ? formatTime(row.attendance.checkOutTime)
                              : null;
                            return (
                              <span className="text-blue-600 font-medium">
                                {time || t("completed", "បានបញ្ចប់")}
                              </span>
                            );
                          }
                          if (!isViewingToday)
                            return <span className="text-gray-400">-</span>;
                          return (
                            <span className="text-orange-500 font-medium text-sm">
                              {t("pending", "រង់ចាំ")}
                            </span>
                          );
                        },
                      },
                      {
                        key: "hours",
                        header: t("hoursWorked", "ម៉ោងធ្វើការ"),
                        render: (row) => {
                          const h = row.attendance.hoursWorked;
                          if (h !== null && h !== undefined) {
                            return (
                              <span className="text-indigo-600 font-semibold">
                                {formatDuration(h, t)}
                              </span>
                            );
                          }
                          return <span className="text-gray-400">-</span>;
                        },
                      },
                    ]}
                  />
                </div>
              </div>
            </>
          </div>
        </FadeInSection>

        {/* Submit Attendance Modal */}
        <Modal
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          title={t("submitAttendance", "បញ្ជូនវត្តមាន")}
          size="xl"
          className="!w-[90vw] sm:!w-[700px]"
          footer={(() => {
            const classAlreadySubmitted = !!(
              selectedClassForSubmit &&
              todayAttendanceData[
              `${selectedClassForSubmit}_${selectedShiftForSubmit}`
              ]
            );
            const submitDisabled =
              submitting ||
              (isTeacher && classes.length > 0 && !selectedClassForSubmit) ||
              classAlreadySubmitted;
            return (
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <Button
                  onClick={() => handleSubmitFromModal("LEAVE")}
                  disabled={submitDisabled}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {t("leave", "ច្បាប់")}
                </Button>
                <Button
                  onClick={() => handleSubmitFromModal("PRESENT")}
                  disabled={submitDisabled}
                  className={`w-full sm:w-auto ${isLateForShift(selectedShiftForSubmit)
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-green-600 hover:bg-green-700"
                    }`}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {t("submit", "បញ្ជូន")}
                </Button>
              </div>
            );
          })()}
          stickyFooter={true}
        >
          {/* Class Selection - Only for Teachers (roleId = 8) */}
          {isTeacher && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("selectClass", "ជ្រើសរើសថ្នាក់")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <Dropdown
                value={selectedClassForSubmit?.toString() || ""}
                onValueChange={(value) => {
                  console.log("🎯 Class selected in modal:", value);
                  setSelectedClassForSubmit(Number(value));
                }}
                options={classes.map((cls) => {
                  const classId = cls.classId || cls.id;
                  const className =
                    cls.gradeLevel != null
                      ? formatClassIdentifier(cls.gradeLevel, cls.section, t)
                      : cls.name || `${t("class", "ថ្នាក់")} ${classId}`;
                  const alreadySubmitted =
                    !!todayAttendanceData[
                    `${classId}_${selectedShiftForSubmit}`
                    ];
                  return {
                    value: classId.toString(),
                    label: alreadySubmitted
                      ? `${className} (${t("alreadySubmitted", "បានបញ្ជូនរួចហើយ")})`
                      : className,
                    disabled: alreadySubmitted,
                  };
                })}
                placeholder={
                  classes.length === 0
                    ? t("noClassesAvailable", "No classes available")
                    : t("selectClass", "ជ្រើសរើសថ្នាក់")
                }
                width="w-full"
                disabled={classes.length === 0}
              />
              {classes.length === 0 && (
                <p className="text-sm text-red-600 mt-2">
                  {t(
                    "noClassesAssigned",
                    "No classes assigned to you. Please contact administrator.",
                  )}
                </p>
              )}
            </div>
          )}

          {/* Shift Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("selectShift", "ជ្រើសរើសវេន")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="grid sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-3">
              {shifts.map((shift) => {
                const isLate = isLateForShift(shift.id);
                const onTime = !isLate;

                let [h, m] = shift.startTime ? shift.startTime.split(':') : ['00', '00'];
                const ampm = parseInt(h) >= 12 ? 'PM' : 'AM';
                const h12 = parseInt(h) % 12 || 12;
                const cutoff = `${h12}:${m} ${ampm}`;

                return (
                  <button
                    key={shift.id}
                    onClick={() => setSelectedShiftForSubmit(shift.id)}
                    className={`p-3 rounded-sm border-2 transition-all ${selectedShiftForSubmit === shift.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                  >
                    <p className="text-sm text-gray-900">
                      {shift.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {onTime ? "មុន" : "ក្រោយ"} {cutoff}
                    </p>
                    <Badge
                      color={onTime ? "green" : "orange"}
                      variant="filled"
                      size="sm"
                      className="mt-2"
                    >
                      {onTime
                        ? t("onTime", "ទាន់ម៉ោង")
                        : t("late", "យឺត")}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Warning */}
          <div
            className={`p-3 rounded-sm mb-4 ${isLateForShift(selectedShiftForSubmit)
              ? "bg-orange-50 border border-orange-200"
              : "bg-green-50 border border-green-200"
              }`}
          >
            <p className="text-sm font-medium">
              {isLateForShift(selectedShiftForSubmit)
                ? t("willBeMarkedLate", "ប្រព័ន្ធនឹងកត់ត្រាថាអ្នកចុះវត្តមានយឺត")
                : t(
                  "willBeMarkedPresent",
                  "ប្រព័ន្ធនឹងកត់ត្រាថាអ្នកចុះវត្តមានទាន់",
                )}
            </p>
          </div>

          {/* Reason Input (Optional) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("reason", "មូលហេតុ")}{" "}
              <span className="text-gray-400 text-xs">
                ({t("optional", "ជម្រើស")})
              </span>
            </label>
            <textarea
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder={t(
                "enterReasonPlaceholder",
                "បញ្ចូលមូលហេតុ (ប្រសិនបើមាន)...",
              )}
              rows={3}
              className="block w-full rounded-sm border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
