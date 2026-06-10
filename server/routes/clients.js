const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/clients
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM clients ORDER BY name').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients
router.post('/', (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const stmt = db.prepare('INSERT INTO clients (name, email, phone, address) VALUES (?, ?, ?, ?)');
    const result = stmt.run(name, email || null, phone || null, address || null);
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clients/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address } = req.body;
    const stmt = db.prepare('UPDATE clients SET name=?, email=?, phone=?, address=? WHERE id=?');
    const result = stmt.run(name, email || null, phone || null, address || null, id);
    if (result.changes === 0) return res.status(404).json({ error: 'Client not found' });
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Client not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
