import React, { useState } from 'react';
import Modal from './Modal';

export default function UserStatusToggleModal({ isOpen, onClose, user, onConfirm }) {
  const [isSaving, setIsSaving] = useState(false);
  const isLocked = user?.locked || false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onConfirm(user.id);
      onClose();
    } catch (err) {
      // Error handled by parent page toast
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isLocked ? 'Unlock Account' : 'Lock Account'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isLocked ? (
            <>
              Are you sure you want to unlock the user account for{' '}
              <strong className="text-slate-800 dark:text-slate-200">{user?.username}</strong>? This will allow them to login and access the application immediately.
            </>
          ) : (
            <>
              Are you sure you want to lock the user account for{' '}
              <strong className="text-slate-800 dark:text-slate-200">{user?.username}</strong>?
              <span className="block mt-2 text-red-500 dark:text-red-400 font-semibold">
                Warning: This action will immediately terminate all active sessions for this user, preventing any further API access.
              </span>
            </>
          )}
        </p>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className={`px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer ${
              isLocked
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isSaving ? 'Processing...' : isLocked ? 'Unlock User' : 'Lock User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
