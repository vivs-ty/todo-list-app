import React, { useState } from 'react';
import './App.css';
import Tasks from './components/Tasks';
import Auth from './components/Auth';

function App() {
  const [loggedIn, setLoggedIn] = useState(Boolean(localStorage.getItem('token')));

  const handleLogin = () => {
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setLoggedIn(false);
  };

  return (
    <div className="app-shell">
      <div className="ambient-shape ambient-shape-left" aria-hidden="true" />
      <div className="ambient-shape ambient-shape-right" aria-hidden="true" />
      <main className="app-main">
        <header className="app-header">
          <div className="brand-block">
            <p className="eyebrow">Daily Workflow</p>
            <h1>Task Atlas</h1>
            <p className="subhead">
              Organize fast, focus better, and finish your day with momentum.
            </p>
          </div>
          {loggedIn ? (
            <button className="ghost-button" onClick={handleLogout} type="button">
              Log out
            </button>
          ) : null}
        </header>

        <section className="surface-card">
          {loggedIn ? <Tasks onLogout={handleLogout} /> : <Auth onLogin={handleLogin} />}
        </section>
      </main>
    </div>
  );
}

export default App;
