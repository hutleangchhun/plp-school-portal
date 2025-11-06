/**
 * Report Data Fetchers Index
 * Central export point for all report fetchers
 */

import { fetchReport1Data } from './report1Fetcher';
import { fetchReport4Data } from './report4Fetcher';
import { fetchReport6Data } from './report6Fetcher';
import { fetchReport9Data } from './report9Fetcher';
import { REPORT_IDS } from '../types/reportTypes';

/**
 * Report fetcher registry
 * Maps report IDs to their respective fetcher functions
 */
export const REPORT_FETCHERS = {
  [REPORT_IDS.STUDENT_NAME_LIST]: fetchReport1Data,
  [REPORT_IDS.ABSENCE_REPORT]: fetchReport4Data,
  [REPORT_IDS.DISABILITY_REPORT]: fetchReport6Data,
  [REPORT_IDS.ETHNIC_MINORITY_REPORT]: fetchReport9Data,
};

/**
 * Get fetcher function for a specific report
 */
export const getReportFetcher = (reportId) => {
  return REPORT_FETCHERS[reportId] || null;
};

/**
 * Fetch report data by report ID
 */
export const fetchReportData = async (reportId, schoolId, options = {}) => {
  const fetcher = getReportFetcher(reportId);
  
  if (!fetcher) {
    throw new Error(`No fetcher found for report: ${reportId}`);
  }

  return await fetcher(schoolId, options);
};
