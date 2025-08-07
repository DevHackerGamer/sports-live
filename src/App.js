import './App.css';

function App() {
  return (
    <div className="App">
      <header className="hero">
        <h1>🏆 Sports Live</h1>
        <p>Real-time sports feeds and updates</p>
      </header>
      
      <main className="main-content">
        <section className="features">
          <div className="feature-card">
            <h3>⚽ Live Scores</h3>
            <p>Get real-time scores from your favorite sports</p>
          </div>
          
          <div className="feature-card">
            <h3>📊 Statistics</h3>
            <p>Detailed player and team statistics</p>
          </div>
          
          <div className="feature-card">
            <h3>🔔 Alerts</h3>
            <p>Never miss important game moments</p>
          </div>
        </section>
        
        <section className="coming-soon">
          <h2>Coming Soon</h2>
          <p>We're working on bringing you the best sports experience. Stay tuned!</p>
        </section>
      </main>
    </div>
  );
}

export default App;
