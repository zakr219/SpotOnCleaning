const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/invoices
router.get('/', (req, res) => {
  try {
    const { status, type } = req.query;
    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (type) { query += ' AND type = ?'; params.push(type); }
    query += ' ORDER BY issue_date DESC, created_at DESC';
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/:id
router.get('/:id', (req, res) => {
  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id').all(req.params.id);
    res.json({ ...invoice, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices
router.post('/', (req, res) => {
  try {
    const {
      invoice_number, type, client_id, client_name, client_email,
      issue_date, due_date, status, subtotal, tax_rate, tax_amount, total, notes, items
    } = req.body;

    if (!invoice_number || !client_name || !issue_date || !due_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const insertInvoice = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO invoices (invoice_number, type, client_id, client_name, client_email, issue_date, due_date, status, subtotal, tax_rate, tax_amount, total, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoice_number, type || 'invoice', client_id || null, client_name, client_email || null,
        issue_date, due_date, status || 'draft',
        subtotal || 0, tax_rate || 0, tax_amount || 0, total || 0, notes || null
      );

      const invoiceId = result.lastInsertRowid;

      if (items && items.length > 0) {
        const insertItem = db.prepare(
          'INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)'
        );
        items.forEach(item => {
          insertItem.run(invoiceId, item.description, item.quantity || 1, item.rate || 0, item.amount || 0);
        });
      }

      return invoiceId;
    });

    const invoiceId = insertInvoice();
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    const invoiceItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);
    res.status(201).json({ ...invoice, items: invoiceItems });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/invoices/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      invoice_number, type, client_id, client_name, client_email,
      issue_date, due_date, status, subtotal, tax_rate, tax_amount, total, notes, items
    } = req.body;

    const updateInvoice = db.transaction(() => {
      const result = db.prepare(`
        UPDATE invoices SET invoice_number=?, type=?, client_id=?, client_name=?, client_email=?,
        issue_date=?, due_date=?, status=?, subtotal=?, tax_rate=?, tax_amount=?, total=?, notes=?
        WHERE id=?
      `).run(
        invoice_number, type || 'invoice', client_id || null, client_name, client_email || null,
        issue_date, due_date, status || 'draft',
        subtotal || 0, tax_rate || 0, tax_amount || 0, total || 0, notes || null, id
      );

      if (result.changes === 0) throw new Error('NOT_FOUND');

      if (items !== undefined) {
        db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);
        if (items.length > 0) {
          const insertItem = db.prepare(
            'INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)'
          );
          items.forEach(item => {
            insertItem.run(id, item.description, item.quantity || 1, item.rate || 0, item.amount || 0);
          });
        }
      }
    });

    try {
      updateInvoice();
    } catch (e) {
      if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'Invoice not found' });
      throw e;
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    const invoiceItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id);
    res.json({ ...invoice, items: invoiceItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices/:id/mark-paid
router.post('/:id/mark-paid', (req, res) => {
  try {
    const { id } = req.params;
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ error: 'Invoice already paid' });

    const markPaid = db.transaction(() => {
      db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run('paid', id);

      const today = new Date().toISOString().split('T')[0];
      db.prepare(`
        INSERT INTO transactions (type, amount, description, category, date, client_id, invoice_id, notes)
        VALUES ('income', ?, ?, 'Cleaning Services', ?, ?, ?, 'Auto-created from invoice payment')
      `).run(
        invoice.total,
        `Payment - ${invoice.client_name} (${invoice.invoice_number})`,
        today,
        invoice.client_id || null,
        id
      );
    });

    markPaid();
    const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id);
    res.json({ ...updated, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
