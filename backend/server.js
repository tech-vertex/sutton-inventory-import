const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Handle large CSV data

// Validation helpers
const SKU_PATTERN = /^[A-Z]{4}-[A-Z0-9]{3}$/;
const CATEGORIES = ['raw_material', 'component', 'finished_good', 'packaging', 'consumable'];
const UOMS = ['EA', 'BX', 'KG', 'M', 'L'];

function validateItem(item) {
  const errors = [];

  // SKU validation
  if (!item.sku) {
    errors.push('SKU is required');
  } else if (!SKU_PATTERN.test(item.sku)) {
    errors.push('SKU must match format XXXX-XXX (e.g., PACK-7Q2)');
  }

  // Name validation
  if (!item.name) {
    errors.push('Name is required');
  } else {
    const trimmed = item.name.trim();
    if (trimmed.length < 1 || trimmed.length > 120) {
      errors.push('Name must be 1-120 characters');
    }
  }

  // Category validation
  if (!item.category) {
    errors.push('Category is required');
  } else if (!CATEGORIES.includes(item.category)) {
    errors.push(`Category must be one of: ${CATEGORIES.join(', ')}`);
  }

  // UOM validation
  if (!item.uom) {
    errors.push('UOM is required');
  } else if (!UOMS.includes(item.uom)) {
    errors.push(`UOM must be one of: ${UOMS.join(', ')}`);
  }

  // Unit cost validation
  if (item.unit_cost === undefined || item.unit_cost === null || item.unit_cost === '') {
    errors.push('Unit cost is required');
  } else {
    const cost = parseFloat(item.unit_cost);
    if (isNaN(cost) || cost < 0) {
      errors.push('Unit cost must be 0 or greater');
    }
  }

  // Quantity validation
  if (item.quantity_on_hand !== undefined && item.quantity_on_hand !== null && item.quantity_on_hand !== '') {
    const qty = parseInt(item.quantity_on_hand);
    if (isNaN(qty) || qty < 0) {
      errors.push('Quantity on hand must be 0 or greater');
    }
  }

  // Cross-field validation: discontinued_on requires is_active = false
  if (item.discontinued_on && item.is_active !== false) {
    errors.push('If discontinued_on is set, is_active must be false');
  }

  // Vendors validation: at most one preferred vendor
  if (item.vendors && Array.isArray(item.vendors)) {
    const preferredCount = item.vendors.filter(v => v.is_preferred === true).length;
    if (preferredCount > 1) {
      errors.push('At most one vendor can be marked as preferred');
    }

    // Validate vendor structure
    item.vendors.forEach((vendor, idx) => {
      if (!vendor.vendor_name || vendor.vendor_name.trim().length === 0) {
        errors.push(`Vendor ${idx + 1}: vendor_name is required`);
      }
      if (vendor.unit_cost === undefined || vendor.unit_cost === null) {
        errors.push(`Vendor ${idx + 1}: unit_cost is required`);
      } else {
        const cost = parseFloat(vendor.unit_cost);
        if (isNaN(cost) || cost < 0) {
          errors.push(`Vendor ${idx + 1}: unit_cost must be 0 or greater`);
        }
      }
      if (vendor.lead_time_days !== undefined && vendor.lead_time_days !== null) {
        const days = parseInt(vendor.lead_time_days);
        if (isNaN(days) || days < 0) {
          errors.push(`Vendor ${idx + 1}: lead_time_days must be 0 or greater`);
        }
      }
    });
  }

  return errors;
}

// Validate endpoint
app.post('/api/validate', (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }

    // Check for duplicate SKUs in the batch
    const skus = new Set();
    const duplicates = new Set();

    items.forEach(item => {
      if (item.sku) {
        if (skus.has(item.sku)) {
          duplicates.add(item.sku);
        }
        skus.add(item.sku);
      }
    });

    // Validate each item
    const results = items.map((item, index) => {
      const errors = validateItem(item);

      // Check if SKU is duplicate in batch
      if (duplicates.has(item.sku)) {
        errors.push('Duplicate SKU in file');
      }

      // Check if SKU exists in database
      if (item.sku) {
        const existing = db.prepare('SELECT id FROM inventory_items WHERE sku = ?').get(item.sku);
        if (existing) {
          errors.push('SKU already exists in database');
        }
      }

      return {
        index,
        valid: errors.length === 0,
        errors,
        item
      };
    });

    const summary = {
      total: results.length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length
    };

    res.json({ results, summary });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import endpoint
app.post('/api/import', (req, res) => {
  try {
    const { items, filename } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }

    const successful = [];
    const failed = [];

    const insertStmt = db.prepare(`
      INSERT INTO inventory_items (
        sku, name, description, category, uom, unit_cost,
        quantity_on_hand, reorder_point, is_active, lot_tracked,
        tags, first_received_on, discontinued_on, dimensions, vendors
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    items.forEach((item, index) => {
      try {
        const errors = validateItem(item);

        if (errors.length > 0) {
          failed.push({ index, item, errors });
          return;
        }

        // Insert item
        insertStmt.run(
          item.sku,
          item.name?.trim(),
          item.description || null,
          item.category,
          item.uom,
          parseFloat(item.unit_cost),
          parseInt(item.quantity_on_hand) || 0,
          item.reorder_point ? parseInt(item.reorder_point) : null,
          item.is_active !== false ? 1 : 0,
          item.lot_tracked ? 1 : 0,
          item.tags ? JSON.stringify(item.tags) : null,
          item.first_received_on || null,
          item.discontinued_on || null,
          item.dimensions ? JSON.stringify(item.dimensions) : null,
          item.vendors ? JSON.stringify(item.vendors) : null
        );

        successful.push({ index, sku: item.sku });
      } catch (err) {
        failed.push({ index, item, errors: [err.message] });
      }
    });

    // Record import history
    db.prepare(`
      INSERT INTO import_history (filename, total_rows, successful_rows, failed_rows, errors)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      filename || 'unknown',
      items.length,
      successful.length,
      failed.length,
      JSON.stringify(failed.map(f => ({ index: f.index, errors: f.errors })))
    );

    res.json({
      success: true,
      summary: {
        total: items.length,
        successful: successful.length,
        failed: failed.length
      },
      successful,
      failed
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all inventory items
app.get('/api/items', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM inventory_items ORDER BY imported_at DESC').all();
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get import history
app.get('/api/history', (req, res) => {
  try {
    const history = db.prepare('SELECT * FROM import_history ORDER BY imported_at DESC LIMIT 10').all();
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`🔄 Hot reload: enabled (nodemon)`);
});
