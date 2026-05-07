import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./App.css";

/* Layout */
import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";

/* Public pages */
import Home from "./pages/Home";
import Artists from "./pages/Artists";
import ArtistProfile from "./pages/ArtistProfile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UpdatePassword from "./pages/UpdatePassword";
import About from "./pages/About";

/* Shared auth pages */
import Notifications from "./pages/Notifications";
import Chat from "./pages/Chat";
import AIChat from "./pages/AIChat";

/* Events */
import Events from "./pages/Events";
import NearbyEvents from "./pages/NearbyEvents";
import EventDetail from "./pages/EventDetail";
import CreateEvent from "./pages/CreateEvent";
import ContactUs from "./pages/ContactUs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";

/* User */
import UserDashboard from "./pages/user/Dashboard";
import UserBookings from "./pages/user/Bookings";
import UserUpdateProfile from "./pages/user/UpdateProfile";
import UserReviews from "./pages/user/Reviews";

/* Artist */
import ArtistDashboard from "./pages/artist/Dashboard";
import ArtistRequests from "./pages/artist/Requests";
import ArtistUpdateProfile from "./pages/artist/UpdateProfile";
import ArtistAvailability from "./pages/artist/Availability";
import ArtistPerformance from "./pages/artist/Performance";

/* Admin */
import AdminDashboard from "./pages/admin/Dashboard";
import AdminApprovals from "./pages/admin/Approvals";
import AdminUsers from "./pages/admin/Users";
import AdminBookings from "./pages/admin/Bookings";
import AdminModeration from "./pages/admin/Moderation";
import AdminNotifications from "./pages/admin/Notifications";
import useAuth from "./hooks/useAuth";
import useArtistApproval from "./hooks/useArtistApproval";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
}

function ArtistApprovalGate({ children }) {
  const { user } = useAuth();
  const { loading, isApproved } = useArtistApproval();
  const { t } = useTranslation();

  if (user?.accountType !== "ARTIST") return children;
  if (loading) {
    return (
      <div className="main-content text-center" style={{ padding: "4rem" }}>
        <span className="spinner" /> {t("app_loading")}
      </div>
    );
  }
  if (!isApproved) return <Navigate to="/artist/dashboard" replace />;
  return children;
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { user, resolved } = useAuth();
  const { t } = useTranslation();

  if (!resolved) {
    return (
      <div className="main-content text-center" style={{ padding: "4rem" }}>
        <span className="spinner" /> {t("app_loading")}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function App() {
  const { refreshUser, logout } = useAuth();

  useEffect(() => {
    refreshUser().catch((err) => {
      if (err?.status === 401) {
        logout({ silent: true });
      }
    });
  }, [refreshUser, logout]);

  return (
    <>
      <div className="mandala-bg" />
      <div className="app-shell">
        <ScrollToTop />
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/artists" element={<Artists />} />
            <Route path="/artist/:id" element={<ArtistProfile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/update-password/:token" element={<UpdatePassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Events */}
            <Route path="/events" element={<Events />} />
            <Route path="/events/nearby" element={<NearbyEvents />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/events/create" element={<CreateEvent />} />
            <Route path="/events/:id/edit" element={<CreateEvent />} />
            <Route path="/contact" element={<ContactUs />} />

            {/* Shared auth */}
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ArtistApprovalGate>
                    <Chat />
                  </ArtistApprovalGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-chat"
              element={
                <ProtectedRoute>
                  <AIChat />
                </ProtectedRoute>
              }
            />

            {/* User */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <UserBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-reviews"
              element={
                <ProtectedRoute>
                  <UserReviews />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute>
                  <UserUpdateProfile />
                </ProtectedRoute>
              }
            />

            {/* Artist */}
            <Route
              path="/artist/dashboard"
              element={
                <ProtectedRoute>
                  <ArtistDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artist/requests"
              element={
                <ProtectedRoute>
                  <ArtistApprovalGate>
                    <ArtistRequests />
                  </ArtistApprovalGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/artist/profile/edit"
              element={
                <ProtectedRoute>
                  <ArtistUpdateProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artist/availability"
              element={
                <ProtectedRoute>
                  <ArtistApprovalGate>
                    <ArtistAvailability />
                  </ArtistApprovalGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/artist/performance"
              element={
                <ProtectedRoute>
                  <ArtistApprovalGate>
                    <ArtistPerformance />
                  </ArtistApprovalGate>
                </ProtectedRoute>
              }
            />

            {/* Admin */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/approvals"
              element={
                <ProtectedRoute>
                  <AdminApprovals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bookings"
              element={
                <ProtectedRoute>
                  <AdminBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/moderation"
              element={
                <ProtectedRoute>
                  <AdminModeration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <ProtectedRoute>
                  <AdminNotifications />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </>
  );
}

export default App;
