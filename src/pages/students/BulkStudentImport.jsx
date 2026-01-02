import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { studentService } from '../../utils/api/services/studentService';
import { userService } from '../../utils/api/services/userService';
import schoolService from '../../utils/api/services/schoolService';
import transliterate from '../../utils/transliterator';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { PageLoader } from '../../components/ui/DynamicLoader';
import BulkImportProgressTracker from '../../components/students/BulkImportProgressTracker';
import BulkImportHeader from '../../components/students/BulkImportHeader';
import BulkImportTable from '../../components/students/BulkImportTable';
import ExportProgressModal from '../../components/modals/ExportProgressModal';
import { templateDownloader } from '../../utils/templateDownloader';
import { excelImportHandler } from '../../utils/excelImportHandler';
import { genderOptions, nationalityOptions, ethnicGroupOptions, accessibilityOptions, gradeLevelOptions, getAcademicYearOptions } from '../../utils/formOptions';
import { getFullName } from '../../utils/usernameUtils';
import locationService from '../../utils/api/services/locationService';
import { classService } from '../../utils/api/services/classService';
import Dropdown from '../../components/ui/Dropdown';
import SearchableDropdown from '../../components/ui/SearchableDropdown';


export default function BulkStudentImport() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { error, handleError, clearError } = useErrorHandler();
  const { startLoading, stopLoading } = useLoading();

  // Get authenticated user and school data from localStorage
  const [user, setUser] = useState(() => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (err) {
      console.error('Error parsing user data from localStorage:', err);
      return null;
    }
  });

  const [schoolId, setSchoolId] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [userRole, setUserRole] = useState(null);

  // Cascading filter states (for admins)
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [schools, setSchools] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');

  // Class selection states (optional)
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [availableGradeLevels, setAvailableGradeLevels] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);

  // Loading states for cascading filters
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingGradeLevels, setLoadingGradeLevels] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [students, setStudents] = useState([
    {
      // Student basic info
      lastName: '',
      firstName: '',
      username: '',
      password: '',
      email: '',
      dateOfBirth: '',
      gender: '',
      phone: '',
      nationality: '',
      schoolId: '',
      academicYear: '',
      gradeLevel: '',
      classId: '', // Optional - for direct class assignment

      // Location info
      residenceFullAddress: '',

      // Parent info
      fatherFirstName: '',
      fatherLastName: '',
      fatherPhone: '',
      fatherDateOfBirth: '',
      fatherGender: 'MALE',
      fatherOccupation: '',
      fatherResidenceFullAddress: '',

      motherFirstName: '',
      motherLastName: '',
      motherPhone: '',
      motherDateOfBirth: '',
      motherGender: 'FEMALE',
      motherOccupation: '',
      motherResidenceFullAddress: '',

      // Additional fields
      ethnicGroup: '',
      accessibility: []
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  // Progress tracker state
  const [showProgressTracker, setShowProgressTracker] = useState(false);
  const [importResults, setImportResults] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [showFailedOnly, setShowFailedOnly] = useState(false);

  // Excel import progress modal state
  const [showExcelImportProgress, setShowExcelImportProgress] = useState(false);
  const [excelImportProgress, setExcelImportProgress] = useState(0);

  // Excel-like functionality
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [selectedRange, setSelectedRange] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startSelection, setStartSelection] = useState(null);
  const tableRef = useRef(null);

  // Get academic year options (current year and next 2 years)
  const academicYearOptions = getAcademicYearOptions();

  // Translate grade level options with translation keys
  const translatedGradeLevelOptions = gradeLevelOptions.map(option => ({
    ...option,
    label: option.translationKey ? t(option.translationKey, option.label) : option.label
  }));

  // Validation function to check if a cell value is invalid
  const isCellInvalid = (student, columnKey) => {
    const value = student[columnKey];

    // Check if the row has any data at all (excluding auto-populated fields)
    const hasAnyData = Object.keys(student).some(key => {
      // Exclude auto-populated or internal fields
      const excludedFields = [
        'actions',
        'schoolId',  // Auto-populated from school selection
        'usernameAvailable',  // Internal flag for username validation
        'fatherGender',  // Auto-set to MALE
        'motherGender',  // Auto-set to FEMALE
        'accessibility'  // Array field that defaults to []
      ];

      if (excludedFields.includes(key)) return false;

      const val = student[key];
      // Check for non-empty values (handle arrays separately)
      if (Array.isArray(val)) {
        return val.length > 0;
      }
      return val && String(val).trim() !== '';
    });

    // If the row is completely empty, don't show red borders
    if (!hasAnyData) {
      return false;
    }

    // Required fields validation - check if empty (only if row has some data)
    const requiredFields = ['lastName', 'firstName', 'username', 'password', 'dateOfBirth', 'gender', 'schoolId'];
    if (requiredFields.includes(columnKey)) {
      // If the field is required and empty, it's invalid
      if (!value || String(value).trim() === '') {
        return true;
      }
    }

    // Email validation (must contain @ and valid format)
    if (columnKey === 'email') {
      // Empty email is OK (optional field)
      if (!value || value === '') return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !emailRegex.test(value.trim());
    }

    // Phone number validation (must be at least 8 digits, auto-prefixed with 0 if needed)
    if (columnKey === 'phone') {
      // Empty phone is OK (optional field)
      if (!value || value === '') return false;
      // Accept numbers with or without 0 prefix - validation will pass
      // Normalization will add 0 if missing
      const phoneDigitsOnly = value.replace(/\s/g, '');
      // Must have at least 8 digits (or 9 if prefixed with 0)
      const phoneRegex = /^\d{8,}$/;
      return !phoneRegex.test(phoneDigitsOnly);
    }

    // Father phone validation - optional field, only validate format if provided
    if (columnKey === 'fatherPhone') {
      // Empty phone is OK (optional field)
      if (!value || value.toString().trim() === '') return false;
      // Accept numbers with or without 0 prefix
      const phoneDigitsOnly = value.toString().replace(/\s/g, '');
      // Must have at least 8 digits
      const phoneRegex = /^\d{8,}$/;
      return !phoneRegex.test(phoneDigitsOnly);
    }

    // Mother phone validation - optional field, only validate format if provided
    if (columnKey === 'motherPhone') {
      // Empty phone is OK (optional field)
      if (!value || value.toString().trim() === '') return false;
      // Accept numbers with or without 0 prefix
      const phoneDigitsOnly = value.toString().replace(/\s/g, '');
      // Must have at least 8 digits
      const phoneRegex = /^\d{8,}$/;
      return !phoneRegex.test(phoneDigitsOnly);
    }

    // Date validation (dd/mm/yyyy format)
    if (columnKey === 'dateOfBirth' || columnKey === 'fatherDateOfBirth' || columnKey === 'motherDateOfBirth') {
      // Empty date is OK (optional field)
      if (!value || value === '') return false;

      const trimmedValue = String(value).trim();

      // Accept dd/mm/yyyy format (with optional leading zeros)
      const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const match = trimmedValue.match(dateRegex);

      if (!match) {
        // Date doesn't match the expected format
        return true;
      }

      const [, day, month, year] = match;
      const d = parseInt(day);
      const m = parseInt(month);
      const y = parseInt(year);

      // Validate ranges
      if (y < 1900 || y > 2100) return true;
      if (m < 1 || m > 12) return true;
      if (d < 1 || d > 31) return true;

      // More sophisticated day validation based on month
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

      // Check for leap year
      const isLeapYear = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
      if (m === 2 && isLeapYear) {
        daysInMonth[1] = 29;
      }

      // Validate day is within the valid range for the month
      if (d > daysInMonth[m - 1]) return true;

      return false; // Date is valid
    }

    // Grade level validation (should be a number between 0-6, allowing 0 for Kindergarten)
    if (columnKey === 'gradeLevel') {
      // Empty grade is OK (optional field)
      if (!value || value === '') return false;
      const grade = parseInt(value);
      return isNaN(grade) || grade < 0 || grade > 6;
    }

    // Username validation (only English letters and numbers, 3-50 chars)
    if (columnKey === 'username') {
      // Empty username is OK (optional field)
      if (!value || value === '') return false;
      const usernameRegex = /^[a-zA-Z0-9]{3,50}$/;
      const formatInvalid = !usernameRegex.test(value);

      // If backend says this username is not available, treat as invalid
      const notAvailable = student.usernameAvailable === false;

      return formatInvalid || notAvailable;
    }

    // Gender validation (only for student gender - parent genders are auto-set)
    if (columnKey === 'gender') {
      // Empty gender is OK (optional field)
      if (!value || value === '') return false;
      return !['MALE', 'FEMALE', 'ប្រុស', 'ស្រី'].includes(value.toUpperCase());
    }

    return false; // Default: field is valid
  };

  const columns = [
    // Student Basic Info
    { key: 'lastName', header: 'គោត្តនាម *', width: 'min-w-[100px]' },
    { key: 'firstName', header: 'នាម *', width: 'min-w-[200px]' },
    { key: 'username', header: 'ឈ្មោះអ្នកប្រើ *', width: 'min-w-[280px]' },
    { key: 'password', header: 'ពាក្យសម្ងាត់ *', width: 'min-w-[150px]' },
    { key: 'email', header: 'អ៊ីមែល', width: 'min-w-[200px]' },
    { key: 'dateOfBirth', header: 'ថ្ងៃខែឆ្នាំកំណើត *', width: 'min-w-[300px]', type: 'custom-date' },
    { key: 'gender', header: 'ភេទ *', width: 'min-w-[80px]', type: 'select', options: genderOptions },
    { key: 'phone', header: 'លេខទូរស័ព្ទ', width: 'min-w-[150px]' },
    { key: 'nationality', header: 'សញ្ជាតិ', width: 'min-w-[80px]', type: 'select', options: nationalityOptions },
    { key: 'schoolId', header: 'លេខសាលា *', width: 'min-w-[200px]' },
    { key: 'academicYear', header: 'ឆ្នាំសិក្សា', width: 'min-w-[150px]', type: 'select', options: academicYearOptions },
    { key: 'gradeLevel', header: 'កម្រិតថ្នាក់', width: 'min-w-[120px]', type: 'select', options: translatedGradeLevelOptions },
    { key: 'classId', header: 'ថ្នាក់', width: 'min-w-[150px]', type: 'select', options: availableClasses.map(cls => ({ value: cls.id?.toString() || cls.classId?.toString(), label: cls.name || cls.className })) },

    // Student Address
    { key: 'residenceFullAddress', header: 'អាសយដ្ឋានពេញ', width: 'min-w-[320px]' },

    // Father Info
    { key: 'fatherFirstName', header: 'នាមឪពុក', width: 'min-w-[250px]' },
    { key: 'fatherLastName', header: 'គោត្តនាមឪពុក', width: 'min-w-[250px]' },
    { key: 'fatherPhone', header: 'ទូរស័ព្ទឪពុក', width: 'min-w-[250px]' },
    { key: 'fatherOccupation', header: 'មុខរបរ​ឪពុក', width: 'min-w-[250px]' },
    { key: 'fatherResidenceFullAddress', header: 'អាសយដ្ឋានពេញឪពុក', width: 'min-w-[320px]' },

    // Mother Info
    { key: 'motherFirstName', header: 'នាមម្តាយ', width: 'min-w-[250px]' },
    { key: 'motherLastName', header: 'គោត្តនាមម្តាយ', width: 'min-w-[250px]' },
    { key: 'motherPhone', header: 'ទូរស័ព្ទម្តាយ', width: 'min-w-[250px]' },
    { key: 'motherOccupation', header: 'មុខរបរ​ម្តាយ', width: 'min-w-[250px]' },
    { key: 'motherResidenceFullAddress', header: 'អាសយដ្ឋានពេញម្តាយ', width: 'min-w-[320px]' },

    // Additional Fields
    { key: 'ethnicGroup', header: 'ជនជាតិភាគតិច', width: 'min-w-[280px]', type: 'select', options: ethnicGroupOptions },
    { key: 'accessibility', header: 'លក្ខណៈពិសេស', width: 'min-w-[320px]', type: 'multi-select', options: accessibilityOptions },
    { key: 'actions', header: 'សកម្មភាព', width: 'min-w-[120px]' }
  ];

  // Load user account data on component mount to determine role and school access
  useEffect(() => {
    const loadUserAccount = async () => {
      try {
        setInitialLoading(true);
        const accountResponse = await userService.getMyAccount();
        console.log('User account response:', accountResponse);

        // Get user data from response
        const userData = accountResponse?.data || accountResponse;

        // Check user role
        const userRoleId = userData?.roleId || userData?.role_id;
        const isAdmin = userRoleId === 1;
        const isDirector = userRoleId === 14;
        const canAccessBulkImport = isAdmin || isDirector;

        if (!canAccessBulkImport) {
          showError('អ្នកមិនមានសិទ្ធិក្នុងការប្រើប្រាស់មុខងារនេះទេ។');
          navigate('/dashboard');
          return;
        }

        setUserRole(userRoleId);

        // For Directors: Auto-populate school ID from account
        if (isDirector) {
          const userSchoolId = userData?.schoolId || userData?.school_id || userData?.school?.id;
          console.log('🔍 Director user school ID:', { userSchoolId, userData });
          if (userSchoolId) {
            setSchoolId(userSchoolId);

            // Fetch school name
            try {
              const schoolResponse = await schoolService.getSchoolById(userSchoolId);
              const schoolData = schoolResponse?.data || schoolResponse;
              setSchoolName(schoolData?.name || '');

              // Auto-populate all student rows with school ID
              setStudents(prevStudents =>
                prevStudents.map(student => (
                  {
                    ...student,
                    schoolId: userSchoolId.toString()
                  }
                ))
              );
            } catch (err) {
              console.error('Error fetching school details:', err);
            }
          } else {
            console.warn('⚠️ Director user has no school ID in userData:', userData);
          }
        } else if (isAdmin) {
          // For Admins: Load provinces for cascading selection
          try {
            const response = await locationService.getProvinces();
            const provincesData = response?.data || response || [];
            if (Array.isArray(provincesData)) {
              setProvinces(provincesData);
            }
          } catch (error) {
            console.error('Error loading provinces:', error);
            showError('មិនអាចផ្ទុកខេត្ត។');
          }
        }
      } catch (error) {
        console.error('Error loading user account:', error);
        showError('មិនអាចផ្ទុកព័ត៌មានគណនីរបស់អ្នក។');
      } finally {
        setInitialLoading(false);
      }
    };

    loadUserAccount();
  }, [showError, navigate]);

  // Load districts when province is selected (Admin only)
  useEffect(() => {
    const loadDistricts = async () => {
      if (!selectedProvince) {
        setDistricts([]);
        setSelectedDistrict('');
        setSchools([]);
        setSelectedSchool('');
        setSchoolId(null);
        setSchoolName('');
        return;
      }

      try {
        setLoadingDistricts(true);
        const response = await locationService.getDistrictsByProvince(String(selectedProvince));
        const districtsData = response?.data || response || [];
        if (Array.isArray(districtsData)) {
          setDistricts(districtsData);
        }
      } catch (error) {
        console.error('Error loading districts:', error);
        showError('មិនអាចផ្ទុកស្រុក។');
        setDistricts([]);
      } finally {
        setLoadingDistricts(false);
      }
    };

    loadDistricts();
  }, [selectedProvince, showError]);

  // Load schools when district is selected (Admin only)
  useEffect(() => {
    const loadSchools = async () => {
      if (!selectedDistrict) {
        setSchools([]);
        setSelectedSchool('');
        setSchoolId(null);
        setSchoolName('');
        return;
      }

      try {
        setLoadingSchools(true);
        const districtObj = districts.find(d => d.district_code === selectedDistrict);
        const districtId = districtObj?.district_id || districtObj?.id || districtObj?.districtId;

        if (!districtId) {
          throw new Error('District ID not found');
        }

        const response = await schoolService.getSchoolsByDistrict(districtId);
        let schoolsData = [];
        if (Array.isArray(response)) {
          schoolsData = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          schoolsData = response.data;
        }

        if (Array.isArray(schoolsData)) {
          setSchools(schoolsData);
        }
      } catch (error) {
        console.error('Error loading schools:', error);
        showError('មិនអាចផ្ទុកសាលា។');
        setSchools([]);
      } finally {
        setLoadingSchools(false);
      }
    };

    loadSchools();
  }, [selectedDistrict, districts, showError]);

  // Fetch school details when school is selected (Admin only)
  useEffect(() => {
    const fetchSchoolDetails = async () => {
      if (!selectedSchool) {
        setSchoolId(null);
        setSchoolName('');
        setStudents(prevStudents =>
          prevStudents.map(student => ({
            ...student,
            schoolId: ''
          }))
        );
        return;
      }

      try {
        setLoadingSchools(true);
        const selectedSchoolObj = schools.find(s => (s.id || s.schoolId)?.toString() === selectedSchool?.toString());

        if (selectedSchoolObj) {
          const schoolIdFromObj = selectedSchoolObj.id || selectedSchoolObj.schoolId;
          console.log('✅ School selected:', { schoolId: schoolIdFromObj, schoolName: selectedSchoolObj.name });

          // Fetch detailed school info
          const response = await schoolService.getSchoolById(schoolIdFromObj);

          if (response && response.data) {
            const schoolData = response.data;
            setSchoolId(schoolIdFromObj);
            setSchoolName(schoolData.name || selectedSchoolObj.name || '');

            // Auto-update all student rows with school ID
            setStudents(prevStudents =>
              prevStudents.map(student => ({
                ...student,
                schoolId: schoolIdFromObj.toString()
              }))
            );
          } else {
            // If detailed fetch fails, use info from schools list
            setSchoolId(schoolIdFromObj);
            setSchoolName(selectedSchoolObj.name || '');

            setStudents(prevStudents =>
              prevStudents.map(student => ({
                ...student,
                schoolId: schoolIdFromObj.toString()
              }))
            );
          }
        }
      } catch (error) {
        console.error('Error fetching school details:', error);
        showError('មិនអាចទាញយកព័ត៌មានសាលា។');
      } finally {
        setLoadingSchools(false);
      }
    };

    fetchSchoolDetails();
  }, [selectedSchool, schools, showError]);

  // Load grade levels when school is selected
  useEffect(() => {
    const loadGradeLevels = async () => {
      if (!schoolId) {
        setAvailableGradeLevels([]);
        setSelectedGradeLevel('');
        setAvailableClasses([]);
        setSelectedClass('');
        return;
      }

      try {
        setLoadingGradeLevels(true);
        const response = await classService.getGradeLevelsBySchool(schoolId);
        if (response.success && Array.isArray(response.data)) {
          setAvailableGradeLevels(response.data);
        }
      } catch (error) {
        console.error('Error loading grade levels:', error);
        setAvailableGradeLevels([]);
      } finally {
        setLoadingGradeLevels(false);
      }
    };

    loadGradeLevels();
  }, [schoolId]);

  // Load classes when school and grade level are selected
  useEffect(() => {
    const loadClasses = async () => {
      if (!schoolId || !selectedGradeLevel) {
        setAvailableClasses([]);
        setSelectedClass('');
        return;
      }

      try {
        setLoadingClasses(true);
        const response = await classService.getClassesByGradeLevel(schoolId, selectedGradeLevel);
        if (response.success && Array.isArray(response.data)) {
          setAvailableClasses(response.data);
        }
      } catch (error) {
        console.error('Error loading classes:', error);
        setAvailableClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };

    loadClasses();
  }, [schoolId, selectedGradeLevel]);

  // Auto-populate classId for new rows when class is selected
  useEffect(() => {
    if (selectedClass) {
      setStudents(prevStudents =>
        prevStudents.map(student => ({
          ...student,
          classId: selectedClass.toString()
        }))
      );
    }
  }, [selectedClass]);


  // Cell update function - must be defined before callbacks that use it
  const updateCell = useCallback((rowIndex, columnKey, value) => {
    setStudents(prev => prev.map((row, index) =>
      index === rowIndex ? { ...row, [columnKey]: value } : row
    ));
  }, []);

  // Excel-like functions
  const getColumnIndex = useCallback((key) => {
    return columns.findIndex(col => col.key === key);
  }, []);

  const handleCellClick = useCallback((rowIndex, colKey, event) => {
    const colIndex = getColumnIndex(colKey);
    if (colKey === 'actions') return;

    setSelectedCell({ row: rowIndex, col: colIndex });

    if (event.shiftKey && startSelection) {
      setSelectedRange({
        start: startSelection,
        end: { row: rowIndex, col: colIndex }
      });
    } else {
      setStartSelection({ row: rowIndex, col: colIndex });
      setSelectedRange(null);
    }
  }, [getColumnIndex, startSelection]);

  const handleCellMouseDown = useCallback((rowIndex, colKey) => {
    if (colKey === 'actions') return;
    const colIndex = getColumnIndex(colKey);
    setIsSelecting(true);
    setStartSelection({ row: rowIndex, col: colIndex });
  }, [getColumnIndex]);

  const handleCellMouseEnter = useCallback((rowIndex, colKey) => {
    if (!isSelecting || colKey === 'actions') return;
    const colIndex = getColumnIndex(colKey);
    setSelectedRange({
      start: startSelection,
      end: { row: rowIndex, col: colIndex }
    });
  }, [isSelecting, startSelection, getColumnIndex]);

  const handleCellMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  const isCellSelected = useCallback((rowIndex, colIndex) => {
    if (!selectedRange) {
      return selectedCell.row === rowIndex && selectedCell.col === colIndex;
    }

    const minRow = Math.min(selectedRange.start.row, selectedRange.end.row);
    const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row);
    const minCol = Math.min(selectedRange.start.col, selectedRange.end.col);
    const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col);

    return rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol;
  }, [selectedCell, selectedRange]);

  const copySelectedCells = useCallback(() => {
    if (!selectedRange) {
      const value = students[selectedCell.row][columns[selectedCell.col].key];
      setClipboard({ type: 'single', value });
      navigator.clipboard.writeText(value || '');
    } else {
      const minRow = Math.min(selectedRange.start.row, selectedRange.end.row);
      const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row);
      const minCol = Math.min(selectedRange.start.col, selectedRange.end.col);
      const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col);

      const data = [];
      for (let row = minRow; row <= maxRow; row++) {
        const rowData = [];
        for (let col = minCol; col <= maxCol; col++) {
          rowData.push(students[row][columns[col].key] || '');
        }
        data.push(rowData);
      }
      setClipboard({ type: 'range', data });
      navigator.clipboard.writeText(data.map(row => row.join('\t')).join('\n'));
    }
  }, [selectedCell, selectedRange, students, columns]);

  const pasteToSelectedCells = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const rows = text.split('\n').map(row => row.split('\t'));

      if (!selectedRange) {
        // Single cell paste
        const value = rows[0][0];
        updateCell(selectedCell.row, columns[selectedCell.col].key, value);
      } else {
        // Range paste
        const minRow = Math.min(selectedRange.start.row, selectedRange.end.row);
        const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row);
        const minCol = Math.min(selectedRange.start.col, selectedRange.end.col);
        const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col);

        for (let i = 0; i < rows.length; i++) {
          for (let j = 0; j < rows[i].length; j++) {
            const targetRow = minRow + i;
            const targetCol = minCol + j;

            if (targetRow <= maxRow && targetCol <= maxCol && targetRow < students.length) {
              const colKey = columns[targetCol].key;
              if (colKey !== 'actions') {
                updateCell(targetRow, colKey, rows[i][j]);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Paste failed:', error);
    }
  }, [selectedCell, selectedRange, students.length, columns, updateCell]);

  const handleKeyDown = useCallback((event) => {
    // Handle navigation keys even when focused on input fields
    const navigationKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
    const isInputFocused = event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'TEXTAREA';

    // For input fields, only handle navigation keys and copy/paste
    if (isInputFocused) {
      // Allow normal input behavior for Delete/Backspace when in input fields
      if (event.key === 'Delete' || event.key === 'Backspace') {
        return; // Let the browser handle normal input deletion
      }
      // For non-navigation keys that aren't copy/paste, let the input handle them
      if (!navigationKeys.includes(event.key) && !(event.ctrlKey || event.metaKey)) {
        return;
      }
    }

    const { row, col } = selectedCell;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        event.stopPropagation();
        if (row > 0) {
          setSelectedCell({ row: row - 1, col });
          setSelectedRange(null);
          // Focus the input in the new cell
          setTimeout(() => {
            const input = document.querySelector(`[data-row="${row - 1}"][data-col="${col}"] input`);
            if (input) input.focus();
          }, 0);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        event.stopPropagation();
        if (row < students.length - 1) {
          setSelectedCell({ row: row + 1, col });
          setSelectedRange(null);
          setTimeout(() => {
            const input = document.querySelector(`[data-row="${row + 1}"][data-col="${col}"] input`);
            if (input) input.focus();
          }, 0);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        event.stopPropagation();
        if (col > 0) {
          setSelectedCell({ row, col: col - 1 });
          setSelectedRange(null);
          setTimeout(() => {
            const input = document.querySelector(`[data-row="${row}"][data-col="${col - 1}"] input`);
            if (input) input.focus();
          }, 0);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        event.stopPropagation();
        if (col < columns.length - 2) { // -2 to skip actions column
          setSelectedCell({ row, col: col + 1 });
          setSelectedRange(null);
          setTimeout(() => {
            const input = document.querySelector(`[data-row="${row}"][data-col="${col + 1}"] input`);
            if (input) input.focus();
          }, 0);
        }
        break;
      case 'Tab':
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey) {
          if (col > 0) {
            setSelectedCell({ row, col: col - 1 });
            setTimeout(() => {
              const input = document.querySelector(`[data-row="${row}"][data-col="${col - 1}"] input`);
              if (input) input.focus();
            }, 0);
          } else if (row > 0) {
            setSelectedCell({ row: row - 1, col: columns.length - 2 });
            setTimeout(() => {
              const input = document.querySelector(`[data-row="${row - 1}"][data-col="${columns.length - 2}"] input`);
              if (input) input.focus();
            }, 0);
          }
        } else {
          if (col < columns.length - 2) {
            setSelectedCell({ row, col: col + 1 });
            setTimeout(() => {
              const input = document.querySelector(`[data-row="${row}"][data-col="${col + 1}"] input`);
              if (input) input.focus();
            }, 0);
          } else if (row < students.length - 1) {
            setSelectedCell({ row: row + 1, col: 0 });
            setTimeout(() => {
              const input = document.querySelector(`[data-row="${row + 1}"][data-col="0"] input`);
              if (input) input.focus();
            }, 0);
          }
        }
        setSelectedRange(null);
        break;
      case 'Enter':
        event.preventDefault();
        event.stopPropagation();
        if (row < students.length - 1) {
          setSelectedCell({ row: row + 1, col });
          setSelectedRange(null);
          setTimeout(() => {
            const input = document.querySelector(`[data-row="${row + 1}"][data-col="${col}"] input`);
            if (input) input.focus();
          }, 0);
        }
        break;
      case 'Copy':
      case 'c':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          copySelectedCells();
        }
        break;
      case 'Paste':
      case 'v':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          pasteToSelectedCells();
        }
        break;
      case 'Delete':
      case 'Backspace':
        // Only handle Delete/Backspace for cell clearing when not in an input field
        if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'SELECT' && event.target.tagName !== 'TEXTAREA') {
          event.preventDefault();
          if (!selectedRange) {
            updateCell(row, columns[col].key, '');
          } else {
            const minRow = Math.min(selectedRange.start.row, selectedRange.end.row);
            const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row);
            const minCol = Math.min(selectedRange.start.col, selectedRange.end.col);
            const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col);

            for (let r = minRow; r <= maxRow; r++) {
              for (let c = minCol; c <= maxCol; c++) {
                const colKey = columns[c].key;
                if (colKey !== 'actions') {
                  updateCell(r, colKey, '');
                }
              }
            }
          }
        }
        break;
    }
  }, [selectedCell, students.length, columns, copySelectedCells, pasteToSelectedCells, updateCell]);

  // Helper function to generate username: stu + 1 char from firstName + 1 char from lastName + 5 random numbers
  const generateAutoUsername = (firstName, lastName) => {
    const first = (firstName || '').trim();
    const last = (lastName || '').trim();

    if (!first && !last) return null;

    // Transliterate to English first, then get first meaningful character
    const transliteratedFirst = first ? transliterate(first).toLowerCase() : '';
    const transliteratedLast = last ? transliterate(last).toLowerCase() : '';

    // Get first alphabetic character from transliterated name
    const firstChar = transliteratedFirst.replace(/[^a-z]/g, '').charAt(0) || '';
    const lastChar = transliteratedLast.replace(/[^a-z]/g, '').charAt(0) || '';

    // Generate 5 random numbers
    const randomNumbers = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');

    return `stu${firstChar}${lastChar}${randomNumbers}`;
  };

  // Helper function to generate password: s + 5 random numbers (e.g., s12345)
  const generateAutoPassword = () => {
    const randomNumbers = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');
    return `s${randomNumbers}`;
  };

  // Excel import functionality
  const handleExcelImport = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Show progress modal during import
    setShowExcelImportProgress(true);
    setExcelImportProgress(10);

    const mappedStudents = await excelImportHandler(
      file,
      ethnicGroupOptions,
      accessibilityOptions,
      showError,
      showSuccess
    );

    if (mappedStudents && mappedStudents.length > 0) {
      setExcelImportProgress(30);
      // After importing from Excel, proactively check username availability and auto-generate if needed
      const studentsWithAvailability = await Promise.all(
        mappedStudents.map(async (student) => {
          let originalUsername = (student.username || '').trim();
          let originalPassword = (student.password || '').trim();

          // Auto-generate username if missing
          if (!originalUsername) {
            originalUsername = generateAutoUsername(student.firstName, student.lastName);
          }

          // Auto-generate password if missing - default to s1234567
          if (!originalPassword) {
            originalPassword = 's1234567';
          }

          // If no username could be generated, return student as is
          if (!originalUsername) {
            return {
              ...student,
              password: originalPassword || 'Student@123',
              usernameAvailable: false
            };
          }

          // Reuse the same username format rule used in isCellInvalid
          const usernameRegex = /^[a-zA-Z0-9]{3,50}$/;

          const checkAvailability = async (candidate) => {
            const base = (candidate || '').trim();
            if (!base) return { available: null, username: null };
            if (!usernameRegex.test(base)) {
              return { available: false, username: base };
            }

            try {
              const response = await userService.generateUsername(base);

              let suggestions = [];
              if (Array.isArray(response?.suggestions)) {
                suggestions = response.suggestions;
              } else if (Array.isArray(response?.data)) {
                suggestions = response.data;
              } else if (response?.username) {
                suggestions = [response.username];
              }

              const firstSuggestion = suggestions.filter(Boolean)[0] || base;
              const available = typeof response?.available === 'boolean'
                ? response.available
                : null;

              return { available, username: firstSuggestion };
            } catch (err) {
              console.error('Error checking username availability for imported student:', err);
              return { available: null, username: base };
            }
          };

          // Check availability of the generated/provided username
          const availabilityCheck = await checkAvailability(originalUsername);

          if (availabilityCheck.available === true) {
            // Username is available - keep it
            return {
              ...student,
              username: availabilityCheck.username || originalUsername,
              password: originalPassword,
              usernameAvailable: true
            };
          }

          if (availabilityCheck.available === false) {
            // Username is not available -> build new base from transliterated name
            const rawFirst = (student.firstName || '').trim();
            const rawLast = (student.lastName || '').trim();

            const transliteratedFirst = rawFirst ? transliterate(rawFirst).toLowerCase() : '';
            const transliteratedLast = rawLast ? transliterate(rawLast).toLowerCase() : '';
            // Combine without separators and strip any non-alphanumeric characters
            let combinedBase = (transliteratedFirst + transliteratedLast) || transliteratedFirst || transliteratedLast;
            combinedBase = combinedBase.replace(/[^a-z0-9]/g, '');

            if (!combinedBase) {
              // No usable name info, keep row flagged as conflict
              return {
                ...student,
                password: originalPassword,
                usernameAvailable: false
              };
            }

            // Generate a new username from the transliterated base
            try {
              const response = await userService.generateUsername(combinedBase);

              let suggestions = [];
              if (Array.isArray(response?.suggestions)) {
                suggestions = response.suggestions;
              } else if (Array.isArray(response?.data)) {
                suggestions = response.data;
              } else if (response?.username) {
                suggestions = [response.username];
              }

              const firstSuggestion = suggestions.filter(Boolean)[0] || combinedBase;

              return {
                ...student,
                username: firstSuggestion,
                password: originalPassword,
                // We assume backend generated a unique suggestion
                usernameAvailable: true
              };
            } catch (err) {
              console.error('Error generating fallback username from transliterated name:', err);
              return {
                ...student,
                password: originalPassword,
                usernameAvailable: false
              };
            }
          }

          // Unknown availability result, return with generated credentials
          return {
            ...student,
            username: originalUsername,
            password: originalPassword,
            usernameAvailable: availabilityCheck.available
          };
        })
      );

      // For Director users, auto-populate schoolId from their account
      console.log('🔍 Excel Import - Current schoolId state:', { schoolId, type: typeof schoolId });
      console.log('🔍 Excel Import - First student before population:', {
        schoolId: studentsWithAvailability[0]?.schoolId,
        hasSchoolId: !!studentsWithAvailability[0]?.schoolId
      });

      // Get roleId directly from localStorage to avoid async timing issues
      let userRoleId = userRole;
      let directorSchoolId = null;

      if (!userRoleId) {
        try {
          const userData = localStorage.getItem('user');
          const userObj = userData ? JSON.parse(userData) : null;
          userRoleId = userObj?.roleId;
          console.log('📦 Fallback roleId from localStorage:', { userRoleId });
        } catch (err) {
          console.error('❌ Error reading roleId from localStorage:', err);
        }
      }

      // For Director role (roleId = 14), override all schoolIds with Director's school
      const isDirector = userRoleId === 14;

      if (isDirector) {
        // Fallback to localStorage if state schoolId is not yet initialized
        directorSchoolId = schoolId;
        if (!directorSchoolId) {
          try {
            const userData = localStorage.getItem('user');
            const userObj = userData ? JSON.parse(userData) : null;
            directorSchoolId = userObj?.schoolId || userObj?.school_id || userObj?.school?.id;
            console.log('📦 Fallback schoolId from localStorage:', { directorSchoolId, userObj: userObj ? { schoolId: userObj.schoolId, school_id: userObj.school_id, school: userObj.school } : null });
          } catch (err) {
            console.error('❌ Error reading schoolId from localStorage:', err);
          }
        }
      }

      const processedStudents = studentsWithAvailability.map((student, idx) => {
        // Only override schoolId for Director users
        if (isDirector && directorSchoolId) {
          console.log(`📝 Director: Setting schoolId for student ${idx}:`, directorSchoolId.toString(), 'Previous:', student.schoolId);
          return {
            ...student,
            schoolId: directorSchoolId.toString()
          };
        }
        // For Admin users, only populate if empty
        if (!isDirector && (!student.schoolId || student.schoolId === '') && schoolId) {
          console.log(`📝 Admin: Populating empty schoolId for student ${idx}:`, schoolId.toString());
          return {
            ...student,
            schoolId: schoolId.toString()
          };
        }
        return student;
      });

      console.log('🔍 Excel Import - Processing complete:', {
        isDirector,
        usedDirectorOverride: isDirector && !!directorSchoolId,
        firstStudentSchoolId: processedStudents[0]?.schoolId,
        userRoleId,
        userRole
      });

      setStudents(processedStudents);
      setExcelImportProgress(100);
      // Close modal after brief delay
      setTimeout(() => {
        setShowExcelImportProgress(false);
        setExcelImportProgress(0);
      }, 500);
    } else {
      setShowExcelImportProgress(false);
      setExcelImportProgress(0);
    }

    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  }, [ethnicGroupOptions, accessibilityOptions, showError, showSuccess]);

  const downloadTemplate = useCallback(async () => {
    try {
      await templateDownloader();
    } catch (error) {
      console.error('Error downloading template:', error);
      showError('មានបញ្ហាក្នុងការទាញយកគំរូ');
    }
  }, [showError]);

  // Add keyboard event listener in capture phase to intercept before input elements
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  const addRow = () => {
    // Check if we've reached the maximum limit of 70 students
    if (students.length >= 70) {
      showError('អ្នកអាចបន្ថែមសិស្សបានច្រើនបំផុត ៧០នាក់។ សូមលុបជួរដើម្បីបន្ថែមជួរថ្មី។', { duration: 5000 });
      return;
    }

    setStudents(prev => [...prev, {
      // Student basic info
      lastName: '',
      firstName: '',
      username: '',
      password: '',
      email: '',
      dateOfBirth: '',
      gender: '',
      phone: '',
      nationality: '',
      schoolId: schoolId?.toString() || '', // Auto-populate with user's school
      academicYear: '',
      gradeLevel: '',
      classId: selectedClass?.toString() || '', // Auto-populate with selected class if any

      // Location info
      residenceFullAddress: '',

      // Parent info
      fatherFirstName: '',
      fatherLastName: '',
      fatherPhone: '',
      fatherDateOfBirth: '',
      fatherGender: 'MALE',
      fatherOccupation: '',
      fatherResidenceFullAddress: '',

      motherFirstName: '',
      motherLastName: '',
      motherPhone: '',
      motherDateOfBirth: '',
      motherGender: 'FEMALE',
      motherOccupation: '',
      motherResidenceFullAddress: '',

      // Additional fields
      ethnicGroup: '',
      accessibility: []
    }]);
  };

  const removeRow = (index) => {
    setStudents(prev => {
      const newStudents = prev.filter((_, i) => i !== index);

      // If all rows are deleted, add a new empty row
      if (newStudents.length === 0) {
        return [{
          // Student basic info
          lastName: '',
          firstName: '',
          username: '',
          password: '',
          email: '',
          dateOfBirth: '',
          gender: '',
          phone: '',
          nationality: '',
          schoolId: schoolId?.toString() || '', // Auto-populate with user's school
          academicYear: '',
          gradeLevel: '',
          classId: selectedClass?.toString() || '', // Auto-populate with selected class if any

          // Location info
          residenceFullAddress: '',

          // Parent info
          fatherFirstName: '',
          fatherLastName: '',
          fatherPhone: '',
          fatherDateOfBirth: '',
          fatherGender: 'MALE',
          fatherOccupation: '',
          fatherResidenceFullAddress: '',

          motherFirstName: '',
          motherLastName: '',
          motherPhone: '',
          motherDateOfBirth: '',
          motherGender: 'FEMALE',
          motherOccupation: '',
          motherResidenceFullAddress: '',

          // Additional fields
          ethnicGroup: '',
          accessibility: []
        }];
      }

      return newStudents;
    });
  };

  const isValidDate = (dateStr) => {
    if (!dateStr || dateStr.trim() === '') return true; // Empty is valid (optional field)

    const trimmedDate = String(dateStr).trim();
    const match = trimmedDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (!match) return false;

    const [, day, month, year] = match;
    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);

    // Validate ranges
    if (y < 1900 || y > 2100) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;

    // More sophisticated day validation based on month
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Check for leap year
    const isLeapYear = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    if (m === 2 && isLeapYear) {
      daysInMonth[1] = 29;
    }

    // Validate day is within the valid range for the month
    if (d > daysInMonth[m - 1]) return false;

    return true;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const loadingKey = 'bulkImport';
      startLoading(loadingKey, 'កំពុងនាំចូលសិស្ស...');

      // Validate that a school ID exists
      if (!schoolId) {
        showError('គ្មានព័ត៌មានសាលារបស់អ្នក។ សូមទាក់ទងអ្នកគ្រប់គ្រង។', { duration: 5000 });
        stopLoading(loadingKey);
        setLoading(false);
        return;
      }

      // Validate student count limit (maximum 70 students)
      if (students.length > 70) {
        showError('អ្នកអាចបញ្ជូនសិស្សបានច្រើនបំផុត ៧០នាក់ក្នុងមួយពេល។ សូមកាត់បន្ថយចំនួនសិស្សហើយព្យាយាមម្តងទៀត។', { duration: 5000 });
        stopLoading(loadingKey);
        setLoading(false);
        return;
      }

      // Show initial toast notification
      showSuccess('កំពុងចាប់ផ្តើមនាំចូលសិស្ស...');

      // Check for invalid dates
      const invalidDates = students.filter(student =>
        student.dateOfBirth && !isValidDate(student.dateOfBirth)
      );

      if (invalidDates.length > 0) {
        showError(`មានកាលបរិច្ឆេទមិនត្រឹមត្រូវ ${invalidDates.length} កន្លែង។ សូមពិនិត្យទម្រង់ dd/mm/yyyy (ឧទាហរណ៍: 22/03/2025)`, { duration: 5000 });
        stopLoading(loadingKey);
        setLoading(false);
        return;
      }

      // Validate data - check required fields according to API specification
      const validStudents = students.filter(student => {
        const hasRequiredFields =
          student.firstName && student.firstName.trim() &&
          student.lastName && student.lastName.trim() &&
          student.username && student.username.trim() &&
          student.dateOfBirth && student.dateOfBirth.trim() &&
          student.gender &&
          (student.schoolId || student.schoolId === 0);

        return hasRequiredFields;
      });

      if (validStudents.length === 0) {
        showError('សូមបញ្ចូលព័ត៌មានសិស្សយ៉ាងហោចណាស់ម្នាក់ (ត្រូវការនាម គោត្តនាម ឈ្មោះអ្នកប្រើ ថ្ងៃខែឆ្នាំកំណើត ភេទ និងលេខសាលា)', { duration: 5000 });
        stopLoading(loadingKey);
        setLoading(false);
        return;
      }

      // Show validation success toast
      showSuccess(`សូមអភ័យទោស! បានធ្វើការផ្ទៀងផ្ទាត់ទិន្នន័យ ${validStudents.length} សិស្សដោយជោគជ័យ`);

      // Helper function to convert dd/mm/yy to yyyy-mm-dd for API
      const convertDateFormat = (dateStr) => {
        if (!dateStr || !dateStr.trim()) return undefined;

        // If it's already in yyyy-mm-dd format, return as is
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dateStr;
        }

        // If it's in dd/mm/yy format, convert to yyyy-mm-dd
        const ddmmyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (ddmmyyMatch) {
          const [, day, month, year] = ddmmyyMatch;
          const fullYear = year.length === 2 ? `20${year}` : year;
          return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        // Try to parse as regular date string
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('Could not parse date:', dateStr);
        }

        return undefined;
      };

      // Helper function to normalize phone numbers
      const normalizePhoneNumber = (phone) => {
        if (!phone || phone === '') return '';

        // Remove all whitespace and special characters except digits
        const digitsOnly = phone.toString().replace(/\D/g, '');

        if (!digitsOnly) return ''; // No digits found

        // If only "0", treat as blank
        if (digitsOnly === '0') return '';

        // If already starts with 0, keep as is
        if (digitsOnly.startsWith('0')) return digitsOnly;

        // If doesn't start with 0, add it
        return '0' + digitsOnly;
      };

      // Transform data for API - match the expected format with required/optional fields
      const transformedData = validStudents.map(student => {
        // Build the base student object with required fields
        const studentData = {
          first_name: student.firstName.trim(),
          last_name: student.lastName.trim(),
          username: student.username.trim() || `${student.firstName.trim().toLowerCase()}.${student.lastName.trim().toLowerCase()}`,
          password: student.password.trim() || 'Student@123', // Default password for required field
          date_of_birth: convertDateFormat(student.dateOfBirth),
          gender: student.gender ? student.gender.toUpperCase() : undefined,
          school_id: schoolId, // Use school from authenticated user
          // Note: student_number is NOT included - backend will auto-generate it
        };

        // Add optional fields only if they have values
        if (student.email && student.email.trim()) {
          studentData.email = student.email.trim();
        }

        // Normalize phone number: auto-prefix 0 if missing, blank if only "0"
        const normalizedPhone = normalizePhoneNumber(student.phone);
        if (normalizedPhone) {
          studentData.phone = normalizedPhone;
        }

        // Temporarily remove nationality - API may not expect this field
        // if (student.nationality && student.nationality.trim()) {
        //   studentData.nationality = student.nationality.trim();
        // }

        // Remove academic_year - API may not expect this field or it might cause validation issues
        // if (student.academicYear && student.academicYear.trim()) {
        //   studentData.academic_year = student.academicYear.trim();
        // }

        if (student.gradeLevel && student.gradeLevel.trim()) {
          studentData.grade_level = parseInt(student.gradeLevel.trim());
        }

        // Add class ID if provided (optional direct class assignment)
        if (student.classId && student.classId.toString().trim()) {
          studentData.class_id = parseInt(student.classId.toString().trim());
        }

        if (student.residenceFullAddress && student.residenceFullAddress.trim()) {
          studentData.residence = {
            full_address: student.residenceFullAddress.trim()
          };
        }

        // Add ethnic group if provided
        if (student.ethnicGroup && student.ethnicGroup.trim()) {
          studentData.ethnic_group = student.ethnicGroup.trim();
        }

        // Add accessibility if provided - convert to Khmer labels
        if (student.accessibility && student.accessibility.length > 0) {
          studentData.accessibility = student.accessibility.map(value => {
            const option = accessibilityOptions.find(opt => opt.value === value);
            return option ? option.label : value;
          });
        }

        // Add parents data if available
        const parents = [];

        // Add father if father info is provided
        if (student.fatherFirstName && student.fatherFirstName.trim()) {
          const normalizedFatherPhone = normalizePhoneNumber(student.fatherPhone);
          parents.push({
            first_name: student.fatherFirstName.trim(),
            last_name: student.fatherLastName.trim() || '',
            phone: normalizedFatherPhone || undefined,
            gender: 'MALE',
            occupation: student.fatherOccupation.trim() || undefined,
            residence: student.fatherResidenceFullAddress && student.fatherResidenceFullAddress.trim() ? {
              full_address: student.fatherResidenceFullAddress.trim()
            } : undefined,
            relationship: 'FATHER'
          });
        }

        // Add mother if mother info is provided
        if (student.motherFirstName && student.motherFirstName.trim()) {
          const normalizedMotherPhone = normalizePhoneNumber(student.motherPhone);
          parents.push({
            first_name: student.motherFirstName.trim(),
            last_name: student.motherLastName.trim() || '',
            phone: normalizedMotherPhone || undefined,
            gender: 'FEMALE',
            occupation: student.motherOccupation.trim() || undefined,
            residence: student.motherResidenceFullAddress && student.motherResidenceFullAddress.trim() ? {
              full_address: student.motherResidenceFullAddress.trim()
            } : undefined,
            relationship: 'MOTHER'
          });
        }

        // Add parents to student data if any exist
        if (parents.length > 0) {
          studentData.parents = parents;
        }

        return studentData;
      });

      // Initialize progress tracker
      setShowProgressTracker(true);
      setIsImporting(true);
      setImportResults([]);
      setProcessedCount(0);

      // Initialize results array with all students (all processing initially)
      const initialResults = validStudents.map((student) => ({
        studentName: getFullName(student, student.username),
        username: student.username,
        processing: true,
        success: false,
        error: null
      }));
      setImportResults(initialResults);

      // Use async queue-based bulk registration
      try {
        console.log(`Starting bulk registration for ${transformedData.length} students (async queue)`);

        // Call the new async bulk register endpoint (pass array directly, service will wrap it)
        const response = await studentService.bulkRegister(transformedData);

        // Extract batch ID and initial response data
        const { batch_id: batchId, success_count: initialSuccessCount, failed_count: initialFailureCount } = response.data || response;

        console.log(`Bulk registration queued with batch ID: ${batchId}`);
        console.log(`Initial response - Success: ${initialSuccessCount}, Failed: ${initialFailureCount}`);

        // Use a local variable to track results throughout polling (avoids async state issues)
        let currentResults = [...initialResults];
        setImportResults(currentResults);

        // Poll for batch status every 2 seconds
        let isComplete = false;
        let pollAttempts = 0;
        let lastCompletedCount = 0;
        let noProgressAttempts = 0;
        const maxPollAttempts = 600; // 20 minutes max polling (600 attempts * 2 seconds)
        const pollIntervalMs = 2000; // Poll every 2 seconds instead of 1
        const noProgressThreshold = 15; // Force completion after 15 polls with no progress (30 seconds)

        while (!isComplete && pollAttempts < maxPollAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
          pollAttempts++;

          try {
            // Get batch status
            const statusResponse = await studentService.getBulkRegistrationStatus(batchId);
            const statusData = statusResponse.data || statusResponse;

            const {
              results: batchResults = [],
              completed = 0,
              total = 0,
              is_complete = false,
              success_count: apiSuccessCount = 0,
              failed_count: apiFailureCount = 0
            } = statusData;

            // Calculate success and failure counts from results
            const successCount = batchResults.filter(r => r.success).length || apiSuccessCount;
            const failureCount = batchResults.filter(r => !r.success).length || apiFailureCount;

            // Check if we're making progress
            if (completed === lastCompletedCount) {
              noProgressAttempts++;
              console.log(`⚠️ No progress detected: ${noProgressAttempts}/${noProgressThreshold} attempts`);
            } else {
              noProgressAttempts = 0; // Reset counter when progress is made
              lastCompletedCount = completed;
            }

            console.log(`Batch status - Completed: ${completed}/${total}, Success: ${successCount}, Failed: ${failureCount}, Is Complete: ${is_complete}`);

            // Update progress
            setProcessedCount(completed);

            // Update individual student results if available
            if (Array.isArray(batchResults) && batchResults.length > 0) {
              currentResults = currentResults.map((result, idx) => {
                const batchResult = batchResults.find(br => br.index === idx);
                if (batchResult) {
                  return {
                    ...result,
                    processing: false,
                    success: batchResult.success === true,
                    error: batchResult.error || null
                  };
                }
                return result;
              });
              setImportResults([...currentResults]);
            }

            // Force completion if no progress for too long (batch might be stuck)
            if (noProgressAttempts >= noProgressThreshold) {
              isComplete = true;
              console.log(`⏱️ Force completing batch due to no progress for ${noProgressThreshold * 2} seconds`);
              console.log(`✅ Batch processing complete (forced): ${successCount} successful, ${failureCount} failed`);
              setIsImporting(false);
            }
            // Check if batch is complete (normal completion)
            else if (is_complete) {
              isComplete = true;
              console.log(`✅ Batch processing complete: ${successCount} successful, ${failureCount} failed`);
              setIsImporting(false);
            }

            // Process final results if batch is now complete (either way)
            if (isComplete) {
              // Mark all remaining unprocessed students as successful (API only returns failures + some successes)
              const finalResults = currentResults.map((result, idx) => {
                const batchResult = batchResults && Array.isArray(batchResults)
                  ? batchResults.find(br => br.index === idx)
                  : null;

                if (batchResult) {
                  return {
                    ...result,
                    processing: false,
                    success: batchResult.success === true,
                    error: batchResult.error || null
                  };
                }

                // If no explicit result and batch is complete, mark as successful
                return {
                  ...result,
                  processing: false,
                  success: true,
                  error: null
                };
              });

              console.log(`📋 Final results to display:`, finalResults);
              console.log(`📊 Success count: ${successCount}, Failure count: ${failureCount}`);
              setImportResults(finalResults);

              // Show summary
              if (successCount > 0) {
                showSuccess(`🎉 បាននាំចូលសិស្សចំនួន ${successCount} នាក់ដោយជោគជ័យ!`, { duration: 7000 });
              }

              if (failureCount > 0) {
                showError(`⚠️ មានកំហុស ${failureCount} នាក់ក្នុងការនាំចូល។ សូមពិនិត្យលម្អិត`, { duration: 7000 });
              }

              // Clear batch data on the server after completion
              try {
                await studentService.clearBulkRegistrationBatch(batchId);
                console.log(`✅ Batch data cleared successfully`);
              } catch (clearErr) {
                console.warn(`⚠️ Failed to clear batch data, but import completed:`, clearErr);
              }

              // Handle form after import completion
              setTimeout(() => {
                if (failureCount === 0) {
                  // All succeeded - clear the form completely
                  setStudents([{
                    // Student basic info
                    lastName: '',
                    firstName: '',
                    username: '',
                    password: '',
                    email: '',
                    dateOfBirth: '',
                    gender: '',
                    phone: '',
                    nationality: '',
                    schoolId: '',
                    academicYear: '',
                    gradeLevel: '',
                    // Location info
                    residenceFullAddress: '',
                    // Parent info
                    fatherFirstName: '',
                    fatherLastName: '',
                    fatherPhone: '',
                    fatherGender: 'MALE',
                    fatherOccupation: '',
                    fatherResidenceFullAddress: '',
                    motherFirstName: '',
                    motherLastName: '',
                    motherPhone: '',
                    motherDateOfBirth: '',
                    motherGender: 'FEMALE',
                    motherOccupation: '',
                    motherResidenceFullAddress: '',
                    // Additional fields
                    ethnicGroup: '',
                    accessibility: []
                  }]);
                } else {
                  // Partial failures - remove only successful students from form
                  // Keep only the failed students so user can retry them
                  const failedStudents = finalResults.filter(result => !result.success);

                  if (failedStudents.length > 0) {
                    // Create new student entries for the failed ones
                    const failedStudentRecords = validStudents.filter((_, idx) => {
                      const wasSuccessful = finalResults[idx]?.success;
                      return !wasSuccessful;
                    });

                    setStudents(failedStudentRecords);
                    showSuccess(`✅ ត្រូវបានលុបចោលសិស្សដែលបាននាំចូលដោយជោគជ័យ។ សូមដោះស្រាយកំហុស ${failureCount} នាក់`, { duration: 5000 });
                  } else {
                    // No failed students - clear form
                    setStudents([{
                      lastName: '',
                      firstName: '',
                      username: '',
                      password: '',
                      email: '',
                      dateOfBirth: '',
                      gender: '',
                      phone: '',
                      nationality: '',
                      schoolId: '',
                      academicYear: '',
                      gradeLevel: '',
                      residenceFullAddress: '',
                      fatherFirstName: '',
                      fatherLastName: '',
                      fatherPhone: '',
                      fatherGender: 'MALE',
                      fatherOccupation: '',
                      fatherResidenceFullAddress: '',
                      motherFirstName: '',
                      motherLastName: '',
                      motherPhone: '',
                      motherDateOfBirth: '',
                      motherGender: 'FEMALE',
                      motherOccupation: '',
                      motherResidenceFullAddress: '',
                      ethnicGroup: '',
                      accessibility: []
                    }]);
                  }
                }
              }, 4000); // Wait 4 seconds before updating form to let user see results
            }

            // Break out of polling loop when batch is complete
            if (isComplete) {
              break;
            }
          } catch (statusErr) {
            console.error(`Error checking batch status:`, statusErr);
            // Continue polling on status check error
          }
        }

        if (!isComplete) {
          setIsImporting(false);
          showError('⏱️ ការលើកលែងកំហុស ពេលវេលាក្នុងការរង់ចាំលទ្ធផល។ សូមពិនិត្យលម្អិតលម្អ។', { duration: 7000 });
        }
      } catch (err) {
        console.error('Bulk registration error:', err);
        setIsImporting(false);
        showError('💥 ការនាំចូលបានបរាជ័យ៖ ' + (err.message || 'មិនស្គាល់កំហុស'), { duration: 7000 });
      }

      stopLoading(loadingKey);
    } catch (err) {
      console.error('Bulk import error:', err);

      // Mark all as failed in progress tracker
      setIsImporting(false);
      if (importResults.length > 0) {
        const failedResults = importResults.map(result => ({
          ...result,
          processing: false,
          success: false,
          error: err.message || 'Unknown error'
        }));
        setImportResults(failedResults);
      }

      // Show specific error toast based on error type
      if (err.response?.status === 400) {
        showError('❌ កំហុសក្នុងការផ្ទៀងផ្ទាត់ទិន្នន័យ៖ សូមពិនិត្យទិន្នន័យសិស្សឡើងវិញ', { duration: 8000 });
      } else if (err.response?.status === 500) {
        showError('🔧 មានបញ្ហាក្នុងម៉ាស៊ីនមេ៖ សូមព្យាយាមម្តងទៀតក្រោយមក', { duration: 6000 });
      } else if (err.message?.includes('network') || err.message?.includes('timeout')) {
        showError('🌐 កំហុសក្នុងការតភ្ជាប់បណ្តាញ៖ សូមពិនិត្យអ៊ីនធឺណិតរបស់អ្នក', { duration: 6000 });
      } else {
        showError('💥 ការនាំចូលបានបរាជ័យ៖ ' + (err.message || 'មិនស្គាល់កំហុស'), { duration: 7000 });
      }

      handleError(err, {
        toastMessage: false // Disable default error toast since we show custom ones
      });
    } finally {
      setLoading(false);
    }
  };

  const MAX_STUDENTS = 70;

  const hasInvalidDates = students.some(student =>
    student.dateOfBirth && !isValidDate(student.dateOfBirth)
  );

  const hasInvalidCells = students.some(student =>
    columns.some(column =>
      column.key !== 'actions' && isCellInvalid(student, column.key)
    )
  );

  const hasAtLeastOneValidStudent = students.some(student => {
    const hasRequiredFields =
      student.firstName && student.firstName.trim() &&
      student.lastName && student.lastName.trim() &&
      student.username && student.username.trim() &&
      student.dateOfBirth && student.dateOfBirth.trim() &&
      student.gender &&
      (student.schoolId || student.schoolId === 0);

    return hasRequiredFields;
  });

  const canSubmit =
    !!schoolId &&
    !loading &&
    !isImporting &&
    students.length > 0 &&
    students.length <= MAX_STUDENTS &&
    hasAtLeastOneValidStudent &&
    !hasInvalidDates &&
    !hasInvalidCells;

  // Debug logging for canSubmit conditions
  useEffect(() => {
    console.log('🔍 BulkStudentImport canSubmit debug:', {
      schoolId: schoolId,
      '!!schoolId': !!schoolId,
      loading,
      '!loading': !loading,
      isImporting,
      '!isImporting': !isImporting,
      'students.length': students.length,
      'students.length > 0': students.length > 0,
      'students.length <= MAX_STUDENTS': students.length <= MAX_STUDENTS,
      hasAtLeastOneValidStudent,
      hasInvalidDates,
      '!hasInvalidDates': !hasInvalidDates,
      hasInvalidCells,
      '!hasInvalidCells': !hasInvalidCells,
      canSubmit
    });
  }, [schoolId, loading, isImporting, students.length, hasAtLeastOneValidStudent, hasInvalidDates, hasInvalidCells, canSubmit]);

  if (initialLoading) {
    return (
      <PageLoader
        message="កំពុងផ្ទុក..."
        className="min-h-screen bg-gray-50"
      />
    );
  }

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => window.location.reload()}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  return (
    <PageTransition variant="fade" className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <FadeInSection className="mb-4">
          <BulkImportHeader
            onExcelImport={handleExcelImport}
            onDownloadTemplate={downloadTemplate}
            onAddRow={addRow}
            onSubmit={handleSubmit}
            loading={loading}
            schoolId={schoolId}
            schoolName={schoolName}
            studentsCount={students.length}
            canSubmit={canSubmit}
          />
        </FadeInSection>

        {/* School Info Display - Conditional based on role */}
        {(userRole === 1 || (userRole === 14 && schoolId && schoolName)) && (
          <FadeInSection delay={25} className="mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('schoolInfo') || 'ព័ត៌មានសាលា'}
              </h3>

              {/* For Admins: Show Cascading Selection */}
              {userRole === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Province Dropdown */}
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('province', 'Province')}
                    </label>
                    <Dropdown
                      value={selectedProvince}
                      onValueChange={setSelectedProvince}
                      options={provinces.map(province => ({
                        value: province.id.toString(),
                        label: province.province_name_kh || province.province_name_en
                      }))}
                      placeholder={t('selectProvince', 'Select Province')}
                      disabled={loadingProvinces}
                      className="w-full"
                      triggerClassName="w-full"
                    />
                  </div>

                  {/* District Dropdown */}
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('district', 'District')}
                    </label>
                    <Dropdown
                      value={selectedDistrict}
                      onValueChange={setSelectedDistrict}
                      options={districts.map(district => ({
                        value: district.district_code,
                        label: district.district_name_kh || district.district_name_en
                      }))}
                      placeholder={t('selectDistrict', 'Select District')}
                      disabled={!selectedProvince || loadingDistricts}
                      className="w-full"
                      triggerClassName="w-full"
                    />
                  </div>

                  {/* School SearchableDropdown */}
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('school', 'School')} <span className="text-red-500">*</span>
                    </label>
                    <SearchableDropdown
                      value={selectedSchool}
                      onValueChange={setSelectedSchool}
                      options={schools.map(school => ({
                        value: school.id?.toString() || '',
                        label: school.name || school.school_name || '',
                        code: school.code || school.school_code || '' // Add school code
                      }))}
                      placeholder={t('selectSchool') || 'ជ្រើសរើសសាលា'}
                      searchPlaceholder={t('searchSchool') || 'វាយបញ្ចូលនាមសាលា...'}
                      disabled={!selectedDistrict || loadingSchools || schools.length === 0}
                      isLoading={loadingSchools}
                      emptyMessage={t('noSchools') || 'គ្មានសាលាទេ'}
                      minWidth="w-full"
                      triggerClassName="w-full"
                      showSecondaryInfo={true}
                      secondaryInfoKey="code"
                    />
                  </div>
                </div>
              )}

              {/* For Admins: Show selected school info after selection */}
              {userRole === 1 && schoolId && schoolName && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">ឈ្មោះសាលាដែលបានជ្រើស:</span> {schoolName}
                  </p>
                </div>
              )}

              {/* For Directors: Show auto-populated school info only */}
              {userRole === 14 && schoolId && schoolName && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">ឈ្មោះសាលា:</span> {schoolName}
                  </p>
                </div>
              )}

              {/* Class Selection (Optional) - Show when school is selected */}
              {schoolId && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    {t('classAssignment') || 'ការផ្តល់ឯកសារថ្នាក់ (ស្ថិតក្នុងលក្ខណៈស្ម័គ្រចិត្ត)'}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Grade Level Dropdown */}
                    <div className="w-full">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('gradeLevel', 'Grade Level')}
                      </label>
                      <Dropdown
                        value={selectedGradeLevel}
                        onValueChange={setSelectedGradeLevel}
                        options={availableGradeLevels.map(level => ({
                          value: level.toString(),
                          label: `ថ្នាក់ទី${level}` // e.g., ថ្នាក់ទី1
                        }))}
                        placeholder={t('selectGradeLevel', 'Select Grade Level')}
                        disabled={!schoolId || loadingGradeLevels}
                        className="w-full"
                        triggerClassName="w-full"
                      />
                    </div>

                    {/* Class Dropdown */}
                    <div className="w-full">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('class', 'Class')}
                      </label>
                      <SearchableDropdown
                        value={selectedClass?.toString() || ''}
                        onValueChange={(value) => setSelectedClass(value ? parseInt(value) : '')}
                        options={availableClasses.map(cls => ({
                          value: (cls.id || cls.classId)?.toString() || '',
                          label: cls.name || cls.className || '',
                          section: cls.section || ''
                        }))}
                        placeholder={t('selectClass') || 'ជ្រើសរើសថ្នាក់'}
                        searchPlaceholder={t('searchClass') || 'វាយបញ្ចូលឈ្មោះថ្នាក់...'}
                        disabled={!selectedGradeLevel || loadingClasses || availableClasses.length === 0}
                        isLoading={loadingClasses}
                        emptyMessage={t('noClasses') || 'គ្មានថ្នាក់ទេ'}
                        minWidth="w-full"
                        triggerClassName="w-full"
                        showSecondaryInfo={true}
                        secondaryInfoKey="section"
                      />
                    </div>
                  </div>

                  {/* Clear Class Selection */}
                  {selectedClass && (
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          setSelectedClass('');
                          setSelectedGradeLevel('');
                          setStudents(prevStudents =>
                            prevStudents.map(student => ({
                              ...student,
                              classId: ''
                            }))
                          );
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {t('clearClassSelection', 'មិនបង្ហាញថ្នាក់')}
                      </button>
                    </div>
                  )}

                  {/* Selected Class Info */}
                  {selectedClass && availableClasses.find(c => (c.id || c.classId).toString() === selectedClass?.toString()) && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">ថ្នាក់ដែលបានជ្រើស:</span> {availableClasses.find(c => (c.id || c.classId).toString() === selectedClass?.toString())?.name}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </FadeInSection>
        )}

        {/* Excel-like Table */}
        <FadeInSection delay={50}>
          <BulkImportTable
            students={students}
            columns={columns}
            schoolName={schoolName}
            updateCell={updateCell}
            removeRow={removeRow}
            isCellInvalid={isCellInvalid}
            isCellSelected={isCellSelected}
            handleCellClick={handleCellClick}
            handleCellMouseDown={handleCellMouseDown}
            handleCellMouseEnter={handleCellMouseEnter}
            handleCellMouseUp={handleCellMouseUp}
            selectedRange={selectedRange}
            tableRef={tableRef}
          />
        </FadeInSection>
      </div>

      {/* Excel Import Progress Modal */}
      <ExportProgressModal
        isOpen={showExcelImportProgress}
        progress={excelImportProgress}
        status={excelImportProgress === 100 ? 'success' : 'processing'}
        onComplete={() => {
          setShowExcelImportProgress(false);
          setExcelImportProgress(0);
        }}
      />

      {/* Bulk Import Progress Tracker */}
      <BulkImportProgressTracker
        isOpen={showProgressTracker}
        onClose={() => setShowProgressTracker(false)}
        importResults={importResults}
        isProcessing={isImporting}
        totalStudents={importResults.length}
        processedCount={processedCount}
      />
    </PageTransition>
  );
}