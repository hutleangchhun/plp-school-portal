/**
 * Centralized Form Options Configuration
 * Contains all dropdown/select options used across the application
 */

// Gender options
export const genderOptions = [
  { value: 'MALE', label: 'ប្រុស' },
  { value: 'FEMALE', label: 'ស្រី' }
];

// Nationality options
export const nationalityOptions = [
  { value: 'ខ្មែរ', label: 'ខ្មែរ' }
];

// Ethnic Group options (25 groups)
export const ethnicGroupOptions = [
  { value: 'ជនជាតិខ្មែរ', label: 'ជនជាតិខ្មែរ' },
  { value: 'ជនជាតិចាម', label: 'ជនជាតិចាម' },
  { value: 'ជនជាតិព្នង', label: 'ជនជាតិព្នង' },
  { value: 'ជនជាតិកួយ', label: 'ជនជាតិកួយ' },
  { value: 'ជនជាតិគ្រឹង', label: 'ជនជាតិគ្រឹង' },
  { value: 'ជនជាតិរដែរ', label: 'ជនជាតិរដែរ' },
  { value: 'ជនជាតិស្ទៀង', label: 'ជនជាតិស្ទៀង' },
  { value: 'ជនជាតិទំពួន', label: 'ជនជាតិទំពួន' },
  { value: 'ជនជាតិព្រៅ', label: 'ជនជាតិព្រៅ' },
  { value: 'ជនជាតិកាវែត', label: 'ជនជាតិកាវែត' },
  { value: 'ជនជាតិកាចក់', label: 'ជនជាតិកាចក់' },
  { value: 'ជនជាតិព័រ', label: 'ជនជាតិព័រ' },
  { value: 'ជនជាតិខោញ', label: 'ជនជាតិខោញ' },
  { value: 'ជនជាតិជង', label: 'ជនជាតិជង' },
  { value: 'ជនជាតិស្អូច', label: 'ជនជាតិស្អូច' },
  { value: 'ជនជាតិខិ', label: 'ជនជាតិខិ' },
  { value: 'ជនជាតិរអង', label: 'ជនជាតិរអង' },
  { value: 'ជនជាតិស្ពុង', label: 'ជនជាតិស្ពុង' },
  { value: 'ជនជាតិល្អឺន', label: 'ជនជាតិល្អឺន' },
  { value: 'ជនជាតិសំរែ', label: 'ជនជាតិសំរែ' },
  { value: 'ជនជាតិសួយ', label: 'ជនជាតិសួយ' },
  { value: 'ជនជាតិថ្មូន', label: 'ជនជាតិថ្មូន' },
  { value: 'ជនជាតិលុន', label: 'ជនជាតិលុន' },
  { value: 'ជនជាតិក្រោល', label: 'ជនជាតិក្រោល' },
  { value: 'ជនជាតិមិល', label: 'ជនជាតិមិល' },
  { value: 'ជនជាតិចារាយ', label: 'ជនជាតិចារាយ' }
];

// Accessibility/Disability options
export const accessibilityOptions = [
  { value: 'ពិបាកក្នុងការធ្វើចលនា', label: 'ពិបាកក្នុងការធ្វើចលនា' },
  { value: 'ពិបាកក្នុងការស្ដាប់', label: 'ពិបាកក្នុងការស្ដាប់' },
  { value: 'ពិបាកក្នុងការនិយាយ', label: 'ពិបាកក្នុងការនិយាយ' },
  { value: 'ពិបាកក្នុងការមើល', label: 'ពិបាកក្នុងការមើល' },
  { value: 'ពិការសរីរាង្គខាងក្នុង', label: 'ពិការសរីរាង្គខាងក្នុង' },
  { value: 'ពិការសតិបញ្ញា', label: 'ពិការសតិបញ្ញា' },
  { value: 'ពិការផ្លូវចិត្ត', label: 'ពិការផ្លូវចិត្ត' },
  { value: 'ពិការផ្សេងៗ', label: 'ពិការផ្សេងៗ' }
];

// Grade Level options (with translation keys for i18n)
export const gradeLevelOptions = [
  { value: '1', label: 'ថ្នាក់ទី១', translationKey: 'grade1' },
  { value: '2', label: 'ថ្នាក់ទី២', translationKey: 'grade2' },
  { value: '3', label: 'ថ្នាក់ទី៣', translationKey: 'grade3' },
  { value: '4', label: 'ថ្នាក់ទី៤', translationKey: 'grade4' },
  { value: '5', label: 'ថ្នាក់ទី៥', translationKey: 'grade5' },
  { value: '6', label: 'ថ្នាក់ទី៦', translationKey: 'grade6' }
];

// Academic Year options (dynamically generated based on current year)
export const getAcademicYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return [
    { value: `${currentYear}-${currentYear + 1}`, label: `${currentYear}-${currentYear + 1}` },
    { value: `${currentYear + 1}-${currentYear + 2}`, label: `${currentYear + 1}-${currentYear + 2}` },
    { value: `${currentYear + 2}-${currentYear + 3}`, label: `${currentYear + 2}-${currentYear + 3}` }
  ];
};
