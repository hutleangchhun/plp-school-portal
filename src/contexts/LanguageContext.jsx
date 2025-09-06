import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../locales';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('km'); // Default to Khmer

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  const toggleLanguage = () => {
    const newLanguage = language === 'km' ? 'en' : 'km';
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  // New translation function using key-based translations
  const t = (key, fallback) => {
    if (typeof key === 'string') {
      // Key-based translation
      const translation = translations[language]?.[key];
      return translation || fallback || key;
    } else {
      // Backward compatibility: direct km/en values (will be deprecated)
      return language === 'km' ? key : fallback;
    }
  };

  const value = {
    language,
    toggleLanguage,
    t,
    isKhmer: language === 'km',
    isEnglish: language === 'en'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};