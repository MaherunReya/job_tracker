import { useEffect, useRef, useState } from 'react';
import { api, setToken } from '../api.js';
import { getQuery } from '../hooks.js';
import ResendVerification from '../components/ResendVerification.jsx';

export default function Verify({ onAuth }) {
  const [error, setError] = useState('');
  const started = useRef(false); // links are single-use, so never call the API twice

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = getQuery().get('token');
    if (!token) {
      setError('This verification link is incomplete.');
      return;
    }
    api.verifyEmail({ token })
      .then(({ token: jwt, user }) => { setToken(jwt); onAuth(user); }) // verified: log in and open the dashboard
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="auth-wrap">
      <div className="auth">
        {error ? (
          <>
            <h1>Link not valid</h1>
            <p className="error" role="alert">{error}</p>
            <p className="muted">Request a new link and try again. Links expire after 24 hours and work once.</p>
            <ResendVerification />
            <p className="muted switch"><a href="#/login">Back to log in</a></p>
          </>
        ) : (
          <>
            <h1>Verifying your email</h1>
            <p className="muted" role="status">One moment...</p>
          </>
        )}
      </div>
    </div>
  );
}