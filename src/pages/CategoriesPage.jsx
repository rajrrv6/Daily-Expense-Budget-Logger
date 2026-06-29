import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getCategories, createCategory } from '../services/categoryService';
import { useNotification } from '../context/NotificationContext';
import SlideOver from '../components/common/SlideOver';
import SkeletonCard from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';
import { Tag, Search, ArrowUpDown, MoreVertical, Plus } from 'lucide-react';

export default function CategoriesPage() {
  const { showNotification } = useNotification();
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting State
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Creation Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#4F46E5');
  const [submitting, setSubmitting] = useState(false);

  // Action Menu Dropdown State per Category
  const [activeMenuId, setActiveMenuId] = useState(null);

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

  const handleCreateCategory = async (e) => {
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
      const result = await createCategory(payload);
      setCategories(prev => [result, ...prev]);
      showNotification('Category created successfully!', 'success');
      setIsDrawerOpen(false);
      setNewCatName('');
      setNewCatColor('#4F46E5');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to create category.', 'error');
    } finally {
      setSubmitting(false);
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

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return dataset;
  }, [categories, searchQuery, sortField, sortAsc]);

  // Paginated dataset
  const paginatedCategories = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredAndSortedCategories.slice(start, start + pageSize);
  }, [filteredAndSortedCategories, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedCategories.length / pageSize) || 1;

  // Click outside listener to close menus
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Standardized B2B Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl transition-all duration-200 shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-500" /> Spending Categories
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            Manage classification groupings used to map transaction logs and monthly limits.
          </p>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
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
            onAction={() => setIsDrawerOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto border border-slate-150 dark:border-slate-850 rounded-xl">
            <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-850">
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
                  <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-slate-400">#{cat.id}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-200">{cat.name}</td>
                    <td className="px-6 py-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></span>
                        <code className="text-slate-500 font-semibold">{cat.color}</code>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(p => p === cat.id ? null : cat.id);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                        aria-label="Kebab options menu"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === cat.id && (
                        <div className="absolute right-6 mt-1 w-32 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1 z-10 text-left">
                          <button
                            onClick={() => showNotification(`Category Name: ${cat.name}, Color: ${cat.color}`, 'info')}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850"
                          >
                            View Details
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-150 dark:border-slate-850 rounded-b-xl flex-wrap gap-4 text-xs font-semibold text-slate-500">
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

      {/* SlideOver Form Drawer */}
      <SlideOver
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setNewCatName('');
          setNewCatColor('#4F46E5');
        }}
        title="Create Category Classification"
      >
        <form onSubmit={handleCreateCategory} className="space-y-6">
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
              className="w-full px-4 py-3 text-sm text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 transition-colors placeholder-slate-400 font-semibold"
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
            disabled={submitting}
            className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-brand-500/15"
          >
            {submitting ? 'Creating Category...' : 'Confirm & Save'}
          </button>
        </form>
      </SlideOver>
    </div>
  );
}
