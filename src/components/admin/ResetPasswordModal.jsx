import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useLoading } from '../../contexts/LoadingContext';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../../utils/api';
import { getFullName } from '../../utils/usernameUtils';

const ResetPasswordModal = ({ isOpen, onClose, teacher }) => {
  const { t } = useLanguage();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError } = useErrorHandler();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Password validation functions (same as TeacherEditModal)
  const isPasswordInvalid = () => {
    const password = newPassword;
    if (!password) return false;
    if (password.length < 8) return true;
    // Reject if contains non-English characters (only accept ASCII)
    const hasNonEnglish = /[^\x00-\x7F]/.test(password);
    return hasNonEnglish;
  };

  const getPasswordStrength = (password) => {
    if (!password) return { level: 0, label: '', color: 'bg-gray-300' };

    let strength = 0;

    // Length check
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (password.length >= 16) strength++;

    // Has lowercase
    if (/[a-z]/.test(password)) strength++;

    // Has uppercase
    if (/[A-Z]/.test(password)) strength++;

    // Has numbers
    if (/[0-9]/.test(password)) strength++;

    // Has special characters
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\\|,.<>\/?]/.test(password)) strength++;

    if (strength <= 2) {
      return { level: 1, label: t('weakPassword', 'Weak'), color: 'bg-red-500' };
    } else if (strength <= 4) {
      return { level: 2, label: t('mediumPassword', 'Medium'), color: 'bg-orange-500' };
    } else {
      return { level: 3, label: t('strongPassword', 'Strong'), color: 'bg-green-500' };
    }
  };

  // Validation
  const isPasswordValid = !isPasswordInvalid() && newPassword.length >= 8;
  const isPasswordMatch = newPassword === confirmPassword && newPassword.length > 0;
  const canSubmit = isPasswordValid && isPasswordMatch && !isResetting;
  const passwordStrength = getPasswordStrength(newPassword);

  const handleResetPassword = async () => {
    if (!canSubmit || !teacher?.userId) {
      handleError(new Error('Invalid form state'));
      return;
    }

    try {
      setIsResetting(true);
      clearError();
      startLoading('resetPassword', t('resettingPassword', 'Resetting password...'));

      const response = await api.admin.resetTeacherPassword(teacher.userId, newPassword);

      if (response.success) {
        setSuccessMessage(
          t('passwordResetSuccess', `Password has been reset successfully`)
        );

        // Clear form
        setNewPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);

        // Close modal after 2 seconds
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 2000);
      } else {
        handleError(new Error(response.error || t('passwordResetFailed', 'Failed to reset password')));
      }
    } catch (err) {
      handleError(err, {
        toastMessage: t('passwordResetFailed', 'Failed to reset password'),
      });
    } finally {
      stopLoading('resetPassword');
      setIsResetting(false);
    }
  };

  const handleClose = () => {
    if (!isResetting) {
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setSuccessMessage('');
      clearError();
      onClose();
    }
  };

  if (!teacher) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('resetPassword', 'Reset Password')}
      size="2xl"
      height='2xl'
      closeOnOverlayClick={!isResetting}
      showCloseButton={!isResetting}
      footer={
        <div className="flex items-center justify-end space-x-3 w-full">
          <Button
            type="button"
            variant="outline"
            disabled={isResetting}
            onClick={handleClose}
            size="sm"
          >
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!canSubmit}
            onClick={handleResetPassword}
            size="sm"
          >
            {isResetting
              ? t('resettingPassword', 'Resetting...')
              : t('resetPassword', 'Reset Password')}
          </Button>
        </div>
      }
      stickyFooter={true}
    >
      <div className="space-y-6">
        {/* Teacher Info */}
        <div className="">
          <p className="text-sm text-gray-600">
            {t('resettingPasswordFor', 'Resetting password for')}:
          </p>
          <p className="text-base font-semibold text-gray-900 mt-1">
            {getFullName(teacher)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {teacher.username}
          </p>
        </div>
        <hr />

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">{t('error', 'Error')}</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Password Fields */}
        {!successMessage && (
          <div className="space-x-4 space-y-4 flex justify-center items-center">
            <div className='space-y-4'>
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('newPassword', 'New Password')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('enterNewPassword', 'Enter new password')}
                    disabled={isResetting}
                    className={`w-full px-4 py-2.5 text-sm pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors ${newPassword && isPasswordInvalid()
                        ? 'border-red-500 focus:ring-red-500'
                        : newPassword && isPasswordValid
                          ? 'border-green-500 focus:ring-green-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isResetting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && isPasswordInvalid() && (
                  <p className="text-xs text-red-600 mt-1">
                    {newPassword.length < 8
                      ? t('passwordMinLength', 'Password must be at least 8 characters')
                      : t('passwordNonEnglish', 'Password must contain only English characters')}
                  </p>
                )}
                {newPassword && isPasswordValid && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {t('passwordValid', 'Password is valid')}
                  </p>
                )}

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{t('passwordStrength', 'Password Strength')}:</span>
                      <span className={`text-xs font-semibold ${passwordStrength.color.replace('bg-', 'text-')}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.level / 3) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('confirmPassword', 'Confirm Password')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('confirmNewPassword', 'Confirm new password')}
                    disabled={isResetting}
                    className={`w-full px-4 py-2.5 text-sm pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors ${confirmPassword && !isPasswordMatch
                        ? 'border-red-500 focus:ring-red-500'
                        : confirmPassword && isPasswordMatch
                          ? 'border-green-500 focus:ring-green-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isResetting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && !isPasswordMatch && (
                  <p className="text-xs text-red-600 mt-1">
                    ✕ {t('passwordsDoNotMatch', 'Passwords do not match')}
                  </p>
                )}
                {confirmPassword && isPasswordMatch && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {t('passwordsMatch', 'Passwords match')}
                  </p>
                )}
              </div>
            </div>

            {/* Password Requirements Checklist */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                {t('passwordRequirements', 'Password Requirements')}:
              </p>
              <ul className="space-y-2">
                <li className={`flex items-center space-x-2 text-sm transition-colors ${newPassword.length >= 8 ? 'text-green-600' : 'text-gray-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full transition-colors ${newPassword.length >= 8 ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                  <span>{t('minChars8', 'Minimum 8 characters')}</span>
                </li>
                <li className={`flex items-center space-x-2 text-sm transition-colors ${/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full transition-colors ${/[a-z]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                  <span>{t('lowercase', 'At least one lowercase letter')}</span>
                </li>
                <li className={`flex items-center space-x-2 text-sm transition-colors ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full transition-colors ${/[A-Z]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                  <span>{t('uppercase', 'At least one uppercase letter')}</span>
                </li>
                <li className={`flex items-center space-x-2 text-sm transition-colors ${/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-gray-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full transition-colors ${/[0-9]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                  <span>{t('number', 'At least one number')}</span>
                </li>
                <li className={`flex items-center space-x-2 text-sm transition-colors ${/[!@#$%^&*()_+\-=\[\]{};':"\\\|,.<>\/?]/.test(newPassword) ? 'text-green-600' : 'text-gray-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full transition-colors ${/[!@#$%^&*()_+\-=\[\]{};':"\\\|,.<>\/?]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                  <span>{t('special', 'At least one special character')}</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ResetPasswordModal;
