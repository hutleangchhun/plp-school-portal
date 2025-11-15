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
  { value: 'ខ្មែរ', label: 'ជនជាតិខ្មែរ' },
  { value: 'ចាម', label: 'ជនជាតិចាម' },
  { value: 'ព្នង', label: 'ជនជាតិព្នង' },
  { value: 'កួយ', label: 'ជនជាតិកួយ' },
  { value: 'គ្រឹង', label: 'ជនជាតិគ្រឹង' },
  { value: 'រដែរ', label: 'ជនជាតិរដែរ' },
  { value: 'ស្ទៀង', label: 'ជនជាតិស្ទៀង' },
  { value: 'ទំពួន', label: 'ជនជាតិទំពួន' },
  { value: 'ព្រៅ', label: 'ជនជាតិព្រៅ' },
  { value: 'កាវែត', label: 'ជនជាតិកាវែត' },
  { value: 'កាចក់', label: 'ជនជាតិកាចក់' },
  { value: 'ព័រ', label: 'ជនជាតិព័រ' },
  { value: 'ខោញ', label: 'ជនជាតិខោញ' },
  { value: 'ជង', label: 'ជនជាតិជង' },
  { value: 'ស្អូច', label: 'ជនជាតិស្អូច' },
  { value: 'ខិ', label: 'ជនជាតិខិ' },
  { value: 'រអង', label: 'ជនជាតិរអង' },
  { value: 'ស្ពុង', label: 'ជនជាតិស្ពុង' },
  { value: 'ល្អឺន', label: 'ជនជាតិល្អឺន' },
  { value: 'សំរែ', label: 'ជនជាតិសំរែ' },
  { value: 'សួយ', label: 'ជនជាតិសួយ' },
  { value: 'ថ្មូន', label: 'ជនជាតិថ្មូន' },
  { value: 'លុន', label: 'ជនជាតិលុន' },
  { value: 'ក្រោល', label: 'ជនជាតិក្រោល' },
  { value: 'មិល', label: 'ជនជាតិមិល' },
  { value: 'ចារាយ', label: 'ជនជាតិចារាយ' }
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
