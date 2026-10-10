import { useState } from 'react';
import { api, setToken } from '../api.js';
import ResendVerification from '../components/ResendVerification.jsx';

export default function Auth({ mode, onAuth }) {
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [needsVerify, setNeedsVerify] = useState(false);
  const [sent, setSent] = useState(null); // set after signing up: { email, emailSent }
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setNeedsVerify(false);
    setBusy(true);
    try {
      const name = form.name.trim();
      const credentials = { email: form.email, password: form.password };
      if (isRegister) {
        // The API rejects an empty name, so only send it when the user typed one.
        const res = await api.register({ ...credentials, ...(name ? { name } : {}) });
        setSent({ email: res.email, emailSent: res.emailSent });
        setBusy(false);
        return;
      }
      const { token, user } = await api.login(credentials);
      setToken(token);
      onAuth(user);
    } catch (err) {
      setError(err.message);
      setNeedsVerify(err.code === 'EMAIL_NOT_VERIFIED');
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-wrap">
        <div className="auth">
          <h1>Check your email</h1>
          <p className="muted">
            We sent a verification link to <strong>{sent.email}</strong>. Open it to activate your account.
            The link expires in 24 hours.
          </p>
          {!sent.emailSent && (
            <p className="error">We could not send the email just now. Use the button below to try again.</p>
          )}
          <ResendVerification email={sent.email} />
          <p className="muted switch">Wrong address? <a href="#/signup" onClick={() => setSent(null)}>Start over</a></p>
        </div>
      </div>
    );
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
        {needsVerify && <ResendVerification email={form.email} />}
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