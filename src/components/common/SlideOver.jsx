import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function SlideOver({ isOpen, onClose, title, children }) {
  const drawerRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';

    // Set initial focus to drawer wrapper
    if (drawerRef.current) {
      const focusable = drawerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (onCloseRef.current) onCloseRef.current();
        return;
      }

      if (event.key === 'Tab') {
        if (!drawerRef.current) return;
        const focusable = Array.from(
          drawerRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            event.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus) previousFocus.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        {/* Backdrop overlay */}
        <div
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-350 ease-out"
          onClick={onClose}
        ></div>

        {/* Drawer container */}
        <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
          <div
            ref={drawerRef}
            tabIndex="-1"
            className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col focus:outline-none transition-transform duration-300 ease-in-out transform translate-x-0"
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100">{title}</h3>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition-colors flex items-center justify-center border border-slate-200 dark:border-slate-850 focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-label="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body content (scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
