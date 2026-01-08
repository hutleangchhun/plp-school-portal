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

  // Validate: check MIME type first, then fall back to extension check
  // This allows files with Khmer names to work even if MIME type is incorrect
  const isValidByType = allowedTypes.includes(file.type);
  const isValidByExtension = allowedExtensions.includes(fileExtension);

  console.log('📁 File validation:', {
    fileName: file.name,
    fileExtension,
    mimeType: file.type,
    isValidByType,
    isValidByExtension
  });

  if (!isValidByType && !isValidByExtension) {
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

    console.log('📊 Excel data loaded:', {
      sheetName,
      totalRows: jsonData.length,
      firstRow: jsonData[0]?.slice(0, 5),
      lastRow: jsonData[jsonData.length - 1]?.slice(0, 5)
    });

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

    console.log('📍 Header detection:', {
      mainHeaderRowIndex,
      subHeaderRowIndex,
      dataStartIndex,
      hasHeaders,
      rowsBeforeData: dataStartIndex,
      rowsAfterData: jsonData.length - dataStartIndex
    });

    // Filter out empty rows and header-like rows from data
    const dataRows = jsonData.slice(dataStartIndex).filter(row => {
      if (!row || !row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')) {
        return false; // Skip empty rows
      }

      const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');

      // Skip rows that are pure headers (first cell is # or contains only header keywords with no data)
      // Check if row looks like it's all headers - if first cell is just # and rest are empty or header labels
      const firstCell = String(row[0] || '').trim().toLowerCase();
      const hasHeaderMarker = firstCell === '#' || firstCell === 'no.' || firstCell === 'no' || firstCell === 'ល.រ';

      if (hasHeaderMarker && !row.slice(1).some(cell => {
        const val = String(cell || '').trim();
        // Check if any cell has actual data (not just header labels with asterisks)
        return val && !val.includes('*') && !val.match(/^(ព័ត៌មាន|លេខ|ទូរស័ព្ទ|អាសយដ្ឋាន|ថ្ងៃខែឆ្នាំ)/);
      })) {
        return false; // Skip header rows
      }

      // Skip administrative/school header rows - use very specific keywords only
      const adminKeywords = [
        'ព្រះរាជាណាចក្រកម្ពុជា', 'kingdom of cambodia', 'ជាតិសាសនា', 'ព្រះមហាក្សត្រ',
        'king', 'nation religion', 'កម្រងហស', 'បញ្ជីរាយនាម',
        'student list', 'ឆ្នាំសិក្សា', 'academic year',
        'គ្រូប្រចាំថ្នាក់', 'class teacher',
        'បញ្ឈប៉បញ្ជី', 'រោងឆស័ក', 'ព.ស២៥៦៨',
        'ធ្វើនៅថ្ងៃទី', 'បានឃើញនិងឯកភាព',
        'នាយកសាលា', 'principal', 'director', 'signature', 'approved', 'certified',
        'ត្រឹមលេខរៀង', 'summary', 'statistics',
        'grand total', 'ចុះហត្ថលេខា', 'signed', 'អនុម័ត', 'approved by'
      ];

      const matchedAdminKeywords = adminKeywords.filter(keyword => rowText.includes(keyword)).length;
      // Only consider it an admin row if it has multiple admin keywords or is very specific
      const isAdminRow = matchedAdminKeywords >= 2 ||
        (matchedAdminKeywords === 1 && (rowText.includes('ព្រះរាជាណាចក្រ') || rowText.includes('ចុះហត្ថលេខា') || rowText.includes('អនុម័ត')));

      return !isAdminRow;
    });

    console.log('🔍 Data filtering results:', {
      rowsBeforeFilter: jsonData.slice(dataStartIndex).length,
      rowsAfterFilter: dataRows.length,
      rowsFiltered: jsonData.slice(dataStartIndex).length - dataRows.length
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
        console.log('🔎 Analyzing headers for mapping:', firstRow.slice(0, 15));

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

        console.log('🔎 Section boundaries:', { studentSectionEnd, fatherSectionStart, fatherSectionEnd, motherSectionStart, motherSectionEnd });

        firstRow.forEach((header, idx) => {
          let headerStr = String(header || '').toLowerCase().trim();
          // Also keep a version without asterisks for flexible matching
          let headerStrNoAsterisk = headerStr.replace(/\*/g, '').trim();

          // Skip sequential number columns
          if (headerStr === '#' || headerStr.includes('ល.រ') || headerStr.includes('លេខរៀង') || headerStr === 'no.' || headerStr === 'no' || headerStr === 'n°') {
            return;
          }

          const isInFatherSection = fatherSectionStart > 0 && idx >= fatherSectionStart && idx <= fatherSectionEnd;
          const isInMotherSection = motherSectionStart > 0 && idx >= motherSectionStart && idx <= motherSectionEnd;
          const isInStudentSection = idx <= studentSectionEnd;

          // Map headers to column indices - check both with and without asterisks
          if ((headerStrNoAsterisk.includes('ឪពុក') && headerStrNoAsterisk.includes('នាម') && !headerStrNoAsterisk.includes('គោត្ត')) || (headerStrNoAsterisk.includes('father') && headerStrNoAsterisk.includes('first'))) {
            columnIndices.fatherFirstName = idx;
          } else if ((headerStrNoAsterisk.includes('ឪពុក') && headerStrNoAsterisk.includes('គោត្តនាម')) || (headerStrNoAsterisk.includes('father') && headerStrNoAsterisk.includes('last'))) {
            columnIndices.fatherLastName = idx;
          } else if ((headerStrNoAsterisk.includes('ឪពុក') && headerStrNoAsterisk.includes('ទូរស័ព្ទ')) || (headerStrNoAsterisk.includes('father') && headerStrNoAsterisk.includes('phone'))) {
            columnIndices.fatherPhone = idx;
          } else if ((headerStrNoAsterisk.includes('ឪពុក') && headerStrNoAsterisk.includes('ភេទ')) || (headerStrNoAsterisk.includes('father') && headerStrNoAsterisk.includes('gender'))) {
            columnIndices.fatherGender = idx;
          } else if ((headerStrNoAsterisk.includes('ឪពុក') && headerStrNoAsterisk.includes('មុខរបរ')) || (headerStrNoAsterisk.includes('father') && headerStrNoAsterisk.includes('occupation'))) {
            columnIndices.fatherOccupation = idx;
          } else if ((headerStrNoAsterisk.includes('ឪពុក') && headerStrNoAsterisk.includes('អាសយដ្ឋាន')) || (headerStrNoAsterisk.includes('father') && headerStrNoAsterisk.includes('address'))) {
            columnIndices.fatherResidenceFullAddress = idx;
          } else if ((headerStrNoAsterisk.includes('ម្តាយ') && headerStrNoAsterisk.includes('នាម') && !headerStrNoAsterisk.includes('គោត្ត')) || (headerStrNoAsterisk.includes('mother') && headerStrNoAsterisk.includes('first'))) {
            columnIndices.motherFirstName = idx;
          } else if ((headerStrNoAsterisk.includes('ម្តាយ') && headerStrNoAsterisk.includes('គោត្តនាម')) || (headerStrNoAsterisk.includes('mother') && headerStrNoAsterisk.includes('last'))) {
            columnIndices.motherLastName = idx;
          } else if ((headerStrNoAsterisk.includes('ម្តាយ') && headerStrNoAsterisk.includes('ទូរស័ព្ទ')) || (headerStrNoAsterisk.includes('mother') && headerStrNoAsterisk.includes('phone'))) {
            columnIndices.motherPhone = idx;
          } else if ((headerStrNoAsterisk.includes('ម្តាយ') && headerStrNoAsterisk.includes('ភេទ')) || (headerStrNoAsterisk.includes('mother') && headerStrNoAsterisk.includes('gender'))) {
            columnIndices.motherGender = idx;
          } else if ((headerStrNoAsterisk.includes('ម្តាយ') && headerStrNoAsterisk.includes('មុខរបរ')) || (headerStrNoAsterisk.includes('mother') && headerStrNoAsterisk.includes('occupation'))) {
            columnIndices.motherOccupation = idx;
          } else if ((headerStrNoAsterisk.includes('ម្តាយ') && headerStrNoAsterisk.includes('អាសយដ្ឋាន')) || (headerStrNoAsterisk.includes('mother') && headerStrNoAsterisk.includes('address'))) {
            columnIndices.motherResidenceFullAddress = idx;
          } else if (isInFatherSection && (headerStrNoAsterisk === 'នាម' || headerStrNoAsterisk.includes('ឪពុក') && headerStrNoAsterisk.includes('នាម'))) {
            columnIndices.fatherFirstName = idx;
          } else if (isInFatherSection && (headerStrNoAsterisk === 'គោត្តនាម' || headerStrNoAsterisk.includes('ឪពុក') && headerStrNoAsterisk.includes('គោត្តនាម'))) {
            columnIndices.fatherLastName = idx;
          } else if (isInFatherSection && (headerStrNoAsterisk === 'ទូរស័ព្ទ' || headerStrNoAsterisk.includes('ឪពុក') && headerStrNoAsterisk.includes('ទូរស័ព្ទ'))) {
            columnIndices.fatherPhone = idx;
          } else if (isInFatherSection && (headerStrNoAsterisk === 'ភេទ' || headerStrNoAsterisk.includes('ឪពុក') && headerStrNoAsterisk.includes('ភេទ'))) {
            columnIndices.fatherGender = idx;
          } else if (isInFatherSection && (headerStrNoAsterisk === 'មុខរបរ' || headerStrNoAsterisk.includes('ឪពុក') && headerStrNoAsterisk.includes('មុខរបរ'))) {
            columnIndices.fatherOccupation = idx;
          } else if (isInMotherSection && (headerStrNoAsterisk === 'នាម' || headerStrNoAsterisk.includes('ម្តាយ') && headerStrNoAsterisk.includes('នាម'))) {
            columnIndices.motherFirstName = idx;
          } else if (isInMotherSection && (headerStrNoAsterisk === 'គោត្តនាម' || headerStrNoAsterisk.includes('ម្តាយ') && headerStrNoAsterisk.includes('គោត្តនាម'))) {
            columnIndices.motherLastName = idx;
          } else if (isInMotherSection && (headerStrNoAsterisk === 'ទូរស័ព្ទ' || headerStrNoAsterisk.includes('ម្តាយ') && headerStrNoAsterisk.includes('ទូរស័ព្ទ'))) {
            columnIndices.motherPhone = idx;
          } else if (isInMotherSection && (headerStrNoAsterisk === 'ភេទ' || headerStrNoAsterisk.includes('ម្តាយ') && headerStrNoAsterisk.includes('ភេទ'))) {
            columnIndices.motherGender = idx;
          } else if (isInMotherSection && (headerStrNoAsterisk === 'មុខរបរ' || headerStrNoAsterisk.includes('ម្តាយ') && headerStrNoAsterisk.includes('មុខរបរ'))) {
            columnIndices.motherOccupation = idx;
          } else if (headerStrNoAsterisk.includes('អត្តលេខ') || (headerStrNoAsterisk.includes('student') && (headerStrNoAsterisk.includes('id') || headerStrNoAsterisk.includes('number')))) {
            columnIndices.id = idx;
          } else if (isInStudentSection && (headerStrNoAsterisk === 'គោត្តនាម' || (headerStrNoAsterisk.includes('last') && headerStrNoAsterisk.includes('name')))) {
            columnIndices.lastName = idx;
          } else if (isInStudentSection && (headerStrNoAsterisk === 'នាម' || (headerStrNoAsterisk.includes('first') && headerStrNoAsterisk.includes('name')))) {
            columnIndices.firstName = idx;
          } else if (headerStrNoAsterisk.includes('អ៊ីមែល') || headerStrNoAsterisk.includes('email')) {
            columnIndices.email = idx;
          } else if (headerStrNoAsterisk.includes('ឈ្មោះអ្នកប្រើ') || headerStrNoAsterisk.includes('username')) {
            columnIndices.username = idx;
          } else if (headerStrNoAsterisk.includes('ពាក្យសម្ងាត់') || headerStrNoAsterisk.includes('password')) {
            columnIndices.password = idx;
          } else if (isInStudentSection && (headerStrNoAsterisk === 'ភេទ' || headerStrNoAsterisk.includes('gender') || headerStrNoAsterisk.includes('sex'))) {
            columnIndices.gender = idx;
          } else if (headerStrNoAsterisk.includes('ថ្ងៃខែឆ្នាំកំណើត') || (headerStrNoAsterisk.includes('date') && headerStrNoAsterisk.includes('birth'))) {
            columnIndices.dob = idx;
          } else if (isInStudentSection && (headerStrNoAsterisk === 'លេខទូរស័ព្ទ' || headerStrNoAsterisk === 'ទូរស័ព្ទ' || headerStrNoAsterisk.includes('phone'))) {
            columnIndices.phone = idx;
          } else if (headerStrNoAsterisk.includes('សញ្ជាតិ') || headerStrNoAsterisk.includes('nationality')) {
            columnIndices.nationality = idx;
          } else if (headerStrNoAsterisk.includes('លេខសាលា') || (headerStrNoAsterisk.includes('school') && headerStrNoAsterisk.includes('id'))) {
            columnIndices.schoolId = idx;
          } else if (headerStrNoAsterisk.includes('ឆ្នាំសិក្សា') || (headerStrNoAsterisk.includes('academic') && headerStrNoAsterisk.includes('year'))) {
            columnIndices.academicYear = idx;
          } else if (headerStrNoAsterisk.includes('កម្រិតថ្នាក់') || (headerStrNoAsterisk.includes('grade') && headerStrNoAsterisk.includes('level'))) {
            columnIndices.gradeLevel = idx;
          } else if (headerStrNoAsterisk.includes('អាសយដ្ឋាន') || headerStrNoAsterisk.includes('address')) {
            columnIndices.residenceFullAddress = idx;
          } else if (headerStrNoAsterisk.includes('ជនជាតិ') || headerStrNoAsterisk.includes('ethnic')) {
            columnIndices.ethnic = idx;
          } else if (headerStrNoAsterisk.includes('លក្ខណៈពិសេស') || headerStrNoAsterisk.includes('accessibility') || headerStrNoAsterisk.includes('disability')) {
            columnIndices.access = idx;
          }
        });

        console.log('🔎 Column indices found:', columnIndices);
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
        console.log('🔎 Using positional column mapping');
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

      // Normalize phone numbers: auto-prefix 0 if missing, blank if only "0"
      const normalizePhoneNumber = (phone) => {
        if (!phone || phone === '') return '';

        // Remove all whitespace and special characters except digits
        const digitsOnly = String(phone).replace(/\D/g, '');

        if (!digitsOnly) return ''; // No digits found

        // If only "0", treat as blank
        if (digitsOnly === '0') return '';

        // If already starts with 0, keep as is
        if (digitsOnly.startsWith('0')) return digitsOnly;

        // If doesn't start with 0, add it
        return '0' + digitsOnly;
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

      if (index === 0) {
        console.log('🔎 Sample row values:', {
          columnIndices,
          studentId,
          firstName,
          lastName,
          fullRow: row.slice(0, 10)
        });
      }

      if (!studentId.trim() && !firstName.trim() && !lastName.trim()) {
        if (index === 0) console.log('❌ Row 0 rejected: no ID or name found');
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
        phone: columnIndices.phone >= 0 ? normalizePhoneNumber(getValue(columnIndices.phone)) : '',
        nationality: columnIndices.nationality >= 0 ? getValue(columnIndices.nationality) : '',
        schoolId: columnIndices.schoolId >= 0 ? getValue(columnIndices.schoolId) : '',
        academicYear: columnIndices.academicYear >= 0 ? getValue(columnIndices.academicYear) : '',
        gradeLevel: columnIndices.gradeLevel >= 0 ? mapGradeLevel(getValue(columnIndices.gradeLevel)) : '',

        // Location info
        residenceFullAddress: columnIndices.residenceFullAddress >= 0 ? getValue(columnIndices.residenceFullAddress) : '',

        // Parent info
        fatherFirstName: columnIndices.fatherFirstName >= 0 ? getValue(columnIndices.fatherFirstName) : '',
        fatherLastName: columnIndices.fatherLastName >= 0 ? getValue(columnIndices.fatherLastName) : '',
        fatherPhone: columnIndices.fatherPhone >= 0 ? normalizePhoneNumber(getValue(columnIndices.fatherPhone)) : '',
        fatherGender: 'MALE',
        fatherOccupation: columnIndices.fatherOccupation >= 0 ? getValue(columnIndices.fatherOccupation) : '',
        fatherResidenceFullAddress: columnIndices.fatherResidenceFullAddress >= 0 ? getValue(columnIndices.fatherResidenceFullAddress) : '',

        motherFirstName: columnIndices.motherFirstName >= 0 ? getValue(columnIndices.motherFirstName) : '',
        motherLastName: columnIndices.motherLastName >= 0 ? getValue(columnIndices.motherLastName) : '',
        motherPhone: columnIndices.motherPhone >= 0 ? normalizePhoneNumber(getValue(columnIndices.motherPhone)) : '',
        motherGender: 'FEMALE',
        motherOccupation: columnIndices.motherOccupation >= 0 ? getValue(columnIndices.motherOccupation) : '',
        motherResidenceFullAddress: columnIndices.motherResidenceFullAddress >= 0 ? getValue(columnIndices.motherResidenceFullAddress) : '',

        // Additional fields
        ethnicGroup: columnIndices.ethnic >= 0 ? mapEthnicGroup(getValue(columnIndices.ethnic)) : '',
        accessibility: columnIndices.access >= 0 ? mapAccessibility(getValue(columnIndices.access)) : []
      };
    }).filter(student => student !== null);

    console.log('✅ Students mapped:', {
      totalMapped: mappedStudents.length,
      firstStudent: mappedStudents[0],
      sampleStudents: mappedStudents.slice(0, 3).map(s => ({ name: s.firstName, lastName: s.lastName, username: s.username }))
    });

    // Check if imported students exceed the limit of 100
    if (mappedStudents.length > 100) {
      showError(`ឯកសារ Excel មានសិស្ស ${mappedStudents.length} នាក់ ប៉ុន្តែអ្នកអាចនាំចូលបានច្រើនបំផុត ១០០នាក់ប៉ុណ្ណោះ។ សូមកាត់បន្ថយចំនួនសិស្សនៅក្នុងឯកសារ Excel ។`, { duration: 7000 });
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
