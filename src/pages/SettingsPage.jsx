import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema } from '../utils/validationSchemas';
import { updateProfile } from '../services/userService';
import { getPreferences, updatePreferences } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import PasswordChangeModal from '../components/common/PasswordChangeModal';
import apiClient from '../services/apiClient';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { showNotification } = useNotification();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Notification Preferences State
  const [prefs, setPrefs] = useState({
    budgetWarningsEnabled: true,
    systemAlertsEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: {
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      monthlyIncome: '',
    },
  });

  // Fetch freshest profile and preferences details on mount
  useEffect(() => {
    // Set up stale request cancellation controller
    const abortController = new AbortController();

    const loadData = async () => {
      try {
        const profileRes = await apiClient.get('/api/v1/auth/me', { signal: abortController.signal });
        setValue('username', profileRes.data.username);
        setValue('email', profileRes.data.email);
        setValue('firstName', profileRes.data.firstName || '');
        setValue('lastName', profileRes.data.lastName || '');
        setValue('phoneNumber', profileRes.data.phoneNumber || '');
        setValue('monthlyIncome', profileRes.data.monthlyIncome !== null && profileRes.data.monthlyIncome !== undefined ? String(profileRes.data.monthlyIncome) : '');
      } catch (err) {
        if (!abortController.signal.aborted) {
          if (user) {
            setValue('username', user.username);
            setValue('email', user.email);
            setValue('firstName', user.firstName || '');
            setValue('lastName', user.lastName || '');
            setValue('phoneNumber', user.phoneNumber || '');
            setValue('monthlyIncome', user.monthlyIncome !== null && user.monthlyIncome !== undefined ? String(user.monthlyIncome) : '');
          }
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingProfile(false);
        }
      }

      try {
        const prefsData = await getPreferences();
        setPrefs({
          budgetWarningsEnabled: prefsData.budgetWarningsEnabled,
          systemAlertsEnabled: prefsData.systemAlertsEnabled,
          quietHoursEnabled: prefsData.quietHoursEnabled,
          quietHoursStart: prefsData.quietHoursStart ? prefsData.quietHoursStart.substring(0, 5) : '22:00',
          quietHoursEnd: prefsData.quietHoursEnd ? prefsData.quietHoursEnd.substring(0, 5) : '07:00',
        });
      } catch (err) {
        console.error('Failed to load notification settings:', err);
      }
    };

    loadData();

    return () => {
      abortController.abort(); // Cancel stale pending requests on unmount
    };
  }, [setValue, user]);

  const onSubmitProfile = async (data) => {
    try {
      const updatedUser = await updateProfile(data);
      updateUser({
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber,
        monthlyIncome: updatedUser.monthlyIncome,
      });
      showNotification('Profile updated successfully!', 'success');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to update profile. Email or username might already be in use.';
      showNotification(errMsg, 'error');
    }
  };

  const handleSavePrefs = async (e) => {
    e.preventDefault();
    setIsSavingPrefs(true);
    try {
      // API expects LocalTime as "HH:mm:ss" or "HH:mm". ZDT mapper handles "HH:mm".
      await updatePreferences(prefs);
      showNotification('Notification settings updated successfully!', 'success');
    } catch (err) {
      showNotification('Failed to update alert settings.', 'error');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl transition-colors duration-200">
        <h3 className="text-xl font-bold text-slate-850 dark:text-slate-100">User Settings & Preferences</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal details, email address, password, and notification configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Forms Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Details Form Card */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl transition-colors duration-200">
            <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
              Personal Information
            </h4>
            
            {isLoadingProfile ? (
              <div className="animate-pulse space-y-4">
                <div className="h-12 bg-slate-100 dark:bg-slate-850 rounded-xl w-full"></div>
                <div className="h-12 bg-slate-100 dark:bg-slate-850 rounded-xl w-full"></div>
                <div className="h-10 bg-slate-100 dark:bg-slate-850 rounded-xl w-32"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-4">
                {/* First Name & Last Name Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      {...register('firstName')}
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-slate-850 dark:text-slate-100 placeholder-slate-450 dark:placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                        errors.firstName ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                      }`}
                      placeholder="First name"
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-xs mt-1 font-medium">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      {...register('lastName')}
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-slate-850 dark:text-slate-105 placeholder-slate-450 dark:placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                        errors.lastName ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                      }`}
                      placeholder="Last name"
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-xs mt-1 font-medium">{errors.lastName.message}</p>
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
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-slate-850 dark:text-slate-100 placeholder-slate-450 dark:placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                      errors.username ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                    }`}
                    placeholder="Your username"
                  />
                  {errors.username && (
                    <p className="text-red-500 text-xs mt-1 font-medium">{errors.username.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-slate-850 dark:text-slate-100 placeholder-slate-450 dark:placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                      errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                    }`}
                    placeholder="your.email@example.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>
                  )}
                </div>

                {/* Mobile Number & Monthly Income Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      {...register('phoneNumber')}
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-slate-850 dark:text-slate-100 placeholder-slate-450 dark:placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                        errors.phoneNumber ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                      }`}
                      placeholder="e.g. +1234567890"
                    />
                    {errors.phoneNumber && (
                      <p className="text-red-500 text-xs mt-1 font-medium">{errors.phoneNumber.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Monthly Income (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('monthlyIncome')}
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-slate-850 dark:text-slate-105 placeholder-slate-450 dark:placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                        errors.monthlyIncome ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                      }`}
                      placeholder="e.g. 5000"
                    />
                    {errors.monthlyIncome && (
                      <p className="text-red-500 text-xs mt-1 font-medium">{errors.monthlyIncome.message}</p>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    {isSubmitting ? 'Saving Changes...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Notification Preferences Card */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl transition-colors duration-200">
            <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
              Notification Preferences
            </h4>

            <form onSubmit={handleSavePrefs} className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={prefs.budgetWarningsEnabled}
                    onChange={(e) => setPrefs({ ...prefs, budgetWarningsEnabled: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-offset-2 transition-all cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 group-hover:dark:text-slate-100 transition-colors">
                      Budget & Spending Warnings
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Receive alerts when spending breaches warning thresholds or limits.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={prefs.systemAlertsEnabled}
                    onChange={(e) => setPrefs({ ...prefs, systemAlertsEnabled: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-offset-2 transition-all cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 group-hover:dark:text-slate-100 transition-colors">
                      System & Account Alerts
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Get security updates, account changes, and general notifications.
                    </p>
                  </div>
                </label>

                <div className="border-t border-slate-100 dark:border-slate-850 pt-4 mt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={prefs.quietHoursEnabled}
                      onChange={(e) => setPrefs({ ...prefs, quietHoursEnabled: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-offset-2 transition-all cursor-pointer"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 group-hover:dark:text-slate-100 transition-colors">
                        Quiet Hours
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Mute alerts and notifications during specified times.
                      </p>
                    </div>
                  </label>

                  {prefs.quietHoursEnabled && (
                    <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-slate-50/60 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-850/80 animate-slide-in">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={prefs.quietHoursStart}
                          onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={prefs.quietHoursEnd}
                          onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingPrefs}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                >
                  {isSavingPrefs ? 'Saving Settings...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Info Section */}
        <div className="space-y-6">
          {/* Security details card */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl transition-colors duration-200">
            <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-2">Account Security</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Keep your account secure by modifying your login password credentials regularly.
            </p>

            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-indigo-600 dark:text-indigo-400 hover:text-indigo-750 dark:hover:text-indigo-350 border border-slate-200 dark:border-indigo-900/50 hover:border-slate-350 dark:hover:border-indigo-850 rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              Change Password
            </button>
          </div>

          {/* User card widget */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex items-center gap-4 transition-colors duration-200">
            <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800/70 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold uppercase text-sm">
              {(user?.firstName || user?.username || 'U').charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-850 dark:text-slate-100 truncate">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Overlay Modal */}
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
