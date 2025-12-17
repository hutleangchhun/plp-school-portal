import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Languages, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function LanguageSwitcher({ className = '' }) {
  const { language, toggleLanguage, t } = useLanguage();

  const languages = [
    { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇺🇸' },
    { code: 'km', label: 'Khmer', nativeLabel: 'ភាសាខ្មែរ', flag: '🇰🇭' }
  ];

  const currentLanguage = languages.find(lang => lang.code === language);

  const handleLanguageSelect = (langCode) => {
    if (langCode !== language) {
      toggleLanguage();
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={`flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
          title={t('ប្តូរភាសា', 'Switch Language')}
        >
          <span className="hidden sm:inline mr-1">
            {currentLanguage?.nativeLabel}
          </span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content 
          className="min-w-[160px] bg-white rounded-md shadow-lg border border-gray-200 p-1 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          align="end"
          sideOffset={5}
        >
          {languages.map((lang) => (
            <DropdownMenu.Item
              key={lang.code}
              onSelect={() => handleLanguageSelect(lang.code)}
              className={`flex items-center px-3 py-2 text-sm rounded-sm cursor-pointer transition-colors focus:outline-none ${
                language === lang.code
                  ? 'bg-blue-100 text-blue-900'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              } data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 data-[highlighted]:outline-none`}
            >
              
              <span className="font-medium">{lang.nativeLabel}</span>
              {language === lang.code && (
                <span className="ml-auto text-blue-600">✓</span>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}