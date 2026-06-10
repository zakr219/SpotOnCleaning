const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/employees
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM employees ORDER BY name').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/employees
router.post('/', (req, res) => {
  try {
    const { name, type, email, phone, pay_rate, pay_type } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = db.prepare(`
      INSERT INTO employees (name, type, email, phone, pay_rate, pay_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, type || 'employee', email || null, phone || null, pay_rate || null, pay_type || 'hourly');
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/employees/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, email, phone, pay_rate, pay_type, active } = req.body;
    const result = db.prepare(`
      UPDATE employees SET name=?, type=?, email=?, phone=?, pay_rate=?, pay_type=?, active=?
      WHERE id=?
    `).run(name, type || 'employee', email || null, phone || null, pay_rate || null, pay_type || 'hourly', active !== undefined ? active : 1, id);
    if (result.changes === 0) return res.status(404).json({ error: 'Employee not found' });
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
