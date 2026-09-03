import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ThemeProvider } from "@/components/ThemeProvider";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminTests from "./pages/admin/AdminTests";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminReports from "./pages/admin/AdminReports";
import AdminLeaderboard from "./pages/admin/AdminLeaderboard";
import AdminSettings from "./pages/admin/AdminSettings";

import StudentDashboard from "./pages/student/StudentDashboard";
import StudentTests from "./pages/student/StudentTests";
import StudentResults from "./pages/student/StudentResults";
import StudentSchedule from "./pages/student/StudentSchedule";
import StudentProfile from "./pages/student/StudentProfile";
import StudentCompanies from "./pages/student/StudentCompanies";
import StudentMeetings from "./pages/student/StudentMeetings";
import StudentScoreCard from "./pages/student/StudentScoreCard";
import CompanyDetail from "./pages/student/CompanyDetail";

import CompanyRegister from "./pages/company/CompanyRegister";
import CompanyDashboard from "./pages/company/CompanyDashboard";
import CompanyDriveRounds from "./pages/company/CompanyDriveRounds";
import CompanyTests from "./pages/company/CompanyTests";
import CompanyCandidates from "./pages/company/CompanyCandidates";
import CompanyReports from "./pages/company/CompanyReports";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

function AuthRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={role === "admin" ? "/admin" : role === "company" ? "/company" : "/dashboard"} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Company Registration Forum (Open / Invites) */}
              <Route path="/company/register" element={<CompanyRegister />} />

              {/* Admin routes */}
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><DashboardLayout><AdminDashboard /></DashboardLayout></ProtectedRoute>} />
              <Route path="/admin/companies" element={<ProtectedRoute requiredRole="admin"><DashboardLayout><AdminCompanies /></DashboardLayout></ProtectedRoute>} />
              <Route path="/admin/tests" element={<ProtectedRoute requiredRole="admin"><DashboardLayout><AdminTests /></DashboardLayout></ProtectedRoute>} />
              <Route path="/admin/students" element={<ProtectedRoute requiredRole="admin"><DashboardLayout><AdminStudents /></DashboardLayout></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute requiredRole="admin"><DashboardLayout><AdminAnalytics /></DashboardLayout></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute requiredRole="admin"><DashboardLayout><AdminReports /></DashboardLayout></ProtectedRoute>} />
              <Route path="/admin/leaderboard" element={<ProtectedRoute requiredRole="admin"><DashboardLayout><AdminLeaderboard /></DashboardLayout></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><DashboardLayout><AdminSettings /></DashboardLayout></ProtectedRoute>} />

              {/* Company Recruiter routes */}
              <Route path="/company" element={<ProtectedRoute requiredRole="company"><DashboardLayout><CompanyDashboard /></DashboardLayout></ProtectedRoute>} />
              <Route path="/company/dashboard" element={<ProtectedRoute requiredRole="company"><DashboardLayout><CompanyDashboard /></DashboardLayout></ProtectedRoute>} />
              <Route path="/company/rounds" element={<ProtectedRoute requiredRole="company"><DashboardLayout><CompanyDriveRounds /></DashboardLayout></ProtectedRoute>} />
              <Route path="/company/tests" element={<ProtectedRoute requiredRole="company"><DashboardLayout><CompanyTests /></DashboardLayout></ProtectedRoute>} />
              <Route path="/company/candidates" element={<ProtectedRoute requiredRole="company"><DashboardLayout><CompanyCandidates /></DashboardLayout></ProtectedRoute>} />
              <Route path="/company/reports" element={<ProtectedRoute requiredRole="company"><DashboardLayout><CompanyReports /></DashboardLayout></ProtectedRoute>} />

              {/* Student routes */}
              <Route path="/dashboard" element={<ProtectedRoute requiredRole="student"><DashboardLayout><StudentDashboard /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/tests" element={<ProtectedRoute requiredRole="student"><DashboardLayout><StudentTests /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/results" element={<ProtectedRoute requiredRole="student"><DashboardLayout><StudentResults /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/schedule" element={<ProtectedRoute requiredRole="student"><DashboardLayout><StudentSchedule /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/meetings" element={<ProtectedRoute requiredRole="student"><DashboardLayout><StudentMeetings /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/scorecard" element={<ProtectedRoute requiredRole="student"><DashboardLayout><StudentScoreCard /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/profile" element={<ProtectedRoute requiredRole="student"><DashboardLayout><StudentProfile /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/companies" element={<ProtectedRoute requiredRole="student"><DashboardLayout><StudentCompanies /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/companies/:id" element={<ProtectedRoute requiredRole="student"><DashboardLayout><CompanyDetail /></DashboardLayout></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
