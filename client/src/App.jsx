import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ToastProvider from "./components/Toast";
import Navbar from "./components/Navbar";
import PageLoader from "./components/PageLoader";
import BackgroundModel from "./components/BackgroundModel";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SOSPage from "./pages/SOSPage";
import TrackingPage from "./pages/TrackingPage";
import AdminDashboard from "./pages/AdminDashboard";
import DriverPage from "./pages/DriverPage";
import HospitalPage from "./pages/HospitalPage";
import HospitalSignupPage from "./pages/HospitalSignupPage";
import UserLoginPage from "./pages/UserLoginPage";
import DriverLoginPage from "./pages/DriverLoginPage";
import BookingsPage from "./pages/BookingsPage";
import DriverBookingsPage from "./pages/DriverBookingsPage";

function UserOnlyRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/user-login" replace />;

  if (user?.role !== "user") {
    const roleHome = {
      admin: "/admin",
      driver: "/driver",
      hospital: "/hospital",
    };
    return <Navigate to={roleHome[user?.role] || "/"} replace />;
  }

  return children;
}

function DriverOnlyRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/driver-login" replace />;

  if (user?.role !== "driver") {
    const roleHome = {
      admin: "/admin",
      user: "/",
      hospital: "/hospital",
    };
    return <Navigate to={roleHome[user?.role] || "/"} replace />;
  }

  return children;
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <div
              style={{
                minHeight: "100vh",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                transition: "background 0.3s, color 0.3s",
                position: "relative",
              }}
            >
              <BackgroundModel />
              <PageLoader />
              <Navbar />
              <main style={{ paddingTop: "64px" }}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    path="/sos"
                    element={
                      <UserOnlyRoute>
                        <SOSPage />
                      </UserOnlyRoute>
                    }
                  />
                  <Route
                    path="/bookings"
                    element={
                      <UserOnlyRoute>
                        <BookingsPage />
                      </UserOnlyRoute>
                    }
                  />
                  <Route path="/tracking" element={<TrackingPage />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route
                    path="/driver"
                    element={
                      <DriverOnlyRoute>
                        <DriverPage />
                      </DriverOnlyRoute>
                    }
                  />
                  <Route
                    path="/driver/bookings"
                    element={
                      <DriverOnlyRoute>
                        <DriverBookingsPage />
                      </DriverOnlyRoute>
                    }
                  />
                  <Route path="/hospital" element={<HospitalPage />} />
                  <Route
                    path="/hospital-login"
                    element={<HospitalSignupPage />}
                  />
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
