const FEATURES = [
  ['Kanban board', 'Drag applications from Wishlist to Applied, Interview and Offer. Every job has a place.'],
  ['Follow-up reminders', 'Set a follow-up date and get overdue and due-today badges, plus a "Due this week" filter.'],
  ['Notes and links', 'Keep the job posting, applied date, contacts and interview notes on the same card.'],
  ['Live stats', 'See your totals, active applications and interview rate update as you move cards.'],
  ['Private by design', 'Passwords are hashed and every account only ever sees its own applications.'],
  ['Light and dark', 'Switch themes any time. Your choice is remembered on this device.'],
];

const STEPS = [
  ['Add', 'Save a job the moment you find it, even if you have not applied yet.'],
  ['Move', 'Drag the card forward as you apply, interview and hear back.'],
  ['Follow up', 'Never let an application go quiet. Check what is due this week.'],
];

function BoardPreview() {
  return (
    <div className="preview" aria-hidden="true">
      <div className="col applied">
        <h2>Applied <span className="count">2</span></h2>
        <div className="card"><strong>Acme Software</strong><span>Junior Developer</span><span className="badge overdue">Overdue 2d</span></div>
        <div className="card"><strong>Northwind</strong><span>Backend Intern</span><span className="badge soon">Due in 3d</span></div>
      </div>
      <div className="col interview">
        <h2>Interview <span className="count">1</span></h2>
        <div className="card"><strong>Globex</strong><span>Software Engineer</span><span className="badge today">Due today</span></div>
      </div>
      <div className="col offer">
        <h2>Offer <span className="count">1</span></h2>
        <div className="card"><strong>Initech</strong><span>Full-Stack Developer</span></div>
      </div>
    </div>
  );
}

export default function Home({ user }) {
  return (
    <>
      <section className="hero container">
        <div className="hero-text">
          <p className="eyebrow">Job and internship tracker</p>
          <h1>Keep every job application in one place.</h1>
          <p className="lead">
            Track applications, follow-ups and interviews on a simple board, so nothing slips
            through while you search.
          </p>
          <div className="hero-cta">
            {user ? (
              <a className="btn lg" href="#/dashboard">Open dashboard</a>
            ) : (
              <>
                <a className="btn lg" href="#/signup">Get started</a>
                <a className="btn lg ghost" href="#/login">Log in</a>
              </>
            )}
          </div>
        </div>
        <BoardPreview />
      </section>

      <section className="container section" aria-labelledby="features-title">
        <h2 id="features-title" className="section-title">Everything you need to stay on top of your search</h2>
        <div className="features">
          {FEATURES.map(([title, text]) => (
            <article key={title} className="feature">
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container section" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">How it works</h2>
        <ol className="steps">
          {STEPS.map(([title, text], i) => (
            <li key={title}>
              <span className="step-num">{i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container section">
        <div className="cta-band">
          <h2>Ready to organise your job search?</h2>
          <a className="btn lg" href={user ? '#/dashboard' : '#/signup'}>
            {user ? 'Go to your board' : 'Create your account'}
          </a>
        </div>
      </section>

      <footer className="footer container">
        <span>Job Tracker</span>
        <span className="muted">Built with React, Express and PostgreSQL</span>
      </footer>
    </>
  );
}