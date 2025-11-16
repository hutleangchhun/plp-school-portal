/**
 * QR Code Download Card Component
 * Clean, modern card design for QR code downloads
 * Used in both QRCodeManagement and TeacherQRCodeManagement pages
 */

/**
 * Create a professional QR code card element
 * @param {Object} qrCode - QR code data object
 * @param {string} qrCode.name - Student/Teacher name
 * @param {string} qrCode.username - Username
 * @param {string} qrCode.schoolName - School name
 * @param {string} qrCode.className - Class name (optional)
 * @param {string} qrCode.studentNumber - Student ID number
 * @param {string} qrCode.qrCode - Base64 encoded QR code image
 * @param {string} cardType - Type of card: 'student' or 'teacher'
 * @returns {HTMLElement} - Professional card element
 */
export function createQRCodeDownloadCard(qrCode, cardType = 'student') {
  const element = document.createElement('div');
  element.style.position = 'fixed';
  element.style.left = '-9999px';
  element.style.top = '-9999px';
  element.style.width = '400px';
  element.style.backgroundColor = '#ffffff';
  element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  element.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
  element.style.borderRadius = '8px';
  element.style.overflow = 'hidden';
  element.style.border = '1px solid #e5e7eb';

  // Header section - Clean and minimal
  const header = document.createElement('div');
  header.style.padding = '16px 20px';
  header.style.borderBottom = '1px solid #e5e7eb';
  header.style.backgroundColor = '#f9fafb';

  const headerTitle = document.createElement('p');
  headerTitle.textContent = cardType === 'teacher' ? 'Teacher QR Code' : 'Student QR Code';
  headerTitle.style.fontSize = '14px';
  headerTitle.style.fontWeight = '600';
  headerTitle.style.margin = '0 0 4px 0';
  headerTitle.style.color = '#111827';
  header.appendChild(headerTitle);

  const schoolNameEl = document.createElement('p');
  schoolNameEl.textContent = qrCode.schoolName || 'School';
  schoolNameEl.style.fontSize = '12px';
  schoolNameEl.style.fontWeight = '400';
  schoolNameEl.style.margin = '0';
  schoolNameEl.style.color = '#6b7280';
  header.appendChild(schoolNameEl);

  element.appendChild(header);

  // Main content
  const content = document.createElement('div');
  content.style.padding = '20px';
  content.style.textAlign = 'center';

  // QR Code section
  const qrContainer = document.createElement('div');
  qrContainer.style.marginBottom = '20px';
  qrContainer.style.display = 'flex';
  qrContainer.style.justifyContent = 'center';
  qrContainer.style.alignItems = 'center';

  if (qrCode.qrCode) {
    const img = document.createElement('img');
    img.src = qrCode.qrCode;
    img.style.width = '160px';
    img.style.height = '160px';
    img.style.display = 'block';
    img.style.borderRadius = '4px';
    img.style.border = '1px solid #e5e7eb';
    qrContainer.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.style.width = '160px';
    placeholder.style.height = '160px';
    placeholder.style.border = '2px dashed #d1d5db';
    placeholder.style.display = 'flex';
    placeholder.style.alignItems = 'center';
    placeholder.style.justifyContent = 'center';
    placeholder.style.borderRadius = '4px';
    placeholder.style.backgroundColor = '#f3f4f6';
    placeholder.style.color = '#9ca3af';
    placeholder.style.fontSize = '13px';
    placeholder.textContent = 'No QR Code';
    qrContainer.appendChild(placeholder);
  }
  content.appendChild(qrContainer);

  // Student/Teacher info section
  const infoContainer = document.createElement('div');
  infoContainer.style.marginBottom = '16px';

  const nameEl = document.createElement('p');
  nameEl.textContent = qrCode.name;
  nameEl.style.fontSize = '15px';
  nameEl.style.fontWeight = '600';
  nameEl.style.color = '#111827';
  nameEl.style.margin = '0 0 4px 0';
  infoContainer.appendChild(nameEl);

  const usernameEl = document.createElement('p');
  usernameEl.textContent = qrCode.username;
  usernameEl.style.fontSize = '12px';
  usernameEl.style.color = '#6b7280';
  usernameEl.style.margin = '0';
  usernameEl.style.fontWeight = '400';
  infoContainer.appendChild(usernameEl);

  content.appendChild(infoContainer);

  // Details section
  const detailsDiv = document.createElement('div');
  detailsDiv.style.fontSize = '12px';
  detailsDiv.style.textAlign = 'left';
  detailsDiv.style.backgroundColor = '#f9fafb';
  detailsDiv.style.padding = '12px';
  detailsDiv.style.borderRadius = '6px';
  detailsDiv.style.border = '1px solid #e5e7eb';

  // Helper function to create detail rows
  const createDetailRow = (label, value) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.padding = '6px 0';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.fontWeight = '500';
    labelEl.style.color = '#374151';
    row.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.textContent = value;
    valueEl.style.color = '#6b7280';
    valueEl.style.fontWeight = '400';
    row.appendChild(valueEl);

    return row;
  };

  // Add school info if available
  if (qrCode.schoolName) {
    detailsDiv.appendChild(createDetailRow('School:', qrCode.schoolName));
  }

  // Add class info if available (students only)
  if (cardType === 'student' && qrCode.className) {
    detailsDiv.appendChild(createDetailRow('Class:', qrCode.className));
  }

  // Add ID number
  detailsDiv.appendChild(createDetailRow('ID:', qrCode.studentNumber || '-'));

  content.appendChild(detailsDiv);

  element.appendChild(content);

  // Footer with date
  const footer = document.createElement('div');
  footer.style.padding = '12px 20px';
  footer.style.backgroundColor = '#f9fafb';
  footer.style.textAlign = 'center';
  footer.style.borderTop = '1px solid #e5e7eb';
  footer.style.fontSize = '11px';
  footer.style.color = '#9ca3af';

  const date = new Date();
  const dateStr = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  footer.textContent = `Generated on ${dateStr}`;
  element.appendChild(footer);

  return element;
}
