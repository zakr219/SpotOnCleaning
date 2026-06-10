import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, formatCurrency, formatDate } from '../api.js';
import InvoiceForm from '../components/InvoiceForm.jsx';

const STATUS_COLORS = {
  draft: 'badge-draft',
  sent: 'badge-sent',
  paid: 'badge-paid',
  overdue: 'badge-overdue',
  cancelled: 'badge-cancelled',
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    api.getInvoice(id)
      .then(setInvoice)
      .catch(() => navigate('/invoices'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleMarkPaid() {
    setMarkingPaid(true);
    try {
      const updated = await api.markInvoicePaid(id);
      setInvoice(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setMarkingPaid(false);
    }
  }

  async function handleDelete() {
    try {
      await api.deleteInvoice(id);
      navigate('/invoices');
    } catch (err) {
      alert(err.message);
    }
  }

  function handleEditSave(updated) {
    setInvoice(updated);
    setShowEdit(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading...</div>;
  }

  if (!invoice) return null;

  const isEstimate = invoice.type === 'estimate';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/invoices" className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {isEstimate ? 'Estimates' : 'Invoices'}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={STATUS_COLORS[invoice.status] || 'badge-draft'}>{invoice.status}</span>
            <span className="text-sm text-gray-500 capitalize">{invoice.type}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setShowEdit(true)} className="btn-secondary text-sm py-2 px-3">Edit</button>
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && !isEstimate && (
            <button
              onClick={handleMarkPaid}
              disabled={markingPaid}
              className="btn-primary text-sm py-2 px-3"
            >
              {markingPaid ? 'Processing...' : 'Mark Paid'}
            </button>
          )}
        </div>
      </div>

      {/* Invoice card */}
      <div className="card p-5 space-y-5">
        {/* Client info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Bill To</p>
            <p className="font-semibold text-gray-900">{invoice.client_name}</p>
            {invoice.client_email && <p className="text-sm text-gray-600">{invoice.client_email}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Dates</p>
            <p className="text-sm text-gray-700">Issued: {formatDate(invoice.issue_date)}</p>
            <p className="text-sm text-gray-700">Due: {formatDate(invoice.due_date)}</p>
          </div>
        </div>

        {/* Line items */}
        <div>
          <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide pb-2 border-b border-gray-100">
            <div className="col-span-6">Description</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Rate</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          <div className="divide-y divide-gray-100">
            {(invoice.items || []).map((item, idx) => (
              <div key={idx} className="py-3 grid grid-cols-12 gap-2 items-center">
                <div className="col-span-12 sm:col-span-6">
                  <p className="text-sm font-medium text-gray-900">{item.description}</p>
                </div>
                <div className="col-span-4 sm:col-span-2 text-left sm:text-center">
                  <span className="text-xs text-gray-500 sm:hidden">Qty: </span>
                  <span className="text-sm text-gray-700">{item.quantity}</span>
                </div>
                <div className="col-span-4 sm:col-span-2 text-left sm:text-right">
                  <span className="text-xs text-gray-500 sm:hidden">Rate: </span>
                  <span className="text-sm text-gray-700">{formatCurrency(item.rate)}</span>
                </div>
                <div className="col-span-4 sm:col-span-2 text-left sm:text-right">
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.tax_rate > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax ({invoice.tax_rate}%)</span>
              <span>{formatCurrency(invoice.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100">
            <span>Total</span>
            <span className="text-green-700">{formatCurrency(invoice.total)}</span>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-700">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Danger Zone</h3>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete this {invoice.type}
        </button>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">Edit {invoice.type === 'estimate' ? 'Estimate' : 'Invoice'}</h2>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <InvoiceForm initial={invoice} onSave={handleEditSave} onCancel={() => setShowEdit(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete {invoice.type}?</h2>
            <p className="text-sm text-gray-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="btn-danger flex-1">Delete</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
