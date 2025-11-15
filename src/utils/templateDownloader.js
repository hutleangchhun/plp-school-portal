// Template download utility
import schoolService from './api/services/schoolService';

/**
 * Download student import template
 * @param {number} schoolId - School ID to fetch school name
 */
export const templateDownloader = async (schoolId = null) => {
  // Dynamically import xlsx-js-style for styling support
  const XLSXStyleModule = await import('xlsx-js-style');
  // xlsx-js-style exports as default, but we need to handle both cases
  const XLSXStyle = XLSXStyleModule.default || XLSXStyleModule;

  // Fetch school name if schoolId is provided
  let schoolName = 'សាលាបឋមសិក្សា ..............';
  if (schoolId) {
    try {
      const schoolResponse = await schoolService.getSchoolInfo(schoolId);
      if (schoolResponse?.data?.name) {
        schoolName = schoolResponse.data.name;
      }
    } catch (err) {
      console.warn('Failed to fetch school name for template:', err);
      // Continue with default name
    }
  }

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
      '...................',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    // School Name - Row 4
    [
      schoolName,
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    // Student List Title - Row 5
    [
      'បញ្ជីរាយនាមសិស្ស',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', '', '', '', '', '',
      '', ''
    ],
    // Class and Academic Year - Row 6
    [
      'ឆ្នាំសិក្សា ..............',
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
      'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', 'ព័ត៌មានសិស្ស', // 12 columns for student info (without id and address)
      'ព័ត៌មានឪពុក', 'ព័ត៌មានឪពុក', 'ព័ត៌មានឪពុក', 'ព័ត៌មានឪពុក', 'ព័ត៌មានឪពុក', 'ព័ត៌មានឪពុក', // 6 columns for father
      'ព័ត៌មានម្តាយ', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានម្តាយ', 'ព័ត៌មានម្តាយ', // 6 columns for mother
      'ព័ត៌មានបន្ថែម', 'ព័ត៌មានបន្ថែម' // 2 columns for additional info
    ],
    // Sub headers (row 10)
    [
      '#',
      'គោត្តនាម', 'នាម', 'ឈ្មោះអ្នកប្រើ', 'ពាក្យសម្ងាត់',
      'ថ្ងៃខែឆ្នាំកំណើត', 'ភេទ', 'លេខទូរស័ព្ទ', 'សញ្ជាតិ', 'លេខសាលា', 'ឆ្នាំសិក្សា', 'កម្រិតថ្នាក់',
      'អាសយដ្ឋានពេញ',
      'នាម', 'គោត្តនាម', 'ទូរស័ព្ទ', 'ភេទ', 'មុខរបរ', 'អាសយដ្ឋានពេញឪពុក',
      'នាម', 'គោត្តនាម', 'ទូរស័ព្ទ', 'ភេទ', 'មុខរបរ', 'អាសយដ្ឋានពេញម្តាយ',
      'ជនជាតិភាគតិច', 'លក្ខណៈពិសេស'
    ],
    // Example row with sample data (row 11)
    [
      '1',
      'សុខ', // គោត្តនាម
      'ចន្ថា', // នាម
      'chanthasok', // ឈ្មោះអ្នកប្រើ
      'Student@123', // ពាក្យសម្ងាត់
      '15/05/2005', // ថ្ងៃខែឆ្នាំកំណើត (dd/mm/yyyy)
      'ស្រី', // ភេទ (ប្រុស ឬ ស្រី)
      '012345678', // លេខទូរស័ព្ទ
      'ខ្មែរ', // សញ្ជាតិ
      '123', // លេខសាលា
      '2025-2026', // ឆ្នាំសិក្សា
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
    // 20 Sample students (rows 12-31)
    [
      '2', 'អរុណ', 'សោភា', 'arunsophea', 'Student@123',
      '10/03/2006', 'ស្រី', '012111222', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិក្រាំងជ័យ ឃុំព្រែកគយ ស្រុកបាទី ខេត្តតាកែវ',
      'ចម្លង', 'អរុណ', '011333444', 'ប្រុស', 'ព្រឹក្ខបាល', 'ភូមិក្រាំងជ័យ ឃុំព្រែកគយ ស្រុកបាទី ខេត្តតាកែវ',
      'មេលី', 'សោភា', '012444555', 'ស្រី', 'គ្រូបង្រៀន', 'ភូមិក្រាំងជ័យ ឃុំព្រែកគយ ស្រុកបាទី ខេត្តតាកែវ',
      '', ''
    ],
    [
      '3', 'ក្សត្រ', 'វេទនា', 'ksatravethna', 'Student@123',
      '22/07/2005', 'ស្រី', '012555666', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិចេក ឃុំសាលារក្សយោ ស្រុកកំពត់ ខេត្តកម្ពត់',
      'គឹម', 'ក្សត្រ', '011666777', 'ប្រុស', 'កសិករ', 'ភូមិចេក ឃុំសាលារក្សយោ ស្រុកកំពត់ ខេត្តកម្ពត់',
      'ផល', 'វេទនា', '012777888', 'ស្រី', 'ពាណិជ្ជកម្ម', 'ភូមិចេក ឃុំសាលារក្សយោ ស្រុកកំពត់ ខេត្តកម្ពត់',
      '', ''
    ],
    [
      '4', 'វង្ស', 'រលក់', 'vongsrolak', 'Student@123',
      '05/11/2005', 'ប្រុស', '012888999', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិព្រៀងក្រោម ឃុំផ្នែកឡាច ស្រុកឧត្តរមាンជ័យ ខេត្តកោះកុង',
      'ឆ័ន្ទ', 'វង្ស', '011999000', 'ប្រុស', 'ជួសជុល', 'ភូមិព្រៀងក្រោម ឃុំផ្នែកឡាច ស្រុកឧត្តរមាんជ័យ ខេត្តកោះកុង',
      'គន់', 'រលក់', '012000111', 'ស្រី', 'ឧបាយ', 'ភូមិព្រៀងក្រោម ឃុំផ្នែកឡាច ស្រុកឧត្តរមាんជ័យ ខេត្តកោះកុង',
      '', ''
    ],
    [
      '5', 'កក', 'ផាង', 'kakphang', 'Student@123',
      '18/01/2006', 'ស្រី', '012111222', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិលិច ឃុំលិច ស្រុកលិច ខេត្តលិច',
      'ចាប់', 'កក', '011222333', 'ប្រុស', 'សមរភូមិ', 'ភូមិលិច ឃុំលិច ស្រុកលិច ខេត្តលិច',
      'ឯម', 'ផាង', '012333444', 'ស្រី', 'ពាណិជ្ជកម្ម', 'ភូមិលិច ឃុំលិច ស្រុកលិច ខេត្តលិច',
      '', ''
    ],
    [
      '6', 'ដាំ', 'សែន', 'damsen', 'Student@123',
      '30/08/2005', 'ប្រុស', '012444555', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិគោលក្រឡាប ឃុំក្រុងប្រែង ស្រុកក្រុងប្រែង ខេត្តក្រុងប្រែង',
      'សាល', 'ដាំ', '011555666', 'ប្រុស', 'ឧស្សាហ៍កម្ម', 'ភូមិគោលក្រឡាប ឃុំក្រុងប្រែង ស្រុកក្រុងប្រែង ខេត្តក្រុងប្រែង',
      'មាន', 'សែន', '012666777', 'ស្រី', 'សេវាកម្ម', 'ភូមិគោលក្រឡាប ឃុំក្រុងប្រែង ស្រុកក្រុងប្រែង ខេត្តក្រុងប្រែង',
      '', ''
    ],
    [
      '7', 'នៀម', 'សុខា', 'niumsokha', 'Student@123',
      '14/04/2006', 'ស្រី', '012777888', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិក្រុងលើ ឃុំមោក្ខរ ស្រុកមោក្ខរ ខេត្តមោក្ខរ',
      'វាង', 'នៀម', '011888999', 'ប្រុស', 'ឯកទេស', 'ភូមិក្រុងលើ ឃុំមោក្ខរ ស្រុកមោក្ខរ ខេត្តមោក្ខរ',
      'ផល', 'សុខា', '012999000', 'ស្រី', 'ធានាគារ', 'ភូមិក្រុងលើ ឃុំមោក្ខរ ស្រុកមោក្ខរ ខេត្តមោក្ខរ',
      '', ''
    ],
    [
      '8', 'ឆាយ', 'ណ័រ', 'chaynar', 'Student@123',
      '26/09/2005', 'ប្រុស', '012000111', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិស្វាយលើ ឃុំស្វាយលើ ស្រុកស្វាយលើ ខេត្តស្វាយលើ',
      'សម្ដាច', 'ឆាយ', '011111222', 'ប្រុស', 'ងារផ្សារ', 'ភូមិស្វាយលើ ឃុំស្វាយលើ ស្រុកស្វាយលើ ខេត្តស្វាយលើ',
      'ផល', 'ណ័រ', '012222333', 'ស្រី', 'សិល្បៈ', 'ភូមិស្វាយលើ ឃុំស្វាយលើ ស្រុកស្វាយលើ ខេត្តស្វាយលើ',
      '', ''
    ],
    [
      '9', 'ឡុង', 'អ៊ីវ', 'longiv', 'Student@123',
      '12/12/2005', 'ស្រី', '012333444', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិឈូក ឃុំឈូក ស្រុកឈូក ខេត្តឈូក',
      'ឆង', 'ឡុង', '011444555', 'ប្រុស', 'សាលា', 'ភូមិឈូក ឃុំឈូក ស្រុកឈូក ខេត្តឈូក',
      'នាង', 'អ៊ីវ', '012555666', 'ស្រី', 'ម៉ាតា', 'ភូមិឈូក ឃុំឈូក ស្រុកឈូក ខេត្តឈូក',
      '', ''
    ],
    [
      '10', 'ថ', 'ថា', 'thaitha', 'Student@123',
      '08/06/2006', 'ប្រុស', '012666777', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិព្រែងលើ ឃុំព្រែងលើ ស្រុកព្រែងលើ ខេត្តព្រែងលើ',
      'ប៉ែង', 'ថ', '011777888', 'ប្រុស', 'សមលាប់', 'ភូមិព្រែងលើ ឃុំព្រែងលើ ស្រុកព្រែងលើ ខេត្តព្រែងលើ',
      'សាលី', 'ថា', '012888999', 'ស្រី', 'សង្ឃ', 'ភូមិព្រែងលើ ឃុំព្រែងលើ ស្រុកព្រែងលើ ខេត្តព្រែងលើ',
      '', ''
    ],
    [
      '11', 'សូលឹម', 'ទេព', 'solutem', 'Student@123',
      '21/10/2005', 'ស្រី', '012999000', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិកូនអង្ក ឃុំឡុងវែង ស្រុកឡុងវែង ខេត្តឡុងវែង',
      'កាលើង', 'សូលឹម', '011000111', 'ប្រុស', 'ឆាប់បង្រៀន', 'ភូមិកូនអង្ក ឃុំឡុងវែង ស្រុកឡុងវែង ខេត្តឡុងវែង',
      'គិត', 'ទេព', '012111222', 'ស្រី', 'វិទ្យាលัយ', 'ភូមិកូនអង្ក ឃុំឡុងវែង ស្រុកឡុងវែង ខេត្តឡុងវែង',
      '', ''
    ],
    [
      '12', 'បូត្រ', 'ផល', 'boutraphal', 'Student@123',
      '17/02/2006', 'ប្រុស', '012222333', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិលេងលូង ឃុំលេងលូង ស្រុកលេងលូង ខេត្តលេងលូង',
      'សុម', 'បូត្រ', '011333444', 'ប្រុស', 'អាជ្ញាធរ', 'ភូមិលេងលូង ឃុំលេងលូង ស្រុកលេងលូង ខេត្តលេងលូង',
      'គន់', 'ផល', '012444555', 'ស្រី', 'ចំណាយ', 'ភូមិលេងលូង ឃុំលេងលូង ស្រុកលេងលូង ខេត្តលេងលូង',
      '', ''
    ],
    [
      '13', 'វាង', 'មនោរម្យ', 'wangmanoromy', 'Student@123',
      '29/05/2005', 'ស្រី', '012555666', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិពោធិ៍សាលា ឃុំពោធិ៍សាលា ស្រុកពោធិ៍សាលា ខេត្តពោធិ៍សាលា',
      'វឹង', 'វាង', '011666777', 'ប្រុស', 'សេរីលាភ', 'ភូមិពោធិ៍សាលា ឃុំពោធិ៍សាលា ស្រុកពោធិ៍សាលា ខេត្តពោធិ៍សាលា',
      'ឯម', 'មនោរម្យ', '012777888', 'ស្រី', 'ឧស្សាហ៍', 'ភូមិពោធិ៍សាលា ឃុំពោធិ៍សាលា ស្រុកពោធិ៍សាលា ខេត្តពោធិ៍សាលា',
      '', ''
    ],
    [
      '14', 'រ័ត្ន', 'មិនហោច', 'ratnamihnohc', 'Student@123',
      '11/07/2006', 'ប្រុស', '012888999', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិឥស្សរមឹក ឃុំឥស្សរមឹក ស្រុកឥស្សរមឹក ខេត្តឥស្សរមឹក',
      'ឆ័ន្ទ', 'រ័ត្ន', '011999000', 'ប្រុស', 'ផលិតកម្ម', 'ភូមិឥស្សរមឹក ឃុំឥស្សរមឹក ស្រុកឥស្សរមឹក ខេត្តឥស្សរមឹក',
      'ផល', 'មិនហោច', '012000111', 'ស្រី', 'ហិរញ្ញវត្ថុ', 'ភូមិឥស្សរមឹក ឃុំឥស្សរមឹក ស្រុកឥស្សរមឹក ខេត្តឥស្សរមឹក',
      '', ''
    ],
    [
      '15', 'ឯក', 'លក្ខិយ', 'eklakkhiy', 'Student@123',
      '03/03/2005', 'ស្រី', '012111222', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិក្រុងលើ ឃុំក្រុងលើ ស្រុកក្រុងលើ ខេត្តក្រុងលើ',
      'សង្គម', 'ឯក', '011222333', 'ប្រុស', 'ធានា', 'ភូមិក្រុងលើ ឃុំក្រុងលើ ស្រុកក្រុងលើ ខេត្តក្រុងលើ',
      'វលា', 'លក្ខិយ', '012333444', 'ស្រី', 'អគ្គលេខាធិការ', 'ភូមិក្រុងលើ ឃុំក្រុងលើ ស្រុកក្រុងលើ ខេត្តក្រុងលើ',
      '', ''
    ],
    [
      '16', 'រើង', 'លីលា', 'reunglila', 'Student@123',
      '24/11/2005', 'ស្រី', '012444555', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិក្រុងក្រោម ឃុំក្រុងក្រោម ស្រុកក្រុងក្រោម ខេត្តក្រុងក្រោម',
      'ឯម', 'រើង', '011555666', 'ប្រុស', 'ឆ្វេង', 'ភូមិក្រុងក្រោម ឃុំក្រុងក្រោម ស្រុកក្រុងក្រោម ខេត្តក្រុងក្រោម',
      'គន់', 'លីលា', '012666777', 'ស្រី', 'រៀបច្ប់', 'ភូមិក្រុងក្រោម ឃុំក្រុងក្រោម ស្រុកក្រុងក្រោម ខេត្តក្រុងក្រោម',
      '', ''
    ],
    [
      '17', 'ស៊ុង', 'ម៉ាង', 'sungmang', 'Student@123',
      '16/08/2006', 'ប្រុស', '012777888', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិក្រុងលើ ឃុំក្រុងលើ ស្រុកក្រុងលើ ខេត្តក្រុងលើ',
      'ពេទ្យ', 'ស៊ុង', '011888999', 'ប្រុស', 'ពេទ្យ', 'ភូមិក្រុងលើ ឃុំក្រុងលើ ស្រុកក្រុងលើ ខេត្តក្រុងលើ',
      'ស៊ុង', 'ម៉ាង', '012999000', 'ស្រី', 'ពេទ្យ', 'ភូមិក្រុងលើ ឃុំក្រុងលើ ស្រុកក្រុងលើ ខេត្តក្រុងលើ',
      '', ''
    ],
    [
      '18', 'ល', 'វង្ស', 'lovongs', 'Student@123',
      '09/04/2005', 'ស្រី', '012000111', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិឡើងលើ ឃុំឡើងលើ ស្រុកឡើងលើ ខេត្តឡើងលើ',
      'ល័ក្ខ', 'ល', '011111222', 'ប្រុស', 'ទីសាលា', 'ភូមិឡើងលើ ឃុំឡើងលើ ស្រុកឡើងលើ ខេត្តឡើងលើ',
      'សម', 'វង្ស', '012222333', 'ស្រី', 'ស្រឡាញ់លូ', 'ភូមិឡើងលើ ឃុំឡើងលើ ស្រុកឡើងលើ ខេត្តឡើងលើ',
      '', ''
    ],
    [
      '19', 'ស៊ីលី', 'វិច័ย', 'sillivichay', 'Student@123',
      '20/01/2006', 'ប្រុស', '012333444', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិលើង ឃុំលើង ស្រុកលើង ខេត្តលើង',
      'សាលា', 'ស៊ីលី', '011444555', 'ប្រុស', 'បងប្រុស', 'ភូមិលើង ឃុំលើង ស្រុកលើង ខេត្តលើង',
      'ឤណា', 'វិច័យ', '012555666', 'ស្រី', 'សង្ហា', 'ភូមិលើង ឃុំលើង ស្រុកលើង ខេត្តលើង',
      '', ''
    ],
    [
      '20', 'កក្ក', 'ប៉ូ', 'kakpo', 'Student@123',
      '13/09/2005', 'ស្រី', '012666777', 'ខ្មែរ', '123', '2025-2026', '4',
      'ភូមិលើង ឃុំលើង ស្រុកលើង ខេត្តលើង',
      'ព័រ', 'កក្ក', '011777888', 'ប្រុស', 'ដើលើង', 'ភូមិលើង ឃុំលើង ស្រុកលើង ខេត្តលើង',
      'រៀង', 'ប៉ូ', '012888999', 'ស្រី', 'ឧស្សា', 'ភូមិលើង ឃុំលើង ស្រុកលើង ខេត្តលើង',
      '', ''
    ]
  ];

  const ws = XLSXStyle.utils.aoa_to_sheet(templateData);

  // Set column widths for better readability
  const colWidths = [
    { wch: 5 }, // #
    { wch: 15 }, // Last Name
    { wch: 15 }, // First Name
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
  ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 27 } });

  // Row 2: Nation/Religion/King spans all columns
  ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 27 } });

  // Row 3: Administrative district spans all columns
  ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 27 } });

  // Row 4: School name spans all columns
  ws['!merges'].push({ s: { r: 3, c: 0 }, e: { r: 3, c: 27 } });

  // Row 5: Student list title spans all columns
  ws['!merges'].push({ s: { r: 4, c: 0 }, e: { r: 4, c: 27 } });

  // Row 6: Class and academic year spans all columns
  ws['!merges'].push({ s: { r: 5, c: 0 }, e: { r: 5, c: 27 } });

  // Row 8: Instructions spans all columns
  ws['!merges'].push({ s: { r: 7, c: 0 }, e: { r: 7, c: 27 } });

  // Row 9: Main headers - merge student info columns
  ws['!merges'].push({ s: { r: 8, c: 1 }, e: { r: 8, c: 12 } }); // Student info (12 columns)
  ws['!merges'].push({ s: { r: 8, c: 13 }, e: { r: 8, c: 18 } }); // Father info (6 columns)
  ws['!merges'].push({ s: { r: 8, c: 19 }, e: { r: 8, c: 24 } }); // Mother info (6 columns)
  ws['!merges'].push({ s: { r: 8, c: 25 }, e: { r: 8, c: 26 } }); // Additional info (2 columns)

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
    ['3. ថ្ងៃខែឆ្នាំកំណើត (Date of Birth):', 'dd/mm/yyyy', 'ឧទាហរណ៍: 15/05/2005'],
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
