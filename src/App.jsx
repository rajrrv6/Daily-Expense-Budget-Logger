import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import PrivateRoute from './components/common/PrivateRoute';
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Lazy load all page modules for performance optimization
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const TodosPage = lazy(() => import('./pages/TodosPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const EmailVerificationPage = lazy(() => import('./pages/EmailVerificationPage'));

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
          <Suspense fallback={
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors duration-200">
              <span className="text-xs text-slate-500">Loading requested view...</span>
            </div>
          }>
            <Routes>
              {/* Public landing page */}
              <Route path="/" element={<LandingPage />} />

              {/* Public authentication flows */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<EmailVerificationPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </Route>

              {/* Secure authenticated layout paths */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <MainLayout />
                  </PrivateRoute>
                }
              >
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="todos" element={<TodosPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="budgets" element={<BudgetsPage />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </NotificationProvider>
      </ThemeProvider>
    </Router>
  );
}
