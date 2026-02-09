import { useState } from 'react';
import { Shield, Smartphone, CheckCircle2, AlertCircle, QrCode, ShieldOff } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { Button } from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { api, utils } from '../../../utils/api';

/**
 * TwoFactorTab Component
 * Handles 2FA setup and verification for users
 */
export default function TwoFactorTab({ user, setUser, t }) {
  const { showError, showSuccess } = useToast();
  const [step, setStep] = useState(user?.isTwoFactorEnabled ? 'enabled' : 'initial');
  const [qrCodeDataUri, setQrCodeDataUri] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [confirmError, setConfirmError] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user is admin (roleId = 1)
  const isAdmin = user?.roleId === 1;

  const handleGenerateQR = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.auth.generate2FA();
      if (response.success && response.data?.qrCodeDataUri) {
        setQrCodeDataUri(response.data.qrCodeDataUri);
        setStep('setup');
      } else {
        setError(response.error || t('failedToGenerateQR', 'Failed to generate QR code'));
      }
    } catch (err) {
      setError(t('errorOccurred', 'An error occurred. Please try again.'));
      console.error('2FA Generate Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async (e) => {
    e.preventDefault();
    if (verificationCode.length !== 6) {
      setError(t('invalidCodeLength', 'Please enter a 6-digit code'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.auth.enable2FA(verificationCode);
      if (response.success) {
        setStep('enabled');
        if (setUser) {
          // Use centralized utilities to ensure normalization and event dispatching
          const storedUser = utils.user.getUserData();
          const updatedUser = { ...storedUser, isTwoFactorEnabled: true };

          utils.user.saveUserData(updatedUser);
          setUser(updatedUser);
        }
        showSuccess(t('twoFAEnabledSuccess', 'Two-Factor Authentication enabled successfully'));
      } else {
        const errorMessage = response.error || t('invalid2FACode', 'Invalid verification code');
        setError(errorMessage);
        setConfirmError(errorMessage);
        showError(errorMessage);
        setShowConfirmDialog(true);
      }
    } catch (err) {
      setError(t('errorOccurred', 'An error occurred. Please try again.'));
      console.error('2FA Enable Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setLoading(true);
    try {
      const response = await api.auth.disable2FA();
      if (response.success) {
        setStep('initial');
        if (setUser) {
          const storedUser = utils.user.getUserData();
          const updatedUser = { ...storedUser, isTwoFactorEnabled: false };

          utils.user.saveUserData(updatedUser);
          setUser(updatedUser);
        }
        showSuccess(t('2faDisabledSuccess', 'Two-Factor Authentication disabled successfully'));
        setShowDisableDialog(false);
      } else {
        showError(response.error || t('failedToDisable2FA', 'Failed to disable 2FA'));
      }
    } catch (err) {
      showError(t('errorOccurred', 'An error occurred. Please try again.'));
      console.error('2FA Disable Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'enabled':
        return (
          <div className="flex flex-col items-center text-center py-8">
            <div className="bg-green-100 p-4 rounded-full mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {t('twoFAEnabled', 'Two-Factor Authentication is Enabled')}
            </h3>
            <p className="text-gray-600 max-w-md mb-6">
              {t('twoFAEnabledDescription', 'Your account is now more secure with an additional layer of protection.')}
            </p>

            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDisableDialog(true)}
              disabled={loading}
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              {t('disable2FA', 'Disable 2FA')}
            </Button>
          </div>
        );

      case 'setup':
        return (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              <div className="flex-shrink-0 bg-white p-4 border rounded-sm shadow-sm">
                {qrCodeDataUri ? (
                  <img src={qrCodeDataUri} alt="2FA QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded">
                    <QrCode className="h-12 w-12 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-600 font-bold rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-sm pt-1">1</div>
                  <p className="text-gray-700 text-sm">
                    {t('twoFAStep1', 'Scan the QR code with your authenticator app (e.g., Google Authenticator, Authy).')}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-600 font-bold rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 text-sm pt-1">2</div>
                  <p className="text-gray-700 text-sm">
                    {t('twoFAStep2', 'Enter the 6-digit code shown in your app to complete the setup.')}
                  </p>
                </div>

                <form onSubmit={handleVerifyAndEnable} className="pt-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('verificationCode', 'Verification Code')}
                    </label>
                    <input
                      type="text"
                      maxLength="6"
                      className="block w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-[0.5em] font-mono"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      disabled={loading}
                    />
                    {error && (
                      <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStep('initial')}
                      disabled={loading}
                    >
                      {t('cancel', 'Cancel')}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={loading || verificationCode.length !== 6}
                    >
                      {loading ? t('verifying', 'Verifying...') : t('verifyAndEnable', 'Verify and Enable')}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-sm border border-blue-100">
              <Shield className="h-10 w-10 text-blue-600" />
              <div>
                <h4 className="font-semibold text-blue-900">{t('secureYourAccount', 'Secure Your Account')}</h4>
                <p className="text-sm text-blue-700">
                  {t('twoFARecommendation', 'Two-factor authentication adds an extra layer of security to your account. In addition to your password, you will need to enter a code from your phone.')}
                </p>
              </div>
            </div>

            <div className="flex justify-start">
              {isAdmin ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleGenerateQR}
                  disabled={loading}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  {loading ? t('generating', 'Generating...') : t('setup2FA', 'Set up Two-Factor Authentication')}
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-sm border border-amber-200">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {t('2faAdminOnly', 'Two-Factor Authentication is currently available for Administrators only.')}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="mt-6 bg-white rounded-sm border border-gray-200 p-6 sm:p-8 w-full shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">
          {t('twoFactorAuthentication', 'Two-Factor Authentication (2FA)')}
        </h2>
        <p className="text-sm text-gray-600">
          {t('twoFASubTitle', 'Manage your account security with two-factor authentication.')}
        </p>
      </div>

      <div className="border-t border-gray-100 pt-6">
        {renderStep()}
      </div>

      {/* Verification Failed Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => setShowConfirmDialog(false)}
        title={t('verificationFailed', 'Verification Failed')}
        message={t('2faErrorMessage', 'The verification code you entered is incorrect or has expired. Please try again.')}
        type="danger"
        isAlert={true}
        confirmText={t('ok', 'OK')}
        loading={loading}
        error={confirmError}
      />

      {/* Disable Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDisableDialog}
        onClose={() => setShowDisableDialog(false)}
        onConfirm={handleDisable2FA}
        title={t('disable2FA', 'Disable 2FA?')}
        message={t('disable2FAConfirm', 'Are you sure you want to disable Two-Factor Authentication? Your account will be less secure.')}
        type="danger"
        confirmText={t('disable2FA', 'Disable')}
        cancelText={t('cancel', 'Cancel')}
        loading={loading}
      />
    </div>
  );
}
