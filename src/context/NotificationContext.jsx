import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeNotification = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {/* Toast Overlay Container - Centered */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2.5 w-full max-w-md px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeNotification(toast.id)}
            className={`flex items-center gap-3 p-3.5 pl-4 pr-3.5 w-full md:w-auto md:min-w-[320px] max-w-full rounded-xl border shadow-xl backdrop-blur-md pointer-events-auto cursor-pointer animate-toast-in transition-all duration-300 bg-white/95 dark:bg-slate-900/95 border-slate-250 dark:border-slate-800 text-slate-800 dark:text-slate-100 ${
              toast.type === 'success'
                ? 'border-l-4 border-l-emerald-500 dark:border-l-emerald-500'
                : toast.type === 'error'
                ? 'border-l-4 border-l-rose-500 dark:border-l-rose-500'
                : 'border-l-4 border-l-blue-500 dark:border-l-blue-500'
            }`}
          >
            <span className="flex-shrink-0">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              ) : toast.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
              )}
            </span>
            <span className="text-sm font-semibold flex-1 leading-snug tracking-tight">
              {toast.message}
            </span>
            <button className="text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
