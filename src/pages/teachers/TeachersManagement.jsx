import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  MinusCircle,
  Edit2,
  Users,
  Download,
  X,
  ListFilter,
  Eye,
  Lock,
  Unlock,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { useLoading } from "../../contexts/LoadingContext";
import { encryptId } from "../../utils/encryption";
import { getFullName } from "../../utils/usernameUtils";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Button } from "../../components/ui/Button";
import { teacherService } from "../../utils/api/services/teacherService";
import { userService } from "../../utils/api/services/userService";
import {
  useStableCallback,
  useRenderTracker,
} from "../../utils/reactOptimization";
import {
  PageTransition,
  FadeInSection,
} from "../../components/ui/PageTransition";
import { Badge } from "../../components/ui/Badge";
import { Table } from "../../components/ui/Table";
import {
  exportTeachersToExcel,
  exportTeachersToCSV,
  exportTeachersToPDF,
  getTimestampedFilename,
} from "../../utils/exportUtils";
import {
  formatClassIdentifier,
  getGradeLevelOptions as getSharedGradeLevelOptions,
} from "../../utils/helpers";
import { getGradeLabel } from "../../constants/grades";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import TeacherViewModal from "../../components/teachers/TeacherViewModal";
import ErrorDisplay from "../../components/ui/ErrorDisplay";
import { useErrorHandler } from "../../hooks/useErrorHandler";
import DynamicLoader, { PageLoader } from "../../components/ui/DynamicLoader";
import Modal from "../../components/ui/Modal";
import SelectedCard from "../../components/ui/SelectedCard";
import Dropdown from "../../components/ui/Dropdown";
import SidebarFilter from "../../components/ui/SidebarFilter";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { roleOptions } from "../../utils/formOptions";

// Helper function to get role name by roleId
const getRoleName = (roleId) => {
  const role = roleOptions.find((r) => r.value === String(roleId));
  return role ? role.label : "-";
};

export default function TeachersManagement() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { error, handleError, clearError, retry } = useErrorHandler();
  const { stopLoading, isLoading } = useLoading();

  // Track renders to detect infinite loops (development only)
  useRenderTracker("TeachersManagement");

  // Get authenticated user data
  const [user, setUser] = useState(() => {
    try {
      const userData = localStorage.getItem("user");
      return userData ? JSON.parse(userData) : null;
    } catch (err) {
      console.error("Error parsing user data from localStorage:", err);
      return null;
    }
  });

  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          console.log(
            "🔄 localStorage changed in TeachersManagement, updating user state:",
            parsedUser,
          );
          setUser(parsedUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Error parsing updated user data:", err);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("userDataUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userDataUpdated", handleStorageChange);
    };
  }, []);

  // State for current user's school ID
  const [schoolId, setSchoolId] = useState(null);
  const [schoolName, setSchoolName] = useState("");

  // State for teachers list and pagination
  const [teachers, setTeachers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });

  // Other state variables
  const [searchTerm, setSearchTerm] = useState("");
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [selectedGradeLevel, setSelectedGradeLevel] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("true"); // '' = all, 'true' = active, 'false' = inactive
  const [selectedRoleId, setSelectedRoleId] = useState(""); // '' = all roles
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [viewingTeacher, setViewingTeacher] = useState(null);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [loadingViewTeacherId, setLoadingViewTeacherId] = useState(null);
  const fetchingRef = useRef(false);
  const lastFetchParams = useRef(null);
  const searchTimeoutRef = useRef(null);
  const lastPaginationRef = useRef({ page: 1, limit: 10 });

  // State for all teachers (unfiltered) and filtered teachers
  const [allTeachers, setAllTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);

  // Grade level filter options using shared helper (keep '' as "all" for API semantics)
  const getGradeLevelOptions = () => {
    const gradeOptions = getSharedGradeLevelOptions(t, false); // no 'all' value
    return [
      { value: "", label: t("allGrades", "All Grades") },
      ...gradeOptions,
    ];
  };

  // Enhanced client-side search function
  const performClientSideSearch = useCallback((teachersData, searchQuery) => {
    if (!searchQuery || searchQuery.trim() === "") {
      return teachersData;
    }

    const query = searchQuery.trim().toLowerCase();

    return teachersData.filter((teacher) => {
      const searchFields = [
        teacher.firstName || "",
        teacher.lastName || "",
        teacher.username || "",
        teacher.email || "",
        teacher.phone || "",
        teacher.name || "",
        getFullName(teacher, ""),
      ];

      return searchFields.some((field) => field.toLowerCase().includes(query));
    });
  }, []);

  // Debounced search handler - triggers server-side search
  const handleSearchChange = useCallback((value) => {
    setLocalSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce server-side search
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value);
      // Reset to page 1 when searching
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);
  }, []);

  // Fetch current user's school ID from localStorage
  const fetchSchoolId = useStableCallback(async () => {
    try {
      if (schoolId) {
        console.log("School ID already available:", schoolId);
        return;
      }

      console.log("Fetching school ID from localStorage...");
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        const userSchoolId =
          user?.teacher?.schoolId || user?.schoolId || user?.school_id;

        if (userSchoolId) {
          console.log("✅ School ID fetched from localStorage:", userSchoolId);
          setSchoolId(userSchoolId);
          setSchoolName(user?.teacher?.schoolName || user?.school?.name || "");
        } else {
          console.error("No schoolId found in localStorage user data");
          showError(
            t("noSchoolIdFound", "No school ID found for your account"),
          );
        }
      } else {
        console.error("No user data in localStorage");
        showError(t("noSchoolIdFound", "No school ID found for your account"));
      }
    } catch (err) {
      console.error("Error fetching school ID from localStorage:", err);
      handleError(err, {
        toastMessage: t(
          "failedToFetchSchoolId",
          "Failed to fetch school information",
        ),
      });
    }
  }, [schoolId, showError, t, handleError]);

  // Fetch teachers from the school
  const fetchTeachers = useStableCallback(
    async (force = false, isPagination = false) => {
      if (!schoolId) {
        console.log("No school ID available, skipping teacher fetch...");
        return;
      }

      const currentParams = JSON.stringify({
        search: searchTerm,
        gradeLevel: selectedGradeLevel,
        statusFilter: selectedStatusFilter,
        roleId: selectedRoleId,
        schoolId,
        page: pagination.page,
        limit: pagination.limit,
      });

      if (
        !force &&
        (fetchingRef.current || lastFetchParams.current === currentParams)
      ) {
        console.log("Skipping duplicate fetch with same parameters");
        return;
      }

      fetchingRef.current = true;
      lastFetchParams.current = currentParams;

      try {
        if (isPagination) {
          setPaginationLoading(true);
        } else {
          setLoading(true);
        }

        console.log(`=== FETCH TEACHERS ===`);
        console.log(`School ID: ${schoolId}`);
        console.log(`Search term: ${searchTerm}`);
        console.log(`Grade Level: ${selectedGradeLevel}`);
        console.log(`Status Filter: ${selectedStatusFilter}`);
        console.log(`Role ID Filter: ${selectedRoleId}`);
        console.log(`Page: ${pagination.page}, Limit: ${pagination.limit}`);

        // Build request parameters with search, grade level, status filter, role filter, and pagination
        const requestParams = {
          page: pagination.page,
          limit: pagination.limit,
        };
        if (searchTerm && searchTerm.trim()) {
          requestParams.search = searchTerm.trim();
        }
        if (selectedGradeLevel && selectedGradeLevel !== "") {
          requestParams.gradeLevel = selectedGradeLevel;
        }
        if (selectedStatusFilter !== "") {
          requestParams.isActive = selectedStatusFilter === "true";
        }
        if (selectedRoleId && selectedRoleId !== "") {
          requestParams.roleId = selectedRoleId;
        }

        const response = await teacherService.getTeachersBySchool(
          schoolId,
          requestParams,
        );

        console.log("=== API RESPONSE (TEACHERS) ===");
        console.log("Full API response:", response);
        console.log("Response success:", response?.success);
        console.log("Response data length:", response?.data?.length);
        console.log("=== END API RESPONSE ===");

        if (!response || !response.success) {
          throw new Error(
            response?.error || "Failed to fetch teachers from school",
          );
        }

        let data = response.data || [];

        console.log(`Fetched ${data.length} teachers from school ${schoolId}`);
        console.log("Raw teacher data:", data);

        // Map backend data structure to component format
        data = data.map((teacher) => {
          // Determine active status - handle both camelCase and snake_case from API
          const isActive =
            teacher.isActive !== undefined
              ? teacher.isActive
              : teacher.is_active !== undefined
                ? teacher.is_active
                : teacher.status === "ACTIVE";

          return {
            id: teacher.teacherId,
            teacherId: teacher.teacherId,
            userId: teacher.userId,
            username: teacher.user?.username || "",
            firstName: teacher.user?.firstName || "",
            lastName: teacher.user?.lastName || "",
            name: getFullName(teacher.user, ""),
            email: teacher.user?.email || "",
            phone: teacher.user?.phone || "",
            gender: teacher.user?.gender || "",
            schoolId: teacher.schoolId,
            schoolName: teacher.school?.name || "",
            hireDate: teacher.hireDate || teacher.hire_date || null,
            gradeLevel: teacher.gradeLevel || null,
            employmentType:
              teacher.employmentType || teacher.employment_type || "",
            roleId: teacher.roleId,
            status: teacher.status,
            isActive: isActive,
            classes: teacher.classes || [],
          };
        });

        console.log("Mapped teacher data:", data);

        // Use server-side filtered and paginated data directly
        setAllTeachers(data);
        setFilteredTeachers(data);
        setTeachers(data);

        // Update pagination info from API response
        console.log("API Pagination metadata:", response.pagination);
        if (response.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: response.pagination.total,
            pages: response.pagination.pages,
          }));
        } else {
          // Fallback if API doesn't return pagination metadata
          console.warn(
            "No pagination metadata in API response, using data.length",
          );
          setPagination((prev) => ({
            ...prev,
            total: data.length,
            pages: Math.ceil(data.length / prev.limit),
          }));
        }

        setDataFetched(true); // Mark data as fetched after successful API call
        setInitialLoading(false); // End initial loading after successful data fetch
      } catch (err) {
        console.error("Error fetching teachers from school:", err);
        handleError(err, {
          toastMessage: t("errorFetchingTeachers", "Failed to fetch teachers"),
        });
        setTeachers([]);
        setAllTeachers([]);
        setFilteredTeachers([]);
        setDataFetched(true); // Mark data as fetched even on error
        setInitialLoading(false); // End initial loading even on error
      } finally {
        if (isPagination) {
          setPaginationLoading(false);
        } else {
          stopLoading("fetchTeachers");
        }
        setLoading(false);
        fetchingRef.current = false;
      }
    },
    [
      schoolId,
      searchTerm,
      selectedGradeLevel,
      selectedStatusFilter,
      selectedRoleId,
      pagination.page,
      pagination.limit,
      showError,
      t,
      handleError,
      stopLoading,
    ],
  );

  // Initialize school ID and fetch teachers
  useEffect(() => {
    console.log("🔄 Component mounted, fetching school ID...");
    fetchSchoolId();
  }, [fetchSchoolId]);

  // Fetch teachers when school ID becomes available
  useEffect(() => {
    if (schoolId && !dataFetched) {
      console.log("School ID available, fetching teachers...");
      fetchTeachers(true); // Let fetchTeachers handle loading states
    }
  }, [schoolId, fetchTeachers, dataFetched]);

  // Memoized fetch parameters
  const fetchParams = useMemo(
    () => ({
      searchTerm,
      selectedGradeLevel,
      selectedStatusFilter,
      selectedRoleId,
      schoolId,
      page: pagination.page,
      limit: pagination.limit,
    }),
    [
      searchTerm,
      selectedGradeLevel,
      selectedStatusFilter,
      selectedRoleId,
      schoolId,
      pagination.page,
      pagination.limit,
    ],
  );

  // Handle fetch on parameter changes
  useEffect(() => {
    if (!schoolId || !dataFetched) return;

    const isSearchChange = fetchParams.searchTerm.trim() !== "";
    const isPaginationChange =
      lastPaginationRef.current.page !== pagination.page ||
      lastPaginationRef.current.limit !== pagination.limit;
    const delay = isSearchChange ? 500 : 100;

    // Update the last pagination ref before scheduling the fetch so we know what was changed
    lastPaginationRef.current = {
      page: pagination.page,
      limit: pagination.limit,
    };

    const timer = setTimeout(() => {
      if (!fetchingRef.current) {
        console.log("🔄 Fetching with isPagination:", isPaginationChange);
        fetchTeachers(false, isPaginationChange);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [
    fetchParams,
    fetchTeachers,
    schoolId,
    dataFetched,
    pagination.page,
    pagination.limit,
  ]);

  // Clear table loading when data finishes loading
  useEffect(() => {
    if (!isLoading("fetchTeachers")) {
      setTableLoading(false);
    }
  }, [isLoading("fetchTeachers")]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportDropdown && !event.target.closest(".export-dropdown")) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportDropdown]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Handle page change
  const handlePageChange = (newPage) => {
    console.log(`Changing from page ${pagination.page} to page ${newPage}`);

    if (newPage >= 1 && newPage <= pagination.pages && !paginationLoading) {
      setPagination((prev) => ({ ...prev, page: newPage }));
      fetchTeachers(false, true); // Call with isPagination = true
    }
  };

  // Handle limit change
  const handleLimitChange = (newLimit) => {
    setPaginationLoading(true);
    setPagination((prev) => ({
      ...prev,
      limit: newLimit,
      page: 1, // Reset to first page when changing limit
    }));
    // Scroll to top when changing limit
    window.scrollTo(0, 0);
    // fetchTeachers will be triggered by useEffect watching pagination.limit
  };

  // Handle delete teacher
  const handleDeleteTeacher = async () => {
    showSuccess(t("featureComingSoon", "This feature is coming soon"));
    setShowDeleteDialog(false);
    setSelectedTeacher(null);
  };

  // Handle toggle user active/inactive status - show confirmation dialog
  const handleToggleUserStatus = (teacher) => {
    setSelectedTeacher(teacher);
    setShowStatusDialog(true);
  };

  // Handle confirm status change
  const handleConfirmStatusChange = async () => {
    if (!selectedTeacher) return;

    try {
      const newStatus = !selectedTeacher.isActive;
      setLoading(true);
      console.log(
        `Toggling user ${selectedTeacher.userId} status from ${selectedTeacher.isActive} to ${newStatus}`,
      );

      // Call API to update status
      const response = await userService.updateUserActiveStatus(
        selectedTeacher.userId,
        newStatus,
      );

      if (response && response.success !== false) {
        // Update the teacher in the list
        const updatedTeachers = teachers.map((t) => {
          if (t.userId === selectedTeacher.userId) {
            return {
              ...t,
              isActive: newStatus,
              status: newStatus ? "ACTIVE" : "INACTIVE",
            };
          }
          return t;
        });

        setTeachers(updatedTeachers);
        setAllTeachers(
          allTeachers.map((t) => {
            if (t.userId === selectedTeacher.userId) {
              return {
                ...t,
                isActive: newStatus,
                status: newStatus ? "ACTIVE" : "INACTIVE",
              };
            }
            return t;
          }),
        );

        showSuccess(
          newStatus
            ? t("teacherActivatedSuccess", "Teacher activated successfully")
            : t(
                "teacherDeactivatedSuccess",
                "Teacher deactivated successfully",
              ),
        );

        // Refresh data from API to ensure consistency
        fetchTeachers(true);
      } else {
        showError(
          response?.error ||
            t("failedToUpdateStatus", "Failed to update teacher status"),
        );
      }
    } catch (err) {
      console.error("Error toggling teacher status:", err);
      handleError(err, {
        toastMessage: t(
          "errorUpdatingTeacherStatus",
          "Failed to update teacher status",
        ),
      });
    } finally {
      setLoading(false);
      setShowStatusDialog(false);
      setSelectedTeacher(null);
    }
  };

  // Export handlers - Export in Cambodian school format
  const handleExportExcel = async () => {
    try {
      // Dynamically import xlsx-js-style for styling support
      const XLSXStyleModule = await import("xlsx-js-style");
      const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

      // Get filter title based on applied filters
      const getFilterTitle = () => {
        const filterParts = [];
        if (selectedGradeLevel) {
          filterParts.push(`${t("gradeLevel")}: ${selectedGradeLevel}`);
        }
        if (searchTerm) {
          filterParts.push(`${t("search")}: ${searchTerm}`);
        }

        const filterText =
          filterParts.length > 0 ? ` (${filterParts.join(", ")})` : "";
        return `បញ្ជីរាយនាមគ្រូបង្រៀន${filterText}`;
      };

      // Create comprehensive template with Cambodian school headers
      const templateData = [
        // Official Cambodian School Header - Row 1
        ["ព្រះរាជាណាចក្រកម្ពុជា", "", "", "", "", "", "", "", "", "", ""],
        // Nation, Religion, King - Row 2
        [
          "ជាតិ       សាសនា       ព្រះមហាក្សត្រ",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ],
        // School Name - Row 3
        [
          schoolName || "សាលាបឋមសិក្សា ហ៊ុន សែន ព្រែកគយ",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ],
        // Teacher List Title - Row 4
        [getFilterTitle(), "", "", "", "", "", "", "", "", "", ""],
        // Academic Year - Row 5
        [
          `ឆ្នាំសិក្សា ${new Date().getFullYear() + "-" + (new Date().getFullYear() + 1)}`,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ],
        // Empty row for spacing - Row 6
        ["", "", "", "", "", "", "", "", "", "", ""],
        // Instructions row (row 7)
        ["", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", ""],
        // Sub headers (row 9)
        [
          "#",
          "អត្តលេខ",
          "គោត្តនាម",
          "នាម",
          "លេខទូរស័ព្ទ",
          "ភេទ",
          "ថ្ងៃកំណើត",
          "សញ្ជាតិ",
          "តួរនាទី",
          "អាសយដ្ឋានពេញ",
          "ថ្នាក់ដែលបង្រៀន",
        ],
      ];

      // Add teacher data rows
      teachers.forEach((teacher, index) => {
        // Format date of birth
        const dob = teacher.dateOfBirth || teacher.date_of_birth;
        const formattedDob = dob ? formatDateKhmer(dob, "dateOnly") : "";

        // Format gender
        const gender =
          teacher.gender === "MALE" || teacher.gender === "male"
            ? "ប្រុស"
            : teacher.gender === "FEMALE" || teacher.gender === "female"
              ? "ស្រី"
              : "";

        // Format role (position) - roleId 14 = Director, roleId 8 = Teacher
        const role = teacher.roleId === 14 ? "នាយក" : "គ្រូបង្រៀន";

        // Format full address for teacher
        const teacherAddress = [
          teacher.residence?.village || teacher.village,
          teacher.residence?.commune || teacher.commune,
          teacher.residence?.district || teacher.district,
          teacher.residence?.province || teacher.province,
        ]
          .filter(Boolean)
          .join(" ");

        // Format classes taught by teacher
        const classesTaught =
          teacher.classes && teacher.classes.length > 0
            ? teacher.classes
                .map((cls) => {
                  const rawGradeLevel =
                    typeof cls.gradeLevel !== "undefined" &&
                    cls.gradeLevel !== null
                      ? String(cls.gradeLevel)
                      : "";

                  const displayGradeLevel =
                    rawGradeLevel === "0"
                      ? t("grade0", "Kindergarten")
                      : rawGradeLevel;

                  return `${t("class") || "Class"} ${formatClassIdentifier(displayGradeLevel, cls.section)}`;
                })
                .join(", ")
            : "";

        const row = [
          index + 1, // Row number
          teacher.teacherId || teacher.id || "", // អត្តលេខ
          getFullName(teacher, ""), // នាម (using getFullName which applies lastName firstName format)
          teacher.phone || "", // លេខទូរស័ព្ទ
          gender, // ភេទ
          formattedDob, // ថ្ងៃកំណើត
          teacher.nationality || "ខ្មែរ", // សញ្ជាតិ
          role, // តំណែង
          teacherAddress, // អាសយដ្ឋានពេញ
          classesTaught, // ថ្នាក់ដែលបង្រៀន
        ];

        templateData.push(row);
      });

      // Create worksheet
      const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

      // Set column widths
      ws["!cols"] = [
        { wch: 5 }, // #
        { wch: 12 }, // អត្តលេខ
        { wch: 12 }, // គោត្តនាម
        { wch: 12 }, // នាម
        { wch: 12 }, // លេខទូរស័ព្ទ
        { wch: 8 }, // ភេទ
        { wch: 12 }, // ថ្ងៃកំណើត
        { wch: 10 }, // សញ្ជាតិ
        { wch: 12 }, // តំណែង
        { wch: 40 }, // អាសយដ្ឋានពេញ
        { wch: 20 }, // ថ្នាក់ដែលបង្រៀន
      ];

      // Apply styling
      const range = XLSXStyle.utils.decode_range(ws["!ref"]);
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });

          if (!ws[cellAddress]) {
            ws[cellAddress] = { t: "s", v: "" };
          }

          // Header rows (0-6) - No borders, centered, bold
          if (R < 7) {
            ws[cellAddress].s = {
              alignment: { vertical: "center", horizontal: "center" },
              font: { name: "Khmer OS Battambang", sz: 11, bold: true },
            };
          }
          // Instructions row (7)
          else if (R === 7) {
            ws[cellAddress].s = {
              alignment: { vertical: "center", horizontal: "left" },
              font: { name: "Khmer OS Battambang", sz: 9, italic: true },
              fill: { fgColor: { rgb: "FFF9E6" } },
            };
          }
          // Headers (8-9) - Gray background, borders, bold
          else if (R === 8) {
            ws[cellAddress].s = {
              fill: { fgColor: { rgb: "E0E0E0" } },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } },
              },
              alignment: {
                vertical: "center",
                horizontal: "center",
                wrapText: true,
              },
              font: { name: "Khmer OS Battambang", sz: 10, bold: true },
            };
          }
          // Data rows (10+) - Reduced borders (only top and bottom)
          else {
            ws[cellAddress].s = {
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } },
              },
              alignment: { vertical: "center", horizontal: "left" },
              font: { name: "Khmer OS Battambang", sz: 10 },
            };
          }
        }
      }

      // Merge cells for headers
      ws["!merges"] = [
        // Row 1-7 (full width merges)
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 10 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: 10 } },
        { s: { r: 5, c: 0 }, e: { r: 5, c: 10 } },
        { s: { r: 6, c: 0 }, e: { r: 6, c: 10 } },
      ];

      // Create workbook
      const wb = XLSXStyle.utils.book_new();
      XLSXStyle.utils.book_append_sheet(wb, ws, "បញ្ជីគ្រូបង្រៀន");

      // Generate filename with filter information
      let filenameBase = "teachers_data";
      if (selectedGradeLevel || searchTerm) {
        const filterParts = [];
        if (selectedGradeLevel) {
          filterParts.push(`grade_${selectedGradeLevel}`);
        }
        if (searchTerm) {
          // Sanitize search term for filename
          const sanitizedSearch = searchTerm
            .replace(/[^a-zA-Z0-9_\u1780-\u17ff\-]/g, "_")
            .substring(0, 20);
          filterParts.push(`search_${sanitizedSearch}`);
        }
        filenameBase += "_" + filterParts.join("_");
      }

      const filename = getTimestampedFilename(filenameBase, "xlsx");

      // Export file
      XLSXStyle.writeFile(wb, filename);

      showSuccess(t("exportSuccess", "Data exported successfully"));
      setShowExportDropdown(false);
    } catch (error) {
      console.error("Export error:", error);
      showError(t("exportError", "Failed to export data"));
    }
  };

  // Handle select teacher
  const handleSelectTeacher = useCallback((teacher) => {
    setSelectedTeachers((prev) => {
      const isSelected = prev.some(
        (t) => t.id === teacher.id || t.userId === teacher.userId,
      );
      if (isSelected) {
        return prev.filter(
          (t) => t.id !== teacher.id && t.userId !== teacher.userId,
        );
      } else {
        return [...prev, teacher];
      }
    });
  }, []);

  // Handle select all teachers on current page
  const handleSelectAll = async () => {
    if (selectingAll) return;

    // If all teachers are already selected, deselect all
    const allSelected =
      teachers.length > 0 && selectedTeachers.length === teachers.length;

    if (allSelected) {
      clearAllTeachers();
      showSuccess(t("deselectedAllTeachers", "All teachers deselected"));
      return;
    }

    // Otherwise, select all teachers with loading animation
    try {
      setSelectingAll(true);

      // Select teachers in batches to avoid blocking the UI
      const batchSize = 50;
      let selectedCount = 0;

      setSelectedTeachers((prev) => {
        const newSelected = [...prev];
        for (const teacher of teachers) {
          if (
            !newSelected.some(
              (t) => t.id === teacher.id || t.userId === teacher.userId,
            )
          ) {
            newSelected.push(teacher);
            selectedCount++;
          }
        }
        return newSelected;
      });

      if (selectedCount > 0) {
        showSuccess(
          t("selectedAllTeachers") ||
            `Selected ${selectedCount} teacher${selectedCount !== 1 ? "s" : ""}`,
        );
      } else if (selectedCount === 0 && teachers.length > 0) {
        showSuccess(
          t("allTeachersAlreadySelected", "All teachers already selected"),
        );
      }
    } catch (error) {
      console.error("Error selecting all teachers:", error);
      showError(
        t("errorSelectingAllTeachers", "Failed to select all teachers"),
      );
    } finally {
      setSelectingAll(false);
    }
  };

  // Clear all selected teachers
  const clearAllTeachers = () => {
    setSelectedTeachers([]);
  };

  // Handle view teacher
  const handleViewTeacher = async (teacher) => {
    console.log("View button clicked for teacher:", teacher);
    const teacherId = teacher.id || teacher.teacherId || teacher.userId;

    // Set loading state for this specific teacher
    setLoadingViewTeacherId(teacherId);

    try {
      // Fetch full teacher data before opening modal
      const userId = teacher.userId || teacher.id;

      if (userId) {
        console.log("Fetching full teacher data for userId:", userId);
        const response = await userService.getUserByID(userId);
        console.log("Full teacher data fetched:", response);

        // Handle different response formats
        let fullTeacherData = teacher;
        if (response) {
          if (response.data) {
            fullTeacherData = response.data;
          } else if (response.id || response.username || response.first_name) {
            fullTeacherData = response;
          }
        }

        // Merge fetched data with original teacher object to preserve teacherId, userId, etc.
        // This ensures the modal has all the IDs it needs for additional API calls
        const mergedTeacherData = {
          ...fullTeacherData,
          teacherId: teacher.teacherId || teacher.id,
          userId: teacher.userId || teacher.id,
          id: teacher.id || teacher.teacherId || teacher.userId,
        };

        // Set the merged teacher data and show modal
        setViewingTeacher(mergedTeacherData);
      } else {
        // No userId, use provided teacher data
        setViewingTeacher(teacher);
      }

      setShowViewModal(true);
    } catch (error) {
      console.error("Error fetching teacher data:", error);
      showError(
        t("failedToLoadTeacherDetails", "Failed to load teacher details"),
      );
      // Still open modal with basic data
      setViewingTeacher(teacher);
      setShowViewModal(true);
    } finally {
      // Clear loading state
      setLoadingViewTeacherId(null);
    }
  };

  // Handle add teacher button click - navigate to create page
  const handleAddTeacherClick = () => {
    navigate("/teachers/edit?mode=create");
  };

  // Handle edit teacher - navigate to edit page with encrypted teacher ID
  const handleEditTeacher = (teacher) => {
    console.log("Edit button clicked for teacher:", teacher);
    const teacherId = teacher.userId || teacher.id;
    if (!teacherId) {
      showError(t("invalidTeacherId", "Invalid teacher ID"));
      return;
    }

    const encryptedId = encryptId(teacherId);
    if (!encryptedId) {
      showError(t("failedToEncryptId", "Failed to encrypt teacher ID"));
      return;
    }

    navigate(`/teachers/edit?id=${encryptedId}&mode=edit`);
  };

  // Define table columns
  const tableColumns = [
    // Disabled: Select checkbox column
    // {
    //   key: 'select',
    //   header: (
    //     <input
    //       type="checkbox"
    //       checked={selectedTeachers.length === teachers.length && teachers.length > 0}
    //       onChange={handleSelectAll}
    //       className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
    //     />
    //   ),
    //   headerClassName: 'w-12',
    //   cellClassName: 'w-12',
    //   render: (teacher) => (
    //     <input
    //       type="checkbox"
    //       checked={selectedTeachers.some(t => t.id === teacher.id)}
    //       onChange={() => handleSelectTeacher(teacher)}
    //       className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
    //     />
    //   )
    // },
    {
      key: "name",
      header: t("name", "Name"),
      render: (teacher) => (
        <div className="flex items-center">
          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
            {getFullName(teacher, teacher.username || t("noName", "No Name"))}
          </div>
        </div>
      ),
    },
    {
      key: "username",
      header: t("username", "Username"),
      accessor: "username",
      cellClassName: "text-xs sm:text-sm text-gray-700",
      responsive: "hidden lg:table-cell",
      render: (teacher) => <p>{teacher.username || ""}</p>,
    },
    {
      key: "gradeLevel",
      header: t("gradeLevel", "Grade Level"),
      accessor: "gradeLevel",
      cellClassName: "text-xs sm:text-sm text-gray-700",
      responsive: "hidden xl:table-cell",
      render: (teacher) => {
        const level = teacher.gradeLevel;

        if (!level) {
          return <p></p>;
        }

        return <p> {getGradeLabel(String(level), t)}</p>;
      },
    },
    {
      key: "gender",
      header: t("gender", "Gender"),
      cellClassName: "text-xs sm:text-sm text-gray-700",
      responsive: "hidden lg:table-cell",
      render: (teacher) => {
        const genderDisplay =
          teacher.gender === "MALE" || teacher.gender === "male"
            ? t("male", "Male")
            : teacher.gender === "FEMALE" || teacher.gender === "female"
              ? t("female", "Female")
              : "-";
        return <p>{genderDisplay}</p>;
      },
    },
    {
      key: "employmentType",
      header: t("employmentType", "Employment Type"),
      cellClassName: "text-xs sm:text-sm text-gray-700",
      responsive: "hidden lg:table-cell",
      render: (teacher) => <p>{teacher.employmentType}</p>,
    },
    {
      key: "role",
      header: t("roles", "Role"),
      cellClassName: "text-xs sm:text-sm text-gray-700",
      responsive: "hidden lg:table-cell",
      render: (teacher) => <p>{getRoleName(teacher.roleId)}</p>,
    },
    {
      key: "classes",
      header: t("classes", "Classes"),
      cellClassName: "text-xs sm:text-sm text-gray-700",
      responsive: "hidden lg:table-cell",
      render: (teacher) => (
        <div className="flex flex-wrap gap-1">
          {teacher.classes && teacher.classes.length > 0 ? (
            teacher.classes.map((classItem, index) => (
              <Badge
                key={classItem.classId || index}
                color="blue"
                variant="filled"
                size="xs"
                className="pt-1"
              >
                {(() => {
                  const rawGradeLevel =
                    typeof classItem.gradeLevel !== "undefined" &&
                    classItem.gradeLevel !== null
                      ? String(classItem.gradeLevel)
                      : "";

                  const displayGradeLevel =
                    rawGradeLevel === "0"
                      ? t("grade0", "Kindergarten")
                      : rawGradeLevel;

                  return `${t("class") || "Class"} ${formatClassIdentifier(displayGradeLevel, classItem.section)}`;
                })()}
              </Badge>
            ))
          ) : (
            <Badge color="red" variant="filled" size="xs">
              {t("noClasses", "No classes")}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: t("actions", "Actions"),
      headerClassName: "relative",
      cellClassName: "text-left text-sm font-medium",
      render: (teacher) => (
        <div className="flex items-center space-x-1">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleViewTeacher(teacher);
            }}
            variant="ghost"
            size="sm"
            className="text-green-600 hover:text-green-900 hover:bg-green-50 hover:scale-110"
            title={t("viewTeacher", "View teacher details")}
            disabled={
              loadingViewTeacherId ===
              (teacher.id || teacher.teacherId || teacher.userId)
            }
          >
            {loadingViewTeacherId ===
            (teacher.id || teacher.teacherId || teacher.userId) ? (
              <LoadingSpinner size="sm" variant="primary" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleEditTeacher(teacher);
            }}
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 hover:scale-110"
            title={t("editTeacher", "Edit teacher")}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleUserStatus(teacher);
            }}
            disabled={teacher.roleId === 14}
            variant="ghost"
            size="sm"
            className={
              teacher.roleId === 14
                ? "text-gray-300 cursor-not-allowed opacity-50"
                : teacher.isActive
                  ? "text-orange-600 hover:text-orange-900 hover:bg-orange-50 hover:scale-110"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 hover:scale-110"
            }
            title={
              teacher.roleId === 14
                ? t(
                    "cannotChangeDirectorStatus",
                    "Cannot change director status",
                  )
                : teacher.isActive
                  ? t("deactivateTeacher", "Deactivate teacher")
                  : t("activateTeacher", "Activate teacher")
            }
          >
            {teacher.isActive ? (
              <Unlock className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
          </Button>
          {/*
          <Button
            onClick={() => showSuccess(t('featureComingSoon', 'This feature is coming soon'))}
            variant="ghost"
            size="sm"
            className="text-red-600 opacity-50 cursor-not-allowed"
            disabled
            title={t('deleteTeacher', 'Delete teacher (Coming Soon)')}
          >
            <MinusCircle className="h-4 w-4" />
          </Button>
           */}
        </div>
      ),
    },
  ];

  // Show error state if error exists
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() =>
          retry(() => {
            clearError();
            fetchSchoolId();
            fetchTeachers(true);
          })
        }
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Show initial loading state
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageLoader message={t("loadingTeachers", "Loading teachers...")} />
      </div>
    );
  }

  return (
    <PageTransition variant="fade" className="flex-1">
      <div className="p-3 sm:p-6">
        <FadeInSection delay={100} className=" my-4 sm:my-2 mx-2">
          <div className="flex sm:flex-row justify-between items-start mb-4">
            <div className="space-y-1">
              <h4 className="text-lg sm:text-xl font-bold text-gray-900">
                {t("teachersManagement", "Teachers Management")}
              </h4>
              <p className="text-sm text-gray-600">
                {t(
                  "manageTeacherRecords",
                  "Manage teacher records for your school",
                )}
              </p>
            </div>
            <Button
              onClick={handleAddTeacherClick}
              variant="success"
              size="sm"
              className="flex items-center gap-2"
              title={t("addTeacher", "Add Teacher")}
            >
              <Plus className="h-4 w-4" />
              <span className="sm:hidden">
                {t("addTeacher", "Add Teacher")}
              </span>
              <span className="hidden sm:inline">
                {t("addTeacher", "Add Teacher")}
              </span>
            </Button>
          </div>

          {/* Search Bar - Outside of Sidebar */}
          <div className="flex sm:flex-row gap-3 items-stretch sm:items-center mb-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-blue-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-8 py-2 border border-gray-200 rounded-sm leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition-colors"
                placeholder={t(
                  "searchTeachers",
                  "Search by name or username...",
                )}
                value={localSearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {localSearchTerm && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  title={t("clearSearch", "Clear search")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 sm:space-x-2">
              
              {/* Filter Button - Responsive (works on all screen sizes) */}
              <Button
                onClick={() => setShowMobileFilters(true)}
                variant="primary"
                size="sm"
                className="flex items-center justify-center sm:justify-start gap-2 shadow-lg whitespace-nowrap"
                title={t("filters", "Filters & Actions")}
              >
                <ListFilter className="h-4 w-4" />
                <span className="sm:hidden">
                  {t("filters", "Filters & Actions")}
                </span>
                <span className="hidden sm:inline">
                  {t("filters", "Filters")}
                </span>
                
              </Button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(selectedGradeLevel || selectedStatusFilter || selectedRoleId) && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-blue-900">
                {t("activeFilters", "Active Filters")}:
              </span>
              {selectedGradeLevel && (
                <Badge color="green" variant="outline" size="sm">
                  {t("gradeLevel", "Grade Level")}:{" "}
                  {getSharedGradeLevelOptions(t, false).find(
                    (g) => g.value === selectedGradeLevel,
                  )?.label || selectedGradeLevel}
                </Badge>
              )}
              {selectedStatusFilter && (
                <Badge color="blue" variant="outline" size="sm">
                  {t("status", "Status")}:{" "}
                  {selectedStatusFilter === "true"
                    ? t("active", "Active")
                    : t("inactive", "Inactive")}
                </Badge>
              )}
              {selectedRoleId && (
                <Badge color="purple" variant="outline" size="sm">
                  {t("roles", "Role")}:{" "}
                  {roleOptions.find((r) => r.value === selectedRoleId)?.label ||
                    selectedRoleId}
                </Badge>
              )}
            </div>
          )}

          {/* Mobile Filters Sidebar */}
          <SidebarFilter
            isOpen={showMobileFilters}
            onClose={() => setShowMobileFilters(false)}
            title={t("filters", "Filters & Actions")}
            subtitle={t(
              "manageTeacherRecords",
              "Manage your filters and actions",
            )}
            hasFilters={
              localSearchTerm ||
              selectedGradeLevel ||
              selectedStatusFilter ||
              selectedRoleId
            }
            onClearFilters={() => {
              handleSearchChange("");
              setSelectedGradeLevel("");
              setSelectedStatusFilter("");
              setSelectedRoleId("");
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            onApply={() => {
              setShowMobileFilters(false);
            }}
            children={
              <>
                {/* Grade Level Filter */}
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-2 uppercase">
                    {t("selectGrade", "Grade Level")}
                  </label>
                  <Dropdown
                    value={selectedGradeLevel}
                    onValueChange={(value) => {
                      setSelectedGradeLevel(value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    options={getGradeLevelOptions()}
                    placeholder={t("selectGradeLevel", "Select Grade Level")}
                    minWidth="w-full"
                    triggerClassName="text-sm w-full bg-gray-50 border-gray-200"
                  />
                </div>
                {/* Role Filter */}
                <div className="mt-4">
                  <label className="block text-gray-700 text-xs font-semibold mb-2 uppercase">
                    {t("roles", "Role")}
                  </label>
                  <Dropdown
                    value={selectedRoleId}
                    onValueChange={(value) => {
                      setSelectedRoleId(value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    options={[
                      { value: "", label: t("allRoles", "All Roles") },
                      ...roleOptions,
                    ]}
                    placeholder={t("selectRole", "Select Role")}
                    minWidth="w-full"
                    triggerClassName="text-sm w-full bg-gray-50 border-gray-200"
                  />
                </div>

                {/* Active Status Filter */}
                <div className="mt-4">
                  <label className="block text-gray-700 text-xs font-semibold mb-2 uppercase">
                    {t("status", "Status")}
                  </label>
                  <Dropdown
                    value={selectedStatusFilter}
                    onValueChange={(value) => {
                      setSelectedStatusFilter(value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    options={[
                      { value: "", label: t("allStatuses", "All Statuses") },
                      { value: "true", label: t("active", "Active") },
                      { value: "false", label: t("inactive", "Inactive") },
                    ]}
                    placeholder={t("selectStatus", "Select Status")}
                    minWidth="w-full"
                    triggerClassName="text-sm w-full bg-gray-50 border-gray-200"
                  />
                </div>
              </>
            }
            actionsContent={
              <>
                {/* Disabled: Select All / Deselect All Button */}
                {/* {teachers.length > 0 && (
                <Button
                  onClick={() => {
                    handleSelectAll();
                    setShowMobileFilters(false);
                  }}
                  variant={selectedTeachers.length > 0 ? "danger" : "primary"}
                  size="sm"
                  disabled={selectingAll}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {selectingAll ? (
                    <DynamicLoader
                      type="spinner"
                      size="sm"
                      variant="white"
                      message={t('selectingAll') || 'Selecting...'}
                    />
                  ) : selectedTeachers.length === teachers.length && teachers.length > 0 ? (
                    <>
                      <X className="h-4 w-4" />
                      <span>{t('deselectAll', 'Deselect All')}</span>
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4" />
                      <span>{t('selectAll', 'Select All')}</span>
                    </>
                  )}
                </Button>
              )} */}

                {/* Disabled: View Selected Teachers Button */}
                {/* {selectedTeachers.length > 0 && (
                <button
                  onClick={() => {
                    setShowTeachersManagerOpen(true);
                    setShowMobileFilters(false);
                  }}
                  className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 font-medium py-2.5 px-3 rounded-lg flex items-center gap-2.5 transition-colors text-sm"
                >
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="flex-1 text-left">{t('viewSelected', 'View Selected')}</span>
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded font-bold">
                    {selectedTeachers.length}
                  </span>
                </button>
              )} */}

                {/* Export Button */}
                {teachers.length > 0 && (
                  <button
                    onClick={() => {
                      handleExportExcel();
                      setShowMobileFilters(false);
                    }}
                    className="w-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-medium py-2.5 px-3 rounded-lg flex items-center gap-2.5 transition-colors text-sm"
                  >
                    <Download className="h-4 w-4 text-purple-500" />
                    <span className="flex-1 text-left">
                      {t("exportToExcel", "Export to Excel")}
                    </span>
                  </button>
                )}

                {/* Add Teacher Button */}
                {/* 
              <button
                onClick={() => {
                  showSuccess(t('featureComingSoon', 'This feature is coming soon'));
                  setShowMobileFilters(false);
                }}
                className="w-full bg-green-50 hover:bg-green-100 border border-green-200 text-green-900 font-medium py-2.5 px-3 rounded-lg flex items-center gap-2.5 transition-colors text-sm"
              >
                <Plus className="h-4 w-4 text-green-500" />
                <span className="flex-1 text-left">{t('addTeacher', 'Add Teacher')}</span>
              </button>
              */}
              </>
            }
          />

          {paginationLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" variant="primary">
                {t("loadingPage", "Loading page...")}
              </LoadingSpinner>
            </div>
          ) : (
            <Table
              columns={tableColumns}
              data={teachers}
              loading={tableLoading || isLoading("fetchTeachers")}
              emptyMessage={t("noTeachersFound", "No teachers found")}
              emptyIcon={Users}
              emptyVariant="info"
              emptyDescription={t("noDataFound", "No data found")}
              emptyActionLabel={
                localSearchTerm ? t("clearSearch", "Clear search") : undefined
              }
              onEmptyAction={
                localSearchTerm ? () => handleSearchChange("") : undefined
              }
              showPagination={true}
              pagination={pagination}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              limitOptions={[10, 25, 50]}
              showLimitSelector={true}
              rowClassName="hover:bg-blue-50"
              t={t}
              disabled={tableLoading}
            />
          )}
        </FadeInSection>
      </div>
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteTeacher}
        title={t("deleteTeacher", "Delete Teacher")}
        message={`${t("confirmDeleteTeacher", "Are you sure you want to delete")} ${getFullName(selectedTeacher, t("thisTeacher", "this teacher"))}? ${t("thisActionCannotBeUndone", "This action cannot be undone.")}`}
        confirmText={
          isLoading("deleteTeacher")
            ? t("deleting", "Deleting...")
            : t("delete", "Delete")
        }
        type="danger"
        cancelText={t("cancel", "Cancel")}
        loading={isLoading("deleteTeacher")}
      />

      <ConfirmDialog
        isOpen={showStatusDialog}
        onClose={() => {
          setShowStatusDialog(false);
          setSelectedTeacher(null);
        }}
        onConfirm={handleConfirmStatusChange}
        title={
          selectedTeacher?.isActive
            ? t("deactivateTeacher", "Deactivate Teacher")
            : t("activateTeacher", "Activate Teacher")
        }
        message={
          selectedTeacher?.isActive
            ? t(
                "confirmDeactivateTeacher",
                "Are you sure you want to deactivate this teacher? They will no longer be able to access the system.",
              )
            : t(
                "confirmActivateTeacher",
                "Are you sure you want to activate this teacher? They will be able to access the system.",
              )
        }
        type={selectedTeacher?.isActive ? "warning" : "info"}
        confirmText={
          loading
            ? t("updating", "Updating...")
            : selectedTeacher?.isActive
              ? t("deactivate", "Deactivate")
              : t("activate", "Activate")
        }
        cancelText={t("cancel", "Cancel")}
        loading={loading}
      />

      {/* View Teacher Modal */}
      <TeacherViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewingTeacher(null);
        }}
        teacher={viewingTeacher}
      />

      {/* Disabled: Selected Teachers Modal */}
      {/* <Modal
        isOpen={showTeachersManagerOpen}
        onClose={() => setShowTeachersManagerOpen(false)}
        title={
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>{t('selectedTeachers', 'Selected Teachers')}</span>
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
              {selectedTeachers.length}
            </span>
          </div>
        }
        size="lg"
        height="xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" size="sm" onClick={clearAllTeachers}>
              {t('clearSelection', 'Clear Selection')}
            </Button>
          </div>
        }
      >
        {selectedTeachers.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            {t('noTeachersSelected', 'No teachers selected')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedTeachers.map((teacher) => {
              const displayName = getFullName(teacher, teacher.username || `Teacher ${teacher.id}`);
              const subtitle = [teacher.email, teacher.phone].filter(Boolean).join(' • ');
              return (
                <SelectedCard
                  key={teacher.id}
                  title={displayName}
                  subtitle={subtitle}
                  statusColor="purple"
                  onRemove={() => setSelectedTeachers(prev => prev.filter(t => t.id !== teacher.id))}
                />
              );
            })}
          </div>
        )}
      </Modal> */}
    </PageTransition>
  );
}
