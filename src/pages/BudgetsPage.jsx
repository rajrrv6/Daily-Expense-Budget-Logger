import React, { useEffect, useState, useCallback } from 'react';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../services/budgetService';
import { getCategories } from '../services/categoryService';
import apiClient from '../services/apiClient';
import { useNotification } from '../context/NotificationContext';
import BudgetCard from '../components/expenses/BudgetCard';
import BudgetFormModal from '../components/expenses/BudgetFormModal';
import SkeletonCard from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';

export default function BudgetsPage() {
  const { showNotification } = useNotification();
  
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const fetchBudgetData = useCallback(async () => {
    setLoading(true);
    try {
      const [rawBudgets, cats, summary] = await Promise.all([
        getBudgets(),
        getCategories(),
        apiClient.get('/api/v1/analytics/dashboard').then(res => res.data),
      ]);
      setBudgets(rawBudgets);
      setCategories(cats);
      setDashboardSummary(summary);
    } catch (err) {
      showNotification('Failed to load budget and category metrics.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  const handleCreateOrUpdate = async (formData) => {
    const originalBudgets = [...budgets];
    setIsModalOpen(false);

    if (editingBudget) {
      // Optimistic Update
      setBudgets(prev => prev.map(b => b.id === editingBudget.id ? { ...b, ...formData } : b));
      try {
        await updateBudget(editingBudget.id, formData);
        showNotification('Budget configuration updated.', 'success');
        // Refresh to pull exact calculated spent values
        const summary = await apiClient.get('/api/v1/analytics/dashboard').then(res => res.data);
        setDashboardSummary(summary);
        const refreshed = await getBudgets();
        setBudgets(refreshed);
      } catch (err) {
        setBudgets(originalBudgets);
        showNotification(err.response?.data?.message || 'Failed to update budget. Rolled back.', 'error');
      }
    } else {
      // Optimistic Add (with temp ID)
      const tempId = crypto.randomUUID();
      const tempBudget = {
        id: tempId,
        ...formData,
        categoryName: formData.categoryId 
          ? categories.find(c => c.id === formData.categoryId)?.name || 'Category'
          : 'Global Budget',
        spentAmount: 0,
        exceeded: false,
        warningTriggered: false,
      };
      setBudgets(prev => [tempBudget, ...prev]);

      try {
        await createBudget(formData);
        showNotification('Budget successfully configured.', 'success');
        // Refresh parameters
        const summary = await apiClient.get('/api/v1/analytics/dashboard').then(res => res.data);
        setDashboardSummary(summary);
        const refreshed = await getBudgets();
        setBudgets(refreshed);
      } catch (err) {
        setBudgets(originalBudgets);
        showNotification(err.response?.data?.message || 'Failed to save budget. Rolled back.', 'error');
      }
    }
    setEditingBudget(null);
  };

  const handleDelete = async (id) => {
    const originalBudgets = [...budgets];
    // Optimistic Delete
    setBudgets(prev => prev.filter(b => b.id !== id));

    try {
      await deleteBudget(id);
      showNotification('Budget deleted successfully.', 'success');
      const summary = await apiClient.get('/api/v1/analytics/dashboard').then(res => res.data);
      setDashboardSummary(summary);
    } catch (err) {
      setBudgets(originalBudgets);
      showNotification('Failed to delete budget. Rolled back.', 'error');
    }
  };

  const handleEditClick = (budget) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingBudget(null);
    setIsModalOpen(true);
  };

  // Merge budget configs with live analytics spent values
  const mergedBudgets = budgets.map(b => {
    // Find live analytics calculations matching categoryId
    const calc = dashboardSummary?.budgets?.find(cb => cb.categoryId === b.categoryId) || {};
    return {
      ...b,
      spentAmount: calc.spentAmount || 0,
      remainingAmount: calc.remainingAmount !== undefined ? calc.remainingAmount : b.monthlyLimit - (calc.spentAmount || 0),
      utilizationPercent: calc.utilizationPercent || 0,
      exceeded: calc.exceeded || false,
      warningTriggered: calc.warningTriggered || false,
    };
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-slide-in">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors duration-200 shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-slate-850 dark:text-slate-100">Budget Configurations</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor and restrict monthly spending limits per category or globally.
          </p>
        </div>
        <button
          onClick={handleAddClick}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors shadow-md hover:shadow-lg focus:outline-none"
        >
          Setup New Budget
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : mergedBudgets.length === 0 ? (
        <EmptyState
          title="No Budgets Defined"
          description="Setting a budget is the first step towards healthy financial planning. Setup a budget above to get started."
          actionText="Setup Your First Budget"
          onAction={handleAddClick}
        />
      ) : (
        /* Budgets Grid */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mergedBudgets.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              onEdit={handleEditClick}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Budget Setup Form Modal */}
      <BudgetFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBudget(null);
        }}
        onSubmit={handleCreateOrUpdate}
        budget={editingBudget}
        categories={categories}
      />
    </div>
  );
}
