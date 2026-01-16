import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, User, Lock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import { Button } from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { api, utils } from '../../utils/api';
import Footer from '../../components/layout/Footer';
import plpLogo from '../../assets/plppp.png';
import moeysLogo from '../../assets/moeys-logo.png';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { getFullName } from '../../utils/usernameUtils';
import { trackLogin, trackLoginFailed } from '../../utils/analytics/ga4Analytics';

export default function Login({ setUser }) {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { error, handleError, clearError, retry } = useErrorHandler();
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAccountSelection, setShowAccountSelection] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  // Check for username in URL parameters and pre-fill
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const usernameParam = urlParams.get('username');
    
    if (usernameParam) {
      setFormData(prev => ({
        ...prev,
        username: decodeURIComponent(usernameParam)
      }));
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearError();

    try {
      const response = await api.auth.login({
        username: formData.username,
        password: formData.password
      });

      // Handle account selection requirement
      if (response.requiresSelection && response.accounts) {
        setAvailableAccounts(response.accounts);
        setShowAccountSelection(true);
        setLoading(false);
        return;
      }

      if (response.success) {
        // Get fresh user data that authService saved to localStorage (includes latest school_id)
        const freshUser = utils.user.getUserData();
        console.log('Setting user with fresh data from localStorage:', freshUser);

        // Track login event to GA4 with role information
        trackLogin(freshUser);

        setUser(freshUser);
        showSuccess(t('loginSuccessful', 'Login successful!'));
      } else {
        // Handle error response from authService
        let errorMessage = response.error || utils.auth.getErrorMessage(response, t);
        let failureReason = 'unknown_error';

        console.log('📊 Login error response:', { response, errorMessage });

        // Use translation if error matches known message (case-insensitive)
        const msgLower = errorMessage?.toLowerCase() || '';
        if (msgLower.includes('only authorized users')) {
          errorMessage = t('unauthorizedAccess', 'Only authorized users can access this portal. Please contact your administrator.');
          failureReason = 'unauthorized_access';
        } else if (msgLower.includes('no response') || msgLower.includes('service unavailable') || msgLower.includes('cannot connect')) {
          errorMessage = t('networkError', 'Network Error. Please check your internet connection and try again.');
          failureReason = 'network_error';
        } else if (msgLower.includes('invalid') && (msgLower.includes('username') || msgLower.includes('password') || msgLower.includes('credentials'))) {
          errorMessage = t('invalidUsernameAndPassword', 'Invalid Username And Password');
          failureReason = 'invalid_credentials';
        }

        // Track login failure to GA4
        trackLoginFailed({
          reason: failureReason,
          username: formData.username,
          errorMessage: response.error || 'Unknown error'
        });

        showError(errorMessage);
      }
    } catch (err) {
      const errorMessage = utils.auth.getErrorMessage(err, t);
      // Show connection/network errors as toast, not error display
      const isAuthError = err.response?.status === 401;
      const isNetworkError = !err.response; // No response means network/connection error

      // Determine failure reason based on error type
      let failureReason = 'server_error';
      if (isNetworkError) {
        failureReason = 'network_error';
      } else if (isAuthError) {
        failureReason = 'invalid_credentials';
      } else if (err.response?.status === 403) {
        failureReason = 'forbidden_access';
      } else if (err.response?.status >= 500) {
        failureReason = 'server_error';
      }

      // Track login failure to GA4
      trackLoginFailed({
        reason: failureReason,
        username: formData.username,
        errorMessage: errorMessage
      });

      handleError(err, {
        toastMessage: errorMessage,
        setError: !isAuthError && !isNetworkError // Only show error display for server errors
      });
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelection = async () => {
    if (!selectedAccountId) {
      showError(t('pleaseSelectAccount', 'Please select an account'));
      return;
    }

    setLoading(true);

    try {
      // Get the selected account object
      const selectedAccount = availableAccounts.find(acc => acc.id === selectedAccountId);
      if (!selectedAccount) {
        showError(t('accountNotFound', 'Selected account not found'));
        return;
      }

      // Use the select-account endpoint with userId and password
      const response = await api.auth.selectAccount(
        selectedAccount.id,
        formData.password
      );

      if (response.success) {
        const freshUser = utils.user.getUserData();

        // Track login event to GA4 with role information
        trackLogin(freshUser);

        setUser(freshUser);
        showSuccess(t('loginSuccessful', 'Login successful!'));
        setShowAccountSelection(false);
        setSelectedAccountId(null);
      } else {
        // Handle error response from authService
        let errorMessage = response.error || utils.auth.getErrorMessage(response, t);
        let failureReason = 'account_selection_failed';

        console.log('📊 Account selection error response:', { response, errorMessage });

        // Use translation if error matches known message (case-insensitive)
        const msgLower = errorMessage?.toLowerCase() || '';
        if (msgLower.includes('only authorized users')) {
          errorMessage = t('unauthorizedAccess', 'Only authorized users can access this system');
          failureReason = 'unauthorized_access';
        } else if (msgLower.includes('no response') || msgLower.includes('service unavailable') || msgLower.includes('cannot connect')) {
          errorMessage = t('networkError', 'Network Error. Please check your internet connection and try again.');
          failureReason = 'network_error';
        } else if (msgLower.includes('invalid') && (msgLower.includes('username') || msgLower.includes('password') || msgLower.includes('credentials'))) {
          errorMessage = t('invalidUsernameAndPassword', 'Invalid Username And Password');
          failureReason = 'invalid_credentials';
        } else if (msgLower.includes('bad request') || msgLower.includes('property') || msgLower.includes('must be')) {
          // Handle validation errors from the API
          errorMessage = t('invalidUsernameAndPassword', 'Invalid Username And Password');
          failureReason = 'invalid_credentials';
        }

        // Track account selection failure to GA4
        trackLoginFailed({
          reason: failureReason,
          username: formData.username,
          errorMessage: response.error || 'Unknown error'
        });

        showError(errorMessage);
      }
    } catch (err) {
      const errorMessage = utils.auth.getErrorMessage(err, t);

      // Determine failure reason based on error type
      let failureReason = 'account_selection_failed';
      const isNetworkError = !err.response;
      if (isNetworkError) {
        failureReason = 'network_error';
      } else if (err.response?.status === 401) {
        failureReason = 'invalid_credentials';
      } else if (err.response?.status >= 500) {
        failureReason = 'server_error';
      }

      // Track account selection failure to GA4
      trackLoginFailed({
        reason: failureReason,
        username: formData.username,
        errorMessage: errorMessage
      });

      showError(errorMessage || t('accountSelectionFailed', 'Failed to select account'));
      console.error('Account selection error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Show error display for network/server errors (not auth errors)
  if (error && error.type !== 'auth') {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex justify-end p-4">
          <LanguageSwitcher />
        </div>
        <ErrorDisplay 
          error={error} 
          onRetry={() => retry()}
          size="default"
          className="flex-1"
        />
        <Footer />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-50 flex flex-col bg-gray-50"
    >
      {/* Language Switcher at the top */}
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md sm:max-w-lg w-full bg-white rounded-sm shadow-lg border border-gray-200 p-6 sm:p-8 space-y-6 sm:space-y-8">
          {/* Logos Section */}
          <div className="flex justify-center items-center space-x-4 sm:space-x-8 mb-6 sm:mb-8">
            <img 
              src={moeysLogo} 
              alt={t('MoEYS Logo') || 'រូបសញ្ញាក្រសួងអប់រំ'} 
              className="h-16 sm:h-20 w-auto object-contain"
            />
            <div className="h-8 sm:h-12  w-px border border-gray-700"></div>
            <img 
              src={plpLogo} 
              alt={t('PLP Logo') || 'រូបសញ្ញា PLP'} 
              className="h-12 sm:h-16 w-auto object-contain"
            />
          </div>
          
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 mb-2">
              {t('schoolManagement', 'ប្រព័ន្ធគ្រប់គ្រងសាលារៀន')}
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              {t('signInToAccount', 'Sign in to your account')}
            </p>
          </div>
          
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  {t('usernameAndPhonenumber')}
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
                    className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-300 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
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
                    className="appearance-none relative block w-full pl-10 pr-12 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-300 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
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
            <div className="">
              <Button
                type="button"
                onClick={() => navigate('/schools/lookup')}
                variant="link"
                size="sm"
                fullWidth
                className="relative group mt-0"
              >
                {t('ស្វែងរកគណនីសម្រាប់គ្រូ', 'Search Teacher Account')}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Account Selection Modal */}
      <Modal
        isOpen={showAccountSelection}
        onClose={() => {
          setShowAccountSelection(false);
          setSelectedAccountId(null);
        }}
        title={t('selectAccount', 'Select Account')}
        size="full"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              onClick={() => {
                setShowAccountSelection(false);
                setSelectedAccountId(null);
              }}
              variant="outline"
              disabled={loading}
            >
              {t('cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleAccountSelection}
              variant="primary"
              disabled={!selectedAccountId || loading}
            >
              {loading ? t('signingIn', 'Signing in...') : t('signIn', 'Sign In')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('multipleAccountsMessage', 'Multiple accounts found. Please select one to continue.')}
          </p>

          <div className="space-y-2 grid grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto">
            {availableAccounts.map((account) => (
              <div
                key={account.id}
                onClick={() => setSelectedAccountId(account.id)}
                className={`
                  p-4 border rounded-sm cursor-pointer transition-all
                  ${selectedAccountId === account.id
                    ? 'border-blue-500'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Radio button indicator */}
                  <div className="flex-shrink-0 mt-1">
                    <div className={`
                      w-4 h-4 rounded-full border-2 flex items-center justify-center
                      ${selectedAccountId === account.id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                      }
                    `}>
                      {selectedAccountId === account.id && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>

                  {/* Account info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div>
                        <p className="font-semibold text-gray-900">
                        {getFullName(account)}
                      </p>
                        </div>
                      <div>
                        <Badge
                          color="blue"
                          variant="filled"
                          size="sm"
                        >
                          {account.roleKh || account.roleEn}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{t('username', 'Username')} {account.username}</p>
                    {account.email && (
                      <p className="text-sm text-gray-500 mt-1 truncate">{t('email', 'Email')} {account.email}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}