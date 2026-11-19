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

  const handleFile = (selectedFile) => {
    setFile(selectedFile);
    setImportResult(null);

    // Parse CSV
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        console.log('Parsed', results.data.length, 'rows');
        setParsedData(results.data);

        // Validate immediately
        await validateData(results.data, selectedFile.name);
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
                      <th>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation.results.map((result, idx) => (
                      <tr key={idx} className={result.valid ? 'row-valid' : 'row-invalid'}>
                        <td>{idx + 1}</td>
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
