import { createQRCodeDownloadCard } from "../components/qr-code/QRCodeDownloadCard";

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
export const downloadQRCodesQueued = async (
  qrCodes,
  cardType,
  t,
  onProgress,
  showSuccess,
  showError
) => {
  if (!qrCodes || qrCodes.length === 0) {
    showError(t("noQRCodes", "No QR codes to download"));
    return;
  }

  const total = qrCodes.length;
  let processed = 0;
  let failed = 0;

  try {
    const { default: html2canvas } = await import("html2canvas");

    // Collect all blobs
    const blobs = [];

    // Process in smaller batches to avoid memory issues
    const BATCH_SIZE = 10;
    const batches = [];
    for (let i = 0; i < qrCodes.length; i += BATCH_SIZE) {
      batches.push(qrCodes.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      // Process batch items sequentially but clear memory between batches
      for (const qrCode of batch) {
        try {
          const element = createQRCodeDownloadCard(qrCode, cardType, t);
          document.body.appendChild(element);

          // Wait for images to load
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Use more reasonable quality settings to prevent memory issues
          const canvas = await html2canvas(element, {
            backgroundColor: "#ffffff",
            scale: 4, // Reduced from 8 to 4 for better performance (400px * 4 = 1600px)
            logging: false,
            allowTaint: true,
            useCORS: true,
            imageTimeout: 5000,
            windowHeight: element.scrollHeight * 4,
            windowWidth: element.scrollWidth * 4,
          });

          document.body.removeChild(element);

          // Convert canvas to blob with high quality
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          await new Promise((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) {
                blobs.push({
                  name: `${qrCode.name}_QR_Card.png`,
                  blob,
                });
              }
              processed++;
              onProgress(processed, total);
              resolve();
            }, 'image/png', 0.95); // Slightly reduced quality for better file size
          });

          // Clear canvas to free memory
          canvas.width = 0;
          canvas.height = 0;

          // Shorter delay between items
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (err) {
          console.warn(`Failed to process QR code for ${qrCode.name}:`, err);
          failed++;
          processed++;
          onProgress(processed, total);
        }
      }

      // Force garbage collection between batches by adding a small delay
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Create and download ZIP file
    if (blobs.length > 0) {
      await createAndDownloadZip(blobs, cardType);
    }

    if (processed > 0) {
      showSuccess(
        t(
          "downloadedQRCodes",
          `Downloaded ${processed - failed}/${total} QR codes`
        )
      );
    }
    if (failed > 0) {
      showError(t("failedQRCodes", `Failed to process ${failed} QR codes`));
    }
  } catch (error) {
    console.error("Error in batch download:", error);
    showError(t("batchDownloadError", "Error downloading QR codes"));
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

    // Generate filename with date
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
    const cardTypeLabel = cardType === "teacher" ? "Teachers" : "Students";
    const fileName = `QR_Cards_${cardTypeLabel}_${today}.zip`;

    // Download ZIP file
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error creating ZIP file:", error);
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
      crc32: calculateCRC32(fileBytes),
    });
  }

  // Create central directory
  const centralDirectory = createCentralDirectory(
    centralDirectoryHeaders,
    offset
  );
  buffers.push(centralDirectory.buffer);

  // Create end of central directory record
  const endOfCentralDirectory = createEndOfCentralDirectory(
    centralDirectoryHeaders.length,
    centralDirectory.buffer.byteLength,
    offset
  );
  buffers.push(endOfCentralDirectory);

  // Combine all buffers into single ZIP blob
  return new Blob(buffers, { type: "application/zip" });
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
    fileName: fileName,
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
    startOffset: startOffset,
  };
}

/**
 * Create end of central directory record for ZIP file
 * @param {Number} fileCount - Number of files in ZIP
 * @param {Number} centralDirSize - Size of central directory
 * @param {Number} centralDirOffset - Offset of central directory
 * @returns {Uint8Array} End of central directory record
 */
function createEndOfCentralDirectory(
  fileCount,
  centralDirSize,
  centralDirOffset
) {
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
      crc = (crc >>> 1) ^ (crc & 1 ? poly : 0);
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
    ((date.getHours() << 11) |
      (date.getMinutes() << 5) |
      (date.getSeconds() >> 1)) &
    0xffff
  );
}

/**
 * Get DOS date format for current date
 * @param {Date} date - JavaScript Date object
 * @returns {Number} DOS date format
 */
function getZipDate(date) {
  return (
    (((date.getFullYear() - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate()) &
    0xffff
  );
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
export const downloadQRCodesAsPDF = async (
  qrCodes,
  cardType,
  t,
  showSuccess,
  showError,
  className = "QR_Codes"
) => {
  if (!qrCodes || qrCodes.length === 0) {
    showError(t("noQRCodes", "No QR codes to download"));
    return;
  }

  try {
    const { default: html2canvas } = await import("html2canvas");
    const { jsPDF } = await import("jspdf");

    // For large batches, split into multiple PDFs
    const MAX_CARDS_PER_PDF = 50;
    const needsMultiplePDFs = qrCodes.length > MAX_CARDS_PER_PDF;

    if (needsMultiplePDFs) {
      // Process in chunks
      const chunks = [];
      for (let i = 0; i < qrCodes.length; i += MAX_CARDS_PER_PDF) {
        chunks.push(qrCodes.slice(i, i + MAX_CARDS_PER_PDF));
      }

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        await generatePDFForChunk(
          chunks[chunkIndex],
          cardType,
          t,
          html2canvas,
          jsPDF,
          className,
          chunkIndex + 1,
          chunks.length
        );
      }

      showSuccess(
        t("pdfDownloadSuccess", `Downloaded ${chunks.length} PDF files with ${qrCodes.length} QR codes total`)
      );
    } else {
      // Single PDF for smaller batches
      await generatePDFForChunk(
        qrCodes,
        cardType,
        t,
        html2canvas,
        jsPDF,
        className
      );

      showSuccess(
        t("pdfDownloadSuccess", `PDF downloaded with ${qrCodes.length} QR codes`)
      );
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    showError(t("pdfDownloadError", "Error downloading PDF"));
  }
};

/**
 * Generate a single PDF file for a chunk of QR codes
 * @private
 */
async function generatePDFForChunk(
  qrCodes,
  cardType,
  t,
  html2canvas,
  jsPDF,
  className,
  chunkNumber = null,
  totalChunks = null
) {
  // Create PDF with custom dimensions
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true, // Enable compression
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const cardsPerRow = 4;
  const cardWidth = (pageWidth - 20) / cardsPerRow; // 20mm for margins
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
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Use lower scale to reduce memory usage - PDF will still look good when printed
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 3, // Reduced from 6 to 3 for much smaller data URLs
        logging: false,
        allowTaint: true,
        useCORS: true,
        imageTimeout: 3000,
        windowHeight: element.scrollHeight * 3,
        windowWidth: element.scrollWidth * 3,
      });

      document.body.removeChild(element);

      // Use JPEG with compression instead of PNG to reduce base64 string size
      const imgData = canvas.toDataURL("image/jpeg", 0.85);
      const imgWidth = cardWidth - 4; // 2mm padding on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Clear canvas to free memory
      canvas.width = 0;
      canvas.height = 0;

      // Check if current card fits in current row
      if (cardsInRow > 0 && currentY + imgHeight > pageHeight - margin) {
        // Move to next row
        currentY += maxHeightInRow + rowGap;
        cardsInRow = 0;
        maxHeightInRow = 0;
      }

      // Check if we need a new page
      if (cardsInRow === 0 && currentY + imgHeight > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
        maxHeightInRow = 0;
      }

      // Calculate position (centered horizontally)
      const currentX = leftMargin + cardsInRow * cardWidth;

      // Add image to PDF
      pdf.addImage(imgData, "JPEG", currentX, currentY, imgWidth, imgHeight);

      // Track max height in current row
      maxHeightInRow = Math.max(maxHeightInRow, imgHeight);

      cardsInRow++;
      if (cardsInRow >= cardsPerRow) {
        currentY += maxHeightInRow + rowGap;
        cardsInRow = 0;
        maxHeightInRow = 0;
      }

      // Add small delay to prevent browser freezing
      if (i % 10 === 0 && i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (err) {
      console.warn(`Failed to add ${qrCode.name} to PDF:`, err);
    }
  }

  // Save PDF with date
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
  const fileNameParts = [className];
  if (chunkNumber !== null) {
    fileNameParts.push(`Part_${chunkNumber}_of_${totalChunks}`);
  }
  fileNameParts.push(today);
  const fileName = `${fileNameParts.join("_")}.pdf`;

  pdf.save(fileName);
}

/**
 * Download single QR code as image
 * @param {Object} qrCode - QR code object
 * @param {String} cardType - 'student' or 'teacher'
 * @param {Function} t - Translation function
 * @param {Function} showError - Toast error callback
 */
export const downloadSingleQRCode = async (qrCode, cardType, t, showError) => {
  try {
    const { default: html2canvas } = await import("html2canvas");

    const element = createQRCodeDownloadCard(qrCode, cardType, t);
    document.body.appendChild(element);

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Use balanced quality settings for single download
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 5, // Reduced from 8 to 5 for faster processing (400px * 5 = 2000px)
      logging: false,
      allowTaint: true,
      useCORS: true,
      imageTimeout: 5000,
      windowHeight: element.scrollHeight * 5,
      windowWidth: element.scrollWidth * 5,
    });

    document.body.removeChild(element);

    // Apply anti-aliasing for better quality
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
        link.href = url;
        link.download = `${qrCode.name}_QR_Card_${today}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png', 0.95); // High quality PNG with slightly smaller file size
  } catch (error) {
    console.error("Error downloading QR code:", error);
    showError(t("downloadError", "Error downloading QR code"));
  }
};
