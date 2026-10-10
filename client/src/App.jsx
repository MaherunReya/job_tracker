import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import { getPath, navigate, useRoute, useTheme } from './hooks.js';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Verify from './pages/Verify.jsx';

export default function App() {
  const path = useRoute();
  const [theme, toggleTheme] = useTheme();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api.me().then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  // Route guards. Read the live hash (not state) so a logout that navigates home isn't overridden.
  useEffect(() => {
    if (!ready) return;
    const now = getPath();
    if (now === '/dashboard' && !user) navigate('/login');
    if ((now === '/login' || now === '/signup') && user) navigate('/dashboard');
  }, [path, user, ready]);

  const onAuth = (u) => { setUser(u); navigate('/dashboard'); };
  const logout = () => { setToken(null); setUser(null); navigate('/'); };

  let page = null;
  if (ready) {
    if (path === '/dashboard') page = user ? <Dashboard user={user} /> : null;
    else if (path === '/login' || path === '/signup') page = user ? null : <Auth key={path} mode={path === '/signup' ? 'register' : 'login'} onAuth={onAuth} />;
    else if (path === '/verify') page = <Verify onAuth={onAuth} />;
    else page = <Home user={user} />;
  }

  return (
    <>
      <Navbar path={path} user={user} theme={theme} onToggleTheme={toggleTheme} onLogout={logout} />
      <main>{page}</main>
    </>
  );
}