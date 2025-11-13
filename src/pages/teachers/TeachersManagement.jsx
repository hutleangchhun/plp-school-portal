import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Plus, MinusCircle, Edit2, Users, Download, X, Filter, User } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { teacherService } from '../../utils/api/services/teacherService';
import { userService } from '../../utils/api/services/userService';
import { useStableCallback, useRenderTracker } from '../../utils/reactOptimization';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { exportTeachersToExcel, exportTeachersToCSV, exportTeachersToPDF, getTimestampedFilename } from '../../utils/exportUtils';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import TeacherEditModal from '../../components/teachers/TeacherEditModal';
import TeacherViewModal from '../../components/teachers/TeacherViewModal';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import Modal from '../../components/ui/Modal';
import SelectedCard from '../../components/ui/SelectedCard';
import Dropdown from '../../components/ui/Dropdown';
import SidebarFilter from '../../components/ui/SidebarFilter';

export default function TeachersManagement() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { error, handleError, clearError, retry } = useErrorHandler();
  const { startLoading, stopLoading, isLoading } = useLoading();

  // Track renders to detect infinite loops (development only)
  useRenderTracker('TeachersManagement');

  // Get authenticated user data
  const [user, setUser] = useState(() => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (err) {
      console.error('Error parsing user data from localStorage:', err);
      return null;
    }
  });

  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          console.log('🔄 localStorage changed in TeachersManagement, updating user state:', parsedUser);
          setUser(parsedUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error parsing updated user data:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userDataUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userDataUpdated', handleStorageChange);
    };
  }, []);

  // State for current user's school ID
  const [schoolId, setSchoolId] = useState(null);
  const [schoolName, setSchoolName] = useState('');

  // State for teachers list and pagination
  const [teachers, setTeachers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // Other state variables
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [viewingTeacher, setViewingTeacher] = useState(null);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [showTeachersManagerOpen, setShowTeachersManagerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const fetchingRef = useRef(false);
  const lastFetchParams = useRef(null);
  const searchTimeoutRef = useRef(null);

  // State for all teachers (unfiltered) and filtered teachers
  const [allTeachers, setAllTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);

  // Enhanced client-side search function
  const performClientSideSearch = useCallback((teachersData, searchQuery) => {
    if (!searchQuery || searchQuery.trim() === '') {
      return teachersData;
    }

    const query = searchQuery.trim().toLowerCase();

    return teachersData.filter(teacher => {
      const searchFields = [
        teacher.firstName || '',
        teacher.lastName || '',
        teacher.username || '',
        teacher.email || '',
        teacher.phone || '',
        (teacher.name || ''),
        (teacher.firstName && teacher.lastName ? `${teacher.firstName} ${teacher.lastName}` : '')
      ];

      return searchFields.some(field =>
        field.toLowerCase().includes(query)
      );
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
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 500);
  }, []);

  // Fetch current user's school ID
  const fetchSchoolId = useStableCallback(async () => {
    try {
      if (schoolId) {
        console.log('School ID already available:', schoolId);
        return;
      }

      console.log('Fetching school ID from my-account endpoint...');
      const accountData = await userService.getMyAccount();
      console.log('📥 Full my-account response in TeachersManagement:', accountData);

      if (accountData && accountData.school_id) {
        console.log('✅ School ID fetched from account:', accountData.school_id);
        setSchoolId(accountData.school_id);
        setSchoolName(accountData.school?.name || '');
      } else {
        console.error('No school_id found in account data:', accountData);
        showError(t('noSchoolIdFound', 'No school ID found for your account'));
      }
    } catch (err) {
      console.error('Error fetching school ID:', err);
      handleError(err, {
        toastMessage: t('failedToFetchSchoolId', 'Failed to fetch school information')
      });
    }
  }, [schoolId, showError, t, handleError]);

  // Fetch teachers from the school
  const fetchTeachers = useStableCallback(async (force = false) => {
    if (!schoolId) {
      console.log('No school ID available, skipping teacher fetch...');
      return;
    }

    const currentParams = JSON.stringify({
      search: searchTerm,
      gradeLevel: selectedGradeLevel,
      schoolId,
      page: pagination.page,
      limit: pagination.limit
    });

    if (!force && (fetchingRef.current || lastFetchParams.current === currentParams)) {
      console.log('Skipping duplicate fetch with same parameters');
      return;
    }

    fetchingRef.current = true;
    lastFetchParams.current = currentParams;

    try {
      setLoading(true);

      console.log(`=== FETCH TEACHERS ===`);
      console.log(`School ID: ${schoolId}`);
      console.log(`Search term: ${searchTerm}`);
      console.log(`Grade Level: ${selectedGradeLevel}`);
      console.log(`Page: ${pagination.page}, Limit: ${pagination.limit}`);

      // Build request parameters with search, grade level, and pagination
      const requestParams = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (searchTerm && searchTerm.trim()) {
        requestParams.search = searchTerm.trim();
      }
      if (selectedGradeLevel && selectedGradeLevel !== '') {
        requestParams.grade_level = selectedGradeLevel;
      }

      const response = await teacherService.getTeachersBySchool(schoolId, requestParams);

      console.log('=== API RESPONSE (TEACHERS) ===');
      console.log('Full API response:', response);
      console.log('Response success:', response?.success);
      console.log('Response data length:', response?.data?.length);
      console.log('=== END API RESPONSE ===');

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch teachers from school');
      }

      let data = response.data || [];

      console.log(`Fetched ${data.length} teachers from school ${schoolId}`);
      console.log('Raw teacher data:', data);

      // Map backend data structure to component format
      data = data.map(teacher => ({
        id: teacher.teacherId,
        teacherId: teacher.teacherId,
        userId: teacher.userId,
        username: teacher.user?.username || '',
        firstName: teacher.user?.first_name || '',
        lastName: teacher.user?.last_name || '',
        name: `${teacher.user?.first_name || ''} ${teacher.user?.last_name || ''}`.trim(),
        email: teacher.user?.email || '',
        phone: teacher.user?.phone || '',
        schoolId: teacher.schoolId,
        schoolName: teacher.school?.name || '',
        hireDate: teacher.hire_date,
        gradeLevel: teacher.gradeLevel || null,
        employmentType: teacher.employment_type || '',
        isDirector: teacher.isDirector,
        status: teacher.status,
        isActive: teacher.status === 'ACTIVE',
        classes: teacher.classes || []
      }));

      console.log('Mapped teacher data:', data);

      // Use server-side filtered and paginated data directly
      setAllTeachers(data);
      setFilteredTeachers(data);
      setTeachers(data);
      
      // Update pagination info from API response
      console.log('API Pagination metadata:', response.pagination);
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination.total,
          pages: response.pagination.pages
        }));
      } else {
        // Fallback if API doesn't return pagination metadata
        console.warn('No pagination metadata in API response, using data.length');
        setPagination(prev => ({
          ...prev,
          total: data.length,
          pages: Math.ceil(data.length / prev.limit)
        }));
      }
      
      setDataFetched(true); // Mark data as fetched after successful API call
      setInitialLoading(false); // End initial loading after successful data fetch

    } catch (err) {
      console.error('Error fetching teachers from school:', err);
      handleError(err, {
        toastMessage: t('errorFetchingTeachers', 'Failed to fetch teachers')
      });
      setTeachers([]);
      setAllTeachers([]);
      setFilteredTeachers([]);
      setDataFetched(true); // Mark data as fetched even on error
      setInitialLoading(false); // End initial loading even on error
    } finally {
      stopLoading('fetchTeachers');
      fetchingRef.current = false;
    }
  }, [schoolId, searchTerm, selectedGradeLevel, pagination.page, pagination.limit, showError, t, handleError, stopLoading]);

  // Initialize school ID and fetch teachers
  useEffect(() => {
    console.log('🔄 Component mounted, fetching school ID...');
    fetchSchoolId();
  }, [fetchSchoolId]);

  // Fetch teachers when school ID becomes available
  useEffect(() => {
    if (schoolId && !dataFetched) {
      console.log('School ID available, fetching teachers...');
      fetchTeachers(true); // Let fetchTeachers handle loading states
    }
  }, [schoolId, fetchTeachers, dataFetched]);

  // Memoized fetch parameters
  const fetchParams = useMemo(() => ({
    searchTerm,
    selectedGradeLevel,
    schoolId,
    page: pagination.page,
    limit: pagination.limit
  }), [searchTerm, selectedGradeLevel, schoolId, pagination.page, pagination.limit]);

  // Handle fetch on parameter changes
  useEffect(() => {
    if (!schoolId || !dataFetched) return;

    const isSearchChange = fetchParams.searchTerm.trim() !== '';
    const delay = isSearchChange ? 500 : 100;

    const timer = setTimeout(() => {
      if (!fetchingRef.current) {
        fetchTeachers(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [fetchParams, fetchTeachers, schoolId, dataFetched]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportDropdown && !event.target.closest('.export-dropdown')) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  // Handle delete teacher
  const handleDeleteTeacher = async () => {
    showSuccess(t('featureComingSoon', 'This feature is coming soon'));
    setShowDeleteDialog(false);
    setSelectedTeacher(null);
  };

  // Export handlers - Export in Cambodian school format
  const handleExportExcel = async () => {
    try {
      // Dynamically import xlsx-js-style for styling support
      const XLSXStyleModule = await import('xlsx-js-style');
      const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

      // Get filter title based on applied filters
      const getFilterTitle = () => {
        const filterParts = [];
        if (selectedGradeLevel) {
          filterParts.push(`${t('gradeLevel')}: ${selectedGradeLevel}`);
        }
        if (searchTerm) {
          filterParts.push(`${t('search')}: ${searchTerm}`);
        }
        
        const filterText = filterParts.length > 0 ? ` (${filterParts.join(', ')})` : '';
        return `បញ្ជីរាយនាមគ្រូបង្រៀន${filterText}`;
      };

      // Create comprehensive template with Cambodian school headers
      const templateData = [
        // Official Cambodian School Header - Row 1
        ['ព្រះរាជាណាចក្រកម្ពុជា', '', '', '', '', '', '', '', '', '', ''],
        // Nation, Religion, King - Row 2
        ['ជាតិ       សាសនា       ព្រះមហាក្សត្រ', '', '', '', '', '', '', '', '', '', ''],
        // School Name - Row 3
        [schoolName || 'សាលាបឋមសិក្សា ហ៊ុន សែន ព្រែកគយ', '', '', '', '', '', '', '', '', '', ''],
        // Teacher List Title - Row 4
        [getFilterTitle(), '', '', '', '', '', '', '', '', '', ''],
        // Academic Year - Row 5
        [`ឆ្នាំសិក្សា ${new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)}`, '', '', '', '', '', '', '', '', '', ''],
        // Empty row for spacing - Row 6
        ['', '', '', '', '', '', '', '', '', '', ''],
        // Instructions row (row 7)
        ['', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', ''],
        // Sub headers (row 9)
        [
          '#',
          'អត្តលេខ', 'គោត្តនាម', 'នាម', 'លេខទូរស័ព្ទ', 'ភេទ', 'ថ្ងៃកំណើត', 'សញ្ជាតិ', 'តួរនាទី',
          'អាសយដ្ឋានពេញ',
          'ថ្នាក់ដែលបង្រៀន'
        ]
      ];

      // Add teacher data rows
      teachers.forEach((teacher, index) => {
        // Format date of birth
        const dob = teacher.dateOfBirth || teacher.date_of_birth;
        const formattedDob = dob ? formatDateKhmer(dob, 'dateOnly') : '';

        // Format gender
        const gender = teacher.gender === 'MALE' || teacher.gender === 'male' ? 'ប្រុស' :
          teacher.gender === 'FEMALE' || teacher.gender === 'female' ? 'ស្រី' : '';

        // Format role (position)
        const role = teacher.isDirector ? 'នាយក' : 'គ្រូបង្រៀន'; // Director or Teacher

        // Format full address for teacher
        const teacherAddress = [
          teacher.residence?.village || teacher.village,
          teacher.residence?.commune || teacher.commune,
          teacher.residence?.district || teacher.district,
          teacher.residence?.province || teacher.province
        ].filter(Boolean).join(' ');

        // Format classes taught by teacher
        const classesTaught = teacher.classes && teacher.classes.length > 0
          ? teacher.classes.map(cls => cls.name || `${cls.gradeLevel}${cls.section}`).join(', ')
          : '';

        const row = [
          index + 1, // Row number
          teacher.teacherId || teacher.id || '', // អត្តលេខ
          teacher.lastName || teacher.last_name || '', // គោត្តនាម
          teacher.firstName || teacher.first_name || '', // នាម
          teacher.phone || '', // លេខទូរស័ព្ទ
          gender, // ភេទ
          formattedDob, // ថ្ងៃកំណើត
          teacher.nationality || 'ខ្មែរ', // សញ្ជាតិ
          role, // តំណែង
          teacherAddress, // អាសយដ្ឋានពេញ
          classesTaught // ថ្នាក់ដែលបង្រៀន
        ];

        templateData.push(row);
      });

      // Create worksheet
      const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

      // Set column widths
      ws['!cols'] = [
        { wch: 5 },  // #
        { wch: 12 }, // អត្តលេខ
        { wch: 12 }, // គោត្តនាម
        { wch: 12 }, // នាម
        { wch: 12 }, // លេខទូរស័ព្ទ
        { wch: 8 },  // ភេទ
        { wch: 12 }, // ថ្ងៃកំណើត
        { wch: 10 }, // សញ្ជាតិ
        { wch: 12 }, // តំណែង
        { wch: 40 }, // អាសយដ្ឋានពេញ
        { wch: 20 }  // ថ្នាក់ដែលបង្រៀន
      ];

      // Apply styling
      const range = XLSXStyle.utils.decode_range(ws['!ref']);
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });

          if (!ws[cellAddress]) {
            ws[cellAddress] = { t: 's', v: '' };
          }

          // Header rows (0-6) - No borders, centered, bold
          if (R < 7) {
            ws[cellAddress].s = {
              alignment: { vertical: 'center', horizontal: 'center' },
              font: { name: 'Khmer OS Battambang', sz: 11, bold: true }
            };
          }
          // Instructions row (7)
          else if (R === 7) {
            ws[cellAddress].s = {
              alignment: { vertical: 'center', horizontal: 'left' },
              font: { name: 'Khmer OS Battambang', sz: 9, italic: true },
              fill: { fgColor: { rgb: 'FFF9E6' } }
            };
          }
          // Headers (8-9) - Gray background, borders, bold
          else if (R === 8) {
            ws[cellAddress].s = {
              fill: { fgColor: { rgb: 'E0E0E0' } },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              },
              alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
              font: { name: 'Khmer OS Battambang', sz: 10, bold: true }
            };
          }
          // Data rows (10+) - Reduced borders (only top and bottom)
          else {
            ws[cellAddress].s = {
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: {style: 'thin', color: { rgb: '000000' }  }
              },
              alignment: { vertical: 'center', horizontal: 'left' },
              font: { name: 'Khmer OS Battambang', sz: 10 }
            };
          }
        }
      }

      // Merge cells for headers
      ws['!merges'] = [
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
      XLSXStyle.utils.book_append_sheet(wb, ws, 'បញ្ជីគ្រូបង្រៀន');

      // Generate filename with filter information
      let filenameBase = 'teachers_data';
      if (selectedGradeLevel || searchTerm) {
        const filterParts = [];
        if (selectedGradeLevel) {
          filterParts.push(`grade_${selectedGradeLevel}`);
        }
        if (searchTerm) {
          // Sanitize search term for filename
          const sanitizedSearch = searchTerm.replace(/[^a-zA-Z0-9_\u1780-\u17ff\-]/g, '_').substring(0, 20);
          filterParts.push(`search_${sanitizedSearch}`);
        }
        filenameBase += '_' + filterParts.join('_');
      }
      
      const filename = getTimestampedFilename(filenameBase, 'xlsx');

      // Export file
      XLSXStyle.writeFile(wb, filename);

      showSuccess(t('exportSuccess', 'Data exported successfully'));
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Export error:', error);
      showError(t('exportError', 'Failed to export data'));
    }
  };

  // Handle select teacher
  const handleSelectTeacher = (teacher) => {
    setSelectedTeachers(prev => {
      const isSelected = prev.some(t => t.id === teacher.id);
      if (isSelected) {
        return prev.filter(t => t.id !== teacher.id);
      } else {
        return [...prev, teacher];
      }
    });
  };

  // Handle select all teachers on current page
  const handleSelectAll = async () => {
    if (selectingAll) return;

    // If all teachers are already selected, deselect all
    if (selectedTeachers.length === teachers.length && teachers.length > 0) {
      clearAllTeachers();
      showSuccess(t('deselectedAllTeachers', 'All teachers deselected'));
      return;
    }

    // Otherwise, select all teachers with loading animation
    try {
      setSelectingAll(true);

      // Select teachers in batches to avoid blocking the UI
      const batchSize = 50;
      let selectedCount = 0;

      for (let i = 0; i < teachers.length; i += batchSize) {
        const batch = teachers.slice(i, i + batchSize);

        // Use setTimeout to yield control to the UI between batches
        await new Promise(resolve => {
          setTimeout(() => {
            batch.forEach(teacher => {
              if (!selectedTeachers.some(t => t.id === teacher.id)) {
                handleSelectTeacher(teacher);
                selectedCount++;
              }
            });
            resolve();
          }, 0);
        });
      }

      if (selectedCount > 0) {
        showSuccess(
          t('selectedAllTeachers') ||
          `Selected ${selectedCount} teacher${selectedCount !== 1 ? 's' : ''}`
        );
      }
    } catch (error) {
      console.error('Error selecting all teachers:', error);
      showError(t('errorSelectingAllTeachers', 'Failed to select all teachers'));
    } finally {
      setSelectingAll(false);
    }
  };

  // Clear all selected teachers
  const clearAllTeachers = () => {
    setSelectedTeachers([]);
  };

  // Handle view teacher
  const handleViewTeacher = (teacher) => {
    console.log('View button clicked for teacher:', teacher);
    setViewingTeacher(teacher);
    setShowViewModal(true);
  };

  // Handle edit teacher
  const handleEditTeacher = (teacher) => {
    console.log('Edit button clicked for teacher:', teacher);
    setEditingTeacher(teacher);
    setShowEditModal(true);
  };

  // Handle successful teacher update from modal
  const handleTeacherUpdated = (updatedTeacher) => {
    console.log('Teacher updated successfully:', updatedTeacher);
    setShowEditModal(false);
    setEditingTeacher(null);
    // Refresh the teacher list
    setTimeout(async () => {
      await fetchTeachers(true);
    }, 500);
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
      key: 'name',
      header: t('name', 'Name'),
      render: (teacher) => (
        <div className="flex items-center">
            <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
              {teacher.name || (teacher.firstName || teacher.lastName
                ? `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim()
                : teacher.username || t('noName', 'No Name'))}
            </div>
        </div>
      )
    },
    {
      key: 'username',
      header: t('username', 'Username'),
      accessor: 'username',
      cellClassName: 'text-xs sm:text-sm text-gray-700',
      responsive: 'hidden lg:table-cell',
      render: (teacher) => (
        <p>{teacher.username || 'N/A'}</p>
      )
    },
    {
      key: 'gradeLevel',
      header: t('gradeLevel', 'Grade Level'),
      accessor: 'gradeLevel',
      cellClassName: 'text-xs sm:text-sm text-gray-700',
      responsive: 'hidden xl:table-cell',
      render: (teacher) => (
        <p>
          {teacher.gradeLevel 
            ? `${t('grade', 'Grade')} ${teacher.gradeLevel}` 
            : t('notAssigned', 'Not Assigned')}
        </p>
      )
    },
    {
      key: 'employmentType',
      header: t('employmentType', 'Employment Type'),
      cellClassName: 'text-xs sm:text-sm text-gray-700',
      responsive: 'hidden lg:table-cell',
      render: (teacher) => (
        <p>{teacher.employmentType}</p>
      )
    },
    {
      key: 'classes',
      header: t('classes', 'Classes'),
      cellClassName: 'text-xs sm:text-sm text-gray-700',
      responsive: 'hidden lg:table-cell',
      render: (teacher) => (
        <div className="flex flex-wrap gap-1">
          {teacher.classes && teacher.classes.length > 0 ? (
            teacher.classes.map((classItem, index) => (
              <Badge
                key={classItem.classId || index}
                color="blue"
                variant="filled"
                size="xs"
                className='pt-1'
              >
                {classItem.name || `${classItem.gradeLevel}${classItem.section}`}
              </Badge>
            ))
          ) : (
            <Badge color='red' variant='filled' size='xs'>{t('noClasses', 'No classes')}</Badge>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: t('actions', 'Actions'),
      headerClassName: 'relative',
      cellClassName: 'text-left text-sm font-medium',
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
            title={t('viewTeacher', 'View teacher details')}
          >
            <User className="h-4 w-4" />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleEditTeacher(teacher);
            }}
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 hover:scale-110"
            title={t('editTeacher', 'Edit teacher')}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
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
        </div>
      )
    }
  ];

  // Show error state if error exists
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => retry(() => {
          clearError();
          fetchSchoolId();
          fetchTeachers(true);
        })}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Show initial loading state
  if (initialLoading) {
    return (
      <PageLoader
        message={t('loadingTeachers', 'Loading teachers...')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  return (
    <div variant='fade' className="p-3 sm:p-4">
      <div className=" p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          <div>
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">{t('teachersManagement', 'Teachers Management')}</h1>
            </div>
            <div className="mt-1 space-y-1">
              <div className="flex items-center space-x-4">
                <p className="text-sm text-gray-600">
                  {t('manageTeacherRecords', 'Manage teacher records for your school')}
                </p>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">
                    {teachers.length} {teachers.length === 1 ? t('teacher', 'teacher') : t('teachers', 'teachers')}
                    {localSearchTerm && allTeachers.length !== teachers.length && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({t('filteredFrom', 'filtered from')} {allTeachers.length})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:space-x-2">
            {/* Disabled: View Selected Teachers Button */}
            {/* {selectedTeachers.length > 0 && (
              <Button
                onClick={() => setShowTeachersManagerOpen(true)}
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex shadow-lg"
              >
                <Users className="h-4 w-4 mr-1.5" />
                <span>{t('viewSelected', 'View Selected')} ({selectedTeachers.length})</span>
              </Button>
            )} */}

            {/* Filter Button - Responsive (works on all screen sizes) */}
            <Button
              onClick={() => setShowMobileFilters(true)}
              variant="primary"
              size="sm"
              className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 shadow-lg"
              title={t('filters', 'Filters & Actions')}
            >
              <Filter className="h-4 w-4" />
              <span className="sm:hidden">{t('filters', 'Filters & Actions')}</span>
              <span className="hidden sm:inline">{t('filters', 'Filters')}</span>
              {(localSearchTerm || selectedGradeLevel) && (
                <span className="ml-auto sm:ml-1 bg-white text-blue-600 text-xs font-bold px-2.5 sm:px-2 py-0.5 rounded-full">
                  {(localSearchTerm ? 1 : 0) + (selectedGradeLevel ? 1 : 0)}
                </span>
              )}
            </Button>

          </div>
        </div>

        {/* Mobile Filters Sidebar */}
        <SidebarFilter
          isOpen={showMobileFilters}
          onClose={() => setShowMobileFilters(false)}
          title={t('filters', 'Filters & Actions')}
          subtitle={t('manageTeacherRecords', 'Manage your filters and actions')}
          hasFilters={localSearchTerm || selectedGradeLevel}
          onClearFilters={() => {
            handleSearchChange('');
            setSelectedGradeLevel('');
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          onApply={() => {}}
          children={
            <>
              {/* Search Input */}
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-2 uppercase">{t('search', 'Search')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-blue-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition-colors"
                    placeholder={t('searchTeachers', 'Search by name or username...')}
                    value={localSearchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                  {localSearchTerm && (
                    <button
                      onClick={() => handleSearchChange('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      title={t('clearSearch', 'Clear search')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Grade Level Filter */}
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-2 uppercase">{t('selectGrade', 'Grade Level')}</label>
                <Dropdown
                  value={selectedGradeLevel}
                  onValueChange={(value) => {
                    setSelectedGradeLevel(value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  options={[
                    { value: '', label: t('allGrades', 'All Grades') },
                    { value: '1', label: t('grade1', 'Grade 1') },
                    { value: '2', label: t('grade2', 'Grade 2') },
                    { value: '3', label: t('grade3', 'Grade 3') },
                    { value: '4', label: t('grade4', 'Grade 4') },
                    { value: '5', label: t('grade5', 'Grade 5') },
                    { value: '6', label: t('grade6', 'Grade 6') }
                  ]}
                  placeholder={t('selectGrade', 'Select Grade')}
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
                  <span className="flex-1 text-left">{t('exportToExcel', 'Export to Excel')}</span>
                </button>
              )}

              {/* Add Teacher Button */}
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
            </>
          }
        />

        <Table
          columns={tableColumns}
          data={teachers}
          loading={isLoading('fetchTeachers')}
          emptyMessage={t('noTeachersFound', 'No teachers found')}
          emptyIcon={Users}
          emptyVariant='info'
          emptyDescription={t('noDataFound', 'No data found')}
          emptyActionLabel={localSearchTerm ? t('clearSearch', 'Clear search') : undefined}
          onEmptyAction={localSearchTerm ? () => handleSearchChange('') : undefined}
          showPagination={true}
          pagination={pagination}
          onPageChange={handlePageChange}
          rowClassName="hover:bg-blue-50"
          t={t}
        />
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteTeacher}
        title={t('deleteTeacher', 'Delete Teacher')}
        message={`${t('confirmDeleteTeacher', 'Are you sure you want to delete')} ${selectedTeacher?.firstName || t('thisTeacher', 'this teacher')}? ${t('thisActionCannotBeUndone', 'This action cannot be undone.')}`}
        confirmText={isLoading('deleteTeacher') ? t('deleting', 'Deleting...') : t('delete', 'Delete')}
        confirmVariant="danger"
        cancelText={t('cancel', 'Cancel')}
        isConfirming={isLoading('deleteTeacher')}
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

      {/* Edit Teacher Modal */}
      <TeacherEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTeacher(null);
        }}
        teacher={editingTeacher}
        onTeacherUpdated={handleTeacherUpdated}
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
              const displayName = teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username || `Teacher ${teacher.id}`;
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
    </div>
  );
}
