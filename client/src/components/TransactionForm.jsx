import React, { useState, useEffect } from 'react';
import { api, today } from '../api.js';

const DEFAULT_CATEGORIES = {
  income: ['Cleaning Services', 'Gratuity', 'Other Income'],
  expense: ['Supplies', 'Vehicle & Travel', 'Insurance', 'Payroll', 'Marketing', 'Equipment', 'Software & Subscriptions', 'Utilities', 'Other Expense'],
};

export default function TransactionForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    type: 'income',
    amount: '',
    description: '',
    category: 'Cleaning Services',
    date: today(),
    client_id: '',
    notes: '',
    ...initial,
  });
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES.income);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getClients().then(setClients).catch(() => {});
    api.getTransactionCategories().then(dbCats => {
      // Merge DB categories with defaults
      const all = [...new Set([...DEFAULT_CATEGORIES.income, ...DEFAULT_CATEGORIES.expense, ...dbCats])];
      setCategories(all);
    }).catch(() => {});
  }, []);

  const currentCats = [...new Set([...DEFAULT_CATEGORIES[form.type] || [], ...categories.filter(c => !DEFAULT_CATEGORIES.income.includes(c) && !DEFAULT_CATEGORIES.expense.includes(c))])];

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleTypeChange(type) {
    set('type', type);
    const defaultCat = type === 'income' ? 'Cleaning Services' : 'Supplies';
    set('category', defaultCat);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.amount || !form.description || !form.category || !form.date) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        client_id: form.client_id || null,
      };
      let result;
      if (initial?.id) {
        result = await api.updateTransaction(initial.id, payload);
      } else {
        result = await api.createTransaction(payload);
      }
      onSave(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Type toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.type === 'income' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.type === 'expense' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-field pl-7"
              placeholder="0.00"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            type="date"
            className="input-field"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
        <input
          type="text"
          className="input-field"
          placeholder="What was this transaction for?"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
        <select
          className="input-field"
          value={form.category}
          onChange={e => set('category', e.target.value)}
          required
        >
          {(form.type === 'income' ? DEFAULT_CATEGORIES.income : DEFAULT_CATEGORIES.expense).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Client (optional)</label>
        <select
          className="input-field"
          value={form.client_id}
          onChange={e => set('client_id', e.target.value)}
        >
          <option value="">No client</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="Any additional notes..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Saving...' : (initial?.id ? 'Update Transaction' : 'Add Transaction')}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
