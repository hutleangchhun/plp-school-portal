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
  element.style.width = '500px';
  element.style.backgroundColor = '#ffffff';
  element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  element.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.15)';
  element.style.borderRadius = '24px';
  element.style.overflow = 'hidden';
  element.style.border = '1px solid rgba(255, 255, 255, 0.2)';

  // Color scheme based on card type
  const accentColor = cardType === 'teacher' ? '#0ea5e9' : '#06b6d4';
  const bgLight = cardType === 'teacher' ? '#e0f2fe' : '#cffafe';
  const gradientStart = cardType === 'teacher' ? '#0284c7' : '#0891b2';
  const gradientEnd = cardType === 'teacher' ? '#0ea5e9' : '#06b6d4';

  // Top decorative bar with gradient
  const topBar = document.createElement('div');
  topBar.style.height = '12px';
  topBar.style.background = `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`;
  element.appendChild(topBar);

  // Header section with school name - enhanced styling
  const header = document.createElement('div');
  header.style.padding = '28px 32px 20px 32px';
  header.style.backgroundColor = `linear-gradient(135deg, ${bgLight} 0%, rgba(255, 255, 255, 0.5) 100%)`;
  header.style.backgroundImage = `linear-gradient(135deg, ${bgLight} 0%, rgba(255, 255, 255, 0.5) 100%)`;
  header.style.borderBottom = 'none';

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

  // Main content section - enhanced padding and background
  const content = document.createElement('div');
  content.style.padding = '40px 32px';
  content.style.textAlign = 'center';
  content.style.backgroundColor = '#ffffff';

  // QR Code section with elegant styling
  const qrSection = document.createElement('div');
  qrSection.style.marginBottom = '36px';

  const qrContainer = document.createElement('div');
  qrContainer.style.display = 'flex';
  qrContainer.style.justifyContent = 'center';
  qrContainer.style.alignItems = 'center';
  qrContainer.style.padding = '28px';
  qrContainer.style.backgroundColor = '#f9fafb';
  qrContainer.style.borderRadius = '18px';
  qrContainer.style.border = `2px solid #e5e7eb`;
  qrContainer.style.marginBottom = '16px';
  qrContainer.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.05)';

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
  divider.style.height = '1.5px';
  divider.style.backgroundColor = '#e5e7eb';
  divider.style.marginBottom = '32px';
  content.appendChild(divider);

  // Name section - enhanced typography
  const nameEl = document.createElement('p');
  nameEl.textContent = qrCode.name;
  nameEl.style.fontSize = '24px';
  nameEl.style.fontWeight = '900';
  nameEl.style.color = '#111827';
  nameEl.style.margin = '0 0 8px 0';
  nameEl.style.letterSpacing = '-0.5px';
  content.appendChild(nameEl);

  // Username section - enhanced styling
  const usernameEl = document.createElement('p');
  usernameEl.textContent = `@${qrCode.username}`;
  usernameEl.style.fontSize = '14px';
  usernameEl.style.color = '#6b7280';
  usernameEl.style.margin = '0 0 32px 0';
  usernameEl.style.fontWeight = '500';
  usernameEl.style.letterSpacing = '0.3px';
  content.appendChild(usernameEl);

  // Details section - Two column layout with enhanced card styling
  const detailsDiv = document.createElement('div');
  detailsDiv.style.display = 'grid';
  detailsDiv.style.gridTemplateColumns = '1fr 1fr';
  detailsDiv.style.gap = '18px';
  detailsDiv.style.marginBottom = '0';

  // Helper function to create detail items with card-like appearance
  const createDetailItem = (label, value) => {
    const item = document.createElement('div');
    item.style.backgroundColor = '#f8fafc';
    item.style.padding = '18px 18px';
    item.style.borderRadius = '14px';
    item.style.textAlign = 'center';
    item.style.border = '1.5px solid #e2e8f0';
    item.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.04)';
    item.style.transition = 'all 0.2s ease';

    const labelEl = document.createElement('p');
    labelEl.textContent = label;
    labelEl.style.fontSize = '11px';
    labelEl.style.fontWeight = '800';
    labelEl.style.color = '#64748b';
    labelEl.style.margin = '0 0 8px 0';
    labelEl.style.textTransform = 'uppercase';
    labelEl.style.letterSpacing = '0.6px';
    item.appendChild(labelEl);

    const valueEl = document.createElement('p');
    valueEl.textContent = value;
    valueEl.style.fontSize = '15px';
    valueEl.style.fontWeight = '800';
    valueEl.style.color = '#0f172a';
    valueEl.style.margin = '0';
    valueEl.style.wordBreak = 'break-word';
    valueEl.style.lineHeight = '1.4';
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

  // Footer section - enhanced styling
  const footer = document.createElement('div');
  footer.style.padding = '20px 32px';
  footer.style.background = `linear-gradient(135deg, ${bgLight} 0%, rgba(255, 255, 255, 0.3) 100%)`;
  footer.style.backgroundImage = `linear-gradient(135deg, ${bgLight} 0%, rgba(255, 255, 255, 0.3) 100%)`;
  footer.style.textAlign = 'center';
  footer.style.borderTop = '1.5px solid #e5e7eb';
  footer.style.fontSize = '12px';
  footer.style.color = '#475569';
  footer.style.fontWeight = '600';

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
