const Papa = require('papaparse');
const fs = require('fs');

const csv = fs.readFileSync('./project-files/items_test_mix.csv', 'utf-8');

function transformFlatCSV(item) {
  const transformed = { ...item };

  // Parse dimensions
  if (item.length || item.width || item.height) {
    transformed.dimensions = {
      length: parseFloat(item.length),
      width: parseFloat(item.width),
      height: parseFloat(item.height),
      unit: item.dimension_unit || 'cm'
    };
    delete transformed.length;
    delete transformed.width;
    delete transformed.height;
    delete transformed.dimension_unit;
  }

  // Parse vendors
  const vendors = [];
  for (let i = 1; i <= 3; i++) {
    const vendorName = item[`vendor_${i}_name`];
    const unitCost = item[`vendor_${i}_unit_cost`];

    if (vendorName && unitCost) {
      const vendor = {
        vendor_name: vendorName,
        unit_cost: parseFloat(unitCost)
      };

      if (item[`vendor_${i}_sku`]) vendor.vendor_sku = item[`vendor_${i}_sku`];
      if (item[`vendor_${i}_lead_time_days`]) vendor.lead_time_days = parseInt(item[`vendor_${i}_lead_time_days`]);
      if (item[`vendor_${i}_preferred`]) vendor.is_preferred = item[`vendor_${i}_preferred`] === 'true' || item[`vendor_${i}_preferred`] === true;

      vendors.push(vendor);
    }

    delete transformed[`vendor_${i}_name`];
    delete transformed[`vendor_${i}_sku`];
    delete transformed[`vendor_${i}_unit_cost`];
    delete transformed[`vendor_${i}_lead_time_days`];
    delete transformed[`vendor_${i}_preferred`];
  }

  if (vendors.length > 0) {
    transformed.vendors = vendors;
  }

  return transformed;
}

function autoFixItem(item) {
  const fixed = transformFlatCSV(item);

  // Auto-fix SKU
  if (fixed.sku && typeof fixed.sku === 'string') {
    fixed.sku = fixed.sku.trim().toUpperCase();
  }

  // Auto-fix name
  if (fixed.name && typeof fixed.name === 'string') {
    fixed.name = fixed.name.trim();
  }

  // Auto-fix category
  if (fixed.category && typeof fixed.category === 'string') {
    fixed.category = fixed.category.trim().toLowerCase().replace(/\s+/g, '_');
  }

  // Auto-fix UOM
  if (fixed.uom && typeof fixed.uom === 'string') {
    fixed.uom = fixed.uom.trim().toUpperCase();
  }

  // Auto-fix booleans
  ['is_active', 'lot_tracked'].forEach(field => {
    if (fixed[field] !== undefined && fixed[field] !== null && fixed[field] !== '') {
      const str = String(fixed[field]).toLowerCase().trim();
      if (['yes', 'y', 'true', '1', 't'].includes(str)) {
        fixed[field] = true;
      } else if (['no', 'n', 'false', '0', 'f'].includes(str)) {
        fixed[field] = false;
      }
    }
  });

  // Auto-fix tags
  if (fixed.tags && typeof fixed.tags === 'string') {
    fixed.tags = fixed.tags.split('|').map(t => t.trim().toLowerCase()).filter(t => t);
  }

  // Set defaults
  if (!fixed.quantity_on_hand || fixed.quantity_on_hand === '') {
    fixed.quantity_on_hand = 0;
  }
  if (fixed.is_active === undefined || fixed.is_active === null || fixed.is_active === '') {
    fixed.is_active = true;
  }
  if (fixed.lot_tracked === undefined || fixed.lot_tracked === null || fixed.lot_tracked === '') {
    fixed.lot_tracked = false;
  }

  return fixed;
}

Papa.parse(csv, {
  header: true,
  skipEmptyLines: true,
  complete: async (results) => {
    console.log('Processing', results.data.length, 'rows\n');

    const fixedData = results.data.map((item, idx) => {
      const fixed = autoFixItem(item);
      return { ...fixed, _rowNum: idx + 1 };
    });

    // Send to validation endpoint
    const response = await fetch('http://localhost:3001/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: fixedData })
    });

    const validation = await response.json();

    console.log('=== VALIDATION RESULTS ===');
    console.log('Total:', validation.summary.total);
    console.log('Valid:', validation.summary.valid);
    console.log('Invalid:', validation.summary.invalid);
    console.log('\n=== INVALID ROWS ===');

    validation.results.filter(r => !r.valid).forEach(result => {
      const sku = result.item.sku || '(no SKU)';
      const name = result.item.name || '(no name)';
      console.log(`\nRow ${result.item._rowNum}: ${sku} - ${name}`);
      result.errors.forEach(err => console.log('  ❌', err));
    });

    console.log('\n=== VALID ROWS ===');
    validation.results.filter(r => r.valid).forEach(result => {
      console.log(`Row ${result.item._rowNum}: ${result.item.sku} - ${result.item.name}`);
    });
  }
});
