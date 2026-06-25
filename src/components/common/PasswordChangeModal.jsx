import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { passwordChangeSchema } from '../../utils/validationSchemas';
import { updatePassword } from '../../services/userService';
import { useNotification } from '../../context/NotificationContext';
import Modal from './Modal';

export default function PasswordChangeModal({ isOpen, onClose }) {
  const { showNotification } = useNotification();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      await updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      showNotification('Password updated successfully!', 'success');
      reset();
      onClose();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to update password. Please check your credentials.';
      showNotification(errMsg, 'error');
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change Account Password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Current Password
          </label>
          <input
            type="password"
            {...register('currentPassword')}
            className={`w-full px-4 py-3 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
              errors.currentPassword ? 'border-red-500' : 'border-slate-800'
            }`}
            placeholder="••••••••"
          />
          {errors.currentPassword && (
            <p className="text-red-500 text-xs mt-1 font-medium">{errors.currentPassword.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            New Password
          </label>
          <input
            type="password"
            {...register('newPassword')}
            className={`w-full px-4 py-3 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
              errors.newPassword ? 'border-red-500' : 'border-slate-800'
            }`}
            placeholder="••••••••"
          />
          {errors.newPassword && (
            <p className="text-red-500 text-xs mt-1 font-medium">{errors.newPassword.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Confirm New Password
          </label>
          <input
            type="password"
            {...register('confirmPassword')}
            className={`w-full px-4 py-3 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
              errors.confirmPassword ? 'border-red-500' : 'border-slate-800'
            }`}
            placeholder="••••••••"
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1 font-medium">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-medium rounded-xl transition-colors text-sm flex items-center gap-2"
          >
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
