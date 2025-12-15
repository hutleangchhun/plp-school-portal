import { translations } from '@/locales';
import { formatClassIdentifier } from '@/utils/helpers';
import { formatDateKhmer } from '@/utils/formatters';

/**
 * QR Code Download Card Component (Minimal Student Card)
 * A clean, minimal ID card design for student QR code downloads.
 */

/**
 * Create a professional QR code card element
 * @param {Object} qrCode - QR code data object 
 * @param {string} qrCode.name - Student/Teacher name
 * @param {string} qrCode.username - Username
 * @param {string} qrCode.schoolName - School name
 * @param {string} qrCode.className - Class name (optional, only used if class object is missing)
 * @param {Object} qrCode.class - Class object (preferred for student card)
 * @param {string} qrCode.class.gradeLevel - Grade level
 * @param {string} qrCode.class.section - Class section
 * @param {string} qrCode.studentNumber - Student ID number
 * @param {string} qrCode.qrCode - Base64 encoded QR code image
 * @param {string} cardType - Type of card: 'student' or 'teacher' (defaults to 'student' in minimal context)
 * @param {Function} t - Translation function with signature (key, fallback) => string
 * @returns {HTMLElement} - Minimal card element
 */
export function createQRCodeDownloadCard(qrCode, cardType = 'student', t = null) {
  // Translation helper - uses provided translation function or direct translations
  const translate = (key, defaultText) => {
    if (t && typeof t === 'function') {
      return t(key, defaultText);
    }
    // Fallback logic for direct translation lookup (simplified for this example)
    return defaultText;
  };

  const accentColor = '#733E0A'; // Standard brown/gold accent color for cards
  const headerBg = '#733E0A';

  // --- Card Container Setup (Minimal for printing/downloading) ---
  const element = document.createElement('div');
  element.style.position = 'fixed';
  element.style.left = '-9999px';
  element.style.top = '-9999px';
  element.style.width = '350px'; // Reduced width for an ID card look
  element.style.backgroundColor = '#ffffff';
  element.style.fontFamily = 'Hanuman, "Khmer OS", "Noto Sans Khmer", sans-serif';
  element.style.overflow = 'hidden';
  element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
  element.style.border = `2px solid ${accentColor}`; // Main card border with accent color

  // --- Header Section (School Name & Title) ---
  const header = document.createElement('div');
  header.style.padding = '20px 10px 30px 10px';
  header.style.backgroundColor = headerBg;
  header.style.borderBottom = `1px solid #e0e0e0`;
  header.style.textAlign = 'center';

  const schoolNameEl = document.createElement('p');
  schoolNameEl.textContent = qrCode.schoolName || translate('school', 'School');
  schoolNameEl.style.fontSize = '15px';
  schoolNameEl.style.fontWeight = '700';
  schoolNameEl.style.color = '#fff';
  schoolNameEl.style.margin = '0 0 4px 0';
  schoolNameEl.style.textTransform = 'uppercase';
  header.appendChild(schoolNameEl);

  const headerTitle = document.createElement('p');
  /*
  const identificationText = cardType === 'teacher'
    ? translate('teacherIdentification', 'Teacher Identification')
    : translate('studentIdentification', 'Student Identification');
  headerTitle.textContent = identificationText;
  */
  headerTitle.style.fontSize = '14px';
  headerTitle.style.fontWeight = '600';
  headerTitle.style.color = accentColor;
  headerTitle.style.margin = '0';
  header.appendChild(headerTitle);

  element.appendChild(header);

  // --- Main Content Section (QR Code & Details) ---
  const content = document.createElement('div');
  content.style.padding = '25px 30px 30px 30px';
  content.style.textAlign = 'center';

  // QR Code section (centered and simple)
  const qrContainer = document.createElement('div');
  qrContainer.style.display = 'flex';
  qrContainer.style.justifyContent = 'center';
  qrContainer.style.alignItems = 'center';
  qrContainer.style.padding = '10px';
  qrContainer.style.marginBottom = '20px';

  if (qrCode.qrCode) {
    const img = document.createElement('img');
    img.src = qrCode.qrCode;
    img.style.width = '220px';
    img.style.height = '220px';
    img.style.border = `4px solid ${accentColor}`; // Simple color border
    img.style.borderRadius = '4px';
    img.style.display = 'block';
    qrContainer.appendChild(img);
  }
  content.appendChild(qrContainer);

  // Name section (primary focus)
  const nameEl = document.createElement('p');
  nameEl.textContent = qrCode.name;
  nameEl.style.fontSize = '20px';
  nameEl.style.fontWeight = '800';
  nameEl.style.color = '#1f2937';
  nameEl.style.margin = '0 0 4px 0';
  content.appendChild(nameEl);

  // Username (secondary identifier)
  const usernameEl = document.createElement('p');
  usernameEl.textContent = `@${qrCode.username}`;
  usernameEl.style.fontSize = '13px';
  usernameEl.style.color = '#6b7280';
  usernameEl.style.margin = '0 0 20px 0';
  usernameEl.style.fontWeight = '500';
  content.appendChild(usernameEl);

  // --- Details Section (Stacked for minimalism) ---
  const detailsDiv = document.createElement('div');
  detailsDiv.style.textAlign = 'left';
  detailsDiv.style.padding = '0 10px';

  // Helper function for simple detail lines
  const createDetailLine = (label, value) => {
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.padding = '8px 0';
    item.style.borderBottom = '1px dashed #e0e0e0';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.fontSize = '12px';
    labelEl.style.fontWeight = '600';
    labelEl.style.color = '#6b7280';

    const valueEl = document.createElement('span');
    valueEl.textContent = value;
    valueEl.style.fontSize = '14px';
    valueEl.style.fontWeight = '700';
    valueEl.style.color = '#1f2937';

    item.appendChild(labelEl);
    item.appendChild(valueEl);
    detailsDiv.appendChild(item);
  };

  // Add Class Info
  if (cardType === 'student' && (qrCode.class?.gradeLevel || qrCode.className)) {
    const classDisplay = qrCode.class?.gradeLevel
      ? formatClassIdentifier(qrCode.class.gradeLevel, qrCode.class.section)
      : qrCode.className;
    createDetailLine(translate('class', 'Class'), classDisplay);
  }
  content.appendChild(detailsDiv);
  element.appendChild(content);

  // --- Footer Section (Generation Date) ---
  const footer = document.createElement('div');
  footer.style.padding = '20px 10px 30px 10px';
  footer.style.backgroundColor = headerBg;
  footer.style.textAlign = 'center';
  footer.style.fontSize = '11px';
  footer.style.color = '#fff';
  footer.style.fontWeight = '500';

  const date = new Date();
  /*
  const dateStr = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  */
  const generatedText = translate('generatedOn', 'Generated on');
  footer.textContent = `${generatedText}: ${formatDateKhmer(date)}`;
  element.appendChild(footer);

  return element;
}