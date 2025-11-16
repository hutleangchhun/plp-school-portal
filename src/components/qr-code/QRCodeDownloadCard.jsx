/**
 * QR Code Download Card Component
 * Professional card design for QR code downloads
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
  element.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.1)';
  element.style.borderRadius = '12px';
  element.style.overflow = 'hidden';

  // Header with gradient
  const header = document.createElement('div');
  header.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
  header.style.padding = '20px';
  header.style.textAlign = 'center';
  header.style.color = 'white';

  const schoolName = document.createElement('p');
  schoolName.textContent = qrCode.schoolName || 'School';
  schoolName.style.fontSize = '11px';
  schoolName.style.fontWeight = '600';
  schoolName.style.margin = '0 0 4px 0';
  schoolName.style.opacity = '0.9';
  header.appendChild(schoolName);

  const headerTitle = document.createElement('p');
  headerTitle.textContent = cardType === 'teacher' ? 'Teacher QR Code' : 'Student QR Code';
  headerTitle.style.fontSize = '13px';
  headerTitle.style.fontWeight = '500';
  headerTitle.style.margin = '0';
  header.appendChild(headerTitle);

  element.appendChild(header);

  // Main content
  const content = document.createElement('div');
  content.style.padding = '28px 20px';
  content.style.textAlign = 'center';

  // QR Code section with border
  const qrContainer = document.createElement('div');
  qrContainer.style.marginBottom = '20px';
  qrContainer.style.padding = '12px';
  qrContainer.style.backgroundColor = '#f8f9fa';
  qrContainer.style.borderRadius = '8px';
  qrContainer.style.border = '1px solid #e9ecef';

  if (qrCode.qrCode) {
    const img = document.createElement('img');
    img.src = qrCode.qrCode;
    img.style.width = '180px';
    img.style.height = '180px';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    img.style.borderRadius = '4px';
    qrContainer.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.style.width = '180px';
    placeholder.style.height = '180px';
    placeholder.style.margin = '0 auto';
    placeholder.style.border = '2px dashed #dee2e6';
    placeholder.style.display = 'flex';
    placeholder.style.alignItems = 'center';
    placeholder.style.justifyContent = 'center';
    placeholder.style.borderRadius = '4px';
    placeholder.style.backgroundColor = '#ffffff';
    placeholder.style.color = '#adb5bd';
    placeholder.style.fontSize = '12px';
    placeholder.textContent = 'No QR Code';
    qrContainer.appendChild(placeholder);
  }
  content.appendChild(qrContainer);

  // Student/Teacher info section
  const infoContainer = document.createElement('div');
  infoContainer.style.paddingTop = '8px';
  infoContainer.style.borderTop = '1px solid #e9ecef';

  const nameEl = document.createElement('p');
  nameEl.textContent = qrCode.name;
  nameEl.style.fontSize = '16px';
  nameEl.style.fontWeight = '700';
  nameEl.style.color = '#212529';
  nameEl.style.margin = '12px 0 4px 0';
  infoContainer.appendChild(nameEl);

  const usernameEl = document.createElement('p');
  usernameEl.textContent = qrCode.username;
  usernameEl.style.fontSize = '13px';
  usernameEl.style.color = '#6c757d';
  usernameEl.style.margin = '0 0 12px 0';
  usernameEl.style.fontWeight = '500';
  infoContainer.appendChild(usernameEl);

  // Details table
  const detailsDiv = document.createElement('div');
  detailsDiv.style.fontSize = '12px';
  detailsDiv.style.textAlign = 'left';
  detailsDiv.style.backgroundColor = '#f8f9fa';
  detailsDiv.style.padding = '10px';
  detailsDiv.style.borderRadius = '6px';
  detailsDiv.style.marginTop = '12px';

  // Helper function to create detail rows
  const createDetailRow = (label, value) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.padding = '6px 0';
    row.style.color = '#495057';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.fontWeight = '600';
    labelEl.style.color = '#212529';
    row.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.textContent = value;
    valueEl.style.color = '#6c757d';
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

  infoContainer.appendChild(detailsDiv);
  content.appendChild(infoContainer);

  element.appendChild(content);

  // Footer with date
  const footer = document.createElement('div');
  footer.style.padding = '12px 20px';
  footer.style.backgroundColor = '#f8f9fa';
  footer.style.textAlign = 'center';
  footer.style.borderTop = '1px solid #e9ecef';
  footer.style.fontSize = '10px';
  footer.style.color = '#6c757d';

  const date = new Date();
  const dateStr = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  footer.textContent = `Generated on ${dateStr}`;
  element.appendChild(footer);

  return element;
}
