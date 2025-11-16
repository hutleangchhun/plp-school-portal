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
  element.style.width = '420px';
  element.style.backgroundColor = '#ffffff';
  element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  element.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.12)';
  element.style.borderRadius = '12px';
  element.style.overflow = 'hidden';

  // Decorative top bar with accent color
  const accentBar = document.createElement('div');
  accentBar.style.height = '4px';
  accentBar.style.background = 'linear-gradient(90deg, #3b82f6 0%, #1e40af 100%)';
  element.appendChild(accentBar);

  // Header section - Modern design
  const header = document.createElement('div');
  header.style.padding = '20px 24px';
  header.style.backgroundColor = '#ffffff';
  header.style.borderBottom = '1px solid #f0f1f3';

  const headerTitle = document.createElement('p');
  headerTitle.textContent = cardType === 'teacher' ? 'Teacher QR Code' : 'Student QR Code';
  headerTitle.style.fontSize = '16px';
  headerTitle.style.fontWeight = '700';
  headerTitle.style.margin = '0 0 8px 0';
  headerTitle.style.color = '#1f2937';
  header.appendChild(headerTitle);

  const schoolNameEl = document.createElement('p');
  schoolNameEl.textContent = qrCode.schoolName || 'School';
  schoolNameEl.style.fontSize = '13px';
  schoolNameEl.style.fontWeight = '500';
  schoolNameEl.style.margin = '0';
  schoolNameEl.style.color = '#3b82f6';
  header.appendChild(schoolNameEl);

  element.appendChild(header);

  // Main content
  const content = document.createElement('div');
  content.style.padding = '24px';
  content.style.textAlign = 'center';

  // QR Code section with enhanced styling
  const qrContainer = document.createElement('div');
  qrContainer.style.marginBottom = '24px';
  qrContainer.style.display = 'flex';
  qrContainer.style.justifyContent = 'center';
  qrContainer.style.alignItems = 'center';
  qrContainer.style.padding = '16px';
  qrContainer.style.backgroundColor = '#f8fafc';
  qrContainer.style.borderRadius = '10px';
  qrContainer.style.border = '2px solid #e2e8f0';

  if (qrCode.qrCode) {
    const img = document.createElement('img');
    img.src = qrCode.qrCode;
    img.style.width = '180px';
    img.style.height = '180px';
    img.style.display = 'block';
    img.style.borderRadius = '6px';
    img.style.backgroundColor = '#ffffff';
    img.style.padding = '4px';
    img.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
    qrContainer.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.style.width = '180px';
    placeholder.style.height = '180px';
    placeholder.style.border = '2px dashed #cbd5e1';
    placeholder.style.display = 'flex';
    placeholder.style.alignItems = 'center';
    placeholder.style.justifyContent = 'center';
    placeholder.style.borderRadius = '6px';
    placeholder.style.backgroundColor = '#ffffff';
    placeholder.style.color = '#94a3b8';
    placeholder.style.fontSize = '14px';
    placeholder.style.fontWeight = '500';
    placeholder.textContent = 'No QR Code';
    qrContainer.appendChild(placeholder);
  }
  content.appendChild(qrContainer);

  // Student/Teacher info section - Enhanced
  const infoContainer = document.createElement('div');
  infoContainer.style.marginBottom = '20px';
  infoContainer.style.paddingBottom = '20px';
  infoContainer.style.borderBottom = '1px solid #f0f1f3';

  const nameEl = document.createElement('p');
  nameEl.textContent = qrCode.name;
  nameEl.style.fontSize = '17px';
  nameEl.style.fontWeight = '700';
  nameEl.style.color = '#0f172a';
  nameEl.style.margin = '0 0 6px 0';
  infoContainer.appendChild(nameEl);

  const usernameEl = document.createElement('p');
  usernameEl.textContent = qrCode.username;
  usernameEl.style.fontSize = '13px';
  usernameEl.style.color = '#64748b';
  usernameEl.style.margin = '0';
  usernameEl.style.fontWeight = '500';
  infoContainer.appendChild(usernameEl);

  content.appendChild(infoContainer);

  // Details section - Grid style
  const detailsDiv = document.createElement('div');
  detailsDiv.style.fontSize = '12px';

  // Helper function to create detail rows with improved styling
  const createDetailRow = (label, value) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.padding = '10px 0';
    row.style.borderBottom = '1px solid #f0f1f3';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.fontWeight = '600';
    labelEl.style.color = '#475569';
    row.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.textContent = value;
    valueEl.style.color = '#0f172a';
    valueEl.style.fontWeight = '500';
    row.appendChild(valueEl);

    return row;
  };

  // Add school info if available
  if (qrCode.schoolName) {
    detailsDiv.appendChild(createDetailRow('School', qrCode.schoolName));
  }

  // Add class info if available (students only)
  if (cardType === 'student' && qrCode.className) {
    detailsDiv.appendChild(createDetailRow('Class', qrCode.className));
  }

  // Add ID number
  detailsDiv.appendChild(createDetailRow('ID', qrCode.studentNumber || '-'));

  content.appendChild(detailsDiv);

  element.appendChild(content);

  // Footer with date - Improved style
  const footer = document.createElement('div');
  footer.style.padding = '14px 24px';
  footer.style.backgroundColor = '#f8fafc';
  footer.style.textAlign = 'center';
  footer.style.borderTop = '1px solid #f0f1f3';
  footer.style.fontSize = '12px';
  footer.style.color = '#64748b';

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
