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
    defaultValues: {
      username: '',
      email: '',
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
      } catch (err) {
        if (!abortController.signal.aborted) {
          if (user) {
            setValue('username', user.username);
            setValue('email', user.email);
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
      updateUser({ username: updatedUser.username, email: updatedUser.email });
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
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <h3 className="text-xl font-bold text-slate-100">User Settings & Preferences</h3>
        <p className="text-sm text-slate-400 mt-1">
          Manage your personal details, email address, password, and notification configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Forms Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Details Form Card */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <h4 className="text-base font-semibold text-slate-200 mb-6 pb-2 border-b border-slate-800">
              Personal Information
            </h4>
            
            {isLoadingProfile ? (
              <div className="animate-pulse space-y-4">
                <div className="h-12 bg-slate-850 rounded-xl w-full"></div>
                <div className="h-12 bg-slate-850 rounded-xl w-full"></div>
                <div className="h-10 bg-slate-850 rounded-xl w-32"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    {...register('username')}
                    className={`w-full px-4 py-3 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                      errors.username ? 'border-red-500' : 'border-slate-800'
                    }`}
                    placeholder="Your username"
                  />
                  {errors.username && (
                    <p className="text-red-500 text-xs mt-1 font-medium">{errors.username.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    className={`w-full px-4 py-3 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                      errors.email ? 'border-red-500' : 'border-slate-800'
                    }`}
                    placeholder="your.email@example.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>
                  )}
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
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <h4 className="text-base font-semibold text-slate-200 mb-6 pb-2 border-b border-slate-800">
              Notification Preferences
            </h4>

            <form onSubmit={handleSavePrefs} className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={prefs.budgetWarningsEnabled}
                    onChange={(e) => setPrefs({ ...prefs, budgetWarningsEnabled: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 focus:ring-offset-2 transition-all cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-200 group-hover:text-slate-100 transition-colors">
                      Budget & Spending Warnings
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Receive alerts when spending breaches warning thresholds or limits.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={prefs.systemAlertsEnabled}
                    onChange={(e) => setPrefs({ ...prefs, systemAlertsEnabled: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 focus:ring-offset-2 transition-all cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-200 group-hover:text-slate-100 transition-colors">
                      System & Account Alerts
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Get security updates, account changes, and general notifications.
                    </p>
                  </div>
                </label>

                <div className="border-t border-slate-850 pt-4 mt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={prefs.quietHoursEnabled}
                      onChange={(e) => setPrefs({ ...prefs, quietHoursEnabled: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 focus:ring-offset-2 transition-all cursor-pointer"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-200 group-hover:text-slate-100 transition-colors">
                        Quiet Hours
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Mute alerts and notifications during specified times.
                      </p>
                    </div>
                  </label>

                  {prefs.quietHoursEnabled && (
                    <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-slate-950/60 rounded-xl border border-slate-850/80 animate-slide-in">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={prefs.quietHoursStart}
                          onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <h4 className="text-base font-semibold text-slate-200 mb-2">Account Security</h4>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Keep your account secure by modifying your login password credentials regularly.
            </p>

            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-indigo-400 hover:text-indigo-350 border border-indigo-900/50 hover:border-indigo-800/85 rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              Change Password
            </button>
          </div>

          {/* User card widget */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-indigo-950 border border-indigo-800/70 flex items-center justify-center text-indigo-400 font-bold uppercase text-sm">
              {user?.username?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-100 truncate">{user?.username}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
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
