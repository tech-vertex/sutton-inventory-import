const Database = require('better-sqlite3');
const path = require('path');

// Create or open database
const db = new Database(path.join(__dirname, 'app.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('✅ Database connection established');

module.exports = db;
