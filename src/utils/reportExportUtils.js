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
    studentId: student.id || '',
    khmerName: student.khmerName || '',
    englishName: student.englishName || '',
    gender: student.gender === 'M' ? 'ប្រុស' : 'ស្រី',
    dateOfBirth: student.dateOfBirth || '',
    class: student.class?.name || '',
    contact: student.contact || ''
  }));
};

/**
 * Report 2: Student List by Class (បញ្ជីហៅឈ្មោះសិស្សតាមថ្នាក់)
 * Groups students by class with count
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

  const result = [];
  Object.entries(grouped).forEach(([className, students]) => {
    result.push({
      className,
      totalStudents: students.length,
      students: students.map((s, idx) => ({
        no: idx + 1,
        studentId: s.id,
        khmerName: s.khmerName,
        englishName: s.englishName,
        gender: s.gender === 'M' ? 'ប្រុស' : 'ស្រី'
      }))
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
    const grades = student.grades || [];
    const average = grades.length > 0
      ? (grades.reduce((sum, g) => sum + (g.score || 0), 0) / grades.length).toFixed(2)
      : 0;

    return {
      no: index + 1,
      studentId: student.id,
      khmerName: student.khmerName,
      englishName: student.englishName,
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
      return {
        no: index + 1,
        studentId: student.id,
        khmerName: student.khmerName,
        englishName: student.englishName,
        class: student.class?.name || '',
        totalAbsences: absences.length,
        absencePercentage: student.attendances
          ? ((absences.length / student.attendances.length) * 100).toFixed(2)
          : 0
      };
    })
    .filter(s => s.totalAbsences > 0)
    .sort((a, b) => b.totalAbsences - a.totalAbsences);
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
      { header: 'No.', key: 'no' },
      { header: 'Student ID', key: 'studentId' },
      { header: 'Khmer Name', key: 'khmerName' },
      { header: 'English Name', key: 'englishName' },
      { header: 'Class', key: 'class' },
      { header: 'Total Absences', key: 'totalAbsences' },
      { header: 'Absence %', key: 'absencePercentage' }
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
 * Export report data to Excel
 */
export const exportReportToExcel = async (
  reportType,
  transformedData,
  reportName,
  periodInfo,
  schoolName
) => {
  try {
    // Dynamically import xlsx-js-style
    const XLSXStyleModule = await import('xlsx-js-style');
    const XLSX = XLSXStyleModule.default || XLSXStyleModule;

    const columns = getReportColumns(reportType);
    const dateStr = new Date().toISOString().split('T')[0];

    // Build worksheet data
    const wsData = [];

    // Add title row
    wsData.push([reportName]);

    // Add metadata row
    wsData.push([`School: ${schoolName} | Period: ${periodInfo}`]);

    // Add empty row
    wsData.push([]);

    // Add header row
    wsData.push(columns.map(col => col.header));

    // Add data rows
    if (Array.isArray(transformedData)) {
      transformedData.forEach((item) => {
        const row = columns.map(col => {
          const value = item[col.key];
          if (typeof value === 'object') {
            return JSON.stringify(value);
          }
          return value || '';
        });
        wsData.push(row);
      });
    }

    // Add footer row
    wsData.push([`Total Records: ${transformedData.length}`]);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = columns.map(col => ({
      wch: col.header.length > 15 ? col.header.length + 2 : 15
    }));
    worksheet['!cols'] = colWidths;

    // Style header row (row 4 in wsData)
    const headerRowIndex = 3; // 0-indexed, row 4
    columns.forEach((col, colIdx) => {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: colIdx });
      if (!worksheet[cellAddress]) worksheet[cellAddress] = {};
      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
        fill: { fgColor: { rgb: 'FF366092' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
      };
    });

    // Style title row
    const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (!worksheet[titleCell]) worksheet[titleCell] = {};
    worksheet[titleCell].s = {
      font: { bold: true, size: 14 },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    // Style metadata row
    const metaCell = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (!worksheet[metaCell]) worksheet[metaCell] = {};
    worksheet[metaCell].s = {
      font: { size: 10, italic: true },
      alignment: { horizontal: 'center' }
    };

    // Alternate row colors for data
    if (Array.isArray(transformedData)) {
      transformedData.forEach((item, idx) => {
        const dataRowIndex = 4 + idx; // Starting from row 5
        columns.forEach((col, colIdx) => {
          const cellAddress = XLSX.utils.encode_cell({ r: dataRowIndex, c: colIdx });
          if (!worksheet[cellAddress]) worksheet[cellAddress] = {};
          if (idx % 2 === 0) {
            worksheet[cellAddress].s = {
              fill: { fgColor: { rgb: 'FFF2F2F2' } },
              alignment: { horizontal: 'left', vertical: 'center', wrapText: true }
            };
          } else {
            worksheet[cellAddress].s = {
              alignment: { horizontal: 'left', vertical: 'center', wrapText: true }
            };
          }
        });
      });
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

    // Write file
    XLSX.writeFile(workbook, `${reportName}-${dateStr}.xlsx`);

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
export const processAndExportReport = async (
  reportType,
  rawData,
  reportName,
  periodInfo,
  schoolName = 'School'
) => {
  try {
    // Get transformer function
    const transformer = reportTransformers[reportType];
    if (!transformer) {
      throw new Error(`No transformer found for report type: ${reportType}`);
    }

    // Transform data
    const transformedData = transformer(rawData);

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
    console.error('Error processing report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
