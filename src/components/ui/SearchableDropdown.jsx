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
  emptyMessage = 'No results found'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(option => option.value === value);
  const displayValue = selectedOption?.label || placeholder;

  // Filter options based on search term
  useEffect(() => {
    if (onSearch) {
      // If onSearch is provided, let parent handle filtering
      onSearch(searchTerm);
    } else {
      // Default client-side filtering
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options, onSearch]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
    <div className="relative" ref={dropdownRef}>
      <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            className={`inline-flex items-center justify-between rounded px-4 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${minWidth} w-auto ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${triggerClassName}`}
            disabled={disabled}
          >
            <span className="truncate flex-1 text-left">{displayValue}</span>
            <div className="flex items-center ml-2 flex-shrink-0">
              {value && showClearButton && (
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
            className={`${minWidth} bg-white rounded-md shadow-lg border border-gray-200 p-0 z-[9999] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${maxHeight ? maxHeight + ' overflow-hidden' : ''} ${contentClassName}`}
            align={align}
            sideOffset={sideOffset}
          >
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchTerm && (
                  <X
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer"
                    onClick={() => setSearchTerm('')}
                  />
                )}
              </div>
            </div>

            {/* Options List */}
            <div className={`${maxHeight} overflow-y-auto`}>
              {isLoading ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                    Searching...
                  </div>
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  {emptyMessage}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <DropdownMenu.Item
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className={`flex items-center px-3 py-2 text-sm cursor-pointer transition-colors focus:outline-none ${
                      value === option.value
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
                ))
              )}
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
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