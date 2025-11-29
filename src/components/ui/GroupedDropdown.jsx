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
}) {
  const { t } = useLanguage();

  // Detect if options are grouped
  const isGrouped = options.some(opt => opt.options);

  const flatOptions = isGrouped
    ? options.flatMap(group => group.options)
    : options;

  const selectedOption = flatOptions.find(option => option.value === value);
  const displayValue = selectedOption?.label || placeholder;

  const hasCustomWidth = className.includes('w-') || triggerClassName.includes('w-') || width;
  const widthClass = width || (hasCustomWidth ? '' : minWidth);
  const triggerWidthClass = width || (hasCustomWidth ? '' : minWidth);

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          className={`inline-flex items-center justify-between rounded px-4 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 ${triggerWidthClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${triggerClassName} ${className}`}
          disabled={disabled}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronDown className="h-4 w-4 ml-2 transition-transform" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={`${widthClass} bg-white rounded-md shadow-lg border border-gray-200 p-1 z-[9999] ${maxHeight} overflow-y-auto ${contentClassName}`}
          align={align}
          sideOffset={sideOffset}
          onWheel={e => e.stopPropagation()}
        >
          {/* When grouped */}
          {isGrouped ? (
            options.map((group) => (
              <div key={group.label} className="mb-1">
                <div className="px-3 py-2 text-sm bg-blue-600 text-gray-200 select-none rounded-sm mb-1">
                  {group.label}
                </div>
                {group.options.map((option) => (
                  <DropdownMenu.Item
                    key={option.value}
                    onSelect={() => onValueChange(option.value)}
                    className={`flex items-center px-3 py-2 text-sm rounded-sm transition-colors 
                      ${option.disabled
                        ? 'opacity-50 cursor-not-allowed text-gray-400'
                        : value === option.value
                          ? 'bg-blue-100 text-blue-900'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
                      focus:outline-none`}
                    disabled={option.disabled}
                  >
                    <span className="flex-1 truncate">{option.label}</span>
                    {value === option.value && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </DropdownMenu.Item>
                ))}
              </div>
            ))
          ) : (
            // Normal non-grouped options
            options.map(option => (
              <DropdownMenu.Item
                key={option.value}
                onSelect={() => onValueChange(option.value)}
                className={`flex items-center px-3 py-2 text-sm rounded-sm transition-colors
                  ${value === option.value
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
                  focus:outline-none`}
              >
                {option.label}
              </DropdownMenu.Item>
            ))
          )}

          {flatOptions.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              {t('noOptionsAvailable', 'No options available')}
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
