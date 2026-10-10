import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const STATUSES = ['wishlist', 'applied', 'interview', 'offer', 'rejected'];
const LABELS = { wishlist: 'Wishlist', applied: 'Applied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected' };

const formatDate = (d) =>
  new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

// --- follow-up dates (all in the user's local time, as YYYY-MM-DD strings) ---
const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return toISO(d); };
const daysUntil = (iso) =>
  Math.round((new Date(`${iso}T00:00:00`) - new Date(`${toISO(new Date())}T00:00:00`)) / 86400000);
const plural = (n) => `${n} day${n === 1 ? '' : 's'}`;

// Offers and rejections are finished, so they never need a follow-up.
function followUpInfo(a) {
  if (!a.follow_up_date || a.status === 'offer' || a.status === 'rejected') return null;
  const n = daysUntil(a.follow_up_date.slice(0, 10));
  if (n < 0) return { n, text: `Overdue by ${plural(-n)}`, tone: 'overdue' };
  if (n === 0) return { n, text: 'Follow up today', tone: 'today' };
  if (n <= 7) return { n, text: `Follow up in ${plural(n)}`, tone: 'soon' };
  return { n, text: `Follow up ${formatDate(a.follow_up_date)}`, tone: 'later' };
}

// Only render links that are http(s); never trust a stored URL as an href.
const isSafeUrl = (u) => /^https?:\/\//i.test(u || '');

function AddForm({ onAdd }) {
  const empty = { company: '', role: '', status: 'wishlist' };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await onAdd(form);
      setForm(empty);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="add" onSubmit={submit}>
      <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
      <input placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required />
      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} aria-label="Status">
        {STATUSES.map((s) => <option key={s} value={s}>{LABELS[s]}</option>)}
      </select>
      <button type="submit">Add application</button>
      {error && <span className="error">{error}</span>}
    </form>
  );
}

function EditModal({ app, onSave, onClose }) {
  const ref = useRef(null);
  const [form, setForm] = useState({
    company: app.company,
    role: app.role,
    status: app.status,
    url: app.url || '',
    applied_date: app.applied_date ? app.applied_date.slice(0, 10) : '',
    follow_up_date: app.follow_up_date ? app.follow_up_date.slice(0, 10) : '',
    notes: app.notes || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Native <dialog>: gives focus trapping and Esc-to-close for free.
  useEffect(() => { ref.current.showModal(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave(app.id, {
        company: form.company.trim(),
        role: form.role.trim(),
        status: form.status,
        url: form.url.trim() || null,
        applied_date: form.applied_date || null,
        follow_up_date: form.follow_up_date || null,
        notes: form.notes.trim() || null,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }} // click on the backdrop
    >
      <form onSubmit={submit}>
        <h2>Edit application</h2>
        <label>Company
          <input value={form.company} onChange={set('company')} required />
        </label>
        <label>Role
          <input value={form.role} onChange={set('role')} required />
        </label>
        <div className="two">
          <label>Status
            <select value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => <option key={s} value={s}>{LABELS[s]}</option>)}
            </select>
          </label>
          <label>Applied date
            <input type="date" value={form.applied_date} onChange={set('applied_date')} />
          </label>
        </div>
        <div className="followup">
          <label>Follow-up date
            <input type="date" value={form.follow_up_date} onChange={set('follow_up_date')} />
          </label>
          <div className="quick">
            <button type="button" className="ghost" onClick={() => setForm({ ...form, follow_up_date: addDays(3) })}>+3 days</button>
            <button type="button" className="ghost" onClick={() => setForm({ ...form, follow_up_date: addDays(7) })}>+1 week</button>
            <button type="button" className="ghost" onClick={() => setForm({ ...form, follow_up_date: '' })}>Clear</button>
          </div>
        </div>
        <label>Job posting URL
          <input type="url" placeholder="https://" value={form.url} onChange={set('url')} />
        </label>
        <label>Notes
          <textarea rows="5" placeholder="Contacts, interview dates, salary, questions to ask" value={form.notes} onChange={set('notes')} />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
        </div>
      </form>
    </dialog>
  );
}

function Stats({ apps }) {
  const count = (...statuses) => apps.filter((a) => statuses.includes(a.status)).length;
  const sent = apps.length - count('wishlist'); // everything that has left the wishlist
  const interviews = count('interview', 'offer');
  const rate = sent > 0 ? `${Math.round((interviews / sent) * 100)}%` : '-';

  const items = [
    ['Total', apps.length],
    ['Active', count('wishlist', 'applied', 'interview')],
    ['Interviews', interviews],
    ['Offers', count('offer')],
    ['Interview rate', rate],
  ];

  return (
    <dl className="stats">
      {items.map(([label, value]) => (
        <div key={label} className="stat">
          <dd>{value}</dd>
          <dt>{label}</dt>
        </div>
      ))}
    </dl>
  );
}

export default function Dashboard({ user }) {
  const [apps, setApps] = useState([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [dueOnly, setDueOnly] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [overStatus, setOverStatus] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.list().then(setApps).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const add = async (data) => { await api.create(data); await load(); };
  // Optimistic: the card jumps columns instantly; if the server fails we roll back.
  const move = async (id, status) => {
    const previous = apps;
    setApps(apps.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      await api.update(id, { status });
      await load();
    } catch (err) {
      setApps(previous);
      setError(err.message);
    }
  };
  const remove = async (id) => { await api.remove(id); await load(); };
  const save = async (id, data) => { await api.update(id, data); setEditing(null); await load(); };

  // "Due" = needs action within the next 7 days, including anything overdue.
  const isDue = (a) => { const info = followUpInfo(a); return info !== null && info.n <= 7; };
  const dueCount = apps.filter(isDue).length;
  const q = search.trim().toLowerCase();
  const matches = (a) => !q || a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
  const visible = apps.filter((a) => matches(a) && (!dueOnly || isDue(a)));

  return (
    <div className="board-page container">
      <header className="page-head">
        <h1>Dashboard</h1>
        <p className="muted">{user?.name ? `Welcome back, ${user.name}.` : 'Welcome back.'}</p>
      </header>
      <Stats apps={apps} />
      <AddForm onAdd={add} />
      <div className="toolbar">
        <input className="search" placeholder="Search company or role" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button
          type="button"
          className={`chip${dueOnly ? ' on' : ''}`}
          aria-pressed={dueOnly}
          onClick={() => setDueOnly(!dueOnly)}
        >
          Due this week <span className="count">{dueCount}</span>
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="board">
        {STATUSES.map((status) => {
          const items = visible.filter((a) => a.status === status);
          return (
            <section
              key={status}
              className={`col ${status}${overStatus === status ? ' over' : ''}`}
              onDragOver={(e) => {
                if (dragId == null) return;
                e.preventDefault(); // required, otherwise the browser refuses the drop
                e.dataTransfer.dropEffect = 'move';
                setOverStatus(status);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setOverStatus(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = Number(e.dataTransfer.getData('text/plain'));
                const dropped = apps.find((a) => a.id === id);
                setDragId(null);
                setOverStatus(null);
                if (dropped && dropped.status !== status) move(id, status);
              }}
            >
              <h2>{LABELS[status]} <span className="count">{items.length}</span></h2>
              {items.length === 0 && <p className="empty muted">Nothing here yet.</p>}
              {items.map((a) => (
                <article
                  key={a.id}
                  className={`card${dragId === a.id ? ' dragging' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(a.id));
                    e.dataTransfer.effectAllowed = 'move';
                    setDragId(a.id);
                  }}
                  onDragEnd={() => { setDragId(null); setOverStatus(null); }}
                >
                  <strong>{a.company}</strong>
                  <span>{a.role}</span>
                  {a.applied_date && <span className="meta">Applied {formatDate(a.applied_date)}</span>}
                  {(() => {
                    const info = followUpInfo(a);
                    return info && <span className={`badge ${info.tone}`}>{info.text}</span>;
                  })()}
                  {a.notes && <p className="notes">{a.notes}</p>}
                  {isSafeUrl(a.url) && (
                    <a href={a.url} target="_blank" rel="noopener noreferrer">View posting</a>
                  )}
                  <div className="row">
                    <select value={a.status} onChange={(e) => move(a.id, e.target.value)} aria-label="Change status">
                      {STATUSES.map((s) => <option key={s} value={s}>{LABELS[s]}</option>)}
                    </select>
                    <div>
                      <button className="link" onClick={() => setEditing(a)}>Edit</button>
                      <button className="link danger" onClick={() => remove(a.id)}>Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          );
        })}
      </div>
      {editing && <EditModal app={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}