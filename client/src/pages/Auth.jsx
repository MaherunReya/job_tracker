import { useState } from 'react';
import { api, setToken } from '../api.js';

export default function Auth({ mode, onAuth }) {
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const name = form.name.trim();
      const credentials = { email: form.email, password: form.password };
      // The API rejects an empty name, so only send it when the user typed one.
      const body = isRegister ? { ...credentials, ...(name ? { name } : {}) } : credentials;
      const { token, user } = await api[mode](body);
      setToken(token);
      onAuth(user);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth" onSubmit={submit}>
        <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">
          {isRegister ? 'Start tracking your applications in under a minute.' : 'Log in to see your board.'}
        </p>
        {isRegister && (
          <label>Name (optional)
            <input value={form.name} onChange={set('name')} autoComplete="name" />
          </label>
        )}
        <label>Email
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </label>
        <label>Password
          <input
            type="password"
            placeholder={isRegister ? '8+ characters' : ''}
            value={form.password}
            onChange={set('password')}
            required
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait...' : isRegister ? 'Create account' : 'Log in'}
        </button>
        <p className="muted switch">
          {isRegister ? 'Already have an account? ' : 'New here? '}
          <a href={isRegister ? '#/login' : '#/signup'}>{isRegister ? 'Log in' : 'Sign up'}</a>
        </p>
      </form>
    </div>
  );
}