import React, { useState, useEffect } from 'react';
import { api, formatCurrency } from '../api.js';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function Reports() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [dateRange, setDateRange] = useState({
    from: `${currentYear}-01-01`,
    to: `${currentYear}-12-31`,
  });
  const [summary, setSummary] = useState(null);
  const [plData, setPlData] = useState({ byCategory: [], monthly: [] });
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getReportSummary(dateRange),
      api.getReportPL(dateRange),
      api.getReportMonthly(year),
    ]).then(([sum, pl, monthly]) => {
      setSummary(sum);
      setPlData(pl);
      setMonthlyData(monthly);
    }).catch(console.error).finally(() => setLoading(false));
  }, [dateRange, year]);

  function handleYearChange(y) {
    setYear(y);
    setDateRange({ from: `${y}-01-01`, to: `${y}-12-31` });
  }

  const incomeCategories = plData.byCategory.filter(c => c.type === 'income');
  const expenseCategories = plData.byCategory.filter(c => c.type === 'expense');

  const profitMargin = summary?.income > 0
    ? ((summary.profit / summary.income) * 100).toFixed(1)
    : '0.0';

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading reports...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Profit & Loss Analysis</p>
        </div>
        <div className="flex gap-2">
          <select
            className="input-field text-sm w-28"
            value={year}
            onChange={e => handleYearChange(e.target.value)}
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <input
            type="date"
            className="input-field text-sm"
            value={dateRange.from}
            onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))}
          />
          <input
            type="date"
            className="input-field text-sm"
            value={dateRange.to}
            onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))}
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 bg-green-50 border-green-100">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Total Revenue</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(summary?.income)}</p>
        </div>
        <div className="card p-4 bg-red-50 border-red-100">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Total Expenses</p>
          <p className="text-xl font-bold text-red-700 mt-1">{formatCurrency(summary?.expenses)}</p>
        </div>
        <div className={`card p-4 border ${summary?.profit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-xs font-medium uppercase tracking-wide ${summary?.profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Net Profit</p>
          <p className={`text-xl font-bold mt-1 ${summary?.profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatCurrency(summary?.profit)}</p>
        </div>
        <div className="card p-4 bg-purple-50 border-purple-100">
          <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Profit Margin</p>
          <p className="text-xl font-bold text-purple-700 mt-1">{profitMargin}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {['overview', 'income', 'expenses'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Monthly bar chart */}
          <div className="card p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Monthly Income vs Expenses</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profit line chart */}
          <div className="card p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Monthly Net Profit Trend</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Net Profit"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly table */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Monthly Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Month</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Income</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Expenses</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {monthlyData.map(row => (
                    <tr key={row.month} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-900">{row.month}</td>
                      <td className="px-4 py-2 text-right text-green-600">{formatCurrency(row.income)}</td>
                      <td className="px-4 py-2 text-right text-red-500">{formatCurrency(row.expenses)}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${row.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatCurrency(row.profit)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2 text-right text-green-600">{formatCurrency(summary?.income)}</td>
                    <td className="px-4 py-2 text-right text-red-500">{formatCurrency(summary?.expenses)}</td>
                    <td className={`px-4 py-2 text-right ${summary?.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(summary?.profit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'income' && (
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Income by Category</h2>
            {incomeCategories.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No income in this period</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeCategories} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Amount" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Income Breakdown</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {incomeCategories.map(cat => (
                <div key={cat.category} className="px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{cat.category}</p>
                    <p className="text-xs text-gray-500">{cat.count} transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">{formatCurrency(cat.total)}</p>
                    {summary?.income > 0 && (
                      <p className="text-xs text-gray-400">{((cat.total / summary.income) * 100).toFixed(1)}%</p>
                    )}
                  </div>
                </div>
              ))}
              {incomeCategories.length === 0 && (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">No income in this period</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Expenses by Category</h2>
            {expenseCategories.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No expenses in this period</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseCategories} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Amount" fill="#f87171" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Expense Breakdown</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {expenseCategories.map(cat => (
                <div key={cat.category} className="px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{cat.category}</p>
                    <p className="text-xs text-gray-500">{cat.count} transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-500">{formatCurrency(cat.total)}</p>
                    {summary?.expenses > 0 && (
                      <p className="text-xs text-gray-400">{((cat.total / summary.expenses) * 100).toFixed(1)}%</p>
                    )}
                  </div>
                </div>
              ))}
              {expenseCategories.length === 0 && (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">No expenses in this period</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
