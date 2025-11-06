import React from 'react';
import './Header.css';

const Header = ({ activeSection, setActiveSection }) => {
  return (
    <header className="header">
      <h1>D&D Dashboard</h1>
      <nav className="nav">
        <ul>
          <li>
            <button 
              className={activeSection === 'initiative' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveSection('initiative')}
            >
              Initiative Tracker
            </button>
          </li>
          <li>
            <button 
              className={activeSection === 'players' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveSection('players')}
            >
              Player Info
            </button>
          </li>
          <li>
            <button 
              className={activeSection === 'tables' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveSection('tables')}
            >
              Rolling Tables
            </button>
          </li>
          <li>
            <button 
              className={activeSection === 'creator' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveSection('creator')}
            >
              Character Creator
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;