const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/payroll
router.get('/', (req, res) => {
  try {
    const runs = db.prepare('SELECT * FROM payroll_runs ORDER BY period_start DESC').all();
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payroll/:id
router.get('/:id', (req, res) => {
  try {
    const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });
    const items = db.prepare(`
      SELECT pi.*, e.name as employee_name, e.type as employee_type
      FROM payroll_items pi
      JOIN employees e ON pi.employee_id = e.id
      WHERE pi.payroll_run_id = ?
      ORDER BY e.name
    `).all(req.params.id);
    res.json({ ...run, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payroll
router.post('/', (req, res) => {
  try {
    const { period_start, period_end, pay_date, notes, items } = req.body;
    if (!period_start || !period_end || !pay_date) {
      return res.status(400).json({ error: 'period_start, period_end, and pay_date are required' });
    }

    const createRun = db.transaction(() => {
      const totalAmount = (items || []).reduce((sum, item) => sum + (item.net_amount || 0), 0);

      const result = db.prepare(`
        INSERT INTO payroll_runs (period_start, period_end, pay_date, total_amount, status, notes)
        VALUES (?, ?, ?, ?, 'pending', ?)
      `).run(period_start, period_end, pay_date, totalAmount, notes || null);

      const runId = result.lastInsertRowid;

      if (items && items.length > 0) {
        const insertItem = db.prepare(`
          INSERT INTO payroll_items (payroll_run_id, employee_id, hours, rate, gross_amount, deductions, net_amount, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        items.forEach(item => {
          insertItem.run(
            runId,
            item.employee_id,
            item.hours || null,
            item.rate || null,
            item.gross_amount || 0,
            item.deductions || 0,
            item.net_amount || 0,
            item.notes || null
          );
        });
      }

      return runId;
    });

    const runId = createRun();
    const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(runId);
    const payrollItems = db.prepare(`
      SELECT pi.*, e.name as employee_name, e.type as employee_type
      FROM payroll_items pi
      JOIN employees e ON pi.employee_id = e.id
      WHERE pi.payroll_run_id = ?
    `).all(runId);
    res.status(201).json({ ...run, items: payrollItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payroll/:id/mark-paid
router.put('/:id/mark-paid', (req, res) => {
  try {
    const { id } = req.params;
    const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(id);
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });
    if (run.status === 'paid') return res.status(400).json({ error: 'Payroll run already paid' });

    const markPaid = db.transaction(() => {
      db.prepare('UPDATE payroll_runs SET status = ? WHERE id = ?').run('paid', id);

      db.prepare(`
        INSERT INTO transactions (type, amount, description, category, date, notes)
        VALUES ('expense', ?, ?, 'Payroll', ?, 'Auto-created from payroll run')
      `).run(
        run.total_amount,
        `Payroll - ${run.period_start} to ${run.period_end}`,
        run.pay_date
      );
    });

    markPaid();
    const updated = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(id);
    const items = db.prepare(`
      SELECT pi.*, e.name as employee_name, e.type as employee_type
      FROM payroll_items pi
      JOIN employees e ON pi.employee_id = e.id
      WHERE pi.payroll_run_id = ?
    `).all(id);
    res.json({ ...updated, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payroll/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM payroll_runs WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Payroll run not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
