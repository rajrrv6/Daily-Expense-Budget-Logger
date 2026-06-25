import React, { createContext, useContext, useState, useCallback } from 'react';

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
      {/* Toast Overlay Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-xs md:max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeNotification(toast.id)}
            className={`flex items-center gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md pointer-events-auto cursor-pointer animate-slide-in transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-red-950/80 border-red-800 text-red-200'
                : 'bg-slate-900/80 border-slate-800 text-slate-200'
            }`}
          >
            <span className="text-lg">
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button className="text-slate-400 hover:text-white text-xs px-1">&times;</button>
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
