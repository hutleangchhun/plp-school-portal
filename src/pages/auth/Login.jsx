import { useState } from 'react';
import { LogIn, Eye, EyeOff, User, Lock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import { Button } from '../../components/ui/Button';
import { api, utils } from '../../utils/api';
import Footer from '../../components/layout/Footer';
import plpLogo from '../../assets/plp-logo-v2.png';
import moeysLogo from '../../assets/moeys-logo.png';

export default function Login({ setUser }) {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.auth.login({
        username: formData.username,
        password: formData.password
      });

      if (response.success) {
        const { user } = response.data;
        setUser(user);
        showSuccess(t('loginSuccessful', 'Login successful!'));
      } else {
        showError(utils.auth.getErrorMessage(response, t));
      }
    } catch (err) {
      showError(utils.auth.getErrorMessage(err, t));
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Language Switcher at the top */}
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logos Section */}
          <div className="flex justify-center items-center space-x-8 mb-8">
            <img 
              src={moeysLogo} 
              alt={t('MoEYS Logo') || 'រូបសញ្ញាក្រសួងអប់រំ'} 
              className="h-16 w-auto object-contain"
            />
            <div className="h-12 w-px bg-gray-300"></div>
            <img 
              src={plpLogo} 
              alt={t('PLP Logo') || 'រូបសញ្ញា PLP'} 
              className="h-16 w-auto object-contain"
            />
          </div>
          
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {t('teacherPortal', 'Teacher Portal')}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('signInToAccount', 'Sign in to your account')}
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  {t('username')}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-300 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                    placeholder={t('enterUsername', 'Enter your username')}
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {t('password')}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="appearance-none relative block w-full pl-10 pr-12 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-300 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                    placeholder={t('enterPassword', 'Enter your password')}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                size="default"
                fullWidth
                className="relative group"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <LogIn className="h-5 w-5 text-blue-300 group-hover:text-blue-200" />
                </span>
                {loading ? t('signingIn', 'Signing in...') : t('signIn', 'Sign in')}
              </Button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}