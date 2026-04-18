import Link from 'next/link'
import { ArrowRight, Sparkles, Orbit, Gauge, Trophy, Timer, ShieldCheck, Brain, Network, Hexagon } from 'lucide-react'

const highlights = [
  {
    title: 'Precision Data Network',
    body: 'Hyper-responsive tracking that updates instantly across the global node cluster.',
    icon: Network,
  },
  {
    title: 'Live Quantum Analytics',
    body: 'Visualize exactly where your biological energy flows through daily momentum graphs.',
    icon: Gauge,
  },
  {
    title: 'Deep Focus Protocol',
    body: 'Sustained cognitive momentum driven by algorithmic timer cycles.',
    icon: Brain,
  },
]

const stats = [
  { value: '10h', label: 'Default Node Target' },
  { value: '99.9%', label: 'Uptime Reliability' },
  { value: '< 1s', label: 'Neural Sync Feel' },
]

export default function LandingPage() {
  return (
    <div className="landing-page page-shell">
      {/* 3D Core representation */}
      <div className="landing-3d-orb" aria-hidden="true" />
      
      <section className="landing-hero reveal-up" style={{ '--reveal-delay': '100ms' } as React.CSSProperties}>
        <div style={{
          width: 'fit-content',
          margin: '0 auto 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          border: '1px solid var(--accent-secondary)',
          borderRadius: '999px',
          padding: '0.5rem 1rem',
          fontSize: '0.75rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--accent-secondary)',
          background: 'rgba(0,240,255,0.05)',
          boxShadow: '0 0 20px rgba(0,240,255,0.2)'
        }}>
          <Sparkles size={14} />
          <span>Systems Operational</span>
        </div>

        <h1 className="landing-title">
          Data Infrastructure For<br />
          <span> Elite Execution.</span>
        </h1>

        <p className="landing-subtitle">
          Turn your biological time into an indexable, measurable, and highly refined database. Designed for high-performers tracking momentum at scale.
        </p>

        <div className="flex-row" style={{ justifyContent: 'center', gap: '1rem', marginTop: '2.5rem' }}>
          <Link href="/signup" className="btn-primary" style={{ padding: '1.2rem 2.5rem', fontSize: '1.1rem' }}>
            Initialize Core
            <ArrowRight size={18} />
          </Link>
          <Link href="/login" className="btn-secondary" style={{ padding: '1.2rem 2.5rem', fontSize: '1.1rem' }}>
            Sync Account
          </Link>
        </div>
      </section>

      <section className="reveal-up" style={{ width: '100%', maxWidth: '1000px', margin: '4rem auto 0', '--reveal-delay': '300ms' } as React.CSSProperties}>
        <div className="grid-2">
          {/* Left Panel */}
          <div className="glass-glow flex-col gap-lg" style={{ padding: '3rem' }}>
            <h2>Flow-state UX, zero drag.</h2>
            <p className="text-secondary" style={{ lineHeight: 1.6, fontSize: '1.1rem' }}>
              Every screen acts as a neural terminal. Fast transitions, layered structural depth, and profound visual feedback. The interface reacts like an instrument.
            </p>
            <ul className="flex-col gap-md mt-sm" style={{ listStyle: 'none' }}>
              <li style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <ShieldCheck size={20} color="var(--accent-secondary)" />
                <span className="text-secondary">Quantum-encrypted auth clusters</span>
              </li>
              <li style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Orbit size={20} color="var(--accent-secondary)" />
                <span className="text-secondary">Choreographed transition layers</span>
              </li>
              <li style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Hexagon size={20} color="var(--accent-secondary)" />
                <span className="text-secondary">Holographic data visualization</span>
              </li>
            </ul>
          </div>
          
          {/* Right Panel */}
          <div className="glass flex-col gap-md">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-secondary)', boxShadow: '0 0 10px var(--accent-secondary)' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
              <span className="text-secondary text-xs" style={{ marginLeft: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Live Terminal</span>
            </div>
            {highlights.map((item, idx) => {
              const Icon = item.icon
              return (
                <div key={idx} style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ background: 'rgba(143, 0, 255, 0.1)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(143, 0, 255, 0.3)', color: 'var(--accent-primary)', alignSelf: 'flex-start' }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>{item.title}</h3>
                    <p className="text-secondary text-sm" style={{ lineHeight: 1.5 }}>{item.body}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '1.5rem' }}>
          {stats.map((stat, idx) => (
            <div key={idx} className="glass" style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-mono)', background: 'linear-gradient(180deg, #fff, #a89bb8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent-secondary)', marginTop: '0.5rem' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-glow reveal-up flex-col" style={{ width: '100%', maxWidth: '1000px', margin: '4rem auto', alignItems: 'center', textAlign: 'center', padding: '4rem 2rem', '--reveal-delay': '500ms' } as React.CSSProperties}>
        <h2 style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>Ready to synchronize with the network?</h2>
        <p className="text-secondary" style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Join the system and make every second measurable and intentional.</p>
        <Link href="/signup" className="btn-primary" style={{ padding: '1rem 3rem' }}>
          Connect Node
          <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  )
}
