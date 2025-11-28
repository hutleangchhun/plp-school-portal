import React from 'react';
import { Info } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';

export default function LoginInfoDialog({ isOpen, onClose }) {
  const { t } = useLanguage();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('systemInformation', 'ព៌តមានប្រព័ន្ធ')}
      size="lg"
      height="md"
      rounded={true}
      showBorder={true}
      closeOnOverlayClick={true}
      footer={
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            variant="primary"
            size="sm"
          >
            {t('ok', 'យល់ព្រម')}
          </Button>
        </div>
      }
      stickyFooter={true}
    >
      <div className="space-y-4 text-sm text-gray-800">
        <div className="flex items-start space-x-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100">
            <Info className="h-5 w-5 text-blue-500" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              {t(
                'dailyUpdateNotice',
                'ប្រព័ន្ធនឹងធ្វើកំណែរទម្រង់រៀងរាល់ថ្ងៃ វេលាម៉ោង 11:00 យប់។'
              )}
            </p>
            <p className="mt-1">
              {t(
                'logoutInstruction',
                'សម្រាប់សុវត្ថិភាពគណនីរបស់អ្នក សូមចេញពីប្រព័ន្ធ (Logout) រាល់ពេលបញ្ចប់ការប្រើប្រាស់។'
              )}
            </p>
          </div>
        </div>

        <p className="font-medium">
          {t('hardRefreshTitle', 'វិធីសាស្ត្របន្តាប់ពីប្រព័ន្ធធ្វើកំណែរទម្រង់:')}
        </p>
        <div className="space-y-1 pl-1">
          <p>
            {t(
              'hardRefreshWindows',
              'Windows ៖ ចុច Ctrl + Shift + R (ឬ Ctrl + F5)'
            )}
          </p>
          <p>
            {t(
              'hardRefreshMac',
              'macOS ៖ ចុច Command (⌘) + Shift + R'
            )}
          </p>
          <p className="text-red-500 pt-2">
            <span className="font-bold">*</span>
            {" " + t(
              'clickToClose',
              'ចុច យល់ព្រម ដើម្បីបិទផ្ទាំងនេះ'
            )}
          </p>
        </div>
      </div>
    </Modal>
  );
}
