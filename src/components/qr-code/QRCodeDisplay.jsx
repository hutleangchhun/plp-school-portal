import React, { memo } from 'react';
import { Button } from '../../components/ui/Button';
import { Download, Loader } from 'lucide-react';

function QRCodeDisplay({ loading, qrCodes, viewMode, downloadQRCode, cardRefsRef, t }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader className="h-6 w-6 animate-spin text-blue-600 mb-2" />
        <p className="text-blue-600 text-sm">{t('loadingStudents', 'Loading students...')}</p>
      </div>
    );
  }

  if (!qrCodes?.length) {
    return (
      <div className="py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg">
        {t('noQRCodes', 'No QR codes available for the selected filter')}
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t('generatedQRCodes', 'Generated QR Codes')} ({qrCodes.length})
      </h2>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {qrCodes.map((qrCode, index) => (
            <div
              key={qrCode.userId || index}
              ref={(el) => {
                if (el) cardRefsRef.current[qrCode.userId] = el;
              }}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-center mb-3">
                <img
                  src={qrCode.qrCode}
                  alt={`QR Code for ${qrCode.name}`}
                  className="w-40 h-40 border border-gray-300 rounded"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900 truncate">{qrCode.name}</p>
                <p className="text-xs text-gray-500">{qrCode.username}</p>
                <Button
                  onClick={() => downloadQRCode(qrCode, cardRefsRef.current[qrCode.userId])}
                  variant="primary"
                  size="sm"
                  className="w-full mt-3 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t('download', 'Download')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {t('name', 'Name')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {t('username', 'Username')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {t('studentNumber', 'Student Number')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {t('email', 'Email')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  {t('actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {qrCodes.map((qrCode, index) => (
                <tr key={qrCode.userId || index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{qrCode.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{qrCode.username}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{qrCode.studentNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{qrCode.email}</td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      onClick={() => downloadQRCode(qrCode)}
                      variant="ghost"
                      size="icon"
                      title={t('download', 'Download')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default memo(QRCodeDisplay);
