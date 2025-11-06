/**
 * Report Statistics Calculator
 * Calculate statistics for different report types
 */

/**
 * Calculate statistics for reports with student data
 */
export const calculateReportStats = (reportData, selectedReport) => {
  if (!reportData || reportData.length === 0) {
    return null;
  }

  // Gender distribution
  const genderCount = reportData.reduce((acc, student) => {
    // For report6, only count students with accessibility issues
    if (selectedReport === 'report6') {
      const hasAccessibility = student.accessibility && 
        student.accessibility !== '' && 
        student.accessibility !== 'null' && 
        student.accessibility !== 'none' &&
        student.accessibility !== 'None';
      if (!hasAccessibility) return acc;
    }
    
    const gender = student.gender || 'Unknown';
    acc[gender] = (acc[gender] || 0) + 1;
    return acc;
  }, {});

  // Ethnic group distribution
  const ethnicCount = reportData.reduce((acc, student) => {
    let ethnic = student.ethnicGroup || student.ethnic_group || '';
    
    // For report9, skip students without ethnic group (they shouldn't be in the data anyway)
    if (selectedReport === 'report9') {
      // Only count students with actual ethnic group values
      if (ethnic && ethnic !== 'Unknown' && ethnic !== 'unknown' && ethnic !== 'null' && ethnic !== 'ខ្មែរ') {
        acc[ethnic] = (acc[ethnic] || 0) + 1;
      }
    } else {
      // For other reports, treat empty, null, or 'Unknown' as Khmer
      if (!ethnic || ethnic === 'Unknown' || ethnic === 'unknown' || ethnic === 'null') {
        ethnic = 'ខ្មែរ';
      }
      acc[ethnic] = (acc[ethnic] || 0) + 1;
    }
    return acc;
  }, {});

  // Parent status
  const parentStatus = reportData.reduce((acc, student) => {
    // For report6, only count students with accessibility issues
    if (selectedReport === 'report6') {
      const hasAccessibility = student.accessibility && 
        student.accessibility !== '' && 
        student.accessibility !== 'null' && 
        student.accessibility !== 'none' &&
        student.accessibility !== 'None';
      if (!hasAccessibility) return acc;
    }
    
    const parentCount = student.parents?.length || 0;
    if (parentCount === 0) acc.noParents = (acc.noParents || 0) + 1;
    else if (parentCount === 1) acc.oneParent = (acc.oneParent || 0) + 1;
    else acc.bothParents = (acc.bothParents || 0) + 1;
    return acc;
  }, {});

  // Special needs
  const specialNeedsCount = reportData.filter(s => 
    s.accessibility || s.specialNeeds || s.special_needs
  ).length;

  // Accessibility data for report6
  const accessibilityData = {};
  reportData.forEach(student => {
    const accessibility = student.accessibility;
    
    // Skip students without accessibility data
    if (!accessibility || 
        accessibility === '' || 
        accessibility === 'null' || 
        accessibility === 'none' ||
        accessibility === 'None') {
      return;
    }
    
    const accessibilityLabel = Array.isArray(accessibility) 
      ? accessibility.join(', ') 
      : accessibility;
      
    accessibilityData[accessibilityLabel] = (accessibilityData[accessibilityLabel] || 0) + 1;
  });

  return {
    genderCount,
    ethnicCount,
    parentStatus,
    specialNeedsCount,
    accessibilityData
  };
};

/**
 * Get summary title based on report type
 */
export const getSummaryTitle = (selectedReport, t) => {
  if (selectedReport === 'report6') return t('studentsWithDisabilities', 'Students with Disabilities');
  if (selectedReport === 'report9') return t('ethnicMinorityStudents', 'Ethnic Minority Students');
  return t('totalStudents', 'Total Students');
};
