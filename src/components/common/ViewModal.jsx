import React from 'react';
import CenterModal from './CenterModal';

export default function ViewModal({ isOpen, onClose, title, fields = [], extraContent }) {
  return (
    <CenterModal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((field, idx) => (
            <div key={idx} className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {field.label}
              </span>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {field.value || <span className="text-slate-400 dark:text-slate-600 font-normal">N/A</span>}
              </div>
            </div>
          ))}
        </div>

        {extraContent && (
          <div className="border-t border-slate-150 dark:border-slate-800/80 pt-4 mt-4">
            {extraContent}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-150 dark:border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            Close
          </button>
        </div>
      </div>
    </CenterModal>
  );
}
