import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { registerSchema } from '../utils/validationSchemas';
import { Wallet, AlertTriangle } from 'lucide-react';

export default function RegisterPage() {
  const { register: signUp } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    setSubmitError('');
    try {
      await signUp(data.username, data.email, data.firstName, data.lastName, data.phoneNumber, data.password);
      showNotification('Account created successfully! Please verify your email with the OTP code.', 'success');
      navigate(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Registration failed. Try a different username/email.';
      setSubmitError(errMsg);
      showNotification(errMsg, 'error');
    }
  };

  return (
    <div className="w-full max-w-lg p-8 bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-colors duration-200">
      {/* Title */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Wallet className="w-12 h-12 text-brand-500 dark:text-brand-100 flex-shrink-0" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Create Account</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign up to get started</p>
        </div>

        {/* Error Alert */}
        {submitError && (
          <div className="p-4 mb-6 text-sm text-red-750 dark:text-red-200 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-550 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                First Name
              </label>
              <input
                type="text"
                {...register('firstName')}
                placeholder="e.g. John"
                className={`w-full px-4 py-3 text-sm text-slate-850 dark:text-slate-105 bg-slate-50 dark:bg-slate-950/80 border ${
                  errors.firstName ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
                } rounded-lg focus:outline-none transition-colors`}
              />
              {errors.firstName && (
                <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.firstName.message}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Last Name
              </label>
              <input
                type="text"
                {...register('lastName')}
                placeholder="e.g. Doe"
                className={`w-full px-4 py-3 text-sm text-slate-850 dark:text-slate-105 bg-slate-50 dark:bg-slate-950/80 border ${
                  errors.lastName ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
                } rounded-lg focus:outline-none transition-colors`}
              />
              {errors.lastName && (
                <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.lastName.message}</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Username
            </label>
            <input
              type="text"
              {...register('username')}
              placeholder="e.g. johndoe"
              className={`w-full px-4 py-3 text-sm text-slate-850 dark:text-slate-105 bg-slate-50 dark:bg-slate-950/80 border ${
                errors.username ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
              } rounded-lg focus:outline-none transition-colors`}
            />
            {errors.username && (
              <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.username.message}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              {...register('email')}
              placeholder="e.g. john@example.com"
              className={`w-full px-4 py-3 text-sm text-slate-850 dark:text-slate-105 bg-slate-50 dark:bg-slate-950/80 border ${
                errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
              } rounded-lg focus:outline-none transition-colors`}
            />
            {errors.email && (
              <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.email.message}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Mobile Number
            </label>
            <input
              type="text"
              {...register('phoneNumber')}
              placeholder="e.g. +1234567890"
              className={`w-full px-4 py-3 text-sm text-slate-850 dark:text-slate-105 bg-slate-50 dark:bg-slate-950/80 border ${
                errors.phoneNumber ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
              } rounded-lg focus:outline-none transition-colors`}
            />
            {errors.phoneNumber && (
              <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.phoneNumber.message}</span>
            )}
          </div>

          {/* Password Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                {...register('password')}
                placeholder="Min 8 characters"
                className={`w-full px-4 py-3 text-sm text-slate-850 dark:text-slate-105 bg-slate-50 dark:bg-slate-950/80 border ${
                  errors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
                } rounded-lg focus:outline-none transition-colors`}
              />
              {errors.password && (
                <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.password.message}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                {...register('confirmPassword')}
                placeholder="Repeat password"
                className={`w-full px-4 py-3 text-sm text-slate-850 dark:text-slate-105 bg-slate-50 dark:bg-slate-950/80 border ${
                  errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
                } rounded-lg focus:outline-none transition-colors`}
              />
              {errors.confirmPassword && (
                <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.confirmPassword.message}</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-500/25"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-500 dark:text-brand-100 hover:text-brand-600 dark:hover:text-white transition-colors">
            Sign In
          </Link>
        </div>
      </div>
  );
}
