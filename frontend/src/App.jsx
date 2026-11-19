import { useState } from 'react'
import Papa from 'papaparse'
import './App.css'

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [validation, setValidation] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [filter, setFilter] = useState('all'); // all, valid, invalid

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const transformFlatCSV = (item) => {
    const transformed = { ...item };

    // Parse flattened dimensions
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

    // Parse flattened vendors
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

      // Clean up flat fields
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
  };

  const autoFixItem = (item) => {
    // First transform flat CSV structure
    const fixed = transformFlatCSV(item);
    const changes = [];

    // Auto-fix SKU: uppercase and trim
    if (fixed.sku && typeof fixed.sku === 'string') {
      const original = fixed.sku;
      fixed.sku = fixed.sku.trim().toUpperCase();
      if (original !== fixed.sku) {
        changes.push(`SKU: "${original}" → "${fixed.sku}"`);
      }
    }

    // Auto-fix name: trim whitespace
    if (fixed.name && typeof fixed.name === 'string') {
      const original = fixed.name;
      fixed.name = fixed.name.trim();
      if (original !== fixed.name && original.length !== fixed.name.length) {
        changes.push(`Name: trimmed whitespace`);
      }
    }

    // Auto-fix category: lowercase to snake_case
    if (fixed.category && typeof fixed.category === 'string') {
      const original = fixed.category;
      fixed.category = fixed.category.trim().toLowerCase().replace(/\s+/g, '_');
      if (original !== fixed.category) {
        changes.push(`Category: "${original}" → "${fixed.category}"`);
      }
    }

    // Auto-fix UOM: uppercase
    if (fixed.uom && typeof fixed.uom === 'string') {
      const original = fixed.uom;
      fixed.uom = fixed.uom.trim().toUpperCase();
      if (original !== fixed.uom) {
        changes.push(`UOM: "${original}" → "${fixed.uom}"`);
      }
    }

    // Auto-fix booleans: parse various formats
    ['is_active', 'lot_tracked'].forEach(field => {
      if (fixed[field] !== undefined && fixed[field] !== null && fixed[field] !== '') {
        const original = fixed[field];
        const str = String(fixed[field]).toLowerCase().trim();

        if (['yes', 'y', 'true', '1', 't'].includes(str)) {
          fixed[field] = true;
          if (original !== true) changes.push(`${field}: "${original}" → true`);
        } else if (['no', 'n', 'false', '0', 'f'].includes(str)) {
          fixed[field] = false;
          if (original !== false) changes.push(`${field}: "${original}" → false`);
        }
      }
    });

    // Auto-fix tags: parse pipe-separated string
    if (fixed.tags && typeof fixed.tags === 'string') {
      const original = fixed.tags;
      fixed.tags = fixed.tags.split('|').map(t => t.trim().toLowerCase()).filter(t => t);
      if (fixed.tags.length > 0) {
        changes.push(`Tags: parsed ${fixed.tags.length} tags`);
      }
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

    return { fixed, changes };
  };

  const handleFile = (selectedFile) => {
    setFile(selectedFile);
    setImportResult(null);

    // Parse CSV
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        console.log('Parsed', results.data.length, 'rows');

        // Auto-fix all items
        const fixedData = results.data.map(item => {
          const { fixed, changes } = autoFixItem(item);
          return { ...fixed, _autoFixes: changes };
        });

        const totalFixes = fixedData.reduce((sum, item) => sum + (item._autoFixes?.length || 0), 0);
        console.log(`Auto-fixed ${totalFixes} issues across ${fixedData.length} rows`);

        setParsedData(fixedData);

        // Validate immediately
        await validateData(fixedData, selectedFile.name);
      },
      error: (error) => {
        console.error('Parse error:', error);
        alert('Error parsing CSV file: ' + error.message);
      }
    });
  };

  const validateData = async (items, filename) => {
    try {
      const response = await fetch(`${API_BASE}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const result = await response.json();
      setValidation(result);
    } catch (error) {
      console.error('Validation error:', error);
      alert('Error validating data: ' + error.message);
    }
  };

  const handleImport = async () => {
    if (!parsedData || !validation) return;

    // Filter out invalid items
    const validItems = validation.results
      .filter(r => r.valid)
      .map(r => r.item);

    if (validItems.length === 0) {
      alert('No valid items to import!');
      return;
    }

    setImporting(true);

    try {
      const response = await fetch(`${API_BASE}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validItems,
          filename: file?.name || 'unknown'
        })
      });

      const result = await response.json();
      setImportResult(result);

      // Reset form
      setParsedData(null);
      setValidation(null);
      setFile(null);
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing data: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setParsedData(null);
    setValidation(null);
    setImportResult(null);
  };

  return (
    <div className="app">
      <header>
        <h1>Inventory Bulk Import</h1>
        <p>Upload CSV files and import inventory items</p>
      </header>

      <div className="container">
        {!parsedData && !importResult && (
          <div
            className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="upload-content">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <h2>Drop CSV file here</h2>
              <p>or click to browse</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                style={{ display: 'none' }}
                id="fileInput"
              />
              <label htmlFor="fileInput" className="btn-primary">
                Choose File
              </label>
            </div>
          </div>
        )}

        {parsedData && validation && (
          <>
            <div className="summary-cards">
              <div className="card summary-card">
                <div className="card-label">Total Rows</div>
                <div className="card-value">{validation.summary.total}</div>
              </div>
              <div className="card summary-card success">
                <div className="card-label">Ready to Import</div>
                <div className="card-value">{validation.summary.valid}</div>
              </div>
              <div className="card summary-card error">
                <div className="card-label">Need Fixing</div>
                <div className="card-value">{validation.summary.invalid}</div>
              </div>
            </div>

            <div className="data-preview">
              <div className="preview-header">
                <h2>Preview Data</h2>
                <div className="preview-actions">
                  <button onClick={reset} className="btn-secondary">
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    className="btn-primary"
                    disabled={importing || validation.summary.valid === 0}
                  >
                    {importing ? 'Importing...' : `Import ${validation.summary.valid} Items`}
                  </button>
                </div>
              </div>

              <div className="filter-tabs">
                <button
                  className={filter === 'all' ? 'active' : ''}
                  onClick={() => setFilter('all')}
                >
                  All Rows ({validation.summary.total})
                </button>
                <button
                  className={filter === 'valid' ? 'active' : ''}
                  onClick={() => setFilter('valid')}
                >
                  Valid Only ({validation.summary.valid})
                </button>
                <button
                  className={filter === 'invalid' ? 'active' : ''}
                  onClick={() => setFilter('invalid')}
                >
                  Needs Fixing ({validation.summary.invalid})
                </button>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Status</th>
                      <th>SKU</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>UOM</th>
                      <th>Unit Cost</th>
                      <th>Quantity</th>
                      <th>Auto-Fixed</th>
                      <th>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation.results
                      .filter(result => {
                        if (filter === 'valid') return result.valid;
                        if (filter === 'invalid') return !result.valid;
                        return true;
                      })
                      .map((result, idx) => (
                      <tr key={result.index} className={result.valid ? 'row-valid' : 'row-invalid'}>
                        <td>{result.index + 1}</td>
                        <td>
                          {result.valid ? (
                            <span className="badge badge-success">✓ Valid</span>
                          ) : (
                            <span className="badge badge-error">✗ Invalid</span>
                          )}
                        </td>
                        <td>{result.item.sku}</td>
                        <td>{result.item.name}</td>
                        <td>{result.item.category}</td>
                        <td>{result.item.uom}</td>
                        <td>{result.item.unit_cost}</td>
                        <td>{result.item.quantity_on_hand || 0}</td>
                        <td>
                          {result.item._autoFixes && result.item._autoFixes.length > 0 && (
                            <div className="fix-list">
                              {result.item._autoFixes.map((fix, i) => (
                                <div key={i} className="fix-item">✓ {fix}</div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          {result.errors.length > 0 && (
                            <div className="error-list">
                              {result.errors.map((err, i) => (
                                <div key={i} className="error-item">{err}</div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {importResult && (
          <div className="import-result">
            <div className="result-header">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <h2>Import Complete!</h2>
            </div>

            <div className="summary-cards">
              <div className="card summary-card">
                <div className="card-label">Total Processed</div>
                <div className="card-value">{importResult.summary.total}</div>
              </div>
              <div className="card summary-card success">
                <div className="card-label">Successfully Imported</div>
                <div className="card-value">{importResult.summary.successful}</div>
              </div>
              <div className="card summary-card error">
                <div className="card-label">Failed</div>
                <div className="card-value">{importResult.summary.failed}</div>
              </div>
            </div>

            {importResult.successful.length > 0 && (
              <div className="success-list">
                <h3>Imported Items</h3>
                <div className="sku-chips">
                  {importResult.successful.map((item, idx) => (
                    <span key={idx} className="sku-chip">{item.sku}</span>
                  ))}
                </div>
              </div>
            )}

            <button onClick={reset} className="btn-primary">
              Import Another File
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
