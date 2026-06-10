import React, { useState, useEffect } from 'react';
import { api, today } from '../api.js';

export default function PayrollForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    period_start: '',
    period_end: '',
    pay_date: today(),
    notes: '',
  });
  const [employees, setEmployees] = useState([]);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getEmployees().then(emps => {
      const active = emps.filter(e => e.active);
      setEmployees(active);
      setItems(active.map(e => ({
        employee_id: e.id,
        employee_name: e.name,
        employee_type: e.type,
        pay_type: e.pay_type,
        hours: e.pay_type === 'hourly' ? '' : '',
        rate: e.pay_rate || '',
        gross_amount: '',
        deductions: '',
        net_amount: '',
        notes: '',
      })));
    }).catch(() => {});
  }, []);

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function updateItem(idx, field, value) {
    setItems(items => {
      const next = [...items];
      next[idx] = { ...next[idx], [field]: value };
      const item = next[idx];

      // Auto-calculate gross when hours/rate change
      if (field === 'hours' || field === 'rate') {
        const hours = parseFloat(field === 'hours' ? value : item.hours) || 0;
        const rate = parseFloat(field === 'rate' ? value : item.rate) || 0;
        if (item.pay_type === 'hourly' && hours && rate) {
          next[idx].gross_amount = (hours * rate).toFixed(2);
        } else if (item.pay_type === 'per_job' && rate) {
          next[idx].gross_amount = rate.toFixed ? rate.toFixed(2) : String(rate);
        }
      }

      // Auto-calculate net when gross/deductions change
      if (field === 'gross_amount' || field === 'deductions') {
        const gross = parseFloat(field === 'gross_amount' ? value : item.gross_amount) || 0;
        const ded = parseFloat(field === 'deductions' ? value : item.deductions) || 0;
        next[idx].net_amount = Math.max(0, gross - ded).toFixed(2);
      }

      return next;
    });
  }

  const totalNet = items.reduce((s, i) => s + (parseFloat(i.net_amount) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.period_start || !form.period_end || !form.pay_date) {
      setError('Please fill in period start, end, and pay date.');
      return;
    }
    const activeItems = items.filter(i => parseFloat(i.gross_amount) > 0);
    if (activeItems.length === 0) {
      setError('Please enter at least one payroll amount.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        items: activeItems.map(i => ({
          employee_id: i.employee_id,
          hours: parseFloat(i.hours) || null,
          rate: parseFloat(i.rate) || null,
          gross_amount: parseFloat(i.gross_amount) || 0,
          deductions: parseFloat(i.deductions) || 0,
          net_amount: parseFloat(i.net_amount) || 0,
          notes: i.notes || null,
        })),
      };
      const result = await api.createPayrollRun(payload);
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Period Start *</label>
          <input
            type="date"
            className="input-field"
            value={form.period_start}
            onChange={e => setField('period_start', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Period End *</label>
          <input
            type="date"
            className="input-field"
            value={form.period_end}
            onChange={e => setField('period_end', e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pay Date *</label>
        <input
          type="date"
          className="input-field"
          value={form.pay_date}
          onChange={e => setField('pay_date', e.target.value)}
          required
        />
      </div>

      {/* Employee items */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Employees & Contractors</label>
        {items.length === 0 && (
          <p className="text-sm text-gray-500">No active employees found. Add employees in the Payroll section first.</p>
        )}
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.employee_id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm text-gray-900">{item.employee_name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${item.employee_type === 'contractor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {item.employee_type}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {item.pay_type === 'hourly' && (
                  <div>
                    <label className="text-xs text-gray-500">Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="input-field text-sm"
                      placeholder="0"
                      value={item.hours}
                      onChange={e => updateItem(idx, 'hours', e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500">{item.pay_type === 'per_job' ? 'Rate/Job ($)' : 'Rate/hr ($)'}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-field text-sm"
                    value={item.rate}
                    onChange={e => updateItem(idx, 'rate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Gross ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-field text-sm"
                    placeholder="0.00"
                    value={item.gross_amount}
                    onChange={e => updateItem(idx, 'gross_amount', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Deductions ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-field text-sm"
                    placeholder="0.00"
                    value={item.deductions}
                    onChange={e => updateItem(idx, 'deductions', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Net Pay ($)</label>
                  <div className="input-field text-sm bg-gray-100 font-medium text-green-700">
                    ${parseFloat(item.net_amount || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex justify-between items-center">
        <span className="font-semibold text-gray-700">Total Net Payroll</span>
        <span className="text-xl font-bold text-green-700">${totalNet.toFixed(2)}</span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="Any notes about this payroll run..."
          value={form.notes}
          onChange={e => setField('notes', e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Creating...' : 'Create Payroll Run'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
