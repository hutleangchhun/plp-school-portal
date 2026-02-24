import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoading } from '../../contexts/LoadingContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { Badge } from '../../components/ui/Badge';
import StatsCard from '../../components/ui/StatsCard';

import { Users, UserCheck, UserX, Clock, Clock4 } from 'lucide-react';
import { getFullName } from '../../utils/usernameUtils';
import { graphqlService } from '../../utils/api/services/graphqlService';
import { websocketService } from '../../utils/api/services/websocketService';
import { Button } from '@/components/ui/Button';

const AdminUserAttendance = () => {
    const { t } = useLanguage();
    const { startLoading, stopLoading } = useLoading();
    const { error, handleError, clearError } = useErrorHandler();

    const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, leave: 0 });
    const [logs, setLogs] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [socketInstance, setSocketInstance] = useState(null);

    const fetchInitialData = async () => {
        try {
            clearError();
            startLoading('fetchAttendanceData', t('loadingData', 'Loading data...'));

            const query = `
        query {
          attendanceTodayStats { total present absent late leave }
          attendanceTodayLog(limit: 50) {
            id userId firstName lastName status checkInTime shiftName submittedAt
          }
        }
      `;

            const data = await graphqlService.query(query);

            if (data) {
                setStats(data.attendanceTodayStats || { total: 0, present: 0, absent: 0, late: 0, leave: 0 });
                setLogs(data.attendanceTodayLog || []);
            }

        } catch (err) {
            handleError(err, {
                toastMessage: t('failedToLoadAttendanceData', 'Failed to load attendance data'),
            });
        } finally {
            stopLoading('fetchAttendanceData');
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();

        const initializeSocket = async () => {
            // Connect using the exact namespace as specified by the documentation.
            const socket = websocketService.connect('/attendance');

            socket.on('connect', () => {
                console.log('Connected to /attendance namespace with Transport:', socket.io.engine.transport.name);
                socket.emit('joinAttendanceLog');
            });

            // Debug every single event sent from the server
            socket.onAny((eventName, ...args) => {
                console.log(`[Socket Debug] Event received: '${eventName}'`, args);
            });

            socket.on('joinedAttendanceLog', (ack) => {
                console.log('Successfully joined the backend tracking room:', ack);
            });

            socket.on('attendanceLog', (newEntry) => {
                console.log('Received new attendance log:', newEntry);

                // Prepend the new log to the list
                setLogs((prev) => [newEntry, ...prev]);

                // Update the stats incrementally
                setStats((prev) => {
                    const isLate = prev.checkInTime && new Date(prev.checkInTime).getHours() >= 8; // Simplified late check
                    const currentStats = { ...prev };
                    currentStats.total += 1;

                    if (newEntry.status === 'present') {
                        currentStats.present += 1;
                        if (isLate) currentStats.late += 1;
                    } else if (newEntry.status === 'absent') {
                        currentStats.absent += 1;
                    } else if (newEntry.status === 'leave') {
                        currentStats.leave += 1;
                    }
                    return currentStats;
                });
            });

            socket.on('connect_error', (err) => {
                console.error('Socket connection error:', err);
            });

            // store socket in state to be accessible by cleanup
            setSocketInstance(socket);
        };

        initializeSocket();

        return () => {
            if (socketInstance) {
                socketInstance.disconnect();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (initialLoading) {
        return (
            <PageLoader
                message={t('loadingData', 'Loading data...')}
                className="min-h-screen flex items-center justify-center p-8"
            />
        );
    }

    if (error) {
        return (
            <ErrorDisplay
                error={error}
                onRetry={fetchInitialData}
                size="lg"
                className="min-h-screen bg-gray-50"
            />
        );
    }

    const getStatusBadgeColor = (status) => {
        const s = (status || '').toUpperCase();
        if (s === 'PRESENT') return 'green';
        if (s === 'ABSENT') return 'red';
        if (s === 'LATE') return 'yellow';
        if (s === 'LEAVE') return 'blue';
        return 'gray';
    };

    const getStatusLabel = (status) => {
        const s = (status || '').toUpperCase();
        if (s === 'PRESENT') return t('present', 'Present');
        if (s === 'ABSENT') return t('absent', 'Absent');
        if (s === 'LATE') return t('late', 'Late');
        if (s === 'LEAVE') return t('leave', 'Leave');
        return status;
    };

    /**
     * Parses the backend time string. Since the backend now returns UTC time (e.g., 06:31:46) 
     * but without a timezone indicator, we append 'Z' to treat it explicitly as UTC.
     * This allows the browser to correctly apply your +7h local offset to display 13:31:46.
     */
    const formatTimeLocal = (timeValue) => {
        if (!timeValue) return '-';

        let normalizedStr = timeValue;
        if (typeof timeValue === 'string') {
            // If the string does not end with 'Z' and has no offset like '+07:00'
            if (!timeValue.endsWith('Z') && !timeValue.match(/[+-]\d{2}:?\d{2}$/)) {
                normalizedStr = timeValue + 'Z';
            }
        }

        const dateObj = new Date(normalizedStr);
        if (isNaN(dateObj.getTime())) return timeValue;

        return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <PageTransition variant="fade" className="flex-1 bg-gray-50">
            <div className="p-4 sm:p-6 space-y-2">
                <FadeInSection>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                        <div className='border-l-4 border-blue-600 pl-3'>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {t('userAttendanceTrack', 'User Attendance Tracking')}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                {t('realTimeAttendanceDescription', 'Real-time overview of staff attendance today')}
                            </p>
                        </div>
                        <Button
                            onClick={fetchInitialData}
                            size="sm"
                            variant="primary"
                        >
                            {t('refreshData', 'Refresh Data')}
                        </Button>
                    </div>
                </FadeInSection>
                {/* Stats Section */}
                <FadeInSection delay={50}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        <StatsCard
                            title={t('totalAttendance', 'Total Today')}
                            value={stats.total}
                            enhanced={true}
                            gradientFrom="from-blue-500"
                            gradientTo="to-blue-600"
                            hoverColor="hover:border-blue-200"
                            responsive={true}
                        />
                        <StatsCard
                            title={t('present', 'Present')}
                            value={stats.present}
                            enhanced={true}
                            gradientFrom="from-emerald-500"
                            gradientTo="to-emerald-600"
                            hoverColor="hover:border-emerald-200"
                            responsive={true}
                        />
                        <StatsCard
                            title={t('late', 'Late')}
                            value={stats.late}
                            enhanced={true}
                            gradientFrom="from-orange-500"
                            gradientTo="to-orange-600"
                            hoverColor="hover:border-orange-200"
                            responsive={true}
                        />
                        <StatsCard
                            title={t('leave', 'Leave')}
                            value={stats.leave}
                            enhanced={true}
                            gradientFrom="from-purple-500"
                            gradientTo="to-purple-600"
                            hoverColor="hover:border-purple-200"
                            responsive={true}
                        />
                        <StatsCard
                            title={t('absent', 'Absent/No Show')}
                            value={stats.absent}
                            enhanced={true}
                            gradientFrom="from-rose-500"
                            gradientTo="to-rose-600"
                            hoverColor="hover:border-rose-200"
                            responsive={true}
                        />
                    </div>
                </FadeInSection>

                {/* Logs Table Section */}
                <FadeInSection delay={100}>
                    <Card className="border border-gray-200 shadow-md rounded-xl overflow-hidden pt-4 pb-2">
                        <CardHeader className="bg-white border-b border-gray-100 py-4 px-6 pt-2">
                            <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                                {t('todaysAttendanceLogs', "Today's Logs (Live)")}
                                < span className="ml-3 inline-flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" title="Live updates active" ></span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto max-h-[600px]">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-white sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">{t('time', 'Time')}</th>
                                            <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">{t('name', 'Name')}</th>
                                            <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">{t('shift', 'Shift')}</th>
                                            <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">{t('checkInTime', 'Check In Time')}</th>
                                            <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">{t('status', 'Status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {logs.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                                                    {t('noAttendanceData', 'No attendance records yet for today.')}
                                                </td>
                                            </tr>
                                        )}
                                        {logs.map((log, index) => {
                                            const isNew = index === 0; // Simple highlight effect on the newest item
                                            return (
                                                <tr
                                                    key={log.id || index}
                                                    className={`hover:bg-blue-50/50 transition-colors duration-300 ${isNew ? 'bg-green-50/30' : ''}`}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                                                        {formatTimeLocal(log.submittedAt || new Date().toISOString())}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                        {getFullName(log)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                        {log.shiftName || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-mono text-xs">
                                                        {formatTimeLocal(log.checkInTime)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <Badge
                                                            color={getStatusBadgeColor(log.status)}
                                                            variant="filled"
                                                            size="sm"
                                                            className="font-medium"
                                                        >
                                                            {getStatusLabel(log.status)}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </FadeInSection>
            </div>
        </PageTransition >
    );
};

export default AdminUserAttendance;
