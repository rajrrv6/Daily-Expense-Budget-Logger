import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { bulkUploadExpenses } from '../../services/expenseService';
import { useNotification } from '../../context/NotificationContext';
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle, 
  Download, 
  RefreshCw,
  AlertCircle,
  Plus,
  Sparkles
} from 'lucide-react';

export default function BulkUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const { showNotification } = useNotification();
  const fileInputRef = useRef(null);

  // States
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [duplicateAction, setDuplicateAction] = useState('skip');

  if (!isOpen) return null;

  // Trigger file download client-side
  const handleDownloadTemplate = () => {
    const csvContent = 
      "expenseName,category,amount,transactionDate,receipt\n" +
      "Milk,Food,50.00,2026-07-01,milk-bill.jpg\n" +
      "Bus Fare,Travel,100.00,2026-07-01,bus-ticket.pdf\n" +
      "Room Rent,Home,6000.00,2026-07-01,house-rent.png\n";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "expenses_bulk_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Drag handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  // File type validation
  const validateAndProcessFile = (selectedFile) => {
    const name = selectedFile.name.toLowerCase();
    if (name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
      setFile(selectedFile);
      generatePreview(selectedFile);
    } else {
      showNotification('Unsupported file type. Please upload a .csv or .xlsx Excel file.', 'error');
    }
  };

  // Call API for validation preview
  const generatePreview = async (selectedFile) => {
    setLoading(true);
    try {
      const result = await bulkUploadExpenses(selectedFile, true, duplicateAction);
      setPreviewData(result);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to parse file preview data.', 'error');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  // Trigger final save mapping import
  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await bulkUploadExpenses(file, false, duplicateAction);
      showNotification(`${result.successCount} expenses imported successfully.`, 'success');
      onUploadSuccess();
      handleReset();
      onClose();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Bulk upload import failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setDuplicateAction('skip');
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-[4px] overflow-y-auto custom-scrollbar select-none animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90vh] my-8 overflow-hidden transition-colors duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UploadCloud className="w-5.5 h-5.5 text-brand-500" /> Bulk Import Expenses
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Upload multiple transactions at once using Microsoft Excel (.xlsx) or CSV template.
            </p>
          </div>
          <button 
            onClick={() => { handleReset(); onClose(); }}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors focus:outline-none"
            aria-label="Close modal"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Modal content body */}
        <div className="flex-1 overflow-y-auto py-6 space-y-5 custom-scrollbar min-h-0">
          
          {/* Action Row */}
          {!file && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 rounded-xl transition-all">
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200">Need a starting reference?</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Download our formatted structure columns to map transactions correctly.</p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:text-brand-500 border border-slate-250 dark:border-slate-800 text-xs font-bold rounded-lg transition-all shadow-sm self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" /> Download Sample CSV
              </button>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          {!file && (
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                dragActive 
                  ? 'border-brand-500 bg-brand-50/10 dark:bg-brand-950/5' 
                  : 'border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-brand-500/50 dark:hover:border-slate-700/60'
              }`}
            >
              <UploadCloud className="w-12 h-12 text-slate-350 dark:text-slate-600 mb-3 animate-bounce" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Drag and drop your spreadsheet here
              </p>
              <p className="text-[10px] text-slate-405 dark:text-slate-500 mb-4">
                Supported file types: .xlsx, .csv (Max size 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
                id="bulk-file-input"
              />
              <label 
                htmlFor="bulk-file-input"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                Choose File
              </label>
            </div>
          )}

          {/* Loader */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-450 animate-pulse">Processing file records...</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {file && !loading && previewData && (
            <div className="space-y-4">
              
              {/* Loaded File Info Card */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2.5 min-w-0 pr-4">
                  <FileText className="w-5 h-5 text-brand-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-slate-800 dark:text-slate-200 truncate font-semibold">{file.name}</span>
                    <span className="block text-[10px] text-slate-400 font-medium mt-0.5">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="text-[10px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-transparent hover:border-rose-100 px-2 py-1 rounded-lg transition-all"
                >
                  Change File
                </button>
              </div>

              {/* Duplicate Action & Quick Metrics Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                
                {/* Duplicate logic selector */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Duplicate Records Handling
                  </label>
                  <select
                    value={duplicateAction}
                    onChange={(e) => setDuplicateAction(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-250 focus:outline-none focus:ring-1 focus:ring-brand-500 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_10px_center] bg-[size:18px_18px] bg-no-repeat cursor-pointer"
                  >
                    <option value="skip">Skip duplicates (Ignore database duplicates)</option>
                    <option value="allow">Allow duplicates (Import all valid entries)</option>
                  </select>
                </div>

                {/* Validation Summary Metrics */}
                <div className="flex gap-2 justify-end text-[11px] font-bold">
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20 rounded-xl">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{previewData.successCount} Valid Rows</span>
                  </div>
                  {previewData.newCategoriesCount > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-violet-55/90 text-violet-600 dark:bg-violet-955/20 dark:text-violet-400 border border-violet-100 dark:border-violet-900/20 rounded-xl">
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{previewData.newCategoriesCount} New Categor{previewData.newCategoriesCount === 1 ? 'y' : 'ies'}</span>
                    </div>
                  )}
                  {previewData.failedCount > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 dark:bg-rose-955/20 dark:text-rose-450 border border-rose-100 dark:border-rose-900/20 rounded-xl">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{previewData.failedCount} Failed Rows</span>
                    </div>
                  )}
                  {previewData.duplicateCount > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-600 dark:bg-amber-955/20 dark:text-amber-450 border border-amber-100 dark:border-amber-900/20 rounded-xl">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{previewData.duplicateCount} Duplicates</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mapping Details Validation Alert Banner */}
              {previewData.failedCount > 0 && (
                <div className="flex gap-2.5 p-3.5 bg-rose-50/50 dark:bg-rose-955/10 border border-rose-200/40 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Errors found in validation check:</span>
                    <p className="text-[10px] text-rose-505 dark:text-rose-500 mt-0.5">Rows highlighted in red contain invalid field values and will be excluded during save unless corrected and re-uploaded.</p>
                  </div>
                </div>
              )}

              {/* Preview Grid Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-205 dark:border-slate-850 sticky top-0 font-bold text-slate-500 uppercase tracking-wider transition-colors">
                      <th className="px-4 py-2.5 w-14 text-center">Row</th>
                      <th className="px-4 py-2.5">Expense Name</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                      <th className="px-4 py-2.5 text-center">Date</th>
                      <th className="px-4 py-2.5">Receipt</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 max-w-xs">Validation Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {previewData.rows?.map((row, idx) => {
                      let bgClass = "bg-white dark:bg-slate-900";
                      if (!row.valid) bgClass = "bg-rose-50/20 dark:bg-rose-955/5 text-rose-600 dark:text-rose-400";
                      else if (row.duplicate) bgClass = "bg-amber-50/15 dark:bg-amber-955/5";

                      return (
                        <tr key={idx} className={`${bgClass} transition-colors`}>
                          <td className="px-4 py-3 font-semibold text-center text-slate-400">#{row.rowNumber}</td>
                          <td className="px-4 py-3 font-semibold truncate max-w-[150px]">{row.name || <span className="italic text-slate-300">-</span>}</td>
                          <td className="px-4 py-3 font-semibold truncate max-w-[120px]">
                            {row.categoryName || <span className="italic text-slate-300">-</span>}
                            {row.newCategory && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 rounded text-[8px] font-bold tracking-wide uppercase select-none">
                                New
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-right">
                            {row.amount ? `₹${Number(row.amount).toFixed(2)}` : <span className="italic text-slate-300">-</span>}
                          </td>
                          <td className="px-4 py-3 font-semibold text-center">{row.transactionDate || <span className="italic text-slate-300">-</span>}</td>
                          <td className="px-4 py-3 font-semibold truncate max-w-[120px]">{row.receipt || <span className="italic text-slate-300">-</span>}</td>
                          <td className="px-4 py-3 font-bold">
                            {!row.valid ? (
                              <span className="inline-block px-2 py-0.5 bg-rose-100 dark:bg-rose-955/50 text-rose-600 dark:text-rose-400 rounded-full text-[9px]">INVALID</span>
                            ) : row.duplicate ? (
                              <span className="inline-block px-2 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-full text-[9px]">DUPLICATE</span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 bg-emerald-100 dark:bg-emerald-955/50 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px]">VALID</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[10px] text-slate-550 dark:text-slate-400 max-w-xs break-words">
                            {row.errorMessage || (row.duplicate ? "Duplicate entry matches existing database record." : "-")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-150 dark:border-slate-805 pt-4 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={() => { handleReset(); onClose(); }}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-200 font-bold transition-all text-xs focus:outline-none"
          >
            Cancel
          </button>
          
          {file && previewData && (
            <button
              onClick={handleImport}
              disabled={loading || previewData.successCount === 0}
              className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs focus:outline-none"
            >
              Import Expenses
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
