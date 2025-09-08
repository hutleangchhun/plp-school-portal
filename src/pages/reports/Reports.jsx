import { useState, useEffect } from 'react';
import { BarChart3, Download, Filter, TrendingUp, Users, BookOpen, Award, Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';

export default function Reports() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [selectedReport, setSelectedReport] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({});

  const reportTypes = [
    { id: 'overview', name: t('overviewReport') || 'Overview Report', icon: BarChart3 },
    { id: 'academic', name: t('academicPerformance') || 'Academic Performance', icon: BookOpen },
    { id: 'attendance', name: t('attendanceReport') || 'Attendance Report', icon: Calendar },
    { id: 'achievements', name: t('achievementsReport') || 'Achievements Report', icon: Award }
  ];

  const timePeriods = [
    { id: 'week', name: t('thisWeek') || 'This Week' },
    { id: 'month', name: t('thisMonth') || 'This Month' },
    { id: 'quarter', name: t('thisQuarter') || 'This Quarter' },
    { id: 'year', name: t('thisYear') || 'This Year' }
  ];

  useEffect(() => {
    fetchReportData();
  }, [selectedReport, selectedPeriod]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Mock data based on report type
      const mockData = {
        overview: {
          totalStudents: 145,
          totalClasses: 12,
          averageAttendance: 92,
          averageGrade: 85,
          trends: {
            studentsGrowth: 5.2,
            attendanceChange: 2.1,
            gradeImprovement: 3.5
          }
        },
        academic: {
          subjectPerformance: [
            { subject: 'Mathematics', average: 87, students: 45, improvement: 3.2 },
            { subject: 'Science', average: 82, students: 42, improvement: 1.8 },
            { subject: 'English', average: 89, students: 48, improvement: 4.1 },
            { subject: 'Social Studies', average: 85, students: 38, improvement: 2.5 }
          ],
          gradeDistribution: {
            A: 25,
            B: 35,
            C: 28,
            D: 10,
            F: 2
          }
        },
        attendance: {
          overallRate: 92.5,
          dailyAverage: [88, 94, 91, 95, 90],
          absenteeism: 7.5,
          punctuality: 88.2
        },
        achievements: {
          totalAwards: 48,
          topPerformers: [
            { name: 'Alice Johnson', awards: 5, grade: 'Grade 3' },
            { name: 'Bob Smith', awards: 4, grade: 'Grade 2' },
            { name: 'Carol Davis', awards: 4, grade: 'Grade 1' }
          ],
          categories: {
            Academic: 20,
            Sports: 15,
            Arts: 8,
            Leadership: 5
          }
        }
      };

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setReportData(mockData);
    } catch (error) {
      console.error('Error fetching report data:', error);
      showError('Error fetching report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate export
      showSuccess(`${reportTypes.find(r => r.id === selectedReport)?.name} exported successfully`);
    } catch (error) {
      showError('Error exporting report');
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewReport = () => {
    const data = reportData.overview || {};
    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalStudents || 0}</p>
                <p className="text-sm text-green-600">+{data.trends?.studentsGrowth || 0}% this {selectedPeriod}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Classes</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalClasses || 0}</p>
                <p className="text-sm text-gray-500">Active classes</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                <p className="text-2xl font-bold text-gray-900">{data.averageAttendance || 0}%</p>
                <p className="text-sm text-green-600">+{data.trends?.attendanceChange || 0}% this {selectedPeriod}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Grade</p>
                <p className="text-2xl font-bold text-gray-900">{data.averageGrade || 0}%</p>
                <p className="text-sm text-green-600">+{data.trends?.gradeImprovement || 0}% this {selectedPeriod}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Chart visualization would appear here</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Pie chart would appear here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAcademicReport = () => {
    const data = reportData.academic || {};
    return (
      <div className="space-y-6">
        {/* Subject Performance */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Subject Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Average Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Improvement</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(data.subjectPerformance || []).map((subject, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {subject.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {subject.average}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {subject.students}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      +{subject.improvement}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grade Distribution Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(data.gradeDistribution || {}).map(([grade, count]) => (
              <div key={grade} className="text-center">
                <div className="bg-indigo-100 rounded-lg p-4 mb-2">
                  <div className="text-2xl font-bold text-indigo-600">{count}</div>
                </div>
                <div className="text-sm font-medium text-gray-700">Grade {grade}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAttendanceReport = () => {
    const data = reportData.attendance || {};
    return (
      <div className="space-y-6">
        {/* Attendance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{data.overallRate || 0}%</div>
              <p className="text-sm text-gray-600 mt-1">Overall Attendance Rate</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{data.punctuality || 0}%</div>
              <p className="text-sm text-gray-600 mt-1">Punctuality Rate</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{data.absenteeism || 0}%</div>
              <p className="text-sm text-gray-600 mt-1">Absenteeism Rate</p>
            </div>
          </div>
        </div>

        {/* Daily Attendance Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Attendance Trend</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Daily attendance chart would appear here</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAchievementsReport = () => {
    const data = reportData.achievements || {};
    return (
      <div className="space-y-6">
        {/* Achievement Categories */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievement Categories</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data.categories || {}).map(([category, count]) => (
              <div key={category} className="text-center">
                <div className="bg-purple-100 rounded-lg p-4 mb-2">
                  <div className="text-2xl font-bold text-purple-600">{count}</div>
                </div>
                <div className="text-sm font-medium text-gray-700">{category}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {(data.topPerformers || []).map((performer, index) => (
              <div key={index} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Award className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">{performer.name}</p>
                    <p className="text-sm text-gray-500">{performer.grade}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{performer.awards} Awards</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report data...</p>
        </div>
      );
    }

    switch (selectedReport) {
      case 'overview':
        return renderOverviewReport();
      case 'academic':
        return renderAcademicReport();
      case 'attendance':
        return renderAttendanceReport();
      case 'achievements':
        return renderAchievementsReport();
      default:
        return renderOverviewReport();
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('reports') || 'Reports & Analytics'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('viewAnalytics') || 'View comprehensive analytics and generate reports'}
            </p>
          </div>
          <button
            onClick={handleExportReport}
            disabled={loading}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Exporting...' : (t('exportReport') || 'Export Report')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('reportType') || 'Report Type'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedReport(type.id)}
                    className={`flex items-center p-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedReport === type.id
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {type.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('timePeriod') || 'Time Period'}
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                {timePeriods.map(period => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {renderReportContent()}
    </div>
  );
}