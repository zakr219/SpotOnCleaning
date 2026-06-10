const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/reports/summary?from=&to=
router.get('/summary', (req, res) => {
  try {
    const { from, to } = req.query;
    let whereClause = 'WHERE 1=1';
    const params = [];
    if (from) { whereClause += ' AND date >= ?'; params.push(from); }
    if (to) { whereClause += ' AND date <= ?'; params.push(to); }

    const income = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions ${whereClause} AND type = 'income'
    `).get(...params);

    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions ${whereClause} AND type = 'expense'
    `).get(...params);

    const invoiceCounts = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue,
        COALESCE(SUM(CASE WHEN status IN ('sent','overdue') THEN total ELSE 0 END), 0) as outstanding
      FROM invoices
      WHERE type = 'invoice'
    `).get();

    res.json({
      income: income.total,
      expenses: expenses.total,
      profit: income.total - expenses.total,
      invoices: invoiceCounts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/pl?from=&to=
router.get('/pl', (req, res) => {
  try {
    const { from, to } = req.query;
    let whereClause = 'WHERE 1=1';
    const params = [];
    if (from) { whereClause += ' AND date >= ?'; params.push(from); }
    if (to) { whereClause += ' AND date <= ?'; params.push(to); }

    const byCategory = db.prepare(`
      SELECT type, category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM transactions
      ${whereClause}
      GROUP BY type, category
      ORDER BY type, total DESC
    `).all(...params);

    const monthly = db.prepare(`
      SELECT
        strftime('%Y-%m', date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
      FROM transactions
      ${whereClause}
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month
    `).all(...params);

    const monthlyWithProfit = monthly.map(m => ({
      ...m,
      profit: m.income - m.expenses
    }));

    res.json({ byCategory, monthly: monthlyWithProfit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/monthly?year=
router.get('/monthly', (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear().toString();

    const rows = db.prepare(`
      SELECT
        strftime('%m', date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
      FROM transactions
      WHERE strftime('%Y', date) = ?
      GROUP BY strftime('%m', date)
      ORDER BY month
    `).all(year);

    // Fill in all 12 months
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const result = monthNames.map((name, i) => {
      const monthNum = String(i + 1).padStart(2, '0');
      const found = rows.find(r => r.month === monthNum);
      return {
        month: name,
        income: found ? found.income : 0,
        expenses: found ? found.expenses : 0,
        profit: found ? found.income - found.expenses : 0
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
