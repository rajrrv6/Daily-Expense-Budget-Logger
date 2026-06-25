import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import apiClient from '../services/apiClient';

const otpVerificationSchema = z.object({
  email: z.string()
    .trim()
    .min(1, 'Email cannot be blank')
    .email('Invalid email format'),
  otpCode: z.string()
    .trim()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d+$/, 'OTP must contain only numbers'),
});

export default function EmailVerificationPage() {
  const { verifyOtp } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlEmail = searchParams.get('email') || '';

  const [submitError, setSubmitError] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(otpVerificationSchema),
    defaultValues: {
      email: urlEmail,
      otpCode: '',
    },
  });

  // Auto redirect to login on successful verification
  useEffect(() => {
    if (!isVerified) return;
    if (countdown <= 0) {
      navigate('/login');
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isVerified, countdown, navigate]);

  // Sync url param if it changes or loads
  useEffect(() => {
    if (urlEmail) {
      setValue('email', urlEmail);
    }
  }, [urlEmail, setValue]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const onSubmit = async (data) => {
    setSubmitError('');
    try {
      await verifyOtp(data.email, data.otpCode);
      showNotification('Email verified successfully!', 'success');
      setIsVerified(true);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Verification failed. Please check the code.';
      setSubmitError(errMsg);
      showNotification(errMsg, 'error');
    }
  };

  const handleResend = async (emailVal) => {
    if (cooldown > 0 || isResending) return;
    if (!emailVal || !/\S+@\S+\.\S+/.test(emailVal)) {
      showNotification('Please enter a valid email address to resend the code.', 'error');
      return;
    }
    
    setIsResending(true);
    setSubmitError('');
    try {
      await apiClient.post('/api/v1/auth/resend-otp', { email: emailVal });
      showNotification('A new 6-digit OTP code has been sent to your email.', 'success');
      setCooldown(60);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to resend verification code.';
      setSubmitError(errMsg);
      showNotification(errMsg, 'error');
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-colors duration-200 text-center animate-fade-in">
        {/* Success Checkmark Animation */}
          <div className="flex items-center justify-center my-6">
            <div className="relative">
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 dark:bg-emerald-500/10 animate-ping"></div>
              {/* Inner ring */}
              <div className="relative flex items-center justify-center w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-full shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 animate-[bounce_1s_infinite_alternate]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-2">
            Registration Successful! 🎉
          </h2>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Your email has been verified successfully. Please login to access your account dashboard.
          </p>

          <Link
            to="/login"
            className="block w-full py-3 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none transition-all hover:shadow-lg hover:shadow-brand-500/25"
          >
            Sign In to Continue
          </Link>

          <p className="text-xs text-slate-450 dark:text-slate-500 mt-4">
            Redirecting you to login in <span className="font-semibold text-brand-500">{countdown}s</span>...
          </p>
        </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-colors duration-200">
      {/* Title */}
        <div className="text-center mb-8">
          <span className="text-4xl">✉️</span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Verify Email</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Please check your console logs/mock email. We have sent a 6-digit verification code.
          </p>
        </div>

        {/* Error Alert */}
        {submitError && (
          <div className="p-4 mb-6 text-sm text-red-750 dark:text-red-200 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg">
            ⚠️ {submitError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email field */}
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
              <span className="block text-xs text-red-655 dark:text-red-400 mt-1">{errors.email.message}</span>
            )}
          </div>

          {/* OTP Code field */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              6-Digit Verification Code
            </label>
            <input
              type="text"
              maxLength={6}
              {...register('otpCode')}
              placeholder="e.g. 123456"
              className={`w-full px-4 py-3 text-center tracking-[0.5em] text-lg font-bold text-slate-850 dark:text-slate-105 bg-slate-50 dark:bg-slate-950/80 border ${
                errors.otpCode ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
              } rounded-lg focus:outline-none transition-colors`}
            />
            {errors.otpCode && (
              <span className="block text-xs text-red-655 dark:text-red-400 mt-1 text-center">{errors.otpCode.message}</span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-500/25"
          >
            {isSubmitting ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        {/* Resend Cooldown UI */}
        <div className="mt-6 text-center text-sm text-slate-550 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
          <div>
            Didn't receive the code?{' '}
            <button
              type="button"
              disabled={cooldown > 0 || isResending}
              onClick={() => {
                const emailInput = document.querySelector('input[type="email"]');
                handleResend(emailInput?.value || '');
              }}
              className="font-semibold text-brand-500 dark:text-brand-100 hover:text-brand-600 dark:hover:text-white transition-colors disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Code'}
            </button>
          </div>

          <div className="mt-2 border-t border-slate-200 dark:border-slate-800 w-full pt-4">
            <Link to="/login" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
  );
}
