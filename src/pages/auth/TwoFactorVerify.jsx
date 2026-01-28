import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle, LogIn } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { api, utils } from '../../utils/api';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import minimalBg from '../../assets/minimal-bg.svg';

/**
 * TwoFactorVerify Component
 * Handles 2FA verification during login
 */
export default function TwoFactorVerify({ setUser }) {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const mfaToken = sessionStorage.getItem('mfa_token');

    if (!mfaToken) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (verificationCode.length !== 6) {
      const errorMessage = t('invalidCodeLength', 'Please enter a 6-digit code');
      setError(errorMessage);
      showError(errorMessage);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const mfaToken = sessionStorage.getItem('mfa_token');
      const response = await api.auth.authenticate2FA(mfaToken, verificationCode);
      if (response.success) {
        // Clear MFA data from session
        sessionStorage.removeItem('mfa_user');
        sessionStorage.removeItem('mfa_token');

        // authService.authenticate2FA already saves token and user data
        const freshUser = utils.user.getUserData();
        setUser(freshUser);

        showSuccess(t('loginSuccessful', 'Login successful!'));
      } else {
        const errorMessage = response.error || t('invalid2FACode', 'Invalid verification code');
        setError(errorMessage);
        showError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err.message || t('errorOccurred', 'An error occurred. Please try again.');
      setError(errorMessage);
      showError(errorMessage);
      console.error('2FA Verify Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    sessionStorage.removeItem('mfa_user');
    sessionStorage.removeItem('mfa_token');
    navigate('/login');
  };

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: `url(${minimalBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>

      <div className="flex-1 flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-sm shadow-lg border border-gray-200 p-6 sm:p-8 space-y-6 sm:space-y-8">

          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {t('2faVerification', '2FA Verification')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('faEnterCode', 'Enter the 6-digit code from your authenticator app.')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 text-center">
                {t('verificationCode', 'Verification Code')}
              </label>
              <input
                type="text"
                maxLength="6"
                className="block w-full px-4 py-3 border border-gray-300 rounded-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 text-center text-3xl tracking-[0.5em] font-mono transition-all duration-300 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                placeholder="000000"
                autoFocus
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
              />
              {error && (
                <div className="flex items-center justify-center gap-2 text-red-600 text-sm mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading || verificationCode.length !== 6}
                className="relative group h-12"
                size="sm"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <LogIn className="h-5 w-5 text-blue-300 group-hover:text-blue-200" />
                </span>
                {loading ? t('verifying', 'Verifying...') : t('verify', 'Verify')}
              </Button>
              
              <Button
                variant="link"
                size="sm"
                fullWidth
                onClick={handleBack}
                disabled={loading}
              >
                {t('backToLogin', 'Back to login')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
