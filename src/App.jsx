import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProfileUpdate from './components/ProfileUpdate';
import DashboardLayout from './components/DashboardLayout';
import StudentGradeManagement from './components/StudentGradeManagement';
import StudentsManagement from './components/StudentsManagement';
import ClassesManagement from './components/ClassesManagement';
import Reports from './components/Reports';
import Attendance from './components/Attendance';
import Achievements from './components/Achievements';
import Settings from './components/Settings';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { api, utils } from './utils/api';

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
          <Route path="dashboard/*" element={<DashboardLayout user={user} onLogout={handleLogout} />}>
            <Route index element={<Dashboard user={user} setUser={setUser} />} />
          </Route>
          <Route path="student-grade-management" element={<DashboardLayout user={user} onLogout={handleLogout} />}>
            <Route index element={<StudentGradeManagement />} />
          </Route>
          <Route path="students" element={<DashboardLayout user={user} onLogout={handleLogout} />}>
            <Route index element={<StudentsManagement />} />
          </Route>
          <Route path="classes" element={<DashboardLayout user={user} onLogout={handleLogout} />}>
            <Route index element={<ClassesManagement />} />
          </Route>
          <Route path="reports" element={<DashboardLayout user={user} onLogout={handleLogout} />}>
            <Route index element={<Reports />} />
          </Route>
          <Route path="attendance" element={<DashboardLayout user={user} onLogout={handleLogout} />}>
            <Route index element={<Attendance />} />
          </Route>
          <Route path="achievements" element={<DashboardLayout user={user} onLogout={handleLogout} />}>
            <Route index element={<Achievements />} />
          </Route>
          <Route path="settings" element={<DashboardLayout user={user} onLogout={handleLogout} />}>
            <Route index element={<Settings />} />
          </Route>
          <Route path="profile" element={<DashboardLayout user={user} onLogout={handleLogout} />}>
            <Route index element={<ProfileUpdate user={user} setUser={setUser} />} />
          </Route>
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
