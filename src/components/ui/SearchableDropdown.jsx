import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export default function SearchableDropdown({
  value,
  onValueChange,
  options = [],
  placeholder = 'Search and select...',
  className = '',
  triggerClassName = '',
  contentClassName = '',
  disabled = false,
  align = 'start',
  sideOffset = 4,
  minWidth = 'min-w-[300px]',
  maxHeight = 'max-h-[300px]',
  searchPlaceholder = 'Type to search...',
  onSearch,
  isLoading = false,
  showClearButton = true,
  emptyMessage = 'No results found',
  showSecondaryInfo = false, // New prop to show secondary info (like school code)
  secondaryInfoKey = 'secondary' // Key name for secondary info in option object
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const searchInputRef = useRef(null);

  const selectedOption = options.find(option => option.value === value);
  // Use label if found, otherwise use placeholder
  // If showSecondaryInfo is enabled and secondary info exists, show it
  const displayValue = selectedOption
    ? (showSecondaryInfo && selectedOption[secondaryInfoKey]
        ? `${selectedOption.label} (${selectedOption[secondaryInfoKey]})`
        : selectedOption.label)
    : placeholder;

  // Update filtered options when options change
  useEffect(() => {
    setFilteredOptions(options);
  }, [options]);

  // Filter options based on search term
  useEffect(() => {
    if (onSearch) {
      // If onSearch is provided, let parent handle filtering
      onSearch(searchTerm);
    } else {
      // Default client-side filtering
      const filtered = options.filter(option => {
        // Safely check if label exists and is a string
        const labelMatch = option.label && typeof option.label === 'string'
          ? option.label.toLowerCase().includes(searchTerm.toLowerCase())
          : false;
        
        // Also search in secondary info if enabled
        const secondaryValue = option[secondaryInfoKey];
        const secondaryMatch = showSecondaryInfo && secondaryValue && typeof secondaryValue === 'string'
          ? secondaryValue.toLowerCase().includes(searchTerm.toLowerCase())
          : false;
        
        return labelMatch || secondaryMatch;
      });
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options, onSearch, showSecondaryInfo, secondaryInfoKey]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSelect = useCallback((optionValue) => {
    onValueChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  }, [onValueChange]);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    onValueChange('');
    setSearchTerm('');
  }, [onValueChange]);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  }, []);

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          onMouseDown={(e) => e.preventDefault()}
          className={`w-full inline-flex items-center justify-between rounded px-4 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${triggerClassName}`}
          disabled={disabled}
        >
          <span className="truncate flex-1 text-left">{displayValue}</span>
          <ChevronDown className={`h-4 w-4 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          className={`bg-white rounded-md shadow-lg border border-gray-200 p-1 z-[9999] w-[var(--radix-dropdown-menu-trigger-width)] flex flex-col ${contentClassName}`}
          sideOffset={4}
        >
          {/* Search Input */}
          <div className="px-3 py-2 border-b border-gray-200 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <X
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer"
                  onClick={() => setSearchTerm('')}
                />
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            className={`overflow-y-auto min-h-0 flex flex-col ${maxHeight || 'max-h-[300px]'}`}
            onWheel={(e) => e.stopPropagation()}
          >
              {isLoading ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                    Searching...
                  </div>
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  {emptyMessage}
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(option.value);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      disabled={option.disabled}
                      className={`w-full flex items-center text-start px-3 py-2 text-sm rounded-sm transition-colors focus:outline-none ${
                        option.disabled
                          ? 'opacity-50 cursor-not-allowed text-gray-400'
                          : value === option.value
                            ? 'bg-blue-100 text-blue-900 cursor-pointer hover:bg-blue-100'
                            : 'text-gray-700 cursor-pointer hover:bg-gray-100 hover:text-gray-900'
                      } data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 data-[highlighted]:outline-none`}
                    >
                      <span className="flex-1 truncate">
                        {showSecondaryInfo && option[secondaryInfoKey] ? (
                          <span className="flex flex-col">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-xs text-gray-500">Code: {option[secondaryInfoKey]}</span>
                          </span>
                        ) : (
                          option.label
                        )}
                      </span>
                      {value === option.value && (
                        <span className="ml-auto text-blue-600 flex-shrink-0">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// Usage examples:
/*
import SearchableDropdown from '../ui/SearchableDropdown';
import classService from '../../utils/api/services/classService';

// Basic usage with static options
<SearchableDropdown
  value={selectedValue}
  onValueChange={setSelectedValue}
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ]}
  placeholder="Select an option..."
/>

// Dynamic search with API
const [classes, setClasses] = useState([]);
const [isLoadingClasses, setIsLoadingClasses] = useState(false);

const handleClassSearch = async (searchTerm) => {
  setIsLoadingClasses(true);
  try {
    const response = await classService.getClassesBySchool(schoolId, {
      search: searchTerm,
      page: 1,
      limit: 50
    });
    const options = response.data.map(cls => ({
      value: cls.classId.toString(),
      label: cls.name
    }));
    setClasses(options);
  } catch (error) {
    console.error('Error searching classes:', error);
    setClasses([]);
  } finally {
    setIsLoadingClasses(false);
  }
};

<SearchableDropdown
  value={selectedClassId}
  onValueChange={setSelectedClassId}
  options={classes}
  onSearch={handleClassSearch}
  isLoading={isLoadingClasses}
  placeholder="Search and select class..."
  searchPlaceholder="Type class name..."
  emptyMessage="No classes found"
/>
*/