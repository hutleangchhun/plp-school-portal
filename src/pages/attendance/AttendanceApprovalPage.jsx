import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import Table from '../../components/ui/Table';

/**
 * AttendanceApprovalPage Component
 * Allows directors to review and approve/reject pending teacher attendance records
 */
export default function AttendanceApprovalPage({ user }) {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { error, handleError, clearError, retry } = useErrorHandler();

  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Fetch pending approvals
  const fetchPendingApprovals = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      clearError();

      const response = await attendanceService.getPendingApprovals({
        page,
        limit: 10
      });

      if (response.success) {
        setPendingApprovals(response.data);
        setTotalRecords(response.pagination.total);
        setTotalPages(response.pagination.pages);
        setCurrentPage(page);
      }
    } catch (err) {
      handleError(err);
      setPendingApprovals([]);
    } finally {
      setLoading(false);
    }
  }, [clearError, handleError]);

  // Initial fetch
  useEffect(() => {
    fetchPendingApprovals(1);
  }, [fetchPendingApprovals]);




  /**
   * Approve single attendance
   */
  const handleApproveAttendance = useCallback(async (attendanceId) => {
    try {
      setSubmitting(true);

      const response = await attendanceService.approveAttendance(attendanceId, {
        approvalStatus: 'APPROVED',
        approvalComments: ''
      });

      console.log('Approve response:', response);

      if (response?.success) {
        showSuccess(t('attendanceApproved'));

        // Remove from pending list
        setPendingApprovals(prev => prev.filter(a => a.id !== attendanceId));
      } else {
        showError(response?.error || t('errorApprovingAttendance'));
      }
    } catch (err) {
      showError(t('errorApprovingAttendance'));
      console.error('Approve error:', err);
    } finally {
      setSubmitting(false);
    }
  }, [showSuccess, showError, t]);

  /**
   * Reject single attendance
   */
  const handleRejectAttendance = useCallback(async (attendanceId) => {
    try {
      setSubmitting(true);

      const response = await attendanceService.approveAttendance(attendanceId, {
        approvalStatus: 'REJECTED',
        approvalComments: ''
      });

      console.log('Reject response:', response);

      if (response?.success) {
        showSuccess(t('attendanceRejected'));

        // Remove from pending list
        setPendingApprovals(prev => prev.filter(a => a.id !== attendanceId));
      } else {
        showError(response?.error || t('errorRejectingAttendance'));
      }
    } catch (err) {
      showError(t('errorRejectingAttendance'));
      console.error('Reject error:', err);
    } finally {
      setSubmitting(false);
    }
  }, [showSuccess, showError, t]);


  if (loading && pendingApprovals.length === 0) {
    return <PageLoader />;
  }

  // Helper function to translate status
  const translateStatus = (status) => {
    const statusMap = {
      'PRESENT': t('present'),
      'ABSENT': t('absent'),
      'LATE': t('late'),
      'LEAVE': t('leave')
    };
    return statusMap[status] || status;
  };

  // Define table columns
  const columns = [
    {
      key: 'name',
      header: t('teacher'),
      accessor: 'userDetails.name',
      responsive: ''
    },
    {
      key: 'date',
      header: t('date'),
      accessor: 'date',
      responsive: 'hidden md:table-cell'
    },
    {
      key: 'status',
      header: t('status'),
      accessor: 'status',
      responsive: 'hidden sm:table-cell',
      render: (row) => <span>{translateStatus(row.status)}</span>
    },
    {
      key: 'actions',
      header: t('actions'),
      disableSort: true,
      render: (row) => (
        <div className="flex gap-2">
          <Button
            onClick={() => handleApproveAttendance(row.id)}
            disabled={submitting}
            className="flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <CheckCircle className="w-4 h-4" />
            {t('approve')}
          </Button>
          <Button
            onClick={() => handleRejectAttendance(row.id)}
            disabled={submitting}
            variant="outline"
            className="flex items-center justify-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
            size="sm"
          >
            <XCircle className="w-4 h-4" />
            {t('reject')}
          </Button>
        </div>
      )
    }
  ];

  return (
    <PageTransition className="flex-1 bg-gray-50 p-6">
      <div className="mx-auto">
        {/* Header */}
        <div className='bg-white p-6 rounded-lg shadow-sm mb-6'>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t('attendanceApprovals')}
            </h1>
            <p className="text-gray-600 mt-2">
              {t('reviewPendingApprovals')}
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <FadeInSection delay={100} className="mb-6">
            <ErrorDisplay
              error={error}
              onRetry={retry}
              onDismiss={clearError}
            />
          </FadeInSection>
        )}

        {/* Table */}
        <FadeInSection delay={300}>
          <Table
            columns={columns}
            data={pendingApprovals}
            loading={loading}
            emptyMessage={t('noPendingApprovals')}
            emptyIcon={CheckCircle}
            showPagination={totalPages > 1}
            pagination={{
              page: currentPage,
              pages: totalPages,
              total: totalRecords,
              limit: 10
            }}
            onPageChange={fetchPendingApprovals}
            t={t}
          />
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
