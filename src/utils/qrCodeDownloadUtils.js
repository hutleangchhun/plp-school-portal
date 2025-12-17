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

    // Create and download ZIP file
    if (blobs.length > 0) {
      await createAndDownloadZip(blobs, cardType);
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
 * Create and download ZIP file containing all QR code cards
 * Uses native Blob API without external ZIP libraries
 * @param {Array} blobs - Array of {name, blob} objects
 * @param {String} cardType - 'student' or 'teacher'
 * @param {Function} t - Translation function
 */
async function createAndDownloadZip(blobs, cardType) {
  try {
    // Create ZIP file data using native Blob API
    const zipBlob = await createZipBlob(blobs);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const cardTypeLabel = cardType === 'teacher' ? 'Teachers' : 'Students';
    const fileName = `QR_Cards_${cardTypeLabel}_${timestamp}.zip`;

    // Download ZIP file
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    throw error;
  }
}

/**
 * Create a ZIP file blob from array of files
 * Implementation using native Blob API
 * @param {Array} files - Array of {name, blob} objects
 * @returns {Promise<Blob>} ZIP file blob
 */
async function createZipBlob(files) {
  // Simple ZIP file format implementation
  // ZIP structure: [local file headers + file data] + [central directory] + [end of central directory]

  const buffers = [];
  const centralDirectoryHeaders = [];
  let offset = 0;

  // Process each file
  for (const file of files) {
    const { name, blob } = file;
    const fileData = await blob.arrayBuffer();
    const fileBytes = new Uint8Array(fileData);

    // Create local file header
    const localHeader = createLocalFileHeader(name, fileBytes, offset);
    buffers.push(localHeader.buffer);
    offset += localHeader.buffer.byteLength;

    // Add file data
    buffers.push(fileData);
    offset += fileBytes.length;

    // Store central directory header info
    centralDirectoryHeaders.push({
      name,
      fileSize: fileBytes.length,
      headerOffset: localHeader.offset,
      headerLength: localHeader.buffer.byteLength,
      crc32: calculateCRC32(fileBytes)
    });
  }

  // Create central directory
  const centralDirectory = createCentralDirectory(centralDirectoryHeaders, offset);
  buffers.push(centralDirectory.buffer);

  // Create end of central directory record
  const endOfCentralDirectory = createEndOfCentralDirectory(
    centralDirectoryHeaders.length,
    centralDirectory.buffer.byteLength,
    offset
  );
  buffers.push(endOfCentralDirectory);

  // Combine all buffers into single ZIP blob
  return new Blob(buffers, { type: 'application/zip' });
}

/**
 * Create a local file header for ZIP entry
 * @param {String} fileName - Name of file in ZIP
 * @param {Uint8Array} fileData - File data
 * @param {Number} offset - Current offset in ZIP
 * @returns {Object} Header buffer and offset
 */
function createLocalFileHeader(fileName, fileData, offset) {
  // Local file header signature: 0x04034b50
  const version = 20; // Version needed to extract
  const flags = 0; // General purpose bit flag
  const compression = 0; // No compression (stored)
  const lastModTime = getZipTime(new Date());
  const lastModDate = getZipDate(new Date());
  const crc32 = calculateCRC32(fileData);
  const compressedSize = fileData.length;
  const uncompressedSize = fileData.length;
  const fileNameBytes = new TextEncoder().encode(fileName);
  const fileNameLength = fileNameBytes.length;
  const extraFieldLength = 0;

  const headerSize = 30 + fileNameLength + extraFieldLength;
  const header = new Uint8Array(headerSize);
  const view = new DataView(header.buffer);

  let pos = 0;

  // Signature
  view.setUint32(pos, 0x04034b50, true);
  pos += 4;

  // Version needed to extract
  view.setUint16(pos, version, true);
  pos += 2;

  // General purpose bit flag
  view.setUint16(pos, flags, true);
  pos += 2;

  // Compression method
  view.setUint16(pos, compression, true);
  pos += 2;

  // File modification time and date
  view.setUint16(pos, lastModTime, true);
  pos += 2;
  view.setUint16(pos, lastModDate, true);
  pos += 2;

  // CRC-32
  view.setUint32(pos, crc32, true);
  pos += 4;

  // Compressed size
  view.setUint32(pos, compressedSize, true);
  pos += 4;

  // Uncompressed size
  view.setUint32(pos, uncompressedSize, true);
  pos += 4;

  // File name length
  view.setUint16(pos, fileNameLength, true);
  pos += 2;

  // Extra field length
  view.setUint16(pos, extraFieldLength, true);
  pos += 2;

  // File name
  header.set(fileNameBytes, pos);

  return {
    buffer: header.buffer,
    offset: offset,
    crc32: crc32,
    compressedSize: compressedSize,
    uncompressedSize: uncompressedSize,
    fileName: fileName
  };
}

/**
 * Create central directory headers for ZIP file
 * @param {Array} files - Array of file header info
 * @param {Number} startOffset - Starting offset for central directory
 * @returns {Object} Central directory buffer
 */
function createCentralDirectory(files, startOffset) {
  const headers = [];

  for (const file of files) {
    const fileNameBytes = new TextEncoder().encode(file.name);
    const headerSize = 46 + fileNameBytes.length;
    const header = new Uint8Array(headerSize);
    const view = new DataView(header.buffer);

    let pos = 0;

    // Central file header signature
    view.setUint32(pos, 0x02014b50, true);
    pos += 4;

    // Version made by
    view.setUint16(pos, 0x0014, true); // Unix, version 2.0
    pos += 2;

    // Version needed to extract
    view.setUint16(pos, 20, true);
    pos += 2;

    // General purpose bit flag
    view.setUint16(pos, 0, true);
    pos += 2;

    // Compression method
    view.setUint16(pos, 0, true); // No compression
    pos += 2;

    // File modification time and date
    const lastModTime = getZipTime(new Date());
    const lastModDate = getZipDate(new Date());
    view.setUint16(pos, lastModTime, true);
    pos += 2;
    view.setUint16(pos, lastModDate, true);
    pos += 2;

    // CRC-32
    view.setUint32(pos, file.crc32, true);
    pos += 4;

    // Compressed size
    view.setUint32(pos, file.fileSize, true);
    pos += 4;

    // Uncompressed size
    view.setUint32(pos, file.fileSize, true);
    pos += 4;

    // File name length
    view.setUint16(pos, fileNameBytes.length, true);
    pos += 2;

    // Extra field length
    view.setUint16(pos, 0, true);
    pos += 2;

    // File comment length
    view.setUint16(pos, 0, true);
    pos += 2;

    // Disk number start
    view.setUint16(pos, 0, true);
    pos += 2;

    // Internal file attributes
    view.setUint16(pos, 0, true);
    pos += 2;

    // External file attributes
    view.setUint32(pos, 0, true);
    pos += 4;

    // Relative offset of local header
    view.setUint32(pos, file.headerOffset, true);
    pos += 4;

    // File name
    header.set(fileNameBytes, pos);

    headers.push(header);
  }

  // Combine all central directory headers
  const totalSize = headers.reduce((sum, h) => sum + h.length, 0);
  const combined = new Uint8Array(totalSize);
  let offset = 0;

  for (const header of headers) {
    combined.set(header, offset);
    offset += header.length;
  }

  return {
    buffer: combined.buffer,
    size: totalSize,
    startOffset: startOffset
  };
}

/**
 * Create end of central directory record for ZIP file
 * @param {Number} fileCount - Number of files in ZIP
 * @param {Number} centralDirSize - Size of central directory
 * @param {Number} centralDirOffset - Offset of central directory
 * @returns {Uint8Array} End of central directory record
 */
function createEndOfCentralDirectory(fileCount, centralDirSize, centralDirOffset) {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);

  let pos = 0;

  // End of central directory signature
  view.setUint32(pos, 0x06054b50, true);
  pos += 4;

  // Disk number
  view.setUint16(pos, 0, true);
  pos += 2;

  // Disk with central directory
  view.setUint16(pos, 0, true);
  pos += 2;

  // Number of entries on this disk
  view.setUint16(pos, fileCount, true);
  pos += 2;

  // Total number of entries
  view.setUint16(pos, fileCount, true);
  pos += 2;

  // Size of central directory
  view.setUint32(pos, centralDirSize, true);
  pos += 4;

  // Offset of central directory
  view.setUint32(pos, centralDirOffset, true);
  pos += 4;

  // Comment length
  view.setUint16(pos, 0, true);
  pos += 2;

  return record;
}

/**
 * Calculate CRC-32 checksum for file data
 * @param {Uint8Array} data - File data
 * @returns {Number} CRC-32 value
 */
function calculateCRC32(data) {
  const poly = 0xedb88320;
  let crc = 0xffffffff;

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? poly : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0; // Unsigned 32-bit integer
}

/**
 * Get DOS time format for current date
 * @param {Date} date - JavaScript Date object
 * @returns {Number} DOS time format
 */
function getZipTime(date) {
  return (
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    (date.getSeconds() >> 1)
  ) & 0xffff;
}

/**
 * Get DOS date format for current date
 * @param {Date} date - JavaScript Date object
 * @returns {Number} DOS date format
 */
function getZipDate(date) {
  return (
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate()
  ) & 0xffff;
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
    const cardsPerRow = 3;
    const cardWidth = (pageWidth - 20) / cardsPerRow; // 20mm for margins
    const totalCardsWidth = cardWidth * cardsPerRow;
    const leftMargin = (pageWidth - totalCardsWidth) / 2; // Center cards horizontally
    const margin = 10;
    const rowGap = 12; // Gap between rows

    let cardsInRow = 0;
    let rowsOnPage = 0;
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

        // Check if we need a new row or new page (2 rows per page)
        if (cardsInRow === 0 && rowsOnPage === 2) {
          // Add new page after 2 rows
          pdf.addPage();
          currentY = margin;
          rowsOnPage = 0;
          maxHeightInRow = 0;
        }

        // Check if current card fits in current row
        if (currentY + imgHeight > pageHeight - margin && cardsInRow > 0) {
          // Move to next row
          currentY += maxHeightInRow + rowGap;
          cardsInRow = 0;
          maxHeightInRow = 0;
          rowsOnPage++;
        }

        // Check if we need a new page (2 rows limit)
        if (cardsInRow === 0 && rowsOnPage === 2) {
          pdf.addPage();
          currentY = margin;
          rowsOnPage = 0;
          maxHeightInRow = 0;
        }

        // Calculate position (centered horizontally)
        const currentX = leftMargin + (cardsInRow * cardWidth);

        // Add image to PDF
        pdf.addImage(imgData, 'PNG', currentX, currentY, imgWidth, imgHeight);

        // Track max height in current row
        maxHeightInRow = Math.max(maxHeightInRow, imgHeight);

        cardsInRow++;
        if (cardsInRow >= cardsPerRow) {
          currentY += maxHeightInRow + rowGap;
          cardsInRow = 0;
          maxHeightInRow = 0;
          rowsOnPage++;
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
