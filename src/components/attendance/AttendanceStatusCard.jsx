import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Clock, User, Award, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

/**
 * AttendanceStatusCard Component
 * Displays the current user's role (Director/Teacher) and today's attendance check-in status
 * with a quick link to the attendance page
 */
export default function AttendanceStatusCard({ user, onStatusChange }) {
  const { t } = useLanguage();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch today's attendance for the current user
  useEffect(() => {
    const fetchTodayAttendance = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const today = new Date().toISOString().split('T')[0];

        const response = await attendanceService.getAttendance({
          userId: user.id,
          date: today,
          limit: 100
        });

        if (response.success && response.data && response.data.length > 0) {
          // Get the first attendance record for today (usually only one per user per day)
          const attendance = response.data[0];
          setTodayAttendance(attendance);
        } else {
          setTodayAttendance(null);
        }
      } catch (err) {
        console.error('Error fetching attendance:', err);
        setError(err.message);
        setTodayAttendance(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayAttendance();

    // Re-fetch every 5 minutes to stay updated
    const interval = setInterval(fetchTodayAttendance, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Determine user role (roleId = 14 for director, roleId = 8 for teacher)
  const isDirector = user?.roleId === 14;
  const roleLabel = isDirector ? t('director', 'Director') : t('teacher', 'Teacher');
  const roleIcon = isDirector ? Award : User;
  const roleColor = isDirector ? 'text-orange-600' : 'text-blue-600';
  const roleBgColor = isDirector ? 'bg-orange-50' : 'bg-blue-50';
  const roleBorderColor = isDirector ? 'border-orange-200' : 'border-blue-200';

  // Determine attendance status
  const hasCheckedIn = todayAttendance !== null;
  const attendanceStatus = todayAttendance?.status || null;
  const approvalStatus = todayAttendance?.approvalStatus || null;
  const statusLabel = attendanceStatus ? t(attendanceStatus.toLowerCase(), attendanceStatus) : null;

  // Status icon and color based on attendance
  let statusIcon = AlertCircle;
  let statusColor = 'text-gray-500';
  let statusBgColor = 'bg-gray-50';
  let statusBorderColor = 'border-gray-200';
  let statusText = t('notCheckedIn', 'Not checked in');
  let approvalStatusText = '';
  let approvalStatusColor = '';

  if (hasCheckedIn) {
    if (attendanceStatus === 'PRESENT') {
      statusIcon = CheckCircle;
      statusColor = 'text-green-600';
      statusBgColor = 'bg-green-50';
      statusBorderColor = 'border-green-200';
      statusText = t('present', 'Present');
    } else if (attendanceStatus === 'LATE') {
      statusIcon = Clock;
      statusColor = 'text-orange-600';
      statusBgColor = 'bg-orange-50';
      statusBorderColor = 'border-orange-200';
      statusText = t('late', 'Late');
    } else if (attendanceStatus === 'ABSENT') {
      statusIcon = AlertCircle;
      statusColor = 'text-red-600';
      statusBgColor = 'bg-red-50';
      statusBorderColor = 'border-red-200';
      statusText = t('absent', 'Absent');
    } else if (attendanceStatus === 'EXCUSED') {
      statusIcon = CheckCircle;
      statusColor = 'text-blue-600';
      statusBgColor = 'bg-blue-50';
      statusBorderColor = 'border-blue-200';
      statusText = t('excused', 'Excused');
    }

    // Determine approval status text and color
    if (approvalStatus === 'APPROVED') {
      approvalStatusText = t('approved', 'Approved');
      approvalStatusColor = 'text-green-600';
    } else if (approvalStatus === 'REJECTED') {
      approvalStatusText = t('rejected', 'Rejected');
      approvalStatusColor = 'text-red-600';
    } else if (approvalStatus === 'PENDING') {
      approvalStatusText = t('awaitingApproval', 'Awaiting Approval');
      approvalStatusColor = 'text-yellow-600';
    }
  }

  const RoleIcon = roleIcon;
  const StatusIcon = statusIcon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Role Card */}
        <div className={`rounded-lg border-2 ${roleBorderColor} ${roleBgColor} p-6 flex items-start justify-between`}>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${roleBgColor}`}>
                <RoleIcon className={`w-6 h-6 ${roleColor}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('yourRole', 'Your Role')}</p>
                <p className={`text-xl font-bold ${roleColor}`}>{roleLabel}</p>
              </div>
            </div>
            {(user?.name || user?.username) && (
              <p className="text-sm text-gray-600 mt-2">
                {t('user', 'User')}: <span className="font-medium text-gray-900">{user?.name || user?.username}</span>
              </p>
            )}
          </div>
        </div>

        {/* Attendance Status Card */}
        <div className={`rounded-lg border-2 ${statusBorderColor} ${statusBgColor} p-6`}>
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${statusBgColor}`}>
                  <StatusIcon className={`w-6 h-6 ${statusColor}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('todayAttendance', "Today's Attendance")}</p>
                  <p className={`text-xl font-bold ${statusColor}`}>{statusText}</p>
                </div>
              </div>
            </div>

            {/* Timestamp if checked in */}
            {hasCheckedIn && todayAttendance?.createdAt && (
              <p className="text-xs text-gray-500 mt-2">
                {t('checkedIn', 'Checked in')}: {new Date(todayAttendance.createdAt).toLocaleTimeString()}
              </p>
            )}

            {/* Reason if provided */}
            {todayAttendance?.reason && (
              <p className="text-xs text-gray-600 mt-2">
                {t('reason', 'Reason')}: {todayAttendance.reason}
              </p>
            )}

            {/* Approval Status */}
            {approvalStatusText && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-1">{t('approvalStatus', 'Approval Status')}</p>
                <p className={`text-sm font-semibold ${approvalStatusColor}`}>
                  {approvalStatusText}
                </p>
                {todayAttendance?.approvalComments && (
                  <p className="text-xs text-gray-600 mt-2">
                    {t('comment', 'Comment')}: {todayAttendance.approvalComments}
                  </p>
                )}
                {todayAttendance?.approvedAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    {t('approvedOn', 'Approved on')}: {new Date(todayAttendance.approvedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* CTA Button */}
            {!hasCheckedIn && (
              <Link to="/attendance/self" className="mt-4 inline-block">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 group hover:bg-gray-100"
                >
                  {t('goToCheckIn', 'Go to Check-In')}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
            )}

            {hasCheckedIn && (
              <Link to="/attendance/self" className="mt-4 inline-block">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  {t('viewDetails', 'View Details')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && !error && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">{t('loadingAttendance', 'Loading attendance status...')}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{t('errorLoadingAttendance', 'Error loading attendance status')}</p>
        </div>
      )}
    </div>
  );
}
