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
  {value: '0', label: 'ថ្នាក់មត្តេយ្យ', translationKey: 'kindergarten'},
  { value: '1', label: 'ថ្នាក់ទី1', translationKey: 'grade1' },
  { value: '2', label: 'ថ្នាក់ទី2', translationKey: 'grade2' },
  { value: '3', label: 'ថ្នាក់ទី3', translationKey: 'grade3' },
  { value: '4', label: 'ថ្នាក់ទី4', translationKey: 'grade4' },
  { value: '5', label: 'ថ្នាក់ទី5', translationKey: 'grade5' },
  { value: '6', label: 'ថ្នាក់ទី6', translationKey: 'grade6' }
];

// Employment Type options
export const employmentTypeOptions = [
  { value: 'បឋម', label: 'បឋម' },
  { value: 'កិច្ចសន្យា', label: 'កិច្ចសន្យា' },
  { value: 'កិច្ចព្រមព្រៀង', label: 'កិច្ចព្រមព្រៀង' },
  { value: 'ឧត្ដម', label: 'ឧត្ដម' },
  { value: 'មូលដ្ឋាន', label: 'មូលដ្ឋាន' },
  { value: 'មត្តេយ្យ', label: 'មត្តេយ្យ' }
];

// Education Level options for teachers
export const educationLevelOptions = [
  { value: 'បណ្ឌិត', label: 'បណ្ឌិត (Doctorate)' },
  { value: 'អនុបណ្ឌិត', label: 'អនុបណ្ឌិត (Master)' },
  { value: 'បរិញ្ញាបត្រ', label: 'បរិញ្ញាបត្រ (Bachelor)' },
  { value: 'មធ្យមសិក្សាទុតិយភូមិ', label: 'មធ្យមសិក្សាទុតិយភូមិ (Upper Secondary)' },
  { value: 'មធ្យមសិក្សាបឋមភូមិ', label: 'មធ្យមសិក្សាបឋមភូមិ (Lower Secondary)' },
  { value: 'ក្រោមបឋមភូមិ', label: 'ក្រោមបឋមភូមិ (Below Secondary)' }
];

// Training Type options for teachers
export const trainingTypeOptions = [
  { value: '8.1', label: '8.1' },
  { value: '8.2', label: '8.2' },
  { value: '9+2', label: '9+2' },
  { value: '11+2', label: '11+2' },
  { value: '12+2', label: '12+2' },
  { value: '12+4', label: '12+4' },
  { value: 'បរិញ្ញាបត្រ+1', label: 'បរិញ្ញាបត្រ+1' },
  { value: 'បរិញ្ញាបត្រ+2', label: 'បរិញ្ញាបត្រ+2' }
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
