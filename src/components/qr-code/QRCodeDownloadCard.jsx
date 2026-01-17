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
 * @param {string} qrCode.schoolId - School ID
 * @param {string} qrCode.studentNumber - Student ID number
 * @param {string} qrCode.role - Role/Position (e.g., 'Student', 'Teacher', 'Director')
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

  // Helper function to clean school name and add prefix
  const cleanSchoolName = (schoolName) => {
    if (!schoolName) return 'ថ្នាលបឋម';
    // Remove various Khmer school type prefixes
    let cleaned = schoolName
      .replace(/^សាលាបឋម\s*/i, '')
      .replace(/^សាលាបឋមសិក្សា\s*/i, '')
      .replace(/^សាលាមជ្ឈមណ្ឌលសិក្សា\s*/i, '')
      .replace(/^សាលាឧត្តមសិក្សា\s*/i, '')
      .replace(/^សាលា\s*/i, '')
      .trim();
    // Add "ថ្នាលបឋម - " as a prefix separator if cleaned name exists
    return cleaned ? `${cleaned}` : 'ថ្នាលបឋម';
  };

  const accentColor = '#053463'; // Standard brown/gold accent color for cards
  const headerBg = '#053463';
  const mainBorder = '#D6D3D1';

  // --- Card Container Setup (Minimal for printing/downloading) ---
  const element = document.createElement('div');
  element.style.position = 'fixed';
  element.style.left = '-9999px';
  element.style.top = '-9999px';
  element.style.width = '400px'; // Increased to 400px for ultra-high quality
  element.style.display = 'flex';
  element.style.flexDirection = 'column';
  element.style.backgroundColor = '#ffffff';
  element.style.fontFamily = 'Hanuman, "Khmer OS", "Noto Sans Khmer", sans-serif';
  element.style.overflow = 'hidden';
  element.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.06)';
  element.style.border = `2px solid ${mainBorder}`; // Thicker border for better definition
  element.style.borderRadius = '6px';


  // --- Header Section (Logo & School Name) ---
  const header = document.createElement('div');
  header.style.padding = '10px 10px 10px 10px';
  header.style.backgroundColor = headerBg;
  header.style.borderBottom = `2px solid #e0e0e0`;
  header.style.display = 'flex';
  header.style.alignItems = 'flex-start';
  header.style.gap = '10px';

  // Add Logo with white background
  const logoContainer = document.createElement('div');
  logoContainer.style.width = '60px';
  logoContainer.style.height = '60px';
  logoContainer.style.display = 'flex';
  logoContainer.style.alignItems = 'center';
  logoContainer.style.justifyContent = 'center';
  logoContainer.style.backgroundColor = '#ffffff';
  logoContainer.style.borderRadius = '4px';
  logoContainer.style.flexShrink = '0';

  const logoImg = document.createElement('img');
  logoImg.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='; // Placeholder - will be replaced with actual logo
  logoImg.style.width = '55px';
  logoImg.style.height = '55px';
  logoContainer.appendChild(logoImg);
  header.appendChild(logoContainer);

  // Add School Info Container (right side with ថ្នាលបឋម on top and school name below)
  const schoolInfoEl = document.createElement('div');
  schoolInfoEl.style.flex = '1';
  schoolInfoEl.style.display = 'flex';
  schoolInfoEl.style.flexDirection = 'column';
  schoolInfoEl.style.justifyContent = 'center';
  schoolInfoEl.style.minWidth = '0';

  // Add "ថ្នាលបឋម" label
  const labelText = document.createElement('p');
  labelText.textContent = 'ថ្នាលបឋម';
  labelText.style.fontSize = '18px';
  labelText.style.fontWeight = '400';
  labelText.style.color = '#ffffff';
  labelText.style.margin = '0 0 3px 0';
  labelText.style.lineHeight = '1';
  labelText.style.fontFamily = '"Moul", "Khmer OS", "Noto Sans Khmer", sans-serif';
  schoolInfoEl.appendChild(labelText);

  // Add School Name
  const schoolNameText = document.createElement('p');
  schoolNameText.textContent = cleanSchoolName(qrCode.schoolName) || 'School';
  schoolNameText.style.fontSize = '14px';
  schoolNameText.style.fontWeight = '600';
  schoolNameText.style.padding= '6px 0 0 0';
  schoolNameText.style.color = '#ffffff';
  schoolNameText.style.margin = '0';
  schoolNameText.style.lineHeight = '1.3';
  schoolNameText.style.whiteSpace = 'normal';
  schoolNameText.style.overflowWrap = 'break-word';
  schoolNameText.style.wordBreak = 'break-word';
  schoolInfoEl.appendChild(schoolNameText);
  header.appendChild(schoolInfoEl);

  // Load actual logo image
  const loadLogoImage = () => {
    try {
      // Import the logo dynamically
      import('../../assets/plppp.png').then(module => {
        logoImg.src = module.default || module;
      }).catch(err => {
        console.warn('Could not load PLP logo:', err);
      });
    } catch (err) {
      console.warn('Could not load PLP logo:', err);
    }
  };
  loadLogoImage();

  element.appendChild(header);

  // --- Main Content Section (QR Code & Details) ---
  const content = document.createElement('div');
  content.style.padding = '14px 14px 14px 14px';
  content.style.textAlign = 'center';
  content.style.flex = '1';
  content.style.display = 'flex';
  content.style.flexDirection = 'column';

  // Name section (primary focus)
  const nameEl = document.createElement('p');
  nameEl.textContent = qrCode.name;
  nameEl.style.fontSize = '18px';
  nameEl.style.fontWeight = '700';
  nameEl.style.color = '#1f2937';
  nameEl.style.margin = '0 0 3px 0';
  nameEl.style.lineHeight = '1.3';
  content.appendChild(nameEl);

  // Username (secondary identifier)
  const usernameEl = document.createElement('p');
  usernameEl.textContent = `${t('account')} ៖ ${qrCode.username}`;
  usernameEl.style.fontSize = '14px';
  usernameEl.style.color = '#6b7280';
  usernameEl.style.margin = '0 0 3px 0';
  usernameEl.style.fontWeight = '500';
  content.appendChild(usernameEl);

  // Password field (above QR code)
  const passwordEl = document.createElement('p');
  passwordEl.textContent = `${translate('password', 'Password')} ៖ ________`;
  passwordEl.style.fontSize = '14px';
  passwordEl.style.color = '#6b7280';
  passwordEl.style.margin = '0 0 8px 0';
  passwordEl.style.fontWeight = '500';
  passwordEl.style.textAlign = 'center';
  content.appendChild(passwordEl);

  // QR Code section (centered and simple)
  const qrContainer = document.createElement('div');
  qrContainer.style.display = 'flex';
  qrContainer.style.justifyContent = 'center';
  qrContainer.style.alignItems = 'center';
  qrContainer.style.padding = '8px';
  qrContainer.style.marginBottom = '8px';
  qrContainer.style.flex = '1';

  if (qrCode.qrCode) {
    const img = document.createElement('img');
    // Construct the full URL for the QR code image
    img.src = qrCode.qrCode.startsWith('/') || qrCode.qrCode.startsWith('http')
      ? qrCode.qrCode
      : `/api/files/${qrCode.qrCode}`;
    img.style.width = '290px'; // Increased to 290px for maximum clarity
    img.style.height = '290px';
    img.style.border = `3px solid ${accentColor}`; // Thicker border for better definition
    img.style.borderRadius = '4px';
    img.style.display = 'block';
    img.style.imageRendering = 'crisp-edges'; // Sharp rendering for QR codes
    qrContainer.appendChild(img);
  }
  content.appendChild(qrContainer);
  element.appendChild(content);

  // --- Footer Section (Class Name) ---
  const footer = document.createElement('div');
  footer.style.padding = '12px 8px 26px 8px';
  footer.style.backgroundColor = headerBg;
  footer.style.borderTop = `2px solid #e0e0e0`;
  footer.style.textAlign = 'center';
  footer.style.display = 'flex';
  footer.style.alignItems = 'center';
  footer.style.justifyContent = 'center';

  const classNameFooter = document.createElement('p');
  let footerText = '';
  if (cardType === 'student' && (qrCode.class?.gradeLevel || qrCode.className)) {
    if (qrCode.class?.gradeLevel) {
      // Check if schoolId is 103780, if so use className instead of formatClassIdentifier
      if (qrCode.schoolId === 103780 || qrCode.schoolId === '103780') {
        footerText = qrCode.className || qrCode.class?.name || '';
      } else {
        const displayGradeLevel = qrCode.class.gradeLevel === 0 || qrCode.class.gradeLevel === '0'
          ? translate('grade0', 'Kindergarten')
          : qrCode.class.gradeLevel;
        footerText = formatClassIdentifier(displayGradeLevel, qrCode.class.section);
      }
    } else {
      footerText = qrCode.className;
    }
  } else if (qrCode.className) {
    footerText = qrCode.className;
  }

  classNameFooter.textContent = footerText ? `${t('class')} ៖ ${footerText}` : '';
  classNameFooter.style.fontSize = '14px';
  classNameFooter.style.fontWeight = '700';
  classNameFooter.style.color = '#ffffff';
  classNameFooter.style.margin = '0';
  classNameFooter.style.padding = '0';
  classNameFooter.style.textAlign = 'center';
  footer.appendChild(classNameFooter);
  element.appendChild(footer);

  return element;
}