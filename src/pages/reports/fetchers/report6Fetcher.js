/**
 * Report 6: Students with Disabilities Fetcher
 * បញ្ជីឈ្មោះសិស្សមានពិការភាព
 */

import { fetchStudentsWithFullData } from './baseFetcher';

/**
 * Fetch data for Report 6 (Students with Disabilities)
 */
export const fetchReport6Data = async (schoolId, options = {}) => {
  console.log(`📋 Fetching students with disabilities for report6`);

  const studentsWithFullData = await fetchStudentsWithFullData(schoolId, {
    apiFilters: { hasAccessibility: true }, // Only fetch students with disabilities
  });

  console.log(`🦽 Report6: Backend filtered ${studentsWithFullData.length} students with disabilities`);
  return studentsWithFullData;
};
