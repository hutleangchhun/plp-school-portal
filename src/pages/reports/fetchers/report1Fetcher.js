/**
 * Report 1: Student Name List Fetcher
 * បញ្ជីហៅឈ្មោះសិស្ស
 */

import { fetchStudentsWithFullData } from './baseFetcher';

/**
 * Fetch data for Report 1 (Student Name List)
 */
export const fetchReport1Data = async (schoolId, options = {}) => {
  const { classId } = options;

  console.log(`📋 Fetching students with parent information for report1`);

  const studentsWithFullData = await fetchStudentsWithFullData(schoolId, {
    classId,
    apiFilters: {},
  });

  console.log(`✅ Report1: Fetched ${studentsWithFullData.length} students`);
  return studentsWithFullData;
};
