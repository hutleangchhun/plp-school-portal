import { useState, useEffect } from 'react';
import Dropdown from './Dropdown';
import salaryTypeService from '../../utils/api/services/salaryTypeService';

/**
 * SalaryTypeDropdown Component
 * Dynamically fetches and displays salary types based on employment type
 *
 * @param {string} employmentType - The selected employment type (e.g., "បឋម")
 * @param {string|number} value - Currently selected salary type ID
 * @param {Function} onValueChange - Callback when salary type selection changes (returns ID)
 * @param {string} placeholder - Placeholder text for the dropdown
 * @param {boolean} disabled - Whether the dropdown is disabled
 * @param {string} className - Additional CSS classes
 */
const SalaryTypeDropdown = ({
  employmentType,
  value,
  onValueChange,
  placeholder = 'Select Salary Type',
  disabled = false,
  className = 'w-full'
}) => {
  const [salaryTypes, setSalaryTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employmentType) {
      setSalaryTypes([]);
      return;
    }

    const fetchSalaryTypes = async () => {
      setLoading(true);
      try {
        const data = await salaryTypeService.getSalaryTypesByEmploymentType(employmentType);
        if (Array.isArray(data)) {
          setSalaryTypes(data);
        } else {
          setSalaryTypes([]);
        }
      } catch (error) {
        console.error('Failed to fetch salary types:', error);
        // Don't show error toast - empty array is expected for some employment types
        setSalaryTypes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSalaryTypes();
  }, [employmentType]);

  // Employment types that should be disabled when they have no salary types
  const disableableEmploymentTypes = ['កិច្ចសន្យា', 'កិច្ចព្រមព្រៀង'];

  // Check if this is an employment type that should be disabled when no salary types available
  const shouldDisableIfEmpty = disableableEmploymentTypes.includes(employmentType);
  const hasNoSalaryTypes = !loading && employmentType && salaryTypes.length === 0 && shouldDisableIfEmpty;

  // Convert salary types data to dropdown options format
  // Use salaryTypeId as value and name as label
  const options = [
    { value: '', label: placeholder },
    ...salaryTypes.map(salaryType => ({
      value: String(salaryType.id || salaryType.salaryTypeId),
      label: salaryType.name
    }))
  ];

  return (
    <Dropdown
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      disabled={disabled || loading || !employmentType || hasNoSalaryTypes}
      className={className}
      contentClassName="max-h-[200px] overflow-y-auto"
    />
  );
};

export default SalaryTypeDropdown;
