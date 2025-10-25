import TeacherClasses from './pages/teachers/TeacherClasses';
import TeacherStudentsManagement from './pages/teachers/TeacherStudentsManagement';
import StudentAttendance from './pages/teachers/StudentAttendance';
import TeacherDashboard from './pages/teachers/TeacherDashboard';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/auth/Login';
import StudentRegistration from './pages/auth/StudentRegistration';
import Layout from './components/layout/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import ProfileUpdate from './pages/profile/ProfileUpdate';
import DashboardLayout from './components/layout/DashboardLayout';
import NotFound from './pages/NotFound';
//import StudentGradeManagement from './pages/students/StudentGradeManagement';
import StudentsManagement from './pages/students/StudentsManagement';
import StudentSelection from './pages/students/StudentSelection';
import BulkStudentImport from './pages/students/BulkStudentImport';
import ClassesManagement from './pages/classes/ClassesManagement';
import TeachersManagement from './pages/teachers/TeachersManagement';
import ParentsManagement from './pages/parents/ParentsManagement';
// Temporarily removed imports (will be re-enabled later):
// import Reports from './pages/reports/Reports';
import Attendance from './pages/attendance/Attendance';
import DirectorTeacherAttendance from './pages/attendance/DirectorTeacherAttendance';
import TeacherSelfAttendance from './pages/attendance/TeacherSelfAttendance';
import AttendanceApprovalPage from './pages/attendance/AttendanceApprovalPage';
// import Achievements from './pages/achievements/Achievements';
// import Settings from './pages/settings/Settings';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { api, utils } from './utils/api';
import { ProtectedRoute } from './components/common/DynamicRoute';
import ErrorBoundary from './components/ErrorBoundary';

function AppContent() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAuth = api.auth.isAuthenticated();
    if (isAuth) {
      const userData = utils.user.getUserData();

      // IMPORTANT: Only teachers (roleId=8) and directors (roleId=8, isDirector=true) can access this portal
      if (userData && userData.roleId !== 8) {
        console.warn('Non-teacher/director user detected. Logging out.');
        utils.user.removeUserData();
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(userData);
    }
    setLoading(false);
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
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            !user ? <Login setUser={setUser} /> :
            (user && user.roleId === 8 && user.isDirector !== true ? <Navigate to="/my-classes" replace /> : <Navigate to="/dashboard" replace />)
          }
        />

        {/* Public student registration route */}
        <Route
          path="/register/student"
          element={<StudentRegistration />}
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
          <Route index element={user && user.roleId === 8 && user.isDirector !== true ? <Navigate to="/my-classes" replace /> : <Navigate to="/dashboard" replace />} />
          
          {/* Dashboard routes with sidebar */}
          <Route path="dashboard/*" element={
            <ProtectedRoute path="/dashboard" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard user={user} setUser={setUser} />} />
          </Route>
          
          <Route path="students" element={
            <ProtectedRoute path="/students" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<StudentsManagement />} />
            <Route path="select" element={<StudentSelection />} />
            <Route path="bulk-import" element={
              <ProtectedRoute path="/students/bulk-import" user={user}>
                <BulkStudentImport />
              </ProtectedRoute>
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

          <Route path="attendance" element={
            <ProtectedRoute path="/attendance" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={
              user && user.roleId === 8 && !user.isDirector
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

          <Route path="my-classes" element={
            <ProtectedRoute path="/my-classes" user={user}>
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
          </Route>

          <Route path="my-attendance" element={
            <ProtectedRoute path="/my-attendance" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<TeacherSelfAttendance />} />
          </Route>

          <Route path="attendance/approval" element={
            <ProtectedRoute path="/attendance/approval" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <AttendanceApprovalPage user={user} />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Temporarily removed routes (will be re-enabled later):
              - reports, attendance, achievements, settings
              - my-grades, my-assignments */}
        </Route>
        
        {/* Catch-all route for 404 pages */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
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
