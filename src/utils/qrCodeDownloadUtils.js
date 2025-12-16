import { createQRCodeDownloadCard } from '../components/qr-code/QRCodeDownloadCard';

/**
 * Download QR codes sequentially as individual PNG files (Option 2)
 * Processes all QR code cards and downloads them with sequential delays
 * @param {Array} qrCodes - Array of QR code objects
 * @param {String} cardType - 'student' or 'teacher'
 * @param {Function} t - Translation function
 * @param {Function} onProgress - Callback for progress updates (index, total)
 * @param {Function} showSuccess - Toast success callback
 * @param {Function} showError - Toast error callback
 */
export const downloadQRCodesQueued = async (qrCodes, cardType, t, onProgress, showSuccess, showError) => {
  if (!qrCodes || qrCodes.length === 0) {
    showError(t('noQRCodes', 'No QR codes to download'));
    return;
  }

  const total = qrCodes.length;
  let processed = 0;
  let failed = 0;

  try {
    const { default: html2canvas } = await import('html2canvas');

    // Collect all blobs
    const blobs = [];

    for (let i = 0; i < qrCodes.length; i++) {
      const qrCode = qrCodes[i];

      try {
        const element = createQRCodeDownloadCard(qrCode, cardType, t);
        document.body.appendChild(element);

        // Wait for images to load
        await new Promise(resolve => setTimeout(resolve, 300));

        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          allowTaint: true,
          useCORS: true
        });

        document.body.removeChild(element);

        // Convert canvas to blob
        await new Promise((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) {
              blobs.push({
                name: `${qrCode.name}_QR_Card.png`,
                blob
              });
            }
            processed++;
            onProgress(processed, total);
            resolve();
          });
        });

        // Add delay between processing to avoid overwhelming the browser
        if (i < qrCodes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (err) {
        console.warn(`Failed to process QR code for ${qrCode.name}:`, err);
        failed++;
        processed++;
        onProgress(processed, total);
      }
    }

    // Download all blobs sequentially
    if (blobs.length > 0) {
      downloadBlobsSequentially(blobs);
    }

    if (processed > 0) {
      showSuccess(t('downloadedQRCodes', `Downloaded ${processed - failed}/${total} QR codes`));
    }
    if (failed > 0) {
      showError(t('failedQRCodes', `Failed to process ${failed} QR codes`));
    }
  } catch (error) {
    console.error('Error in batch download:', error);
    showError(t('batchDownloadError', 'Error downloading QR codes'));
  }
};

/**
 * Helper function to download multiple blobs sequentially
 * @param {Array} blobs - Array of {name, blob} objects
 */
function downloadBlobsSequentially(blobs) {
  blobs.forEach((item, index) => {
    setTimeout(() => {
      const url = URL.createObjectURL(item.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, index * 300); // 300ms delay between each download
  });
}

/**
 * Download QR codes as PDF (Option 3)
 * @param {Array} qrCodes - Array of QR code objects
 * @param {String} cardType - 'student' or 'teacher'
 * @param {Function} t - Translation function
 * @param {Function} showSuccess - Toast success callback
 * @param {Function} showError - Toast error callback
 * @param {String} className - Class name for PDF filename
 */
export const downloadQRCodesAsPDF = async (qrCodes, cardType, t, showSuccess, showError, className = 'QR_Codes') => {
  if (!qrCodes || qrCodes.length === 0) {
    showError(t('noQRCodes', 'No QR codes to download'));
    return;
  }

  try {
    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');

    // Create PDF with custom dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const cardsPerRow = 2;
    const cardWidth = (pageWidth - 30) / cardsPerRow; // 30mm for margins
    const totalCardsWidth = cardWidth * cardsPerRow;
    const leftMargin = (pageWidth - totalCardsWidth) / 2; // Center cards horizontally
    const margin = 10;
    const rowGap = 8; // Gap between rows

    let cardsInRow = 0;
    let currentY = margin;
    let maxHeightInRow = 0;

    for (let i = 0; i < qrCodes.length; i++) {
      const qrCode = qrCodes[i];

      try {
        // Create card element
        const element = createQRCodeDownloadCard(qrCode, cardType, t);
        document.body.appendChild(element);

        // Wait for images to load
        await new Promise(resolve => setTimeout(resolve, 300));

        // Convert to canvas
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          allowTaint: true,
          useCORS: true
        });

        document.body.removeChild(element);

        // Convert canvas to image
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = cardWidth - 4; // 2mm padding on each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Calculate position (centered horizontally)
        const currentX = leftMargin + (cardsInRow * cardWidth);

        // Check if we need a new page or new row
        if (currentY + imgHeight > pageHeight - margin) {
          // Check if it's just overflow in current row
          if (cardsInRow > 0 && cardsInRow < cardsPerRow) {
            // Move to next row first
            currentY += maxHeightInRow + rowGap;
            cardsInRow = 0;
            maxHeightInRow = 0;
          }

          // If still doesn't fit, add new page
          if (currentY + imgHeight > pageHeight - margin) {
            pdf.addPage();
            currentY = margin;
            cardsInRow = 0;
            maxHeightInRow = 0;
          }
        }

        // Add image to PDF
        pdf.addImage(imgData, 'PNG', currentX, currentY, imgWidth, imgHeight);

        // Track max height in current row
        maxHeightInRow = Math.max(maxHeightInRow, imgHeight);

        cardsInRow++;
        if (cardsInRow >= cardsPerRow) {
          currentY += maxHeightInRow + rowGap;
          cardsInRow = 0;
          maxHeightInRow = 0;
        }
      } catch (err) {
        console.warn(`Failed to add ${qrCode.name} to PDF:`, err);
      }
    }

    // Save PDF
    const fileName = `${className}.pdf`;
    pdf.save(fileName);
    showSuccess(t('pdfDownloadSuccess', `PDF downloaded with ${qrCodes.length} QR codes`));
  } catch (error) {
    console.error('Error generating PDF:', error);
    showError(t('pdfDownloadError', 'Error downloading PDF'));
  }
};

/**
 * Download single QR code as image
 * @param {Object} qrCode - QR code object
 * @param {String} cardType - 'student' or 'teacher'
 * @param {Function} t - Translation function
 * @param {Function} showError - Toast error callback
 */
export const downloadSingleQRCode = async (qrCode, cardType, t, showError) => {
  try {
    const { default: html2canvas } = await import('html2canvas');
    const { createQRCodeDownloadCard } = await import('../components/qr-code/QRCodeDownloadCard');

    const element = createQRCodeDownloadCard(qrCode, cardType, t);
    document.body.appendChild(element);

    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      allowTaint: true,
      useCORS: true
    });

    document.body.removeChild(element);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${qrCode.name}_QR_Card.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch (error) {
    console.error('Error downloading QR code:', error);
    showError(t('downloadError', 'Error downloading QR code'));
  }
};
