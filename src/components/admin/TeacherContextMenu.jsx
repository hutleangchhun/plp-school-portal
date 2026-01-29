import React, { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Lock, Copy, Trash2, Ban, QrCode } from 'lucide-react';

const TeacherContextMenu = ({ children, teacher, onResetPassword, onDelete, onToggleActiveStatus, onDownloadQRCode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();

  const handleResetPassword = () => {
    onResetPassword(teacher);
  };

  const handleDownloadQRCode = () => {
    if (onDownloadQRCode) {
      onDownloadQRCode(teacher);
    }
  };

  const handleCopyUsername = () => {
    if (!teacher?.username) {
      console.warn('No username found');
      return;
    }

    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(teacher.username).then(
        () => {
          showSuccess(t('usernameCopied', 'Username copied to clipboard'), 2000);
        },
        (err) => {
          console.error('Clipboard API error:', err);
          fallbackCopyToClipboard(teacher.username);
        }
      );
    } else {
      // Fallback for older browsers
      fallbackCopyToClipboard(teacher.username);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(teacher);
    }
  };

  const handleToggleStatus = () => {
    if (onToggleActiveStatus) {
      onToggleActiveStatus(teacher);
    }
  };

  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);

    try {
      textArea.select();
      const successful = document.execCommand('copy');
      if (successful) {
        showSuccess(t('usernameCopied', 'Username copied to clipboard'), 2000);
      } else {
        throw new Error('Copy command was unsuccessful');
      }
    } catch (err) {
      console.error('Fallback copy error:', err);
      showError(t('failedToCopyUsername', 'Failed to copy username'), 2000);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        {children}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="p-2 bg-white border border-gray-200 rounded-sm shadow-lg z-50 overflow-hidden"
          sideOffset={5}
          align="end"
        >
          {/* Reset Password Option */}
          <DropdownMenu.Item
            onSelect={handleResetPassword}
            className="px-3 py-2.5 text-sm text-gray-700 cursor-pointer flex items-center space-x-2 hover:bg-blue-50 hover:text-blue-700 transition-colors focus:outline-none focus:bg-blue-50 rounded"
          >
            <Lock className="w-4 h-4" />
            <span>{t('resetPassword', 'Reset Password')}</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="bg-gray-200 h-px" />

          {/* Copy Username Option */}
          <DropdownMenu.Item
            onSelect={handleCopyUsername}
            className="px-3 py-2.5 text-sm text-gray-700 cursor-pointer flex items-center space-x-2 hover:bg-blue-50 hover:text-blue-700 transition-colors focus:outline-none focus:bg-blue-50 rounded"
          >
            <Copy className="w-4 h-4" />
            <span>{t('copyUsername', 'Copy Username')}</span>
          </DropdownMenu.Item>

          {onDownloadQRCode && (
            <>
              <DropdownMenu.Separator className="bg-gray-200 h-px" />

              {/* Download QR Code Option */}
              <DropdownMenu.Item
                onSelect={handleDownloadQRCode}
                className="px-3 py-2.5 text-sm text-gray-700 cursor-pointer flex items-center space-x-2 hover:bg-blue-50 hover:text-blue-700 transition-colors focus:outline-none focus:bg-blue-50 rounded"
              >
                <QrCode className="w-4 h-4" />
                <span>{t('downloadQRCode', 'Download QR Code')}</span>
              </DropdownMenu.Item>
            </>
          )}

          {onToggleActiveStatus && (
            <>
              <DropdownMenu.Separator className="bg-gray-200 h-px" />

              {/* Toggle Active Status Option */}
              <DropdownMenu.Item
                onSelect={handleToggleStatus}
                className="px-3 py-2.5 text-sm text-yellow-600 cursor-pointer flex items-center space-x-2 hover:bg-yellow-50 hover:text-yellow-700 transition-colors focus:outline-none focus:bg-yellow-50 rounded"
              >
                <Ban className="w-4 h-4" />
                <span>
                  {teacher?.isActive !== false
                    ? t('disableTeacher', 'Disable Teacher')
                    : t('enableTeacher', 'Enable Teacher')}
                </span>
              </DropdownMenu.Item>
            </>
          )}

          {onDelete && (
            <>
              <DropdownMenu.Separator className="bg-gray-200 h-px" />

              {/* Delete User Option */}
              <DropdownMenu.Item
                onSelect={handleDelete}
                className="px-3 py-2.5 text-sm text-red-600 cursor-pointer flex items-center space-x-2 hover:bg-red-50 hover:text-red-700 transition-colors focus:outline-none focus:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('deleteUser', 'Delete User')}</span>
              </DropdownMenu.Item>
            </>
          )}

        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default TeacherContextMenu;
