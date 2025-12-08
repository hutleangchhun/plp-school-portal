import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';
import { bmiService } from '../../utils/api/services/bmiService';

/**
 * BMI Detailed Table Component
 * Displays detailed BMI records with pagination
 *
 * @param {Object} filters - Filter values (academicYear, province, district, school)
 */
const BMIDetailedTable = ({ filters }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Fetch data based on filters and pagination
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit
        };

        // Add academic year filter if provided
        if (filters?.academicYear1) {
          params.academicYear = filters.academicYear1;
        }

        const response = await bmiService.getBmiReportAllUsers(params);

        if (response.success) {
          // Ensure data is always an array
          const dataArray = Array.isArray(response.data) ? response.data : [];
          setData(dataArray);

          if (response.pagination) {
            setPagination(prev => ({
              ...prev,
              total: response.pagination.total || 0,
              totalPages: response.pagination.totalPages || 0
            }));
          }
        } else {
          // If request fails, set empty array
          setData([]);
        }
      } catch (error) {
        console.error('Error fetching BMI table data:', error);
        // Set empty array on error
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pagination.page, pagination.limit, filters]);

  // Get BMI status color
  const getBmiStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'normal':
      case 'ធម្មតា':
        return 'bg-green-100 text-green-800';
      case 'underweight':
      case 'thinness':
      case 'severe thinness':
      case 'ស្គម':
      case 'ស្គមខ្លាំង':
        return 'bg-blue-100 text-blue-800';
      case 'overweight':
      case 'លើសទម្ងន់':
        return 'bg-orange-100 text-orange-800';
      case 'obesity':
      case 'obese':
      case 'ធាត់':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Pagination handlers
  const goToPage = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(pagination.totalPages);
  const goToPreviousPage = () => goToPage(Math.max(1, pagination.page - 1));
  const goToNextPage = () => goToPage(Math.min(pagination.totalPages, pagination.page + 1));

  if (loading && data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">
          {t('detailedBMIRecords', 'Detailed BMI Records')}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {t('showingRecords', 'Showing')} {data.length} {t('of', 'of')} {pagination.total} {t('records', 'records')}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('userName', 'User Name')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('email', 'Email')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('academicYear', 'Academic Year')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('height', 'Height')} (cm)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('weight', 'Weight')} (kg)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                BMI
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('status', 'Status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('recordedAt', 'Recorded At')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                  {t('noRecordsFound', 'No records found')}
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.userName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.academicYear || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.height_cm || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.weight_kg || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.bmi ? parseFloat(record.bmi).toFixed(2) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBmiStatusColor(record.bmiStatus)}`}>
                      {record.bmiStatus || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.recordedAt ? new Date(record.recordedAt).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={pagination.page === 1}
            >
              {t('previous', 'Previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={pagination.page === pagination.totalPages}
            >
              {t('next', 'Next')}
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                {t('page', 'Page')} <span className="font-medium">{pagination.page}</span>{' '}
                {t('of', 'of')} <span className="font-medium">{pagination.totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={goToFirstPage}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goToPreviousPage}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goToNextPage}
                  disabled={pagination.page === pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={goToLastPage}
                  disabled={pagination.page === pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BMIDetailedTable;
