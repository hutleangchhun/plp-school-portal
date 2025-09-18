import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

// Enrich students by fetching each user's details for password
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
          // Attach both in root and nested for resolver compatibility
          if (userData) {
            if (userData.password_hash !== undefined) enriched.password_hash = userData.password_hash;
            if (!enriched.user || typeof enriched.user !== 'object') enriched.user = {};
            if (userData.password_hash !== undefined) enriched.user.password_hash = userData.password_hash;
            if (userData.password !== undefined) enriched.user.password = userData.password;
          }
        } catch (e) {
          console.warn('Failed to enrich user password for id', userId, e);
        }
      }
      // Ensure resolver sees desired field
      if (!getByPath(enriched, passwordField)) {
        // no-op; leave as is; export will fallback
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

    // Use Khmer translations if t function is provided
    const headers = {
      username: t ? t('username') : 'Username',
      fullName: t ? t('fullName') : 'Full Name',
      password: t ? t('password') : 'Password',
      phone: t ? t('phone') : 'Phone Number',
      class: t ? t('class') : 'Class'
    };

    // Filter by class if requested
    const filteredData = Array.isArray(data) ? data.filter((s) => matchesClassFilter(s, classFilter)) : [];

    // Transform data to only requested fields
    const transformedData = filteredData.map(student => {
      const classInfo = getStudentClassInfo(student);
      return {
        [headers.username]: student.username || 'N/A',
        [headers.fullName]: student.name || `${student.firstName || student.first_name || ''} ${student.lastName || student.last_name || ''}`.trim() || 'N/A',
        [headers.password]: getStudentPassword(student, options) || 'N/A',
        [headers.phone]: student.phone || 'N/A',
        [headers.class]: classInfo.name || (classInfo.id != null ? String(classInfo.id) : 'N/A')
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

    // Use Khmer translations if t function is provided
    const headers = {
      username: t ? t('username') : 'Username',
      fullName: t ? t('fullName') : 'Full Name',
      password: t ? t('password') : 'Password',
      phone: t ? t('phone') : 'Phone Number',
      class: t ? t('class') : 'Class'
    };

    // Filter by class if requested
    const filteredData = Array.isArray(data) ? data.filter((s) => matchesClassFilter(s, classFilter)) : [];

    // Transform data to only requested fields
    const transformedData = filteredData.map(student => {
      const classInfo = getStudentClassInfo(student);
      return {
        [headers.username]: student.username || 'N/A',
        [headers.fullName]: student.name || `${student.firstName || student.first_name || ''} ${student.lastName || student.last_name || ''}`.trim() || 'N/A',
        [headers.password]: getStudentPassword(student, options) || 'N/A',
        [headers.phone]: student.phone || 'N/A',
        [headers.class]: classInfo.name || (classInfo.id != null ? String(classInfo.id) : 'N/A')
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

    // Use Khmer translations if t function is provided
    const labels = {
      title: t ? t('studentManagementReport') : 'Student Management Report',
      class: t ? t('class') : 'Class',
      grade: t ? t('grade') : 'Grade',
      section: t ? t('section') : 'Section',
      academicYear: t ? t('academicYear') : 'Academic Year',
      generated: t ? t('generated') : 'Generated',
      username: t ? t('username') : 'Username',
      fullName: t ? t('fullName') : 'Full Name',
      password: t ? t('password') : 'Password',
      phone: t ? t('phone') : 'Phone',
      status: t ? t('status') : 'Status',
      totalStudents: t ? t('totalStudents') : 'Total Students',
      active: t ? t('active') : 'Active',
      inactive: t ? t('inactive') : 'Inactive'
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
        <h1 style="font-size: 24px; margin-bottom: 20px; color: #1f2937;">${labels.title}</h1>
        
        ${classInfo ? `
          <div style="margin-bottom: 20px; font-size: 14px; line-height: 1.6;">
            <p><strong>${labels.class}:</strong> ${classInfo.name || 'N/A'}</p>
            <p><strong>${labels.grade}:</strong> ${classInfo.gradeLevel || 'N/A'} | <strong>${labels.section}:</strong> ${classInfo.section || 'N/A'}</p>
            <p><strong>${labels.academicYear}:</strong> ${classInfo.academicYear || 'N/A'}</p>
            <p><strong>${labels.generated}:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        ` : `
          <div style="margin-bottom: 20px; font-size: 14px;">
            <p><strong>${labels.generated}:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        `}
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #3b82f6; color: white;">
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">${labels.username}</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">${labels.fullName}</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">${labels.password}</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">${labels.phone}</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">${labels.class}</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map((student, index) => {
              const username = student.username || 'N/A';
              const fullName = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'N/A';
              const password = getStudentPassword(student, options) || 'N/A';
              const phone = student.phone || 'N/A';
              const classObj = getStudentClassInfo(student);
              const className = classObj.name || (classObj.id != null ? String(classObj.id) : 'N/A');
              const bgColor = index % 2 === 0 ? '#f9fafb' : 'white';
              
              return `
                <tr style="background-color: ${bgColor};">
                  <td style="border: 1px solid #ddd; padding: 8px;">${username}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${fullName}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${password}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${phone}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${className}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 20px; font-size: 12px; color: #6b7280;">
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

// Helper function to get current timestamp for filenames
export const getTimestampedFilename = (baseName, extension) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  return `${baseName}_${timestamp}.${extension}`;
};