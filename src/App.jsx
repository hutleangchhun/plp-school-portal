import TeacherClasses from './pages/teachers/TeacherClasses';
import TeacherStudentsManagement from './pages/teachers/TeacherStudentsManagement';
import StudentAttendance from './pages/teachers/StudentAttendance';
import TeacherDashboard from './pages/teachers/TeacherDashboard';
import TeacherQRCodeManagement from './pages/teachers/TeacherQRCodeManagement';
import TeacherReports from './pages/teachers/TeacherReports';
import AdminDashboard from './pages/admin/AdminDashboard';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/auth/Login';
import StudentRegistration from './pages/auth/StudentRegistration';
import SchoolLookup from './pages/public/SchoolLookup';
import Layout from './components/layout/Layout';
import Dashboard from './pages/dashboard/Dashboard';
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

function AppContent() {
  const { t } = useLanguage();
  const toastContext = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize notification helper with toast context
  useEffect(() => {
    setToastContext(toastContext);
  }, [toastContext]);

  useEffect(() => {
    const isAuth = api.auth.isAuthenticated();
    if (isAuth) {
      const userData = utils.user.getUserData();

      // Allow teachers (roleId=8), directors (roleId=14), and role ID 1 users
      if (userData && ![8, 14, 1].includes(userData.roleId)) {
        console.warn('Non-authorized user detected. Logging out.');
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
            (user && user.roleId === 8 ? <Navigate to="/teacher-dashboard" replace /> :
             user && user.roleId === 1 ? <Navigate to="/admin-dashboard" replace /> :
             user && user.roleId === 14 ? <Navigate to="/dashboard" replace /> :
             <Navigate to="/login" replace />)
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

          {/* Admin dashboard route - accessible to role ID 1 users */}
          <Route path="admin-dashboard" element={
            <ProtectedRoute path="/admin-dashboard" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard user={user} setUser={setUser} />} />
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
              user && user.roleId === 8
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
