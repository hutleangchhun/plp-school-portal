/**
 * Report Data Transform Utilities
 * Handles transformation of raw data for 13 different report types
 */

/**
 * Report 1: Student Name & Info List (បញ្ជីហៅឈ្មោះសិស្ស)
 * Returns basic student information
 */
export const transformStudentNameInfoReport = (rawData) => {
  if (!Array.isArray(rawData)) return [];

  return rawData.map((student, index) => ({
    no: index + 1,
    studentId: student.studentId || student.id || '',
    khmerName: student.khmerName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || '',
    englishName: student.englishName || student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || '',
    gender: (student.gender === 'M' || student.gender === 'MALE') ? 'ប្រុស' : 'ស្រី',
    dateOfBirth: student.dateOfBirth || '',
    class: student.class?.name || '',
    contact: student.phone || student.contact || student.email || ''
  }));
};

/**
 * Report 2: Student List by Class (បញ្ជីហៅឈ្មោះសិស្សតាមថ្នាក់)
 * Groups students by class with count - returns flat array for Excel export
 */
export const transformStudentByClassReport = (rawData) => {
  if (!Array.isArray(rawData)) return [];

  const grouped = rawData.reduce((acc, student) => {
    const className = student.class?.name || 'Unknown';
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(student);
    return acc;
  }, {});

  // Flatten the grouped data into a single array for Excel export
  const result = [];
  let globalIndex = 1;
  
  Object.entries(grouped).forEach(([className, students]) => {
    students.forEach((s) => {
      result.push({
        no: globalIndex++,
        className: className,
        studentId: s.studentId || s.id,
        khmerName: s.khmerName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.name || '',
        englishName: s.englishName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || '',
        gender: (s.gender === 'M' || s.gender === 'MALE') ? 'ប្រុស' : 'ស្រី',
        dateOfBirth: s.dateOfBirth || '',
        contact: s.phone || s.contact || s.email || ''
      });
    });
  });

  return result;
};

/**
 * Report 3: Student Average Grades (បញ្ជីមធ្យមភាគសិស្ស)
 * Shows student grades and averages
 */
export const transformStudentAverageGradesReport = (rawData) => {
  if (!Array.isArray(rawData)) return [];

  return rawData.map((student, index) => {
    const grades = student.grades || student.scores || [];
    const average = student.averageScore || (grades.length > 0
      ? (grades.reduce((sum, g) => sum + (g.score || 0), 0) / grades.length).toFixed(2)
      : 0);

    return {
      no: index + 1,
      studentId: student.studentId || student.id,
      khmerName: student.khmerName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || '',
      englishName: student.englishName || student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || '',
      class: student.class?.name || '',
      totalSubjects: grades.length,
      average: parseFloat(average),
      gradeDistribution: {
        excellent: grades.filter(g => g.score >= 80).length,
        good: grades.filter(g => g.score >= 60 && g.score < 80).length,
        fair: grades.filter(g => g.score >= 40 && g.score < 60).length,
        poor: grades.filter(g => g.score < 40).length
      }
    };
  });
};

/**
 * Report 4: Student Absence List (បញ្ជីអវត្តមានសិស្ស)
 * Shows students with high absence records
 */
export const transformStudentAbsenceReport = (rawData) => {
  if (!Array.isArray(rawData)) return [];

  return rawData
    .map((student, index) => {
      const absences = student.attendances?.filter(a => a.status === 'ABSENT') || [];
      const leaves = student.attendances?.filter(a => a.status === 'LEAVE') || [];
      const totalAbsenceAndLeave = absences.length + leaves.length;
      
      // Determine gender
      let gender = '';
      if (student.gender === 'MALE' || student.gender === 'M' || student.gender === 'male') {
        gender = 'ប្រុស';
      } else if (student.gender === 'FEMALE' || student.gender === 'F' || student.gender === 'female') {
        gender = 'ស្រី';
      }
      
      return {
        no: index + 1,
        studentId: student.studentId || student.id,
        khmerName: student.khmerName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || '',
        englishName: student.englishName || student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || '',
        gender: gender,
        class: student.class?.name || '',
        totalAbsences: absences.length,
        totalLeave: leaves.length,
        totalAbsenceAndLeave: totalAbsenceAndLeave,
        absencePercentage: student.attendances
          ? ((totalAbsenceAndLeave / student.attendances.length) * 100).toFixed(2)
          : 0,
        remarks: ''
      };
    })
    .sort((a, b) => b.totalAbsenceAndLeave - a.totalAbsenceAndLeave);
};

/**
 * Report 5: Students with Nutrition Support (បញ្ជីឈ្មោះសិស្សអាហារូបករណ៍)
 * Lists students receiving nutrition assistance
 */
export const transformNutritionSupportReport = (rawData) => {
  if (!Array.isArray(rawData)) return [];

  return rawData
    .filter(student => student.nutritionSupport === true || student.hasNutritionSupport === true)
    .map((student, index) => ({
      no: index + 1,
      studentId: student.id,
      khmerName: student.khmerName,
      englishName: student.englishName,
      class: student.class?.name || '',
      supportType: student.nutritionSupportType || 'Standard',
      startDate: student.nutritionStartDate || '',
      status: student.nutritionStatus || 'Active'
    }));
};

/**
 * Report 6: Students with Disabilities (បញ្ជីឈ្មោះសិស្សមានពិការភាព)
 * Lists students with disabilities
 */
export const transformDisabilityReport = (rawData) => {
  if (!Array.isArray(rawData)) return [];

  return rawData
    .filter(student => student.disability || student.hasDisability)
    .map((student, index) => ({
      no: index + 1,
      studentId: student.id,
      khmerName: student.khmerName,
      englishName: student.englishName,
      class: student.class?.name || '',
      disabilityType: student.disabilityType || 'Unknown',
      severity: student.disabilitySeverity || 'Moderate',
      specialNeeds: student.specialNeeds || 'None',
      assistanceRequired: student.disabilityAssistance || false
    }));
};

/**
 * Report 7: Students with Health Issues (បញ្ជីឈ្មោះសិស្សមានបញ្ហាសុខភាព)
 * Lists students with health concerns
 */
export const transformHealthIssuesReport = (rawData) => {
  if (!Array.isArray(rawData)) return [];

  return rawData
    .filter(student => student.healthIssues && student.healthIssues.length > 0)
    .map((student, index) => ({
      no: index + 1,
      studentId: student.id,
      khmerName: student.khmerName,
      englishName: student.englishName,
      class: student.class?.name || '',
      healthIssues: (student.healthIssues || []).join(', '),
      lastCheckup: student.lastHealthCheckup || '',
      medication: student.currentMedication || 'None',
      parentContact: student.parentContact || ''
    }));
};

/**
 * Report 8: Students with Personal Issues (បញ្ជីឈ្មោះសិស្សមានបញ្ហាផ្ទាល់ខ្លួន)
 * Lists students with personal/social issues
 */
export const transformPersonalIssuesReport = (rawData) => {
  if (!Array.isArray(rawData)) return [];

  return rawData
    .filter(student => student.personalIssues && student.personalIssues.length > 0)
    .map((student, index) => ({
      no: index + 1,
      studentId: student.id,
      khmerName: student.khmerName,
      englishName: student.englishName,
      class: student.class?.name || '',
      issues: (student.personalIssues || []).join(', '),
      severity: student.issuesSeverity || 'Low',
      counsellorAssigned: student.counsellorId ? 'Yes' : 'No',
      followUpDate: student.issuesFollowUpDate || ''
    }));
};

/**
 * Report 9: Indigenous/Minority Students (បញ្ជីឈ្មោះសិស្សជាជនជាតិដើមភាគតិច)
 * Lists indigenous and ethnic minority students
 */
export const transformIndigenousMinorityReport = (rawData) => {
  if (!Array.isArray(rawData)) return [];

  return rawData
    .filter(student => student.ethnicity && ['Indigenous', 'Minority', 'Hill Tribe'].includes(student.ethnicity))
    .map((student, index) => ({
      no: index + 1,
      studentId: student.id,
      khmerName: student.khmerName,
      englishName: student.englishName,
      class: student.class?.name || '',
      ethnicity: student.ethnicity,
      language: student.nativeLanguage || 'Unknown',
      culturalBackground: student.culturalBackground || '',
      specialSupport: student.minoritySupport || 'None'
    }));
};

/**
 * Report 10: Students Who Changed Classes (បញ្ជីឈ្មោះសិស្សផ្លាស់ប្ដូរថ្នាក់)
 * Lists students who transferred between classes
 */
export const transformClassChangeReport = (rawData) => {
  if (!Array.isArray(rawData)) return [];

  return rawData
    .filter(student => student.classHistory && student.classHistory.length > 1)
    .map((student, index) => {
      const history = student.classHistory || [];
      return {
        no: index + 1,
        studentId: student.id,
        khmerName: student.khmerName,
        englishName: student.englishName,
        currentClass: student.class?.name || '',
        previousClass: history.length > 1 ? history[history.length - 2].className : 'N/A',
        transferDate: history[history.length - 1]?.transferDate || '',
        reason: history[history.length - 1]?.reason || 'Academic',
        totalTransfers: history.length - 1
      };
    });
};

/**
 * Report 11: Students Who Dropped Out (បញ្ជីឈ្មោះសិស្សបោះបង់ការសិក្សារ)
 * Lists students who discontinued studies
 */
export const transformDropoutReport = (rawData) => {
  if (!Array.isArray(rawData)) return [];

  return rawData
    .filter(student => student.status === 'DROPPED_OUT' || student.isDroppedOut)
    .map((student, index) => ({
      no: index + 1,
      studentId: student.id,
      khmerName: student.khmerName,
      englishName: student.englishName,
      class: student.lastClass?.name || '',
      dropoutDate: student.dropoutDate || '',
      reason: student.dropoutReason || 'Unknown',
      lastGPA: student.lastGPA || 'N/A',
      parentNotification: student.parentNotified ? 'Yes' : 'No',
      followUpAction: student.followUpAction || 'Pending'
    }));
};

/**
 * Report 12: Student Tracking Record (សៀវភៅតាមដាន)
 * Comprehensive student monitoring/tracking information
 */
export const transformStudentTrackingReport = (rawData) => {
  if (!Array.isArray(rawData)) return [];

  return rawData.map((student, index) => {
    const attendances = student.attendances || [];
    const presents = attendances.filter(a => a.status === 'PRESENT').length;
    const absences = attendances.filter(a => a.status === 'ABSENT').length;
    const late = attendances.filter(a => a.status === 'LATE').length;
    const leaves = attendances.filter(a => a.status === 'LEAVE').length;

    return {
      no: index + 1,
      studentId: student.id,
      khmerName: student.khmerName,
      englishName: student.englishName,
      class: student.class?.name || '',
      enrollmentDate: student.enrollmentDate || '',
      status: student.status || 'Active',
      attendanceRate: attendances.length > 0
        ? ((presents / attendances.length) * 100).toFixed(2)
        : 0,
      presents,
      absences,
      late,
      leaves,
      academicProgress: student.academicProgress || 'On Track',
      behaviorRating: student.behaviorRating || 'Good',
      lastReviewDate: student.lastReviewDate || ''
    };
  });
};

/**
 * Report 13: Student Conduct Record (សៀវភៅសិក្ខាគារិក)
 * Student behavior and conduct information
 */
export const transformConductReport = (rawData) => {
  if (!Array.isArray(rawData)) return [];

  return rawData.map((student, index) => {
    const infractions = student.infractions || [];
    const awards = student.awards || [];

    return {
      no: index + 1,
      studentId: student.id,
      khmerName: student.khmerName,
      englishName: student.englishName,
      class: student.class?.name || '',
      overallConductRating: student.conductRating || 'Good',
      totalInfractions: infractions.length,
      minorInfractions: infractions.filter(i => i.severity === 'Minor').length,
      majorInfractions: infractions.filter(i => i.severity === 'Major').length,
      totalAwards: awards.length,
      recentInfraction: infractions.length > 0 ? infractions[0]?.description : 'None',
      recentAward: awards.length > 0 ? awards[0]?.title : 'None',
      lastReviewDate: student.lastConductReview || '',
      parentCommunicated: student.parentCommunicated ? 'Yes' : 'No'
    };
  });
};

/**
 * Mapping of report types to their transform functions
 */
export const reportTransformers = {
  report1: transformStudentNameInfoReport,
  reportStudent: transformStudentNameInfoReport,
  report2: transformStudentByClassReport,
  report3: transformStudentAverageGradesReport,
  report4: transformStudentAbsenceReport,
  report5: transformNutritionSupportReport,
  report6: transformDisabilityReport,
  report7: transformHealthIssuesReport,
  report8: transformPersonalIssuesReport,
  report9: transformIndigenousMinorityReport,
  report10: transformClassChangeReport,
  report11: transformDropoutReport,
  report12: transformStudentTrackingReport,
  report13: transformConductReport
};

/**
 * Get column headers for a specific report type
 */
export const getReportColumns = (reportType) => {
  const columnMap = {
    report1: [
      { header: 'No.', key: 'no' },
      { header: 'Student ID', key: 'studentId' },
      { header: 'Khmer Name', key: 'khmerName' },
      { header: 'English Name', key: 'englishName' },
      { header: 'Gender', key: 'gender' },
      { header: 'Date of Birth', key: 'dateOfBirth' },
      { header: 'Class', key: 'class' },
      { header: 'Contact', key: 'contact' }
    ],
    report2: [
      { header: 'No.', key: 'no' },
      { header: 'Class', key: 'className' },
      { header: 'Total Students', key: 'totalStudents' }
    ],
    report3: [
      { header: 'No.', key: 'no' },
      { header: 'Student ID', key: 'studentId' },
      { header: 'Khmer Name', key: 'khmerName' },
      { header: 'English Name', key: 'englishName' },
      { header: 'Class', key: 'class' },
      { header: 'Total Subjects', key: 'totalSubjects' },
      { header: 'Average Grade', key: 'average' }
    ],
    report4: [
      { header: 'ល.រ', key: 'no' },
      { header: 'អត្តលេខ', key: 'studentId' },
      { header: 'គោត្តនាម និងនាម', key: 'khmerName' },
      { header: 'ភេទ', key: 'gender' },
      { header: 'ថ្នាក់', key: 'class' },
      { header: 'អច្ប', key: 'totalAbsences' },
      { header: 'ច្ប', key: 'totalLeave' },
      { header: 'សរុប', key: 'totalAbsenceAndLeave' },
      { header: 'សេចក្ដីផ្សេងៗ', key: 'remarks' }
    ],
    report5: [
      { header: 'No.', key: 'no' },
      { header: 'Student ID', key: 'studentId' },
      { header: 'Khmer Name', key: 'khmerName' },
      { header: 'English Name', key: 'englishName' },
      { header: 'Class', key: 'class' },
      { header: 'Support Type', key: 'supportType' },
      { header: 'Start Date', key: 'startDate' },
      { header: 'Status', key: 'status' }
    ],
    report6: [
      { header: 'No.', key: 'no' },
      { header: 'Student ID', key: 'studentId' },
      { header: 'Khmer Name', key: 'khmerName' },
      { header: 'English Name', key: 'englishName' },
      { header: 'Class', key: 'class' },
      { header: 'Disability Type', key: 'disabilityType' },
      { header: 'Severity', key: 'severity' },
      { header: 'Special Needs', key: 'specialNeeds' }
    ],
    report7: [
      { header: 'No.', key: 'no' },
      { header: 'Student ID', key: 'studentId' },
      { header: 'Khmer Name', key: 'khmerName' },
      { header: 'English Name', key: 'englishName' },
      { header: 'Class', key: 'class' },
      { header: 'Health Issues', key: 'healthIssues' },
      { header: 'Last Checkup', key: 'lastCheckup' },
      { header: 'Medication', key: 'medication' }
    ],
    report8: [
      { header: 'No.', key: 'no' },
      { header: 'Student ID', key: 'studentId' },
      { header: 'Khmer Name', key: 'khmerName' },
      { header: 'English Name', key: 'englishName' },
      { header: 'Class', key: 'class' },
      { header: 'Issues', key: 'issues' },
      { header: 'Severity', key: 'severity' },
      { header: 'Follow-up Date', key: 'followUpDate' }
    ],
    report9: [
      { header: 'No.', key: 'no' },
      { header: 'Student ID', key: 'studentId' },
      { header: 'Khmer Name', key: 'khmerName' },
      { header: 'English Name', key: 'englishName' },
      { header: 'Class', key: 'class' },
      { header: 'Ethnicity', key: 'ethnicity' },
      { header: 'Language', key: 'language' },
      { header: 'Special Support', key: 'specialSupport' }
    ],
    report10: [
      { header: 'No.', key: 'no' },
      { header: 'Student ID', key: 'studentId' },
      { header: 'Khmer Name', key: 'khmerName' },
      { header: 'English Name', key: 'englishName' },
      { header: 'Current Class', key: 'currentClass' },
      { header: 'Previous Class', key: 'previousClass' },
      { header: 'Transfer Date', key: 'transferDate' },
      { header: 'Reason', key: 'reason' }
    ],
    report11: [
      { header: 'No.', key: 'no' },
      { header: 'Student ID', key: 'studentId' },
      { header: 'Khmer Name', key: 'khmerName' },
      { header: 'English Name', key: 'englishName' },
      { header: 'Class', key: 'class' },
      { header: 'Dropout Date', key: 'dropoutDate' },
      { header: 'Reason', key: 'reason' },
      { header: 'Last GPA', key: 'lastGPA' }
    ],
    report12: [
      { header: 'No.', key: 'no' },
      { header: 'Student ID', key: 'studentId' },
      { header: 'Khmer Name', key: 'khmerName' },
      { header: 'English Name', key: 'englishName' },
      { header: 'Class', key: 'class' },
      { header: 'Status', key: 'status' },
      { header: 'Attendance Rate %', key: 'attendanceRate' },
      { header: 'Present', key: 'presents' },
      { header: 'Absent', key: 'absences' },
      { header: 'Late', key: 'late' },
      { header: 'Academic Progress', key: 'academicProgress' }
    ],
    report13: [
      { header: 'No.', key: 'no' },
      { header: 'Student ID', key: 'studentId' },
      { header: 'Khmer Name', key: 'khmerName' },
      { header: 'English Name', key: 'englishName' },
      { header: 'Class', key: 'class' },
      { header: 'Conduct Rating', key: 'overallConductRating' },
      { header: 'Total Infractions', key: 'totalInfractions' },
      { header: 'Major Infractions', key: 'majorInfractions' },
      { header: 'Total Awards', key: 'totalAwards' }
    ]
  };

  return columnMap[reportType] || [];
};

/**
 * Export report data to Excel with traditional Khmer format
 */
export const exportReportToExcel = async (
  reportType,
  transformedData,
  reportName,
  periodInfo,
  schoolName
) => {
  try {
    // Use custom absence report export for report4
    if (reportType === 'report4') {
      return await exportAbsenceReportToExcel(transformedData, reportName, periodInfo, schoolName);
    }

    // Dynamically import xlsx-js-style
    const XLSXStyleModule = await import('xlsx-js-style');
    const XLSX = XLSXStyleModule.default || XLSXStyleModule;

    const columns = getReportColumns(reportType);
    const dateStr = new Date().toISOString().split('T')[0];
    const currentDate = new Date().toLocaleDateString('km-KH', { year: 'numeric', month: 'long', day: 'numeric' });

    // Build worksheet data with traditional Khmer header (matching studentExportUtils)
    const wsData = [];

    // Traditional Khmer header (rows 0-8) - exact format from studentExportUtils
    wsData.push(['ព្រះរាជាណាចក្រកម្ពុជា']); // Row 0: Kingdom of Cambodia
    wsData.push(['ជាតិ       សាសនា       ព្រះមហាក្សត្រ']); // Row 1: Nation Religion King
    wsData.push([schoolName || 'សាលាបថមសិក្សា ...........']); // Row 2: School name
    wsData.push([reportName]); // Row 3: Report title
    wsData.push([`${periodInfo}`]); // Row 4: Period info with academic year
    wsData.push([]); // Row 5: Empty
    wsData.push([]); // Row 6: Empty
    wsData.push([]); // Row 7: Empty
    wsData.push([]); // Row 8: Empty

    // Add header row (row 9)
    wsData.push(columns.map(col => col.header));

    // Add data rows (starting from row 10)
    if (Array.isArray(transformedData)) {
      transformedData.forEach((item) => {
        const row = columns.map(col => {
          const value = item[col.key];
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
          }
          return value !== undefined && value !== null ? value : '';
        });
        wsData.push(row);
      });
    }

    // Add footer section with signature areas
    wsData.push([]); // Empty row
    wsData.push([]); // Empty row
    
    // Signature row with three columns: left (teacher), center (empty), right (director)
    const signatureRow = new Array(columns.length).fill('');
    signatureRow[0] = 'គ្រូបង្រានរូបរ៉ាប់រង'; // Teacher signature (left)
    if (columns.length > 2) {
      signatureRow[Math.floor(columns.length / 2)] = ''; // Center empty
      signatureRow[columns.length - 1] = 'នាយកសាលា'; // Director signature (right)
    }
    wsData.push(signatureRow);
    
    wsData.push([]); // Empty row for signature space
    wsData.push([]); // Empty row for signature space
    wsData.push([]); // Empty row for signature space

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = columns.map(col => ({
      wch: Math.max(col.header.length + 2, 12)
    }));
    worksheet['!cols'] = colWidths;

    // Set cell merges for header rows (rows 0-8)
    const numCols = columns.length;
    const dataEndRow = 10 + transformedData.length - 1; // Last data row
    const signatureRowIndex = dataEndRow + 3; // Signature row position
    
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } }, // Kingdom of Cambodia
      { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } }, // Nation Religion King
      { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } }, // School name
      { s: { r: 3, c: 0 }, e: { r: 3, c: numCols - 1 } }, // Report title
      { s: { r: 4, c: 0 }, e: { r: 4, c: numCols - 1 } }, // Period info
      { s: { r: 5, c: 0 }, e: { r: 5, c: numCols - 1 } }, // Empty
      { s: { r: 6, c: 0 }, e: { r: 6, c: numCols - 1 } }, // Empty
      { s: { r: 7, c: 0 }, e: { r: 7, c: numCols - 1 } }, // Empty
      { s: { r: 8, c: 0 }, e: { r: 8, c: numCols - 1 } }  // Empty
    ];

    // Apply styling to all cells
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: 's', v: '' };

        // Top header rows (0-8) - centered bold with Khmer font
        if (R < 9) {
          worksheet[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'center' },
            font: { name: 'Khmer OS Battambang', sz: 11, bold: true }
          };
        }
        // Header row (9)
        else if (R === 9) {
          worksheet[cellAddress].s = {
            fill: { fgColor: { rgb: '4472C4' } },
            font: { name: 'Khmer OS Battambang', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          };
        }
        // Signature and footer rows (after data)
        else if (R > 10 + transformedData.length) {
          worksheet[cellAddress].s = {
            font: { name: 'Khmer OS Battambang', sz: 11, bold: R === (10 + transformedData.length + 3) },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
        // Data rows
        else {
          const isEvenRow = (R - 10) % 2 === 0;
          worksheet[cellAddress].s = {
            fill: { fgColor: { rgb: isEvenRow ? 'F2F2F2' : 'FFFFFF' } },
            font: { name: 'Khmer OS Battambang', sz: 10 },
            alignment: { horizontal: C === 0 ? 'center' : 'left', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: 'D0D0D0' } },
              bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
              left: { style: 'thin', color: { rgb: 'D0D0D0' } },
              right: { style: 'thin', color: { rgb: 'D0D0D0' } }
            }
          };
        }
      }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'រាយការ');

    // Write file with sanitized filename
    const sanitizedReportName = reportName.replace(/[^a-zA-Z0-9\u1780-\u17FF]/g, '_');
    XLSX.writeFile(workbook, `${sanitizedReportName}_${dateStr}.xlsx`);

    return true;
  } catch (error) {
    console.error('Error exporting report:', error);
    throw error;
  }
};

/**
 * Process and export a report
 * Combines transformation and Excel export
 */
/**
 * Custom export for absence report (report4) with attendance-style format
 */
export const exportAbsenceReportToExcel = async (
  transformedData,
  reportName,
  periodInfo,
  schoolName
) => {
  try {
    const XLSXStyleModule = await import('xlsx-js-style');
    const XLSX = XLSXStyleModule.default || XLSXStyleModule;

    const dateStr = new Date().toISOString().split('T')[0];
    const currentDate = new Date().toLocaleDateString('km-KH', { year: 'numeric', month: 'long', day: 'numeric' });

    // Calculate totals
    const totalStudents = transformedData.length;
    const femaleStudents = transformedData.filter(s => s.gender === 'ស្រី').length;
    const maleStudents = totalStudents - femaleStudents;

    // Build worksheet data
    const wsData = [];

    // Traditional Khmer header (rows 0-8)
    wsData.push(['ព្រះរាជាណាចក្រកម្ពុជា']); // Kingdom of Cambodia
    wsData.push(['ជាតិ       សាសនា       ព្រះមហាក្សត្រ']); // Nation Religion King
    wsData.push([schoolName || 'សាលាបថមសិក្សា ...........']); // School name
    wsData.push([reportName]); // Report title
    wsData.push([periodInfo]); // Period info
    wsData.push([`ថ្ងៃទី: ${currentDate}`]); // Date
    wsData.push([]); // Empty
    wsData.push([`សិស្សសរុប: ${totalStudents}នាក់  ប្រុស: ${maleStudents}នាក់  ស្រី: ${femaleStudents}នាក់`]); // Student counts
    wsData.push([]); // Empty

    // Header row (row 9)
    wsData.push(['ល.រ', 'អត្តលេខ', 'គោត្តនាម និងនាម', 'ភេទ', 'ថ្នាក់', 'អច្ប', 'ច្ប', 'សរុប', 'សេចក្ដីផ្សេងៗ']);

    // Data rows (starting from row 10)
    transformedData.forEach((item) => {
      wsData.push([
        item.no || '',
        item.studentId || '',
        item.khmerName || '',
        item.gender || '',
        item.class || '',
        item.totalAbsences || 0,
        item.totalLeave || 0,
        item.totalAbsenceAndLeave || 0,
        item.remarks || ''
      ]);
    });

    // Footer section
    wsData.push([]); // Empty row
    wsData.push([]); // Empty row

    // Signature row
    const numCols = 9;
    const signatureRow = new Array(numCols).fill('');
    signatureRow[1] = 'បានឃើើញ'; // Left: Seen by
    signatureRow[7] = 'គ្រូប្រចាំថ្នាក់'; // Right: Class teacher
    wsData.push(signatureRow);

    const positionRow = new Array(numCols).fill('');
    positionRow[1] = 'នាយកសាលា'; // Director
    wsData.push(positionRow);

    wsData.push(new Array(numCols).fill('')); // Empty for signature
    wsData.push(new Array(numCols).fill('')); // Empty for signature
    wsData.push(new Array(numCols).fill('')); // Empty for signature

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },  // No
      { wch: 12 }, // Student ID
      { wch: 25 }, // Name
      { wch: 5 },  // Gender
      { wch: 12 }, // Class
      { wch: 6 },  // Absent
      { wch: 6 },  // Leave
      { wch: 6 },  // Total
      { wch: 20 }  // Remarks
    ];

    // Set cell merges
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Kingdom
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Nation Religion King
      { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }, // School
      { s: { r: 3, c: 0 }, e: { r: 3, c: 8 } }, // Title
      { s: { r: 4, c: 0 }, e: { r: 4, c: 8 } }, // Period
      { s: { r: 5, c: 0 }, e: { r: 5, c: 8 } }, // Date
      { s: { r: 6, c: 0 }, e: { r: 6, c: 8 } }, // Empty
      { s: { r: 7, c: 0 }, e: { r: 7, c: 8 } }, // Student counts
      { s: { r: 8, c: 0 }, e: { r: 8, c: 8 } }  // Empty
    ];

    // Apply styling
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: 's', v: '' };

        // Header rows (0-8)
        if (R < 9) {
          worksheet[cellAddress].s = {
            alignment: { vertical: 'center', horizontal: 'center' },
            font: { name: 'Khmer OS Battambang', sz: 11, bold: true }
          };
        }
        // Column header row (9)
        else if (R === 9) {
          worksheet[cellAddress].s = {
            fill: { fgColor: { rgb: 'E0E0E0' } },
            font: { name: 'Khmer OS Battambang', sz: 10, bold: true },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          };
        }
        // Signature rows
        else if (R > 10 + transformedData.length) {
          worksheet[cellAddress].s = {
            font: { name: 'Khmer OS Battambang', sz: 11, bold: R === (10 + transformedData.length + 3) },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
        // Data rows
        else {
          worksheet[cellAddress].s = {
            font: { name: 'Khmer OS Battambang', sz: 10 },
            alignment: { horizontal: C === 2 ? 'left' : 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'D0D0D0' } },
              bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
              left: { style: 'thin', color: { rgb: 'D0D0D0' } },
              right: { style: 'thin', color: { rgb: 'D0D0D0' } }
            }
          };
        }
      }
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'បញ្ជីអវត្តមាន');

    // Write file
    const sanitizedReportName = reportName.replace(/[^a-zA-Z0-9\u1780-\u17FF]/g, '_');
    XLSX.writeFile(workbook, `${sanitizedReportName}_${dateStr}.xlsx`);

    return true;
  } catch (error) {
    console.error('Error exporting absence report:', error);
    throw error;
  }
};

/**
 * Process and export a report
 * Combines transformation and Excel export
 */
export const processAndExportReport = async (
  reportType,
  rawData,
  reportName,
  periodInfo,
  schoolName = 'School'
) => {
  try {
    console.log('📋 Processing report:', {
      reportType,
      rawDataLength: rawData?.length,
      reportName,
      periodInfo,
      schoolName
    });

    // Get transformer function
    const transformer = reportTransformers[reportType];
    if (!transformer) {
      throw new Error(`No transformer found for report type: ${reportType}`);
    }

    // Transform data
    const transformedData = transformer(rawData);
    console.log('✅ Transformed data:', {
      transformedLength: transformedData?.length,
      firstRecord: transformedData?.[0],
      isArray: Array.isArray(transformedData)
    });

    if (!Array.isArray(transformedData) || transformedData.length === 0) {
      console.warn('⚠️ No data to export after transformation');
      return {
        success: false,
        error: 'No data available after transformation'
      };
    }

    // Export to Excel
    await exportReportToExcel(
      reportType,
      transformedData,
      reportName,
      periodInfo,
      schoolName
    );

    return {
      success: true,
      recordCount: transformedData.length,
      message: `Report exported successfully with ${transformedData.length} records`
    };
  } catch (error) {
    console.error('❌ Error processing report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
