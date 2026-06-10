import React, { useState, useEffect, useCallback } from 'react';
import { api, formatCurrency, formatDate } from '../api.js';
import TransactionForm from '../components/TransactionForm.jsx';

const INCOME_CATEGORIES = ['Cleaning Services', 'Gratuity', 'Other Income'];
const EXPENSE_CATEGORIES = ['Supplies', 'Vehicle & Travel', 'Insurance', 'Payroll', 'Marketing', 'Equipment', 'Software & Subscriptions', 'Utilities', 'Other Expense'];

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filters, setFilters] = useState({ type: '', category: '', from: '', to: '' });
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filters.type) params.type = filters.type;
    if (filters.category) params.category = filters.category;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    api.getTransactions(params)
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditItem(null); setShowForm(true); }
  function openEdit(tx) { setEditItem(tx); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditItem(null); }

  function handleSave(tx) {
    closeForm();
    load();
  }

  async function handleDelete(id) {
    try {
      await api.deleteTransaction(id);
      setDeleteId(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const allCategories = [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])].sort();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{transactions.length} records</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 border-green-100 bg-green-50">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Income</p>
          <p className="text-lg font-bold text-green-700 mt-0.5">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="card p-3 border-red-100 bg-red-50">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Expenses</p>
          <p className="text-lg font-bold text-red-700 mt-0.5">{formatCurrency(totalExpense)}</p>
        </div>
        <div className={`card p-3 ${totalIncome - totalExpense >= 0 ? 'border-blue-100 bg-blue-50' : 'border-red-100 bg-red-50'}`}>
          <p className={`text-xs font-medium uppercase tracking-wide ${totalIncome - totalExpense >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Net</p>
          <p className={`text-lg font-bold mt-0.5 ${totalIncome - totalExpense >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatCurrency(totalIncome - totalExpense)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            className="input-field text-sm"
            value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value, category: '' }))}
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select
            className="input-field text-sm"
            value={filters.category}
            onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
          >
            <option value="">All categories</option>
            {(filters.type === 'income' ? INCOME_CATEGORIES : filters.type === 'expense' ? EXPENSE_CATEGORIES : allCategories).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="date"
            className="input-field text-sm"
            placeholder="From"
            value={filters.from}
            onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
          />
          <input
            type="date"
            className="input-field text-sm"
            placeholder="To"
            value={filters.to}
            onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
          />
        </div>
        {(filters.type || filters.category || filters.from || filters.to) && (
          <button
            onClick={() => setFilters({ type: '', category: '', from: '', to: '' })}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Transaction list */}
      <div className="card divide-y divide-gray-100">
        {loading && (
          <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
        )}
        {!loading && transactions.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">No transactions found.</p>
            <button onClick={openAdd} className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium">Add first transaction</button>
          </div>
        )}
        {transactions.map(tx => (
          <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
              <svg className={`w-4 h-4 ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {tx.type === 'income'
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                }
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
              <p className="text-xs text-gray-500 truncate">{formatDate(tx.date)} · {tx.category}{tx.client_name ? ` · ${tx.client_name}` : ''}</p>
            </div>
            <span className={`text-sm font-semibold flex-shrink-0 ${tx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
            </span>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => openEdit(tx)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={() => setDeleteId(tx.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{editItem ? 'Edit Transaction' : 'Add Transaction'}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <TransactionForm initial={editItem} onSave={handleSave} onCancel={closeForm} />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Transaction?</h2>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)} className="btn-danger flex-1">Delete</button>
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
