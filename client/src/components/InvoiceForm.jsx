import React, { useState, useEffect } from 'react';
import { api, today, generateInvoiceNumber } from '../api.js';

const emptyItem = () => ({ description: '', quantity: 1, rate: '', amount: 0 });

export default function InvoiceForm({ initial, onSave, onCancel }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    invoice_number: generateInvoiceNumber('invoice'),
    type: 'invoice',
    client_id: '',
    client_name: '',
    client_email: '',
    issue_date: today(),
    due_date: '',
    status: 'draft',
    tax_rate: 8,
    notes: '',
    ...initial,
  });
  const [items, setItems] = useState(initial?.items?.length ? initial.items : [emptyItem()]);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getClients().then(setClients).catch(() => {});
  }, []);

  // Auto-set due date 15 days after issue date
  useEffect(() => {
    if (form.issue_date && !isEdit) {
      const d = new Date(form.issue_date);
      d.setDate(d.getDate() + 15);
      setForm(f => ({ ...f, due_date: d.toISOString().split('T')[0] }));
    }
  }, [form.issue_date]);

  // Update invoice number prefix when type changes
  useEffect(() => {
    if (!isEdit) {
      setForm(f => ({ ...f, invoice_number: generateInvoiceNumber(f.type) }));
    }
  }, [form.type]);

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const taxAmount = subtotal * (parseFloat(form.tax_rate) || 0) / 100;
  const total = subtotal + taxAmount;

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleClientChange(clientId) {
    const client = clients.find(c => c.id === parseInt(clientId));
    setForm(f => ({
      ...f,
      client_id: clientId,
      client_name: client ? client.name : '',
      client_email: client ? (client.email || '') : '',
    }));
  }

  function updateItem(idx, field, value) {
    setItems(items => {
      const next = [...items];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'quantity' || field === 'rate') {
        const qty = parseFloat(field === 'quantity' ? value : next[idx].quantity) || 0;
        const rate = parseFloat(field === 'rate' ? value : next[idx].rate) || 0;
        next[idx].amount = +(qty * rate).toFixed(2);
      }
      return next;
    });
  }

  function addItem() {
    setItems(i => [...i, emptyItem()]);
  }

  function removeItem(idx) {
    setItems(i => i.filter((_, j) => j !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.client_name || !form.issue_date || !form.due_date) {
      setError('Please fill in all required fields.');
      return;
    }
    if (items.some(i => !i.description)) {
      setError('All line items must have a description.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        client_id: form.client_id || null,
        tax_rate: parseFloat(form.tax_rate) || 0,
        subtotal: +subtotal.toFixed(2),
        tax_amount: +taxAmount.toFixed(2),
        total: +total.toFixed(2),
        items: items.map(i => ({
          description: i.description,
          quantity: parseFloat(i.quantity) || 1,
          rate: parseFloat(i.rate) || 0,
          amount: parseFloat(i.amount) || 0,
        })),
      };
      let result;
      if (isEdit) {
        result = await api.updateInvoice(initial.id, payload);
      } else {
        result = await api.createInvoice(payload);
      }
      onSave(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          {['invoice', 'estimate'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setField('type', t)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${form.type === t ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{form.type === 'estimate' ? 'Estimate' : 'Invoice'} # *</label>
          <input
            type="text"
            className="input-field"
            value={form.invoice_number}
            onChange={e => setField('invoice_number', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="input-field" value={form.status} onChange={e => setField('status', e.target.value)}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Client */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
        <select className="input-field" value={form.client_id} onChange={e => handleClientChange(e.target.value)}>
          <option value="">Select a client or enter manually</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
          <input
            type="text"
            className="input-field"
            placeholder="Client name"
            value={form.client_name}
            onChange={e => setField('client_name', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
          <input
            type="email"
            className="input-field"
            placeholder="email@example.com"
            value={form.client_email}
            onChange={e => setField('client_email', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
          <input type="date" className="input-field" value={form.issue_date} onChange={e => setField('issue_date', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
          <input type="date" className="input-field" value={form.due_date} onChange={e => setField('due_date', e.target.value)} required />
        </div>
      </div>

      {/* Line Items */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1 text-sm"
                  placeholder="Description"
                  value={item.description}
                  onChange={e => updateItem(idx, 'description', e.target.value)}
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-red-500 hover:text-red-700 p-2 flex-shrink-0"
                    title="Remove item"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Qty</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="input-field text-sm"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-field text-sm"
                    placeholder="0.00"
                    value={item.rate}
                    onChange={e => updateItem(idx, 'rate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Amount</label>
                  <div className="input-field text-sm bg-gray-100 flex items-center">
                    ${(parseFloat(item.amount) || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-2 text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add line item
        </button>
      </div>

      {/* Totals */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm items-center gap-2">
          <span className="text-gray-600">Tax (%)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
            value={form.tax_rate}
            onChange={e => setField('tax_rate', e.target.value)}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tax Amount</span>
          <span>${taxAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2 mt-2">
          <span>Total</span>
          <span className="text-green-700">${total.toFixed(2)}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="Any notes or payment instructions..."
          value={form.notes}
          onChange={e => setField('notes', e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Saving...' : (isEdit ? 'Update' : `Create ${form.type === 'estimate' ? 'Estimate' : 'Invoice'}`)}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
