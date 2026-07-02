import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { getMonthlyTrends, getCategoryComparison, getRangeAggregation, getBudgetForecast, getExpenses } from '../services/expenseService';
import { useNotification } from '../context/NotificationContext';
import SkeletonCard from '../components/common/SkeletonCard';

// Lazy-load Recharts wrappers to split chunks
const CategoryPieChart = React.lazy(() => import('../components/charts/CategoryPieChart'));
const MonthlyTrendChart = React.lazy(() => import('../components/charts/MonthlyTrendChart'));
const CategoryComparisonChart = React.lazy(() => import('../components/charts/CategoryComparisonChart'));

const ChartPlaceholder = () => (
  <div className="h-64 w-full flex items-center justify-center bg-slate-200/30 dark:bg-slate-950/30 rounded-lg border border-slate-200 dark:border-slate-800/60 animate-pulse">
    <span className="text-xs text-slate-500">Loading visual data...</span>
  </div>
);

export default function AnalyticsPage() {
  const { showNotification } = useNotification();

  // Active Tab state: 'overview' | 'comparison' | 'custom' | 'forecast'
  const [activeTab, setActiveTab] = useState('overview');

  // Analytical data states
  const [comparison, setComparison] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [trendInterval, setTrendInterval] = useState('monthly'); // 'monthly' | 'weekly' | 'daily'

  // Custom date range state
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [customAggregation, setCustomAggregation] = useState(null);

  // Loading and Error states
  const [loading, setLoading] = useState(false);
  const [customLoading, setCustomLoading] = useState(false);

  // Load baseline statistics
  const loadBaselineData = useCallback(async () => {
    setLoading(true);
    try {
      const [, compData, forecastData, expenseData] = await Promise.all([
        getMonthlyTrends(),
        getCategoryComparison(),
        getBudgetForecast(),
        getExpenses({ pageNumber: 0, pageSize: 10000 }),
      ]);
      setComparison(compData);
      setForecast(forecastData);
      setExpenses(expenseData?.content || []);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to load analytical metrics.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // Load custom range data
  const handleCustomQuery = useCallback(async () => {
    if (!startDate || !endDate) {
      showNotification('Both Start Date and End Date are required.', 'error');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      showNotification('Start Date must be before or equal to End Date.', 'error');
      return;
    }

    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 366) {
      showNotification('Custom aggregation window cannot exceed 1 year (366 days).', 'error');
      return;
    }

    setCustomLoading(true);
    try {
      const result = await getRangeAggregation(startDate, endDate);
      setCustomAggregation(result);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to retrieve range aggregation data.', 'error');
    } finally {
      setCustomLoading(false);
    }
  }, [startDate, endDate, showNotification]);

  useEffect(() => {
    loadBaselineData();
  }, [loadBaselineData]);

  // Trigger custom query automatically if we are in custom tab and have values
  useEffect(() => {
    if (activeTab === 'custom' && !customAggregation) {
      handleCustomQuery();
    }
  }, [activeTab, customAggregation, handleCustomQuery]);

  // Memoize mapped dataset transformations to prevent inline object/array recreation in props
  const trendsChartData = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return [];
    }

    const parseLocalDate = (dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    if (trendInterval === 'daily') {
      const dailyData = [];
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      // Generate the last 30 days
      for (let i = 29; i >= 0; i--) {
        const d = new Date(currentDate);
        d.setDate(currentDate.getDate() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const key = `${year}-${month}-${day}`;
        const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        dailyData.push({ key, label, amount: 0 });
      }

      // Populate spending
      expenses.forEach((exp) => {
        if (!exp.transactionDate) return;
        const key = exp.transactionDate;
        const bucket = dailyData.find((b) => b.key === key);
        if (bucket) {
          bucket.amount += parseFloat(exp.amount || 0);
        }
      });

      return dailyData.map((d) => ({
        label: d.label,
        amount: d.amount,
      }));
    }

    if (trendInterval === 'weekly') {
      const weeklyData = [];
      const currentDate = new Date();
      // Get Sunday of current week
      const currentSunday = new Date(currentDate);
      currentSunday.setDate(currentDate.getDate() - currentDate.getDay());
      currentSunday.setHours(0, 0, 0, 0);

      // Generate last 12 weeks
      for (let i = 11; i >= 0; i--) {
        const sunday = new Date(currentSunday);
        sunday.setDate(currentSunday.getDate() - i * 7);
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);

        const startLabel = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endLabel = saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const label = `${startLabel} - ${endLabel}`;

        weeklyData.push({
          start: sunday,
          end: saturday,
          label,
          amount: 0,
        });
      }

      // Populate spending
      expenses.forEach((exp) => {
        if (!exp.transactionDate) return;
        const expDate = parseLocalDate(exp.transactionDate);
        expDate.setHours(0, 0, 0, 0);
        const bucket = weeklyData.find((b) => expDate >= b.start && expDate <= b.end);
        if (bucket) {
          bucket.amount += parseFloat(exp.amount || 0);
        }
      });

      return weeklyData.map((w) => ({
        label: w.label,
        amount: w.amount,
      }));
    }

    // Default: 'monthly'
    const monthlyData = [];
    const currentDate = new Date();

    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthlyData.push({ key, label, amount: 0 });
    }

    // Populate spending
    expenses.forEach((exp) => {
      if (!exp.transactionDate) return;
      const [year, month] = exp.transactionDate.split('-');
      const key = `${year}-${month}`;
      const bucket = monthlyData.find((b) => b.key === key);
      if (bucket) {
        bucket.amount += parseFloat(exp.amount || 0);
      }
    });

    return monthlyData.map((m) => ({
      label: m.label,
      amount: m.amount,
    }));
  }, [expenses, trendInterval]);

  const comparisonChartData = useMemo(() => {
    return comparison.map(c => ({
      categoryName: c.categoryName,
      currentMonthAmount: parseFloat(c.currentMonthAmount),
      previousMonthAmount: parseFloat(c.previousMonthAmount),
      color: c.color,
    }));
  }, [comparison]);

  const customPieData = useMemo(() => {
    return customAggregation?.categoryBreakdown?.map(item => ({
      name: item.categoryName,
      value: parseFloat(item.totalAmount),
      color: item.color || '#4F46E5',
    })) || [];
  }, [customAggregation?.categoryBreakdown]);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors duration-200">
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Advanced Analytics &amp; Reports</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Detailed metrics, spending visual graphs, and forecasting insights.
        </p>
      </div>

      {/* Tab controls - Accessibility enabled */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-slate-200 dark:border-slate-800 gap-2 transition-colors duration-200 flex-nowrap" style={{ WebkitOverflowScrolling: 'touch' }} role="tablist" aria-label="Analytics Tab Categories">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold transition-all border-b-2 outline-none ${
            activeTab === 'overview'
              ? 'border-brand-500 text-slate-900 dark:text-slate-100'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          role="tab"
          aria-selected={activeTab === 'overview'}
          aria-controls="panel-overview"
          id="tab-overview"
        >
          Monthly Spending Trends
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`flex-shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold transition-all border-b-2 outline-none ${
            activeTab === 'comparison'
              ? 'border-brand-500 text-slate-900 dark:text-slate-100'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          role="tab"
          aria-selected={activeTab === 'comparison'}
          aria-controls="panel-comparison"
          id="tab-comparison"
        >
          MoM Category Comparison
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold transition-all border-b-2 outline-none ${
            activeTab === 'custom'
              ? 'border-brand-500 text-slate-900 dark:text-slate-100'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          role="tab"
          aria-selected={activeTab === 'custom'}
          aria-controls="panel-custom"
          id="tab-custom"
        >
          Custom Range Breakdown
        </button>
        <button
          onClick={() => setActiveTab('forecast')}
          className={`flex-shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold transition-all border-b-2 outline-none ${
            activeTab === 'forecast'
              ? 'border-brand-500 text-slate-900 dark:text-slate-100'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          role="tab"
          aria-selected={activeTab === 'forecast'}
          aria-controls="panel-forecast"
          id="tab-forecast"
        >
          Budget Forecasting
        </button>
      </div>

      {/* Tab Panels */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="min-h-[400px]">
          {/* Tab 1: Monthly Trends */}
          {activeTab === 'overview' && (
            <div
              id="panel-overview"
              role="tabpanel"
              aria-labelledby="tab-overview"
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 transition-colors duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h4 className="text-base font-semibold text-slate-805 dark:text-slate-200">Historical Spending Trends</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {trendInterval === 'daily' && 'Chronological summary of your daily spending (last 30 days).'}
                    {trendInterval === 'weekly' && 'Chronological summary of your weekly spending (last 12 weeks).'}
                    {trendInterval === 'monthly' && 'Chronological summary of your monthly spending (last 12 months).'}
                  </p>
                </div>

                {/* Interval Selector Buttons */}
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-900 self-start sm:self-auto transition-colors duration-200">
                  <button
                    onClick={() => setTrendInterval('daily')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      trendInterval === 'daily'
                        ? 'bg-white dark:bg-slate-800 text-slate-905 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-205'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setTrendInterval('weekly')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      trendInterval === 'weekly'
                        ? 'bg-white dark:bg-slate-800 text-slate-905 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-205'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setTrendInterval('monthly')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      trendInterval === 'monthly'
                        ? 'bg-white dark:bg-slate-800 text-slate-905 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-205'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>
              <div className="pt-4">
                <Suspense fallback={<ChartPlaceholder />}>
                  <MonthlyTrendChart data={trendsChartData} />
                </Suspense>
              </div>
            </div>
          )}

          {/* Tab 2: MoM Category Comparison */}
          {activeTab === 'comparison' && (
            <div
              id="panel-comparison"
              role="tabpanel"
              aria-labelledby="tab-comparison"
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 transition-colors duration-200"
            >
              <div>
                <h4 className="text-base font-semibold text-slate-900 dark:text-slate-200">Month-Over-Month Comparison</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Compares category-specific spending between the current month and the previous month.</p>
              </div>
              <div className="pt-4">
                <Suspense fallback={<ChartPlaceholder />}>
                  <CategoryComparisonChart data={comparisonChartData} />
                </Suspense>
              </div>
            </div>
          )}

          {/* Tab 3: Custom Range Breakdown */}
          {activeTab === 'custom' && (
            <div
              id="panel-custom"
              role="tabpanel"
              aria-labelledby="tab-custom"
              className="space-y-6"
            >
              {/* Date Filters Panel */}
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap gap-4 items-end transition-colors duration-200">
                <div className="space-y-1">
                  <label htmlFor="custom-start-date" className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Start Date
                  </label>
                  <input
                    id="custom-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                    className="px-3 py-2 text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-lg outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="custom-end-date" className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                    End Date
                  </label>
                  <input
                    id="custom-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                    className="px-3 py-2 text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-lg outline-none focus:border-brand-500"
                  />
                </div>
                <button
                  onClick={handleCustomQuery}
                  disabled={customLoading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Calculate spending metrics for selected range"
                >
                  {customLoading ? 'Calculating...' : 'Run Query'}
                </button>
              </div>

              {/* Aggregation results output */}
              {customLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : customAggregation ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Aggregation Metrics Cards */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors duration-200">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Total Spent (Selected Range)
                      </span>
                      <h4 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                        ₹{parseFloat(customAggregation.totalSpent).toFixed(2)}
                      </h4>
                    </div>

                    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors duration-200">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Daily Average Spends
                      </span>
                      <h4 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                        ₹{parseFloat(customAggregation.averageSpentPerDay).toFixed(2)}
                      </h4>
                    </div>
                  </div>

                  {/* Range Pie Chart */}
                  <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between transition-colors duration-200">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Range Category Breakdown</h4>
                    {customPieData.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm h-64">
                        No transactions recorded in this range.
                      </div>
                    ) : (
                      <Suspense fallback={<ChartPlaceholder />}>
                        <CategoryPieChart data={customPieData} />
                      </Suspense>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center border border-slate-200 dark:border-slate-900 rounded-xl text-slate-500 dark:text-slate-400 text-sm bg-slate-100 dark:bg-slate-900/50 transition-colors duration-200">
                  Select a date range and click Run Query to view breakdown metrics.
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Budget Forecasting */}
          {activeTab === 'forecast' && forecast && (
            <div
              id="panel-forecast"
              role="tabpanel"
              aria-labelledby="tab-forecast"
              className="space-y-6"
            >
              {/* Forecast Header Panel */}
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-6 transition-colors duration-200">
                <div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Forecasted Next-Month Spend
                  </span>
                  <h4 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                    ₹{parseFloat(forecast.forecastedAmount).toFixed(2)}
                  </h4>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Projection Confidence
                  </span>
                  <div className="mt-2.5">
                    <span
                      className={`inline-block px-3 py-1 text-xs font-bold rounded-full border ${
                        forecast.confidenceLevel === 'HIGH'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                          : forecast.confidenceLevel === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                          : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-800'
                      }`}
                    >
                      {forecast.confidenceLevel} CONFIDENCE
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Calculation Basis
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 font-medium">
                    {forecast.basis}
                  </p>
                </div>
              </div>

              {/* Recommendations panel */}
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 transition-colors duration-200">
                <h4 className="text-sm font-semibold text-slate-755 dark:text-slate-200">Personalized Budgeting Recommendations</h4>
                <ul className="space-y-3.5 pl-1">
                  {forecast.recommendations.map((rec, index) => (
                    <li key={index} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed items-start">
                      <span className="text-brand-500 dark:text-brand-300 font-semibold text-base mt-[-2px]">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
