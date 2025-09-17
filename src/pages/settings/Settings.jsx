import { useState } from 'react';
import { User, Bell, Globe, Mail, Save } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

export default function Settings() {
  const { t } = useLanguage();
  const { showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    emailAlerts: false,
    darkMode: false,
    autoSave: true
  });

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSuccess(t('Settings saved successfully', 'Settings saved successfully'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('settings') || 'Settings'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('manageSettings') || 'Manage your account settings and preferences'}
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <User className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">{t('profileSettings', 'Profile Settings')}</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('Display Name', 'Display Name')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 transition-all duration-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md" 
                  defaultValue={t('John Doe', 'John Doe')} 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('email', 'Email')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  type="email" 
                  className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 transition-all duration-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md" 
                  defaultValue="john@school.com" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Bell className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">{t('notifications', 'Notifications')}</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(settings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <button
                  onClick={() => handleToggle(key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Language Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Globe className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">{t('language', 'Language')}</h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{t('interfaceLanguage', 'Interface Language')}</span>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg flex items-center space-x-2 transition-all duration-300 hover:shadow-md"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? t('Saving...', 'Saving...') : t('Save Settings', 'Save Settings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}