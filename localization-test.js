// Test script to verify Khmer localization
import { translations } from './src/locales/index.js';

// Test the translation function behavior
const testTranslation = (key, language = 'km') => {
  const translation = translations[language]?.[key];
  const khmerFallback = translations['km']?.[key];
  return translation || khmerFallback || key;
};

console.log('🇰🇭 Khmer Localization Test');
console.log('============================');

// Test key translations
const testKeys = [
  'studentSelection',
  'assignToClass', 
  'backToStudents',
  'studentsSelected',
  'selectClassFirst',
  'assignStudents'
];

console.log('Key translations:');
testKeys.forEach(key => {
  const km = testTranslation(key, 'km');
  const en = testTranslation(key, 'en');
  console.log(`  ${key}:`);
  console.log(`    🇰🇭 KM: ${km}`);
  console.log(`    🇬🇧 EN: ${en}`);
  console.log('');
});

// Test fallback behavior
console.log('Testing fallback behavior:');
console.log('Non-existent key in EN falls back to KM:');
const nonExistentKey = 'nonExistentTestKey';
console.log(`  ${nonExistentKey}: ${testTranslation(nonExistentKey, 'en')}`);

console.log('\n✅ Localization test completed!');
console.log('🌐 Base language: Khmer (km)');
console.log('📱 Fallback chain: Current Language → Khmer → Key');