import React, { memo } from 'react';
import { Button } from '../../components/ui/Button';
import { Download, Loader, CheckSquare, Square } from 'lucide-react';
import { formatClassIdentifier } from '../../utils/helpers';
import AuthenticatedImage from './AuthenticatedImage';

function QRCodeDisplay({ loading, qrCodes, viewMode, downloadQRCode, cardRefsRef, t, selectedItems = [], onToggleSelection, onToggleAll, cardType = 'student' }) {
  // Color scheme based on card type
  const colorScheme = cardType === 'teacher' ? {
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    accent: 'text-blue-600',
    topBar: 'from-blue-700 to-blue-500',
    header: 'bg-blue-100'
  } : {
    border: 'border-cyan-300',
    bg: 'bg-cyan-50',
    accent: 'text-cyan-600',
    topBar: 'from-teal-700 to-cyan-500',
    header: 'bg-cyan-100'
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader className={`h-6 w-6 animate-spin ${colorScheme.accent} mb-2`} />
        <p className={`${colorScheme.accent} text-sm`}>{t('loadingStudents', 'Loading students...')}</p>
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

  const itemsWithoutQR = qrCodes.filter(qr => !qr.hasQrCode);
  const hasSelectableItems = itemsWithoutQR.length > 0;
  const allSelected = hasSelectableItems && selectedItems.length === itemsWithoutQR.length;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('generatedQRCodes', 'Generated QR Codes')}<span className='text-sm'> ({qrCodes.length})</span>
          {selectedItems.length > 0 && (
            <span className="ml-2 text-sm text-blue-600">({selectedItems.length} {t('selected', 'selected')})</span>
          )}
        </h2>
        {hasSelectableItems && onToggleAll && (
          <Button
            onClick={onToggleAll}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            {allSelected ? t('deselectAll', 'Deselect All') : t('selectAll', 'Select All')}
          </Button>
        )}
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {qrCodes.map((qrCode, index) => {
            const isSelected = selectedItems.includes(qrCode.userId);
            const canSelect = !qrCode.hasQrCode && onToggleSelection;

            return (
              <div
                key={qrCode.userId || index}
                ref={(el) => {
                  if (el) cardRefsRef.current[qrCode.userId] = el;
                }}
                onClick={() => canSelect && onToggleSelection(qrCode.userId)}
                className={`relative overflow-hidden rounded-lg border-2 transition-all ${canSelect ? 'cursor-pointer hover:shadow-md' : ''
                  } ${isSelected ? `${colorScheme.border} ${colorScheme.bg}` : 'border-gray-200 bg-white'
                  }`}
              >
                {/* Top decorative bar matching download card */}
                <div className={`h-2 bg-gradient-to-r ${colorScheme.topBar}`}></div>

                {canSelect && (
                  <div className="absolute top-2 right-2">
                    {isSelected ? (
                      <CheckSquare className={`h-5 w-5 ${colorScheme.accent}`} />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-center mb-3 relative">
                    {qrCode.qrCode ? (
                      <AuthenticatedImage
                        src={`/api/files/${qrCode.qrCode}`}
                        alt={`QR Code for ${qrCode.name}`}
                        className="w-40 h-40 border border-gray-300 rounded"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : (
                      <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50">
                        <p className="text-xs text-gray-400 text-center px-2">{t('noQRCode', 'No QR Code')}</p>
                      </div>
                    )}
                    {qrCode.qrCode && (
                      <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded items-center justify-center bg-gray-50 hidden" style={{ display: 'none' }}>
                        <p className="text-xs text-gray-400 text-center px-2">{t('failedToLoadQR', 'Failed to load QR Code')}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{t('name', 'Name')}: {qrCode.name}</p>
                    <p className="text-xs text-gray-500">{t('username', 'Username')}: {qrCode.username}</p>
                    {qrCode.schoolName && (
                      <p className="text-xs text-gray-500">{t('school', 'School')}: {qrCode.schoolName}</p>
                    )}
                    {qrCode.class?.gradeLevel || qrCode.className ? (
                      <p className="text-xs text-gray-500">{t('class', 'Class')}: {qrCode.class?.gradeLevel ? formatClassIdentifier(qrCode.class.gradeLevel === 0 || qrCode.class.gradeLevel === '0' ? t('grade0', 'Kindergarten') : qrCode.class.gradeLevel, qrCode.class.section) : qrCode.className}</p>
                    ) : null}
                    {qrCode.qrCode && (
                      <Button
                        onClick={() => downloadQRCode(qrCode, cardRefsRef.current[qrCode.userId], cardType)}
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 flex items-center gap-1"
                      >
                        <Download className="h-4 w-4" />
                        {t('download', 'Download')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
                  {t('school', 'School')}
                </th>
                {qrCodes[0]?.className && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    {t('class', 'Class')}
                  </th>
                )}
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  {t('actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {qrCodes.map((qrCode, index) => {
                const isSelected = selectedItems.includes(qrCode.userId);
                const canSelect = !qrCode.hasQrCode && onToggleSelection;

                return (
                  <tr
                    key={qrCode.userId || index}
                    onClick={() => canSelect && onToggleSelection(qrCode.userId)}
                    className={`${canSelect ? 'cursor-pointer' : ''
                      } ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        {canSelect && (
                          isSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )
                        )}
                        {qrCode.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{qrCode.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{qrCode.schoolName || '-'}</td>
                    {qrCodes[0]?.className || qrCodes[0]?.class?.gradeLevel ? (
                      <td className="px-4 py-3 text-sm text-gray-600">{qrCode.class?.gradeLevel ? formatClassIdentifier(qrCode.class.gradeLevel === 0 || qrCode.class.gradeLevel === '0' ? t('grade0', 'Kindergarten') : qrCode.class.gradeLevel, qrCode.class.section) : qrCode.className || '-'}</td>
                    ) : null}
                    <td className="px-4 py-3 text-center">
                      {qrCode.qrCode ? (
                        <Button
                          onClick={() => downloadQRCode(qrCode, null, cardType)}
                          variant="ghost"
                          size="icon"
                          title={t('download', 'Download')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400">{t('noQRCode', 'No QR')}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default memo(QRCodeDisplay);
