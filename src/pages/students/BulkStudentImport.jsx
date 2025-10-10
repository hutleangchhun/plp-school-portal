import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Upload, Download, Save, X, Copy, Scissors, Clipboard, FileSpreadsheet } from 'lucide-react';
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
import * as XLSX from 'xlsx';

// CustomDateInput Component - supports dd/mm/yy display with date picker and validation
const CustomDateInput = ({ value, onChange, className = "" }) => {
  const [inputValue, setInputValue] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [isValid, setIsValid] = useState(true);

  // Validate dd/mm/yy or dd.mm.yy format
  const validateDateFormat = (dateStr) => {
    if (!dateStr || dateStr.trim() === '') return true; // Empty is valid

    // Check dd/mm/yy or dd.mm.yy format
    const dateMatch = dateStr.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
    if (!dateMatch) return false;

    const [, day, month, year] = dateMatch;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year.length === 2 ? `20${year}` : year, 10);

    // Basic date validation
    if (monthNum < 1 || monthNum > 12) return false;
    if (dayNum < 1 || dayNum > 31) return false;
    if (yearNum < 1900 || yearNum > 2100) return false;

    // Check days in month
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    if (dayNum > daysInMonth) return false;

    return true;
  };

  // Convert between formats
  const formatForDisplay = (dateStr) => {
    if (!dateStr) return '';

    // Handle JavaScript Date objects (from XLSX)
    if (dateStr instanceof Date && !isNaN(dateStr.getTime())) {
      const day = dateStr.getDate().toString().padStart(2, '0');
      const month = (dateStr.getMonth() + 1).toString().padStart(2, '0');
      const year = dateStr.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year}`;
    }

    // If it's already in dd/mm/yy or dd.mm.yy format, return as is
    if (dateStr.match(/^\d{1,2}[/.]\d{1,2}[/.]\d{2,4}$/)) {
      return dateStr;
    }

    // If it's in yyyy-mm-dd format, convert to dd/mm/yy
    const yyyymmddMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyymmddMatch) {
      const [, year, month, day] = yyyymmddMatch;
      return `${day}/${month}/${year.slice(-2)}`;
    }

    return dateStr;
  };

  const formatForAPI = (displayValue) => {
    if (!displayValue) return '';

    // If it's in dd/mm/yy or dd.mm.yy format, convert to yyyy-mm-dd
    const dateMatch = displayValue.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // If it's already in yyyy-mm-dd format, return as is
    if (displayValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return displayValue;
    }

    return displayValue;
  };

  useEffect(() => {
    const displayValue = formatForDisplay(value);
    setInputValue(displayValue);
    setIsValid(validateDateFormat(displayValue));
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsValid(validateDateFormat(newValue));
    onChange(formatForAPI(newValue));
  };

  const handleDatePickerChange = (e) => {
    const dateValue = e.target.value; // yyyy-mm-dd format
    const displayValue = formatForDisplay(dateValue);
    setInputValue(displayValue);
    setIsValid(validateDateFormat(displayValue));
    onChange(dateValue);
    setShowPicker(false);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="dd/mm/yy or dd.mm.yy"
        className={`w-full px-2 py-1 text-xs border-0 rounded bg-white focus:ring-1 focus:ring-blue-500 ${
          isValid
            ? 'focus:border focus:border-blue-500'
            : 'border border-red-500 focus:border-red-500 focus:ring-red-500'
        }`}
      />
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-blue-500"
        title="Open date picker"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {!isValid && inputValue && (
        <div className="absolute -bottom-5 left-0 text-xs text-red-600 font-medium">
          ទម្រង់ថ្ងៃខែឆ្នាំមិនត្រឹមត្រូវ
        </div>
      )}

      {showPicker && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded shadow-lg p-2">
          <input
            type="date"
            onChange={handleDatePickerChange}
            className="border-0 rounded p-2 text-sm focus:border focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        </div>
      )}
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
        className="w-full px-2 py-1 text-xs border-0 rounded bg-white focus:border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-left flex items-center justify-between"
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
      id: '',
      lastName: '',
      firstName: '',
      gender: '',
      dateOfBirth: '',
      placeOfBirth: '',
      fatherName: '',
      fatherOccupation: '',
      motherName: '',
      motherOccupation: '',
      currentAddress: '',
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
    { key: 'id', header: 'អត្តលេខ', width: 'w-24' },
    { key: 'lastName', header: 'គោត្តនាម', width: 'w-32' },
    { key: 'firstName', header: 'នាម', width: 'w-32' },
    { key: 'gender', header: 'ភេទ', width: 'w-24', type: 'select', options: genderOptions },
    { key: 'dateOfBirth', header: 'ថ្ងៃខែឆ្នាំកំណើត', width: 'w-40', type: 'custom-date' },
    { key: 'placeOfBirth', header: 'ទីកន្លែងកំណើត', width: 'w-40' },
    { key: 'fatherName', header: 'ឈ្មោះឪពុក', width: 'w-32' },
    { key: 'fatherOccupation', header: 'មុខរបរ', width: 'w-32' },
    { key: 'motherName', header: 'ឈ្មោះម្តាយ', width: 'w-32' },
    { key: 'motherOccupation', header: 'មុខរបរ', width: 'w-32' },
    { key: 'currentAddress', header: 'អាសយដ្ឋានសព្វថ្ងៃ', width: 'w-48' },
    { key: 'ethnicGroup', header: 'ជនជាតិភាគតិច', width: 'w-40', type: 'select', options: ethnicGroupOptions },
    { key: 'accessibility', header: 'តម្រូវការប្រើប្រាស់', width: 'w-48', type: 'multi-select', options: accessibilityOptions },
    { key: 'actions', header: 'សកម្មភាព', width: 'w-20' }
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

      if (jsonData.length < 1) {
        showError('ឯកសារ Excel គឺទទេ');
        return;
      }

      // Check if first row looks like headers
      const firstRow = jsonData[0];
      const expectedHeaders = ['អត្តលេខ', 'គោត្តនាម', 'នាម', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត', 'ទីកន្លែងកំណើត', 'ឈ្មោះឪពុក', 'មុខរបរ', 'ឈ្មោះម្តាយ', 'មុខរបរ', 'អាសយដ្ឋានសព្វថ្ងៃ', 'ជនជាតិភាគតិច', 'តម្រូវការប្រើប្រាស់'];

      const hasHeaders = firstRow && firstRow.length >= expectedHeaders.length &&
        expectedHeaders.some(header => firstRow.includes(header));

      // Determine data start index
      const dataStartIndex = hasHeaders ? 1 : 0;

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
        let genderIndex = -1;
        let dobIndex = -1;
        let pobIndex = -1;
        let fatherNameIndex = -1;
        let fatherOccIndex = -1;
        let motherNameIndex = -1;
        let motherOccIndex = -1;
        let addressIndex = -1;
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
            } else if (headerStr.includes('ទីកន្លែងកំណើត') || (headerStr.includes('place') && headerStr.includes('birth'))) {
              pobIndex = idx;
            } else if ((headerStr.includes('ឪពុក') && headerStr.includes('ឈ្មោះ')) || (headerStr.includes('father') && headerStr.includes('name'))) {
              fatherNameIndex = idx;
            } else if ((headerStr.includes('ឪពុក') && headerStr.includes('មុខរបរ')) || (headerStr.includes('father') && headerStr.includes('occupation'))) {
              fatherOccIndex = idx;
            } else if ((headerStr.includes('ម្តាយ') && headerStr.includes('ឈ្មោះ')) || (headerStr.includes('mother') && headerStr.includes('name'))) {
              motherNameIndex = idx;
            } else if ((headerStr.includes('ម្តាយ') && headerStr.includes('មុខរបរ')) || (headerStr.includes('mother') && headerStr.includes('occupation'))) {
              motherOccIndex = idx;
            } else if (headerStr.includes('អាសយដ្ឋាន') || headerStr.includes('address')) {
              addressIndex = idx;
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
          genderIndex = 3;
          dobIndex = 4;
          pobIndex = 5;
          fatherNameIndex = 6;
          fatherOccIndex = 7;
          motherNameIndex = 8;
          motherOccIndex = 9;
          addressIndex = 10;
          ethnicIndex = 11;
          accessIndex = 12;
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
        let actualGenderIndex = genderIndex;
        let actualDobIndex = dobIndex;
        let actualPobIndex = pobIndex;
        let actualFatherNameIndex = fatherNameIndex;
        let actualFatherOccIndex = fatherOccIndex;
        let actualMotherNameIndex = motherNameIndex;
        let actualMotherOccIndex = motherOccIndex;
        let actualAddressIndex = addressIndex;
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
            actualGenderIndex = 4;
            actualDobIndex = 5;
            actualPobIndex = 6;
            actualFatherNameIndex = 7;
            actualFatherOccIndex = 8;
            actualMotherNameIndex = 9;
            actualMotherOccIndex = 10;
            actualAddressIndex = 11;
            actualEthnicIndex = 12;
            actualAccessIndex = 13;
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
          id: studentId,
          lastName: lastName,
          firstName: firstName,
          gender: actualGenderIndex >= 0 ? mapGender(getValue(actualGenderIndex)) : '',
          dateOfBirth: actualDobIndex >= 0 ? normalizeDateForDisplay(getValue(actualDobIndex)) : '',
          placeOfBirth: actualPobIndex >= 0 ? getValue(actualPobIndex) : '',
          fatherName: actualFatherNameIndex >= 0 ? getValue(actualFatherNameIndex) : '',
          fatherOccupation: actualFatherOccIndex >= 0 ? getValue(actualFatherOccIndex) : '',
          motherName: actualMotherNameIndex >= 0 ? getValue(actualMotherNameIndex) : '',
          motherOccupation: actualMotherOccIndex >= 0 ? getValue(actualMotherOccIndex) : '',
          currentAddress: actualAddressIndex >= 0 ? getValue(actualAddressIndex) : '',
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
    // Create sample data for template
    const templateData = [
      ['អត្តលេខ', 'គោត្តនាម', 'នាម', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត', 'ទីកន្លែងកំណើត', 'ឈ្មោះឪពុក', 'មុខរបរ', 'ឈ្មោះម្តាយ', 'មុខរបរ', 'អាសយដ្ឋានសព្វថ្ងៃ', 'ជនជាតិភាគតិច', 'តម្រូវការប្រើប្រាស់'],
      ['STU001', 'សុខ', 'វិច្ឆិកា', 'ប្រុស', '15/05/05', 'ភ្នំពេញ', 'សុខ វិច្ឆិកា', 'មន្រ្តី', 'ស្រី សុខ', 'គ្រូ', 'ភ្នំពេញ', '', ''],
      ['STU002', 'ចាន់', 'សុភា', 'ស្រី', '20/03/06', 'កំពង់ចាម', 'ចាន់ សុភា', 'កសិករ', 'ស្រី ចាន់', 'ផ្ទះម៉ែ', 'កំពង់ចាម', '', 'ពិបាកក្នុងការមើល']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'student_import_template.xlsx');
  }, []);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const addRow = () => {
    setStudents(prev => [...prev, {
      id: '',
      lastName: '',
      firstName: '',
      gender: '',
      dateOfBirth: '',
      placeOfBirth: '',
      fatherName: '',
      fatherOccupation: '',
      motherName: '',
      motherOccupation: '',
      currentAddress: '',
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
        student.id.trim()
      );

      if (validStudents.length === 0) {
        showError('សូមបញ្ចូលព័ត៌មានសិស្សយ៉ាងហោចណាស់ម្នាក់');
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

      // Transform data for API
      const transformedData = validStudents.map(student => ({
        first_name: student.firstName.trim(),
        last_name: student.lastName.trim(),
        student_number: student.id.trim(),
        date_of_birth: convertDateFormat(student.dateOfBirth),
        gender: student.gender || undefined,
        nationality: 'ខ្មែរ',
        place_of_birth: student.placeOfBirth.trim() || undefined,
        minority_ethnic_group: student.ethnicGroup || undefined,
        accessibility: student.accessibility.length > 0 ? student.accessibility : undefined,
        roleId: 9, // Student role
        parents: [
          {
            first_name: student.fatherName.trim() || undefined,
            last_name: '',
            relationship: 'FATHER',
            occupation: student.fatherOccupation.trim() || undefined
          },
          {
            first_name: student.motherName.trim() || undefined,
            last_name: '',
            relationship: 'MOTHER',
            occupation: student.motherOccupation.trim() || undefined
          }
        ].filter(parent => parent.first_name),
        residence: student.currentAddress.trim() ? {
          address: student.currentAddress.trim()
        } : undefined
      }));

      // Submit each student
      const results = [];
      for (const studentData of transformedData) {
        try {
          const response = await studentService.createStudent(studentData);
          results.push({ success: true, data: response });
        } catch (error) {
          results.push({ success: false, error: error.message, data: studentData });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        showSuccess(`បាននាំចូលសិស្សចំនួន ${successCount} នាក់ដោយជោគជ័យ`);
      }

      if (errorCount > 0) {
        showError(`មានកំហុស ${errorCount} នាក់`);
      }

      // Reset form on complete success
      if (errorCount === 0) {
        setStudents([{
          id: '',
          lastName: '',
          firstName: '',
          gender: '',
          dateOfBirth: '',
          placeOfBirth: '',
          fatherName: '',
          fatherOccupation: '',
          motherName: '',
          motherOccupation: '',
          currentAddress: '',
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
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
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
        <FadeInSection delay={100} className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto" ref={tableRef}>
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                <tr>
                  <th className="w-12 px-3 py-3 text-center text-xs font-medium text-gray-700 border-r border-gray-200 bg-gray-50">
                    #
                  </th>
                  {columns.map((column, colIndex) => (
                    <th
                      key={column.key}
                      className={`px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200 bg-gray-50 ${column.width}`}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {students.map((student, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-3 py-2 text-center text-xs text-gray-500 border-r border-gray-200 bg-gray-50">
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
                          className={`px-2 py-2 border-r border-gray-200 relative cursor-pointer ${
                            isSelected ? 'bg-blue-100 ring-1 ring-blue-300' :
                            isInRange ? 'bg-blue-50' :
                            'bg-white hover:bg-gray-50'
                          }`}
                          onClick={(e) => handleCellClick(rowIndex, column.key, e)}
                          onMouseDown={() => handleCellMouseDown(rowIndex, column.key)}
                          onMouseEnter={() => handleCellMouseEnter(rowIndex, column.key)}
                          onMouseUp={handleCellMouseUp}
                        >
                          {column.key === 'actions' ? (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRow(rowIndex);
                              }}
                              variant="ghost"
                              size="sm"
                              disabled={students.length === 1}
                              className="text-red-600 hover:text-red-700 disabled:opacity-50 h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          ) : column.type === 'select' ? (
                            <select
                              value={student[column.key] || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateCell(rowIndex, column.key, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-2 py-1 text-xs border-0 rounded bg-white focus:border focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                              className="w-full px-2 py-1 text-xs border-0 rounded bg-white focus:border focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                              className="w-full px-2 py-1 text-xs border-0 rounded bg-white focus:border focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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

          {/* Excel-like toolbar */}
          <div className="bg-gray-50 border-t border-gray-300 p-3 flex items-center gap-3">
            <Button
              onClick={copySelectedCells}
              variant="outline"
              size="sm"
              className="h-8 px-3"
              title="Copy (Ctrl+C)"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
            <Button
              onClick={pasteToSelectedCells}
              variant="outline"
              size="sm"
              className="h-8 px-3"
              title="Paste (Ctrl+V)"
            >
              <Clipboard className="h-3 w-3 mr-1" />
              Paste
            </Button>
            <div className="flex-1"></div>
            <div className="text-xs text-gray-600 bg-white px-3 py-1 rounded border border-gray-200">
              <span className="font-medium">Keyboard shortcuts:</span> Arrows navigate • Tab/Enter move • Ctrl+C/V copy/paste • Click+drag select range
            </div>
          </div>
        </FadeInSection>
      </div>
    </PageTransition>
  );
}