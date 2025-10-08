import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { userService } from './api/services/userService';

// Resolve a student's class id and name from various possible shapes
const getStudentClassInfo = (student) => {
  const cls = student?.class || {};
  const id = student?.class_id || cls.id || student?.classId || null;
  const name = student?.class_name || cls.name || student?.className || '';
  return { id, name };
};

// Determine if a student matches a provided class filter
// classFilter can be: undefined|null (no filter), number|string (id or name), or { id?, name? }
const matchesClassFilter = (student, classFilter) => {
  if (!classFilter && classFilter !== 0) return true;
  const { id, name } = getStudentClassInfo(student);

  // Primitive filter: try id then name
  if (typeof classFilter === 'number') {
    return id != null ? String(id) === String(classFilter) : false;
  }
  if (typeof classFilter === 'string') {
    const cf = classFilter.trim().toLowerCase();
    // Match by id or by name
    if (id != null && String(id).toLowerCase() === cf) return true;
    return (name || '').trim().toLowerCase() === cf;
  }

  // Object filter
  if (typeof classFilter === 'object') {
    const wantId = classFilter.id;
    const wantName = classFilter.name;
    let ok = true;
    if (wantId !== undefined && wantId !== null) {
      ok = ok && (id != null ? String(id) === String(wantId) : false);
    }
    if (wantName) {
      ok = ok && ((name || '').trim().toLowerCase() === String(wantName).trim().toLowerCase());
    }
    return ok;
  }

  return true;
};

// Helper to safely get nested value by a dot path
const getByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = String(path).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
      cur = cur[p];
    } else {
      return undefined;
    }
  }
  return cur;
};

// Quick heuristic to detect hash-looking values (bcrypt/argon2/scrypt/long hex)
const looksLikeHash = (val) => {
  if (!val || typeof val !== 'string') return false;
  const s = val.trim();
  if (!s) return false;
  if (s.startsWith('$2a$') || s.startsWith('$2b$') || s.startsWith('$2y$')) return true; // bcrypt
  if (s.startsWith('$argon2')) return true; // argon2
  if (s.startsWith('$scrypt$')) return true; // scrypt
  if (s.length > 40 && /^[a-fA-F0-9+/=]+$/.test(s)) return true; // long base64/hex-like
  return false;
};

// Resolve password from various possible keys returned by APIs/forms
const getStudentPassword = (student, options = {}) => {
  const { passwordField, preferPlain = false, allowHash = true, passwordFallbackKey } = options;

  // Prefer explicit path if provided, supports nested like 'user.password_hash'
  if (passwordField) {
    const custom = getByPath(student, passwordField);
    if (custom && (!preferPlain || !looksLikeHash(custom))) return custom;
  }

  // Prefer plain-looking fields first
  const plainCandidates = [
    student?.password,
    student?.tempPassword,
    student?.newPassword,
    student?.initialPassword,
    student?.user?.password,
    student?.user?.tempPassword
  ];
  for (const c of plainCandidates) {
    if (c && (!preferPlain || !looksLikeHash(c))) return c;
  }

  // Then consider hash fields only if allowed
  if (allowHash) {
    const hashCandidates = [
      student?.password_hash,
      student?.passwordHash,
      student?.user?.password_hash,
      student?.user?.passwordHash
    ];
    for (const h of hashCandidates) {
      if (h) return h;
    }
  }

  // Fallback to another field (e.g., username or phone) if requested
  if (passwordFallbackKey) {
    const fb = getByPath(student, passwordFallbackKey);
    if (fb) return fb;
  }

  return '';
};

// Helper to get location name from various possible fields
const getLocationName = (student, type, level) => {
  // type: 'residence' or 'birth'
  // level: 'province', 'district', 'commune', 'village'

  // Get the location object
  const locationObj = type === 'birth' ? (student.placeOfBirth || student.place_of_birth) : student.residence;

  if (!locationObj) return '';

  // Try to get the nested location object (province, district, commune, village)
  const locationData = locationObj[level];

  if (locationData && typeof locationData === 'object') {
    // Prefer Khmer name, fallback to English name
    return locationData[`${level}_name_kh`] ||
           locationData[`${level}_name_en`] ||
           locationData[`${level}NameKh`] ||
           locationData[`${level}NameEn`] ||
           locationData.name ||
           '';
  }

  // Fallback: try direct name fields on the location object
  if (locationObj[`${level}_name_kh`]) return locationObj[`${level}_name_kh`];
  if (locationObj[`${level}_name_en`]) return locationObj[`${level}_name_en`];
  if (locationObj[`${level}_name`]) return locationObj[`${level}_name`];
  if (locationObj[level] && typeof locationObj[level] === 'string') return locationObj[level];

  // Last resort: try simple field names on student object
  if (type === 'residence') {
    if (level === 'province' && student.province_name) return student.province_name;
    if (level === 'district' && student.district_name) return student.district_name;
    if (level === 'commune' && student.commune_name) return student.commune_name;
    if (level === 'village' && student.village_name) return student.village_name;
  }

  return '';
};

// Enrich students by fetching each user's details for password and location
export const enrichStudentsWithPasswords = async (students, options = {}) => {
  const { passwordField = 'password_hash', concurrency = 6 } = options;
  if (!Array.isArray(students) || students.length === 0) return [];

  const result = new Array(students.length);
  let index = 0;

  const worker = async () => {
    while (true) {
      const i = index++;
      if (i >= students.length) break;
      const s = students[i] || {};
      const userId = s.userId || s.user_id || s.id || s.user?.id || s.user?.user_id;
      let enriched = { ...s };
      if (userId) {
        try {
          const resp = await userService.getUserByID(userId);
          const userData = resp?.data || resp || {};
          // Merge all user data including nested objects (residence, placeOfBirth, etc.)
          if (userData) {
            // Password fields
            if (userData.password_hash !== undefined) enriched.password_hash = userData.password_hash;
            if (!enriched.user || typeof enriched.user !== 'object') enriched.user = {};
            if (userData.password_hash !== undefined) enriched.user.password_hash = userData.password_hash;
            if (userData.password !== undefined) enriched.user.password = userData.password;

            // Location data - merge complete nested objects
            if (userData.residence) enriched.residence = userData.residence;
            if (userData.placeOfBirth) enriched.placeOfBirth = userData.placeOfBirth;
            if (userData.place_of_birth) enriched.place_of_birth = userData.place_of_birth;

            // Other user fields
            if (userData.nationality) enriched.nationality = userData.nationality;
            if (userData.dateOfBirth) enriched.dateOfBirth = userData.dateOfBirth;
            if (userData.date_of_birth) enriched.date_of_birth = userData.date_of_birth;
            if (userData.gender) enriched.gender = userData.gender;
          }
        } catch (e) {
          console.warn('Failed to enrich user data for id', userId, e);
        }
      }
      result[i] = enriched;
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, students.length) }, () => worker());
  await Promise.all(workers);
  return result;
};

export const exportToExcel = (data, filename = 'students_data.xlsx', t = null, options = {}) => {
  try {
    const { classFilter } = options;

    // Use translation function with Khmer as default
    const headers = {
      firstName: t ? t('firstName') : 'នាមខ្លួន',
      lastName: t ? t('lastName') : 'នាមត្រកូល',
      username: t ? t('username') : 'ឈ្មោះអ្នកប្រើ',
      email: t ? t('email') : 'អ៊ីមែល',
      phone: t ? t('phone') : 'លេខទូរស័ព្ទ',
      gender: t ? t('gender') : 'ភេទ',
      dateOfBirth: t ? t('dateOfBirth') : 'ថ្ងៃកំណើត',
      nationality: t ? t('nationality') : 'សញ្ជាតិ',
      password: t ? t('password') : 'ពាក្យសម្ងាត់',
      residenceProvince: t ? t('province') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ខេត្ត (អាសយដ្ឋានបច្ចុប្បន្ន)',
      residenceDistrict: t ? t('district') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ស្រុក/ខណ្ឌ (អាសយដ្ឋានបច្ចុប្បន្ន)',
      residenceCommune: t ? t('commune') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ឃុំ/សង្កាត់ (អាសយដ្ឋានបច្ចុប្បន្ន)',
      residenceVillage: t ? t('village') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ភូមិ (អាសយដ្ឋានបច្ចុប្បន្ន)',
      birthProvince: t ? t('province') + ' (ទីកន្លែងកំណើត)' : 'ខេត្ត (ទីកន្លែងកំណើត)',
      birthDistrict: t ? t('district') + ' (ទីកន្លែងកំណើត)' : 'ស្រុក/ខណ្ឌ (ទីកន្លែងកំណើត)',
      birthCommune: t ? t('commune') + ' (ទីកន្លែងកំណើត)' : 'ឃុំ/សង្កាត់ (ទីកន្លែងកំណើត)',
      birthVillage: t ? t('village') + ' (ទីកន្លែងកំណើត)' : 'ភូមិ (ទីកន្លែងកំណើត)',
      class: t ? t('class') : 'ថ្នាក់',
    };

    // Filter by class if requested
    const filteredData = Array.isArray(data) ? data.filter((s) => matchesClassFilter(s, classFilter)) : [];

    // Debug: log first student to see what data we have
    if (filteredData.length > 0) {
      console.log('Export Excel - First student sample:', {
        username: filteredData[0].username,
        hasResidence: !!filteredData[0].residence,
        hasPlaceOfBirth: !!filteredData[0].placeOfBirth,
        residence: filteredData[0].residence,
        placeOfBirth: filteredData[0].placeOfBirth
      });
    }

    // Transform data to include all fields
    const transformedData = filteredData.map(student => {
      const classInfo = getStudentClassInfo(student);
      const firstName = student.firstName || student.first_name || '';
      const lastName = student.lastName || student.last_name || '';

      const residenceProvince = getLocationName(student, 'residence', 'province');
      const residenceDistrict = getLocationName(student, 'residence', 'district');
      const residenceCommune = getLocationName(student, 'residence', 'commune');
      const residenceVillage = getLocationName(student, 'residence', 'village');
      const birthProvince = getLocationName(student, 'birth', 'province');
      const birthDistrict = getLocationName(student, 'birth', 'district');
      const birthCommune = getLocationName(student, 'birth', 'commune');
      const birthVillage = getLocationName(student, 'birth', 'village');

      return {
        [headers.firstName]: firstName || '',
        [headers.lastName]: lastName || '',
        [headers.username]: student.username || '',
        [headers.email]: student.email || '',
        [headers.phone]: student.phone || '',
        [headers.gender]: student.gender ? (student.gender === 'male' || student.gender === 'MALE' ? (t ? t('male') : 'ប្រុស') : (t ? t('female') : 'ស្រី')) : '',
        [headers.dateOfBirth]: student.dateOfBirth || student.date_of_birth ? new Date(student.dateOfBirth || student.date_of_birth).toLocaleDateString() : '',
        [headers.nationality]: student.nationality || '',
        [headers.password]: getStudentPassword(student, options) || '',
        [headers.residenceProvince]: residenceProvince || '',
        [headers.residenceDistrict]: residenceDistrict || '',
        [headers.residenceCommune]: residenceCommune || '',
        [headers.residenceVillage]: residenceVillage || '',
        [headers.birthProvince]: birthProvince || '',
        [headers.birthDistrict]: birthDistrict || '',
        [headers.birthCommune]: birthCommune || '',
        [headers.birthVillage]: birthVillage || '',
        [headers.class]: classInfo.name || (classInfo.id != null ? String(classInfo.id) : ''),
      };
    });

    // Create a new workbook
    const ws = XLSX.utils.json_to_sheet(transformedData);
    const wb = XLSX.utils.book_new();

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    // Auto-size columns
    const range = XLSX.utils.decode_range(ws['!ref']);
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 0;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
        const cell = ws[cellAddress];
        if (cell && cell.v) {
          const cellLength = cell.v.toString().length;
          if (cellLength > maxWidth) {
            maxWidth = cellLength;
          }
        }
      }
      colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
    }
    ws['!cols'] = colWidths;

    // Write the file
    XLSX.writeFile(wb, filename);
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export to Excel');
  }
};

export const exportToCSV = (data, filename = 'students_data.csv', t = null, options = {}) => {
  try {
    const { classFilter } = options;

    // Use translation function with Khmer as default
    const headers = {
      firstName: t ? t('firstName') : 'នាមខ្លួន',
      lastName: t ? t('lastName') : 'នាមត្រកូល',
      username: t ? t('username') : 'ឈ្មោះអ្នកប្រើ',
      email: t ? t('email') : 'អ៊ីមែល',
      phone: t ? t('phone') : 'លេខទូរស័ព្ទ',
      gender: t ? t('gender') : 'ភេទ',
      dateOfBirth: t ? t('dateOfBirth') : 'ថ្ងៃកំណើត',
      nationality: t ? t('nationality') : 'សញ្ជាតិ',
      password: t ? t('password') : 'ពាក្យសម្ងាត់',
      residenceProvince: t ? t('province') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ខេត្ត (អាសយដ្ឋានបច្ចុប្បន្ន)',
      residenceDistrict: t ? t('district') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ស្រុក/ខណ្ឌ (អាសយដ្ឋានបច្ចុប្បន្ន)',
      residenceCommune: t ? t('commune') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ឃុំ/សង្កាត់ (អាសយដ្ឋានបច្ចុប្បន្ន)',
      residenceVillage: t ? t('village') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ភូមិ (អាសយដ្ឋានបច្ចុប្បន្ន)',
      birthProvince: t ? t('province') + ' (ទីកន្លែងកំណើត)' : 'ខេត្ត (ទីកន្លែងកំណើត)',
      birthDistrict: t ? t('district') + ' (ទីកន្លែងកំណើត)' : 'ស្រុក/ខណ្ឌ (ទីកន្លែងកំណើត)',
      birthCommune: t ? t('commune') + ' (ទីកន្លែងកំណើត)' : 'ឃុំ/សង្កាត់ (ទីកន្លែងកំណើត)',
      birthVillage: t ? t('village') + ' (ទីកន្លែងកំណើត)' : 'ភូមិ (ទីកន្លែងកំណើត)',
      class: t ? t('class') : 'ថ្នាក់',
    };

    // Filter by class if requested
    const filteredData = Array.isArray(data) ? data.filter((s) => matchesClassFilter(s, classFilter)) : [];

    // Transform data to include all fields
    const transformedData = filteredData.map(student => {
      const classInfo = getStudentClassInfo(student);
      const firstName = student.firstName || student.first_name || '';
      const lastName = student.lastName || student.last_name || '';

      return {
        [headers.firstName]: firstName || '',
        [headers.lastName]: lastName || '',
        [headers.username]: student.username || '',
        [headers.email]: student.email || '',
        [headers.phone]: student.phone || '',
        [headers.gender]: student.gender ? (student.gender === 'male' ? (t ? t('male') : 'ប្រុស') : (t ? t('female') : 'ស្រី')) : '',
        [headers.dateOfBirth]: student.dateOfBirth || student.date_of_birth ? new Date(student.dateOfBirth || student.date_of_birth).toLocaleDateString() : '',
        [headers.nationality]: student.nationality || '',
        [headers.password]: getStudentPassword(student, options) || '',
        [headers.residenceProvince]: getLocationName(student, 'residence', 'province') || '',
        [headers.residenceDistrict]: getLocationName(student, 'residence', 'district') || '',
        [headers.residenceCommune]: getLocationName(student, 'residence', 'commune') || '',
        [headers.residenceVillage]: getLocationName(student, 'residence', 'village') || '',
        [headers.birthProvince]: getLocationName(student, 'birth', 'province') || '',
        [headers.birthDistrict]: getLocationName(student, 'birth', 'district') || '',
        [headers.birthCommune]: getLocationName(student, 'birth', 'commune') || '',
        [headers.birthVillage]: getLocationName(student, 'birth', 'village') || '',
        [headers.class]: classInfo.name || (classInfo.id != null ? String(classInfo.id) : ''),
      };
    });

    // Convert to CSV
    const csvHeaders = Object.keys(transformedData[0] || {});
    const csvContent = [
      csvHeaders.join(','),
      ...transformedData.map(row => 
        csvHeaders.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          const s = value == null ? '' : String(value);
          return (s.includes(',') || s.includes('"') || s.includes('\n'))
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        }).join(',')
      )
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);
    return true;
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw new Error('Failed to export to CSV');
  }
};

export const exportToPDF = async (data, classInfo, filename = 'students_data.pdf', t = null, options = {}) => {
  try {
    const { classFilter } = options;

    // Use translation function with Khmer as default
    const labels = {
      title: t ? t('studentManagementReport') : 'របាយការណ៍គ្រប់គ្រងសិស្ស',
      class: t ? t('class') : 'ថ្នាក់',
      grade: t ? t('grade') : 'ថ្នាក់ទី',
      section: t ? t('section') : 'វេន',
      academicYear: t ? t('academicYear') : 'ឆ្នាំសិក្សា',
      generated: t ? t('generated') : 'បានបង្កើតនៅ',
      username: t ? t('username') : 'ឈ្មោះអ្នកប្រើ',
      fullName: t ? t('fullName') : 'ឈ្មោះពេញ',
      password: t ? t('password') : 'ពាក្យសម្ងាត់',
      phone: t ? t('phone') : 'លេខទូរស័ព្ទ',
      status: t ? t('status') : 'ស្ថានភាព',
      totalStudents: t ? t('totalStudents') : 'សិស្សសរុប',
      active: t ? t('active') : 'សកម្ម',
      inactive: t ? t('inactive') : 'អសកម្ម'
    };

    // Prefer explicit classFilter, else derive from provided classInfo for filtering
    const effectiveClassFilter = classFilter || (classInfo ? { id: classInfo.classId || classInfo.id, name: classInfo.name } : undefined);

    // Filter by class if requested
    const filteredData = Array.isArray(data) ? data.filter((s) => matchesClassFilter(s, effectiveClassFilter)) : [];

    // Create a temporary HTML element for rendering
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '800px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.padding = '20px';
    tempDiv.style.fontFamily = 'Hanuman, Khmer UI, Noto Sans Khmer, Arial Unicode MS, Arial, sans-serif';

    // Create HTML content with proper Unicode support
    const htmlContent = `
      <div style="font-family: 'Hanuman', 'Khmer UI', 'Noto Sans Khmer', 'Arial Unicode MS', 'Arial', sans-serif; padding: 20px; background: white;">
        <h1 style="font-size: 16px; margin-bottom: 15px; color: #1f2937;">${labels.title}</h1>

        ${classInfo ? `
          <div style="margin-bottom: 15px; font-size: 10px; line-height: 1.5;">
            <p><strong>${labels.class}:</strong> ${classInfo.name || ''}</p>
            <p><strong>${labels.grade}:</strong> ${classInfo.gradeLevel || ''} | <strong>${labels.section}:</strong> ${classInfo.section || ''}</p>
            <p><strong>${labels.academicYear}:</strong> ${classInfo.academicYear || ''}</p>
            <p><strong>${labels.generated}:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        ` : `
          <div style="margin-bottom: 15px; font-size: 10px;">
            <p><strong>${labels.generated}:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        `}

        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9px;">
          <thead>
            <tr style="background-color: #3b82f6; color: white;">
              <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">${labels.username}</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">${labels.fullName}</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">${labels.phone}</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">${labels.class}</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map((student, index) => {
              const username = student.username || '';
              const fullName = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || '';
              const phone = student.phone || '';
              const classObj = getStudentClassInfo(student);
              const className = classObj.name || (classObj.id != null ? String(classObj.id) : '');
              const bgColor = index % 2 === 0 ? '#f9fafb' : 'white';

              return `
                <tr style="background-color: ${bgColor};">
                  <td style="border: 1px solid #ddd; padding: 5px;">${username}</td>
                  <td style="border: 1px solid #ddd; padding: 5px;">${fullName}</td>
                  <td style="border: 1px solid #ddd; padding: 5px;">${phone}</td>
                  <td style="border: 1px solid #ddd; padding: 5px;">${className}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div style="margin-top: 15px; font-size: 9px; color: #6b7280;">
          <p><strong>${labels.totalStudents}:</strong> ${filteredData.length}</p>
        </div>
      </div>
    `;
    
    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv);
    
    try {
      // Convert HTML to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(filename);
      
      return true;
    } finally {
      // Clean up the temporary element
      document.body.removeChild(tempDiv);
    }
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export to PDF');
  }
};

// Async wrappers to enrich then export
export const prepareAndExportExcel = async (rows, filename = 'students_data.xlsx', t = null, options = {}) => {
  const enriched = await enrichStudentsWithPasswords(rows, options);
  return exportToExcel(enriched, filename, t, options);
};

export const prepareAndExportCSV = async (rows, filename = 'students_data.csv', t = null, options = {}) => {
  const enriched = await enrichStudentsWithPasswords(rows, options);
  return exportToCSV(enriched, filename, t, options);
};

export const prepareAndExportPDF = async (rows, classInfo, filename = 'students_data.pdf', t = null, options = {}) => {
  const enriched = await enrichStudentsWithPasswords(rows, options);
  return exportToPDF(enriched, classInfo, filename, t, options);
};

// Enrich teachers by fetching each user's details for password and location
export const enrichTeachersWithUserData = async (teachers, options = {}) => {
  const { concurrency = 6 } = options;
  if (!Array.isArray(teachers) || teachers.length === 0) return [];

  const result = new Array(teachers.length);
  let index = 0;

  const worker = async () => {
    while (true) {
      const i = index++;
      if (i >= teachers.length) break;
      const teacher = teachers[i] || {};
      const userId = teacher.userId || teacher.user_id || teacher.id;
      let enriched = { ...teacher };
      if (userId) {
        try {
          const resp = await userService.getUserByID(userId);
          const userData = resp?.data || resp || {};
          // Merge all user data including nested objects (residence, placeOfBirth, etc.)
          if (userData) {
            // Password fields
            if (userData.password_hash !== undefined) enriched.password_hash = userData.password_hash;
            if (!enriched.user || typeof enriched.user !== 'object') enriched.user = {};
            if (userData.password_hash !== undefined) enriched.user.password_hash = userData.password_hash;
            if (userData.password !== undefined) enriched.user.password = userData.password;

            // Location data - merge complete nested objects
            if (userData.residence) enriched.residence = userData.residence;
            if (userData.placeOfBirth) enriched.placeOfBirth = userData.placeOfBirth;
            if (userData.place_of_birth) enriched.place_of_birth = userData.place_of_birth;

            // Other user fields
            if (userData.nationality) enriched.nationality = userData.nationality;
            if (userData.dateOfBirth) enriched.dateOfBirth = userData.dateOfBirth;
            if (userData.date_of_birth) enriched.date_of_birth = userData.date_of_birth;
            if (userData.gender) enriched.gender = userData.gender;
          }
        } catch (e) {
          console.warn('Failed to enrich user data for teacher id', userId, e);
        }
      }
      result[i] = enriched;
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, teachers.length) }, () => worker());
  await Promise.all(workers);
  return result;
};

// Export teachers to Excel
export const exportTeachersToExcel = async (data, filename = 'teachers_data.xlsx', t = null, options = {}) => {
  try {
    // Enrich teachers with user data first
    const enrichedData = await enrichTeachersWithUserData(data, options);

    // Use translation function with Khmer as default
    const headers = {
      firstName: t ? t('firstName') : 'នាមខ្លួន',
      lastName: t ? t('lastName') : 'នាមត្រកូល',
      username: t ? t('username') : 'ឈ្មោះអ្នកប្រើ',
      email: t ? t('email') : 'អ៊ីមែល',
      phone: t ? t('phone') : 'លេខទូរស័ព្ទ',
      gender: t ? t('gender') : 'ភេទ',
      dateOfBirth: t ? t('dateOfBirth') : 'ថ្ងៃកំណើត',
      nationality: t ? t('nationality') : 'សញ្ជាតិ',
      password: t ? t('password') : 'ពាក្យសម្ងាត់',
      residenceProvince: t ? t('province') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ខេត្ត (អាសយដ្ឋានបច្ចុប្បន្ន)',
      residenceDistrict: t ? t('district') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ស្រុក/ខណ្ឌ (អាសយដ្ឋានបច្ចុប្បន្ន)',
      residenceCommune: t ? t('commune') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ឃុំ/សង្កាត់ (អាសយដ្ឋានបច្ចុប្បន្ន)',
      residenceVillage: t ? t('village') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ភូមិ (អាសយដ្ឋានបច្ចុប្បន្ន)',
      birthProvince: t ? t('province') + ' (ទីកន្លែងកំណើត)' : 'ខេត្ត (ទីកន្លែងកំណើត)',
      birthDistrict: t ? t('district') + ' (ទីកន្លែងកំណើត)' : 'ស្រុក/ខណ្ឌ (ទីកន្លែងកំណើត)',
      birthCommune: t ? t('commune') + ' (ទីកន្លែងកំណើត)' : 'ឃុំ/សង្កាត់ (ទីកន្លែងកំណើត)',
      birthVillage: t ? t('village') + ' (ទីកន្លែងកំណើត)' : 'ភូមិ (ទីកន្លែងកំណើត)',
      classes: t ? t('classes') : 'ថ្នាក់',
      status: t ? t('status') : 'ស្ថានភាព'
    };

    // Transform data to include all fields
    const transformedData = enrichedData.map(teacher => {
      const classesList = teacher.classes && teacher.classes.length > 0
        ? teacher.classes.map(cls => cls.name || `${cls.gradeLevel || ''}${cls.section || ''}`).join(', ')
        : '';

      // Helper function to convert 'N/A' to blank
      const blankIfNA = (value) => (value === 'N/A' || value === 'N/A') ? '' : (value || '');

      return {
        [headers.firstName]: teacher.firstName || teacher.first_name || '',
        [headers.lastName]: teacher.lastName || teacher.last_name || '',
        [headers.username]: teacher.username || '',
        [headers.email]: blankIfNA(teacher.email),
        [headers.phone]: blankIfNA(teacher.phone),
        [headers.gender]: teacher.gender ? (teacher.gender === 'male' || teacher.gender === 'MALE' ? (t ? t('male') : 'ប្រុស') : (t ? t('female') : 'ស្រី')) : '',
        [headers.dateOfBirth]: teacher.dateOfBirth || teacher.date_of_birth ? new Date(teacher.dateOfBirth || teacher.date_of_birth).toLocaleDateString() : '',
        [headers.nationality]: teacher.nationality || '',
        [headers.password]: getStudentPassword(teacher, options) || '',
        [headers.residenceProvince]: getLocationName(teacher, 'residence', 'province') || '',
        [headers.residenceDistrict]: getLocationName(teacher, 'residence', 'district') || '',
        [headers.residenceCommune]: getLocationName(teacher, 'residence', 'commune') || '',
        [headers.residenceVillage]: getLocationName(teacher, 'residence', 'village') || '',
        [headers.birthProvince]: getLocationName(teacher, 'birth', 'province') || '',
        [headers.birthDistrict]: getLocationName(teacher, 'birth', 'district') || '',
        [headers.birthCommune]: getLocationName(teacher, 'birth', 'commune') || '',
        [headers.birthVillage]: getLocationName(teacher, 'birth', 'village') || '',
        [headers.classes]: classesList
      };
    });

    // Create a new workbook
    const ws = XLSX.utils.json_to_sheet(transformedData);
    const wb = XLSX.utils.book_new();

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Teachers');

    // Auto-size columns
    const range = XLSX.utils.decode_range(ws['!ref']);
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 0;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
        const cell = ws[cellAddress];
        if (cell && cell.v) {
          const cellLength = cell.v.toString().length;
          if (cellLength > maxWidth) {
            maxWidth = cellLength;
          }
        }
      }
      colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
    }
    ws['!cols'] = colWidths;

    // Write the file
    XLSX.writeFile(wb, filename);
    return true;
  } catch (error) {
    console.error('Error exporting teachers to Excel:', error);
    throw new Error('Failed to export teachers to Excel');
  }
};

// Export teachers to CSV
export const exportTeachersToCSV = async (data, filename = 'teachers_data.csv', t = null, options = {}) => {
  try {
    // Enrich teachers with user data first
    const enrichedData = await enrichTeachersWithUserData(data, options);

    // Use translation function with Khmer as default
    const headers = {
      firstName: t ? t('firstName') : 'នាមខ្លួន',
      lastName: t ? t('lastName') : 'នាមត្រកូល',
      username: t ? t('username') : 'ឈ្មោះអ្នកប្រើ',
      email: t ? t('email') : 'អ៊ីមែល',
      phone: t ? t('phone') : 'លេខទូរស័ព្ទ',
      gender: t ? t('gender') : 'ភេទ',
      dateOfBirth: t ? t('dateOfBirth') : 'ថ្ងៃកំណើត',
      nationality: t ? t('nationality') : 'សញ្ជាតិ',
      password: t ? t('password') : 'ពាក្យសម្ងាត់',
      residenceProvince: t ? t('province') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ខេត្ត (អាសយដ្ឋានបច្ចុប្បន្ន)',
      residenceDistrict: t ? t('district') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ស្រុក/ខណ្ឌ (អាសយដ្ឋានបច្ចុប្បន្ន)',
      residenceCommune: t ? t('commune') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ឃុំ/សង្កាត់ (អាសយដ្ឋានបច្ចុប្បន្ន)',
      residenceVillage: t ? t('village') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ភូមិ (អាសយដ្ឋានបច្ចុប្បន្ន)',
      birthProvince: t ? t('province') + ' (ទីកន្លែងកំណើត)' : 'ខេត្ត (ទីកន្លែងកំណើត)',
      birthDistrict: t ? t('district') + ' (ទីកន្លែងកំណើត)' : 'ស្រុក/ខណ្ឌ (ទីកន្លែងកំណើត)',
      birthCommune: t ? t('commune') + ' (ទីកន្លែងកំណើត)' : 'ឃុំ/សង្កាត់ (ទីកន្លែងកំណើត)',
      birthVillage: t ? t('village') + ' (ទីកន្លែងកំណើត)' : 'ភូមិ (ទីកន្លែងកំណើត)',
      classes: t ? t('classes') : 'ថ្នាក់'
    };

    // Transform data to include all fields
    const transformedData = enrichedData.map(teacher => {
      const classesList = teacher.classes && teacher.classes.length > 0
        ? teacher.classes.map(cls => cls.name || `${cls.gradeLevel || ''}${cls.section || ''}`).join(', ')
        : '';

      // Helper function to convert 'N/A' to blank
      const blankIfNA = (value) => (value === 'N/A' || value === 'N/A') ? '' : (value || '');

      return {
        [headers.firstName]: teacher.firstName || teacher.first_name || '',
        [headers.lastName]: teacher.lastName || teacher.last_name || '',
        [headers.username]: teacher.username || '',
        [headers.email]: blankIfNA(teacher.email),
        [headers.phone]: blankIfNA(teacher.phone),
        [headers.gender]: teacher.gender ? (teacher.gender === 'male' || teacher.gender === 'MALE' ? (t ? t('male') : 'ប្រុស') : (t ? t('female') : 'ស្រី')) : '',
        [headers.dateOfBirth]: teacher.dateOfBirth || teacher.date_of_birth ? new Date(teacher.dateOfBirth || teacher.date_of_birth).toLocaleDateString() : '',
        [headers.nationality]: teacher.nationality || '',
        [headers.password]: getStudentPassword(teacher, options) || '',
        [headers.residenceProvince]: getLocationName(teacher, 'residence', 'province') || '',
        [headers.residenceDistrict]: getLocationName(teacher, 'residence', 'district') || '',
        [headers.residenceCommune]: getLocationName(teacher, 'residence', 'commune') || '',
        [headers.residenceVillage]: getLocationName(teacher, 'residence', 'village') || '',
        [headers.birthProvince]: getLocationName(teacher, 'birth', 'province') || '',
        [headers.birthDistrict]: getLocationName(teacher, 'birth', 'district') || '',
        [headers.birthCommune]: getLocationName(teacher, 'birth', 'commune') || '',
        [headers.birthVillage]: getLocationName(teacher, 'birth', 'village') || '',
        [headers.classes]: classesList
      };
    });

    // Convert to CSV
    const csvHeaders = Object.keys(transformedData[0] || {});
    const csvContent = [
      csvHeaders.join(','),
      ...transformedData.map(row =>
        csvHeaders.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          const s = value == null ? '' : String(value);
          return (s.includes(',') || s.includes('"') || s.includes('\n'))
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        }).join(',')
      )
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);
    return true;
  } catch (error) {
    console.error('Error exporting teachers to CSV:', error);
    throw new Error('Failed to export teachers to CSV');
  }
};

// Export teachers to PDF
export const exportTeachersToPDF = async (data, filename = 'teachers_data.pdf', t = null, options = {}) => {
  try {
    // Enrich teachers with user data first
    const enrichedData = await enrichTeachersWithUserData(data, options);

    // Use translation function with Khmer as default
    const labels = {
      title: t ? t('teachersManagement', 'Teachers Management') : 'គ្រប់គ្រងគ្រូ',
      generated: t ? t('generated', 'Generated') : 'បានបង្កើតនៅ',
      firstName: t ? t('firstName') : 'នាមខ្លួន',
      lastName: t ? t('lastName') : 'នាមត្រកូល',
      username: t ? t('username') : 'ឈ្មោះអ្នកប្រើ',
      email: t ? t('email') : 'អ៊ីមែល',
      phone: t ? t('phone') : 'លេខទូរស័ព្ទ',
      gender: t ? t('gender') : 'ភេទ',
      dateOfBirth: t ? t('dateOfBirth') : 'ថ្ងៃកំណើត',
      nationality: t ? t('nationality') : 'សញ្ជាតិ',
      password: t ? t('password') : 'ពាក្យសម្ងាត់',
      residenceProvince: t ? t('province') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ខេត្ត (អាសយដ្ឋានបច្ចុប្បន្ន)',
      residenceDistrict: t ? t('district') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ស្រុក/ខណ្ឌ (អាសយដ្ឋានបច្ចុប្បន្ន)',
      residenceCommune: t ? t('commune') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ឃុំ/សង្កាត់ (អាសយដ្ឋានបច្ចុប្បន្ន)',
      residenceVillage: t ? t('village') + ' (អាសយដ្ឋានបច្ចុប្បន្ន)' : 'ភូមិ (អាសយដ្ឋានបច្ចុប្បន្ន)',
      birthProvince: t ? t('province') + ' (ទីកន្លែងកំណើត)' : 'ខេត្ត (ទីកន្លែងកំណើត)',
      birthDistrict: t ? t('district') + ' (ទីកន្លែងកំណើត)' : 'ស្រុក/ខណ្ឌ (ទីកន្លែងកំណើត)',
      birthCommune: t ? t('commune') + ' (ទីកន្លែងកំណើត)' : 'ឃុំ/សង្កាត់ (ទីកន្លែងកំណើត)',
      birthVillage: t ? t('village') + ' (ទីកន្លែងកំណើត)' : 'ភូមិ (ទីកន្លែងកំណើត)',
      classes: t ? t('classes') : 'ថ្នាក់',
      status: t ? t('status') : 'ស្ថានភាព',
      totalTeachers: t ? t('totalTeachers', 'Total Teachers') : 'គ្រូសរុប',
      active: t ? t('active', 'Active') : 'សកម្ម',
      inactive: t ? t('inactive', 'Inactive') : 'អសកម្ម'
    };

    // Create a temporary HTML element for rendering
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '1200px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.padding = '20px';
    tempDiv.style.fontFamily = 'Hanuman, Khmer UI, Noto Sans Khmer, Arial Unicode MS, Arial, sans-serif';

    // Create HTML content with proper Unicode support - showing key fields in a readable table
    const htmlContent = `
      <div style="font-family: 'Hanuman', 'Khmer UI', 'Noto Sans Khmer', 'Arial Unicode MS', 'Arial', sans-serif; padding: 20px; background: white;">
        <h1 style="font-size: 16px; margin-bottom: 15px; color: #1f2937;">${labels.title}</h1>

        <div style="margin-bottom: 15px; font-size: 10px;">
          <p><strong>${labels.generated}:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 8px;">
          <thead>
            <tr style="background-color: #3b82f6; color: white;">
              <th style="border: 1px solid #ddd; padding: 4px; text-align: left;">${labels.firstName}</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: left;">${labels.lastName}</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: left;">${labels.username}</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: left;">${labels.email}</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: left;">${labels.phone}</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: left;">${labels.classes}</th>
            </tr>
          </thead>
          <tbody>
            ${enrichedData.map((teacher, index) => {
              const firstName = teacher.firstName || teacher.first_name || '';
              const lastName = teacher.lastName || teacher.last_name || '';
              const username = teacher.username || '';
              // Helper function to convert 'N/A' to blank for PDF
              const blankIfNA = (value) => (value === 'N/A' || value === 'N/A') ? '' : (value || '');
              const email = blankIfNA(teacher.email);
              const phone = blankIfNA(teacher.phone);
              const classesList = teacher.classes && teacher.classes.length > 0
                ? teacher.classes.map(cls => cls.name || `${cls.gradeLevel || ''}${cls.section || ''}`).join(', ')
                : '';
              const status = teacher.status || teacher.isActive ? labels.active : labels.inactive;
              const bgColor = index % 2 === 0 ? '#f9fafb' : 'white';

              return `
                <tr style="background-color: ${bgColor};">
                  <td style="border: 1px solid #ddd; padding: 3px;">${firstName}</td>
                  <td style="border: 1px solid #ddd; padding: 3px;">${lastName}</td>
                  <td style="border: 1px solid #ddd; padding: 3px;">${username}</td>
                  <td style="border: 1px solid #ddd; padding: 3px;">${email}</td>
                  <td style="border: 1px solid #ddd; padding: 3px;">${phone}</td>
                  <td style="border: 1px solid #ddd; padding: 3px;">${classesList}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div style="margin-top: 15px; font-size: 9px; color: #6b7280;">
          <p><strong>${labels.totalTeachers}:</strong> ${enrichedData.length}</p>
        </div>
      </div>
    `;

    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv);

    try {
      // Convert HTML to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a3'); // Landscape A3 for wider table

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(filename);

      return true;
    } finally {
      // Clean up the temporary element
      document.body.removeChild(tempDiv);
    }
  } catch (error) {
    console.error('Error exporting teachers to PDF:', error);
    throw new Error('Failed to export teachers to PDF');
  }
};

// Helper function to get current timestamp for filenames
export const getTimestampedFilename = (baseName, extension) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  return `${baseName}_${timestamp}.${extension}`;
};