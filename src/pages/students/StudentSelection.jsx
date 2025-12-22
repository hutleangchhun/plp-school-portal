import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, User, X, ArrowLeft, Search } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import studentService from "../../utils/api/services/studentService";
import classService from "../../utils/api/services/classService";
import { userService } from "../../utils/api/services/userService";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import {
  useStableCallback,
  useRenderTracker,
} from "../../utils/reactOptimization";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Pagination as UIPagination } from "../../components/ui/Table";
import {
  PageTransition,
  FadeInSection,
} from "../../components/ui/PageTransition";
import SelectedStudentsManager from "../../components/students/SelectedStudentsManager";
import { DatePickerWithDropdowns } from "../../components/ui/date-picker-with-dropdowns";
import Dropdown from "../../components/ui/Dropdown";
import DynamicLoader from "../../components/ui/DynamicLoader";
import { formatDateKhmer } from "../../utils/formatters";
import SidebarFilter from "../../components/ui/SidebarFilter";
import {
  formatClassIdentifier,
  getGradeLevelOptions as getSharedGradeLevelOptions,
} from "../../utils/helpers";
import { getFullName } from "../../utils/usernameUtils";

const StudentSelection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showError } = useToast();

  // Track renders to detect infinite loops (development only)
  useRenderTracker("StudentSelection");

  // Get authenticated user data
  const [user, setUser] = useState(() => {
    try {
      const userData = localStorage.getItem("user");
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  });

  // Listen for localStorage changes (e.g., after login updates user data)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          console.log(
            "🔄 localStorage changed in StudentSelection, updating user state:",
            parsedUser
          );
          setUser(parsedUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Error parsing updated user data:", err);
      }
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener("storage", handleStorageChange);

    // Also set up a custom event listener for same-tab updates
    window.addEventListener("userDataUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userDataUpdated", handleStorageChange);
    };
  }, []);

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);

  // Using fresh state for student selection (no localStorage persistence)

  // Override: Always start with empty selection for StudentSelection
  const [freshSelectedStudents, setFreshSelectedStudents] = useState([]);
  const [freshSelectedStudentsData, setFreshSelectedStudentsData] = useState(
    {}
  );

  // Custom handlers that don't persist to localStorage
  const freshHandleSelectStudent = useCallback((student) => {
    const studentId = student.id;
    setFreshSelectedStudents((prev) => {
      if (prev.includes(studentId)) {
        setFreshSelectedStudentsData((prevData) => {
          const newData = { ...prevData };
          delete newData[studentId];
          return newData;
        });
        return prev.filter((id) => id !== studentId);
      } else {
        setFreshSelectedStudentsData((prevData) => ({
          ...prevData,
          [studentId]: student,
        }));
        return [...prev, studentId];
      }
    });
  }, []);

  const freshRemoveStudent = useCallback((studentId) => {
    setFreshSelectedStudents((prev) => prev.filter((id) => id !== studentId));
    setFreshSelectedStudentsData((prevData) => {
      const newData = { ...prevData };
      delete newData[studentId];
      return newData;
    });
  }, []);

  const freshClearAll = useCallback(() => {
    setFreshSelectedStudents([]);
    setFreshSelectedStudentsData({});
  }, []);

  const freshIsSelected = useCallback(
    (studentId) => {
      return freshSelectedStudents.includes(studentId);
    },
    [freshSelectedStudents]
  );

  // Use fresh state instead of persisted state
  const actualSelectedStudents = freshSelectedStudents;
  const actualSelectedStudentsData = freshSelectedStudentsData;
  const actualHandleSelectStudent = freshHandleSelectStudent;
  const actualRemoveStudent = freshRemoveStudent;
  const actualClearAll = freshClearAll;
  const actualIsSelected = freshIsSelected;

  const [schoolId, setSchoolId] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [classesLoaded, setClassesLoaded] = useState(false); // Track when classes fetch completes
  const [fetchError, setFetchError] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const fetchingRef = useRef(false); // Prevent duplicate fetches
  const fetchingClassesRef = useRef(false); // Prevent duplicate class fetches
  const initialFetchDoneRef = useRef(false); // Track if initial fetch completed
  const [filters, setFilters] = useState({
    search: "",
    academicYear: "",
    gender: "",
    dateOfBirth: null, // Date object for DatePicker
    gradeLevel: "",
    classId: "any", // Filter by class assignment: 'any', 'null', or specific class ID
  });
  const [showSelectedStudentsSidebar, setShowSelectedStudentsSidebar] =
    useState(false);
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);

  // Clear any persisted selected students on component mount (fresh session)
  useEffect(() => {
    localStorage.removeItem("selectedStudents");
    localStorage.removeItem("selectedStudentsData");
  }, []); // Empty dependency array = runs once on mount

  // Debounce the search input so typing doesn't trigger immediate refetch and lose focus
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(filters.search), 400);
    return () => clearTimeout(id);
  }, [filters.search]);

  // Initialize classes and school ID using CLASS_BY_SCHOOL API (single consolidated fetch)
  useEffect(() => {
    const fetchClassDetailsAndSchoolId = async () => {
      if (!user?.id) {
        console.log("No user ID available for fetching classes");
        setClasses([]);
        setClassesLoaded(true);
        return;
      }

      // Prevent duplicate fetches - check both in-progress and completed
      if (fetchingClassesRef.current || initialFetchDoneRef.current) {
        console.log(
          "Classes fetch already in progress or completed, skipping..."
        );
        return;
      }

      fetchingClassesRef.current = true;

      try {
        console.log("Fetching school ID and classes (consolidated fetch)...");

        // Get school ID from my-account endpoint (ONLY ONCE HERE)
        const accountData = await userService.getMyAccount();
        if (!accountData || !accountData.school_id) {
          console.error("No school_id found in account data:", accountData);
          showError(
            t("noSchoolIdFound", "No school ID found for your account")
          );
          setClasses([]);
          setClassesLoaded(true);
          fetchingClassesRef.current = false;
          return;
        }

        const fetchedSchoolId = accountData.school_id;
        console.log("✅ School ID fetched from account:", fetchedSchoolId);

        // Set school ID immediately
        setSchoolId(fetchedSchoolId);

        // Get class data from /classes/school/{schoolId} endpoint with high limit to get all classes
        const classResponse = await classService.getBySchool(fetchedSchoolId, {
          limit: 1000,
        });

        if (!classResponse || !classResponse.success) {
          console.log("No classes found in API response:", classResponse);
          setClasses([]);
          setClassesLoaded(true);
          fetchingClassesRef.current = false;
          return;
        }

        // Extract classes array from response - could be in classResponse.classes or classResponse.data
        const classesArray = classResponse.classes || classResponse.data || [];

        if (!Array.isArray(classesArray)) {
          console.log("Classes data is not an array:", classesArray);
          setClasses([]);
          setClassesLoaded(true);
          fetchingClassesRef.current = false;
          return;
        }

        console.log("Found classes in API response:", classesArray);

        // Process classes from the new API response
        const teacherClasses = classesArray.map((classData) => ({
          id: classData.classId,
          classId: classData.classId,
          name: classData.name,
          gradeLevel: classData.gradeLevel,
          section: classData.section || "A",
          academicYear: classData.academicYear,
          teacherId: classData.teacherId,
          maxStudents: classData.maxStudents || 50,
          capacity: classData.maxStudents || 50,
          schoolId: classData.schoolId,
          status: classData.status,
        }));

        setClasses(teacherClasses);
        setClassesLoaded(true);
        initialFetchDoneRef.current = true; // Mark initial fetch as complete

        console.log(
          `User ${user.username} has access to ${teacherClasses.length} classes for student selection:`,
          teacherClasses.map(
            (c) => `${c.name} (ID: ${c.classId}, Max: ${c.maxStudents})`
          )
        );
      } catch (error) {
        console.error("Error fetching class details:", error);
        showError(
          t(
            "errorFetchingClasses",
            "Failed to load classes. Some features may not work properly."
          )
        );
        // Fallback to empty classes array
        setClasses([]);
        setClassesLoaded(true);
        initialFetchDoneRef.current = true; // Mark as done even on error
      } finally {
        fetchingClassesRef.current = false;
      }
    };

    fetchClassDetailsAndSchoolId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Set initial loading to false once classes have been loaded
  useEffect(() => {
    if (classesLoaded) {
      setInitialLoading(false);
    }
  }, [classesLoaded]);

  // Move the fetchData function inside the component and wrap it in useStableCallback
  const fetchData = useStableCallback(async () => {
    try {
      if (!schoolId) {
        console.log("No school ID available, cannot fetch students");
        return;
      }

      // Prevent duplicate fetches
      if (fetchingRef.current) {
        console.log("Fetch already in progress, skipping...");
        return;
      }

      fetchingRef.current = true;
      setListLoading(true);
      setFetchError(null); // Clear any previous errors
      setStudents([]); // Clear previous students data when loading starts

      console.log("=== STUDENT SELECTION FETCH DEBUG ===");
      console.log("School ID:", schoolId);
      console.log("Search term:", debouncedSearch);
      console.log("Pagination:", pagination);

      // Build filter parameters
      const filterParams = {
        search: debouncedSearch,
        page: pagination.page,
        limit: pagination.limit,
      };

      // Add additional filters
      if (filters.academicYear)
        filterParams.academicYear = filters.academicYear;
      if (filters.gender) filterParams.gender = filters.gender;
      if (filters.dateOfBirth) {
        // Format date as YYYY-MM-DD for API
        const year = filters.dateOfBirth.getFullYear();
        const month = String(filters.dateOfBirth.getMonth() + 1).padStart(
          2,
          "0"
        );
        const day = String(filters.dateOfBirth.getDate()).padStart(2, "0");
        filterParams.dateOfBirth = `${year}-${month}-${day}`;
      }
      // gradeLevel is sent to API as gradeLevel parameter
      if (filters.gradeLevel) filterParams.gradeLevel = filters.gradeLevel;

      // Add class filter
      if (filters.classId && filters.classId !== "any") {
        filterParams.classId = filters.classId; // 'null' for no class, or specific class ID
      }

      // Use the master-class endpoint to get all students from the school with filters
      const studentsResponse = await studentService.getStudentsBySchool(
        schoolId,
        filterParams
      );

      console.log("Master-class response:", studentsResponse);

      if (
        studentsResponse &&
        studentsResponse.success &&
        studentsResponse.data
      ) {
        // Server handles gradeLevel filtering via gradeId parameter
        setStudents(studentsResponse.data);
        console.log(
          `Loaded ${studentsResponse.data.length} students from school ${schoolId} for selection`
        );

        if (studentsResponse.pagination) {
          console.log("Pagination data:", studentsResponse.pagination);
          setPagination((prev) => ({
            ...prev,
            ...studentsResponse.pagination,
          }));
        }
      } else {
        console.error(
          "Invalid response from master-class endpoint:",
          studentsResponse
        );
        setStudents([]);
      }
    } catch (error) {
      console.error("Error fetching student data from master-class:", error);

      // Set error state for display
      const errorMessage =
        error.message ||
        t("errorFetchingData") ||
        "Error fetching data from server";
      setFetchError({
        message: errorMessage,
        type: error.response?.status >= 500 ? "server" : "network",
        canRetry: true,
      });

      // Show toast error
      showError(errorMessage);
      setStudents([]);
    } finally {
      setListLoading(false);
      fetchingRef.current = false;
    }
  }, [
    schoolId,
    debouncedSearch,
    pagination.page,
    pagination.limit,
    filters.academicYear,
    filters.gender,
    filters.dateOfBirth,
    filters.gradeLevel,
    filters.classId,
    showError,
    t,
  ]);

  // Fetch students when pagination, search, or filters change
  useEffect(() => {
    if (schoolId) {
      fetchData();
    }
  }, [schoolId, fetchData]); // fetchData now includes all filter dependencies

  // Reset pagination to page 1 when filters change (but not when pagination changes)
  useEffect(() => {
    if (schoolId && pagination.page !== 1) {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.academicYear,
    filters.gender,
    filters.dateOfBirth,
    filters.gradeLevel,
    filters.classId,
  ]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination((prev) => ({
        ...prev,
        page: newPage,
      }));
      // Scroll to top when changing pages
      window.scrollTo(0, 0);
    }
  };

  // Handle limit change
  const handleLimitChange = (newLimit) => {
    setPagination((prev) => ({
      ...prev,
      limit: newLimit,
      page: 1, // Reset to first page when changing limit
    }));
    // Scroll to top when changing limit
    window.scrollTo(0, 0);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // Page reset is handled by useEffect for filter changes
  };

  // Check if all current page students (without class) are selected
  const areAllCurrentStudentsSelected = () => {
    // Filter out students who already have a class
    const selectableStudents = students.filter((student) => {
      const hasClass = !!(
        student.class?.name ||
        student.class_name ||
        student.class?.id ||
        student.class_id
      );
      return !hasClass;
    });

    return (
      selectableStudents.length > 0 &&
      selectableStudents.every((student) => actualIsSelected(student.id))
    );
  };

  // Handle select/deselect all students on current page (only students without class)
  const handleSelectAllCurrentPage = () => {
    // Filter out students who already have a class
    const selectableStudents = students.filter((student) => {
      const hasClass = !!(
        student.class?.name ||
        student.class_name ||
        student.class?.id ||
        student.class_id
      );
      return !hasClass;
    });

    if (areAllCurrentStudentsSelected()) {
      // Deselect all selectable students on current page
      selectableStudents.forEach((student) => {
        if (actualIsSelected(student.id)) {
          actualRemoveStudent(student.id);
        }
      });
    } else {
      // Select all selectable students on current page
      selectableStudents.forEach((student) => {
        if (!actualIsSelected(student.id)) {
          actualHandleSelectStudent(student);
        }
      });
    }
  };

  // Show initial loading state or error
  if (initialLoading) {
    // Show error if there's an issue loading classes
    if (classes.length === 0 && !user?.id) {
      return (
        <div className="flex-1 bg-gray-50 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <X className="h-10 w-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-red-600">
                {t("authenticationError", "Authentication Error")}
              </p>
              <p className="text-sm text-gray-600">
                {t("pleaseLoginAgain", "Please login again to continue")}
              </p>
            </div>
            <Button
              onClick={() => navigate("/login")}
              variant="primary"
              size="sm"
            >
              {t("goToLogin", "Go to Login")}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <DynamicLoader
            type="spinner"
            size="xl"
            variant="primary"
            message={t("loadingStudentSelection")}
          />
        </div>
      </div>
    );
  }

  return (
    <PageTransition variant="slideUp" duration="duration-700">
      <div className="p-3 sm:p-4">
        <FadeInSection
          delay={100}
          className=" rounded-lg p-4 sm:p-6 transition-all duration-300"
        >
          <div className="mb-6 flex flex-col space-y-4">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                {t("studentSelection") || "ការជ្រើសរើសសិស្ស"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {t("selectStudentsForAction") ||
                  "ជ្រើសរើសសិស្សដើម្បីអនុវត្តសកម្មភាពជាក្រុម"}
              </p>
            </div>

            {/* Search Bar and Filter Button */}
            <div className="flex flex-row gap-2 items-center">
              {/* Search Input */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-600" />
                </div>
                <input
                  type="text"
                  className="text-sm w-full pl-10 pr-8 py-2 border border-gray-200 rounded-sm leading-5 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors"
                  placeholder={t(
                    "searchStudents",
                    "Search students by name or username..."
                  )}
                  value={filters.search}
                  onChange={(e) =>
                    handleFilterChange({ ...filters, search: e.target.value })
                  }
                />
                {filters.search && (
                  <button
                    onClick={() =>
                      handleFilterChange({ ...filters, search: "" })
                    }
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    title={t("clearSearch", "Clear search")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter Button */}
              <Button
                onClick={() => setShowFilterSidebar(true)}
                variant="primary"
                size="sm"
                className=" flex items-center justify-center sm:justify-start gap-2 shadow-lg whitespace-nowrap"
                title={t("filters", "Filters")}
              >
                <Filter className="h-4 w-4" />
                <span className="sm:hidden">{t("filters", "Filters")}</span>
                <span className="hidden sm:inline">
                  {t("filters", "Filters")}
                </span>
                {(filters.academicYear ||
                  filters.gender ||
                  filters.dateOfBirth ||
                  filters.gradeLevel !== "" ||
                  filters.classId !== "any") && (
                  <span className="ml-auto sm:ml-1 bg-white text-blue-600 text-xs font-bold px-2.5 sm:px-2 py-0.5 rounded-full">
                    {(filters.academicYear ? 1 : 0) +
                      (filters.gender ? 1 : 0) +
                      (filters.dateOfBirth ? 1 : 0) +
                      (filters.gradeLevel !== "" ? 1 : 0) +
                      (filters.classId !== "any" ? 1 : 0)}
                  </span>
                )}
              </Button>
            </div>

            {/* Active Filters Display */}
            {(filters.academicYear ||
              filters.gender ||
              filters.dateOfBirth ||
              filters.gradeLevel !== "" ||
              filters.classId !== "any") && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-blue-900">
                  {t("activeFilters", "Active Filters")}:
                </span>
                {filters.classId !== "any" && (
                  <Badge color="purple" variant="outline" size="sm">
                    {t("class", "Class")}:{" "}
                    {filters.classId === "null"
                      ? t("studentsWithoutClass", "Without Class")
                      : (() => {
                          const selectedClass = classes.find(
                            (cls) => cls.classId.toString() === filters.classId
                          );
                          if (selectedClass) {
                            const rawGradeLevel =
                              typeof selectedClass.gradeLevel !== "undefined" &&
                              selectedClass.gradeLevel !== null
                                ? String(selectedClass.gradeLevel)
                                : "";
                            const displayGradeLevel =
                              rawGradeLevel === "0"
                                ? t("grade0", "Kindergarten")
                                : rawGradeLevel;
                            return formatClassIdentifier(
                              displayGradeLevel,
                              selectedClass.section
                            );
                          }
                          return filters.classId;
                        })()}
                  </Badge>
                )}
                {filters.academicYear && (
                  <Badge color="blue" variant="outline" size="sm">
                    {t("academicYear", "Academic Year")}: {filters.academicYear}
                  </Badge>
                )}
                {filters.gender && (
                  <Badge color="blue" variant="outline" size="sm">
                    {t("gender", "Gender")}:{" "}
                    {filters.gender === "MALE"
                      ? t("male", "Male")
                      : t("female", "Female")}
                  </Badge>
                )}
                {filters.dateOfBirth && (
                  <Badge color="orange" variant="outline" size="sm">
                    {t("dateOfBirth", "Date of Birth")}:{" "}
                    {formatDateKhmer(filters.dateOfBirth, "short")}
                  </Badge>
                )}
                {filters.gradeLevel !== "" && (
                  <Badge color="green" variant="outline" size="sm">
                    {t("gradeLevel", "Grade Level")}:{" "}
                    {
                      getSharedGradeLevelOptions(t, true).find(
                        (g) => g.value === filters.gradeLevel
                      )?.label
                    }
                  </Badge>
                )}
              </div>
            )}
          </div>
        </FadeInSection>

        {/* Filters Sidebar */}
        <SidebarFilter
          isOpen={showFilterSidebar}
          onClose={() => setShowFilterSidebar(false)}
          title={t("filters", "Filters & Search")}
          subtitle={
            t("selectStudentsForAction") || "Refine your search and filters"
          }
          hasFilters={
            filters.academicYear ||
            filters.gender ||
            filters.dateOfBirth ||
            filters.gradeLevel !== "" ||
            filters.classId !== "any"
          }
          onClearFilters={() => {
            handleFilterChange({
              search: filters.search,
              academicYear: "",
              gender: "",
              dateOfBirth: null,
              gradeLevel: "",
              classId: "any",
            });
          }}
          onApply={() => {
            setShowFilterSidebar(false);
          }}
          children={
            <>
              {/* Class Filter */}
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-2 uppercase">
                  {t("classFilter", "Class")}
                </label>
                <Dropdown
                  value={filters.classId}
                  onValueChange={(value) =>
                    handleFilterChange({ ...filters, classId: value })
                  }
                  options={[
                    { value: "any", label: t("allStudents", "All Students") },
                    {
                      value: "null",
                      label: t("studentsWithoutClass", "Without Class"),
                    },
                    ...classes.map((cls) => {
                      const rawGradeLevel =
                        typeof cls.gradeLevel !== "undefined" &&
                        cls.gradeLevel !== null
                          ? String(cls.gradeLevel)
                          : "";

                      const displayGradeLevel =
                        rawGradeLevel === "0"
                          ? t("grade0", "Kindergarten")
                          : rawGradeLevel;

                      return {
                        value: cls.classId.toString(),
                        label: `${
                          t("class") || "Class"
                        } ${formatClassIdentifier(
                          displayGradeLevel,
                          cls.section
                        )}`,
                      };
                    }),
                  ]}
                  placeholder={t("selectClassFilter", "Select Class")}
                  minWidth="w-full"
                  triggerClassName="text-sm w-full bg-gray-50 border-gray-200"
                />
              </div>

              {/* Academic Year Filter */}
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-2 uppercase">
                  {t("academicYear", "Academic Year")}
                </label>
                <input
                  type="text"
                  placeholder="2024-2025"
                  value={filters.academicYear}
                  onChange={(e) =>
                    handleFilterChange({
                      ...filters,
                      academicYear: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50 placeholder-gray-400 transition-colors"
                />
              </div>

              {/* Gender Filter */}
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-2 uppercase">
                  {t("gender", "Gender")}
                </label>
                <Dropdown
                  value={filters.gender}
                  onValueChange={(value) =>
                    handleFilterChange({ ...filters, gender: value })
                  }
                  options={[
                    { value: "", label: t("allGenders", "All Genders") },
                    { value: "MALE", label: t("male", "Male") },
                    { value: "FEMALE", label: t("female", "Female") },
                  ]}
                  placeholder={t("selectGender", "Select Gender")}
                  minWidth="w-full"
                  triggerClassName="text-sm w-full bg-gray-50 border-gray-200"
                />
              </div>

              {/* Date of Birth Filter */}
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-2 uppercase">
                  {t("dateOfBirth", "Date of Birth")}
                </label>
                <DatePickerWithDropdowns
                  value={filters.dateOfBirth}
                  onChange={(date) =>
                    handleFilterChange({ ...filters, dateOfBirth: date })
                  }
                  placeholder={t("selectDate", "Select Date")}
                />
              </div>

              {/* Grade Level Filter */}
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-2 uppercase">
                  {t("gradeLevel", "Grade Level")}
                </label>
                <Dropdown
                  value={filters.gradeLevel}
                  onValueChange={(value) =>
                    handleFilterChange({ ...filters, gradeLevel: value })
                  }
                  options={getSharedGradeLevelOptions(t, true)}
                  placeholder={t("selectGradeLevel", "Select Grade Level")}
                  minWidth="w-full"
                  triggerClassName="text-sm w-full bg-gray-50 border-gray-200"
                />
              </div>
            </>
          }
        />

        {/* Students List */}
        <FadeInSection delay={400} className="px-5">
          <div className="bg-white shadow-sm border border-gray-200 rounded-sm overflow-hidden">
            {/* Header with select all checkbox */}
            {!listLoading && students.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={areAllCurrentStudentsSelected()}
                      onChange={handleSelectAllCurrentPage}
                      className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 border-gray-300 rounded-md transition-colors"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      {areAllCurrentStudentsSelected()
                        ? t("deselectAllOnPage") || "Deselect all on page"
                        : t("selectAllOnPage") || "Select all on page"}
                    </label>
                  </div>
                  <div className="flex">
                    {/* Selected Students Sidebar */}
                    <SelectedStudentsManager
                      selectedStudents={actualSelectedStudents}
                      selectedStudentsData={actualSelectedStudentsData}
                      onRemoveStudent={actualRemoveStudent}
                      onClearAll={actualClearAll}
                      schoolId={schoolId}
                      classes={classes}
                      isOpen={showSelectedStudentsSidebar}
                      onToggle={setShowSelectedStudentsSidebar}
                      autoOpen={false}
                      onRefresh={fetchData}
                    />
                  </div>
                </div>
              </div>
            )}

            {listLoading ? (
              <div className="w-full flex items-center justify-center py-8">
                <LoadingSpinner size="default" variant="primary" />
              </div>
            ) : fetchError ? (
              <div className="flex items-center justify-center min-h-[400px] p-6">
                <div className="text-center space-y-4 max-w-md">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <X className="h-10 w-10 text-red-500" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-red-600">
                      {t("connectionError", "Connection Error")}
                    </p>
                    <p className="text-sm text-gray-600">
                      {fetchError.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {fetchError.type === "server"
                        ? t(
                            "serverError",
                            "Server is temporarily unavailable. Please try again later."
                          )
                        : t(
                            "networkError",
                            "Please check your internet connection and try again."
                          )}
                    </p>
                  </div>
                  {fetchError.canRetry && (
                    <Button
                      onClick={() => fetchData()}
                      variant="primary"
                      size="sm"
                      className="mt-4"
                    >
                      {t("retry", "Try Again")}
                    </Button>
                  )}
                </div>
              </div>
            ) : students.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                {students.map((student) => {
                  // Check if student has a class assigned
                  const hasClass = !!(
                    student.class?.name ||
                    student.class_name ||
                    student.class?.id ||
                    student.class_id
                  );
                  const isSelected = actualIsSelected(student.id);

                  return (
                    <div
                      key={student.id}
                      className={`group transition-all duration-150 border rounded-sm p-4 ${
                        hasClass
                          ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                          : isSelected
                          ? " border-blue-500"
                          : "hover:bg-gray-50/50 border-gray-100"
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <input
                            id={`student-${student.id}`}
                            name="students"
                            type="checkbox"
                            className={`h-4 w-4 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 border-gray-300 rounded-sm transition-colors ${
                              hasClass
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-blue-600 cursor-pointer"
                            }`}
                            checked={isSelected}
                            onChange={() =>
                              !hasClass && actualHandleSelectStudent(student)
                            }
                            disabled={hasClass}
                          />
                        </div>

                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div
                            className={`flex-shrink-0 w-10 h-10 bg-gradient-to-br rounded-full flex items-center justify-center ${
                              isSelected
                                ? "from-blue-100 to-blue-200"
                                : "from-blue-100 to-blue-200"
                            }`}
                          >
                            <User className="h-5 w-5 text-blue-600" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between space-y-2">
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900 truncate">
                                  {getFullName(
                                    student,
                                    student.username || "Unknown"
                                  )}
                                </h3>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-500 flex-wrap mt-">
                              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                                {student.studentId}
                              </span>
                              <span>•</span>
                              {student.gender && (
                                <>
                                  <span
                                    className={`px-2 py-0.5 rounded font-medium ${
                                      student.gender === "MALE"
                                        ? "bg-blue-100 text-blue-700"
                                        : student.gender === "FEMALE"
                                        ? "bg-pink-100 text-pink-700"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {student.gender === "MALE"
                                      ? t("male", "Male")
                                      : student.gender === "FEMALE"
                                      ? t("female", "Female")
                                      : student.gender}
                                  </span>
                                  <span>•</span>
                                </>
                              )}
                              {student.gradeLevel && (
                                <>
                                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                                    {`${
                                      t("gradeLevel") || "Grade Level"
                                    } ${formatClassIdentifier(
                                      student.gradeLevel,
                                      student.section
                                    )}`}
                                  </span>
                                  <span>•</span>
                                </>
                              )}
                              {student.academicYear && (
                                <>
                                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
                                    {student.academicYear}
                                  </span>
                                  <span>•</span>
                                </>
                              )}
                              {student.dateOfBirth && (
                                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">
                                  {formatDateKhmer(
                                    student.dateOfBirth,
                                    "short"
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[400px] p-6">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <User className="h-10 w-10 text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-500">
                      {t("noStudentsFound") ||
                        "រកមិនឃើញសិស្សដែលស្របនឹងលក្ខខណ្ឌរបស់អ្នក។"}
                    </p>
                    <p className="text-sm text-gray-400">
                      {debouncedSearch
                        ? t("tryDifferentSearch") ||
                          "Try adjusting your search criteria"
                        : t("noStudentsAvailable") ||
                          "No students are available in this school"}
                    </p>
                  </div>
                  {(debouncedSearch ||
                    filters.academicYear ||
                    filters.gender ||
                    filters.dateOfBirth ||
                    filters.gradeLevel ||
                    filters.classId !== "any") && (
                    <Button
                      onClick={() =>
                        handleFilterChange({
                          search: "",
                          academicYear: "",
                          gender: "",
                          dateOfBirth: null,
                          gradeLevel: "",
                          classId: "any",
                        })
                      }
                      variant="outline"
                      size="sm"
                      className="mt-4"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t("clearFilters") || "Clear Filters"}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Pagination (shadcn-styled from shared UI) */}
            {!listLoading && students.length > 0 && (
              <FadeInSection delay={500}>
                <UIPagination
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                  limitOptions={[10, 25, 50]}
                  showLimitSelector={true}
                  t={(key, fallback) => t(key) || fallback}
                />
              </FadeInSection>
            )}
          </div>
        </FadeInSection>
      </div>
    </PageTransition>
  );
};

export default StudentSelection;
