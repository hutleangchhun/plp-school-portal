import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/auth/Login';
import Layout from './components/layout/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import ProfileUpdate from './pages/profile/ProfileUpdate';
import DashboardLayout from './components/layout/DashboardLayout';
//import StudentGradeManagement from './pages/students/StudentGradeManagement';
import StudentsManagement from './pages/students/StudentsManagement';
import StudentSelection from './pages/students/StudentSelection';
import ClassesManagement from './pages/classes/ClassesManagement';
// Temporarily removed imports (will be re-enabled later):
// import Reports from './pages/reports/Reports';
// import Attendance from './pages/attendance/Attendance';
// import Achievements from './pages/achievements/Achievements';
// import Settings from './pages/settings/Settings';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { api, utils } from './utils/api';
import { ProtectedRoute } from './components/common/DynamicRoute';

function AppContent() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAuth = api.auth.isAuthenticated();
    if (isAuth) {
      const userData = utils.user.getUserData();
      setUser(userData);
    }
    setLoading(false);
  }, []);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    // Clear user data
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
          element={!user ? <Login setUser={setUser} /> : <Navigate to="/dashboard" />} 
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
          <Route index element={<Navigate to="/dashboard" />} />
          
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
          </Route>
          
          <Route path="classes" element={
            <ProtectedRoute path="/classes" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<ClassesManagement />} />
          </Route>
          
          <Route path="profile" element={
            <ProtectedRoute path="/profile" user={user}>
              <DashboardLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<ProfileUpdate user={user} setUser={setUser} />} />
          </Route>

          {/* Temporarily removed routes (will be re-enabled later):
              - reports, attendance, achievements, settings
              - my-grades, my-attendance, my-assignments */}
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </LanguageProvider>
  );
}

export default App;
