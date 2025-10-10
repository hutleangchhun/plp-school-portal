import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, Trash2, Upload, Download, Save, X, Copy, Scissors, Clipboard, FileSpreadsheet, Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import { Button } from '../../components/ui/Button';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Badge } from '../../components/ui/Badge';
import { studentService } from '../../utils/api/services/studentService';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import { DatePicker } from '../../components/ui/date-picker';
import * as XLSX from 'xlsx';
import * as XLSXStyle from 'xlsx-js-style';

// CustomDateInput Component - Simple HTML5 date input that works well in tables
const CustomDateInput = ({ value, onChange, className = "" }) => {
  // Convert various date formats to yyyy-mm-dd for HTML5 date input
  const inputValue = useMemo(() => {
    if (!value) return '';

    // If already in yyyy-mm-dd format
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    // If in dd/mm/yy format, convert to yyyy-mm-dd
    if (typeof value === 'string' && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)) {
      const [day, month, year] = value.split('/');
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // If it's a Date object
    if (value instanceof Date && !isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Try to parse and format
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    return '';
  }, [value]);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    if (newValue) {
      // Convert yyyy-mm-dd back to dd/mm/yy format
      const [year, month, day] = newValue.split('-');
      onChange(`${day}/${month}/${year.slice(-2)}`);
    } else {
      onChange('');
    }
  }, [onChange]);

  return (
    <div className="relative">
      <input
        type="date"
        value={inputValue}
        onChange={handleChange}
        className={`w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${className}`}
        style={{
          minHeight: '32px',
          position: 'relative',
          zIndex: 5
        }}
        min="1960-01-01"
        max={new Date().toISOString().split('T')[0]}
      />
    </div>
  );
};

// MultiSelectDropdown Component
const MultiSelectDropdown = ({ options, value = [], onChange, placeholder = "Select...", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const selectedLabels = options
    .filter(option => value.includes(option.value))
    .map(option => option.label);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-xs border-0 bg-white focus:border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-left flex items-center justify-between"
      >
        <span className="truncate">
          {selectedLabels.length > 0
            ? selectedLabels.join(', ')
            : <span className="text-gray-500">{placeholder}</span>
          }
        </span>
        <svg className={`w-4 h-4 text-gray-400 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer text-xs"
            >
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => handleToggle(option.value)}
                className="mr-2 w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default function BulkStudentImport() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { error, handleError, clearError } = useErrorHandler();
  const { startLoading, stopLoading } = useLoading();

  const [students, setStudents] = useState([
    {
      // Student basic info
      id: '',
      lastName: '',
      firstName: '',
      email: '',
      username: '',
      password: '',
      dateOfBirth: '',
      gender: '',
      phone: '',
      nationality: '',
      studentNumber: '',
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

  // Excel-like functionality
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [selectedRange, setSelectedRange] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startSelection, setStartSelection] = useState(null);
  const tableRef = useRef(null);
  const fileInputRef = useRef(null);

  const genderOptions = [
    { value: 'MALE', label: 'ប្រុស' },
    { value: 'FEMALE', label: 'ស្រី' }
  ];

  const nationalityOptions = [
    { value: 'ខ្មែរ', label: 'ខ្មែរ' }
  ];

  const ethnicGroupOptions = [
    { value: '', label: 'ជ្រើសរើសជនជាតិភាគតិច' },
    { value: 'ជនជាតិភ្នង', label: 'ជនជាតិភ្នង' },
    { value: 'ជនជាតិរអួង', label: 'ជនជាតិរអួង' },
    { value: 'ជនជាតិគួយ', label: 'ជនជាតិគួយ' },
    { value: 'ជនជាតិគ្រឹង', label: 'ជនជាតិគ្រឹង' },
    { value: 'ជនជាតិរដែរ', label: 'ជនជាតិរដែរ' },
    { value: 'ជនជាតិស្ទៀង', label: 'ជនជាតិស្ទៀង' },
    { value: 'ជនជាតិទំពួន', label: 'ជនជាតិទំពួន' },
    { value: 'ជនជាតិអានោង', label: 'ជនជាតិអានោង' },
    { value: 'ជនជាតិថ្មូន', label: 'ជនជាតិថ្មូន' },
    { value: 'ជនជាតិខា', label: 'ជនជាតិខា' },
    { value: 'ជនជាតិក្រោល', label: 'ជនជាតិក្រោល' },
    { value: 'ជនជាតិស្មិល', label: 'ជនជាតិស្មិល' },
    { value: 'ជនជាតិចារាយ', label: 'ជនជាតិចារាយ' },
    { value: 'ជនជាតិប្រ៊ូវ', label: 'ជនជាតិប្រ៊ូវ' },
    { value: 'ជនជាតិសួយ', label: 'ជនជាតិសួយ' }
  ];

  const accessibilityOptions = [
    { value: 'MOBILITY_DIFFICULTY', label: 'ពិបាកក្នុងការធ្វើចលនា' },
    { value: 'HEARING_DIFFICULTY', label: 'ពិបាកក្នុងការស្ដាប់' },
    { value: 'SPEECH_DIFFICULTY', label: 'ពិបាកក្នុងការនីយាយ' },
    { value: 'VISION_DIFFICULTY', label: 'ពិបាកក្នុងការមើល' },
    { value: 'INTERNAL_DISABILITY', label: 'ពិការសរីរាង្គខាងក្នុង' },
    { value: 'INTELLECTUAL_DISABILITY', label: 'ពិការសតិបញ្ញា' },
    { value: 'MENTAL_DISABILITY', label: 'ពិការផ្លូវចិត្ត' },
    { value: 'OTHER_DISABILITIES', label: 'ពិការផ្សេងៗ' }
  ];

  const columns = [
    // Student Basic Info
    { key: 'id', header: 'អត្តលេខ', width: 'min-w-[150px]' },
    { key: 'lastName', header: 'គោត្តនាម', width: 'min-w-[100px]' },
    { key: 'firstName', header: 'នាម', width: 'min-w-[200px]' },
    { key: 'email', header: 'អ៊ីមែល', width: 'min-w-[280px]' },
    { key: 'username', header: 'ឈ្មោះអ្នកប្រើ', width: 'min-w-[150px]' },
    { key: 'password', header: 'ពាក្យសម្ងាត់', width: 'min-w-[150px]' },
    { key: 'dateOfBirth', header: 'ថ្ងៃខែឆ្នាំកំណើត', width: 'min-w-[280px]', type: 'custom-date' },
    { key: 'gender', header: 'ភេទ', width: 'min-w-[80px]', type: 'select', options: genderOptions },
    { key: 'phone', header: 'លេខទូរស័ព្ទ', width: 'min-w-[150px]' },
    { key: 'nationality', header: 'សញ្ជាតិ', width: 'min-w-[80px]', type: 'select', options: nationalityOptions },
    { key: 'studentNumber', header: 'លេខសិស្ស', width: 'min-w-[200px]' },
    { key: 'schoolId', header: 'លេខសាលា', width: 'min-w-[200px]' },
    { key: 'academicYear', header: 'ឆ្នាំសិក្សា', width: 'min-w-[150px]' },
    { key: 'gradeLevel', header: 'កម្រិតថ្នាក់', width: 'min-w-[80px]' },

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

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];

    if (!allowedTypes.includes(file.type)) {
      showError('សូមជ្រើសរើសឯកសារ Excel (.xlsx ឬ .xls) តែប៉ុណ្ណោះ');
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true, cellNF: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        showError('ឯកសារ Excel ត្រូវការយ៉ាងហោចណាស់ 2 ជួរ (ក្បាលនិងទិន្នន័យ)');
        return;
      }

      // Check if we have hierarchical headers (main headers in row 0, sub headers in row 1)
      const mainHeaderRow = jsonData[0];
      const subHeaderRow = jsonData[1];

      // Check if main header row contains our main section headers
      const mainHeaders = ['ព័ត៌មានសិស្ស', 'អាសយដ្ឋានស្នាក់នៅ', 'ទីកន្លែងកំណើត', 'ព័ត៌មានឪពុក', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានបន្ថែម'];
      const hasHierarchicalHeaders = mainHeaderRow && mainHeaders.some(header =>
        mainHeaderRow.some(cell => String(cell || '').includes(header))
      );

      // Determine data start index (skip header rows)
      const dataStartIndex = hasHierarchicalHeaders ? 2 : (subHeaderRow && subHeaderRow.length >= 10 ? 1 : 0);

      // Define hasHeaders and firstRow for backward compatibility
      const hasHeaders = hasHierarchicalHeaders || (subHeaderRow && subHeaderRow.length >= 10);
      const firstRow = hasHierarchicalHeaders ? subHeaderRow : (hasHeaders ? subHeaderRow : null);

      // Define expected headers for filtering
      const expectedHeaders = [
        'ព័ត៌មានសិស្ស', 'អាសយដ្ឋានស្នាក់នៅ', 'ទីកន្លែងកំណើត', 'ព័ត៌មានឪពុក', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានបន្ថែម',
        'អត្តលេខ', 'គោត្តនាម', 'នាម', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត', 'ទីកន្លែងកំណើត',
        'ឈ្មោះឪពុក', 'មុខរបរ', 'ឈ្មោះម្តាយ', 'អាសយដ្ឋានសព្វថ្ងៃ', 'ជនជាតិភាគតិច', 'លក្ខណៈពិសេស'
      ];

      // Filter out empty rows and header-like rows from data
      const dataRows = jsonData.slice(dataStartIndex).filter(row => {
        if (!row || !row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')) {
          return false; // Skip empty rows
        }

        const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');

        // Skip rows that look like headers (contain expected header text)
        const isHeaderRow = expectedHeaders.some(header =>
          rowText.includes(header.toLowerCase())
        );

        // Skip administrative/school header rows - use more specific keywords
        // Avoid overly broad words that might appear in student data
        const adminKeywords = [
          'ព្រះរាជាណាចក្រកម្ពុជា', 'kingdom of cambodia', 'ជាតិសាសនា', 'ព្រះមហាក្សត្រ',
          'king', 'nation religion', 'កម្រងហស', 'សាលា', 'school', 'បញ្ជីរាយនាម',
          'student list', 'ថ្នាក់ទី', 'class', 'ឆ្នាំសិក្សា', 'academic year',
          'ខេត្ត', 'province', 'ស្រុក', 'district', 'ឃុំ', 'commune', 'ភូមិ', 'village',
          'លេខទូរស័ព្ទ', 'phone', 'អាសយដ្ឋាន', 'address', 'គ្រូ', 'teacher',
          'បញ្ឈប៉បញ្ជី', 'នាក់', 'រោងឆស័ក', 'ព.ស២៥៦៨',
          'ធ្វើនៅថ្ងៃទី', 'ខែ', 'ឆ្នាំ', 'បានឃើញនិងឯកភាព', 'គ្រូប្រចាំថ្នាក់',
          'នាយកសាលា', 'principal', 'director', 'signature', 'approved', 'certified',
          'ត្រឹមលេខរៀង', 'total', 'summary', 'statistics', 'ចំនួន', 'count',
          'សរុប', 'grand total', 'ចុះហត្ថលេខា', 'signed', 'អនុម័ត', 'approved by'
        ];

        const isAdminRow = adminKeywords.some(keyword =>
          rowText.includes(keyword)
        );

        // Additional check: skip rows that have very few filled cells (likely headers/titles)
        const filledCells = row.filter(cell =>
          cell !== null && cell !== undefined && String(cell).trim() !== ''
        ).length;

        // Skip if it's a header row or admin row
        // Don't filter based on filled cells count alone - that might remove valid student data
        const shouldSkip = isHeaderRow || isAdminRow;

        return !shouldSkip; // Include only actual student data rows
      });

      if (dataRows.length === 0) {
        showError('គ្មានទិន្នន័យសិស្សនៅក្នុងឯកសារ');
        return;
      }

      // Map Excel columns to student fields
      // Handle dynamic column detection since Excel files may have different structures
      const mappedStudents = dataRows.map((row, index) => {
        // Helper function to get value safely
        const getValue = (index) => {
          const val = row[index];
          return val !== null && val !== undefined ? String(val).trim() : '';
        };

        // Find column indices by looking for specific headers or patterns
        let idIndex = -1;
        let lastNameIndex = -1;
        let firstNameIndex = -1;
        let emailIndex = -1;
        let usernameIndex = -1;
        let passwordIndex = -1;
        let dobIndex = -1;
        let genderIndex = -1;
        let phoneIndex = -1;
        let nationalityIndex = -1;
        let studentNumberIndex = -1;
        let schoolIdIndex = -1;
        let academicYearIndex = -1;
        let gradeLevelIndex = -1;
        let residenceFullAddressIndex = -1;
        let fatherFirstNameIndex = -1;
        let fatherLastNameIndex = -1;
        let fatherPhoneIndex = -1;
        let fatherGenderIndex = -1;
        let fatherOccupationIndex = -1;
        let fatherResidenceFullAddressIndex = -1;
        let motherFirstNameIndex = -1;
        let motherLastNameIndex = -1;
        let motherPhoneIndex = -1;
        let motherGenderIndex = -1;
        let motherOccupationIndex = -1;
        let motherResidenceFullAddressIndex = -1;
        let ethnicIndex = -1;
        let accessIndex = -1;

        // If we detected headers, try to find columns by header names
        if (hasHeaders && firstRow) {
          firstRow.forEach((header, idx) => {
            const headerStr = String(header || '').toLowerCase().trim();

            // Explicitly ignore sequential number columns
            if (headerStr.includes('ល.រ') || headerStr.includes('លេខរៀង') || headerStr === 'no.' || headerStr === 'no' || headerStr === 'n°') {
              return; // Skip this column entirely
            }

            if (headerStr.includes('អត្តលេខ') || headerStr.includes('id') || (headerStr.includes('student') && headerStr.includes('id'))) {
              idIndex = idx;
            } else if (headerStr.includes('គោត្តនាម') || (headerStr.includes('last') && headerStr.includes('name'))) {
              lastNameIndex = idx;
            } else if ((headerStr.includes('នាម') && !headerStr.includes('គោត្ត')) || (headerStr.includes('first') && headerStr.includes('name'))) {
              firstNameIndex = idx;
            } else if (headerStr.includes('ភេទ') || headerStr.includes('gender') || headerStr.includes('sex')) {
              genderIndex = idx;
            } else if (headerStr.includes('ថ្ងៃខែឆ្នាំកំណើត') || (headerStr.includes('date') && headerStr.includes('birth'))) {
              dobIndex = idx;
            } else if ((headerStr.includes('ឪពុក') && headerStr.includes('ឈ្មោះ')) || (headerStr.includes('father') && headerStr.includes('name'))) {
              fatherFirstNameIndex = idx;
            } else if ((headerStr.includes('ឪពុក') && headerStr.includes('មុខរបរ')) || (headerStr.includes('father') && headerStr.includes('occupation'))) {
              fatherOccupationIndex = idx;
            } else if ((headerStr.includes('ឪពុក') && headerStr.includes('អាសយដ្ឋាន')) || (headerStr.includes('father') && headerStr.includes('address'))) {
              fatherResidenceFullAddressIndex = idx;
            } else if ((headerStr.includes('ម្តាយ') && headerStr.includes('ឈ្មោះ')) || (headerStr.includes('mother') && headerStr.includes('name'))) {
              motherFirstNameIndex = idx;
            } else if ((headerStr.includes('ម្តាយ') && headerStr.includes('មុខរបរ')) || (headerStr.includes('mother') && headerStr.includes('occupation'))) {
              motherOccupationIndex = idx;
            } else if ((headerStr.includes('ម្តាយ') && headerStr.includes('អាសយដ្ឋាន')) || (headerStr.includes('mother') && headerStr.includes('address'))) {
              motherResidenceFullAddressIndex = idx;
            } else if (headerStr.includes('អាសយដ្ឋាន') || headerStr.includes('address')) {
              residenceFullAddressIndex = idx;
            } else if (headerStr.includes('ជនជាតិ') || headerStr.includes('ethnic')) {
              ethnicIndex = idx;
            } else if (headerStr.includes('តម្រូវការ') || headerStr.includes('accessibility') || headerStr.includes('disability')) {
              accessIndex = idx;
            }
          });
        } else {
          // No headers detected, use positional mapping
          // We'll check for sequential numbers in the mapping loop
          idIndex = 0;
          lastNameIndex = 1;
          firstNameIndex = 2;
          emailIndex = 3;
          usernameIndex = 4;
          passwordIndex = 5;
          dobIndex = 6;
          genderIndex = 7;
          phoneIndex = 8;
          nationalityIndex = 9;
          studentNumberIndex = 10;
          schoolIdIndex = 11;
          academicYearIndex = 12;
          gradeLevelIndex = 13;
          residenceFullAddressIndex = 14;
          fatherFirstNameIndex = 15;
          fatherLastNameIndex = 16;
          fatherPhoneIndex = 17;
          fatherGenderIndex = 18;
          fatherOccupationIndex = 19;
          fatherResidenceFullAddressIndex = 20;
          motherFirstNameIndex = 21;
          motherLastNameIndex = 22;
          motherPhoneIndex = 23;
          motherGenderIndex = 24;
          motherOccupationIndex = 25;
          motherResidenceFullAddressIndex = 26;
          ethnicIndex = 27;
          accessIndex = 28;
        }

        // Map gender values
        const mapGender = (gender) => {
          if (!gender) return '';
          const g = gender.toLowerCase();
          if (g === 'ប្រុស' || g === 'male' || g === 'm' || g === 'ប') return 'MALE';
          if (g === 'ស្រី' || g === 'female' || g === 'f' || g === 'ស') return 'FEMALE';
          return '';
        };

        // Map ethnic group
        const mapEthnicGroup = (ethnic) => {
          if (!ethnic) return '';
          const found = ethnicGroupOptions.find(opt =>
            opt.label.toLowerCase() === ethnic.toLowerCase() ||
            opt.value === ethnic
          );
          return found ? found.value : '';
        };

        // Map accessibility (comma-separated)
        const mapAccessibility = (access) => {
          if (!access) return [];
          return access.split(',').map(item => item.trim()).filter(item => {
            if (!item) return false;
            const found = accessibilityOptions.find(opt =>
              opt.label.toLowerCase().includes(item.toLowerCase()) ||
              opt.value === item
            );
            return found ? found.value : false;
          });
        };

        // Handle dynamic column detection for files without headers
        let actualIdIndex = idIndex;
        let actualLastNameIndex = lastNameIndex;
        let actualFirstNameIndex = firstNameIndex;
        let actualEmailIndex = emailIndex;
        let actualUsernameIndex = usernameIndex;
        let actualPasswordIndex = passwordIndex;
        let actualDobIndex = dobIndex;
        let actualGenderIndex = genderIndex;
        let actualPhoneIndex = phoneIndex;
        let actualNationalityIndex = nationalityIndex;
        let actualStudentNumberIndex = studentNumberIndex;
        let actualSchoolIdIndex = schoolIdIndex;
        let actualAcademicYearIndex = academicYearIndex;
        let actualGradeLevelIndex = gradeLevelIndex;
        let actualResidenceFullAddressIndex = residenceFullAddressIndex;
        let actualFatherFirstNameIndex = fatherFirstNameIndex;
        let actualFatherLastNameIndex = fatherLastNameIndex;
        let actualFatherPhoneIndex = fatherPhoneIndex;
        let actualFatherGenderIndex = fatherGenderIndex;
        let actualFatherOccupationIndex = fatherOccupationIndex;
        let actualFatherResidenceFullAddressIndex = fatherResidenceFullAddressIndex;
        let actualMotherFirstNameIndex = motherFirstNameIndex;
        let actualMotherLastNameIndex = motherLastNameIndex;
        let actualMotherPhoneIndex = motherPhoneIndex;
        let actualMotherGenderIndex = motherGenderIndex;
        let actualMotherOccupationIndex = motherOccupationIndex;
        let actualMotherResidenceFullAddressIndex = motherResidenceFullAddressIndex;
        let actualEthnicIndex = ethnicIndex;
        let actualAccessIndex = accessIndex;

        // If no headers were detected, check if first column is sequential numbers
        if (!hasHeaders) {
          const firstCellValue = String(row[0] || '').trim();
          const isSequential = /^\d+$/.test(firstCellValue) ||
                               firstCellValue.toLowerCase().includes('ល.រ') ||
                               firstCellValue.toLowerCase().includes('no');

          if (isSequential) {
            // Shift all indices to skip the sequential number column
            actualIdIndex = 1;
            actualLastNameIndex = 2;
            actualFirstNameIndex = 3;
            actualEmailIndex = 4;
            actualUsernameIndex = 5;
            actualPasswordIndex = 6;
            actualDobIndex = 7;
            actualGenderIndex = 8;
            actualPhoneIndex = 9;
            actualNationalityIndex = 10;
            actualStudentNumberIndex = 11;
            actualSchoolIdIndex = 12;
            actualAcademicYearIndex = 13;
            actualGradeLevelIndex = 14;
            actualResidenceFullAddressIndex = 15;
            actualFatherFirstNameIndex = 16;
            actualFatherLastNameIndex = 17;
            actualFatherPhoneIndex = 18;
            actualFatherGenderIndex = 19;
            actualFatherOccupationIndex = 20;
            actualFatherResidenceFullAddressIndex = 21;
            actualMotherFirstNameIndex = 22;
            actualMotherLastNameIndex = 23;
            actualMotherPhoneIndex = 24;
            actualMotherGenderIndex = 25;
            actualMotherOccupationIndex = 26;
            actualMotherResidenceFullAddressIndex = 27;
            actualEthnicIndex = 28;
            actualAccessIndex = 29;
          }
        }

        // Only include rows that have at least an ID or name (actual student data)
        const studentId = actualIdIndex >= 0 ? getValue(actualIdIndex) : '';
        const firstName = actualFirstNameIndex >= 0 ? getValue(actualFirstNameIndex) : '';
        const lastName = actualLastNameIndex >= 0 ? getValue(actualLastNameIndex) : '';

        // Skip rows that don't have meaningful student data
        // Require at least one of: ID, firstName, or lastName
        if (!studentId.trim() && !firstName.trim() && !lastName.trim()) {
          return null; // Will be filtered out
        }

        // Helper function to convert dates to dd/mm/yy format
        const normalizeDateForDisplay = (dateStr) => {
          if (!dateStr) return '';

          // Handle JavaScript Date objects (XLSX returns these for dates)
          if (dateStr instanceof Date) {
            if (!isNaN(dateStr.getTime())) {
              // Format as dd/mm/yy
              const day = dateStr.getDate().toString().padStart(2, '0');
              const month = (dateStr.getMonth() + 1).toString().padStart(2, '0');
              const year = dateStr.getFullYear().toString().slice(-2);
              return `${day}/${month}/${year}`;
            } else {
              return ''; // Invalid date
            }
          }

          // Handle Excel serial numbers (numbers that look like dates)
          const numValue = typeof dateStr === 'number' ? dateStr : parseFloat(dateStr);
          if (!isNaN(numValue) && numValue > 10000 && numValue < 100000) {
            // Excel serial date to JavaScript date
            const excelEpoch = new Date(1900, 0, 1);
            const jsDate = new Date(excelEpoch.getTime() + (numValue - 2) * 24 * 60 * 60 * 1000);
            if (!isNaN(jsDate.getTime())) {
              const day = jsDate.getDate().toString().padStart(2, '0');
              const month = (jsDate.getMonth() + 1).toString().padStart(2, '0');
              const year = jsDate.getFullYear().toString().slice(-2);
              return `${day}/${month}/${year}`;
            }
          }

          // Check if it's already a date string in various formats
          const dateString = String(dateStr).trim();

          // If it's already in dd/mm/yy or dd.mm.yy format, return as is
          if (dateString.match(/^\d{1,2}[/.]\d{1,2}[/.]\d{2,4}$/)) {
            return dateString;
          }

          // If it's in yyyy-mm-dd format, convert to dd/mm/yy
          const yyyymmddMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (yyyymmddMatch) {
            const [, year, month, day] = yyyymmddMatch;
            return `${day}/${month}/${year.slice(-2)}`;
          }

          // Try to parse as other date formats
          try {
            const parsedDate = new Date(dateString);
            if (!isNaN(parsedDate.getTime())) {
              const day = parsedDate.getDate().toString().padStart(2, '0');
              const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
              const year = parsedDate.getFullYear().toString().slice(-2);
              return `${day}/${month}/${year}`;
            }
          } catch (e) {
            // Ignore parsing errors
          }

          // For everything else, return as string
          return dateString;
        };

        return {
          // Student basic info
          id: studentId,
          lastName: lastName,
          firstName: firstName,
          email: actualEmailIndex >= 0 ? getValue(actualEmailIndex) : '',
          username: actualUsernameIndex >= 0 ? getValue(actualUsernameIndex) : '',
          password: actualPasswordIndex >= 0 ? getValue(actualPasswordIndex) : '',
          dateOfBirth: actualDobIndex >= 0 ? normalizeDateForDisplay(getValue(actualDobIndex)) : '',
          gender: actualGenderIndex >= 0 ? mapGender(getValue(actualGenderIndex)) : '',
          phone: actualPhoneIndex >= 0 ? getValue(actualPhoneIndex) : '',
          nationality: actualNationalityIndex >= 0 ? getValue(actualNationalityIndex) : '',
          studentNumber: actualStudentNumberIndex >= 0 ? getValue(actualStudentNumberIndex) : studentId,
          schoolId: actualSchoolIdIndex >= 0 ? getValue(actualSchoolIdIndex) : '',
          academicYear: actualAcademicYearIndex >= 0 ? getValue(actualAcademicYearIndex) : '',
          gradeLevel: actualGradeLevelIndex >= 0 ? getValue(actualGradeLevelIndex) : '',

          // Location info
          residenceFullAddress: actualResidenceFullAddressIndex >= 0 ? getValue(actualResidenceFullAddressIndex) : '',

          // Parent info
          fatherFirstName: actualFatherFirstNameIndex >= 0 ? getValue(actualFatherFirstNameIndex) : '',
          fatherLastName: actualFatherLastNameIndex >= 0 ? getValue(actualFatherLastNameIndex) : '',
          fatherPhone: actualFatherPhoneIndex >= 0 ? getValue(actualFatherPhoneIndex) : '',
          fatherGender: actualFatherGenderIndex >= 0 ? mapGender(getValue(actualFatherGenderIndex)) : '',
          fatherOccupation: actualFatherOccupationIndex >= 0 ? getValue(actualFatherOccupationIndex) : '',
          fatherResidenceFullAddress: actualFatherResidenceFullAddressIndex >= 0 ? getValue(actualFatherResidenceFullAddressIndex) : '',

          motherFirstName: actualMotherFirstNameIndex >= 0 ? getValue(actualMotherFirstNameIndex) : '',
          motherLastName: actualMotherLastNameIndex >= 0 ? getValue(actualMotherLastNameIndex) : '',
          motherPhone: actualMotherPhoneIndex >= 0 ? getValue(actualMotherPhoneIndex) : '',
          motherGender: actualMotherGenderIndex >= 0 ? mapGender(getValue(actualMotherGenderIndex)) : '',
          motherOccupation: actualMotherOccupationIndex >= 0 ? getValue(actualMotherOccupationIndex) : '',
          motherResidenceFullAddress: actualMotherResidenceFullAddressIndex >= 0 ? getValue(actualMotherResidenceFullAddressIndex) : '',

          // Additional fields
          ethnicGroup: actualEthnicIndex >= 0 ? mapEthnicGroup(getValue(actualEthnicIndex)) : '',
          accessibility: actualAccessIndex >= 0 ? mapAccessibility(getValue(actualAccessIndex)) : []
        };
      }).filter(student => student !== null); // Remove null entries (rows without student data)

      setStudents(mappedStudents);
      const headerInfo = hasHeaders ? 'រួមបញ្ចូលក្បាល' : 'គ្មានក្បាល';
      showSuccess(`បាននាំចូល ${mappedStudents.length} សិស្សពីឯកសារ Excel (${headerInfo})`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Excel import error:', error);
      showError('មានកំហុសក្នុងការអានឯកសារ Excel: ' + error.message);
    }
  }, [showError, showSuccess]);

  const downloadTemplate = useCallback(() => {
    // Create comprehensive template with Cambodian school headers
    const templateData = [
      // Official Cambodian School Header - Row 1
      [
        'ព្រះរាជាណាចក្រកម្ពុជា',
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      // Nation, Religion, King - Row 2
      [
        'ជាតិ       សាសនា       ព្រះមហាក្សត្រ',
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      // School Administrative Info - Row 3
      [
        'កម្រងហស ព្រែកគយ',
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      // School Name - Row 4
      [
        'សាលាបឋមសិក្សា ហ៊ុន សែន ព្រែកគយ',
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      // Student List Title - Row 5
      [
        'បញ្ជីរាយនាមសិស្ស(គ្រូបន្ទុកថ្នាក់ លាងជី វី ភេទ ប្រុស)',
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      // Class and Academic Year - Row 6
      [
        'ថ្នាក់ទី ៤ ( ខ )ឆ្នាំសិក្សា ២០២៤-២០២៥',
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      // Empty row for spacing - Row 7
      [
        '',
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      // Instructions row (row 8)
      [
        'សូមបញ្ចូលព័ត៌មានសិស្សដូចឧទាហរណ៍ខាងក្រោម។ សូមលុបជួរឧទាហរណ៍និងបញ្ចូលព័ត៌មានសិស្សពិតប្រាកដ។',
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      // Main headers (row 9) - Repeat text for each merged cell to ensure visibility
      [
        '#', // Row number
        'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', // 15 columns for student info
        'ព័ត៌មានឪពុក', 'ព័ត៌មានឪពុក', 'ព័ត៌មានឪពុក', 'ព័ត៌មានឪពុក', 'ព័ត៌មានឪពុក', 'ព័ត៌មានឪពុក', // 6 columns for father
        'ព័ត៌មានម្តាយ', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានម្តាយ', // 6 columns for mother
        'ព័ត៌មានបន្ថែម', 'ព័ត៌មានបន្ថែម' // 2 columns for additional info
      ],
      // Sub headers (row 10)
      [
        '#',
        'អត្តលេខ', 'គោត្តនាម', 'នាម', 'អ៊ីមែល', 'ឈ្មោះអ្នកប្រើ', 'ពាក្យសម្ងាត់',
        'ថ្ងៃខែឆ្នាំកំណើត', 'ភេទ', 'លេខទូរស័ព្ទ', 'សញ្ជាតិ', 'លេខសិស្ស', 'លេខសាលា', 'ឆ្នាំសិក្សា', 'កម្រិតថ្នាក់',
        'អាសយដ្ឋានពេញ',
        'នាម', 'គោត្តនាម', 'ទូរស័ព្ទ', 'ភេទ', 'មុខរបរ', 'អាសយដ្ឋានពេញឪពុក',
        'នាម', 'គោត្តនាម', 'ទូរស័ព្ទ', 'ភេទ', 'មុខរបរ', 'អាសយដ្ឋានពេញម្តាយ',
        'ជនជាតិភាគតិច', 'លក្ខណៈពិសេស'
      ],
      // Example row with sample data (row 11)
      [
        '1',
        'STD001', // អត្តលេខ
        'សុខ', // គោត្តនាម
        'ចន្ថា', // នាម
        'chantha.sok@example.com', // អ៊ីមែល
        'chantha.sok', // ឈ្មោះអ្នកប្រើ
        'Student@123', // ពាក្យសម្ងាត់
        '15/05/15', // ថ្ងៃខែឆ្នាំកំណើត (dd/mm/yy)
        'ស្រី', // ភេទ (ប្រុស ឬ ស្រី)
        '012345678', // លេខទូរស័ព្ទ
        'ខ្មែរ', // សញ្ជាតិ
        'STD001', // លេខសិស្ស
        '123', // លេខសាលា
        '2024-2025', // ឆ្នាំសិក្សា
        '4', // កម្រិតថ្នាក់
        'ភូមិក្រាំងជ័យ ឃុំព្រែកគយ ស្រុកបាទី ខេត្តតាកែវ', // អាសយដ្ឋានពេញ
        'វណ្ណៈ', // នាមឪពុក
        'សុខ', // គោត្តនាមឪពុក
        '011222333', // ទូរស័ព្ទឪពុក
        'ប្រុស', // ភេទឪពុក
        'កសិករ', // មុខរបរឪពុក
        'ភូមិក្រាំងជ័យ ឃុំព្រែកគយ ស្រុកបាទី ខេត្តតាកែវ', // អាសយដ្ឋានពេញឪពុក
        'សុភា', // នាមម្តាយ
        'ចាន់', // គោត្តនាមម្តាយ
        '012333444', // ទូរស័ព្ទម្តាយ
        'ស្រី', // ភេទម្តាយ
        'លក់ទំនិញ', // មុខរបរម្តាយ
        'ភូមិក្រាំងជ័យ ឃុំព្រែកគយ ស្រុកបាទី ខេត្តតាកែវ', // អាសយដ្ឋានពេញម្តាយ
        '', // ជនជាតិភាគតិច
        '' // លក្ខណៈពិសេស
      ],
      // Empty rows for user input (rows 12-20)
      [
        '2', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      [
        '3', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      [
        '4', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      [
        '5', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      [
        '6', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      [
        '7', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      [
        '8', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      [
        '9', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ],
      [
        '10', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        '',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '', ''
      ]
    ];

    const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

    // Set column widths for better readability
    const colWidths = [
      { wch: 5 }, // #
      { wch: 12 }, // ID
      { wch: 15 }, // Last Name
      { wch: 15 }, // First Name
      { wch: 35 }, // Email
      { wch: 20 }, // Username
      { wch: 15 }, // Password
      { wch: 18 }, // Date of Birth
      { wch: 8 }, // Gender
      { wch: 18 }, // Phone
      { wch: 12 }, // Nationality
      { wch: 15 }, // Student Number
      { wch: 12 }, // School ID
      { wch: 12 }, // Academic Year
      { wch: 12 }, // Grade Level
      { wch: 40 }, // Address
      { wch: 15 }, // Father First Name
      { wch: 15 }, // Father Last Name
      { wch: 18 }, // Father Phone
      { wch: 12 }, // Father Gender
      { wch: 20 }, // Father Occupation
      { wch: 40 }, // Father Address
      { wch: 15 }, // Mother First Name
      { wch: 15 }, // Mother Last Name
      { wch: 18 }, // Mother Phone
      { wch: 12 }, // Mother Gender
      { wch: 20 }, // Mother Occupation
      { wch: 40 }, // Mother Address
      { wch: 25 }, // Ethnic Group
      { wch: 30 }  // Accessibility
    ];
    ws['!cols'] = colWidths;

    // Add merges for better visual organization
    if (!ws['!merges']) ws['!merges'] = [];

    // Merge cells for headers (row 1-6 are headers)
    // Row 1: Kingdom header spans all columns
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 29 } });

    // Row 2: Nation/Religion/King spans all columns
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 29 } });

    // Row 3: Administrative district spans all columns
    ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 29 } });

    // Row 4: School name spans all columns
    ws['!merges'].push({ s: { r: 3, c: 0 }, e: { r: 3, c: 29 } });

    // Row 5: Student list title spans all columns
    ws['!merges'].push({ s: { r: 4, c: 0 }, e: { r: 4, c: 29 } });

    // Row 6: Class and academic year spans all columns
    ws['!merges'].push({ s: { r: 5, c: 0 }, e: { r: 5, c: 29 } });

    // Row 8: Instructions spans all columns
    ws['!merges'].push({ s: { r: 7, c: 0 }, e: { r: 7, c: 29 } });

    // Row 9: Main headers - merge student info columns
    ws['!merges'].push({ s: { r: 8, c: 1 }, e: { r: 8, c: 15 } }); // Student info
    ws['!merges'].push({ s: { r: 8, c: 16 }, e: { r: 8, c: 21 } }); // Father info
    ws['!merges'].push({ s: { r: 8, c: 22 }, e: { r: 8, c: 27 } }); // Mother info
    ws['!merges'].push({ s: { r: 8, c: 28 }, e: { r: 8, c: 29 } }); // Additional info

    // Set row heights for better readability
    ws['!rows'] = [];
    for (let i = 0; i < templateData.length; i++) {
      if (i >= 8 && i <= 9) { // Header rows
        ws['!rows'][i] = { hpt: 35 }; // Taller for headers
      } else if (i >= 10) { // Data rows
        ws['!rows'][i] = { hpt: 25 }; // Standard height for data
      } else if (i === 7) { // Instructions row
        ws['!rows'][i] = { hpt: 30 }; // Taller for instructions
      } else {
        ws['!rows'][i] = { hpt: 20 }; // Standard height for other rows
      }
    }

    // Apply cell styles (borders only, no background colors)
    const range = XLSX.utils.decode_range(ws['!ref']);

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;

        const cell = ws[cellAddress];

        // Initialize cell style with borders
        cell.s = {
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };

        // Header styles (rows 1-6)
        if (R >= 0 && R <= 5) {
          cell.s.font = { bold: true, sz: 14 };
          cell.s.alignment = { vertical: 'center', horizontal: 'center', wrapText: true };
        }

        // Instructions row (row 8)
        else if (R === 7) {
          cell.s.font = { bold: true, sz: 11 };
          cell.s.alignment = { vertical: 'center', horizontal: 'left', wrapText: true };
        }

        // Main category headers (row 9)
        else if (R === 8) {
          cell.s.font = { bold: true, sz: 12 };
          cell.s.alignment = { vertical: 'center', horizontal: 'center', wrapText: true };
        }

        // Sub headers (row 10)
        else if (R === 9) {
          cell.s.font = { bold: true, sz: 10 };
          cell.s.alignment = { vertical: 'center', horizontal: 'center', wrapText: true };
        }

        // Example row (row 11)
        else if (R === 10) {
          cell.s.font = { italic: true, sz: 10 };
          cell.s.alignment = { vertical: 'center', horizontal: C === 0 ? 'center' : 'left', wrapText: true };
        }

        // Empty data rows (rows 12+)
        else if (R >= 11) {
          if (C === 0) {
            cell.s.alignment = { vertical: 'center', horizontal: 'center' };
          } else {
            cell.s.alignment = { vertical: 'center', horizontal: 'left', wrapText: true };
          }
          cell.s.font = { sz: 10 };
        }
      }
    }

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'បញ្ជីសិស្ស');

    // Note: xlsx-js-style has limited data validation support
    // Add a second sheet with dropdown options as a reference guide
    const validationGuideData = [
      ['របៀបបំពេញ / How to Fill'],
      [''],
      ['ទម្រង់ទិន្នន័យ / Data Formats:'],
      [''],
      ['1. ភេទ (Gender):', 'ប្រុស', 'ស្រី'],
      ['', 'MALE', 'FEMALE'],
      [''],
      ['2. សញ្ជាតិ (Nationality):', 'ខ្មែរ'],
      [''],
      ['3. ថ្ងៃខែឆ្នាំកំណើត (Date of Birth):', 'dd/mm/yy', 'ឧទាហរណ៍: 15/05/15'],
      [''],
      ['4. ជនជាតិភាគតិច (Ethnic Groups):'],
      ['', 'ជនជាតិភ្នង', 'ជនជាតិរអួង', 'ជនជាតិគួយ'],
      ['', 'ជនជាតិគ្រឹង', 'ជនជាតិរដែរ', 'ជនជាតិស្ទៀង'],
      ['', 'ជនជាតិទំពួន', 'ជនជាតិអានោង', 'ជនជាតិថ្មូន'],
      ['', 'ជនជាតិខា', 'ជនជាតិក្រោល', 'ជនជាតិស្មិល'],
      ['', 'ជនជាតិចារាយ', 'ជនជាតិប្រ៊ូវ', 'ជនជាតិសួយ'],
      [''],
      ['5. លក្ខណៈពិសេស (Accessibility):'],
      ['', 'ពិបាកក្នុងការធ្វើចលនា - Mobility difficulty'],
      ['', 'ពិបាកក្នុងការស្ដាប់ - Hearing difficulty'],
      ['', 'ពិបាកក្នុងការនីយាយ - Speech difficulty'],
      ['', 'ពិបាកក្នុងការមើល - Vision difficulty'],
      ['', 'ពិការសរីរាង្គខាងក្នុង - Internal disability'],
      ['', 'ពិការសតិបញ្ញា - Intellectual disability'],
      ['', 'ពិការផ្លូវចិត្ត - Mental disability'],
      ['', 'ពិការផ្សេងៗ - Other disabilities'],
      [''],
      ['កំណត់សម្គាល់ / Notes:'],
      ['- សូមលុបជួរឧទាហរណ៍ពណ៌បៃតងមុនពេលបញ្ចូលទិន្នន័យ'],
      ['- Please delete the green example row before entering data'],
      ['- សូមចម្លងនិងបិទភ្ជាប់តម្លៃពីតារាងនេះ'],
      ['- Please copy and paste values from this reference sheet']
    ];

    const wsGuide = XLSXStyle.utils.aoa_to_sheet(validationGuideData);

    // Style the guide sheet
    const guideRange = XLSXStyle.utils.decode_range(wsGuide['!ref']);
    for (let R = guideRange.s.r; R <= guideRange.e.r; ++R) {
      for (let C = guideRange.s.c; C <= guideRange.e.c; ++C) {
        const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });
        if (!wsGuide[cellAddress]) continue;

        const cell = wsGuide[cellAddress];
        cell.s = {
          alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };

        // Header rows
        if (R === 0 || R === 2) {
          cell.s.font = { bold: true, sz: 12 };
        }
      }
    }

    // Set column widths for guide sheet
    wsGuide['!cols'] = [
      { wch: 35 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 }
    ];

    XLSXStyle.utils.book_append_sheet(wb, wsGuide, 'របៀបបំពេញ');

    XLSXStyle.writeFile(wb, 'គំរូនាំចូលសិស្ស.xlsx');
  }, []);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const addRow = () => {
    setStudents(prev => [...prev, {
      // Student basic info
      id: '',
      lastName: '',
      firstName: '',
      email: '',
      username: '',
      password: '',
      dateOfBirth: '',
      gender: '',
      phone: '',
      nationality: '',
      studentNumber: '',
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
      motherGender: '',
      motherOccupation: '',
      motherResidenceFullAddress: '',

      // Additional fields
      ethnicGroup: '',
      accessibility: []
    }]);
  };

  const removeRow = (index) => {
    if (students.length > 1) {
      setStudents(prev => prev.filter((_, i) => i !== index));
    }
  };


  const handleSubmit = async () => {
    try {
      setLoading(true);
      const loadingKey = 'bulkImport';
      startLoading(loadingKey, 'កំពុងនាំចូលសិស្ស...');

      // Validate data
      const validStudents = students.filter(student =>
        student.firstName.trim() &&
        student.lastName.trim() &&
        (student.studentNumber.trim() || student.id.trim())
      );

      if (validStudents.length === 0) {
        showError('សូមបញ្ចូលព័ត៌មានសិស្សយ៉ាងហោចណាស់ម្នាក់ (ត្រូវការនាម គោត្តនាម និងលេខសិស្ស)');
        return;
      }

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

      // Transform data for API - match the expected format with multiple parents
      const transformedData = validStudents.map(student => ({
        first_name: student.firstName.trim(),
        last_name: student.lastName.trim(),
        email: student.email.trim() || undefined,
        username: student.username.trim() || undefined,
        password: student.password.trim() || 'Student@123', // Default password
        date_of_birth: convertDateFormat(student.dateOfBirth),
        gender: student.gender || undefined,
        phone: student.phone.trim() || undefined,
        nationality: student.nationality.trim() || 'Cambodian',
        student_number: student.studentNumber.trim() || student.id.trim(),
        school_id: student.schoolId ? parseInt(student.schoolId) : undefined,
        academic_year: student.academicYear.trim() || '2025-2026',
        grade_level: student.gradeLevel.trim() || '1',
        residence: student.residenceFullAddress ? {
          fullAddress: student.residenceFullAddress.trim()
        } : undefined,
        parents: [
          // Father
          ...(student.fatherFirstName.trim() ? [{
            first_name: student.fatherFirstName.trim(),
            last_name: student.fatherLastName.trim() || '',
            email: student.fatherEmail.trim() || undefined,
            phone: student.fatherPhone.trim() || undefined,
            date_of_birth: convertDateFormat(student.fatherDateOfBirth),
            gender: student.fatherGender || 'MALE',
            occupation: student.fatherOccupation.trim() || undefined,
            relationship: 'FATHER',
            is_primary_contact: true,
            residence: student.fatherResidenceFullAddress ? {
              fullAddress: student.fatherResidenceFullAddress.trim()
            } : undefined
          }] : []),
          // Mother
          ...(student.motherFirstName.trim() ? [{
            first_name: student.motherFirstName.trim(),
            last_name: student.motherLastName.trim() || '',
            email: student.motherEmail.trim() || undefined,
            phone: student.motherPhone.trim() || undefined,
            date_of_birth: convertDateFormat(student.motherDateOfBirth),
            gender: student.motherGender || 'FEMALE',
            occupation: student.motherOccupation.trim() || undefined,
            relationship: 'MOTHER',
            is_primary_contact: false,
            residence: student.motherResidenceFullAddress ? {
              fullAddress: student.motherResidenceFullAddress.trim()
            } : undefined
          }] : [])
        ]
      }));

      // Use the new bulk register API
      const response = await studentService.bulkRegister(transformedData);

      // Handle the new response format
      const { success_count, failed_count, successful_students, errors } = response.data || response;

      if (success_count > 0) {
        showSuccess(`បាននាំចូលសិស្សចំនួន ${success_count} នាក់ដោយជោគជ័យ`);
      }

      if (failed_count > 0) {
        showError(`មានកំហុស ${failed_count} នាក់`);
        // Log errors for debugging
        console.error('Bulk import errors:', errors);
      }

      // Reset form on complete success
      if (failed_count === 0) {
        setStudents([{
          // Student basic info
          id: '',
          lastName: '',
          firstName: '',
          email: '',
          username: '',
          password: '',
          dateOfBirth: '',
          gender: '',
          phone: '',
          nationality: '',
          studentNumber: '',
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
      handleError(err, {
        toastMessage: 'ការនាំចូលបានបរាជ័យ'
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
        <FadeInSection className="mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    នាំចូលសិស្សច្រើននាក់
                  </h1>
                  <p className="text-gray-600 text-sm">
                    បញ្ចូលព័ត៌មានសិស្សជាបណ្តុំដូច Excel
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge color="blue" variant="solid" size="lg">
                  {students.length} {students.length === 1 ? 'សិស្ស' : 'សិស្ស'}
                </Badge>

                {/* Excel Import */}
                <label className="inline-block">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelImport}
                    className="hidden"
                  />
                  <div className="inline-flex items-center px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                    <FileSpreadsheet className="h-5 w-5 mr-2 text-green-600" />
                    នាំចូល Excel
                  </div>
                </label>

                {/* Download Template */}
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  size="default"
                >
                  <Download className="h-5 w-5 mr-2" />
                  ទាញយកគំរូ
                </Button>

                <Button
                  onClick={addRow}
                  variant="outline"
                  size="default"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  បន្ថែមជួរ
                </Button>
                <Button
                  onClick={handleSubmit}
                  variant="primary"
                  size="default"
                  disabled={loading}
                >
                  <Save className="h-5 w-5 mr-2" />
                  {loading ? 'កំពុងនាំចូល...' : 'នាំចូល'}
                </Button>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Excel-like Table */}
        <FadeInSection delay={100} className="shadow-lg rounded-lg overflow-hidden border border-gray-200 bg-transparent">
          <div className="relative overflow-auto" ref={tableRef} style={{ position: 'relative', zIndex: 10, height: '680px' }}>
            <table className="min-w-full border-collapse bg-white">
              <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                {/* Main Header Row */}
                <tr className="border-b border-gray-300">
                  <th rowSpan="2" className="w-12 px-3 py-3 text-center text-xs font-medium text-gray-700 border-r border-gray-200 bg-gray-50">
                    #
                  </th>
                  {/* Student Basic Info */}
                  <th colSpan="15" className="px-3 py-3 text-center text-xs font-bold text-gray-800 bg-blue-50 border-r border-gray-200">
                    ព័ត៌មានសិស្ស
                  </th>
                  {/* Father Info */}
                  <th colSpan="6" className="px-3 py-3 text-center text-xs font-bold text-gray-800 bg-purple-50 border-r border-gray-200">
                    ព័ត៌មានឪពុក
                  </th>
                  {/* Mother Info */}
                  <th colSpan="6" className="px-3 py-3 text-center text-xs font-bold text-gray-800 bg-pink-50 border-r border-gray-200">
                    ព័ត៌មានម្តាយ
                  </th>
                  {/* Additional Info */}
                  <th colSpan="2" className="px-3 py-3 text-center text-xs font-bold text-gray-800 bg-orange-50">
                    ព័ត៌មានបន្ថែម
                  </th>
                </tr>
                {/* Sub Header Row */}
                <tr>
                  {columns.filter(col => col.key !== 'actions').map((column, colIndex) => (
                    <th
                      key={column.key}
                      className={`px-3 py-3 text-center text-xs font-medium text-gray-700 border-r border-gray-200 bg-gray-50 ${column.width}`}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {students.map((student, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="text-center text-xs text-gray-500 border-r border-gray-200 bg-gray-50">
                      {rowIndex + 1}
                    </td>
                    {columns.map((column, colIndex) => {
                      const isSelected = isCellSelected(rowIndex, colIndex);
                      const isInRange = selectedRange && (() => {
                        const minRow = Math.min(selectedRange.start.row, selectedRange.end.row);
                        const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row);
                        const minCol = Math.min(selectedRange.start.col, selectedRange.end.col);
                        const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col);
                        return rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol;
                      })();

                      return (
                        <td
                          key={column.key}
                          className={`border-r border-gray-200 relative cursor-pointer ${
                            isSelected ? '' :
                            isInRange ? 'bg-blue-50' :
                            'bg-white hover:bg-gray-50'
                          }`}
                          onClick={(e) => handleCellClick(rowIndex, column.key, e)}
                          onMouseDown={() => handleCellMouseDown(rowIndex, column.key)}
                          onMouseEnter={() => handleCellMouseEnter(rowIndex, column.key)}
                          onMouseUp={handleCellMouseUp}
                        >
                          {column.key === 'actions' ? (
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeRow(rowIndex);
                                }}
                                variant="outline"
                                size="sm"
                                disabled={students.length === 1}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 border-red-200 h-8 px-2"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                លុប
                              </Button>
                            </div>
                          ) : column.type === 'select' ? (
                            <select
                              value={student[column.key] || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateCell(rowIndex, column.key, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-3 py-2 text-xs border-0 bg-white focus:border focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                              <option value=""></option>
                              {column.options.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : column.type === 'multi-select' ? (
                            <MultiSelectDropdown
                              options={column.options}
                              value={student[column.key] || []}
                              onChange={(newValues) => {
                                updateCell(rowIndex, column.key, newValues);
                              }}
                              placeholder="ជ្រើសរើស..."
                              className="w-full"
                            />
                          ) : column.type === 'date' ? (
                            <input
                              type="date"
                              value={student[column.key] || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateCell(rowIndex, column.key, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-3 py-2 text-xs border-0 bg-white focus:border focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                          ) : column.type === 'custom-date' ? (
                            <CustomDateInput
                              value={student[column.key] || ''}
                              onChange={(newValue) => {
                                updateCell(rowIndex, column.key, newValue);
                              }}
                              className="w-full"
                            />
                          ) : (
                            <input
                              type="text"
                              value={student[column.key] || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateCell(rowIndex, column.key, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-3 py-2 text-xs border-0 bg-white focus:border focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              placeholder=""
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeInSection>
      </div>
    </PageTransition>
  );
}