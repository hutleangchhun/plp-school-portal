import { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import * as RadioGroup from '@radix-ui/react-radio-group';
import * as Select from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';

/**
 * Reusable FormField Component
 * Handles various input types with validation and localization
 * 
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.label - Field label key for translation
 * @param {string} props.type - Input type: 'text', 'email', 'password', 'select', 'radio', 'textarea', 'file'
 * @param {any} props.value - Field value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.error - Error message
 * @param {boolean} props.required - Whether field is required
 * @param {string} props.placeholder - Placeholder text key
 * @param {boolean} props.disabled - Whether field is disabled
 * @param {Array} props.options - Options for select/radio (format: [{value, label, labelKey}])
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.validation - Validation rules
 */
export default function FormField({
  name,
  label,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  options = [],
  className = '',
  // validation = {}, // For future implementation
  ...props
}) {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);

  const handleChange = (newValue) => {
    if (onChange) {
      onChange(name, newValue);
    }
    if (!touched) setTouched(true);
  };

  const handleBlur = () => {
    if (!touched) setTouched(true);
  };

  // Get translated label
  const translatedLabel = label ? t(label) || label : '';
  const translatedPlaceholder = placeholder ? t(placeholder) || placeholder : '';
  const isInvalid = touched && error;
  const isValid = touched && !error && value;

  // Base input classes
  const baseInputClasses = `
    w-full px-3 py-2 border rounded-md transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${isInvalid ? 'border-red-500 bg-red-50' : ''}
    ${isValid ? 'border-green-500 bg-green-50' : ''}
    ${!isInvalid && !isValid ? 'border-gray-300 hover:border-gray-400' : ''}
  `;

  // Render different input types
  const renderInput = () => {
    switch (type) {
      case 'password':
        return (
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name={name}
              value={value || ''}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
              placeholder={translatedPlaceholder}
              disabled={disabled}
              className={`${baseInputClasses} pr-10`}
              {...props}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={disabled}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        );

      case 'textarea':
        return (
          <textarea
            name={name}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={translatedPlaceholder}
            disabled={disabled}
            rows={props.rows || 3}
            className={`${baseInputClasses} resize-vertical`}
            {...props}
          />
        );

      case 'select':
        return (
          <Select.Root
            value={value || ''}
            onValueChange={handleChange}
            disabled={disabled}
          >
            <Select.Trigger className={`${baseInputClasses} flex items-center justify-between`}>
              <Select.Value placeholder={translatedPlaceholder} />
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <Select.ScrollUpButton />
                <Select.Viewport className="p-1">
                  {options.map((option) => (
                    <Select.Item
                      key={option.value}
                      value={option.value}
                      className="px-3 py-2 text-sm rounded cursor-pointer hover:bg-blue-100 focus:bg-blue-100 focus:outline-none data-[highlighted]:bg-blue-100"
                    >
                      <Select.ItemText>
                        {option.labelKey ? t(option.labelKey) || option.label : option.label}
                      </Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
                <Select.ScrollDownButton />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        );

      case 'radio':
        return (
          <RadioGroup.Root
            value={value || ''}
            onValueChange={handleChange}
            disabled={disabled}
            className="flex gap-4"
          >
            {options.map((option) => (
              <div key={option.value} className="flex items-center">
                <RadioGroup.Item
                  value={option.value}
                  className="h-4 w-4 rounded-full border-2 border-gray-300 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <RadioGroup.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-white" />
                </RadioGroup.Item>
                <label className="ml-2 text-sm text-gray-700">
                  {option.labelKey ? t(option.labelKey) || option.label : option.label}
                </label>
              </div>
            ))}
          </RadioGroup.Root>
        );

      case 'file':
        return (
          <input
            type="file"
            name={name}
            onChange={(e) => handleChange(e.target.files[0])}
            onBlur={handleBlur}
            disabled={disabled}
            className={`${baseInputClasses} file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}
            {...props}
          />
        );

      default:
        return (
          <input
            type={type}
            name={name}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={translatedPlaceholder}
            disabled={disabled}
            className={baseInputClasses}
            {...props}
          />
        );
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {translatedLabel && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {translatedLabel}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input */}
      <div className="relative">
        {renderInput()}
        
        {/* Status Icons */}
        {(isInvalid || isValid) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            {isInvalid && <AlertCircle className="h-4 w-4 text-red-500" />}
            {isValid && <Check className="h-4 w-4 text-green-500" />}
          </div>
        )}
      </div>

      {/* Error Message */}
      {isInvalid && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}

      {/* Help Text */}
      {props.helpText && (
        <p className="text-xs text-gray-500">
          {t(props.helpText) || props.helpText}
        </p>
      )}
    </div>
  );
}

// Export specialized field components
export const PasswordField = (props) => (
  <FormField {...props} type="password" />
);

export const EmailField = (props) => (
  <FormField {...props} type="email" />
);

export const SelectField = (props) => (
  <FormField {...props} type="select" />
);

export const RadioField = (props) => (
  <FormField {...props} type="radio" />
);

export const TextAreaField = (props) => (
  <FormField {...props} type="textarea" />
);

export const FileField = (props) => (
  <FormField {...props} type="file" />
);