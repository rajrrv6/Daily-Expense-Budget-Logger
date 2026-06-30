import React from 'react';
import { Eye, Edit3, Trash2 } from 'lucide-react';

export default function ActionIcons({ 
  onView, 
  onEdit, 
  onDelete, 
  viewTitle = "View details", 
  editTitle = "Edit item", 
  deleteTitle = "Delete item",
  viewDisabled = false,
  editDisabled = false,
  deleteDisabled = false,
  ariaLabelView = "View item",
  ariaLabelEdit = "Edit item",
  ariaLabelDelete = "Delete item"
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {onView && (
        <button
          onClick={onView}
          disabled={viewDisabled}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-30 disabled:cursor-not-allowed"
          title={viewDisabled ? "Unavailable" : viewTitle}
          aria-label={ariaLabelView}
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          disabled={editDisabled}
          className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-55 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/30 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
          title={editDisabled ? "Unavailable" : editTitle}
          aria-label={ariaLabelEdit}
        >
          <Edit3 className="w-4 h-4" />
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          disabled={deleteDisabled}
          className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/30 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-30 disabled:cursor-not-allowed"
          title={deleteDisabled ? "Unavailable" : deleteTitle}
          aria-label={ariaLabelDelete}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
