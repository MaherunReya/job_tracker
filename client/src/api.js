const TOKEN_KEY = 'jt_token';
// Empty in dev (Vite proxies /api) and in docker-compose (nginx proxies /api).
// Set VITE_API_URL=https://your-api.onrender.com when the API lives on another domain (e.g. Vercel + Render).
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  list: (q = '') => request(`/applications${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  create: (body) => request('/applications', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id) => request(`/applications/${id}`, { method: 'DELETE' }),
};
