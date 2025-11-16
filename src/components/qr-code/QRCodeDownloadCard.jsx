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
  element.style.width = '380px';
  element.style.backgroundColor = '#ffffff';
  element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  element.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)';
  element.style.borderRadius = '16px';
  element.style.overflow = 'hidden';

  // Color scheme based on card type
  const accentColor = cardType === 'teacher' ? '#ec4899' : '#8b5cf6';
  const accentLight = cardType === 'teacher' ? '#fce7f3' : '#ede9fe';

  // Header with gradient background
  const header = document.createElement('div');
  header.style.background = `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`;
  header.style.padding = '24px 20px';
  header.style.color = '#ffffff';
  header.style.textAlign = 'center';

  const headerTitle = document.createElement('p');
  headerTitle.textContent = cardType === 'teacher' ? 'Teacher ID' : 'Student ID';
  headerTitle.style.fontSize = '12px';
  headerTitle.style.fontWeight = '700';
  headerTitle.style.margin = '0 0 6px 0';
  headerTitle.style.opacity = '0.95';
  headerTitle.style.letterSpacing = '0.5px';
  header.appendChild(headerTitle);

  const schoolNameEl = document.createElement('p');
  schoolNameEl.textContent = qrCode.schoolName || 'School';
  schoolNameEl.style.fontSize = '14px';
  schoolNameEl.style.fontWeight = '600';
  schoolNameEl.style.margin = '0';
  header.appendChild(schoolNameEl);

  element.appendChild(header);

  // Main content with centered layout
  const content = document.createElement('div');
  content.style.padding = '28px 20px 24px 20px';
  content.style.textAlign = 'center';
  content.style.backgroundColor = '#ffffff';

  // QR Code section - Clean and centered
  const qrContainer = document.createElement('div');
  qrContainer.style.marginBottom = '24px';
  qrContainer.style.display = 'flex';
  qrContainer.style.justifyContent = 'center';
  qrContainer.style.alignItems = 'center';
  qrContainer.style.padding = '20px';
  qrContainer.style.backgroundColor = accentLight;
  qrContainer.style.borderRadius = '12px';

  if (qrCode.qrCode) {
    const img = document.createElement('img');
    img.src = qrCode.qrCode;
    img.style.width = '160px';
    img.style.height = '160px';
    img.style.display = 'block';
    img.style.borderRadius = '8px';
    img.style.backgroundColor = '#ffffff';
    img.style.padding = '8px';
    qrContainer.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.style.width = '160px';
    placeholder.style.height = '160px';
    placeholder.style.border = '2px dashed #d4d4d8';
    placeholder.style.display = 'flex';
    placeholder.style.alignItems = 'center';
    placeholder.style.justifyContent = 'center';
    placeholder.style.borderRadius = '8px';
    placeholder.style.backgroundColor = '#ffffff';
    placeholder.style.color = '#a1a1a1';
    placeholder.style.fontSize = '12px';
    placeholder.textContent = 'No QR Code';
    qrContainer.appendChild(placeholder);
  }
  content.appendChild(qrContainer);

  // Name and username section
  const nameEl = document.createElement('p');
  nameEl.textContent = qrCode.name;
  nameEl.style.fontSize = '18px';
  nameEl.style.fontWeight = '800';
  nameEl.style.color = '#000000';
  nameEl.style.margin = '0 0 4px 0';
  content.appendChild(nameEl);

  const usernameEl = document.createElement('p');
  usernameEl.textContent = qrCode.username;
  usernameEl.style.fontSize = '12px';
  usernameEl.style.color = '#666666';
  usernameEl.style.margin = '0 0 20px 0';
  usernameEl.style.fontWeight = '500';
  content.appendChild(usernameEl);

  // Details section with custom layout
  const detailsDiv = document.createElement('div');
  detailsDiv.style.display = 'grid';
  detailsDiv.style.gridTemplateColumns = '1fr 1fr';
  detailsDiv.style.gap = '12px';
  detailsDiv.style.marginBottom = '0';

  // Helper function to create detail boxes
  const createDetailBox = (label, value) => {
    const box = document.createElement('div');
    box.style.backgroundColor = '#f5f5f5';
    box.style.padding = '12px';
    box.style.borderRadius = '8px';
    box.style.border = `1px solid #ebebeb`;

    const labelEl = document.createElement('p');
    labelEl.textContent = label;
    labelEl.style.fontSize = '10px';
    labelEl.style.fontWeight = '700';
    labelEl.style.color = '#888888';
    labelEl.style.margin = '0 0 4px 0';
    labelEl.style.textTransform = 'uppercase';
    labelEl.style.letterSpacing = '0.3px';
    box.appendChild(labelEl);

    const valueEl = document.createElement('p');
    valueEl.textContent = value;
    valueEl.style.fontSize = '13px';
    valueEl.style.fontWeight = '700';
    valueEl.style.color = '#222222';
    valueEl.style.margin = '0';
    valueEl.style.wordBreak = 'break-word';
    box.appendChild(valueEl);

    return box;
  };

  // Add school info if available
  if (qrCode.schoolName) {
    detailsDiv.appendChild(createDetailBox('School', qrCode.schoolName));
  }

  // Add class info if available (students only)
  if (cardType === 'student' && qrCode.className) {
    detailsDiv.appendChild(createDetailBox('Class', qrCode.className));
  }

  // Add ID number - always full width
  if (qrCode.studentNumber) {
    const idBox = createDetailBox('ID Number', qrCode.studentNumber);
    idBox.style.gridColumn = '1 / -1';
    detailsDiv.appendChild(idBox);
  }

  content.appendChild(detailsDiv);
  element.appendChild(content);

  // Footer with date
  const footer = document.createElement('div');
  footer.style.padding = '12px 20px';
  footer.style.backgroundColor = '#f9f9f9';
  footer.style.textAlign = 'center';
  footer.style.borderTop = '1px solid #e5e5e5';
  footer.style.fontSize = '10px';
  footer.style.color = '#999999';
  footer.style.fontWeight = '500';

  const date = new Date();
  const dateStr = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  footer.textContent = `Generated: ${dateStr}`;
  element.appendChild(footer);

  return element;
}
