import React from 'react';

/**
 * Validation Summary component - displays all validation errors in a centralized section
 * @param {Object} props
 * @param {Array} props.errors - Array of error objects with { field, messages } structure
 * @param {function} props.t - Translation function
 * @returns {React.ReactNode}
 */
const ValidationSummary = ({ errors = [], t }) => {
  // If no errors, don't render anything
  if (!errors || errors.length === 0) return null;

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-600"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800">
            {t('validationErrors', 'សូមពិនិត្រមើលឡើងវិញ')}
          </h3>
          <div className="mt-3 space-y-2">
            {errors.map((error, index) => (
              <div key={index} className="text-sm text-red-700">
                <p className="font-medium">{error.field}:</p>
                {Array.isArray(error.messages) ? (
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    {error.messages.map((msg, msgIndex) => (
                      <li key={msgIndex}>{msg}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="ml-2">{error.messages}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationSummary;
