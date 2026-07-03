import React, { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'

// Parent portal — new nested route architecture
const ParentShell = lazy(() => import('./pages/parent/ParentShell'))
const ParentOverview = lazy(() => import('./pages/parent/ParentOverview'))

// Admin portal — new nested route architecture
const AdminShell = lazy(() => import('./pages/admin/AdminShell'))
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'))
const AdminAdmissions = lazy(() => import('./pages/admin/AdminAdmissions'))
const AdminStudents = lazy(() => import('./pages/admin/AdminStudents'))
const AdminTutors = lazy(() => import('./pages/admin/AdminTutors'))
const AdminRecruitment = lazy(() => import('./pages/admin/AdminRecruitment'))
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'))
const AdminClasses = lazy(() => import('./pages/admin/AdminClasses'))
const AdminCurriculum = lazy(() => import('./pages/admin/AdminCurriculum'))
const AdminFinancials = lazy(() => import('./pages/admin/AdminFinancials'))
const AdminPayouts = lazy(() => import('./pages/admin/AdminPayouts'))
const AdminWithdrawals = lazy(() => import('./pages/admin/AdminWithdrawals'))
const AdminComplaints = lazy(() => import('./pages/admin/AdminComplaints'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))

// Tutor portal — new nested route architecture
const TutorShell = lazy(() => import('./pages/tutor/TutorShell'))
const TutorSchedule = lazy(() => import('./pages/tutor/TutorSchedule'))
const TutorRequests = lazy(() => import('./pages/tutor/TutorRequests'))
const TutorWalletPage = lazy(() => import('./pages/tutor/TutorWalletPage'))
const TutorExams = lazy(() => import('./pages/tutor/TutorExams'))
const TutorMaterials = lazy(() => import('./pages/tutor/TutorMaterials'))
const TutorComplaints = lazy(() => import('./pages/tutor/TutorComplaints'))
const TutorProfilePage = lazy(() => import('./pages/tutor/TutorProfilePage'))
const TutorMedia = lazy(() => import('./pages/tutor/TutorMedia'))

// Student portal — new nested route architecture
const StudentShell = lazy(() => import('./pages/student/StudentShell'))
const StudentOverview = lazy(() => import('./pages/student/StudentOverview'))
const StudentClasses = lazy(() => import('./pages/student/StudentClasses'))
const StudentLibrary = lazy(() => import('./pages/student/StudentLibrary'))
const StudentExams = lazy(() => import('./pages/student/StudentExams'))
const StudentFinance = lazy(() => import('./pages/student/StudentFinance'))
const StudentFeedback = lazy(() => import('./pages/student/StudentFeedback'))
const StudentJambCBT = lazy(() => import('./pages/student/StudentJambCBT'))
const StudentSessionDetail = lazy(() => import('./pages/student/StudentSessionDetail'))
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

// Optimized Lazy Loading for all major pages
const Home = lazy(() => import('./pages/Home'))
const Register = lazy(() => import('./pages/Register'))
const Login = lazy(() => import('./pages/Login'))
const PaymentPage = lazy(() => import('./pages/PaymentPage'))
const PaymentCallback = lazy(() => import('./pages/PaymentCallback'))
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
const NotFound = lazy(() => import('./pages/NotFound'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TutorProfile = lazy(() => import('./pages/TutorProfile'))

const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[9999]">
    <div className="relative">
      <div className="w-20 h-20 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 bg-primary/10 blur-xl rounded-full animate-pulse"></div>
      </div>
    </div>
    <p className="mt-8 text-primary font-semibold uppercase tracking-[0.3em] text-[10px] animate-pulse">Hidayah</p>
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
    <MotionConfig reducedMotion="user">
    <AuthProvider>
      <ToastProvider>
      <Router>
        <ScrollToHash />
        <ErrorBoundary>
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

          {/* Admin standalone tools (must appear before nested /admin parent) */}
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
          {/* Admin portal — nested routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<AdminOverview />} />
            <Route path="admissions" element={<AdminAdmissions />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="tutors" element={<AdminTutors />} />
            <Route path="recruitment" element={<AdminRecruitment />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="classes" element={<AdminClasses />} />
            <Route path="curriculum" element={<AdminCurriculum />} />
            <Route path="financials" element={<AdminFinancials />} />
            <Route path="payouts" element={<AdminPayouts />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="complaints" element={<AdminComplaints />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          {/* Tutor portal — nested routes */}
          <Route
            path="/tutor"
            element={
              <ProtectedRoute allowedRoles={['TUTOR', 'ADMIN']}>
                <TutorShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="schedule" replace />} />
            <Route path="schedule" element={<TutorSchedule />} />
            <Route path="requests" element={<TutorRequests />} />
            <Route path="wallet" element={<TutorWalletPage />} />
            <Route path="exams" element={<TutorExams />} />
            <Route path="materials" element={<TutorMaterials />} />
            <Route path="complaints" element={<TutorComplaints />} />
            <Route path="profile" element={<TutorProfilePage />} />
            <Route path="media" element={<TutorMedia />} />
          </Route>
          {/* Student portal — nested routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<StudentOverview />} />
            <Route path="classes" element={<StudentClasses />} />
            <Route path="classes/:id" element={<StudentSessionDetail />} />
            <Route path="library" element={<StudentLibrary />} />
            <Route path="exams" element={<StudentExams />} />
            <Route path="jamb" element={<StudentJambCBT />} />
            <Route path="finance" element={<StudentFinance />} />
            <Route path="feedback" element={<StudentFeedback />} />
          </Route>
          {/* Parent portal — nested routes */}
          <Route
            path="/parent"
            element={
              <ProtectedRoute allowedRoles={['PARENT']}>
                <ParentShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<ParentOverview />} />
          </Route>

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

          {/* Public tutor profile */}
          <Route path="/tutors/:id" element={<TutorProfile />} />

          {/* Legal */}
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
      </Router>
      </ToastProvider>
    </AuthProvider>
    </MotionConfig>
  )
}

export default App
