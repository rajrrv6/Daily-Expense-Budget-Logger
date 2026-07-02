import React, { useEffect, useState, useCallback } from 'react';
import { useNotification } from '../context/NotificationContext';
import Table from '../components/common/Table';
import EmptyState from '../components/common/EmptyState';
import { getAuditLogs } from '../services/userService';
import { ClipboardList } from 'lucide-react';

export default function AuditLogsPage() {
  const { showNotification } = useNotification();

  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, isLast: true });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(15);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAuditLogs({
        actionType: actionFilter || null,
        search: search || null,
        pageNumber: page,
        pageSize,
      });
      setData(response);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch system audit logs.';
      showNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, search, page, pageSize, showNotification]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Action badge color styling helper
  const getBadgeClass = (actionType) => {
    switch (actionType) {
      case 'USER_LOGIN':
      case 'USER_UNLOCK':
        return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30';
      case 'USER_LOGOUT':
        return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
      case 'RBAC_ROLE_CHANGE':
        return 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30';
      case 'USER_LOCK':
        return 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30';
      case 'SECURITY_BREACH':
        return 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-900/50 animate-pulse';
      case 'USER_REGISTER':
        return 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30';
      case 'USER_EMAIL_VERIFIED':
        return 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30';
      case 'PASSWORD_RESET_REQUEST':
      case 'PASSWORD_RESET_SUCCESS':
        return 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30';
      case 'CATEGORY_CREATE':
        return 'bg-cyan-50 dark:bg-cyan-950/20 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-900/30';
      default:
        return 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Audit Logging</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Chronological record of system events, security logs, and administrative configuration updates.
        </p>
      </div>

      {/* Filter Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-all duration-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Actor Search Input */}
          <div className="relative">
            <span className="absolute left-3.5 top-3 text-slate-400 dark:text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Search by actor username..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Action Type Dropdown */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            >
              <option value="">All Action Types</option>
              <option value="USER_LOGIN">USER_LOGIN</option>
              <option value="USER_LOGOUT">USER_LOGOUT</option>
              <option value="RBAC_ROLE_CHANGE">RBAC_ROLE_CHANGE</option>
              <option value="USER_LOCK">USER_LOCK</option>
              <option value="USER_UNLOCK">USER_UNLOCK</option>
              <option value="SECURITY_BREACH">SECURITY_BREACH</option>
              <option value="USER_REGISTER">USER_REGISTER</option>
              <option value="USER_EMAIL_VERIFIED">USER_EMAIL_VERIFIED</option>
              <option value="PASSWORD_RESET_REQUEST">PASSWORD_RESET_REQUEST</option>
              <option value="PASSWORD_RESET_SUCCESS">PASSWORD_RESET_SUCCESS</option>
              <option value="CATEGORY_CREATE">CATEGORY_CREATE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {loading && data.content.length === 0 ? (
        <div className="w-full overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/20">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 h-12 animate-pulse" />
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-2/5"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/5"></div>
              </div>
            ))}
          </div>
        </div>
      ) : data.content.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-10 h-10 text-slate-400 dark:text-slate-500" />}
          title="No audit logs recorded"
          description="Try adjusting your filter settings or search query."
        />
      ) : (
        <div className="space-y-4">
          <Table
            headers={['Timestamp', 'Actor', 'Action', 'Description']}
            data={data.content}
            renderRow={(log) => (
              <tr key={log.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-colors duration-150">
                {/* Timestamp */}
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </td>

                {/* Actor */}
                <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  {log.username}
                </td>

                {/* Action Type */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getBadgeClass(log.actionType)}`}>
                    {log.actionType}
                  </span>
                </td>

                {/* Description */}
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 break-words max-w-md">
                  {log.description}
                </td>
              </tr>
            )}
          />

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all duration-200">
            <span className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
              Showing page {page + 1} of {data.totalPages || 1} ({data.totalElements} records total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={(data.isLast ?? data.last ?? (page >= data.totalPages - 1)) || data.totalPages <= 1}
                onClick={() => setPage((prev) => prev + 1)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-205 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
