import Link from 'next/link'
import { ArrowRight, Sparkles, Orbit, Gauge, Trophy, Timer, ShieldCheck, Brain } from 'lucide-react'

const highlights = [
  {
    title: 'Precision Tracking',
    body: 'Track work, focus, and breaks with a timeline that feels instant.',
    icon: Timer,
  },
  {
    title: 'Goal Intelligence',
    body: 'Daily and weekly progress visuals surface where your hours actually go.',
    icon: Gauge,
  },
  {
    title: 'Momentum Loops',
    body: 'Pomodoro cycles and category analytics keep energy high and friction low.',
    icon: Brain,
  },
]

const stats = [
  { value: '10h', label: 'Default daily target' },
  { value: '99.9%', label: 'Session reliability' },
  { value: '< 1s', label: 'Page transition feel' },
]

export default function LandingPage() {
  return (
    <div className="landing-page page-shell">
      <div className="landing-grid" aria-hidden="true" />
      <div className="landing-aura landing-aura-1" aria-hidden="true" />
      <div className="landing-aura landing-aura-2" aria-hidden="true" />

      <section className="landing-hero reveal-up" style={{ ['--reveal-delay' as string]: '30ms' }}>
        <div className="landing-pill">
          <Sparkles size={14} />
          Built for elite execution
        </div>

        <h1 className="landing-title">
          The Mirror turns your time into
          <span> competitive clarity.</span>
        </h1>

        <p className="landing-subtitle">
          A cinematic time intelligence workspace for builders, students, and high-performers who want
          less noise and more signal.
        </p>

        <div className="landing-cta-row">
          <Link href="/signup" className="btn-primary landing-cta-primary">
            Start Free
            <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="btn-secondary landing-cta-secondary">
            I already have an account
          </Link>
        </div>
      </section>

      <section className="landing-stats reveal-up" style={{ ['--reveal-delay' as string]: '120ms' }}>
        {stats.map((stat) => (
          <div className="landing-stat-card" key={stat.label}>
            <div className="landing-stat-value">{stat.value}</div>
            <div className="landing-stat-label">{stat.label}</div>
          </div>
        ))}
      </section>

      <section className="landing-showcase reveal-up" style={{ ['--reveal-delay' as string]: '200ms' }}>
        <div className="landing-showcase-copy">
          <h2>Flow-state UX, zero drag</h2>
          <p>
            Every screen is built with fast transitions, layered depth, and meaningful animation. The
            interface reacts like an instrument, not a form.
          </p>
          <ul className="landing-feature-list">
            <li>
              <ShieldCheck size={16} />
              Secure auth with resilient database connection handling
            </li>
            <li>
              <Orbit size={16} />
              Smooth section choreography with staggered reveals
            </li>
            <li>
              <Trophy size={16} />
              Insight dashboards tuned for sustained momentum
            </li>
          </ul>
        </div>

        <div className="landing-showcase-panel">
          <div className="landing-panel-header">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
            <p>The Mirror Live Surface</p>
          </div>
          <div className="landing-panel-body">
            {highlights.map((item, idx) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="landing-highlight" style={{ ['--item-delay' as string]: `${idx * 90}ms` }}>
                  <div className="landing-highlight-icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="landing-final reveal-up" style={{ ['--reveal-delay' as string]: '260ms' }}>
        <h2>Ready to run your day like a system?</h2>
        <p>Join The Mirror and make every hour visible, measurable, and intentional.</p>
        <div className="landing-cta-row">
          <Link href="/signup" className="btn-primary landing-cta-primary">
            Create Account
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  )
}
