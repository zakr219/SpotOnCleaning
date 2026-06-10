const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/transactions/categories
router.get('/categories', (req, res) => {
  try {
    const rows = db.prepare('SELECT DISTINCT category FROM transactions ORDER BY category').all();
    const categories = rows.map(r => r.category);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions
router.get('/', (req, res) => {
  try {
    const { type, category, from, to } = req.query;
    let query = `
      SELECT t.*, c.name as client_name
      FROM transactions t
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }
    if (category) {
      query += ' AND t.category = ?';
      params.push(category);
    }
    if (from) {
      query += ' AND t.date >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND t.date <= ?';
      params.push(to);
    }

    query += ' ORDER BY t.date DESC, t.created_at DESC';

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions
router.post('/', (req, res) => {
  try {
    const { type, amount, description, category, date, client_id, invoice_id, notes } = req.body;
    if (!type || !amount || !description || !category || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const stmt = db.prepare(`
      INSERT INTO transactions (type, amount, description, category, date, client_id, invoice_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(type, amount, description, category, date, client_id || null, invoice_id || null, notes || null);
    const newTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newTx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/transactions/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, description, category, date, client_id, invoice_id, notes } = req.body;
    const stmt = db.prepare(`
      UPDATE transactions SET type=?, amount=?, description=?, category=?, date=?, client_id=?, invoice_id=?, notes=?
      WHERE id=?
    `);
    const result = stmt.run(type, amount, description, category, date, client_id || null, invoice_id || null, notes || null, id);
    if (result.changes === 0) return res.status(404).json({ error: 'Transaction not found' });
    const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
