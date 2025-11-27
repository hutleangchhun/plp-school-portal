import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Dropdown({
  value,
  onValueChange,
  options = [],
  placeholder = 'Select option...',
  className = '',
  triggerClassName = '',
  contentClassName = '',
  disabled = false,
  align = 'start',
  sideOffset = 4,
  minWidth = 'min-w-[200px]',
  width = '',
  maxHeight = 'max-h-[300px]',
  itemsToShow = null
}) {
  const selectedOption = options.find(option => option.value === value);
  const displayValue = selectedOption?.label || placeholder;
  const {t} = useLanguage();

  // Determine width classes - prioritize width prop, then custom classes, then minWidth
  const hasCustomWidth = className.includes('w-') || triggerClassName.includes('w-') || width;
  const widthClass = width || (hasCustomWidth ? '' : minWidth);
  const triggerWidthClass = width || (hasCustomWidth ? '' : minWidth);

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          className={`inline-flex items-center justify-between rounded px-4 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${triggerWidthClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${triggerClassName} ${className}`}
          disabled={disabled}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0 transition-transform" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={`${widthClass} bg-white rounded-md shadow-lg border border-gray-200 p-1 z-[9999] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${maxHeight ? maxHeight + ' overflow-y-scroll' : ''} ${contentClassName}`}
          align={align}
          sideOffset={sideOffset}
          onWheel={(e) => e.stopPropagation()}
        >
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.value}
              onSelect={() => onValueChange(option.value)}
              className={`flex items-center px-3 py-2 text-sm rounded-sm transition-colors focus:outline-none ${
                option.disabled
                  ? 'opacity-50 cursor-not-allowed text-gray-400'
                  : value === option.value
                    ? 'bg-blue-100 text-blue-900 cursor-pointer hover:bg-blue-100'
                    : 'text-gray-700 cursor-pointer hover:bg-gray-100 hover:text-gray-900'
              } data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 data-[highlighted]:outline-none`}
              disabled={option.disabled}
            >
              <span className="flex-1 truncate">{option.label}</span>
              {value === option.value && (
                <span className="ml-auto text-blue-600 flex-shrink-0">
                  <Check className="h-4 w-4" />
                </span>
              )}
            </DropdownMenu.Item>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              {t('noOptionsAvailable', 'No options available')}
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// Usage examples:
/*
// Basic usage
<Dropdown
  value={selectedValue}
  onValueChange={setSelectedValue}
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3', disabled: true },
  ]}
  placeholder="Choose an option..."
/>

// Class selector usage
<Dropdown
  value={selectedClassId}
  onValueChange={setSelectedClassId}
  options={[
    { value: 'all', label: 'All Classes' },
    ...classes.map(cls => ({
      value: cls.classId.toString(),
      label: cls.name
    }))
  ]}
  placeholder="Select class..."
  minWidth="min-w-[250px]"
/>
*/