import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getCategories, createCategory, updateCategory, deleteCategory, getCategoryDetails } from '../services/categoryService';
import { useNotification } from '../context/NotificationContext';
import CenterModal from '../components/common/CenterModal';
import SkeletonCard from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';
import ActionIcons from '../components/common/ActionIcons';
import ViewModal from '../components/common/ViewModal';
import Modal from '../components/common/Modal';
import { Tag, Search, ArrowUpDown, Plus } from 'lucide-react';

export default function CategoriesPage() {
  const { showNotification } = useNotification();
  const location = useLocation();

  useEffect(() => {
    const checkIncomingCategory = async () => {
      const targetId = location.state?.viewCategoryId;
      if (targetId) {
        window.history.replaceState({}, document.title);
        try {
          const details = await getCategoryDetails(targetId);
          setIsViewModalOpen(true);
          setViewingDetails(details);
        } catch (err) {
          showNotification('Failed to load category details.', 'error');
        }
      }
    };
    checkIncomingCategory();
  }, [location.state?.viewCategoryId, showNotification]);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  // Creation/Edit Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#4F46E5');
  const [submitting, setSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // View details modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingDetails, setViewingDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Deletion state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');

  const fetchCategoriesList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      showNotification('Failed to load categories.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchCategoriesList();
  }, [fetchCategoriesList]);

  // Curated SaaS colors
  const curatedColors = [
    { value: '#4F46E5', label: 'Indigo' },
    { value: '#0EA5E9', label: 'Sky Blue' },
    { value: '#10B981', label: 'Emerald' },
    { value: '#F59E0B', label: 'Amber' },
    { value: '#EF4444', label: 'Rose' },
    { value: '#8B5CF6', label: 'Violet' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#64748B', label: 'Slate' }
  ];

  const openAddModal = () => {
    setEditingCategory(null);
    setNewCatName('');
    setNewCatColor('#4F46E5');
    setIsDrawerOpen(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setNewCatName(category.name);
    setNewCatColor(category.color);
    setIsDrawerOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showNotification('Category name is required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: newCatName.trim(),
        color: newCatColor
      };
      
      if (editingCategory) {
        const result = await updateCategory(editingCategory.id, payload);
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? result : c));
        showNotification('Category updated successfully!', 'success');
      } else {
        const result = await createCategory(payload);
        setCategories(prev => [result, ...prev]);
        showNotification('Category created successfully!', 'success');
      }

      setIsDrawerOpen(false);
      setNewCatName('');
      setNewCatColor('#4F46E5');
      setEditingCategory(null);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save category.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteConfirm = (category) => {
    setDeleteTargetId(category.id);
    setDeleteTargetName(category.name);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteAction = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteCategory(deleteTargetId);
      setCategories(prev => prev.filter(c => c.id !== deleteTargetId));
      showNotification('Category deleted successfully.', 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete category.', 'error');
    } finally {
      setIsDeleteConfirmOpen(false);
      setDeleteTargetId(null);
      setDeleteTargetName('');
    }
  };

  const handleViewCategoryDetails = async (category) => {
    setIsViewModalOpen(true);
    setLoadingDetails(true);
    setViewingDetails(null);
    try {
      const details = await getCategoryDetails(category.id);
      setViewingDetails(details);
    } catch (err) {
      showNotification('Failed to load category details.', 'error');
      setIsViewModalOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(p => !p);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filter & Sort category dataset
  const filteredAndSortedCategories = useMemo(() => {
    let dataset = [...categories];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      dataset = dataset.filter(cat => 
        cat.name?.toLowerCase().includes(q) || 
        cat.id?.toString().includes(q)
      );
    }

    // Sort operations
    dataset.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return dataset;
  }, [categories, searchQuery, sortField, sortAsc]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredAndSortedCategories.length / pageSize);
  const paginatedCategories = useMemo(() => {
    const startIdx = currentPage * pageSize;
    return filteredAndSortedCategories.slice(startIdx, startIdx + pageSize);
  }, [filteredAndSortedCategories, currentPage, pageSize]);

  const viewFields = viewingDetails ? [
    { label: 'Category Name', value: viewingDetails.name },
    { 
      label: 'Color Tag', 
      value: (
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: viewingDetails.color }}></span>
          <code className="text-slate-500 font-semibold">{viewingDetails.color}</code>
        </div>
      ) 
    },
    { label: 'Budget Allocation', value: viewingDetails.budgetLimit ? `₹${viewingDetails.budgetLimit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '₹0.00' },
    { label: 'Total Expense Count', value: `${viewingDetails.expenseCount || 0} transaction(s)` },
    { 
      label: 'Created Date', 
      value: viewingDetails.createdAt ? new Date(viewingDetails.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }) : 'N/A'
    },
    { label: 'Description', value: 'No description provided' }
  ] : [];

  const viewExtraContent = viewingDetails && viewingDetails.recentExpenses?.length > 0 ? (
    <div className="space-y-3">
      <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        Recent Category Transactions
      </span>
      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
        {viewingDetails.recentExpenses.map((exp, idx) => (
          <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-900 rounded-xl text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">{exp.name}</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 flex-shrink-0">
              ₹{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  ) : viewingDetails ? (
    <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
      No transactions logged in this category.
    </div>
  ) : null;

  return (
    <>
      <div className="space-y-6 max-w-7xl mx-auto animate-modal-in">
      
      {/* Standardized B2B Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl transition-all duration-200 shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-500" /> Spending Categories
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            Manage classification groupings used to map transaction logs and monthly limits.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-lg shadow-brand-500/15"
          aria-label="Add new category"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Main Table Content */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all duration-200 shadow-sm space-y-4">
        
        {/* Search controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-2">
          <div className="relative max-w-xs w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              className="block w-full pl-9 pr-4 py-2 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white dark:bg-slate-950 dark:hover:bg-slate-900 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 transition-all font-semibold"
            />
          </div>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Total count: {filteredAndSortedCategories.length} items
          </span>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredAndSortedCategories.length === 0 ? (
          <EmptyState
            title="No Categories Available"
            description="You don't have any expense categories yet. Setup classifications to tag transactions."
            actionText="Setup First Category"
            onAction={openAddModal}
          />
        ) : (
          <div className="overflow-x-auto border border-slate-150 dark:border-slate-900 rounded-xl">
            <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-900">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('id')} className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors uppercase">
                      ID <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors uppercase">
                      Name <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Color Tag
                  </th>
                  <th className="relative px-6 py-3.5 text-right text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedCategories.map((cat) => (
                  <tr
                    key={cat.id}
                    onDoubleClick={() => handleViewCategoryDetails(cat)}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors cursor-pointer select-none"
                  >
                    <td className="px-6 py-4 text-xs font-bold text-slate-400">#{cat.id}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-200">{cat.name}</td>
                    <td className="px-6 py-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></span>
                        <code className="text-slate-500 font-semibold">{cat.color}</code>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ActionIcons
                        onView={() => handleViewCategoryDetails(cat)}
                        onEdit={() => handleEdit(cat)}
                        onDelete={() => openDeleteConfirm(cat)}
                        viewTitle="View Category Details"
                        editTitle="Edit Category"
                        deleteTitle="Delete Category"
                        ariaLabelView={`View details for category ${cat.name}`}
                        ariaLabelEdit={`Edit category ${cat.name}`}
                        ariaLabelDelete={`Delete category ${cat.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-150 dark:border-slate-900 rounded-b-xl flex-wrap gap-4 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(0);
                  }}
                  className="pl-2 pr-6 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_4px_center] bg-[size:14px_14px] bg-no-repeat font-bold"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                </select>
                <span>
                  Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, filteredAndSortedCategories.length)} of {filteredAndSortedCategories.length} entries
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(c => c - 1)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage + 1 >= totalPages}
                  onClick={() => setCurrentPage(c => c + 1)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Centered Form Modal */}
    <CenterModal
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setNewCatName('');
          setNewCatColor('#4F46E5');
          setEditingCategory(null);
        }}
        title={editingCategory ? "Edit Category Classification" : "Create Category Classification"}
      >
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Category Name
            </label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Travel, Utilities, Subscriptions"
              required
              className="w-full px-4 py-3 text-sm text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 transition-colors placeholder-slate-400 font-semibold"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Color Tag
            </label>
            
            {/* Custom Curated Color Grid */}
            <div className="grid grid-cols-4 gap-2.5">
              {curatedColors.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setNewCatColor(color.value)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                    newCatColor === color.value 
                      ? 'border-brand-500 bg-brand-50/20 dark:bg-slate-900 text-brand-500 dark:text-brand-100 shadow-sm ring-1 ring-brand-500' 
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full flex-shrink-0 mb-1" style={{ backgroundColor: color.value }}></span>
                  <span className="text-[9px] font-bold truncate w-full text-center">{color.label}</span>
                </button>
              ))}
            </div>

            {/* Color Picker Picker */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent cursor-pointer"
                id="custom-color-picker"
              />
              <label htmlFor="custom-color-picker" className="text-xs text-slate-500 font-medium">
                Or select custom palette: <span className="font-bold text-slate-700 dark:text-slate-300">{newCatColor}</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !newCatName.trim()}
            className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-brand-500/15"
          >
            {submitting ? (editingCategory ? 'Saving Changes...' : 'Creating Category...') : 'Confirm & Save'}
          </button>
        </form>
      </CenterModal>

      {/* Category Detail View Modal */}
      <ViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingDetails(null);
        }}
        title="Category Stats & Details"
        fields={viewFields}
        extraContent={loadingDetails ? (
          <div className="flex justify-center py-4">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 animate-pulse">Loading stats...</span>
          </div>
        ) : viewExtraContent}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setDeleteTargetId(null);
          setDeleteTargetName('');
        }}
        title="Confirm Category Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
            Are you sure you want to delete the category <span className="font-extrabold text-slate-900 dark:text-slate-100">&quot;{deleteTargetName}&quot;</span>?
          </p>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-250/20 rounded-xl">
            <p className="text-xs text-amber-655 dark:text-amber-450 leading-relaxed font-semibold">
              Warning: Soft deleting this category will retain historic expense records but hide it from new selections.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setDeleteTargetId(null);
                setDeleteTargetName('');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 font-bold transition-all text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteAction}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 rounded-xl text-white font-bold transition-all text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

    </>
  );
}
