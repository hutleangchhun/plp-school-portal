import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';

const TelegramFloatingButton = () => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <a
        href="https://t.me/plp_sms_moeys_gov_kh"
        target="_blank"
        rel="noopener noreferrer"
        className="h-14 w-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title="Open Telegram Channel"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-3 bg-gray-900 text-white px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium shadow-lg z-50">
          ក្រុមតេលេក្រាម​ ប្រព័ន្ធព័ត៌មានអ្នកប្រើប្រាស់
          <div className="absolute top-full right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
};

export default TelegramFloatingButton;
