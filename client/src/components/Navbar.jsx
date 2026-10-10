import { useState } from 'react';

const Sun = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const Moon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);
const Menu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export default function Navbar({ path, user, theme, onToggleTheme, onLogout }) {
  const [open, setOpen] = useState(false);
  const current = (to) => (path === to ? 'page' : undefined);

  return (
    <header className="nav">
      <div className="nav-inner">
        <a className="brand" href="#/">
          <span className="logo" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          Job Tracker
        </a>

        <button
          type="button"
          className="icon-btn menu-btn"
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(!open)}
        >
          <Menu />
        </button>

        <nav id="main-nav" className={`nav-links${open ? ' open' : ''}`} aria-label="Main" onClick={() => setOpen(false)}>
          <a href="#/" aria-current={current('/')}>Home</a>
          <a href="#/dashboard" aria-current={current('/dashboard')}>Dashboard</a>
        </nav>

        <div className="nav-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
          {user ? (
            <>
              <span className="nav-user">{user.name || user.email}</span>
              <button type="button" className="ghost" onClick={onLogout}>Log out</button>
            </>
          ) : (
            <>
              <a className="btn ghost" href="#/login">Log in</a>
              <a className="btn" href="#/signup">Sign up</a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}