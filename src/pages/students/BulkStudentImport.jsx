import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { studentService } from '../../utils/api/services/studentService';
import { userService } from '../../utils/api/services/userService';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { PageLoader } from '../../components/ui/DynamicLoader';
import BulkImportProgressTracker from '../../components/students/BulkImportProgressTracker';
import BulkImportHeader from '../../components/students/BulkImportHeader';
import BulkImportTable from '../../components/students/BulkImportTable';
import { templateDownloader } from '../../utils/templateDownloader';
import { excelImportHandler } from '../../utils/excelImportHandler';


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

  const [students, setStudents] = useState([
    {
      // Student basic info
      lastName: '',
      firstName: '',
      username: '',
      password: '',
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
      fatherDateOfBirth: '',
      fatherGender: '',
      fatherOccupation: '',
      fatherResidenceFullAddress: '',

      motherFirstName: '',
      motherLastName: '',
      motherPhone: '',
      motherDateOfBirth: '',
      motherGender: '',
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

  // Excel-like functionality
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [selectedRange, setSelectedRange] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startSelection, setStartSelection] = useState(null);
  const tableRef = useRef(null);

  const genderOptions = [
    { value: 'MALE', label: 'ប្រុស' },
    { value: 'FEMALE', label: 'ស្រី' }
  ];

  const nationalityOptions = [
    { value: 'ខ្មែរ', label: 'ខ្មែរ' }
  ];

  const ethnicGroupOptions = [
    { value: 'ជនជាតិព្នង', label: 'ជនជាតិព្នង' },
    { value: 'ជនជាតិកួយ', label: 'ជនជាតិកួយ' },
    { value: 'ជនជាតិគ្រឹង', label: 'ជនជាតិគ្រឹង' },
    { value: 'ជនជាតិរដែរ', label: 'ជនជាតិរដែរ' },
    { value: 'ជនជាតិស្ទៀង', label: 'ជនជាតិស្ទៀង' },
    { value: 'ជនជាតិទំពួន', label: 'ជនជាតិទំពួន' },
    { value: 'ជនជាតិព្រៅ', label: 'ជនជាតិព្រៅ' },
    { value: 'ជនជាតិកាវែត', label: 'ជនជាតិកាវែត' },
    { value: 'ជនជាតិកាចក់', label: 'ជនជាតិកាចក់' },
    { value: 'ជនជាតិព័រ', label: 'ជនជាតិព័រ' },
    { value: 'ជនជាតិខោញ', label: 'ជនជាតិខោញ' },
    { value: 'ជនជាតិជង', label: 'ជនជាតិជង' },
    { value: 'ជនជាតិស្អូច', label: 'ជនជាតិស្អូច' },
    { value: 'ជនជាតិរដែ', label: 'ជនជាតិរដែ' },
    { value: 'ជនជាតិខិ', label: 'ជនជាតិខិ' },
    { value: 'ជនជាតិរអង', label: 'ជនជាតិរអង' },
    { value: 'ជនជាតិស្ពុង', label: 'ជនជាតិស្ពុង' },
    { value: 'ជនជាតិល្អឺន', label: 'ជនជាតិល្អឺន' },
    { value: 'ជនជាតិសំរែ', label: 'ជនជាតិសំរែ' },
    { value: 'ជនជាតិសួយ', label: 'ជនជាតិសួយ' },
    { value: 'ជនជាតិថ្មូន', label: 'ជនជាតិថ្មូន' },
    { value: 'ជនជាតិលុន', label: 'ជនជាតិលុន' },
    { value: 'ជនជាតិក្រោល', label: 'ជនជាតិក្រោល' },
    { value: 'ជនជាតិមិល', label: 'ជនជាតិមិល' },
    { value: 'ជនជាតិចារាយ', label: 'ជនជាតិចារាយ' }
  ];

  const accessibilityOptions = [
    { value: 'ពិបាកក្នុងការធ្វើចលនា', label: 'ពិបាកក្នុងការធ្វើចលនា' },
    { value: 'ពិបាកក្នុងការស្ដាប់', label: 'ពិបាកក្នុងការស្ដាប់' },
    { value: 'ពិបាកក្នុងការនីយាយ', label: 'ពិបាកក្នុងការនីយាយ' },
    { value: 'ពិបាកក្នុងការមើល', label: 'ពិបាកក្នុងការមើល' },
    { value: 'ពិការសរីរាង្គខាងក្នុង', label: 'ពិការសរីរាង្គខាងក្នុង' },
    { value: 'ពិការសតិបញ្ញា', label: 'ពិការសតិបញ្ញា' },
    { value: 'ពិការផ្លូវចិត្ត', label: 'ពិការផ្លូវចិត្ត' },
    { value: 'ពិការផ្សេងៗ', label: 'ពិការផ្សេងៗ' }
  ];

  const gradeLevelOptions = [
    { value: '1', label: 'ថ្នាក់ទី១' },
    { value: '2', label: 'ថ្នាក់ទី២' },
    { value: '3', label: 'ថ្នាក់ទី៣' },
    { value: '4', label: 'ថ្នាក់ទី៤' },
    { value: '5', label: 'ថ្នាក់ទី៥' },
    { value: '6', label: 'ថ្នាក់ទី៦' }
  ];

  // Generate academic year options (current year and next 2 years)
  const currentYear = new Date().getFullYear();
  const academicYearOptions = [
    { value: `${currentYear}-${currentYear + 1}`, label: `${currentYear}-${currentYear + 1}` },
    { value: `${currentYear + 1}-${currentYear + 2}`, label: `${currentYear + 1}-${currentYear + 2}` },
    { value: `${currentYear + 2}-${currentYear + 3}`, label: `${currentYear + 2}-${currentYear + 3}` }
  ];

  // Validation function to check if a cell value is invalid
  const isCellInvalid = (student, columnKey) => {
    const value = student[columnKey];

    // Don't show red border for empty cells
    if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
      return false;
    }

    // Phone number validation (must start with 0 and be at least 8 digits total)
    if (columnKey === 'phone' || columnKey === 'fatherPhone' || columnKey === 'motherPhone') {
      const phoneRegex = /^0\d{8,}$/;
      return !phoneRegex.test(value.replace(/\s/g, ''));
    }

    // Date validation (dd/mm/yyyy format)
    if (columnKey === 'dateOfBirth' || columnKey === 'fatherDateOfBirth' || columnKey === 'motherDateOfBirth') {
      const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const match = value.match(dateRegex);
      if (!match) return true;
      const [, day, month, year] = match;
      const d = parseInt(day);
      const m = parseInt(month);
      const y = parseInt(year);
      return !(d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100);
    }

    // Grade level validation (should be a number between 1-6)
    if (columnKey === 'gradeLevel') {
      const grade = parseInt(value);
      return isNaN(grade) || grade < 1 || grade > 6;
    }

    // Username validation (only English letters and numbers, 3-50 chars)
    if (columnKey === 'username') {
      const usernameRegex = /^[a-zA-Z0-9]{3,50}$/;
      return !usernameRegex.test(value);
    }

    // Gender validation
    if (columnKey === 'gender' || columnKey === 'fatherGender' || columnKey === 'motherGender') {
      return !['MALE', 'FEMALE', 'ប្រុស', 'ស្រី'].includes(value.toUpperCase());
    }

    return false; // Default: field is valid
  };

  const columns = [
    // Student Basic Info
    { key: 'lastName', header: 'គោត្តនាម', width: 'min-w-[100px]' },
    { key: 'firstName', header: 'នាម', width: 'min-w-[200px]' },
    { key: 'username', header: 'ឈ្មោះអ្នកប្រើ', width: 'min-w-[150px]' },
    { key: 'password', header: 'ពាក្យសម្ងាត់', width: 'min-w-[150px]' },
    { key: 'dateOfBirth', header: 'ថ្ងៃខែឆ្នាំកំណើត (dd/mm/yyyy)', width: 'min-w-[300px]', type: 'custom-date' },
    { key: 'gender', header: 'ភេទ', width: 'min-w-[80px]', type: 'select', options: genderOptions },
    { key: 'phone', header: 'លេខទូរស័ព្ទ', width: 'min-w-[150px]' },
    { key: 'nationality', header: 'សញ្ជាតិ', width: 'min-w-[80px]', type: 'select', options: nationalityOptions },
    { key: 'schoolId', header: 'លេខសាលា', width: 'min-w-[200px]' },
    { key: 'academicYear', header: 'ឆ្នាំសិក្សា', width: 'min-w-[150px]', type: 'select', options: academicYearOptions },
    { key: 'gradeLevel', header: 'កម្រិតថ្នាក់', width: 'min-w-[120px]', type: 'select', options: gradeLevelOptions },

    // Student Address
    { key: 'residenceFullAddress', header: 'អាសយដ្ឋានពេញ', width: 'min-w-[320px]' },

    // Father Info
    { key: 'fatherFirstName', header: 'នាមឪពុក', width: 'min-w-[250px]' },
    { key: 'fatherLastName', header: 'គោត្តនាមឪពុក', width: 'min-w-[250px]' },
    { key: 'fatherPhone', header: 'ទូរស័ព្ទឪពុក', width: 'min-w-[250px]' },
    { key: 'fatherGender', header: 'ភេទឪពុក', width: 'min-w-[200px]', type: 'select', options: genderOptions },
    { key: 'fatherOccupation', header: 'មុខរបរ​ឪពុក', width: 'min-w-[250px]' },
    { key: 'fatherResidenceFullAddress', header: 'អាសយដ្ឋានពេញឪពុក', width: 'min-w-[320px]' },

    // Mother Info
    { key: 'motherFirstName', header: 'នាមម្តាយ', width: 'min-w-[250px]' },
    { key: 'motherLastName', header: 'គោត្តនាមម្តាយ', width: 'min-w-[250px]' },
    { key: 'motherPhone', header: 'ទូរស័ព្ទម្តាយ', width: 'min-w-[250px]' },
    { key: 'motherGender', header: 'ភេទម្តាយ', width: 'min-w-[200px]', type: 'select', options: genderOptions },
    { key: 'motherOccupation', header: 'មុខរបរ​ម្តាយ', width: 'min-w-[250px]' },
    { key: 'motherResidenceFullAddress', header: 'អាសយដ្ឋានពេញម្តាយ', width: 'min-w-[320px]' },

    // Additional Fields
    { key: 'ethnicGroup', header: 'ជនជាតិភាគតិច', width: 'min-w-[280px]', type: 'select', options: ethnicGroupOptions },
    { key: 'accessibility', header: 'លក្ខណៈពិសេស', width: 'min-w-[320px]', type: 'multi-select', options: accessibilityOptions },
    { key: 'actions', header: 'សកម្មភាព', width: 'min-w-[120px]' }
  ];

  // Fetch school ID from authenticated user
  useEffect(() => {
    const fetchSchoolId = async () => {
      try {
        if (!user) {
          console.error('No user found in localStorage');
          showError('សូមចូលប្រើប្រាស់ជាមុនសិន។');
          navigate('/login');
          return;
        }

        setInitialLoading(true);
        const accountData = await userService.getMyAccount();

        if (accountData && accountData.school_id) {
          console.log('✅ School ID fetched from account:', accountData.school_id);
          setSchoolId(accountData.school_id);
          setSchoolName(accountData.school?.name || '');

          // Auto-update all student rows with school ID
          setStudents(prevStudents =>
            prevStudents.map(student => ({
              ...student,
              schoolId: accountData.school_id.toString()
            }))
          );
        } else {
          console.error('No school_id found in account data:', accountData);
          showError('គ្មានព័ត៌មានសាលារបស់អ្នក។ សូមទាក់ទងអ្នកគ្រប់គ្រង។');
        }
      } catch (error) {
        console.error('Error fetching school ID:', error);
        handleError(error, {
          toastMessage: 'មិនអាចទាញយកព័ត៌មានសាលា។ សូមព្យាយាមម្តងទៀត។'
        });
      } finally {
        setInitialLoading(false);
      }
    };

    fetchSchoolId();
  }, [user, navigate, showError, handleError]);

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
    // Don't handle keyboard shortcuts when user is typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'TEXTAREA') {
      // Allow normal input behavior for Delete/Backspace when in input fields
      if (event.key === 'Delete' || event.key === 'Backspace') {
        return; // Let the browser handle normal input deletion
      }
      // For other keys, continue with navigation if it's an arrow key, tab, or enter
    }

    const { row, col } = selectedCell;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (row > 0) {
          setSelectedCell({ row: row - 1, col });
          setSelectedRange(null);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (row < students.length - 1) {
          setSelectedCell({ row: row + 1, col });
          setSelectedRange(null);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (col > 0) {
          setSelectedCell({ row, col: col - 1 });
          setSelectedRange(null);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (col < columns.length - 2) { // -2 to skip actions column
          setSelectedCell({ row, col: col + 1 });
          setSelectedRange(null);
        }
        break;
      case 'Tab':
        event.preventDefault();
        if (event.shiftKey) {
          if (col > 0) {
            setSelectedCell({ row, col: col - 1 });
          } else if (row > 0) {
            setSelectedCell({ row: row - 1, col: columns.length - 2 });
          }
        } else {
          if (col < columns.length - 2) {
            setSelectedCell({ row, col: col + 1 });
          } else if (row < students.length - 1) {
            setSelectedCell({ row: row + 1, col: 0 });
          }
        }
        setSelectedRange(null);
        break;
      case 'Enter':
        event.preventDefault();
        if (row < students.length - 1) {
          setSelectedCell({ row: row + 1, col });
          setSelectedRange(null);
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

  // Excel import functionality
  const handleExcelImport = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const mappedStudents = await excelImportHandler(
      file,
      ethnicGroupOptions,
      accessibilityOptions,
      showError,
      showSuccess
    );

    if (mappedStudents && mappedStudents.length > 0) {
      setStudents(mappedStudents);
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

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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
      dateOfBirth: '',
      gender: '',
      phone: '',
      nationality: '',
      schoolId: schoolId?.toString() || '', // Auto-populate with user's school
      academicYear: '',
      gradeLevel: '',

      // Location info
      residenceFullAddress: '',

      // Parent info
      fatherFirstName: '',
      fatherLastName: '',
      fatherPhone: '',
      fatherDateOfBirth: '',
      fatherGender: '',
      fatherOccupation: '',
      fatherResidenceFullAddress: '',

      motherFirstName: '',
      motherLastName: '',
      motherPhone: '',
      motherDateOfBirth: '',
      motherGender: '',
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
          dateOfBirth: '',
          gender: '',
          phone: '',
          nationality: '',
          schoolId: schoolId?.toString() || '', // Auto-populate with user's school
          academicYear: '',
          gradeLevel: '',

          // Location info
          residenceFullAddress: '',

          // Parent info
          fatherFirstName: '',
          fatherLastName: '',
          fatherPhone: '',
          fatherDateOfBirth: '',
          fatherGender: '',
          fatherOccupation: '',
          fatherResidenceFullAddress: '',

          motherFirstName: '',
          motherLastName: '',
          motherPhone: '',
          motherDateOfBirth: '',
          motherGender: '',
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

      // Validate date format function
      const isValidDate = (dateStr) => {
        if (!dateStr || dateStr.trim() === '') return true; // Empty is valid (optional field)
        const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!match) return false;
        const [, day, month, year] = match;
        const d = parseInt(day);
        const m = parseInt(month);
        const y = parseInt(year);
        return d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100;
      };

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
        };

        // Add optional fields only if they have values
        if (student.phone && student.phone.trim()) {
          studentData.phone = student.phone.trim();
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
          parents.push({
            first_name: student.fatherFirstName.trim(),
            last_name: student.fatherLastName.trim() || '',
            phone: student.fatherPhone.trim() || undefined,
            gender: student.fatherGender ? student.fatherGender.toUpperCase() : undefined,
            occupation: student.fatherOccupation.trim() || undefined,
            residence: student.fatherResidenceFullAddress && student.fatherResidenceFullAddress.trim() ? {
              full_address: student.fatherResidenceFullAddress.trim()
            } : undefined,
            relationship: 'FATHER'
          });
        }

        // Add mother if mother info is provided
        if (student.motherFirstName && student.motherFirstName.trim()) {
          parents.push({
            first_name: student.motherFirstName.trim(),
            last_name: student.motherLastName.trim() || '',
            phone: student.motherPhone.trim() || undefined,
            gender: student.motherGender ? student.motherGender.toUpperCase() : undefined,
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

      // Initialize results array with all students
      const initialResults = validStudents.map((student) => ({
        studentName: `${student.firstName} ${student.lastName}`,
        username: student.username,
        processing: false,
        success: false,
        error: null
      }));
      setImportResults(initialResults);

      // Use the new bulk register API
      const response = await studentService.bulkRegister(transformedData);

      // Handle the new response format
      const { success_count, failed_count, successful_students, errors } = response.data || response;

      // Update results based on API response
      const updatedResults = initialResults.map((result, index) => {
        const studentData = transformedData[index];
        const hasError = errors && errors.find(e =>
          e.username === studentData.username
        );

        return {
          ...result,
          processing: false,
          success: !hasError,
          error: hasError ? (hasError.message || hasError.error || 'Unknown error') : null
        };
      });

      setImportResults(updatedResults);
      setProcessedCount(transformedData.length);
      setIsImporting(false);

      if (success_count > 0) {
        showSuccess(`🎉 បាននាំចូលសិស្សចំនួន ${success_count} នាក់ដោយជោគជ័យ!`, { duration: 5000 });
      }

      if (failed_count > 0) {
        showError(`⚠️ មានកំហុស ${failed_count} នាក់ក្នុងការនាំចូល។ សូមពិនិត្យទិន្នន័យឡើងវិញ`, { duration: 7000 });
        // Log errors for debugging
        console.error('Bulk import errors:', errors);
      }

      // Reset form on complete success
      if (failed_count === 0) {
        setStudents([{
          // Student basic info
          lastName: '',
          firstName: '',
          username: '',
          password: '',
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
          fatherGender: '',
          fatherOccupation: '',
          fatherResidenceFullAddress: '',

          motherFirstName: '',
          motherLastName: '',
          motherPhone: '',
          motherDateOfBirth: '',
          motherGender: '',
          motherOccupation: '',
          motherResidenceFullAddress: '',

          // Additional fields
          ethnicGroup: '',
          accessibility: []
        }]);
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
          />
        </FadeInSection>

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