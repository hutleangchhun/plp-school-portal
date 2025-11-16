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
  element.style.width = '450px';
  element.style.backgroundColor = '#ffffff';
  element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  element.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.2)';
  element.style.borderRadius = '20px';
  element.style.overflow = 'hidden';

  // Color scheme based on card type
  const accentColor = cardType === 'teacher' ? '#0ea5e9' : '#06b6d4';
  const bgLight = cardType === 'teacher' ? '#e0f2fe' : '#ecf0f1';

  // Top decorative bar
  const topBar = document.createElement('div');
  topBar.style.height = '8px';
  topBar.style.background = `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)`;
  element.appendChild(topBar);

  // Header section with school name
  const header = document.createElement('div');
  header.style.padding = '24px 28px 16px 28px';
  header.style.backgroundColor = bgLight;
  header.style.borderBottom = `2px solid ${accentColor}`;

  const schoolNameEl = document.createElement('p');
  schoolNameEl.textContent = qrCode.schoolName || 'School';
  schoolNameEl.style.fontSize = '11px';
  schoolNameEl.style.fontWeight = '700';
  schoolNameEl.style.color = accentColor;
  schoolNameEl.style.margin = '0 0 4px 0';
  schoolNameEl.style.textTransform = 'uppercase';
  schoolNameEl.style.letterSpacing = '0.8px';
  header.appendChild(schoolNameEl);

  const headerTitle = document.createElement('p');
  headerTitle.textContent = cardType === 'teacher' ? 'Teacher Identification' : 'Student Identification';
  headerTitle.style.fontSize = '13px';
  headerTitle.style.fontWeight = '600';
  headerTitle.style.color = '#1f2937';
  headerTitle.style.margin = '0';
  header.appendChild(headerTitle);

  element.appendChild(header);

  // Main content section
  const content = document.createElement('div');
  content.style.padding = '32px 28px';
  content.style.textAlign = 'center';
  content.style.backgroundColor = '#ffffff';

  // QR Code section with elegant styling
  const qrSection = document.createElement('div');
  qrSection.style.marginBottom = '28px';

  const qrContainer = document.createElement('div');
  qrContainer.style.display = 'flex';
  qrContainer.style.justifyContent = 'center';
  qrContainer.style.alignItems = 'center';
  qrContainer.style.padding = '24px';
  qrContainer.style.backgroundColor = '#f8f9fa';
  qrContainer.style.borderRadius = '16px';
  qrContainer.style.border = `2px solid #e9ecef`;
  qrContainer.style.marginBottom = '16px';

  if (qrCode.qrCode) {
    const img = document.createElement('img');
    img.src = qrCode.qrCode;
    img.style.width = '180px';
    img.style.height = '180px';
    img.style.display = 'block';
    img.style.borderRadius = '8px';
    img.style.backgroundColor = '#ffffff';
    img.style.padding = '6px';
    img.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    qrContainer.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.style.width = '180px';
    placeholder.style.height = '180px';
    placeholder.style.border = '2px dashed #cbd5e1';
    placeholder.style.display = 'flex';
    placeholder.style.alignItems = 'center';
    placeholder.style.justifyContent = 'center';
    placeholder.style.borderRadius = '8px';
    placeholder.style.backgroundColor = '#ffffff';
    placeholder.style.color = '#94a3b8';
    placeholder.style.fontSize = '13px';
    placeholder.style.fontWeight = '500';
    placeholder.textContent = 'No QR Code';
    qrContainer.appendChild(placeholder);
  }
  qrSection.appendChild(qrContainer);
  content.appendChild(qrSection);

  // Divider
  const divider = document.createElement('div');
  divider.style.height = '1px';
  divider.style.backgroundColor = '#e5e7eb';
  divider.style.marginBottom = '24px';
  content.appendChild(divider);

  // Name section
  const nameEl = document.createElement('p');
  nameEl.textContent = qrCode.name;
  nameEl.style.fontSize = '20px';
  nameEl.style.fontWeight = '800';
  nameEl.style.color = '#111827';
  nameEl.style.margin = '0 0 6px 0';
  content.appendChild(nameEl);

  // Username section
  const usernameEl = document.createElement('p');
  usernameEl.textContent = `@${qrCode.username}`;
  usernameEl.style.fontSize = '13px';
  usernameEl.style.color = '#6b7280';
  usernameEl.style.margin = '0 0 24px 0';
  usernameEl.style.fontWeight = '500';
  content.appendChild(usernameEl);

  // Details section - Two column layout
  const detailsDiv = document.createElement('div');
  detailsDiv.style.display = 'grid';
  detailsDiv.style.gridTemplateColumns = '1fr 1fr';
  detailsDiv.style.gap = '16px';
  detailsDiv.style.marginBottom = '0';

  // Helper function to create detail items
  const createDetailItem = (label, value) => {
    const item = document.createElement('div');
    item.style.backgroundColor = '#f3f4f6';
    item.style.padding = '14px 16px';
    item.style.borderRadius = '12px';
    item.style.textAlign = 'center';
    item.style.border = '1px solid #e5e7eb';

    const labelEl = document.createElement('p');
    labelEl.textContent = label;
    labelEl.style.fontSize = '11px';
    labelEl.style.fontWeight = '700';
    labelEl.style.color = '#6b7280';
    labelEl.style.margin = '0 0 6px 0';
    labelEl.style.textTransform = 'uppercase';
    labelEl.style.letterSpacing = '0.4px';
    item.appendChild(labelEl);

    const valueEl = document.createElement('p');
    valueEl.textContent = value;
    valueEl.style.fontSize = '14px';
    valueEl.style.fontWeight = '700';
    valueEl.style.color = '#111827';
    valueEl.style.margin = '0';
    valueEl.style.wordBreak = 'break-word';
    item.appendChild(valueEl);

    return item;
  };

  // Add school info
  if (qrCode.schoolName) {
    detailsDiv.appendChild(createDetailItem('School', qrCode.schoolName));
  }

  // Add class info if available (students only)
  if (cardType === 'student' && qrCode.className) {
    detailsDiv.appendChild(createDetailItem('Class', qrCode.className));
  }

  // Add ID number - full width
  if (qrCode.studentNumber) {
    const idItem = createDetailItem('ID Number', qrCode.studentNumber);
    idItem.style.gridColumn = '1 / -1';
    detailsDiv.appendChild(idItem);
  }

  content.appendChild(detailsDiv);
  element.appendChild(content);

  // Footer section
  const footer = document.createElement('div');
  footer.style.padding = '16px 28px';
  footer.style.backgroundColor = bgLight;
  footer.style.textAlign = 'center';
  footer.style.borderTop = '1px solid #e5e7eb';
  footer.style.fontSize = '11px';
  footer.style.color = '#6b7280';
  footer.style.fontWeight = '500';

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
