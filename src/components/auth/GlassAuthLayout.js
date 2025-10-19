// src/components/auth/GlassAuthLayout.jsx
import React from 'react';
import '../../styles/GlassAuth.css';

function GlassAuthLayout({ title, tagline, children }) {
  return (
    <div className="glass-auth-container">
      <div className="glass-background">
        <div className="glass-blur-1"></div>
        <div className="glass-blur-2"></div>
        <div className="glass-blur-3"></div>
      </div>
      
      <div className="glass-auth-content">
        <div className="glass-auth-card">
          <div className="glass-card-header">
            <h2>{title}</h2>
            <p>{tagline}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default GlassAuthLayout;