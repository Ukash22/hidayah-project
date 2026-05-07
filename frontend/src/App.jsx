import React, { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

// Optimized Lazy Loading for all major pages
const Home = lazy(() => import('./pages/Home'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const Register = lazy(() => import('./pages/Register'))
const Login = lazy(() => import('./pages/Login'))
const TutorDashboard = lazy(() => import('./pages/TutorDashboard'))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'))
const PaymentPage = lazy(() => import('./pages/PaymentPage'))
const PaymentCallback = lazy(() => import('./pages/PaymentCallback'))
const AdmissionPortal = lazy(() => import('./pages/AdmissionPortal'))
const PendingApproval = lazy(() => import('./pages/PendingApproval'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const TutorRegister = lazy(() => import('./pages/TutorRegister'))
const BookingRequest = lazy(() => import('./pages/BookingRequest'))
const ExamHub = lazy(() => import('./pages/ExamHub'))
const CBTInterface = lazy(() => import('./pages/CBTInterface'))
const AIHub = lazy(() => import('./pages/AIHub'))
const AdminExamManager = lazy(() => import('./pages/AdminExamManager'))
const AdminQuestionManager = lazy(() => import('./pages/AdminQuestionManager'))
const LiveClassRoom = lazy(() => import('./pages/LiveClassRoom'))

const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-[#0a0c10] flex flex-col items-center justify-center z-[9999]">
    <div className="relative">
      <div className="w-20 h-20 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 bg-emerald-500/20 blur-xl rounded-full animate-pulse"></div>
      </div>
    </div>
    <p className="mt-8 text-emerald-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Hidayah Loading...</p>
  </div>
);

const ScrollToHash = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }

    const id = hash.replace('#', '');
    const scrollToElement = () => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView();
        return true;
      }
      return false;
    };

    if (!scrollToElement()) {
      let attempts = 0;
      const interval = setInterval(() => {
        if (scrollToElement() || attempts > 20) {
          clearInterval(interval);
        }
        attempts++;
      }, 100);
      return () => clearInterval(interval);
    }
  }, [pathname, hash]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToHash />
        <Suspense fallback={<LoadingOverlay />}>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/tutor/register" element={<TutorRegister />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:uidb64/:token" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/exams"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminExamManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/exams/:examId/questions"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminQuestionManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tutor"
            element={
              <ProtectedRoute allowedRoles={['TUTOR', 'ADMIN']}>
                <TutorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent"
            element={
              <ProtectedRoute allowedRoles={['PARENT']}>
                <ParentDashboard />
              </ProtectedRoute>
            }
          />

          {/* Exam & AI Routes */}
          <Route
            path="/exam-practice"
            element={
              <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN', 'TUTOR']}>
                <ExamHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/practice/:id"
            element={
              <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN', 'TUTOR']}>
                <CBTInterface />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-hub"
            element={
              <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN', 'TUTOR']}>
                <AIHub />
              </ProtectedRoute>
            }
          />

          {/* Live Class Route */}
          <Route
            path="/live/:roomId"
            element={
              <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN', 'TUTOR']}>
                <LiveClassRoom />
              </ProtectedRoute>
            }
          />

          {/* Booking & Enrollment Routes */}
          <Route
            path="/booking/request"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <BookingRequest />
              </ProtectedRoute>
            }
          />

          {/* Admission Portal (Pre-Payment) */}
          <Route
            path="/admission"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <AdmissionPortal />
              </ProtectedRoute>
            }
          />

          {/* Payment Routes */}
          <Route
            path="/payment"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <PaymentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/callback"
            element={<PaymentCallback />}
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </Router>
    </AuthProvider>
  )
}

export default App
