import { useEffect, useState } from 'react';

// ---- tiny hash router: works on any static host with no server config ----
export const getPath = () => window.location.hash.slice(1) || '/';
export const navigate = (to) => { window.location.hash = to; };

export function useRoute() {
  const [path, setPath] = useState(getPath);
  useEffect(() => {
    const onChange = () => { setPath(getPath()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

// ---- light / dark theme ----
// theme-init.js has already set data-theme before React starts.
export function useTheme() {
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('jt_theme', next); } catch { /* storage unavailable */ }
    setTheme(next);
  };
  return [theme, toggle];
}