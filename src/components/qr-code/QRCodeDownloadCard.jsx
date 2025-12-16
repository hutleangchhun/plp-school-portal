import { formatClassIdentifier } from '@/utils/helpers';
import logoUrl from '@/assets/plp-logo.png';

/**
 * QR Code Download Card Component (Landscape ID Card)
 * Matches StudentIDCard.jsx design with logo, credentials, and QR code side-by-side.
 */

/**
 * Create a professional QR code card element in landscape format
 * @param {Object} qrCode - QR code data object
 * @param {string} qrCode.name - Student/Teacher name
 * @param {string} qrCode.username - Username
 * @param {string} qrCode.schoolName - School name
 * @param {string} qrCode.className - Class name (optional)
 * @param {Object} qrCode.class - Class object (preferred for student card)
 * @param {string} qrCode.qrCode - Base64 encoded QR code image
 * @param {string} cardType - Type of card: 'student' or 'teacher'
 * @param {Function} t - Translation function
 * @returns {HTMLElement} - Landscape card element matching StudentIDCard design
 */
export function createQRCodeDownloadCard(qrCode, cardType = 'student', t = null) {
  const translate = (key, defaultText) => {
    if (t && typeof t === 'function') {
      return t(key, defaultText);
    }
    return defaultText;
  };

  // --- Card Container Setup (Landscape) ---
  const element = document.createElement('div');
  element.style.position = 'fixed';
  element.style.left = '-9999px';
  element.style.top = '-9999px';
  element.style.width = '350px'; // Landscape width
  element.style.height = '200px'; // Landscape height
  element.style.backgroundColor = '#ffffff';
  element.style.fontFamily = 'Hanuman, "Khmer OS", "Noto Sans Khmer", sans-serif';
  element.style.overflow = 'hidden';
  element.style.borderRadius = '8px';

  // --- Main Container (Row Layout: Left | Right) ---
  const container = document.createElement('div');
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.display = 'flex';
  container.style.flexDirection = 'row';
  container.style.backgroundColor = '#ffffff';
  container.style.borderRadius = '8px';
  container.style.overflow = 'hidden';

  // --- Left Side (Logo & Credentials) ---
  const leftSide = document.createElement('div');
  leftSide.style.flex = '1'; // 50% width
  leftSide.style.display = 'flex';
  leftSide.style.flexDirection = 'column';
  leftSide.style.alignItems = 'center';
  leftSide.style.justifyContent = 'center';
  leftSide.style.padding = '8px';
  leftSide.style.backgroundColor = '#f8f8f9';

  // Logo area
  const logoDiv = document.createElement('div');
  logoDiv.style.padding = '4px';
  logoDiv.style.display = 'flex';
  logoDiv.style.justifyContent = 'center';
  logoDiv.style.alignItems = 'center';
  logoDiv.style.width = '100%';
  logoDiv.style.marginBottom = '8px';

  const logoImg = document.createElement('img');
  logoImg.style.width = 'auto';
  logoImg.style.height = '40px';
  logoImg.style.objectFit = 'contain';
  logoImg.src = logoUrl;
  logoDiv.appendChild(logoImg);
  leftSide.appendChild(logoDiv);

  // Username and Password section
  const credentialsDiv = document.createElement('div');
  credentialsDiv.style.fontSize = '14px';
  credentialsDiv.style.fontWeight = 'normal';
  credentialsDiv.style.color = '#555';
  credentialsDiv.style.textAlign = 'center';
  credentialsDiv.style.width = '100%';

  const usernameLabel = document.createElement('div');
  usernameLabel.style.fontWeight = 'bold';
  usernameLabel.style.fontSize = '12px';
  usernameLabel.style.marginBottom = '4px';
  usernameLabel.textContent = translate('username', 'ឈ្មោះគណនី');
  credentialsDiv.appendChild(usernameLabel);

  const usernameValue = document.createElement('div');
  usernameValue.style.color = '#0d6efd';
  usernameValue.style.fontWeight = 'bold';
  usernameValue.style.fontSize = '14px';
  usernameValue.style.marginBottom = '10px';
  usernameValue.textContent = qrCode.username ? qrCode.username.replace(/^@/, '') : '';
  credentialsDiv.appendChild(usernameValue);

  const passwordLabel = document.createElement('div');
  passwordLabel.style.fontWeight = 'bold';
  passwordLabel.style.fontSize = '12px';
  passwordLabel.style.marginBottom = '4px';
  passwordLabel.textContent = translate('password', 'ពាក្យសម្ងាត់');
  credentialsDiv.appendChild(passwordLabel);

  const passwordInput = document.createElement('div');
  passwordInput.style.height = '24px';
  passwordInput.style.borderBottom = '1px solid #555';
  passwordInput.style.width = '80%';
  passwordInput.style.margin = '6px auto 0';
  passwordInput.style.textAlign = 'center';
  credentialsDiv.appendChild(passwordInput);

  leftSide.appendChild(credentialsDiv);

  // --- Right Side (Student Info & QR Code) ---
  const rightSide = document.createElement('div');
  rightSide.style.flex = '1'; // 50% width
  rightSide.style.display = 'flex';
  rightSide.style.flexDirection = 'column';
  rightSide.style.padding = '8px';
  rightSide.style.justifyContent = 'space-between';
  rightSide.style.backgroundColor = '#835f48'; // Brown background

  // Student Info Section
  const infoSection = document.createElement('div');
  infoSection.style.flex = '1';
  infoSection.style.display = 'flex';
  infoSection.style.flexDirection = 'column';
  infoSection.style.justifyContent = 'center';

  // Student Name
  const nameEl = document.createElement('div');
  nameEl.style.color = '#ffffff';
  nameEl.style.fontSize = '16px';
  nameEl.style.fontWeight = 'bold';
  nameEl.style.textAlign = 'center';
  nameEl.textContent = qrCode.name;
  infoSection.appendChild(nameEl);

  // Class/Grade Info
  const classEl = document.createElement('div');
  classEl.style.fontSize = '12px';
  classEl.style.color = '#ffffff';
  classEl.style.marginTop = '4px';
  classEl.style.textAlign = 'center';

  if (cardType === 'student' && (qrCode.class?.gradeLevel || qrCode.className)) {
    let classDisplay = '';
    if (qrCode.class?.gradeLevel) {
      const displayGradeLevel = qrCode.class.gradeLevel === 0 || qrCode.class.gradeLevel === '0'
        ? translate('grade0', 'មត្តេយ្យ')
        : qrCode.class.gradeLevel;
      classDisplay = `ថ្នាក់ ${formatClassIdentifier(displayGradeLevel, qrCode.class.section)}`;
    } else {
      classDisplay = `ថ្នាក់ ${qrCode.className}`;
    }
    classEl.textContent = classDisplay;
    infoSection.appendChild(classEl);
  }

  rightSide.appendChild(infoSection);

  // QR Code Section
  const qrSection = document.createElement('div');
  qrSection.style.display = 'flex';
  qrSection.style.justifyContent = 'center';
  qrSection.style.alignItems = 'center';
  qrSection.style.marginTop = '8px';

  if (qrCode.qrCode) {
    const qrImg = document.createElement('img');
    qrImg.src = qrCode.qrCode;
    qrImg.style.width = '100px';
    qrImg.style.height = '100px';
    qrImg.style.borderRadius = '4px';
    qrSection.appendChild(qrImg);
  }
  rightSide.appendChild(qrSection);

  container.appendChild(leftSide);
  container.appendChild(rightSide);
  element.appendChild(container);

  return element;
}