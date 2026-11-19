import { useState, useEffect } from 'react'
import './App.css'

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/data`);
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Starter Template</h1>
        <p>React + Node.js + Express + SQLite</p>
      </header>

      <div className="container">
        <div className="card">
          <h2>Welcome</h2>
          <p>This is a clean starter template ready for development.</p>

          <button onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Test API Connection'}
          </button>

          {data && (
            <div className="result">
              <p><strong>API Response:</strong></p>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
