import { useState, useRef } from 'react';
import { Trash2, Wand2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';
import { userService } from '../../utils/api/services/userService';
import { useLanguage } from '../../contexts/LanguageContext';

const StudentTableRow = ({
  student,
  rowIndex,
  columns,
  schoolName,
  updateCell,
  removeRow,
  isCellInvalid,
  isCellSelected,
  handleCellClick,
  handleCellMouseDown,
  handleCellMouseEnter,
  handleCellMouseUp,
  selectedRange,
  studentsLength
}) => {
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [showUsernameSuggestions, setShowUsernameSuggestions] = useState(false);
  const hideSuggestionsTimeoutRef = useRef(null);
  const usernameDebounceRef = useRef(null);
  const { t } = useLanguage();

  const handleInputFocus = (colKey) => {
    if (colKey !== 'actions') {
      handleCellClick(rowIndex, colKey, {});
    }
  };

  const handleInputKeyDown = (e) => {
    // Allow navigation keys to bubble up to document listener
    // Just prevent default to stop the input from handling these keys
    const navigationKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
    if (navigationKeys.includes(e.key)) {
      e.preventDefault();
      // Let the event bubble to document listener - don't stop propagation
    }
  };

  const handleGenerateUsernameSuggestions = async (baseFromInput = null) => {
    try {
      const baseUsername = (baseFromInput && baseFromInput.trim()) ||
        (student.username && student.username.trim()) ||
        'student';

      const response = await userService.generateUsername(baseUsername);

      let suggestions = [];

      if (Array.isArray(response?.suggestions)) {
        suggestions = response.suggestions;
      } else if (Array.isArray(response?.data)) {
        suggestions = response.data;
      } else if (response?.username) {
        suggestions = [response.username];
      }

      // Allow up to 20 suggestions from backend
      suggestions = suggestions.filter(Boolean).slice(0, 20);

      // Persist availability flag on the row so validation can use it
      if (typeof response?.available === 'boolean') {
        updateCell(rowIndex, 'usernameAvailable', response.available);
      }

      setUsernameSuggestions(suggestions);
      setShowUsernameSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Error generating username suggestions:', error);
      setUsernameSuggestions([]);
      setShowUsernameSuggestions(false);
    }
  };

  const handleChooseUsernameSuggestion = (suggestion) => {
    updateCell(rowIndex, 'username', suggestion);
    // Chosen suggestion is expected to be available
    updateCell(rowIndex, 'usernameAvailable', true);
    setShowUsernameSuggestions(false);
  };

  const handleUsernameBlur = () => {
    if (usernameDebounceRef.current) {
      clearTimeout(usernameDebounceRef.current);
      usernameDebounceRef.current = null;
    }
    if (hideSuggestionsTimeoutRef.current) {
      clearTimeout(hideSuggestionsTimeoutRef.current);
    }
    hideSuggestionsTimeoutRef.current = setTimeout(() => {
      setShowUsernameSuggestions(false);
    }, 150);
  };

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100">
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
            data-row={rowIndex}
            data-col={colIndex}
            className={`border-r border-gray-200 relative cursor-pointer ${column.key === 'actions'
                ? 'sticky right-0 bg-white border-l border-gray-300 shadow-lg z-10'
                : isSelected ? '' :
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
                  className="text-red-600 hover:text-red-700 border-none hover:scale-105 hover:shadow-none h-8 px-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : column.type === 'select' ? (
              <Select
                value={student[column.key] || undefined}
                onValueChange={(value) => {
                  updateCell(rowIndex, column.key, value);
                }}
              >
                <SelectTrigger
                  className={`w-full h-8 text-xs ${isCellInvalid(student, column.key)
                    ? 'border-red-500 focus:ring-red-500'
                    : 'focus:ring-blue-500'
                    }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <SelectValue placeholder="ជ្រើសរើស..." />
                </SelectTrigger>
                <SelectContent>
                  {column.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : column.type === 'multi-select' ? (
              <MultiSelectDropdown
                options={column.options}
                value={student[column.key] || []}
                onValueChange={(newValues) => {
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
                onFocus={() => handleInputFocus(column.key)}
                onKeyDown={handleInputKeyDown}
                className={`w-full px-3 py-2 text-xs border-0 bg-white focus:border focus:ring-1 ${isCellInvalid(student, column.key)
                  ? 'border-2 border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'focus:border-blue-500 focus:ring-blue-500'
                  }`}
              />
            ) : column.type === 'custom-date' ? (
              <input
                type="date"
                value={student[column.key] ? (() => {
                  // Convert dd/mm/yyyy to yyyy-mm-dd for HTML date input
                  const dateStr = student[column.key];
                  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                  if (match) {
                    const [, day, month, year] = match;
                    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                  }
                  return '';
                })() : ''}
                onChange={(e) => {
                  e.stopPropagation();
                  // Convert yyyy-mm-dd back to dd/mm/yyyy
                  if (e.target.value) {
                    const [year, month, day] = e.target.value.split('-');
                    updateCell(rowIndex, column.key, `${day}/${month}/${year}`);
                  } else {
                    updateCell(rowIndex, column.key, '');
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => handleInputFocus(column.key)}
                onKeyDown={handleInputKeyDown}
                placeholder="dd/mm/yyyy"
                className={`w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:border-blue-500 ${isCellInvalid(student, column.key)
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'focus:ring-blue-500'
                  }`}
              />
            ) : column.key === 'username' ? (
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={student.username || ''}
                    onChange={(e) => {
                      e.stopPropagation();
                      const newValue = e.target.value;
                      updateCell(rowIndex, 'username', newValue);

                      // Debounced realtime suggestions based on username text only
                      if (usernameDebounceRef.current) {
                        clearTimeout(usernameDebounceRef.current);
                      }
                      usernameDebounceRef.current = setTimeout(() => {
                        handleGenerateUsernameSuggestions(newValue);
                      }, 400);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={() => handleInputFocus('username')}
                    onKeyDown={handleInputKeyDown}
                    onBlur={handleUsernameBlur}
                    className={`w-full pr-8 px-3 py-2 text-xs border-0 focus:border focus:ring-1 ${isCellInvalid(student, 'username')
                      ? 'bg-white border-2 border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'bg-white focus:border-blue-500 focus:ring-blue-500'
                      }`}
                    placeholder=""
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hideSuggestionsTimeoutRef.current) {
                        clearTimeout(hideSuggestionsTimeoutRef.current);
                      }
                      handleGenerateUsernameSuggestions(student.username || '');
                    }}
                    title={t('suggestion', 'Generate suggestions')}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-blue-600 transition-colors z-10"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {showUsernameSuggestions && usernameSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 text-xs max-h-60 overflow-auto">
                    {usernameSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full text-left px-3 py-1 hover:bg-blue-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChooseUsernameSuggestion(suggestion);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <input
                type="text"
                value={column.key === 'schoolId' ? (schoolName || '') : (student[column.key] || '')}
                onChange={(e) => {
                  e.stopPropagation();
                  updateCell(rowIndex, column.key, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => handleInputFocus(column.key)}
                onKeyDown={handleInputKeyDown}
                className={`w-full px-3 py-2 text-xs border-0 focus:border focus:ring-1 ${column.key === 'schoolId'
                  ? 'bg-blue-50 cursor-not-allowed text-blue-700 font-medium focus:border-blue-500 focus:ring-blue-500'
                  : isCellInvalid(student, column.key)
                    ? 'bg-white border-2 border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'bg-white focus:border-blue-500 focus:ring-blue-500'
                  }`}
                placeholder={column.key === 'schoolId' ? 'សាលារបស់អ្នក' : ''}
                readOnly={column.key === 'schoolId'}
                disabled={column.key === 'schoolId'}
              />
            )}
          </td>
        );
      })}
    </tr>
  );
};

export default StudentTableRow;
