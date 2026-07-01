import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import apiClient from '../services/apiClient';
import { Mail, AlertTriangle } from 'lucide-react';

const otpVerificationSchema = z.object({
  email: z.string()
    .trim()
    .min(1, 'Email cannot be blank.')
    .email('Invalid email format.'),
  otpCode: z.string()
    .trim()
    .length(6, 'Verification code must be exactly 6 digits.')
    .regex(/^\d+$/, 'Verification code must contain only numbers.'),
});

export default function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';

  const { verifyOtp } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [submitError, setSubmitError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(otpVerificationSchema),
    defaultValues: {
      email: emailFromUrl,
      otpCode: '',
    },
  });

  useEffect(() => {
    if (emailFromUrl) {
      setValue('email', emailFromUrl);
    }
  }, [emailFromUrl, setValue]);

  useEffect(() => {
    if (!isSuccess) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSuccess, navigate]);

  const onSubmit = async (data) => {
    setSubmitError('');
    try {
      await verifyOtp(data.email, data.otpCode);
      showNotification('Email verified successfully! You can now log in.', 'success');
      setIsSuccess(true);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Verification failed. Please check the code.';
      setSubmitError(errMsg);
      showNotification(errMsg, 'error');
    }
  };

  const handleResendOtp = async (emailVal) => {
    if (!emailVal) {
      showNotification('Please enter email address to resend code.', 'error');
      return;
    }
    try {
      await apiClient.post('/api/v1/auth/resend-otp', { email: emailVal });
      showNotification('Verification code resent successfully.', 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to resend code.', 'error');
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-colors duration-200 text-center space-y-4">
          <div className="flex justify-center">
            <span className="text-4xl text-emerald-500">✓</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Verification Complete</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Thank you! Your email has been verified successfully.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
            Redirecting you to login in <span className="font-semibold text-brand-500">{countdown}s</span>...
          </p>
        </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-colors duration-200">
      {/* Title */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Mail className="w-12 h-12 text-brand-500 dark:text-brand-100 flex-shrink-0" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Verify Email</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Please check your console logs/mock email. We have sent a 6-digit verification code.
          </p>
        </div>

        {/* Error Alert */}
        {submitError && (
          <div className="p-4 mb-6 text-sm text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <span>{submitError}</span>
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
              className={`w-full px-4 py-3 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/80 border ${
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
              className={`w-full px-4 py-3 text-center tracking-[0.5em] text-lg font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/80 border ${
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

        {/* Resend UI */}
        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
          <div>
            Didn&apos;t receive the code?{' '}
            <button
              type="button"
              onClick={() => handleResendOtp(watch('email'))}
              className="font-semibold text-brand-500 dark:text-brand-100 hover:text-brand-600 dark:hover:text-white transition-colors"
            >
              Resend Code
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
