import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Pass `email` to resend to a known address; leave it out to let the user type one.
export default function ResendVerification({ email: known = '' }) {
  const [email, setEmail] = useState(known);
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [message, setMessage] = useState('');

  // Re-enable the button after 30 seconds (the server also enforces a cooldown).
  useEffect(() => {
    if (status !== 'sent') return undefined;
    const t = setTimeout(() => setStatus('idle'), 30000);
    return () => clearTimeout(t);
  }, [status]);

  async function submit(e) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await api.resendVerification({ email });
      setMessage(res.message);
      setStatus('sent');
    } catch (err) {
      setMessage(err.message);
      setStatus('error');
    }
  }

  return (
    <form className="resend" onSubmit={submit}>
      {!known && (
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
      )}
      <button type="submit" className="ghost" disabled={status === 'sending' || status === 'sent'}>
        {status === 'sending' ? 'Sending...' : 'Resend verification email'}
      </button>
      {message && (
        <p className={status === 'error' ? 'error' : 'muted'} role="status">{message}</p>
      )}
    </form>
  );
}