import { Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

/**
 * ResetPasswordTab Component
 * Handles password change functionality with strength indicator
 */
export default function ResetPasswordTab({
  newPasswordInput,
  setNewPasswordInput,
  confirmNewPasswordInput,
  setConfirmNewPasswordInput,
  showNewPasswordTab,
  setShowNewPasswordTab,
  changePasswordLoading,
  handleChangePasswordSubmit,
  getPasswordStrength,
  t
}) {
  return (
    <div className="mt-6 bg-white rounded-md border border-gray-200 p-6 sm:p-8 w-full shadow-sm">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
        {t('resetPassword', 'Change password')}
      </h2>
      <p className="text-sm text-gray-600 mb-6 max-w-3xl">
        {t('changePasswordDescription', 'Update your account password. Make sure to use a strong password that you can remember.')}
      </p>

      <form onSubmit={handleChangePasswordSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('newPassword', 'New password')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <Lock className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type={showNewPasswordTab ? 'text' : 'password'}
              className="mt-1 block w-full pl-10 pr-10 rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              placeholder={t('enterNewPassword', 'Enter new password')}
            />
            <button
              type="button"
              onClick={() => setShowNewPasswordTab(!showNewPasswordTab)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-10"
              tabIndex="-1"
            >
              {showNewPasswordTab ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {newPasswordInput && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">{t('passwordStrength', 'Password Strength')}</span>
                <span className={`text-xs font-medium ${getPasswordStrength(newPasswordInput).color.replace('bg-', 'text-')}`}>
                  {getPasswordStrength(newPasswordInput).label}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${getPasswordStrength(newPasswordInput).color}`}
                  style={{ width: `${Math.min((newPasswordInput.length / 8) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('confirmNewPassword', 'Confirm new password')}
          </label>
          <input
            type="password"
            className="mt-1 block w-full rounded-md shadow-sm text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            value={confirmNewPasswordInput}
            onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
            placeholder={t('confirmNewPasswordPlaceholder', 'Re-enter new password')}
          />
        </div>

        <div className="col-span-1 md:col-span-2 pt-2 flex justify-start">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={changePasswordLoading}
          >
            {changePasswordLoading ? t('updating', 'Updating...') : t('resetPassword', 'Change password')}
          </Button>
        </div>
      </form>
    </div>
  );
}
