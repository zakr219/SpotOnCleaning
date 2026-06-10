const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Transactions
export const api = {
  // Transactions
  getTransactions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/transactions${q ? '?' + q : ''}`);
  },
  getTransactionCategories: () => request('/transactions/categories'),
  createTransaction: (data) => request('/transactions', { method: 'POST', body: data }),
  updateTransaction: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: data }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

  // Clients
  getClients: () => request('/clients'),
  createClient: (data) => request('/clients', { method: 'POST', body: data }),
  updateClient: (id, data) => request(`/clients/${id}`, { method: 'PUT', body: data }),
  deleteClient: (id) => request(`/clients/${id}`, { method: 'DELETE' }),

  // Invoices
  getInvoices: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/invoices${q ? '?' + q : ''}`);
  },
  getInvoice: (id) => request(`/invoices/${id}`),
  createInvoice: (data) => request('/invoices', { method: 'POST', body: data }),
  updateInvoice: (id, data) => request(`/invoices/${id}`, { method: 'PUT', body: data }),
  deleteInvoice: (id) => request(`/invoices/${id}`, { method: 'DELETE' }),
  markInvoicePaid: (id) => request(`/invoices/${id}/mark-paid`, { method: 'POST' }),

  // Employees
  getEmployees: () => request('/employees'),
  createEmployee: (data) => request('/employees', { method: 'POST', body: data }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: data }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),

  // Payroll
  getPayrollRuns: () => request('/payroll'),
  getPayrollRun: (id) => request(`/payroll/${id}`),
  createPayrollRun: (data) => request('/payroll', { method: 'POST', body: data }),
  markPayrollPaid: (id) => request(`/payroll/${id}/mark-paid`, { method: 'PUT' }),
  deletePayrollRun: (id) => request(`/payroll/${id}`, { method: 'DELETE' }),

  // Reports
  getReportSummary: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports/summary${q ? '?' + q : ''}`);
  },
  getReportPL: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports/pl${q ? '?' + q : ''}`);
  },
  getReportMonthly: (year) => request(`/reports/monthly?year=${year}`),
};

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function generateInvoiceNumber(type = 'invoice') {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900) + 100;
  const prefix = type === 'estimate' ? 'EST' : 'INV';
  return `${prefix}-${year}-${rand}`;
}
