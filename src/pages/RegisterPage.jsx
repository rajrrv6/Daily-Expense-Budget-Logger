import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { registerSchema } from '../utils/validationSchemas';
import { Wallet, AlertTriangle, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const { register: signUp } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
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

  const values = watch();
  const isFormFilled = 
    values.username?.trim() &&
    values.email?.trim() &&
    values.firstName?.trim() &&
    values.lastName?.trim() &&
    values.phoneNumber?.trim() &&
    values.password &&
    values.confirmPassword;

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
    <div className="w-full max-w-lg p-6 bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-colors duration-200 max-h-[88vh] overflow-y-auto custom-scrollbar">
      {/* Title */}
      <div className="text-center mb-4 flex flex-col items-center">
        <Wallet className="w-9 h-9 text-brand-500 dark:text-brand-100 flex-shrink-0" />
        <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Create Account</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sign up to get started</p>
      </div>

      {/* Error Alert */}
      {submitError && (
        <div className="p-3.5 mb-4 text-xs text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Register Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
        {/* Name Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              First Name
            </label>
            <input
              type="text"
              {...register('firstName')}
              placeholder="e.g. John"
              className={`w-full px-4 py-2 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/80 border ${
                errors.firstName ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
              } rounded-lg focus:outline-none transition-colors`}
            />
            {errors.firstName && (
              <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.firstName.message}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Last Name
            </label>
            <input
              type="text"
              {...register('lastName')}
              placeholder="e.g. Doe"
              className={`w-full px-4 py-2 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/80 border ${
                errors.lastName ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
              } rounded-lg focus:outline-none transition-colors`}
            />
            {errors.lastName && (
              <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.lastName.message}</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Username
          </label>
          <input
            type="text"
            {...register('username')}
            placeholder="e.g. johndoe"
            className={`w-full px-4 py-2 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/80 border ${
              errors.username ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
            } rounded-lg focus:outline-none transition-colors`}
          />
          {errors.username && (
            <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.username.message}</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            {...register('email')}
            placeholder="e.g. john@example.com"
            className={`w-full px-4 py-2 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/80 border ${
              errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
            } rounded-lg focus:outline-none transition-colors`}
          />
          {errors.email && (
            <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.email.message}</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Mobile Number
          </label>
          <input
            type="text"
            {...register('phoneNumber')}
            placeholder="e.g. +1234567890"
            className={`w-full px-4 py-2 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/80 border ${
              errors.phoneNumber ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
            } rounded-lg focus:outline-none transition-colors`}
          />
          {errors.phoneNumber && (
            <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.phoneNumber.message}</span>
          )}
        </div>

        {/* Password Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="Min 8 characters"
                className={`w-full pl-4 pr-10 py-2 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/80 border ${
                  errors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
                } rounded-lg focus:outline-none transition-colors`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors focus:outline-none flex items-center justify-center"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.password.message}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                placeholder="Repeat password"
                className={`w-full pl-4 pr-10 py-2 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/80 border ${
                  errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-brand-500'
                } rounded-lg focus:outline-none transition-colors`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors focus:outline-none flex items-center justify-center"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{errors.confirmPassword.message}</span>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isFormFilled}
          className="w-full py-2.5 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-500/25"
        >
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-500 dark:text-brand-100 hover:text-brand-600 dark:hover:text-white transition-colors">
          Sign In
        </Link>
      </div>
    </div>
  );
}
