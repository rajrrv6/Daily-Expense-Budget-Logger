import React, { useState, useEffect } from 'react';
import Modal from './Modal';

export default function UserRoleEditModal({ isOpen, onClose, user, onSave }) {
  const [role, setRole] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && user.roles) {
      // Find primary role
      const primaryRole = user.roles[0] || 'ROLE_USER';
      setRole(primaryRole);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(user.id, role);
      onClose();
    } catch (err) {
      // Error handled by page toast
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modify User Role">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Modify administrative access for <strong className="text-slate-800 dark:text-slate-200">{user?.username}</strong> ({user?.email}).
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Select Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          >
            <option value="ROLE_USER">User (Standard personal finance access)</option>
            <option value="ROLE_AUDITOR">Auditor (Read-only observer access)</option>
            <option value="ROLE_ADMIN">Administrator (Superuser management access)</option>
          </select>
        </div>

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
            className="px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Update Role'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
