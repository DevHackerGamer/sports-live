// components/AboutUs/AboutUs.js
import React from 'react';

const AboutUs = ({ setShowAboutUs, setActiveTab }) => {
  return (
    <div className="about-us-container">
      <div className="container">
        <h2>About Sports Live</h2>
        <div className="about-content">
          <p>Sports Live is the premier destination for football enthusiasts who want real-time updates, comprehensive statistics, and in-depth coverage of all major football leagues around the world.</p>
          <h3>Our Mission</h3>
          <p>To provide football fans with the most accurate, timely, and comprehensive football data and match coverage in an intuitive and engaging platform.</p>
          <h3>What We Offer</h3>
          <ul>
            <li>Real-time match updates and live scores</li>
            <li>Detailed player and team statistics</li>
            <li>League standings and tournament progress</li>
            <li>Personalized favorites system to follow your preferred teams</li>
            <li>Comprehensive coverage of Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and European competitions</li>
          </ul>
          <h3>Our Team</h3>
          <p>We are a passionate group of football enthusiasts, data analysts, and developers dedicated to creating the best football experience for fans worldwide.</p>

          <h3>Contact Us</h3>
          <p>Have questions or feedback? Reach out to us at support@sportslive.com</p>
        </div>
        <button 
          className="btn btn-secondary mt-3" 
          onClick={() => {
            setShowAboutUs(false);
            setActiveTab('home');
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AboutUs;