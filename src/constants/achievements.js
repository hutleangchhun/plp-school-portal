// Achievement categories for consistent use across the application
export const ACHIEVEMENT_CATEGORIES = [
  { value: 'Academic', label: 'Academic', khmer: 'សិក្សា', icon: '🎓' },
  { value: 'Sports', label: 'Sports', khmer: 'កីឡា', icon: '🏆' },
  { value: 'Arts', label: 'Arts', khmer: 'សិល្បៈ', icon: '🎨' },
  { value: 'Leadership', label: 'Leadership', khmer: 'ភាពជាអ្នកដឹកនាំ', icon: '👑' }
];

// Achievement categories with translation support
export const getAchievementCategories = (t) => {
  return ACHIEVEMENT_CATEGORIES.map(category => ({
    ...category,
    translatedLabel: t(category.value.toLowerCase()) || category.label
  }));
};

// Get category label by value
export const getCategoryLabel = (value, t = null) => {
  const category = ACHIEVEMENT_CATEGORIES.find(c => c.value === value);
  if (!category) return value;
  
  if (t) {
    return t(value.toLowerCase()) || category.label;
  }
  return category.label;
};

// Achievement levels/ranks
export const ACHIEVEMENT_LEVELS = [
  { value: 'Gold', label: 'Gold', khmer: 'មាស', color: '#FFD700' },
  { value: 'Silver', label: 'Silver', khmer: 'ប្រាក់', color: '#C0C0C0' },
  { value: 'Bronze', label: 'Bronze', khmer: 'លង្ហិន', color: '#CD7F32' },
  { value: 'Excellence', label: 'Excellence', khmer: 'ឧត្តមភាព', color: '#9333EA' },
  { value: 'Merit', label: 'Merit', khmer: 'យោគយល់', color: '#059669' }
];

// Get achievement level by value
export const getAchievementLevel = (value, t = null) => {
  const level = ACHIEVEMENT_LEVELS.find(l => l.value === value);
  if (!level) return { value, label: value, color: '#6B7280' };
  
  if (t) {
    return {
      ...level,
      translatedLabel: t(value.toLowerCase()) || level.label
    };
  }
  return level;
};