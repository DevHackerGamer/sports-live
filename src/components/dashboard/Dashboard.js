import { useState } from 'react';
import { UserButton } from '@clerk/clerk-react';

function Dashboard() {
  const [joke, setJoke] = useState('');
  const [jokeSource, setJokeSource] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchJoke = async () => {
    setLoading(true);
    try {
      // First try our API endpoint (works on Vercel)
      const response = await fetch('/api/joke');
      
      if (!response.ok) {
        throw new Error(`API endpoint error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setJoke(data.joke);
      setJokeSource(data.source || 'api');
    } catch (error) {
      console.log('API endpoint failed, trying direct API...', error.message);
      
      try {
        // Fallback to direct API call (works locally)
        const directResponse = await fetch('https://icanhazdadjoke.com/', {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Sports Live App (https://github.com/DevHackerGamer/sports-live)'
          }
        });
        
        if (!directResponse.ok) {
          throw new Error(`Direct API error! status: ${directResponse.status}`);
        }
        
        const directData = await directResponse.json();
        setJoke(directData.joke);
        setJokeSource('icanhazdadjoke.com (direct)');
      } catch (fallbackError) {
        console.log('Direct API also failed, using local jokes:', fallbackError.message);
        // Final fallback to local jokes
        const localJokes = [
          "Why don't scientists trust atoms? Because they make up everything!",
          "I told my wife she was drawing her eyebrows too high. She looked surprised.",
          "Why don't skeletons fight each other? They don't have the guts.",
          "What do you call a fake noodle? An impasta!"
        ];
        const randomJoke = localJokes[Math.floor(Math.random() * localJokes.length)];
        setJoke(randomJoke);
        setJokeSource('local fallback');
      }
    }
    setLoading(false);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Sports Live</h1>
            <p>Real-time sports feeds and updates</p>
          </div>
          <div className="user-menu">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>
      
      <main className="dashboard-main">
        <section className="api-test">
          <h2>API Test</h2>
          <button 
            onClick={fetchJoke} 
            disabled={loading}
            className="joke-button"
          >
            {loading ? 'Loading...' : 'Get Dad Joke'}
          </button>
          {joke && (
            <div className="joke-display">
              <p>"{joke}"</p>
              <small>Source: {jokeSource}</small>
            </div>
          )}
        </section>

        <section className="features">
          <div className="feature-card">
            <h3>Live Scores</h3>
            <p>Get real-time scores from your favorite sports</p>
          </div>
          
          <div className="feature-card">
            <h3>Statistics</h3>
            <p>Detailed player and team statistics</p>
          </div>
          
          <div className="feature-card">
            <h3>Alerts</h3>
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

export default Dashboard;
