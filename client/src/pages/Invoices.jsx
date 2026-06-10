import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, formatCurrency, formatDate } from '../api.js';
import InvoiceForm from '../components/InvoiceForm.jsx';

const STATUS_COLORS = {
  draft: 'badge-draft',
  sent: 'badge-sent',
  paid: 'badge-paid',
  overdue: 'badge-overdue',
  cancelled: 'badge-cancelled',
};

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ status: '', type: 'invoice' });
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.type) params.type = filters.type;
    api.getInvoices(params)
      .then(setInvoices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  function handleSave() {
    setShowForm(false);
    load();
  }

  async function handleDelete(id) {
    try {
      await api.deleteInvoice(id);
      setDeleteId(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  const totalOutstanding = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + i.total, 0);

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices & Estimates</h1>
          <p className="text-sm text-gray-500 mt-0.5">{invoices.length} records</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New
        </button>
      </div>

      {filters.type === 'invoice' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3 border-yellow-100 bg-yellow-50">
            <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide">Outstanding</p>
            <p className="text-lg font-bold text-yellow-700 mt-0.5">{formatCurrency(totalOutstanding)}</p>
          </div>
          <div className="card p-3 border-green-100 bg-green-50">
            <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Collected</p>
            <p className="text-lg font-bold text-green-700 mt-0.5">{formatCurrency(totalPaid)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-3">
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden border border-gray-300 flex-shrink-0">
            {['invoice', 'estimate'].map(t => (
              <button
                key={t}
                onClick={() => setFilters(f => ({ ...f, type: t, status: '' }))}
                className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${filters.type === t ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {t}s
              </button>
            ))}
          </div>
          <select
            className="input-field text-sm flex-1"
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoice list */}
      <div className="card divide-y divide-gray-100">
        {loading && (
          <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
        )}
        {!loading && invoices.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">No {filters.type}s found.</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium">
              Create first {filters.type}
            </button>
          </div>
        )}
        {invoices.map(inv => (
          <div key={inv.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/invoices/${inv.id}`} className="text-sm font-semibold text-gray-900 hover:text-green-700">
                  {inv.invoice_number}
                </Link>
                <span className={STATUS_COLORS[inv.status] || 'badge-draft'}>{inv.status}</span>
              </div>
              <p className="text-sm text-gray-700 mt-0.5 truncate">{inv.client_name}</p>
              <p className="text-xs text-gray-500">Issued {formatDate(inv.issue_date)} · Due {formatDate(inv.due_date)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total)}</span>
              <button
                onClick={() => setDeleteId(inv.id)}
                className="p-1 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
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

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">New Invoice / Estimate</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <InvoiceForm onSave={handleSave} onCancel={() => setShowForm(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Invoice?</h2>
            <p className="text-sm text-gray-500 mb-5">This cannot be undone.</p>
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
