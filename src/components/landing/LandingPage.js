// src/components/landing/LandingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import LandingFooter from './LandingFooter';
import plLogo from '../../assets/pl_logo.jpg';
import laLigaLogo from '../../assets/LaLiga.jpg';
import serieALogo from '../../assets/serie_A.jpg';
import bundesligaLogo from '../../assets/bundesliga.jpg';
import ligue1Logo from '../../assets/LIGUE1.jpg';
import championsLogo from '../../assets/UCL.jpg';
import '../../styles/LandingPage.css';

const LandingPage = () => {
  const features = [
    {
      title: "Live Match Updates",
      description: "Real-time scores, minute-by-minute updates, and live commentary for all major football leagues worldwide.",
      icon: "⚽"
    },
    {
      title: "Player Statistics",
      description: "Comprehensive player data including goals, assists, form, and detailed performance metrics.",
      icon: "📊"
    },
    {
      title: "Team Standings",
      description: "Up-to-date league tables, team form, and tournament progression across all competitions.",
      icon: "🏆"
    },
    {
      title: "Team Information",
      description: "Detailed team profiles, squad information, manager details, and club history for every team.",
      icon: "🔵"
    },
    {
      title: "Football News",
      description: "Latest transfer news, match previews, post-match analysis, and breaking stories from the football world.",
      icon: "📰"
    },
    {
      title: "Personalized Experience",
      description: "Follow your favorite teams and players to get customized updates and notifications.",
      icon: "❤️"
    }
  ];

  const leagues = [
    {
      key: "PL",
      name: "Premier League",
      img: plLogo,
      color: "#331160ff"
    },
    {
      key: "LL",
      name: "La Liga",
      img: laLigaLogo,
      color: "#c8102eff"
    },
    {
      key: "SA",
      name: "Serie A",
      img: serieALogo,
      color: "#0c4491"
    },
    {
      key: "BL",
      name: "Bundesliga",
      img: bundesligaLogo,
      color: "#d71218"
    },
    {
      key: "L1",
      name: "Ligue 1",
      img: ligue1Logo,
      color: "#0055A4"
    },
    {
      key: "UCL",
      name: "Champions League",
      img: championsLogo,
      color: "#272727"
    },
  ];

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h1 className="landing-hero-title">Welcome to SportsLive</h1>
          <p className="landing-hero-subtitle">Your ultimate destination for real-time football updates, comprehensive statistics, and live scores from every major league around the globe.</p>
          <div className="landing-hero-buttons">
            <Link to="/sign-up" className="landing-btn landing-btn-join">
              Join Now
            </Link>
            <Link to="/sign-in" className="landing-btn landing-btn-signin">
              Sign In
            </Link>
          </div>
          <div className="landing-hero-stats">
            <div className="landing-stat">
              <span className="landing-stat-number">50+</span>
              <span className="landing-stat-label">Live Matches</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-number">10+</span>
              <span className="landing-stat-label">Leagues</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-number">100+</span>
              <span className="landing-stat-label">Players</span>
            </div>
          </div>
        </div>
        <div className="landing-scroll-indicator">
          <span>Scroll to explore</span>
          <div className="landing-scroll-arrow"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features">
        <div className="landing-container">
          <h2 className="landing-section-title">Why Choose SportsLive?</h2>
          <p className="landing-section-subtitle">
            Everything you need to stay connected to the world of football in one powerful platform
          </p>
          
          <div className="landing-features-grid">
            {features.map((feature, index) => (
              <div key={index} className="landing-feature-card">
                <div className="landing-feature-icon">{feature.icon}</div>
                <h3 className="landing-feature-title">{feature.title}</h3>
                <p className="landing-feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leagues Coverage */}
      <section className="landing-league-cards">
        <div className="landing-container">
          <h2 className="landing-section-title">Comprehensive League Coverage</h2>
          <p className="landing-section-subtitle">
            Follow all major football leagues with detailed statistics and real-time updates
          </p>
          
          <div className="landing-cards-grid">
            {leagues.map((league, index) => (
              <div className="landing-league-card" key={index}>
                <div className="landing-league-card-content">
                  <div className="landing-league-img-container">
                    <img src={league.img} alt={league.name} className="landing-league-img" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta">
        <div className="landing-container">
          <div className="landing-cta-content">
            <h2 className="landing-cta-title">Ready to Experience Football Like Never Before?</h2>
            <p className="landing-cta-description">
              Join thousands of football enthusiasts who trust SportsLive for their daily dose of football updates, 
              statistics, and in-depth analysis.
            </p>
            <div className="landing-cta-buttons">
              <Link to="/sign-up" className="landing-btn landing-btn-join landing-btn-large">
                Join Now
              </Link>
              <Link to="/sign-in" className="landing-btn landing-btn-signin landing-btn-large">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;