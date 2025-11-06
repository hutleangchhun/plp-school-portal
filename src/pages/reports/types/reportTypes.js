/**
 * Report Type Definitions
 * Central registry for all report types and their configurations
 */

export const REPORT_IDS = {
  STUDENT_NAME_LIST: 'report1',
  ABSENCE_REPORT: 'report4',
  DISABILITY_REPORT: 'report6',
  ETHNIC_MINORITY_REPORT: 'report9',
  // Future reports (not yet implemented)
  // AVERAGE_GRADES: 'report3',
  // NUTRITION_SUPPORT: 'report5',
  // HEALTH_ISSUES: 'report7',
  // PERSONAL_ISSUES: 'report8',
  // CLASS_CHANGE: 'report10',
  // DROPOUT: 'report11',
  // TRACKING_BOOK: 'report12',
  // ACADEMIC_BOOK: 'report13',
};

/**
 * Report configuration metadata
 */
export const REPORT_CONFIGS = {
  [REPORT_IDS.STUDENT_NAME_LIST]: {
    id: REPORT_IDS.STUDENT_NAME_LIST,
    labelKey: 'reportStudentNameInfo',
    defaultLabel: 'បញ្ជីហៅឈ្មោះសិស្ស',
    hasClassFilter: true,
    requiresParentData: true,
    requiresFullStudentData: true,
  },
  [REPORT_IDS.ABSENCE_REPORT]: {
    id: REPORT_IDS.ABSENCE_REPORT,
    labelKey: 'report4',
    defaultLabel: 'បញ្ជីអវត្តមានសិស្ស',
    hasClassFilter: true,
    requiresAttendanceData: true,
    requiresFullStudentData: false,
  },
  [REPORT_IDS.DISABILITY_REPORT]: {
    id: REPORT_IDS.DISABILITY_REPORT,
    labelKey: 'report6',
    defaultLabel: 'បញ្ជីឈ្មោះសិស្សមានពិការភាព',
    hasClassFilter: false,
    requiresParentData: true,
    requiresFullStudentData: true,
    apiFilter: { hasAccessibility: true },
  },
  [REPORT_IDS.ETHNIC_MINORITY_REPORT]: {
    id: REPORT_IDS.ETHNIC_MINORITY_REPORT,
    labelKey: 'report9',
    defaultLabel: 'បញ្ជីឈ្មោះសិស្សជាជនជាតិដើមភាគតិច',
    hasClassFilter: false,
    requiresParentData: true,
    requiresFullStudentData: true,
    apiFilter: { isEtnicgroup: true },
  },
};

/**
 * Get list of active report types for dropdown
 */
export const getActiveReportTypes = (t) => {
  return Object.values(REPORT_CONFIGS).map(config => ({
    value: config.id,
    label: t(config.labelKey, config.defaultLabel)
  }));
};

/**
 * Get report configuration by ID
 */
export const getReportConfig = (reportId) => {
  return REPORT_CONFIGS[reportId] || null;
};
