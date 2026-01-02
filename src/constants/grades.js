// Grade level constants for consistent use across the application
export const GRADE_LEVELS = [
  { value: '0', label: 'Kindergarten', khmer: 'មត្តេយ្យ' },
  { value: '1', label: 'Grade 1', khmer: 'ថ្នាក់ទី1' },
  { value: '2', label: 'Grade 2', khmer: 'ថ្នាក់ទី2' },
  { value: '3', label: 'Grade 3', khmer: 'ថ្នាក់ទី3' },
  { value: '4', label: 'Grade 4', khmer: 'ថ្នាក់ទី4' },
  { value: '5', label: 'Grade 5', khmer: 'ថ្នាក់ទី5' },
  { value: '6', label: 'Grade 6', khmer: 'ថ្នាក់ទី6' },
  { value: '7', label: 'Grade 7', khmer: 'ថ្នាក់ទី7' },
  { value: '8', label: 'Grade 8', khmer: 'ថ្នាក់ទី8' },
  { value: '9', label: 'Grade 9', khmer: 'ថ្នាក់ទី9' },
  { value: '10', label: 'Grade 10', khmer: 'ថ្នាក់ទី10' },
  { value: '11', label: 'Grade 11', khmer: 'ថ្នាក់ទី11' },
  { value: '12', label: 'Grade 12', khmer: 'ថ្នាក់ទី12' }
];

// Grade levels with translation key support
export const getGradeLevels = (t) => {
  return GRADE_LEVELS.map(grade => ({
    ...grade,
    translatedLabel: t(`grade${grade.value}`) || grade.khmer || grade.label
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