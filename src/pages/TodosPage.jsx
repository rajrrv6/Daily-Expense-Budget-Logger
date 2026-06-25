import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getTodos, createTodo, updateTodo, toggleTodo, deleteTodo } from '../services/todoService';
import { useNotification } from '../context/NotificationContext';

export default function TodosPage() {
  const { showNotification } = useNotification();

  // State Management
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'COMPLETED'
  const [newValue, setNewValue] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  // Multi-click submission safeguards
  const [submitting, setSubmitting] = useState(false);
  const [togglingIds, setTogglingIds] = useState(new Set());
  const [deletingIds, setDeletingIds] = useState(new Set());

  // Fetch checklist items
  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTodos();
      setTodos(data);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to retrieve checklist tasks.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // Add Item - Optimistic UI + Rollback
  const handleAddTodo = async (e) => {
    e.preventDefault();
    const nameStr = newValue.trim();
    if (!nameStr) return;

    setSubmitting(true);
    const tempId = crypto.randomUUID();
    const originalTodos = [...todos];

    const tempTodo = {
      id: tempId,
      name: nameStr,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistically update list
    setTodos((prev) => [tempTodo, ...prev]);
    setNewValue('');

    try {
      const savedItem = await createTodo({ name: nameStr });
      // Replace temporary item with actual backend response DTO
      setTodos((prev) => prev.map((t) => (t.id === tempId ? savedItem : t)));
      showNotification('Checklist item added.', 'success');
    } catch (err) {
      // Rollback
      setTodos(originalTodos);
      setNewValue(nameStr); // Restore typed name for convenience
      showNotification(err.response?.data?.message || 'Failed to add item. Rolled back.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Item Completion - Optimistic UI + Rollback + Double Click Prevention
  const handleToggle = async (id) => {
    if (togglingIds.has(id)) return; // Debounce rapid clicking

    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    const originalTodos = [...todos];

    // Optimistically toggle completion
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() } : t))
    );

    try {
      await toggleTodo(id);
    } catch (err) {
      // Rollback on failure
      setTodos(originalTodos);
      showNotification(err.response?.data?.message || 'Failed to toggle task. Rolled back.', 'error');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Delete Item - Optimistic UI + Rollback + Double Click Prevention
  const handleDelete = async (id) => {
    if (deletingIds.has(id)) return;

    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    const originalTodos = [...todos];

    // Optimistically remove from view
    setTodos((prev) => prev.filter((t) => t.id !== id));

    try {
      await deleteTodo(id);
      showNotification('Checklist item deleted.', 'success');
    } catch (err) {
      // Rollback on failure
      setTodos(originalTodos);
      showNotification(err.response?.data?.message || 'Failed to delete task. Rolled back.', 'error');
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Edit inline handler
  const startEditing = (id, name) => {
    setEditingId(id);
    setEditingValue(name);
  };

  const handleEditSave = async (id) => {
    const editStr = editingValue.trim();
    if (!editStr) {
      setEditingId(null);
      return;
    }

    const originalTodos = [...todos];

    // Optimistically update locally
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, name: editStr } : t)));
    setEditingId(null);

    try {
      await updateTodo(id, { name: editStr });
      showNotification('Checklist item updated.', 'success');
    } catch (err) {
      // Rollback
      setTodos(originalTodos);
      showNotification(err.response?.data?.message || 'Failed to save edits. Rolled back.', 'error');
    }
  };

  const handleEditKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      handleEditSave(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  // Stable memoized filter selection
  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (filter === 'PENDING') return !todo.completed;
      if (filter === 'COMPLETED') return todo.completed;
      return true;
    });
  }, [todos, filter]);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
        <h3 className="text-xl font-semibold text-slate-100">Shopping Checklist</h3>
        <p className="text-sm text-slate-400 mt-1">
          Manage tasks or budget purchases. Changes sync automatically in the background.
        </p>
      </div>

      {/* Input Form Panel */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
        <form onSubmit={handleAddTodo} className="flex gap-4">
          <input
            type="text"
            value={newValue}
            disabled={submitting}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Type purchase name (e.g. Buy milk, office desk)..."
            className="flex-1 px-4 py-2.5 text-sm text-slate-200 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-brand-500 disabled:opacity-50"
            aria-label="Add new shopping item"
          />
          <button
            type="submit"
            disabled={submitting || !newValue.trim()}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      </div>

      {/* List Manager Panel */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl min-h-[400px]">
        {/* Filter controls - Accessibility active */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-6">
          <div className="flex gap-2" role="tablist" aria-label="Task Status Filters">
            {['ALL', 'PENDING', 'COMPLETED'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors outline-none ${
                  filter === status
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-400 bg-slate-950/40 hover:bg-slate-900'
                }`}
                role="tab"
                aria-selected={filter === status}
                aria-label={`Show ${status.toLowerCase()} items`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">
            Showing {filteredTodos.length} items
          </span>
        </div>

        {/* Task List items */}
        {loading ? (
          <div className="space-y-3 py-12 animate-pulse">
            <div className="h-10 bg-slate-850 rounded-lg"></div>
            <div className="h-10 bg-slate-850 rounded-lg"></div>
            <div className="h-10 bg-slate-850 rounded-lg"></div>
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-sm">
            <p>No checklist items found for this filter.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTodos.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-slate-950/30 border border-slate-850 rounded-lg hover:border-slate-800 transition-all"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Status checkbox */}
                  <input
                    type="checkbox"
                    checked={item.completed}
                    disabled={togglingIds.has(item.id)}
                    onChange={() => handleToggle(item.id)}
                    className="w-5 h-5 rounded border-slate-750 bg-slate-950 text-brand-500 focus:ring-brand-500 cursor-pointer disabled:opacity-50"
                    aria-label={`Toggle completeness for task ${item.name}`}
                  />

                  {/* Task Name - Inline edit support */}
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleEditSave(item.id)}
                      onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                      className="flex-1 bg-slate-950 border border-brand-500 rounded px-2.5 py-1 text-sm text-slate-200 outline-none"
                      autoFocus
                      aria-label="Edit task name input"
                    />
                  ) : (
                    <span
                      onDoubleClick={() => startEditing(item.id, item.name)}
                      className={`text-sm text-slate-200 font-medium break-all cursor-pointer ${
                        item.completed ? 'line-through text-slate-500' : ''
                      }`}
                      title="Double click to edit"
                    >
                      {item.name}
                    </span>
                  )}
                </div>

                {/* Operations buttons */}
                <div className="flex items-center gap-3">
                  {/* Edit Pencil icon */}
                  {editingId !== item.id && (
                    <button
                      onClick={() => startEditing(item.id, item.name)}
                      className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                      aria-label={`Edit name for ${item.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}

                  {/* Bin Delete icon */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingIds.has(item.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1 disabled:opacity-50"
                    aria-label={`Delete task ${item.name}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
