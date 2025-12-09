import * as XLSX from 'xlsx';

// Excel import handler utility
export const excelImportHandler = async (file, ethnicGroupOptions, accessibilityOptions, showError, showSuccess) => {
  // Validate file type
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv' // .csv (alternative MIME type)
  ];

  // Also check file extension for CSV files (some browsers don't set correct MIME type)
  const fileExtension = file.name.split('.').pop().toLowerCase();
  const allowedExtensions = ['xlsx', 'xls', 'csv'];

  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    showError('សូមជ្រើសរើសឯកសារ Excel (.xlsx, .xls) ឬ CSV (.csv) តែប៉ុណ្ណោះ');
    return null;
  }

  try {
    let workbook;

    // Handle CSV files differently to support UTF-8 encoding (for Khmer text)
    if (fileExtension === 'csv') {
      const text = await file.text(); // Use text() to properly handle UTF-8
      workbook = XLSX.read(text, {
        type: 'string',
        raw: true,
        cellDates: true,
        cellNF: true,
        codepage: 65001 // UTF-8
      });
    } else {
      // For Excel files, use arrayBuffer
      const data = await file.arrayBuffer();
      workbook = XLSX.read(data, { cellDates: true, cellNF: true });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

    if (jsonData.length < 2) {
      showError('ឯកសារ Excel ត្រូវការយ៉ាងហោចណាស់ 2 ជួរ (ក្បាលនិងទិន្នន័យ)');
      return null;
    }

    // Find the actual header rows by looking for our main section headers
    const mainHeaders = ['ព័ត៌មានសិស្ស', 'ព័ត៌មានឪពុក', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានបន្ថែម'];
    const subHeaders = ['អត្តលេខ', 'គោត្តនាម', 'នាម', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត'];

    let mainHeaderRowIndex = -1;
    let subHeaderRowIndex = -1;

    // Search for the main header row (contains section headers like 'ព័ត៌មានសិស្ស')
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (row && mainHeaders.some(header =>
        row.some(cell => String(cell || '').includes(header))
      )) {
        mainHeaderRowIndex = i;
        break;
      }
    }

    // Search for the sub-header row (contains field names like 'អត្តលេខ', 'គោត្តនាម')
    for (let i = mainHeaderRowIndex >= 0 ? mainHeaderRowIndex : 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (row && subHeaders.some(header =>
        row.some(cell => String(cell || '').includes(header))
      )) {
        subHeaderRowIndex = i;
        break;
      }
    }

    // Determine data start index based on found headers
    let dataStartIndex = 0;
    let hasHeaders = false;
    let firstRow = null;

    if (mainHeaderRowIndex >= 0 && subHeaderRowIndex >= 0) {
      // Template format with both main and sub headers
      hasHeaders = true;
      dataStartIndex = subHeaderRowIndex + 1;
      firstRow = jsonData[subHeaderRowIndex];
    } else if (subHeaderRowIndex >= 0) {
      // Simple format with just column headers
      hasHeaders = true;
      dataStartIndex = subHeaderRowIndex + 1;
      firstRow = jsonData[subHeaderRowIndex];
    } else {
      // No headers found, assume data starts from row 0
      dataStartIndex = 0;
      hasHeaders = false;
      firstRow = null;
    }

    // Define expected headers for filtering
    const expectedHeaders = [
      'ព័ត៌មានសិស្ស', 'អាសយដ្ឋានស្នាក់នៅ', 'ទីកន្លែងកំណើត', 'ព័ត៌មានឪពុក', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានបន្ថែម',
      'អត្តលេខ', 'គោត្តនាម', 'នាម', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត', 'ទីកន្លែងកំណើត',
      'ឈ្មោះឪពុក', 'មុខរបរ', 'ឈ្មោះម្តាយ', 'អាសយដ្ឋានសព្វថ្ងៃ', 'ជនជាតិភាគតិច', 'លក្ខណៈពិសេស'
    ];

    // Filter out empty rows and header-like rows from data
    const dataRows = jsonData.slice(dataStartIndex).filter(row => {
      if (!row || !row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')) {
        return false; // Skip empty rows
      }

      const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');

      // Skip rows that look like headers (contain expected header text)
      const isHeaderRow = expectedHeaders.some(header =>
        rowText.includes(header.toLowerCase())
      );

      // Skip administrative/school header rows - use very specific keywords only
      const adminKeywords = [
        'ព្រះរាជាណាចក្រកម្ពុជា', 'kingdom of cambodia', 'ជាតិសាសនា', 'ព្រះមហាក្សត្រ',
        'king', 'nation religion', 'កម្រងហស', 'សាលា', 'បញ្ជីរាយនាម',
        'student list', 'ថ្នាក់ទី', 'ឆ្នាំសិក្សា', 'academic year',
        'គ្រូប្រចាំថ្នាក់', 'class teacher',
        'បញ្ឈប៉បញ្ជី', 'នាក់', 'រោងឆស័ក', 'ព.ស២៥៦៨',
        'ធ្វើនៅថ្ងៃទី', 'បានឃើញនិងឯកភាព',
        'នាយកសាលា', 'principal', 'director', 'signature', 'approved', 'certified',
        'ត្រឹមលេខរៀង', 'summary', 'statistics',
        'grand total', 'ចុះហត្ថលេខា', 'signed', 'អនុម័ត', 'approved by'
      ];

      const isAdminRow = adminKeywords.some(keyword =>
        rowText.includes(keyword)
      );

      return !isHeaderRow && !isAdminRow;
    });

    if (dataRows.length === 0) {
      showError('គ្មានទិន្នន័យសិស្សនៅក្នុងឯកសារ');
      return null;
    }

    // Map Excel columns to student fields
    const mappedStudents = dataRows.map((row, index) => {
      // Helper function to get value safely
      const getValue = (index) => {
        const val = row[index];
        return val !== null && val !== undefined ? String(val).trim() : '';
      };

      // Find column indices by looking for specific headers or patterns
      let columnIndices = {
        id: -1, lastName: -1, firstName: -1, email: -1, username: -1, password: -1,
        dob: -1, gender: -1, phone: -1, nationality: -1, schoolId: -1,
        academicYear: -1, gradeLevel: -1, residenceFullAddress: -1,
        fatherFirstName: -1, fatherLastName: -1, fatherPhone: -1, fatherGender: -1,
        fatherOccupation: -1, fatherResidenceFullAddress: -1,
        motherFirstName: -1, motherLastName: -1, motherPhone: -1, motherGender: -1,
        motherOccupation: -1, motherResidenceFullAddress: -1,
        ethnic: -1, access: -1
      };

      // If we detected headers, try to find columns by header names
      if (hasHeaders && firstRow) {
        // Find section boundaries
        let studentSectionEnd = -1;
        let fatherSectionStart = -1;
        let fatherSectionEnd = -1;
        let motherSectionStart = -1;
        let motherSectionEnd = -1;

        for (let i = 0; i < firstRow.length; i++) {
          const h = String(firstRow[i] || '').toLowerCase().trim();
          if (h.includes('អាសយដ្ឋានពេញឪពុក') || (h.includes('អាសយដ្ឋាន') && h.includes('ឪពុក'))) {
            fatherSectionEnd = i;
          } else if (h.includes('អាសយដ្ឋានពេញម្តាយ') || (h.includes('អាសយដ្ឋាន') && h.includes('ម្តាយ'))) {
            motherSectionEnd = i;
          } else if (h.includes('អាសយដ្ឋានពេញ') && !h.includes('ឪពុក') && !h.includes('ម្តាយ') && studentSectionEnd === -1) {
            studentSectionEnd = i;
          }
        }

        if (fatherSectionEnd > 0) fatherSectionStart = studentSectionEnd + 1;
        if (motherSectionEnd > 0) motherSectionStart = fatherSectionEnd + 1;

        firstRow.forEach((header, idx) => {
          const headerStr = String(header || '').toLowerCase().trim();

          // Skip sequential number columns
          if (headerStr === '#' || headerStr.includes('ល.រ') || headerStr.includes('លេខរៀង') || headerStr === 'no.' || headerStr === 'no' || headerStr === 'n°') {
            return;
          }

          const isInFatherSection = fatherSectionStart > 0 && idx >= fatherSectionStart && idx <= fatherSectionEnd;
          const isInMotherSection = motherSectionStart > 0 && idx >= motherSectionStart && idx <= motherSectionEnd;
          const isInStudentSection = idx <= studentSectionEnd;

          // Map headers to column indices
          if ((headerStr.includes('ឪពុក') && headerStr.includes('នាម') && !headerStr.includes('គោត្ត')) || (headerStr.includes('father') && headerStr.includes('first'))) {
            columnIndices.fatherFirstName = idx;
          } else if ((headerStr.includes('ឪពុក') && headerStr.includes('គោត្តនាម')) || (headerStr.includes('father') && headerStr.includes('last'))) {
            columnIndices.fatherLastName = idx;
          } else if ((headerStr.includes('ឪពុក') && headerStr.includes('ទូរស័ព្ទ')) || (headerStr.includes('father') && headerStr.includes('phone'))) {
            columnIndices.fatherPhone = idx;
          } else if ((headerStr.includes('ឪពុក') && headerStr.includes('ភេទ')) || (headerStr.includes('father') && headerStr.includes('gender'))) {
            columnIndices.fatherGender = idx;
          } else if ((headerStr.includes('ឪពុក') && headerStr.includes('មុខរបរ')) || (headerStr.includes('father') && headerStr.includes('occupation'))) {
            columnIndices.fatherOccupation = idx;
          } else if ((headerStr.includes('ឪពុក') && headerStr.includes('អាសយដ្ឋាន')) || (headerStr.includes('father') && headerStr.includes('address'))) {
            columnIndices.fatherResidenceFullAddress = idx;
          } else if ((headerStr.includes('ម្តាយ') && headerStr.includes('នាម') && !headerStr.includes('គោត្ត')) || (headerStr.includes('mother') && headerStr.includes('first'))) {
            columnIndices.motherFirstName = idx;
          } else if ((headerStr.includes('ម្តាយ') && headerStr.includes('គោត្តនាម')) || (headerStr.includes('mother') && headerStr.includes('last'))) {
            columnIndices.motherLastName = idx;
          } else if ((headerStr.includes('ម្តាយ') && headerStr.includes('ទូរស័ព្ទ')) || (headerStr.includes('mother') && headerStr.includes('phone'))) {
            columnIndices.motherPhone = idx;
          } else if ((headerStr.includes('ម្តាយ') && headerStr.includes('ភេទ')) || (headerStr.includes('mother') && headerStr.includes('gender'))) {
            columnIndices.motherGender = idx;
          } else if ((headerStr.includes('ម្តាយ') && headerStr.includes('មុខរបរ')) || (headerStr.includes('mother') && headerStr.includes('occupation'))) {
            columnIndices.motherOccupation = idx;
          } else if ((headerStr.includes('ម្តាយ') && headerStr.includes('អាសយដ្ឋាន')) || (headerStr.includes('mother') && headerStr.includes('address'))) {
            columnIndices.motherResidenceFullAddress = idx;
          } else if (isInFatherSection && headerStr === 'នាម') {
            columnIndices.fatherFirstName = idx;
          } else if (isInFatherSection && headerStr === 'គោត្តនាម') {
            columnIndices.fatherLastName = idx;
          } else if (isInFatherSection && headerStr === 'ទូរស័ព្ទ') {
            columnIndices.fatherPhone = idx;
          } else if (isInFatherSection && headerStr === 'ភេទ') {
            columnIndices.fatherGender = idx;
          } else if (isInFatherSection && headerStr === 'មុខរបរ') {
            columnIndices.fatherOccupation = idx;
          } else if (isInMotherSection && headerStr === 'នាម') {
            columnIndices.motherFirstName = idx;
          } else if (isInMotherSection && headerStr === 'គោត្តនាម') {
            columnIndices.motherLastName = idx;
          } else if (isInMotherSection && headerStr === 'ទូរស័ព្ទ') {
            columnIndices.motherPhone = idx;
          } else if (isInMotherSection && headerStr === 'ភេទ') {
            columnIndices.motherGender = idx;
          } else if (isInMotherSection && headerStr === 'មុខរបរ') {
            columnIndices.motherOccupation = idx;
          } else if (headerStr.includes('អត្តលេខ') || (headerStr.includes('student') && (headerStr.includes('id') || headerStr.includes('number')))) {
            columnIndices.id = idx;
          } else if (isInStudentSection && (headerStr === 'គោត្តនាម' || (headerStr.includes('last') && headerStr.includes('name')))) {
            columnIndices.lastName = idx;
          } else if (isInStudentSection && (headerStr === 'នាម' || (headerStr.includes('first') && headerStr.includes('name')))) {
            columnIndices.firstName = idx;
          } else if (headerStr.includes('អ៊ីមែល') || headerStr.includes('email')) {
            columnIndices.email = idx;
          } else if (headerStr.includes('ឈ្មោះអ្នកប្រើ') || headerStr.includes('username')) {
            columnIndices.username = idx;
          } else if (headerStr.includes('ពាក្យសម្ងាត់') || headerStr.includes('password')) {
            columnIndices.password = idx;
          } else if (isInStudentSection && (headerStr === 'ភេទ' || headerStr.includes('gender') || headerStr.includes('sex'))) {
            columnIndices.gender = idx;
          } else if (headerStr.includes('ថ្ងៃខែឆ្នាំកំណើត') || (headerStr.includes('date') && headerStr.includes('birth'))) {
            columnIndices.dob = idx;
          } else if (isInStudentSection && (headerStr === 'លេខទូរស័ព្ទ' || headerStr === 'ទូរស័ព្ទ' || headerStr.includes('phone'))) {
            columnIndices.phone = idx;
          } else if (headerStr.includes('សញ្ជាតិ') || headerStr.includes('nationality')) {
            columnIndices.nationality = idx;
          } else if (headerStr.includes('លេខសាលា') || (headerStr.includes('school') && headerStr.includes('id'))) {
            columnIndices.schoolId = idx;
          } else if (headerStr.includes('ឆ្នាំសិក្សា') || (headerStr.includes('academic') && headerStr.includes('year'))) {
            columnIndices.academicYear = idx;
          } else if (headerStr.includes('កម្រិតថ្នាក់') || (headerStr.includes('grade') && headerStr.includes('level'))) {
            columnIndices.gradeLevel = idx;
          } else if (headerStr.includes('អាសយដ្ឋាន') || headerStr.includes('address')) {
            columnIndices.residenceFullAddress = idx;
          } else if (headerStr.includes('ជនជាតិ') || headerStr.includes('ethnic')) {
            columnIndices.ethnic = idx;
          } else if (headerStr.includes('លក្ខណៈពិសេស') || headerStr.includes('accessibility') || headerStr.includes('disability')) {
            columnIndices.access = idx;
          }
        });
      } else {
        // No headers detected, use positional mapping
        columnIndices = {
          id: 0, lastName: 1, firstName: 2, email: 3, username: 4, password: 5,
          dob: 6, gender: 7, phone: 8, nationality: 9, schoolId: 10,
          academicYear: 11, gradeLevel: 12, residenceFullAddress: 13,
          fatherFirstName: 14, fatherLastName: 15, fatherPhone: 16, fatherGender: 17,
          fatherOccupation: 18, fatherResidenceFullAddress: 19,
          motherFirstName: 20, motherLastName: 21, motherPhone: 22, motherGender: 23,
          motherOccupation: 24, motherResidenceFullAddress: 25,
          ethnic: 26, access: 27
        };
      }

      // Map gender values
      const mapGender = (gender) => {
        if (!gender) return '';

        // Trim whitespace and normalize Unicode for Khmer text
        const trimmed = String(gender).trim();
        const normalized = trimmed.normalize('NFC'); // Normalize Unicode composition
        const g = normalized.toLowerCase();

        console.log('🚻 Gender mapping - Original:', gender, 'Trimmed:', trimmed, 'Normalized:', normalized, 'Lower:', g);

        // Check for male values (including Khmer ប្រុស with various possible encodings)
        if (g === 'ប្រុស' || g === 'ប្រុស​' || g.includes('ប្រុស') ||
            g === 'male' || g === 'm' || g === 'ប') {
          console.log('✅ Mapped to MALE');
          return 'MALE';
        }

        // Check for female values (including Khmer ស្រី with various possible encodings)
        if (g === 'ស្រី' || g === 'ស្រី​' || g.includes('ស្រី') ||
            g === 'female' || g === 'f' || g === 'ស') {
          console.log('✅ Mapped to FEMALE');
          return 'FEMALE';
        }

        console.warn('⚠️ Gender value not recognized:', gender);
        return '';
      };

      // Map ethnic group
      const mapEthnicGroup = (ethnic) => {
        if (!ethnic) return '';
        const found = ethnicGroupOptions.find(opt =>
          opt.label.toLowerCase() === ethnic.toLowerCase() ||
          opt.value === ethnic
        );
        return found ? found.value : '';
      };

      // Map accessibility (comma-separated)
      const mapAccessibility = (access) => {
        if (!access || !String(access).trim()) return [];

        const accessStr = String(access).trim();
        const items = accessStr.split(',').map(item => item.trim()).filter(item => item);

        const mapped = items.map(item => {
          const found = accessibilityOptions.find(opt =>
            opt.value.toLowerCase() === item.toLowerCase() ||
            opt.label.toLowerCase() === item.toLowerCase() ||
            opt.label.includes(item) ||
            item.includes(opt.label)
          );
          return found ? found.value : null;
        }).filter(v => v !== null);

        return mapped;
      };

      // Map grade level (handle Khmer kindergarten text)
      const mapGradeLevel = (gradeLevel) => {
        if (!gradeLevel) return '';
        const grade = String(gradeLevel).trim();

        // Check if it's "មត្តេយ្យ​" or "មត្តេយ្យ" (Kindergarten) - map to 0
        if (grade === 'មត្តេយ្យ​' || grade === 'មត្តេយ្យ' || grade.includes('មត្តេយ្យ')) {
          return '0';
        }

        // Check if it's already a number
        if (/^\d+$/.test(grade)) {
          return grade;
        }

        // Return as-is for other values
        return grade;
      };

      // Handle dynamic column detection for files without headers
      if (!hasHeaders) {
        const firstCellValue = String(row[0] || '').trim();
        const isSequential = /^\d+$/.test(firstCellValue) ||
          firstCellValue.toLowerCase().includes('ល.រ') ||
          firstCellValue.toLowerCase().includes('no');

        if (isSequential) {
          // Shift all indices to skip the sequential number column
          Object.keys(columnIndices).forEach(key => {
            if (columnIndices[key] >= 0) {
              columnIndices[key] += 1;
            }
          });
        }
      }

      // Only include rows that have at least an ID or name
      const studentId = columnIndices.id >= 0 ? getValue(columnIndices.id) : '';
      const firstName = columnIndices.firstName >= 0 ? getValue(columnIndices.firstName) : '';
      const lastName = columnIndices.lastName >= 0 ? getValue(columnIndices.lastName) : '';

      if (!studentId.trim() && !firstName.trim() && !lastName.trim()) {
        return null;
      }

      // Helper function to convert dates to dd/mm/yyyy format
      const normalizeDateForDisplay = (dateStr) => {
        if (!dateStr) return '';

        console.log('📅 Normalizing date:', dateStr, 'Type:', typeof dateStr);

        // Handle Date objects
        if (dateStr instanceof Date) {
          if (!isNaN(dateStr.getTime())) {
            const day = dateStr.getDate().toString().padStart(2, '0');
            const month = (dateStr.getMonth() + 1).toString().padStart(2, '0');
            const year = dateStr.getFullYear().toString();
            const result = `${day}/${month}/${year}`;
            console.log('✅ Date object converted:', result);
            return result;
          } else {
            console.log('❌ Invalid Date object');
            return '';
          }
        }

        // Handle Excel serial numbers (e.g., 44927 for a date)
        const numValue = typeof dateStr === 'number' ? dateStr : parseFloat(dateStr);
        if (!isNaN(numValue) && numValue > 10000 && numValue < 100000) {
          const excelEpoch = new Date(1900, 0, 1);
          const jsDate = new Date(excelEpoch.getTime() + (numValue - 2) * 24 * 60 * 60 * 1000);
          if (!isNaN(jsDate.getTime())) {
            const day = jsDate.getDate().toString().padStart(2, '0');
            const month = (jsDate.getMonth() + 1).toString().padStart(2, '0');
            const year = jsDate.getFullYear().toString();
            const result = `${day}/${month}/${year}`;
            console.log('✅ Excel serial number converted:', numValue, '→', result);
            return result;
          }
        }

        const dateString = String(dateStr).trim();

        // Handle yyyy-mm-dd format (ISO format) - Check this FIRST before dd/mm/yyyy
        const yyyymmddMatch = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (yyyymmddMatch) {
          const [, year, month, day] = yyyymmddMatch;
          const result = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
          console.log('✅ ISO format (yyyy-mm-dd) converted:', dateString, '→', result);
          return result;
        }

        // Handle dd/mm/yy format (2-digit year) - support /, ., and -
        const ddmmyyMatch = dateString.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2})$/);
        if (ddmmyyMatch) {
          const [, day, month, year] = ddmmyyMatch;
          const fullYear = `20${year}`;
          const result = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${fullYear}`;
          console.log('✅ 2-digit year format converted:', dateString, '→', result);
          return result;
        }

        // Handle dd/mm/yyyy or dd.mm.yyyy or dd-mm-yyyy format - support /, ., and -
        const dateMatch = dateString.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
        if (dateMatch) {
          const [, part1, part2, year] = dateMatch;
          const num1 = parseInt(part1);
          const num2 = parseInt(part2);

          // If first number is > 12, it MUST be day (dd/mm/yyyy)
          if (num1 > 12) {
            const result = `${part1.padStart(2, '0')}/${part2.padStart(2, '0')}/${year}`;
            console.log('✅ Detected dd/mm/yyyy (day > 12):', dateString, '→', result);
            return result;
          }
          // If second number is > 12, first MUST be month (mm/dd/yyyy) - convert to dd/mm/yyyy
          else if (num2 > 12) {
            const result = `${part2.padStart(2, '0')}/${part1.padStart(2, '0')}/${year}`;
            console.log('✅ Detected mm/dd/yyyy (month > 12), converted to dd/mm/yyyy:', dateString, '→', result);
            return result;
          }
          // Ambiguous case (both ≤ 12) - ASSUME dd/mm/yyyy (international standard)
          else {
            const result = `${part1.padStart(2, '0')}/${part2.padStart(2, '0')}/${year}`;
            console.log('⚠️ Ambiguous date (both ≤ 12), assuming dd/mm/yyyy:', dateString, '→', result);
            return result;
          }
        }

        // Try parsing as a JavaScript date string (as last resort)
        try {
          const parsedDate = new Date(dateString);
          if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900) {
            const day = parsedDate.getDate().toString().padStart(2, '0');
            const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
            const year = parsedDate.getFullYear().toString();
            const result = `${day}/${month}/${year}`;
            console.log('✅ JS Date parsing succeeded:', dateString, '→', result);
            return result;
          }
        } catch (e) {
          console.log('❌ JS Date parsing failed:', e.message);
        }

        // Return original string if we can't parse it
        console.log('⚠️ Could not parse date, returning original:', dateString);
        return dateString;
      };

      return {
        // Student basic info
        id: studentId,
        lastName: lastName,
        firstName: firstName,
        email: columnIndices.email >= 0 ? getValue(columnIndices.email) : '',
        username: columnIndices.username >= 0 ? getValue(columnIndices.username) : '',
        password: columnIndices.password >= 0 ? getValue(columnIndices.password) : '',
        dateOfBirth: columnIndices.dob >= 0 ? normalizeDateForDisplay(getValue(columnIndices.dob)) : '',
        gender: columnIndices.gender >= 0 ? mapGender(getValue(columnIndices.gender)) : '',
        phone: columnIndices.phone >= 0 ? getValue(columnIndices.phone) : '',
        nationality: columnIndices.nationality >= 0 ? getValue(columnIndices.nationality) : '',
        schoolId: columnIndices.schoolId >= 0 ? getValue(columnIndices.schoolId) : '',
        academicYear: columnIndices.academicYear >= 0 ? getValue(columnIndices.academicYear) : '',
        gradeLevel: columnIndices.gradeLevel >= 0 ? mapGradeLevel(getValue(columnIndices.gradeLevel)) : '',

        // Location info
        residenceFullAddress: columnIndices.residenceFullAddress >= 0 ? getValue(columnIndices.residenceFullAddress) : '',

        // Parent info
        fatherFirstName: columnIndices.fatherFirstName >= 0 ? getValue(columnIndices.fatherFirstName) : '',
        fatherLastName: columnIndices.fatherLastName >= 0 ? getValue(columnIndices.fatherLastName) : '',
        fatherPhone: columnIndices.fatherPhone >= 0 ? getValue(columnIndices.fatherPhone) : '',
        fatherGender: 'MALE',
        fatherOccupation: columnIndices.fatherOccupation >= 0 ? getValue(columnIndices.fatherOccupation) : '',
        fatherResidenceFullAddress: columnIndices.fatherResidenceFullAddress >= 0 ? getValue(columnIndices.fatherResidenceFullAddress) : '',

        motherFirstName: columnIndices.motherFirstName >= 0 ? getValue(columnIndices.motherFirstName) : '',
        motherLastName: columnIndices.motherLastName >= 0 ? getValue(columnIndices.motherLastName) : '',
        motherPhone: columnIndices.motherPhone >= 0 ? getValue(columnIndices.motherPhone) : '',
        motherGender: 'FEMALE',
        motherOccupation: columnIndices.motherOccupation >= 0 ? getValue(columnIndices.motherOccupation) : '',
        motherResidenceFullAddress: columnIndices.motherResidenceFullAddress >= 0 ? getValue(columnIndices.motherResidenceFullAddress) : '',

        // Additional fields
        ethnicGroup: columnIndices.ethnic >= 0 ? mapEthnicGroup(getValue(columnIndices.ethnic)) : '',
        accessibility: columnIndices.access >= 0 ? mapAccessibility(getValue(columnIndices.access)) : []
      };
    }).filter(student => student !== null);

    // Check if imported students exceed the limit of 70
    if (mappedStudents.length > 70) {
      showError(`ឯកសារ Excel មានសិស្ស ${mappedStudents.length} នាក់ ប៉ុន្តែអ្នកអាចនាំចូលបានច្រើនបំផុត ៧០នាក់ប៉ុណ្ណោះ។ សូមកាត់បន្ថយចំនួនសិស្សនៅក្នុងឯកសារ Excel ។`, { duration: 7000 });
      return null;
    }

    const headerInfo = hasHeaders ? 'រួមបញ្ចូលក្បាល' : 'គ្មានក្បាល';
    showSuccess(`បាននាំចូល ${mappedStudents.length} សិស្សពីឯកសារ Excel (${headerInfo})`);

    return mappedStudents;

  } catch (error) {
    console.error('Excel import error:', error);
    showError('មានកំហុសក្នុងការអានឯកសារ Excel: ' + error.message);
    return null;
  }
};
