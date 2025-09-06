import { useLanguage } from '../contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white shadow-inner border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="text-center text-sm text-gray-600">
            <p>
              © {currentYear} {t('teacherPortal', 'Teacher Portal')} - {t('allRightsReserved', 'All rights reserved')}
            </p>
            <p className="mt-2">
              {t('poweredBy', 'Powered by')} PLP & Sangpac
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}