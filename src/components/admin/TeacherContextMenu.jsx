import React from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Lock, Copy, Trash2 } from 'lucide-react';

const TeacherContextMenu = ({ children, teacher, onResetPassword, onDelete }) => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();

  const handleResetPassword = () => {
    onResetPassword(teacher);
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
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        {children}
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className="p-2 bg-white border border-gray-200 rounded-sm border border-gray-200 shadow-lg z-50 overflow-hidden"
          sideOffset={5}
        >
          {/* Reset Password Option */}
          <ContextMenu.Item
            onSelect={handleResetPassword}
            className="px-3 py-2.5 text-sm text-gray-700 cursor-pointer flex items-center space-x-2 hover:bg-blue-50 hover:text-blue-700 transition-colors focus:outline-none focus:bg-blue-50"
          >
            <Lock className="w-4 h-4" />
            <span>{t('resetPassword', 'Reset Password')}</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className="bg-gray-200 h-px" />

          {/* Copy Username Option */}
          <ContextMenu.Item
            onSelect={handleCopyUsername}
            className="px-3 py-2.5 text-sm text-gray-700 cursor-pointer flex items-center space-x-2 hover:bg-blue-50 hover:text-blue-700 transition-colors focus:outline-none focus:bg-blue-50"
          >
            <Copy className="w-4 h-4" />
            <span>{t('copyUsername', 'Copy Username')}</span>
          </ContextMenu.Item>

          {onDelete && (
            <>
              <ContextMenu.Separator className="bg-gray-200 h-px" />

              {/* Delete User Option */}
              <ContextMenu.Item
                onSelect={handleDelete}
                className="px-3 py-2.5 text-sm text-red-600 cursor-pointer flex items-center space-x-2 hover:bg-red-50 hover:text-red-700 transition-colors focus:outline-none focus:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('deleteUser', 'Delete User')}</span>
              </ContextMenu.Item>
            </>
          )}

        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

export default TeacherContextMenu;
