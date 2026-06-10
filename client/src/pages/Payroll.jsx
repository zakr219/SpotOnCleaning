import React, { useState, useEffect, useCallback } from 'react';
import { api, formatCurrency, formatDate } from '../api.js';
import PayrollForm from '../components/PayrollForm.jsx';

export default function Payroll() {
  const [runs, setRuns] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('runs');
  const [showPayrollForm, setShowPayrollForm] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [expandedRun, setExpandedRun] = useState(null);
  const [runDetail, setRunDetail] = useState({});
  const [deleteRunId, setDeleteRunId] = useState(null);
  const [deleteEmpId, setDeleteEmpId] = useState(null);
  const [empForm, setEmpForm] = useState({ name: '', type: 'employee', email: '', phone: '', pay_rate: '', pay_type: 'hourly', active: 1 });
  const [empSaving, setEmpSaving] = useState(false);
  const [empError, setEmpError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.getPayrollRuns(), api.getEmployees()])
      .then(([r, e]) => { setRuns(r); setEmployees(e); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleExpandRun(id) {
    if (expandedRun === id) { setExpandedRun(null); return; }
    setExpandedRun(id);
    if (!runDetail[id]) {
      try {
        const detail = await api.getPayrollRun(id);
        setRunDetail(d => ({ ...d, [id]: detail }));
      } catch (e) { console.error(e); }
    }
  }

  async function handleMarkPaid(id) {
    try {
      const updated = await api.markPayrollPaid(id);
      setRuns(r => r.map(run => run.id === id ? { ...run, status: 'paid' } : run));
      setRunDetail(d => ({ ...d, [id]: updated }));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteRun(id) {
    try {
      await api.deletePayrollRun(id);
      setDeleteRunId(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  function openEmployeeForm(emp = null) {
    if (emp) {
      setEditEmployee(emp);
      setEmpForm({ name: emp.name, type: emp.type, email: emp.email || '', phone: emp.phone || '', pay_rate: emp.pay_rate || '', pay_type: emp.pay_type || 'hourly', active: emp.active });
    } else {
      setEditEmployee(null);
      setEmpForm({ name: '', type: 'employee', email: '', phone: '', pay_rate: '', pay_type: 'hourly', active: 1 });
    }
    setEmpError('');
    setShowEmployeeForm(true);
  }

  async function handleSaveEmployee(e) {
    e.preventDefault();
    setEmpError('');
    if (!empForm.name) { setEmpError('Name is required'); return; }
    setEmpSaving(true);
    try {
      const payload = { ...empForm, pay_rate: empForm.pay_rate ? parseFloat(empForm.pay_rate) : null };
      if (editEmployee) {
        await api.updateEmployee(editEmployee.id, payload);
      } else {
        await api.createEmployee(payload);
      }
      setShowEmployeeForm(false);
      load();
    } catch (err) {
      setEmpError(err.message);
    } finally {
      setEmpSaving(false);
    }
  }

  async function handleDeleteEmployee(id) {
    try {
      await api.deleteEmployee(id);
      setDeleteEmpId(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  const totalYTDPayroll = runs.filter(r => r.status === 'paid').reduce((s, r) => s + r.total_amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-sm text-gray-500 mt-0.5">YTD Paid: {formatCurrency(totalYTDPayroll)}</p>
        </div>
        <button
          onClick={() => activeTab === 'runs' ? setShowPayrollForm(true) : openEmployeeForm()}
          className="btn-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {activeTab === 'runs' ? 'New Payroll Run' : 'Add Employee'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {['runs', 'employees'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'runs' ? `Payroll Runs (${runs.length})` : `Staff (${employees.length})`}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading...</div>
      )}

      {/* Payroll Runs Tab */}
      {!loading && activeTab === 'runs' && (
        <div className="space-y-3">
          {runs.length === 0 && (
            <div className="card py-12 text-center">
              <p className="text-gray-400 text-sm">No payroll runs yet.</p>
              <button onClick={() => setShowPayrollForm(true)} className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium">
                Create first payroll run
              </button>
            </div>
          )}
          {runs.map(run => (
            <div key={run.id} className="card overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpandRun(run.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(run.period_start)} – {formatDate(run.period_end)}
                    </p>
                    <span className={`${run.status === 'paid' ? 'badge-paid' : 'badge-pending'}`}>{run.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Pay date: {formatDate(run.pay_date)}{run.notes ? ` · ${run.notes}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(run.total_amount)}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedRun === run.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {expandedRun === run.id && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                  {runDetail[run.id]?.items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{item.employee_name}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {item.employee_type}
                          {item.hours ? ` · ${item.hours} hrs` : ''}
                          {item.rate ? ` @ $${item.rate}` : ''}
                          {item.deductions > 0 ? ` · -$${item.deductions} deductions` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {item.gross_amount !== item.net_amount && (
                          <p className="text-xs text-gray-400 line-through">{formatCurrency(item.gross_amount)}</p>
                        )}
                        <p className="font-semibold text-green-700">{formatCurrency(item.net_amount)}</p>
                      </div>
                    </div>
                  ))}
                  {!runDetail[run.id] && (
                    <p className="text-sm text-gray-400">Loading details...</p>
                  )}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    {run.status === 'pending' && (
                      <button
                        onClick={() => handleMarkPaid(run.id)}
                        className="btn-primary text-sm py-1.5 px-3"
                      >
                        Mark as Paid
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteRunId(run.id)}
                      className="btn-secondary text-sm py-1.5 px-3 text-red-500 border-red-200 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Employees Tab */}
      {!loading && activeTab === 'employees' && (
        <div className="card divide-y divide-gray-100">
          {employees.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-gray-400 text-sm">No employees yet.</p>
              <button onClick={() => openEmployeeForm()} className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium">
                Add first employee
              </button>
            </div>
          )}
          {employees.map(emp => (
            <div key={emp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold ${emp.type === 'contractor' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                {emp.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${emp.type === 'contractor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {emp.type}
                  </span>
                  {!emp.active && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">inactive</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {emp.pay_rate ? `$${emp.pay_rate}` : 'No rate'} / {emp.pay_type?.replace('_', ' ')}
                  {emp.email ? ` · ${emp.email}` : ''}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => openEmployeeForm(emp)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => setDeleteEmpId(emp.id)}
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
      )}

      {/* Payroll Form Modal */}
      {showPayrollForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">New Payroll Run</h2>
              <button onClick={() => setShowPayrollForm(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <PayrollForm
                onSave={() => { setShowPayrollForm(false); load(); }}
                onCancel={() => setShowPayrollForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Employee Form Modal */}
      {showEmployeeForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">{editEmployee ? 'Edit' : 'Add'} Employee / Contractor</h2>
              <button onClick={() => setShowEmployeeForm(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveEmployee} className="p-4 space-y-4">
              {empError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{empError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-300">
                  {['employee', 'contractor'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEmpForm(f => ({ ...f, type: t }))}
                      className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${empForm.type === t ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  className="input-field"
                  value={empForm.name}
                  onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" className="input-field" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" className="input-field" value={empForm.phone} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pay Rate ($)</label>
                  <input type="number" step="0.01" min="0" className="input-field" value={empForm.pay_rate} onChange={e => setEmpForm(f => ({ ...f, pay_rate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pay Type</label>
                  <select className="input-field" value={empForm.pay_type} onChange={e => setEmpForm(f => ({ ...f, pay_type: e.target.value }))}>
                    <option value="hourly">Hourly</option>
                    <option value="salary">Salary</option>
                    <option value="per_job">Per Job</option>
                  </select>
                </div>
              </div>
              {editEmployee && (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Active</label>
                  <button
                    type="button"
                    onClick={() => setEmpForm(f => ({ ...f, active: f.active ? 0 : 1 }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${empForm.active ? 'bg-green-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${empForm.active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={empSaving}>
                  {empSaving ? 'Saving...' : (editEmployee ? 'Update' : 'Add Employee')}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowEmployeeForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Run Confirm */}
      {deleteRunId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Payroll Run?</h2>
            <p className="text-sm text-gray-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDeleteRun(deleteRunId)} className="btn-danger flex-1">Delete</button>
              <button onClick={() => setDeleteRunId(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Employee Confirm */}
      {deleteEmpId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Employee?</h2>
            <p className="text-sm text-gray-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDeleteEmployee(deleteEmpId)} className="btn-danger flex-1">Delete</button>
              <button onClick={() => setDeleteEmpId(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
