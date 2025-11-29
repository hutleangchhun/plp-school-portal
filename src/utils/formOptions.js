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

// Role options (filtered for school management roles only)
export const roleOptions = [
  { value: '8', label: 'គ្រូបង្រៀន' }, // TEACHER
  { value: '14', label: 'នាយកសាលារៀន' }, // PRINCIPAL
  { value: '15', label: 'នាយករងសាលារៀន' }, // DEPUTYPRINCIPAL
  { value: '16', label: 'លេខាធិការសាលារៀន' }, // SCHOOLSECRETARY
  { value: '17', label: 'ហេរញ្ញិកសាលារៀន' }, // SCHOOLTREASURER
  { value: '18', label: 'បណ្ណារក្សសាលារៀន' }, // SCHOOLLIBRARIAN
  { value: '19', label: 'រោងជាងសាលារៀន' }, // SCHOOLWORKSHOP
  { value: '20', label: 'ឆ្មាំសាលារៀន' }, // SCHOOLSECURITY
  { value: '21', label: 'គ្រូICT' } // TEACHERICT
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
  { value: 'បណ្ឌិត', label: 'បណ្ឌិត' },
  { value: 'អនុបណ្ឌិត', label: 'អនុបណ្ឌិត' },
  { value: 'បរិញ្ញាបត្រ', label: 'បរិញ្ញាបត្រ' },
  { value: 'មធ្យមសិក្សាទុតិយភូមិ', label: 'មធ្យមសិក្សាទុតិយភូមិ' },
  { value: 'មធ្យមសិក្សាបឋមភូមិ', label: 'មធ្យមសិក្សាបឋមភូមិ' },
  { value: 'ក្រោមបឋមភូមិ', label: 'ក្រោមបឋមភូមិ' }
];

// Training Type options for teachers
export const trainingTypeOptions = [
  { value: '8+1', label: '8+1' },
  { value: '8+2', label: '8+2' },
  { value: '9+2', label: '9+2' },
  { value: '11+2', label: '11+2' },
  { value: '12+2', label: '12+2' },
  { value: '12+4', label: '12+4' },
  { value: 'បរិញ្ញាបត្រ+1', label: 'បរិញ្ញាបត្រ+1' },
  { value: 'បរិញ្ញាបត្រ+2', label: 'បរិញ្ញាបត្រ+2' }
];

// Teaching Type options for teachers
export const teachingTypeOptions = [
  { value: '1 វេន', label: '1 វេន' },
  { value: '2 វេន', label: '2 វេន' },
  { value: 'គួប', label: 'គួប' },
  { value: 'គួប + 2 វេន', label: 'គួប + 2 វេន' }
];

// Teacher Status options for teachers
export const teacherStatusOptions = [
  { value: 'បង្រៀនអង់គ្លេស', label: 'បង្រៀនអង់គ្លេស' },
  { value: 'បង្រៀនសិល្បៈ', label: 'បង្រៀនសិល្បៈ' },
  { value: 'បម្រើការនៅអង្គការ', label: 'បម្រើការនៅអង្គការ' },
  { value: 'បន្តការសិក្សា', label: 'បន្តការសិក្សា' },
  { value: 'កំពុងស្នើលុបឈ្មោះ', label: 'កំពុងស្នើលុបឈ្មោះ' },
  { value: 'សុំចូលនិវត្ដន៍មុនអាយុ', label: 'សុំចូលនិវត្ដន៍មុនអាយុ' },
  { value: 'ទំនេរគ្មានបៀវត្ស', label: 'ទំនេរគ្មានបៀវត្ស' },
  { value: 'ក្រៅក្របខណ្ឌដើម', label: 'ក្រៅក្របខណ្ឌដើម' },
  { value: 'បាត់បង់សម្បទាវិជ្ជាជីវៈ', label: 'បាត់បង់សម្បទាវិជ្ជាជីវៈ' },
  { value: 'មានជំងឺរ៉ាំរ៉ៃ', label: 'មានជំងឺរ៉ាំរ៉ៃ' },
  { value: 'លំហែមាតុភាព', label: 'លំហែមាតុភាព' },
  { value: 'ផ្សេងៗ', label: 'ផ្សេងៗ' }
];

// Subject options for teachers
export const subjectOptions = [
  { value: 'ភាសាខ្មែរ', label: 'ភាសាខ្មែរ' },
  { value: 'គណិតវិទ្យា', label: 'គណិតវិទ្យា' },
  { value: 'ភាសាអង់គ្លេស', label: 'ភាសាអង់គ្លេស' },
  { value: 'ភាសាបារាំង', label: 'ភាសាបារាំង' },
  { value: 'កីឡា', label: 'កីឡា' },
  { value: 'រូបវិទ្យា', label: 'រូបវិទ្យា' },
  { value: 'គីមីវិទ្យា', label: 'គីមីវិទ្យា' },
  { value: 'ជីវវិទ្យា', label: 'ជីវវិទ្យា' },
  { value: 'ផែនដីវិទ្យា', label: 'ផែនដីវិទ្យា' },
  { value: 'ប្រវត្តិវិទ្យា', label: 'ប្រវត្តិវិទ្យា' },
  { value: 'ភូមិវិទ្យា', label: 'ភូមិវិទ្យា' },
  { value: 'សីលធម៌-ពលរដ្ឋ', label: 'សីលធម៌-ពលរដ្ឋ' },
  { value: 'គេហវិទ្យា', label: 'គេហវិទ្យា' },
  { value: 'សេដ្ឋកិច្ច', label: 'សេដ្ឋកិច្ច' },
  { value: 'ព័ត៌មានវិទ្យា', label: 'ព័ត៌មានវិទ្យា' },
  { value: 'កសិកម្ម', label: 'កសិកម្ម' },
  { value: 'សិល្បៈ', label: 'សិល្បៈ' },
  { value: 'ដូរ្យតន្រ្តី', label: 'ដូរ្យតន្រ្តី' },
  { value: 'នាដសាស្រ្ត', label: 'នាដសាស្រ្ត' },
  { value: 'រោងជាង', label: 'រោងជាង' },
  { value: 'គ្រប់គ្រងទូទៅ', label: 'គ្រប់គ្រងទូទៅ' },
  { value: 'គ្រប់គ្រងអប់រំ', label: 'គ្រប់គ្រងអប់រំ' },
  { value: 'អេឡិចត្រនិច', label: 'អេឡិចត្រនិច' },
  { value: 'អគ្គិសនី', label: 'អគ្គិសនី' },
  { value: 'មេកានិច', label: 'មេកានិច' },
  { value: 'ភាសារុស្សី', label: 'ភាសារុស្សី' }
];

// Marital Status options
export const maritalStatusOptions = [
  { value: 'នៅលីវ', label: 'នៅលីវ' }, // Single
  { value: 'រៀបការ', label: 'រៀបការ' }, // Married
  { value: 'មេម៉ាយ/ពោះម៉ាយ', label: 'មេម៉ាយ/ពោះម៉ាយ' } // Single Parent/Widow
];

// Spouse job options
export const spouseJobOptions = [
  { value: '', label: 'មិនមានការងារ' },
  { value: 'គ្រូបង្រៀន', label: 'គ្រូបង្រៀន' }, // Teacher
  { value: 'កសិករ', label: 'កសិករ' }, // Farmer
  { value: 'ពាណិជ្ជករ', label: 'ពាណិជ្ជករ' }, // Business
  { value: 'មន្ត្រីរាជការ', label: 'មន្ត្រីរាជការ' }, // Government Staff
  { value: 'កម្មករ', label: 'កម្មករ' }, // Worker
  { value: 'អង្គការមិនមែនរដ្ឋាភិបាល', label: 'អង្គការមិនមែនរដ្ឋាភិបាល' }, // Other NGO
  { value: 'កម្មសិទ្ធិផ្ទាល់ខ្លួន', label: 'កម្មសិទ្ធិផ្ទាល់ខ្លួន' } // Self-employed
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
