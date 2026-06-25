import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import PrivateRoute from './components/common/PrivateRoute';
import MainLayout from './components/layout/MainLayout';

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

export default function App() {
  return (
    <Router>
      <NotificationProvider>
        <AuthProvider>
          <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
              <span className="text-xs text-slate-500">Loading requested view...</span>
            </div>
          }>
            <Routes>
              {/* Public authentication flows */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Secure authenticated layout paths */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <MainLayout />
                  </PrivateRoute>
                }
              >
                <Route index element={<DashboardPage />} />
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
    </Router>
  );
}
