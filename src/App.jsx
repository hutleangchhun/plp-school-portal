import TeacherClasses from './pages/teachers/TeacherClasses';
import TeacherStudentsManagement from './pages/teachers/TeacherStudentsManagement';
import StudentAttendance from './pages/teachers/StudentAttendance';
import TeacherDashboard from './pages/teachers/TeacherDashboard';
import TeacherQRCodeManagement from './pages/teachers/TeacherQRCodeManagement';
import TeacherReports from './pages/teachers/TeacherReports';
import TeacherScheduleCalendar from './components/schedule/TeacherScheduleCalendar';
import DirectorScheduleCalendar from './components/director/DirectorScheduleCalendar';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserActivityLogs from './pages/admin/UserActivityLogs';
import AdminLogs from './pages/admin/AdminLogs';
import TeacherTransferManagement from './pages/admin/TeacherTransferManagement';
import StudentTransferManagement from './pages/admin/StudentTransferManagement';
import StudentDemographicsDashboard from './pages/admin/StudentDemographicsDashboard';
import BMIReport from './pages/admin/BMIReport';
import AttendanceOverview from './pages/admin/AttendanceOverview';
import SchoolAttendanceList from './pages/admin/SchoolAttendanceList';
import TeacherOverviewDashboard from './pages/admin/TeacherOverviewDashboard';
import UserRegistrationDashboard from './pages/admin/UserRegistrationDashboard';
import OfficerRegistration from './pages/admin/OfficerRegistration';
import SchoolManagement from './pages/admin/SchoolManagement';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/auth/Login';
import TwoFactorVerify from './pages/auth/TwoFactorVerify';
import StudentRegistration from './pages/auth/StudentRegistration';
import SchoolLookup from './pages/public/SchoolLookup';
import Layout from './components/layout/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import MultiRoleDashboardPage from './pages/dashboard/MultiRoleDashboardPage';
import ProfileUpdate from './pages/profile/ProfileUpdate';
import DashboardLayout from './components/layout/DashboardLayout';
import NotFound from './pages/NotFound';
//import StudentGradeManagement from './pages/students/StudentGradeManagement';
import StudentsManagement from './pages/students/StudentsManagement';
import StudentSelection from './pages/students/StudentSelection';
import BulkStudentImport from './pages/students/BulkStudentImport';
import QRCodeManagement from './pages/QRCode/QRCodeManagement';
import ClassesManagement from './pages/classes/ClassesManagement';
import TeachersManagement from './pages/teachers/TeachersManagement';
import TeacherEditModal from './components/teachers/TeacherEditModal';
import StudentEditModal from './components/students/StudentEditModal';
import ParentsManagement from './pages/parents/ParentsManagement';
import Reports from './pages/reports/Reports';
import Attendance from './pages/attendance/Attendance';
import DirectorTeacherAttendance from './pages/attendance/DirectorTeacherAttendance';
import DirectorStudentAttendance from './pages/attendance/DirectorStudentAttendance';
import TeacherSelfAttendance from './pages/attendance/TeacherSelfAttendance';
import AttendanceApprovalPage from './pages/attendance/AttendanceApprovalPage';
import DirectorExamRecords from './pages/exam/DirectorExamRecords';
import TeacherExamRecords from './pages/exam/TeacherExamRecords';
import StudentExamRecordsPage from './pages/exam/StudentExamRecordsPage';
import SchoolSettingsPage from './pages/settings/SchoolSettingsPage';
// import Achievements from './pages/achievements/Achievements';
// import Settings from './pages/settings/Settings';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { api, utils } from './utils/api';
import { ProtectedRoute } from './components/common/DynamicRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { setToastContext } from './utils/notificationHelper';
import { canAccessTeacherFeatures } from './utils/routePermissions';
import TelegramFloatingButton from './components/common/TelegramFloatingButton';

function AppContent() {
  const { t } = useLanguage();
  const toastContext = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Track if session was just validated to avoid redundant checks
  const [sessionValidated, setSessionValidated] = useState(false);

  // Initialize notification helper with toast context
  useEffect(() => {
    setToastContext(toastContext);
  }, [toastContext]);

  // Check authentication and sync with localStorage
  const checkAuth = () => {
    const isAuth = api.auth.isAuthenticated();
    console.log('🔄 checkAuth: isAuth=', isAuth);
    
    if (isAuth) {
      const userData = utils.user.getUserData();
      console.log('👤 checkAuth: userData=', userData);
      
      if (!userData) {
        console.warn('⚠️ No user data found despite being authenticated');
        setUser(null);
        return;
      }

      const roleId = userData.roleId ?? userData.role_id;
      const normalizedRoleId = parseInt(roleId);

      // Allow teachers (roleId=8), directors (roleId=14), admin (roleId=1), and restricted roles (roleId 15-21)
      if (![8, 14, 1, 15, 16, 17, 18, 19, 20, 21].includes(normalizedRoleId)) {
        console.warn('❌ Non-authorized user detected. roleId=', roleId, 'Logging out.');
        utils.user.removeUserData();
        setUser(null);
        return;
      }

      setUser({ ...userData, roleId: normalizedRoleId });
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
    setSessionValidated(true);
    setLoading(false);
  }, []);

  // Listen for user data changes from login
  useEffect(() => {
    const handleUserChange = () => {
      console.log('User data changed, re-checking auth...');
      checkAuth();
    };

    window.addEventListener('userDataUpdated', handleUserChange);
    window.addEventListener('storage', handleUserChange);

    return () => {
      window.removeEventListener('userDataUpdated', handleUserChange);
      window.removeEventListener('storage', handleUserChange);
    };
  }, []);

  const handleLogout = async () => {
      utils.user.removeUserData();
      setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">{t('កំពុងផ្ទុក...', 'Loading...')}</div>
      </div>
    );
  }

  return (
    <>
      <Router>
        {user && <TelegramFloatingButton />}
        <Routes>
        <Route
          path="/login"
          element={
            !user ? <Login setUser={setUser} /> :
            (user && user.roleId === 8 ? <Navigate to="/teacher-dashboard" replace /> :
             user && user.roleId === 1 ? <Navigate to="/admin-dashboard" replace /> :
             user && user.roleId === 14 ? <Navigate to="/dashboard" replace /> :
             user && [15, 16, 17, 18, 19, 20, 21].includes(user.roleId) ? <Navigate to="/my-attendance" replace /> :
             <Navigate to="/login" replace />)
          }
        />
        <Route
          path="/auth/2fa/verify"
          element={
            !user ? <TwoFactorVerify setUser={setUser} /> :
            (user && user.roleId === 8 ? <Navigate to="/teacher-dashboard" replace /> :
             user && user.roleId === 1 ? <Navigate to="/admin-dashboard" replace /> :
             user && user.roleId === 14 ? <Navigate to="/dashboard" replace /> :
             user && [15, 16, 17, 18, 19, 20, 21].includes(user.roleId) ? <Navigate to="/my-attendance" replace /> :
             <Navigate to="/dashboard" replace />)
          }
        />

        {/* Public student registration route */}
        <Route
          path="/register/student"
          element={<StudentRegistration />}
        />


        {/* Public school lookup route */}
        <Route
          path="/schools/lookup"
          element={<SchoolLookup />}
        />
        {/* Protected routes with Layout */}
        <Route 
          path="/" 
          element={
            user ? (
              <Layout 
                user={user} 
                setUser={setUser}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        >
          <Route index element={
            user && user.roleId === 8 ? <Navigate to="/teacher-dashboard" replace /> :
            user && user.roleId === 1 ? <Navigate to="/admin-dashboard" replace /> :
            user && user.roleId === 14 ? <Navigate to="/dashboard" replace /> :
            user && [15, 16, 17, 18, 19, 20, 21].includes(user.roleId) ? <Navigate to="/my-attendance" replace /> :
            <Navigate to="/login" replace />
          } />
          
          {/* Dashboard routes with sidebar */}
          <Route path="dashboard/*" element={
            <ProtectedRoute path="/dashboard" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard user={user} setUser={setUser} />} />
          </Route>

          {/* Multi-Role Dashboard route - accessible to users with multi-role data */}
          <Route path="multi-role-dashboard" element={
            <ProtectedRoute path="/multi-role-dashboard" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<MultiRoleDashboardPage user={user} />} />
          </Route>

          {/* Admin dashboard route - accessible to role ID 1 users */}
          <Route path="admin-dashboard" element={
            <ProtectedRoute path="/admin-dashboard" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard user={user} setUser={setUser} />} />
          </Route>

          {/* Admin logs route - role ID 1 only (enforced by routePermissions) */}
          <Route path="admin-logs" element={
            <ProtectedRoute path="/admin-logs" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<AdminLogs />} />
          </Route>
          <Route path="admin/logs" element={
            <ProtectedRoute path="/admin/logs" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<UserActivityLogs />} />
          </Route>

          {/* Admin teacher transfer route - role ID 1 only (enforced by routePermissions) */}
          <Route path="admin/teacher-transfer" element={
            <ProtectedRoute path="/admin/teacher-transfer" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<TeacherTransferManagement />} />
          </Route>

          {/* Admin student transfer route - role ID 1 only (enforced by routePermissions) */}
          <Route path="admin/student-transfer" element={
            <ProtectedRoute path="/admin/student-transfer" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<StudentTransferManagement />} />
          </Route>

          {/* Admin student demographics route - role ID 1 only (enforced by routePermissions) */}
          <Route path="admin/student-demographics" element={
            <ProtectedRoute path="/admin/student-demographics" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<StudentDemographicsDashboard />} />
          </Route>

          {/* Admin BMI report route - role ID 1 only (enforced by routePermissions) */}
          <Route path="admin/bmi-report" element={
            <ProtectedRoute path="/admin/bmi-report" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<BMIReport />} />
          </Route>


          {/* Admin School Attendance List route - role ID 1 only (enforced by routePermissions) */}
          <Route path="admin/school-attendance" element={
            <ProtectedRoute path="/admin/school-attendance" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<SchoolAttendanceList />} />
          </Route>

          {/* Admin Teacher Overview route - role ID 1 only (enforced by routePermissions) */}
          <Route path="admin/teacher-overview" element={
            <ProtectedRoute path="/admin/teacher-overview" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<TeacherOverviewDashboard />} />
          </Route>

          {/* Admin User Registration Dashboard route - role ID 1 only (enforced by routePermissions) */}
          <Route path="admin/user-registration" element={
            <ProtectedRoute path="/admin/user-registration" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<UserRegistrationDashboard />} />
          </Route>

          {/* Admin Officer Registration route - role ID 1 only */}
          <Route path="admin/officer-registration" element={
            <ProtectedRoute path="/admin/officer-registration" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<OfficerRegistration />} />
          </Route>

          {/* Admin School Management route - role ID 1 only (enforced by routePermissions) */}
          <Route path="admin/schools" element={
            <ProtectedRoute path="/admin/schools" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<SchoolManagement />} />
          </Route>

          <Route path="students" element={
            <ProtectedRoute path="/students" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<StudentsManagement />} />
            <Route path="select" element={<StudentSelection />} />
            <Route path="edit" element={<StudentEditModal />} />
            <Route path="bulk-import" element={
              <ProtectedRoute path="/students/bulk-import" user={user}>
                <BulkStudentImport />
              </ProtectedRoute>
            } />
          </Route>
          <Route path="qr-codes" element={
            <ProtectedRoute path="/qr-codes" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={
              user && user.roleId === 8
                ? <TeacherQRCodeManagement user={user} />
                : <QRCodeManagement />
            } />
          </Route>
          
          <Route path="classes" element={
            <ProtectedRoute path="/classes" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<ClassesManagement />} />
          </Route>

          <Route path="teachers" element={
            <ProtectedRoute path="/teachers" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<TeachersManagement />} />
            <Route path="edit" element={<TeacherEditModal />} />
          </Route>

          <Route path="parents" element={
            <ProtectedRoute path="/parents" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<ParentsManagement />} />
          </Route>

          <Route path="profile" element={
            <ProtectedRoute path="/profile" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<ProfileUpdate user={user} setUser={setUser} />} />
          </Route>

          <Route path="settings/school" element={
            <ProtectedRoute path="/settings/school" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <SchoolSettingsPage user={user} />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="attendance" element={
            <ProtectedRoute path="/attendance" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={
              user && canAccessTeacherFeatures(user)
                ? <StudentAttendance user={user} />
                : <Attendance />
            } />
          </Route>

          <Route path="teacher-attendance" element={
            <ProtectedRoute path="/teacher-attendance" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<DirectorTeacherAttendance />} />
          </Route>

          <Route path="student-attendance-view" element={
            <ProtectedRoute path="/student-attendance-view" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<DirectorStudentAttendance />} />
          </Route>

          <Route path="teacher-dashboard" element={
            <ProtectedRoute path="/teacher-dashboard" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<TeacherDashboard user={user} />} />
          </Route>

          <Route path="my-students" element={
            <ProtectedRoute path="/my-students" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<TeacherStudentsManagement user={user} />} />
            <Route path="edit" element={<StudentEditModal />} />
          </Route>

          <Route path="my-attendance" element={
            <ProtectedRoute path="/my-attendance" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<TeacherSelfAttendance />} />
          </Route>

          <Route path="teacher-reports" element={
            <ProtectedRoute path="/teacher-reports" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<TeacherReports user={user} />} />
          </Route>
          <Route path="my-schedule" element={
            <ProtectedRoute path="/my-schedule" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<TeacherScheduleCalendar />} />
          </Route>

          <Route path="school-schedule" element={
            <ProtectedRoute path="/school-schedule" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<DirectorScheduleCalendar />} />
          </Route>

          <Route path="attendance/approval" element={
            <ProtectedRoute path="/attendance/approval" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <AttendanceApprovalPage user={user} />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Sub-route for viewing specific student exam records - MUST come before /exam-records */}
          <Route path="exam-records/:userId" element={
            <ProtectedRoute path="/exam-records/:userId" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <StudentExamRecordsPage user={user} />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Director Exam Records routes with nested sub-routes */}
          <Route path="exam-records" element={
            <ProtectedRoute path="/exam-records" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <DirectorExamRecords user={user} />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Teacher Exam Records route */}
          <Route path="my-students-exams" element={
            <ProtectedRoute path="/my-students-exams" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <TeacherExamRecords user={user} />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Reports route (Directors only) */}
          <Route path="reports" element={
            <ProtectedRoute path="/reports" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <Reports />
              </DashboardLayout>
            </ProtectedRoute>
          } />
        </Route>
        
        {/* Catch-all route for 404 pages */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Router>
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <LoadingProvider>
          <NotificationProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </NotificationProvider>
        </LoadingProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}

export default App;
