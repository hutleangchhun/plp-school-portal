import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export default function MultiSelectDropdown({
  values = [],
  onValuesChange,
  options = [],
  placeholder = 'Select options...',
  className = '',
  disabled = false,
  maxHeight = 'max-h-[200px]'
}) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOptions = options.filter(option => values.includes(option.value));
  const displayValue = selectedOptions.length > 0
    ? selectedOptions.map(opt => opt.label).join(', ')
    : placeholder;

  const handleToggle = (optionValue) => {
    const newValue = values.includes(optionValue)
      ? values.filter(v => v !== optionValue)
      : [...values, optionValue];
    onValuesChange(newValue);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onValuesChange([]);
  };

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className={`inline-flex items-center justify-between rounded px-4 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          disabled={disabled}
        >
          <span className="truncate flex-1 text-left">
            {displayValue}
          </span>
          <div className="flex items-center ml-2 flex-shrink-0">
            {values.length > 0 && (
              <X
                className="h-4 w-4 text-gray-400 hover:text-gray-600 mr-1"
                onClick={handleClear}
              />
            )}
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={`min-w-[200px] bg-white rounded-md shadow-lg border border-gray-200 p-1 z-[9999] ${maxHeight} overflow-y-auto`}
          align="start"
          sideOffset={4}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {options.map((option) => (
            <div
              key={option.value}
              className={`flex items-center px-3 py-2 text-sm rounded-sm transition-colors cursor-pointer ${
                values.includes(option.value)
                  ? 'bg-blue-100 text-blue-900'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => handleToggle(option.value)}
            >
              <div className="w-4 h-4 mr-2 flex items-center justify-center flex-shrink-0">
                {values.includes(option.value) && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </div>
              <span className="flex-1">{option.label}</span>
            </div>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              No options available
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}