// Grade level constants for consistent use across the application
export const GRADE_LEVELS = [
  { value: '1', label: 'Grade 1', khmer: 'ថ្នាក់ទី១' },
  { value: '2', label: 'Grade 2', khmer: 'ថ្នាក់ទី២' },
  { value: '3', label: 'Grade 3', khmer: 'ថ្នាក់ទី៣' },
  { value: '4', label: 'Grade 4', khmer: 'ថ្នាក់ទី៤' },
  { value: '5', label: 'Grade 5', khmer: 'ថ្នាក់ទី៥' },
  { value: '6', label: 'Grade 6', khmer: 'ថ្នាក់ទី៦' },
  { value: '7', label: 'Grade 7', khmer: 'ថ្នាក់ទី៧' },
  { value: '8', label: 'Grade 8', khmer: 'ថ្នាក់ទី៨' },
  { value: '9', label: 'Grade 9', khmer: 'ថ្នាក់ទី៩' },
  { value: '10', label: 'Grade 10', khmer: 'ថ្នាក់ទី១០' },
  { value: '11', label: 'Grade 11', khmer: 'ថ្នាក់ទី១១' },
  { value: '12', label: 'Grade 12', khmer: 'ថ្នាក់ទី១២' }
];

// Grade levels with translation key support
export const getGradeLevels = (t) => {
  return GRADE_LEVELS.map(grade => ({
    ...grade,
    translatedLabel: t(`grade${grade.value}`) || grade.label
  }));
};

// Get grade label by value
export const getGradeLabel = (value, t = null) => {
  const grade = GRADE_LEVELS.find(g => g.value === value);
  if (!grade) return value;
  
  if (t) {
    return t(`grade${value}`) || grade.label;
  }
  return grade.label;
};

// Grade level validation
export const isValidGradeLevel = (value) => {
  return GRADE_LEVELS.some(grade => grade.value === value);
};