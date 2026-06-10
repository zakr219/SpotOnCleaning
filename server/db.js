const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'accounting.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('income','expense')),
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    client_id INTEGER REFERENCES clients(id),
    invoice_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'invoice' CHECK(type IN ('invoice','estimate')),
    client_id INTEGER REFERENCES clients(id),
    client_name TEXT NOT NULL,
    client_email TEXT,
    issue_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','paid','overdue','cancelled')),
    subtotal REAL NOT NULL DEFAULT 0,
    tax_rate REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    rate REAL NOT NULL DEFAULT 0,
    amount REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'employee' CHECK(type IN ('employee','contractor')),
    email TEXT,
    phone TEXT,
    pay_rate REAL,
    pay_type TEXT DEFAULT 'hourly' CHECK(pay_type IN ('hourly','salary','per_job')),
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payroll_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    pay_date TEXT NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payroll_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payroll_run_id INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    hours REAL,
    rate REAL,
    gross_amount REAL NOT NULL,
    deductions REAL DEFAULT 0,
    net_amount REAL NOT NULL,
    notes TEXT
  );
`);

// Seed data - only insert if tables are empty
function seedData() {
  const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get();
  if (clientCount.count > 0) return;

  console.log('Seeding database with sample data...');

  // Insert clients
  const insertClient = db.prepare(
    'INSERT INTO clients (name, email, phone, address) VALUES (?, ?, ?, ?)'
  );
  const clients = [
    ['Johnson Family', 'johnson@email.com', '555-101-2030', '142 Oak Street, Springfield, IL 62701'],
    ['Riverside Office Park', 'mgmt@riversideofc.com', '555-202-3040', '500 Commerce Blvd, Springfield, IL 62702'],
    ['Garcia Household', 'maria.garcia@gmail.com', '555-303-4050', '88 Maple Ave, Springfield, IL 62703'],
    ['Downtown Dental', 'office@downtowndental.com', '555-404-5060', '210 Main St Suite 100, Springfield, IL 62704'],
    ['Patel Residence', 'raj.patel@outlook.com', '555-505-6070', '33 Birchwood Dr, Springfield, IL 62705'],
  ];
  clients.forEach(c => insertClient.run(...c));

  // Insert employees
  const insertEmployee = db.prepare(
    'INSERT INTO employees (name, type, email, phone, pay_rate, pay_type) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const employees = [
    ['Maria Lopez', 'employee', 'maria@spoton.com', '555-111-2222', 18.00, 'hourly'],
    ['James Carter', 'employee', 'james@spoton.com', '555-222-3333', 16.50, 'hourly'],
    ['Clean Pro Services', 'contractor', 'info@cleanpro.com', '555-333-4444', 120.00, 'per_job'],
    ['Tanya Williams', 'employee', 'tanya@spoton.com', '555-444-5555', 17.00, 'hourly'],
  ];
  employees.forEach(e => insertEmployee.run(...e));

  // Insert invoices
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (invoice_number, type, client_id, client_name, client_email, issue_date, due_date, status, subtotal, tax_rate, tax_amount, total, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount)
    VALUES (?, ?, ?, ?, ?)
  `);

  const invoiceData = [
    {
      inv: ['INV-2026-001', 'invoice', 1, 'Johnson Family', 'johnson@email.com', '2026-01-05', '2026-01-20', 'paid', 320, 8, 25.60, 345.60, 'Monthly cleaning service'],
      items: [
        ['Deep clean - kitchen & bathrooms', 1, 180, 180],
        ['General cleaning - 3 bedrooms', 1, 140, 140],
      ]
    },
    {
      inv: ['INV-2026-002', 'invoice', 2, 'Riverside Office Park', 'mgmt@riversideofc.com', '2026-01-10', '2026-01-25', 'paid', 850, 8, 68, 918, 'Weekly office cleaning - Jan week 2'],
      items: [
        ['Office cleaning - 5,000 sq ft', 1, 650, 650],
        ['Window cleaning - exterior', 1, 200, 200],
      ]
    },
    {
      inv: ['INV-2026-003', 'invoice', 3, 'Garcia Household', 'maria.garcia@gmail.com', '2026-01-15', '2026-01-30', 'paid', 280, 8, 22.40, 302.40, null],
      items: [
        ['Standard home cleaning', 2, 140, 280],
      ]
    },
    {
      inv: ['INV-2026-004', 'invoice', 4, 'Downtown Dental', 'office@downtowndental.com', '2026-02-01', '2026-02-16', 'paid', 480, 8, 38.40, 518.40, 'Bi-weekly dental office cleaning'],
      items: [
        ['Medical office cleaning - sanitization', 1, 480, 480],
      ]
    },
    {
      inv: ['INV-2026-005', 'invoice', 1, 'Johnson Family', 'johnson@email.com', '2026-02-05', '2026-02-20', 'paid', 320, 8, 25.60, 345.60, 'Monthly cleaning service'],
      items: [
        ['Deep clean - kitchen & bathrooms', 1, 180, 180],
        ['General cleaning - 3 bedrooms', 1, 140, 140],
      ]
    },
    {
      inv: ['INV-2026-006', 'invoice', 2, 'Riverside Office Park', 'mgmt@riversideofc.com', '2026-02-10', '2026-02-25', 'paid', 850, 8, 68, 918, 'Weekly office cleaning - Feb week 2'],
      items: [
        ['Office cleaning - 5,000 sq ft', 1, 650, 650],
        ['Window cleaning - exterior', 1, 200, 200],
      ]
    },
    {
      inv: ['INV-2026-007', 'invoice', 5, 'Patel Residence', 'raj.patel@outlook.com', '2026-02-18', '2026-03-05', 'paid', 260, 8, 20.80, 280.80, null],
      items: [
        ['Standard home cleaning', 1, 140, 140],
        ['Oven & refrigerator deep clean', 1, 120, 120],
      ]
    },
    {
      inv: ['INV-2026-008', 'invoice', 4, 'Downtown Dental', 'office@downtowndental.com', '2026-03-01', '2026-03-16', 'paid', 480, 8, 38.40, 518.40, null],
      items: [
        ['Medical office cleaning - sanitization', 1, 480, 480],
      ]
    },
    {
      inv: ['INV-2026-009', 'invoice', 3, 'Garcia Household', 'maria.garcia@gmail.com', '2026-03-10', '2026-03-25', 'paid', 280, 8, 22.40, 302.40, null],
      items: [
        ['Standard home cleaning', 2, 140, 280],
      ]
    },
    {
      inv: ['INV-2026-010', 'invoice', 1, 'Johnson Family', 'johnson@email.com', '2026-03-05', '2026-03-20', 'paid', 320, 8, 25.60, 345.60, 'Monthly cleaning service'],
      items: [
        ['Deep clean - kitchen & bathrooms', 1, 180, 180],
        ['General cleaning - 3 bedrooms', 1, 140, 140],
      ]
    },
    {
      inv: ['INV-2026-011', 'invoice', 2, 'Riverside Office Park', 'mgmt@riversideofc.com', '2026-04-01', '2026-04-16', 'paid', 850, 8, 68, 918, 'Monthly office cleaning'],
      items: [
        ['Office cleaning - 5,000 sq ft', 1, 650, 650],
        ['Window cleaning - exterior', 1, 200, 200],
      ]
    },
    {
      inv: ['INV-2026-012', 'invoice', 5, 'Patel Residence', 'raj.patel@outlook.com', '2026-04-15', '2026-04-30', 'paid', 260, 8, 20.80, 280.80, null],
      items: [
        ['Standard home cleaning', 1, 140, 140],
        ['Oven & refrigerator deep clean', 1, 120, 120],
      ]
    },
    {
      inv: ['INV-2026-013', 'invoice', 4, 'Downtown Dental', 'office@downtowndental.com', '2026-05-01', '2026-05-16', 'sent', 480, 8, 38.40, 518.40, null],
      items: [
        ['Medical office cleaning - sanitization', 1, 480, 480],
      ]
    },
    {
      inv: ['INV-2026-014', 'invoice', 1, 'Johnson Family', 'johnson@email.com', '2026-05-05', '2026-05-20', 'paid', 320, 8, 25.60, 345.60, 'Monthly cleaning service'],
      items: [
        ['Deep clean - kitchen & bathrooms', 1, 180, 180],
        ['General cleaning - 3 bedrooms', 1, 140, 140],
      ]
    },
    {
      inv: ['INV-2026-015', 'invoice', 3, 'Garcia Household', 'maria.garcia@gmail.com', '2026-05-12', '2026-05-27', 'overdue', 280, 8, 22.40, 302.40, null],
      items: [
        ['Standard home cleaning', 2, 140, 280],
      ]
    },
    {
      inv: ['INV-2026-016', 'invoice', 2, 'Riverside Office Park', 'mgmt@riversideofc.com', '2026-05-20', '2026-06-05', 'sent', 850, 8, 68, 918, 'Monthly office cleaning'],
      items: [
        ['Office cleaning - 5,000 sq ft', 1, 650, 650],
        ['Window cleaning - exterior', 1, 200, 200],
      ]
    },
    {
      inv: ['EST-2026-001', 'estimate', 5, 'Patel Residence', 'raj.patel@outlook.com', '2026-06-01', '2026-06-15', 'draft', 420, 8, 33.60, 453.60, 'Spring deep clean estimate'],
      items: [
        ['Full home deep clean', 1, 280, 280],
        ['Carpet steam cleaning - 3 rooms', 1, 140, 140],
      ]
    },
  ];

  const insertInvoiceTx = db.transaction(() => {
    invoiceData.forEach(({ inv, items }) => {
      const result = insertInvoice.run(...inv);
      items.forEach(item => insertItem.run(result.lastInsertRowid, ...item));
    });
  });
  insertInvoiceTx();

  // Insert transactions
  const insertTx = db.prepare(`
    INSERT INTO transactions (type, amount, description, category, date, client_id, invoice_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transactions = [
    // Income - payments received
    ['income', 345.60, 'Payment - Johnson Family Jan cleaning', 'Cleaning Services', '2026-01-22', 1, 1, null],
    ['income', 918.00, 'Payment - Riverside Office Park Jan', 'Cleaning Services', '2026-01-27', 2, 2, null],
    ['income', 302.40, 'Payment - Garcia Household Jan', 'Cleaning Services', '2026-01-31', 3, 3, null],
    ['income', 518.40, 'Payment - Downtown Dental Feb', 'Cleaning Services', '2026-02-17', 4, 4, null],
    ['income', 345.60, 'Payment - Johnson Family Feb cleaning', 'Cleaning Services', '2026-02-22', 1, 5, null],
    ['income', 918.00, 'Payment - Riverside Office Park Feb', 'Cleaning Services', '2026-02-26', 2, 6, null],
    ['income', 280.80, 'Payment - Patel Residence Feb', 'Cleaning Services', '2026-02-28', 5, 7, null],
    ['income', 518.40, 'Payment - Downtown Dental Mar', 'Cleaning Services', '2026-03-17', 4, 8, null],
    ['income', 302.40, 'Payment - Garcia Household Mar', 'Cleaning Services', '2026-03-27', 3, 9, null],
    ['income', 345.60, 'Payment - Johnson Family Mar cleaning', 'Cleaning Services', '2026-03-21', 1, 10, null],
    ['income', 918.00, 'Payment - Riverside Office Park Apr', 'Cleaning Services', '2026-04-17', 2, 11, null],
    ['income', 280.80, 'Payment - Patel Residence Apr', 'Cleaning Services', '2026-04-30', 5, 12, null],
    ['income', 345.60, 'Payment - Johnson Family May cleaning', 'Cleaning Services', '2026-05-21', 1, 14, null],
    // Other income
    ['income', 150.00, 'Referral bonus - new client signup', 'Other Income', '2026-03-15', null, null, 'Bonus from cleaning supply partner'],
    ['income', 75.00, 'Tip from Garcia Household', 'Gratuity', '2026-04-10', 3, null, null],

    // Expenses
    ['expense', 280.00, 'Cleaning supplies - bulk order', 'Supplies', '2026-01-08', null, null, 'Mops, buckets, microfiber cloths'],
    ['expense', 95.50, 'Cleaning chemicals & detergents', 'Supplies', '2026-01-15', null, null, null],
    ['expense', 420.00, 'Fuel - van fleet Jan', 'Vehicle & Travel', '2026-01-31', null, null, 'Monthly fuel for 2 vans'],
    ['expense', 185.00, 'Vehicle maintenance - oil change & tires', 'Vehicle & Travel', '2026-02-05', null, null, null],
    ['expense', 180.00, 'Cleaning supplies restock', 'Supplies', '2026-02-10', null, null, null],
    ['expense', 420.00, 'Fuel - van fleet Feb', 'Vehicle & Travel', '2026-02-28', null, null, null],
    ['expense', 650.00, 'Business insurance - monthly premium', 'Insurance', '2026-01-01', null, null, 'Liability + commercial auto'],
    ['expense', 650.00, 'Business insurance - monthly premium', 'Insurance', '2026-02-01', null, null, null],
    ['expense', 650.00, 'Business insurance - monthly premium', 'Insurance', '2026-03-01', null, null, null],
    ['expense', 650.00, 'Business insurance - monthly premium', 'Insurance', '2026-04-01', null, null, null],
    ['expense', 650.00, 'Business insurance - monthly premium', 'Insurance', '2026-05-01', null, null, null],
    ['expense', 220.00, 'Cleaning supplies - March restock', 'Supplies', '2026-03-12', null, null, null],
    ['expense', 420.00, 'Fuel - van fleet Mar', 'Vehicle & Travel', '2026-03-31', null, null, null],
    ['expense', 89.99, 'QuickBooks subscription', 'Software & Subscriptions', '2026-01-01', null, null, null],
    ['expense', 89.99, 'QuickBooks subscription', 'Software & Subscriptions', '2026-02-01', null, null, null],
    ['expense', 89.99, 'QuickBooks subscription', 'Software & Subscriptions', '2026-03-01', null, null, null],
    ['expense', 89.99, 'QuickBooks subscription', 'Software & Subscriptions', '2026-04-01', null, null, null],
    ['expense', 89.99, 'QuickBooks subscription', 'Software & Subscriptions', '2026-05-01', null, null, null],
    ['expense', 165.00, 'Cleaning supplies - Apr restock', 'Supplies', '2026-04-08', null, null, null],
    ['expense', 420.00, 'Fuel - van fleet Apr', 'Vehicle & Travel', '2026-04-30', null, null, null],
    ['expense', 200.00, 'Marketing - local flyers & door hangers', 'Marketing', '2026-02-14', null, null, null],
    ['expense', 350.00, 'Google Ads - Q1', 'Marketing', '2026-03-31', null, null, null],
    ['expense', 150.00, 'Cleaning supplies - May restock', 'Supplies', '2026-05-06', null, null, null],
    ['expense', 420.00, 'Fuel - van fleet May', 'Vehicle & Travel', '2026-05-31', null, null, null],
    ['expense', 95.00, 'Uniforms & workwear', 'Equipment', '2026-01-20', null, null, '4 sets of uniforms'],
    ['expense', 320.00, 'Vacuum cleaner replacement', 'Equipment', '2026-03-08', null, null, 'Commercial grade'],
    ['expense', 45.00, 'Phone plan - business line', 'Utilities', '2026-01-15', null, null, null],
    ['expense', 45.00, 'Phone plan - business line', 'Utilities', '2026-02-15', null, null, null],
    ['expense', 45.00, 'Phone plan - business line', 'Utilities', '2026-03-15', null, null, null],
    ['expense', 45.00, 'Phone plan - business line', 'Utilities', '2026-04-15', null, null, null],
    ['expense', 45.00, 'Phone plan - business line', 'Utilities', '2026-05-15', null, null, null],
  ];

  const insertTxBatch = db.transaction(() => {
    transactions.forEach(t => insertTx.run(...t));
  });
  insertTxBatch();

  // Insert payroll runs
  const insertPayrollRun = db.prepare(`
    INSERT INTO payroll_runs (period_start, period_end, pay_date, total_amount, status, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertPayrollItem = db.prepare(`
    INSERT INTO payroll_items (payroll_run_id, employee_id, hours, rate, gross_amount, deductions, net_amount, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const payrollData = [
    {
      run: ['2026-01-01', '2026-01-15', '2026-01-17', 1524, 'paid', 'Jan first half'],
      items: [
        [1, 1, 40, 18.00, 720, 108, 612, null],
        [2, 2, 36, 16.50, 594, 89.10, 504.90, null],
        [3, 3, null, 120, 120, 0, 120, '1 job'],
        [4, 4, 0, 0, 0, 0, 0, null], // Tanya not yet started
      ]
    },
    {
      run: ['2026-01-16', '2026-01-31', '2026-02-03', 1698, 'paid', 'Jan second half'],
      items: [
        [1, 1, 44, 18.00, 792, 118.80, 673.20, null],
        [2, 2, 38, 16.50, 627, 94.05, 532.95, null],
        [3, 3, null, 120, 240, 0, 240, '2 jobs'],
        [4, 4, 16, 17.00, 272, 40.80, 231.20, 'Hired mid-month'],
      ]
    },
    {
      run: ['2026-02-01', '2026-02-15', '2026-02-17', 1714, 'paid', 'Feb first half'],
      items: [
        [1, 1, 42, 18.00, 756, 113.40, 642.60, null],
        [2, 2, 38, 16.50, 627, 94.05, 532.95, null],
        [3, 3, null, 120, 120, 0, 120, '1 job'],
        [4, 4, 24, 17.00, 408, 61.20, 346.80, null],
      ]
    },
    {
      run: ['2026-02-16', '2026-02-28', '2026-03-03', 1768, 'paid', 'Feb second half'],
      items: [
        [1, 1, 44, 18.00, 792, 118.80, 673.20, null],
        [2, 2, 36, 16.50, 594, 89.10, 504.90, null],
        [3, 3, null, 120, 240, 0, 240, '2 jobs'],
        [4, 4, 26, 17.00, 442, 66.30, 375.70, null],
      ]
    },
    {
      run: ['2026-03-01', '2026-03-15', '2026-03-17', 1780, 'paid', 'Mar first half'],
      items: [
        [1, 1, 44, 18.00, 792, 118.80, 673.20, null],
        [2, 2, 40, 16.50, 660, 99, 561, null],
        [3, 3, null, 120, 120, 0, 120, '1 job'],
        [4, 4, 26, 17.00, 442, 66.30, 375.70, null],
      ]
    },
    {
      run: ['2026-03-16', '2026-03-31', '2026-04-03', 1900, 'paid', 'Mar second half'],
      items: [
        [1, 1, 48, 18.00, 864, 129.60, 734.40, null],
        [2, 2, 40, 16.50, 660, 99, 561, null],
        [3, 3, null, 120, 120, 0, 120, '1 job'],
        [4, 4, 26, 17.00, 442, 66.30, 375.70, null],
      ]
    },
  ];

  const insertPayrollBatch = db.transaction(() => {
    payrollData.forEach(({ run, items }) => {
      const result = insertPayrollRun.run(...run);
      const runId = result.lastInsertRowid;
      items.forEach(item => {
        if (item[4] > 0) {
          insertPayrollItem.run(runId, ...item);
        }
      });
    });
  });
  insertPayrollBatch();

  console.log('Seed data inserted successfully.');
}

seedData();

module.exports = db;
