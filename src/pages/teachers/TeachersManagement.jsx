import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Plus, MinusCircle, Edit2, User, Users, ChevronDown, Download, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { teacherService } from '../../utils/api/services/teacherService';
import { userService } from '../../utils/api/services/userService';
import { useStableCallback, useRenderTracker } from '../../utils/reactOptimization';
import { Badge } from '../../components/ui/Badge';
import { Table, MobileCards } from '../../components/ui/Table';
import { exportTeachersToExcel, exportTeachersToCSV, exportTeachersToPDF, getTimestampedFilename } from '../../utils/exportUtils';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import TeacherEditModal from '../../components/teachers/TeacherEditModal';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import Modal from '../../components/ui/Modal';
import SelectedCard from '../../components/ui/SelectedCard';
import Dropdown from '../../components/ui/Dropdown';

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
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [showTeachersManagerOpen, setShowTeachersManagerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
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
        username: teacher.user?.username || 'N/A',
        firstName: teacher.user?.first_name || '',
        lastName: teacher.user?.last_name || '',
        name: `${teacher.user?.first_name || ''} ${teacher.user?.last_name || ''}`.trim(),
        email: teacher.user?.email || 'N/A',
        phone: teacher.user?.phone || 'N/A',
        schoolId: teacher.schoolId,
        schoolName: teacher.school?.name || 'N/A',
        hireDate: teacher.hire_date,
        gradeLevel: teacher.gradeLevel || null,
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
        ['ព្រះរាជាណាចក្រកម្ពុជា', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // Nation, Religion, King - Row 2
        ['ជាតិ       សាសនា       ព្រះមហាក្សត្រ', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // School Name - Row 3
        [schoolName || 'សាលាបឋមសិក្សា ហ៊ុន សែន ព្រែកគយ', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // Teacher List Title - Row 4
        [getFilterTitle(), '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // Academic Year - Row 5
        [`ឆ្នាំសិក្សា ${new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // Empty row for spacing - Row 6
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // Instructions row (row 7)
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // Main headers (row 8)
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        // Main headers (row 9)
        [
          '#',
          'សេចក្ដីផ្សេងៗ', 'សេចក្ដីផ្សេងៗ', 'សេចក្ដីផ្សេងៗ', 'សេចក្ដីផ្សេងៗ', 'សេចក្ដីផ្សេងៗ', 'សេចក្ដីផ្សេងៗ', 'សេចក្ដីផ្សេងៗ', 'សេចក្ដីផ្សេងៗ', 'សេចក្ដីផ្សេងៗ', 'សេចក្ដីផ្សេងៗ',
          'ថ្នាក់ដែលបង្រៀន'
        ],
        // Sub headers (row 10)
        [
          '#',
          'អត្តលេខ', 'គោត្តនាម', 'នាម', 'លេខទូរស័ព្ទ', 'ភេទ', 'ថ្ងៃកំណើត', 'សញ្ជាតិ', 'តំណែង',
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
          // Main headers (8-9) - Gray background, borders, bold
          else if (R === 8 || R === 9) {
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
                left: { style: 'none' },
                right: { style: 'none' }
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
        // Row 8 (main headers)
        { s: { r: 7, c: 1 }, e: { r: 7, c: 9 } },  // ព័ត៌មានគ្រូបង្រៀន
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

  const handleExportCSV = async () => {
    try {
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
      
      const filename = getTimestampedFilename(filenameBase, 'csv');
      
      // Transform teacher data for CSV export
      const csvHeaders = [
        t('number'),
        t('teacherId'),
        t('lastName'),
        t('firstName'),
        t('phone'),
        t('gender'),
        t('dateOfBirth'),
        t('nationality'),
        t('role'),
        t('address'),
        t('classes')
      ];
      
      const csvData = [
        csvHeaders,
        ...teachers.map((teacher, index) => [
          index + 1, // Number
          teacher.teacherId || teacher.id || '', // Teacher ID
          teacher.lastName || teacher.last_name || '', // Last name
          teacher.firstName || teacher.first_name || '', // First name
          teacher.phone || '', // Phone
          teacher.gender ? (teacher.gender === 'MALE' || teacher.gender === 'male' ? t('male') : t('female')) : '', // Gender
          teacher.dateOfBirth || teacher.date_of_birth ? formatDateKhmer(teacher.dateOfBirth || teacher.date_of_birth, 'dateOnly') : '', // Date of birth
          teacher.nationality || 'ខ្មែរ', // Nationality
          teacher.isDirector ? t('director', 'នាយក') : t('teacher', 'គ្រូបង្រៀន'), // Role
          [teacher.residence?.village, teacher.residence?.commune, teacher.residence?.district, teacher.residence?.province].filter(Boolean).join(', ') || '', // Address
          teacher.classes && teacher.classes.length > 0
            ? teacher.classes.map(cls => cls.name || `${cls.gradeLevel}${cls.section}`).join(', ')
            : '' // Classes taught
        ])
      ];

      // Convert to CSV string
      const csvContent = csvData.map(row => 
        row.map(field => {
          // Properly escape fields that contain commas or quotes
          const fieldStr = String(field);
          if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
            return `"${fieldStr.replace(/"/g, '""')}"`;
          }
          return fieldStr;
        }).join(',')
      ).join('\n');

      // Create and download the file
      const BOM = '\uFEFF'; // Add BOM for proper UTF-8 encoding in Excel
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, filename);

      showSuccess(t('exportSuccess', 'Data exported successfully'));
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Export error:', error);
      showError(t('exportError', 'Failed to export data'));
    }
  };

  const handleExportPDF = async () => {
    try {
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
      
      const filename = getTimestampedFilename(filenameBase, 'pdf');
      
      // Create PDF content
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.padding = '20px';
      tempDiv.style.fontFamily = 'Hanuman, Khmer UI, Noto Sans Khmer, Arial Unicode MS, Arial, sans-serif';

      // Create HTML content
      // Get filter info for PDF title
      const getPDFFilterText = () => {
        const filterParts = [];
        if (selectedGradeLevel) {
          filterParts.push(`${t('gradeLevel')}: ${selectedGradeLevel}`);
        }
        if (searchTerm) {
          filterParts.push(`${t('search')}: ${searchTerm}`);
        }
        return filterParts.length > 0 ? ` (${filterParts.join(', ')})` : '';
      };

      const htmlContent = `
        <div style="font-family: 'Hanuman', 'Khmer UI', 'Noto Sans Khmer', 'Arial Unicode MS', 'Arial', sans-serif; padding: 20px; background: white;">
          <h1 style="font-size: 16px; margin-bottom: 15px; color: #1f2937; text-align: center;">បញ្ជីរាយនាមគ្រូបង្រៀន${getPDFFilterText()}</h1>
          
          <div style="margin-bottom: 15px; font-size: 10px;">
            <p style="margin: 5px 0;"><strong>ឆ្នាំសិក្សា:</strong> ${new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)}</p>
            <p style="margin: 5px 0;"><strong>បានបង្កើតនៅ:</strong> ${formatDateKhmer(new Date(), 'short')}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9px;">
            <thead>
              <tr style="background-color: #3b82f6; color: white;">
                <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">ល.រ</th>
                <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">នាម</th>
                <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">គោត៌នាម</th>
                <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">ទូរសព្ទ</th>
                <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">តំណែង</th>
                <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">ថ្នាក់ដែលបង្រៀន</th>
              </tr>
            </thead>
            <tbody>
              ${teachers.map((teacher, index) => {
                const fullName = teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || '';
                const role = teacher.isDirector ? t('director', 'នាយក') : t('teacher', 'គ្រូបង្រៀន');
                const classesTaught = teacher.classes && teacher.classes.length > 0
                  ? teacher.classes.map(cls => cls.name || `${cls.gradeLevel}${cls.section}`).join(', ')
                  : '';
                const bgColor = index % 2 === 0 ? '#f9fafb' : 'white';
                
                return `
                  <tr style="background-color: ${bgColor};">
                    <td style="border: 1px solid #ddd; padding: 5px;">${index + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 5px;">${teacher.firstName || ''}</td>
                    <td style="border: 1px solid #ddd; padding: 5px;">${teacher.lastName || ''}</td>
                    <td style="border: 1px solid #ddd; padding: 5px;">${teacher.phone || ''}</td>
                    <td style="border: 1px solid #ddd; padding: 5px;">${role}</td>
                    <td style="border: 1px solid #ddd; padding: 5px;">${classesTaught}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div style="margin-top: 15px; font-size: 9px; color: #6b7280;">
            <p style="margin: 5px 0;"><strong>ចំនួនសរុប:</strong> ${teachers.length} នាក់</p>
          </div>
        </div>
      `;
      
      tempDiv.innerHTML = htmlContent;
      document.body.appendChild(tempDiv);

      try {
        // Convert HTML to canvas
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        // Create PDF from canvas
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 0;

        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        pdf.save(filename);

        showSuccess(t('exportSuccess', 'Data exported successfully'));
        setShowExportDropdown(false);
      } finally {
        // Clean up the temporary element
        document.body.removeChild(tempDiv);
      }
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
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedTeachers.length === teachers.length && teachers.length > 0}
          onChange={handleSelectAll}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      ),
      headerClassName: 'w-12',
      cellClassName: 'w-12',
      render: (teacher) => (
        <input
          type="checkbox"
          checked={selectedTeachers.some(t => t.id === teacher.id)}
          onChange={() => handleSelectTeacher(teacher)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      )
    },
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
      key: 'role',
      header: t('role', 'Role'),
      cellClassName: 'text-xs sm:text-sm text-gray-700',
      responsive: 'hidden lg:table-cell',
      render: (teacher) => (
        <Badge
          color={teacher.isDirector ? 'blue' : 'purple'}
          variant="outline"
        >
          {teacher.isDirector ? t('director', 'Director') : t('teacher', 'Teacher')}
        </Badge>
      )
    },
    {
      key: 'status',
      header: t('status', 'Status'),
      render: (teacher) => (
        <Badge
          color={teacher.isActive ? 'green' : 'gray'}
          variant="filled"
        >
          {teacher.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}
        </Badge>
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

  // Mobile card render function
  const renderMobileCard = (teacher) => (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={selectedTeachers.some(t => t.id === teacher.id)}
            onChange={() => handleSelectTeacher(teacher)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:scale-110 transition-all duration-300">
            <User className="h-5 w-5" />
          </div>
          <div className="ml-2 sm:ml-4 min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900 truncate">
              {teacher.name || (teacher.firstName || teacher.lastName
                ? `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim()
                : teacher.username || t('noName', 'No Name'))}
            </div>
            <div className="text-xs text-gray-500 truncate">{teacher.email || 'N/A'}</div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleEditTeacher(teacher);
            }}
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 hover:scale-110 flex-shrink-0"
            title={t('editTeacher', 'Edit teacher')}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => showSuccess(t('featureComingSoon', 'This feature is coming soon'))}
            variant="ghost"
            size="sm"
            className="text-red-600 opacity-50 cursor-not-allowed flex-shrink-0"
            disabled
            title={t('deleteTeacher', 'Delete teacher (Coming Soon)')}
          >
            <MinusCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex justify-between items-start text-xs text-gray-500">
        <div className="flex flex-col space-y-1">
          <span>{t('username', 'Username')}: {teacher.username || 'N/A'}</span>
          <span>{t('gradeLevel', 'Grade Level')}: {teacher.gradeLevel || 'N/A'}</span>
          <div className="flex items-center space-x-2 mt-1">
            <Badge
              color={teacher.isDirector ? 'blue' : 'purple'}
              variant="outline"
              size="xs"
            >
              {teacher.isDirector ? t('director', 'Director') : t('teacher', 'Teacher')}
            </Badge>
          </div>
          {teacher.classes && teacher.classes.length > 0 && (
            <div className="mt-2">
              <span className="text-xs font-medium text-gray-600">{t('classes', 'Classes')}:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {teacher.classes.map((classItem, index) => (
                  <Badge
                    key={classItem.classId || index}
                    color="blue"
                    variant="outline"
                    size="xs"
                  >
                    {classItem.name || `${classItem.gradeLevel}${classItem.section}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <Badge
          color={teacher.isActive ? 'green' : 'gray'}
          variant="filled"
          size="xs"
        >
          {teacher.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}
        </Badge>
      </div>
    </>
  );

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
    <div variant='fade' className="p-6">
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
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
          <div className="flex items-center space-x-2">
            {/* View Selected Teachers Button */}
            {selectedTeachers.length > 0 && (
              <Button
                onClick={() => setShowTeachersManagerOpen(true)}
                variant="outline"
                size="default"
                className="shadow-lg"
              >
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">
                  {t('viewSelected', 'View Selected')} ({selectedTeachers.length})
                </span>
              </Button>
            )}

            {/* Select All / Deselect All Button */}
            {teachers.length > 0 && (
              <Button
                onClick={handleSelectAll}
                variant="outline"
                size="default"
                className="shadow-lg"
                disabled={selectingAll}
              >
                {selectingAll ? (
                  <DynamicLoader
                    type="spinner"
                    size="sm"
                    variant="primary"
                    message={t('selectingAll', 'Selecting...')}
                  />
                ) : selectedTeachers.length === teachers.length && teachers.length > 0 ? (
                  <>
                    <X className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">{t('deselectAll', 'Deselect All')}</span>
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">
                      {t('selectAll', 'Select All')}
                      {selectedTeachers.length > 0 && ` (${selectedTeachers.length}/${teachers.length})`}
                    </span>
                  </>
                )}
              </Button>
            )}

            <div className="relative export-dropdown">
              <Button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                variant="outline"
                size="default"
                className="shadow-lg"
                disabled={teachers.length === 0}
              >
                <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">{t('export', 'Export')}</span>
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
              </Button>

              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <button
                      onClick={handleExportExcel}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                    >
                      {t('exportToExcel', 'Export to Excel')}
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                    >
                      {t('exportToCSV', 'Export to CSV')}
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                    >
                      {t('exportToPDF', 'Export to PDF')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={() => showSuccess(t('featureComingSoon', 'This feature is coming soon'))}
              variant="primary"
              size="default"
              className="shadow-lg"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">{t('addTeacher', 'Add Teacher')}</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 flex-1 justify-between">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder={t('searchTeachers', 'Search by first name, last name, full name, or username...')}
                value={localSearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {localSearchTerm && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  title={t('clearSearch', 'Clear search')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
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
                minWidth="min-w-[150px]"
                triggerClassName="text-sm"
              />
              {(localSearchTerm || selectedGradeLevel) && (
                <Button
                  onClick={() => {
                    handleSearchChange('');
                    setSelectedGradeLevel('');
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('clearFilters', 'Clear Filters')}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div>
          <MobileCards
            data={teachers}
            renderCard={renderMobileCard}
          />

          <div className="hidden sm:block">
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
        </div>
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

      {/* Selected Teachers Modal */}
      <Modal
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
      </Modal>
    </div>
  );
}
