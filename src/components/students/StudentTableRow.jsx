import { Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';

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
            className={`border-r border-gray-200 relative cursor-pointer ${
              column.key === 'actions' 
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
                placeholder="dd/mm/yyyy"
                className={`w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:border-blue-500 ${isCellInvalid(student, column.key)
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'focus:ring-blue-500'
                  }`}
              />
            ) : (
              <input
                type="text"
                value={column.key === 'schoolId' ? (schoolName || '') : (student[column.key] || '')}
                onChange={(e) => {
                  e.stopPropagation();
                  updateCell(rowIndex, column.key, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
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
