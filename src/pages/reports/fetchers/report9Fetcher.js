/**
 * Report 9: Ethnic Minority Students Fetcher
 * បញ្ជីឈ្មោះសិស្សជាជនជាតិដើមភាគតិច
 */

import { fetchStudentsWithFullData } from './baseFetcher';

/**
 * Fetch data for Report 9 (Ethnic Minority Students)
 */
export const fetchReport9Data = async (schoolId, options = {}) => {
  console.log(`📋 Fetching ethnic minority students for report9`);

  const studentsWithFullData = await fetchStudentsWithFullData(schoolId, {
    apiFilters: { isEtnicgroup: true }, // Only fetch ethnic minority students
  });

  console.log(`🌍 Report9: Backend filtered ${studentsWithFullData.length} ethnic minority students`);
  return studentsWithFullData;
};
