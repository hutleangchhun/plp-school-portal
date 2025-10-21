import { useState, useEffect, useCallback } from 'react';

// CustomDateInput Component - Text input for dd/mm/yyyy format with validation
const CustomDateInput = ({ value, onChange, className = "" }) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [isInvalid, setIsInvalid] = useState(false);

  useEffect(() => {
    setLocalValue(value || '');
    // Validate existing value
    if (value) {
      const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        const [, day, month, year] = match;
        const d = parseInt(day);
        const m = parseInt(month);
        const y = parseInt(year);
        setIsInvalid(!(d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100));
      } else if (value !== '') {
        setIsInvalid(true);
      } else {
        setIsInvalid(false);
      }
    } else {
      setIsInvalid(false);
    }
  }, [value]);

  const handleChange = useCallback((e) => {
    let input = e.target.value;

    // Remove all non-digit characters except /
    input = input.replace(/[^\d/]/g, '');

    // Auto-add slashes
    if (input.length === 2 && !input.includes('/')) {
      input = input + '/';
    } else if (input.length === 5 && input.split('/').length === 2) {
      input = input + '/';
    }

    // Limit to dd/mm/yyyy format
    const parts = input.split('/');
    if (parts[0] && parts[0].length > 2) parts[0] = parts[0].slice(0, 2);
    if (parts[1] && parts[1].length > 2) parts[1] = parts[1].slice(0, 2);
    if (parts[2] && parts[2].length > 4) parts[2] = parts[2].slice(0, 4);
    input = parts.join('/');

    setLocalValue(input);
    setIsInvalid(false); // Clear invalid state while typing
  }, []);

  const handleBlur = useCallback(() => {
    // Validate and format on blur
    const match = localValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      const d = parseInt(day);
      const m = parseInt(month);
      const y = parseInt(year);

      // Basic validation
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        const formatted = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        setLocalValue(formatted);
        onChange(formatted);
        setIsInvalid(false);
      } else {
        setIsInvalid(true);
      }
    } else if (localValue === '') {
      onChange('');
      setIsInvalid(false);
    } else {
      // Invalid format
      setIsInvalid(true);
    }
  }, [localValue, onChange]);

  return (
    <div className="relative">
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="dd/mm/yyyy"
        className={`w-full px-2 py-1.5 text-xs border rounded focus:ring-2 focus:border-blue-500 bg-white ${className} ${isInvalid
          ? 'border-red-500 text-red-600 focus:ring-red-500'
          : 'border-gray-300 focus:ring-blue-500'
          }`}
        style={{
          minHeight: '32px',
          position: 'relative',
          zIndex: 5
        }}
        maxLength={10}
        title={isInvalid ? 'Invalid date format. Use dd/mm/yyyy' : ''}
      />
    </div>
  );
};

export default CustomDateInput;
