import React, { useEffect, useState, useCallback } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import Table from '../components/common/Table';
import EmptyState from '../components/common/EmptyState';
import UserRoleEditModal from '../components/common/UserRoleEditModal';
import UserStatusToggleModal from '../components/common/UserStatusToggleModal';
import { getUsers, updateUserRole, toggleUserLock } from '../services/userService';
import { UserCog, Lock, Unlock } from 'lucide-react';

export default function AdminUserManagementPage() {
  const { showNotification } = useNotification();
  const { user: currentUser } = useAuth();

  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, isLast: true });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);

  // Modals state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getUsers({
        role: roleFilter || null,
        status: statusFilter || null,
        search: search || null,
        pageNumber: page,
        pageSize,
      });
      setData(response);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch user directory.';
      showNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, search, page, pageSize, showNotification]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleSave = async (userId, newRole) => {
    try {
      const updated = await updateUserRole(userId, newRole);
      showNotification(`Successfully updated role of ${updated.username} to ${newRole}`, 'success');
      
      // Optimistic state update
      setData((prev) => ({
        ...prev,
        content: prev.content.map((u) => (u.id === userId ? { ...u, roles: [newRole] } : u)),
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update user role.';
      showNotification(msg, 'error');
      throw err;
    }
  };

  const handleLockConfirm = async (userId) => {
    try {
      const updated = await toggleUserLock(userId);
      const actionLabel = updated.locked ? 'locked' : 'unlocked';
      showNotification(`Successfully ${actionLabel} account for ${updated.username}`, 'success');

      // Optimistic state update
      setData((prev) => ({
        ...prev,
        content: prev.content.map((u) => (u.id === userId ? { ...u, locked: updated.locked } : u)),
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to toggle account lock status.';
      showNotification(msg, 'error');
      throw err;
    }
  };

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setIsRoleModalOpen(true);
  };

  const openLockModal = (user) => {
    setSelectedUser(user);
    setIsLockModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">User Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configure roles, permissions, and status controls for all system users.</p>
        </div>
      </div>

      {/* Filters Header card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-all duration-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute left-3.5 top-3 text-slate-400 dark:text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Search by name, email, username..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(0);
              }}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            >
              <option value="">All Roles</option>
              <option value="ROLE_ADMIN">Administrator</option>
              <option value="ROLE_AUDITOR">Auditor</option>
              <option value="ROLE_USER">User</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="locked">Locked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading && data.content.length === 0 ? (
        <div className="w-full overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/20">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 h-12 animate-pulse" />
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/12"></div>
              </div>
            ))}
          </div>
        </div>
      ) : data.content.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No users found"
          description="Try adjusting your search query or role filter parameters."
        />
      ) : (
        <div className="space-y-4">
          <Table
            headers={['Profile', 'Name', 'Role', 'Status', 'Registered At', 'Actions']}
            data={data.content}
            renderRow={(u) => {
              const primaryRole = u.roles?.[0] || 'ROLE_USER';
              const cleanRole = primaryRole.replace('ROLE_', '');
              const isMe = currentUser?.username === u.username;

              return (
                <tr key={u.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-colors duration-150">
                  {/* Profile */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-500/10 text-brand-500 dark:text-brand-100 flex items-center justify-center font-bold text-sm">
                        {u.profilePicturePath ? (
                          <img
                            src={`/api/v1/users/profile-picture/${u.profilePicturePath}`}
                            alt={u.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          u.username.substring(0, 1).toUpperCase()
                        )}
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {u.username}
                        </span>
                        <span className="block text-xs text-slate-400 dark:text-slate-550">
                          {u.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-350">
                    {u.firstName || u.lastName ? `${u.firstName} ${u.lastName}`.trim() : <span className="text-slate-400">—</span>}
                  </td>

                  {/* Role */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      primaryRole === 'ROLE_ADMIN'
                        ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30'
                        : primaryRole === 'ROLE_AUDITOR'
                        ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30'
                        : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30'
                    }`}>
                      {cleanRole}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      u.locked
                        ? 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400'
                        : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400'
                    }`}>
                      {u.locked ? 'Locked' : 'Active'}
                    </span>
                  </td>

                  {/* Registered At */}
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openRoleModal(u)}
                        disabled={isMe}
                        className="px-3 py-1.5 text-xs font-semibold text-brand-500 dark:text-brand-100 bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-slate-700 hover:text-brand-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                        title="Change User Role"
                      >
                        <UserCog className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Role</span>
                      </button>
                      <button
                        onClick={() => openLockModal(u)}
                        disabled={isMe}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 ${
                          u.locked
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                            : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100'
                        }`}
                        title={u.locked ? 'Unlock User' : 'Lock User'}
                      >
                        {u.locked ? (
                          <>
                            <Unlock className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Unlock</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Lock</span>
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }}
          />

          {/* Table pagination control footer */}
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all duration-200">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing page {page + 1} of {data.totalPages || 1} ({data.totalElements} users total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={data.isLast || data.totalPages <= 1}
                onClick={() => setPage((prev) => prev + 1)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350 bg-slate-100 dark:bg-slate-800 hover:bg-slate-205 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {isRoleModalOpen && (
        <UserRoleEditModal
          isOpen={true}
          onClose={() => setIsRoleModalOpen(false)}
          user={selectedUser}
          onSave={handleRoleSave}
        />
      )}

      {/* Status Toggle Modal */}
      {isLockModalOpen && (
        <UserStatusToggleModal
          isOpen={true}
          onClose={() => setIsLockModalOpen(false)}
          user={selectedUser}
          onConfirm={handleLockConfirm}
        />
      )}
    </div>
  );
}
