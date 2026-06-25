import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { registerSchema } from '../utils/validationSchemas';

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
    defaultValues: { username: '', email: '', password: '' },
  });

  const onSubmit = async (data) => {
    setSubmitError('');
    try {
      await signUp(data.username, data.email, data.password);
      showNotification('Account created successfully!', 'success');
      navigate('/');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Registration failed. Try a different username/email.';
      setSubmitError(errMsg);
      showNotification(errMsg, 'error');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-600/20 p-4">
      <div className="w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl">
        {/* Title */}
        <div className="text-center mb-8">
          <span className="text-4xl">💰</span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-100">Create Account</h2>
          <p className="mt-2 text-sm text-slate-400">Sign up to get started</p>
        </div>

        {/* Error Alert */}
        {submitError && (
          <div className="p-4 mb-6 text-sm text-red-200 bg-red-950/40 border border-red-800 rounded-lg">
            ⚠️ {submitError}
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Username
            </label>
            <input
              type="text"
              {...register('username')}
              placeholder="e.g. johndoe"
              className={`w-full px-4 py-3 text-sm text-slate-100 bg-slate-950/80 border ${
                errors.username ? 'border-red-800 focus:border-red-800' : 'border-slate-800 focus:border-brand-500'
              } rounded-lg focus:outline-none transition-colors`}
            />
            {errors.username && (
              <span className="block text-xs text-red-400 mt-1">{errors.username.message}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              {...register('email')}
              placeholder="e.g. john@example.com"
              className={`w-full px-4 py-3 text-sm text-slate-100 bg-slate-950/80 border ${
                errors.email ? 'border-red-800 focus:border-red-800' : 'border-slate-800 focus:border-brand-500'
              } rounded-lg focus:outline-none transition-colors`}
            />
            {errors.email && (
              <span className="block text-xs text-red-400 mt-1">{errors.email.message}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              {...register('password')}
              placeholder="Min 6 characters"
              className={`w-full px-4 py-3 text-sm text-slate-100 bg-slate-950/80 border ${
                errors.password ? 'border-red-800 focus:border-red-800' : 'border-slate-800 focus:border-brand-500'
              } rounded-lg focus:outline-none transition-colors`}
            />
            {errors.password && (
              <span className="block text-xs text-red-400 mt-1">{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-500/25"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-100 hover:text-white transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
