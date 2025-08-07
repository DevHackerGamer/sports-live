export default async function handler(req, res) {
  try {
    // Fetch a random dad joke from the API
    const response = await fetch('https://icanhazdadjoke.com/', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Sports Live App (https://github.com/DevHackerGamer/sports-live)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    res.status(200).json({ 
      joke: data.joke,
      id: data.id,
      timestamp: new Date().toISOString(),
      source: 'icanhazdadjoke.com'
    });
  } catch (error) {
    // Fallback to local jokes if the API is down
    const fallbackJokes = [
      "Why don't scientists trust atoms? Because they make up everything!",
      "I told my wife she was drawing her eyebrows too high. She looked surprised.",
      "Why don't skeletons fight each other? They don't have the guts.",
      "What do you call a fake noodle? An impasta!",
      "Why did the scarecrow win an award? He was outstanding in his field!",
      "I'm reading a book about anti-gravity. It's impossible to put down!",
      "Why don't eggs tell jokes? They'd crack each other up!",
      "What do you call a bear with no teeth? A gummy bear!",
      "Why did the math book look so sad? Because it had too many problems!",
      "What's the best thing about Switzerland? I don't know, but the flag is a big plus!"
    ];
    
    const randomJoke = fallbackJokes[Math.floor(Math.random() * fallbackJokes.length)];
    
    res.status(200).json({ 
      joke: randomJoke,
      id: 'fallback',
      timestamp: new Date().toISOString(),
      source: 'fallback',
      error: error.message
    });
  }
}
