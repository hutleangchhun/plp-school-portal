// Relationship constants for parent-student relationships
export const RELATIONSHIP_TYPES = {
  FATHER: 'FATHER',
  MOTHER: 'MOTHER',
  GUARDIAN: 'GUARDIAN',
  OTHER: 'OTHER'
};

// Relationship options with labels
export const RELATIONSHIP_OPTIONS = [
  { value: 'FATHER', label: 'FATHER', khmer: 'ឪពុក' },
  { value: 'MOTHER', label: 'MOTHER', khmer: 'ម្តាយ' },
  { value: 'GUARDIAN', label: 'GUARDIAN', khmer: 'អាណាព្យាបាល' },
  { value: 'OTHER', label: 'OTHER', khmer: 'ផ្សេងៗ' }
];

// Khmer relationship terms (as provided by user)
export const KHMER_RELATIONSHIPS = {
  MOTHER: 'ម្ដាយ',
  FATHER: 'ឳពុក'
};

// Mapping for backward compatibility
export const RELATIONSHIP_MAPPING = {
  'FATHER': 'ឪពុក',
  'MOTHER': 'ម្តាយ',
  'GUARDIAN': 'អាណាព្យាបាល',
  'OTHER': 'ផ្សេងៗ'
};