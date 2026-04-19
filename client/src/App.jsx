import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ToastProvider from './components/Toast';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SOSPage from './pages/SOSPage';
import TrackingPage from './pages/TrackingPage';
import AdminDashboard from './pages/AdminDashboard';
import DriverPage from './pages/DriverPage';
import HospitalPage from './pages/HospitalPage';
import HospitalSignupPage from './pages/HospitalSignupPage';
import UserLoginPage from './pages/UserLoginPage';
import DriverLoginPage from './pages/DriverLoginPage';

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', transition: 'background 0.3s, color 0.3s' }}>
              <Navbar />
              <main style={{ paddingTop: '64px' }}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/sos" element={<SOSPage />} />
                  <Route path="/tracking" element={<TrackingPage />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/driver" element={<DriverPage />} />
                  <Route path="/hospital" element={<HospitalPage />} />
                  <Route path="/hospital-login" element={<HospitalSignupPage />} />
                  <Route path="/user-login" element={<UserLoginPage />} />
                  <Route path="/driver-login" element={<DriverLoginPage />} />
                </Routes>
              </main>
            </div>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
