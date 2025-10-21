import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export default function MultiSelectDropdown({
  value = [],
  onValueChange,
  options = [],
  placeholder = 'Select options...',
  className = '',
  disabled = false,
  maxHeight = 'max-h-[200px]'
}) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOptions = options.filter(option => value.includes(option.value));
  const displayValue = selectedOptions.length > 0 
    ? selectedOptions.map(opt => opt.label).join(', ')
    : placeholder;

  const handleToggle = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onValueChange(newValue);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onValueChange([]);
  };

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className={`inline-flex items-center justify-between rounded px-3 py-2 text-xs bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full h-8 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          disabled={disabled}
        >
          <span className="truncate flex-1 text-left text-xs">
            {displayValue}
          </span>
          <div className="flex items-center ml-2 flex-shrink-0">
            {value.length > 0 && (
              <X
                className="h-3 w-3 text-gray-400 hover:text-gray-600 mr-1"
                onClick={handleClear}
              />
            )}
            <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={`min-w-[200px] bg-white rounded-md shadow-lg border border-gray-200 p-1 z-[9999] ${maxHeight} overflow-y-auto`}
          align="start"
          sideOffset={4}
        >
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.value}
              className="flex items-center px-2 py-1.5 text-xs cursor-pointer hover:bg-gray-50 rounded-sm outline-none"
              onSelect={(e) => {
                e.preventDefault();
                handleToggle(option.value);
              }}
            >
              <div className="flex items-center w-full">
                <div className="w-4 h-4 mr-2 flex items-center justify-center">
                  {value.includes(option.value) && (
                    <Check className="h-3 w-3 text-blue-600" />
                  )}
                </div>
                <span className="flex-1">{option.label}</span>
              </div>
            </DropdownMenu.Item>
          ))}
          {options.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-gray-500 text-center">
              No options available
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}