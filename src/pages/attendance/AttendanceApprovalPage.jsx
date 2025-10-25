import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Button } from '../../components/ui/Button';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import EmptyState from '../../components/ui/EmptyState';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedApprovals, setSelectedApprovals] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [comments, setComments] = useState({});

  // Fetch pending approvals
  const fetchPendingApprovals = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      clearError();

      const response = await attendanceService.getPendingApprovals({
        page,
        limit: 10,
        startDate: filterDate,
        endDate: filterDate
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
  }, [filterDate, clearError, handleError]);

  // Initial fetch
  useEffect(() => {
    fetchPendingApprovals(1);
  }, [fetchPendingApprovals]);

  /**
   * Filter approvals by search term
   */
  const filteredApprovals = pendingApprovals.filter(approval => {
    const teacherName = approval.userDetails?.name || approval.student?.name || 'Unknown';
    return teacherName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  /**
   * Handle checkbox selection
   */
  const handleSelectApproval = useCallback((id) => {
    setSelectedApprovals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  /**
   * Handle select all
   */
  const handleSelectAll = useCallback(() => {
    if (selectedApprovals.size === filteredApprovals.length) {
      setSelectedApprovals(new Set());
    } else {
      setSelectedApprovals(new Set(filteredApprovals.map(a => a.id)));
    }
  }, [filteredApprovals, selectedApprovals.size]);

  /**
   * Approve single attendance
   */
  const handleApproveAttendance = useCallback(async (attendanceId) => {
    try {
      setSubmitting(true);
      const commentText = comments[attendanceId] || '';

      const response = await attendanceService.approveAttendance(attendanceId, {
        approvalStatus: 'APPROVED',
        approvalComments: commentText
      });

      if (response) {
        showSuccess(t('attendanceApproved', 'Attendance approved successfully'));

        // Remove from pending list
        setPendingApprovals(prev => prev.filter(a => a.id !== attendanceId));
        setSelectedApprovals(prev => {
          const newSet = new Set(prev);
          newSet.delete(attendanceId);
          return newSet;
        });
        setComments(prev => {
          const newComments = { ...prev };
          delete newComments[attendanceId];
          return newComments;
        });
      }
    } catch (err) {
      showError(t('errorApprovingAttendance', 'Error approving attendance'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [comments, showSuccess, showError, t]);

  /**
   * Reject single attendance
   */
  const handleRejectAttendance = useCallback(async (attendanceId) => {
    try {
      setSubmitting(true);
      const reason = comments[attendanceId] || '';

      if (!reason.trim()) {
        showError(t('reasonRequired', 'Reason is required'));
        setSubmitting(false);
        return;
      }

      const response = await attendanceService.approveAttendance(attendanceId, {
        approvalStatus: 'REJECTED',
        approvalComments: reason
      });

      if (response) {
        showSuccess(t('attendanceRejected', 'Attendance rejected successfully'));

        // Remove from pending list
        setPendingApprovals(prev => prev.filter(a => a.id !== attendanceId));
        setSelectedApprovals(prev => {
          const newSet = new Set(prev);
          newSet.delete(attendanceId);
          return newSet;
        });
        setComments(prev => {
          const newComments = { ...prev };
          delete newComments[attendanceId];
          return newComments;
        });
      }
    } catch (err) {
      showError(t('errorRejectingAttendance', 'Error rejecting attendance'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [comments, showSuccess, showError, t]);

  /**
   * Bulk approve selected
   */
  const handleBulkApprove = useCallback(async () => {
    if (selectedApprovals.size === 0) {
      showError(t('selectAttendanceFirst', 'Select attendance records first'));
      return;
    }

    try {
      setSubmitting(true);
      const approvalIds = Array.from(selectedApprovals);

      const response = await attendanceService.bulkApproveAttendance(approvalIds);

      if (response) {
        showSuccess(
          t('bulkApproveSuccess', `${selectedApprovals.size} attendance records approved`)
        );

        // Refresh list
        fetchPendingApprovals(currentPage);
        setSelectedApprovals(new Set());
      }
    } catch (err) {
      showError(t('errorBulkApproving', 'Error bulk approving attendance'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [selectedApprovals, currentPage, fetchPendingApprovals, showSuccess, showError, t]);

  if (loading && pendingApprovals.length === 0) {
    return <PageLoader />;
  }

  return (
    <PageTransition className="flex-1 bg-gray-50 p-6">
      <div className="mx-auto">
        {/* Header */}
        <div className='bg-white p-6 rounded-lg shadow-sm mb-6'>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('attendanceApprovals', 'Attendance Approvals')}
              </h1>
              <p className="text-gray-600">
                {t('reviewPendingApprovals', 'Review and approve/reject pending attendance records')}
              </p>
            </div>
            {filteredApprovals.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={selectedApprovals.size === filteredApprovals.length && filteredApprovals.length > 0}
                  onChange={handleSelectAll}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {t('selectAll', 'Select All')}
                </span>
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg space-y-4">
            {/* Date Filter and Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('date', 'Date')}
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('search', 'Search')}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('searchByName', 'Search by teacher name...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedApprovals.size > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  {t('selected', 'Selected')}: {selectedApprovals.size}
                </span>
                <Button
                  onClick={handleBulkApprove}
                  disabled={submitting}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t('approveSelected', 'Approve Selected')}
                </Button>
              </div>
            )}
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

        {/* Pending Approvals List */}
        {filteredApprovals.length === 0 ? (
          <FadeInSection delay={300}>
            <EmptyState
              title={t('noPendingApprovals', 'No Pending Approvals')}
              message={t('allAttendanceApproved', 'All attendance records have been approved')}
              icon={CheckCircle}
            />
          </FadeInSection>
        ) : (
          <FadeInSection delay={300} className="space-y-4">
            {/* Approval Cards */}
            {filteredApprovals.map((approval) => (
              <div
                key={approval.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="p-4 space-y-4">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedApprovals.has(approval.id)}
                      onChange={() => handleSelectApproval(approval.id)}
                      className="w-5 h-5 rounded border-gray-300 mt-1"
                    />

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {approval.userDetails?.name || approval.student?.name || 'Unknown'}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {t('date', 'Date')}: {approval.date} • {t('status', 'Status')}: {approval.status}
                          </p>
                          {approval.submittedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              {t('submitted', 'Submitted')}: {new Date(approval.submittedAt).toLocaleString()}
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200">
                          <Clock className="w-4 h-4 text-yellow-600" />
                          <span className="text-xs font-medium text-yellow-700">
                            {t('pending', 'Pending')}
                          </span>
                        </div>
                      </div>

                      {/* Reason if present */}
                      {approval.reason && (
                        <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">{t('reason', 'Reason')}: </span>
                            {approval.reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Buttons on Card */}
                  <div className="flex gap-2 pl-9">
                    <Button
                      onClick={() => handleApproveAttendance(approval.id)}
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {t('approve', 'Approve')}
                    </Button>
                    <Button
                      onClick={() => handleRejectAttendance(approval.id)}
                      disabled={submitting || !comments[approval.id]?.trim()}
                      variant="outline"
                      className="flex-1 flex items-center justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                      size="sm"
                    >
                      <XCircle className="w-4 h-4" />
                      {t('reject', 'Reject')}
                    </Button>
                  </div>
                </div>

                {/* Expandable Details */}
                {expandedId === approval.id && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                    {/* Teacher Details */}
                    {approval.userDetails && (
                      <div className="p-3 bg-white rounded border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">
                          {t('teacherDetails', 'Teacher Details')}
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">{t('email', 'Email')}</p>
                            <p className="font-medium text-gray-900">{approval.userDetails.email}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Comments (for both approval and rejection) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('comments', 'Comments')}
                      </label>
                      <textarea
                        value={comments[approval.id] || ''}
                        onChange={(e) => setComments(prev => ({
                          ...prev,
                          [approval.id]: e.target.value
                        }))}
                        placeholder={t('enterComments', 'Enter your comments or reason...')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        rows="3"
                      />
                    </div>
                  </div>
                )}

                {/* Expand Toggle */}
                <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
                  <button
                    onClick={() => setExpandedId(expandedId === approval.id ? null : approval.id)}
                    className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 py-1"
                  >
                    {expandedId === approval.id ? (
                      <>
                        <ChevronLeft className="w-4 h-4" />
                        {t('hideDetails', 'Hide Details')}
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-4 h-4" />
                        {t('showDetails', 'Show Details')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </FadeInSection>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <FadeInSection delay={400} className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {t('showing', 'Showing')} {(currentPage - 1) * 10 + 1} {t('to', 'to')} {Math.min(currentPage * 10, totalRecords)} {t('of', 'of')} {totalRecords}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => fetchPendingApprovals(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchPendingApprovals(pageNum)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                onClick={() => fetchPendingApprovals(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
                variant="outline"
                size="sm"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </FadeInSection>
        )}
      </div>
    </PageTransition>
  );
}
