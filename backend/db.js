const Database = require('better-sqlite3');
const path = require('path');

// Create or open database
const db = new Database(path.join(__dirname, 'inventory.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
function initDatabase() {
  // Inventory items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      uom TEXT NOT NULL,
      unit_cost REAL NOT NULL,
      quantity_on_hand INTEGER DEFAULT 0,
      reorder_point INTEGER,
      is_active BOOLEAN DEFAULT 1,
      lot_tracked BOOLEAN DEFAULT 0,
      tags TEXT,
      first_received_on TEXT,
      discontinued_on TEXT,
      dimensions TEXT,
      vendors TEXT,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Import history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS import_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      total_rows INTEGER,
      successful_rows INTEGER,
      failed_rows INTEGER,
      errors TEXT,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Database initialized');
}

initDatabase();

module.exports = db;
