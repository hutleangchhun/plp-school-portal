// Template download utility
export const templateDownloader = async () => {
  // Dynamically import xlsx-js-style for styling support
  const XLSXStyleModule = await import('xlsx-js-style');
  // xlsx-js-style exports as default, but we need to handle both cases
  const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

  // Create comprehensive template with Cambodian school headers
  const templateData = [
    // Official Cambodian School Header - Row 1
    [
      'ព្រះរាជាណាចក្រកម្ពុជា',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    // Nation, Religion, King - Row 2
    [
      'ជាតិ       សាសនា       ព្រះមហាក្សត្រ',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    // School Administrative Info - Row 3
    [
      'កម្រងហស ព្រែកគយ',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    // School Name - Row 4
    [
      'សាលាបឋមសិក្សា ហ៊ុន សែន ព្រែកគយ',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    // Student List Title - Row 5
    [
      'បញ្ជីរាយនាមសិស្ស(គ្រូបន្ទុកថ្នាក់ លាងជី វី ភេទ ប្រុស)',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    // Class and Academic Year - Row 6
    [
      'ថ្នាក់ទី ៤ ( ខ )ឆ្នាំសិក្សា ២០២៤-២០២៥',
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    // Empty row for spacing - Row 7
    [
      '',
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '',
      '', ''
    ],
    // Instructions row (row 8)
    [
      'សូមបញ្ចូលព័ត៌មានសិស្សដូចឧទាហរណ៍ខាងក្រោម។ សូមលុបជួរឧទាហរណ៍និងបញ្ចូលព័ត៌មានសិស្សពិតប្រាកដ។',
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    // Main headers (row 9) - Repeat text for each merged cell to ensure visibility
    [
      '#', // Row number
      'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', // 14 columns for student info (without address)
      'ព័ត៌មានឪពុក', 'ព័ត៌មានឪពុក', 'ព័ត៌មានឪពុក', 'ព័ត៌មានឪពុក', 'ព័ត៌មានឪពុក', 'ព័ត៌មានឪពុក', // 6 columns for father
      'ព័ត៌មានម្តាយ', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានម្តាយ', // 6 columns for mother
      'ព័ត៌មានបន្ថែម', 'ព័ត៌មានបន្ថែម' // 2 columns for additional info
    ],
    // Sub headers (row 10)
    [
      '#',
      'អត្តលេខ', 'គោត្តនាម', 'នាម', 'អ៊ីមែល', 'ឈ្មោះអ្នកប្រើ', 'ពាក្យសម្ងាត់',
      'ថ្ងៃខែឆ្នាំកំណើត', 'ភេទ', 'លេខទូរស័ព្ទ', 'សញ្ជាតិ', 'លេខសាលា', 'ឆ្នាំសិក្សា', 'កម្រិតថ្នាក់',
      'អាសយដ្ឋានពេញ',
      'នាម', 'គោត្តនាម', 'ទូរស័ព្ទ', 'ភេទ', 'មុខរបរ', 'អាសយដ្ឋានពេញឪពុក',
      'នាម', 'គោត្តនាម', 'ទូរស័ព្ទ', 'ភេទ', 'មុខរបរ', 'អាសយដ្ឋានពេញម្តាយ',
      'ជនជាតិភាគតិច', 'លក្ខណៈពិសេស'
    ],
    // Example row with sample data (row 11)
    [
      '1',
      'STD001', // អត្តលេខ
      'សុខ', // គោត្តនាម
      'ចន្ថា', // នាម
      'chantha.sok@example.com', // អ៊ីមែល
      'chantha.sok', // ឈ្មោះអ្នកប្រើ
      'Student@123', // ពាក្យសម្ងាត់
      '15/05/15', // ថ្ងៃខែឆ្នាំកំណើត (dd/mm/yy)
      'ស្រី', // ភេទ (ប្រុស ឬ ស្រី)
      '012345678', // លេខទូរស័ព្ទ
      'ខ្មែរ', // សញ្ជាតិ
      '123', // លេខសាលា
      '2024-2025', // ឆ្នាំសិក្សា
      '4', // កម្រិតថ្នាក់
      'ភូមិក្រាំងជ័យ ឃុំព្រែកគយ ស្រុកបាទី ខេត្តតាកែវ', // អាសយដ្ឋានពេញ
      'វណ្ណៈ', // នាមឪពុក
      'សុខ', // គោត្តនាមឪពុក
      '011222333', // ទូរស័ព្ទឪពុក
      'ប្រុស', // ភេទឪពុក
      'កសិករ', // មុខរបរឪពុក
      'ភូមិក្រាំងជ័យ ឃុំព្រែកគយ ស្រុកបាទី ខេត្តតាកែវ', // អាសយដ្ឋានពេញឪពុក
      'សុភា', // នាមម្តាយ
      'ចាន់', // គោត្តនាមម្តាយ
      '012333444', // ទូរស័ព្ទម្តាយ
      'ស្រី', // ភេទម្តាយ
      'លក់ទំនិញ', // មុខរបរម្តាយ
      'ភូមិក្រាំងជ័យ ឃុំព្រែកគយ ស្រុកបាទី ខេត្តតាកែវ', // អាសយដ្ឋានពេញម្តាយ
      '', // ជនជាតិភាគតិច
      '' // លក្ខណៈពិសេស
    ],
    // Empty rows for user input (rows 12-20)
    [
      '2', '', '', '', '', '', '',
      '', '', '', '', '', '', '',
      '',
      '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    [
      '3', '', '', '', '', '', '',
      '', '', '', '', '', '', '',
      '',
      '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    [
      '4', '', '', '', '', '', '',
      '', '', '', '', '', '', '',
      '',
      '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    [
      '5', '', '', '', '', '', '',
      '', '', '', '', '', '', '',
      '',
      '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    [
      '6', '', '', '', '', '', '',
      '', '', '', '', '', '', '',
      '',
      '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    [
      '7', '', '', '', '', '', '',
      '', '', '', '', '', '', '',
      '',
      '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    [
      '8', '', '', '', '', '', '',
      '', '', '', '', '', '', '',
      '',
      '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    [
      '9', '', '', '', '', '', '',
      '', '', '', '', '', '', '',
      '',
      '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    [
      '10', '', '', '', '', '', '',
      '', '', '', '', '', '', '',
      '',
      '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ]
  ];

  const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

  // Set column widths for better readability
  const colWidths = [
    { wch: 5 }, // #
    { wch: 12 }, // ID (អត្តលេខ)
    { wch: 15 }, // Last Name
    { wch: 15 }, // First Name
    { wch: 35 }, // Email
    { wch: 20 }, // Username
    { wch: 15 }, // Password
    { wch: 18 }, // Date of Birth
    { wch: 8 }, // Gender
    { wch: 18 }, // Phone
    { wch: 12 }, // Nationality
    { wch: 12 }, // School ID
    { wch: 12 }, // Academic Year
    { wch: 12 }, // Grade Level
    { wch: 40 }, // Address
    { wch: 15 }, // Father First Name
    { wch: 15 }, // Father Last Name
    { wch: 18 }, // Father Phone
    { wch: 12 }, // Father Gender
    { wch: 20 }, // Father Occupation
    { wch: 40 }, // Father Address
    { wch: 15 }, // Mother First Name
    { wch: 15 }, // Mother Last Name
    { wch: 18 }, // Mother Phone
    { wch: 12 }, // Mother Gender
    { wch: 20 }, // Mother Occupation
    { wch: 40 }, // Mother Address
    { wch: 25 }, // Ethnic Group
    { wch: 30 }  // Accessibility
  ];
  ws['!cols'] = colWidths;

  // Add merges for better visual organization
  if (!ws['!merges']) ws['!merges'] = [];

  // Merge cells for headers (row 1-6 are headers)
  // Row 1: Kingdom header spans all columns
  ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 28 } });

  // Row 2: Nation/Religion/King spans all columns
  ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 28 } });

  // Row 3: Administrative district spans all columns
  ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 28 } });

  // Row 4: School name spans all columns
  ws['!merges'].push({ s: { r: 3, c: 0 }, e: { r: 3, c: 28 } });

  // Row 5: Student list title spans all columns
  ws['!merges'].push({ s: { r: 4, c: 0 }, e: { r: 4, c: 28 } });

  // Row 6: Class and academic year spans all columns
  ws['!merges'].push({ s: { r: 5, c: 0 }, e: { r: 5, c: 28 } });

  // Row 8: Instructions spans all columns
  ws['!merges'].push({ s: { r: 7, c: 0 }, e: { r: 7, c: 28 } });

  // Row 9: Main headers - merge student info columns
  ws['!merges'].push({ s: { r: 8, c: 1 }, e: { r: 8, c: 14 } }); // Student info (14 columns)
  ws['!merges'].push({ s: { r: 8, c: 15 }, e: { r: 8, c: 20 } }); // Father info (6 columns)
  ws['!merges'].push({ s: { r: 8, c: 21 }, e: { r: 8, c: 26 } }); // Mother info (6 columns)
  ws['!merges'].push({ s: { r: 8, c: 27 }, e: { r: 8, c: 28 } }); // Additional info (2 columns)

  // Set row heights for better readability
  ws['!rows'] = [];
  for (let i = 0; i < templateData.length; i++) {
    if (i >= 8 && i <= 9) { // Header rows
      ws['!rows'][i] = { hpt: 35 }; // Taller for headers
    } else if (i >= 10) { // Data rows
      ws['!rows'][i] = { hpt: 25 }; // Standard height for data
    } else if (i === 7) { // Instructions row
      ws['!rows'][i] = { hpt: 30 }; // Taller for instructions
    } else {
      ws['!rows'][i] = { hpt: 20 }; // Standard height for other rows
    }
  }

  // Apply cell styles (borders only, no background colors)
  const range = XLSXStyle.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) continue;

      const cell = ws[cellAddress];

      // Initialize cell style with borders
      cell.s = {
        alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };

      // Header styles (rows 1-6)
      if (R >= 0 && R <= 5) {
        cell.s.font = { bold: true, sz: 14 };
        cell.s.alignment = { vertical: 'center', horizontal: 'center', wrapText: true };
      }

      // Instructions row (row 8)
      else if (R === 7) {
        cell.s.font = { bold: true, sz: 11 };
        cell.s.alignment = { vertical: 'center', horizontal: 'left', wrapText: true };
      }

      // Main category headers (row 9)
      else if (R === 8) {
        cell.s.font = { bold: true, sz: 12 };
        cell.s.alignment = { vertical: 'center', horizontal: 'center', wrapText: true };
      }

      // Sub headers (row 10)
      else if (R === 9) {
        cell.s.font = { bold: true, sz: 10 };
        cell.s.alignment = { vertical: 'center', horizontal: 'center', wrapText: true };
      }

      // Example row (row 11)
      else if (R === 10) {
        cell.s.font = { italic: true, sz: 10 };
        cell.s.alignment = { vertical: 'center', horizontal: C === 0 ? 'center' : 'left', wrapText: true };
      }

      // Empty data rows (rows 12+)
      else if (R >= 11) {
        if (C === 0) {
          cell.s.alignment = { vertical: 'center', horizontal: 'center' };
        } else {
          cell.s.alignment = { vertical: 'center', horizontal: 'left', wrapText: true };
        }
        cell.s.font = { sz: 10 };
      }
    }
  }

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, 'បញ្ជីសិស្ស');

  // Note: xlsx-js-style has limited data validation support
  // Add a second sheet with dropdown options as a reference guide
  const validationGuideData = [
    ['របៀបបំពេញ / How to Fill'],
    [''],
    ['ទម្រង់ទិន្នន័យ / Data Formats:'],
    [''],
    ['1. ភេទ (Gender):', 'ប្រុស', 'ស្រី'],
    ['', 'MALE', 'FEMALE'],
    [''],
    ['2. សញ្ជាតិ (Nationality):', 'ខ្មែរ'],
    [''],
    ['3. ថ្ងៃខែឆ្នាំកំណើត (Date of Birth):', 'dd/mm/yy', 'ឧទាហរណ៍: 15/05/15'],
    [''],
    ['4. ជនជាតិភាគតិច (Ethnic Groups):'],
    ['', 'ជនជាតិភ្នង', 'ជនជាតិរអួង', 'ជនជាតិគួយ'],
    ['', 'ជនជាតិគ្រឹង', 'ជនជាតិរដែរ', 'ជនជាតិស្ទៀង'],
    ['', 'ជនជាតិទំពួន', 'ជនជាតិអានោង', 'ជនជាតិថ្មូន'],
    ['', 'ជនជាតិខា', 'ជនជាតិក្រោល', 'ជនជាតិស្មិល'],
    ['', 'ជនជាតិចារាយ', 'ជនជាតិប្រ៊ូវ', 'ជនជាតិសួយ'],
    [''],
    ['5. លក្ខណៈពិសេស (Accessibility):'],
    ['', 'ពិបាកក្នុងការធ្វើចលនា - Mobility difficulty'],
    ['', 'ពិបាកក្នុងការស្ដាប់ - Hearing difficulty'],
    ['', 'ពិបាកក្នុងការនីយាយ - Speech difficulty'],
    ['', 'ពិបាកក្នុងការមើល - Vision difficulty'],
    ['', 'ពិការសរីរាង្គខាងក្នុង - Internal disability'],
    ['', 'ពិការសតិបញ្ញា - Intellectual disability'],
    ['', 'ពិការផ្លូវចិត្ត - Mental disability'],
    ['', 'ពិការផ្សេងៗ - Other disabilities'],
    [''],
    ['កំណត់សម្គាល់ / Notes:'],
    ['- សូមលុបជួរឧទាហរណ៍ពណ៌បៃតងមុនពេលបញ្ចូលទិន្នន័យ'],
    ['- Please delete the green example row before entering data'],
    ['- សូមចម្លងនិងបិទភ្ជាប់តម្លៃពីតារាងនេះ'],
    ['- Please copy and paste values from this reference sheet']
  ];

  const wsGuide = XLSXStyle.utils.aoa_to_sheet(validationGuideData);

  // Style the guide sheet
  const guideRange = XLSXStyle.utils.decode_range(wsGuide['!ref']);
  for (let R = guideRange.s.r; R <= guideRange.e.r; ++R) {
    for (let C = guideRange.s.c; C <= guideRange.e.c; ++C) {
      const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });
      if (!wsGuide[cellAddress]) continue;

      const cell = wsGuide[cellAddress];
      cell.s = {
        alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };

      // Header rows
      if (R === 0 || R === 2) {
        cell.s.font = { bold: true, sz: 12 };
      }
    }
  }

  // Set column widths for guide sheet
  wsGuide['!cols'] = [
    { wch: 35 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 }
  ];

  XLSXStyle.utils.book_append_sheet(wb, wsGuide, 'របៀបបំពេញ');

  XLSXStyle.writeFile(wb, 'គំរូនាំចូលសិស្ស.xlsx');
};
