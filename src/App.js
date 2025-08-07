import logo from './logo.svg';
import './App.css';
import { useState, useEffect } from 'react';

function App() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => setStatus(`ok at ${new Date(data.time).toLocaleTimeString()}`))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div>
      <h1>Welcome to the React App!</h1>
      <p>API status: {status}</p>
    </div>
  );
}

export default App;
