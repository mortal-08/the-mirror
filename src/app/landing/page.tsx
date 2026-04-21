'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, Gauge, Trophy, Brain, Network, Hexagon, Terminal, Activity, ChevronRight, Quote, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

/* --- IntersectionObserver Hook for Scroll Animations --- */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    )
    
    if (ref.current) {
      observer.observe(ref.current)
    }
    
    return () => observer.disconnect()
  }, [])
  
  return ref
}

/* --- ScrollReveal Wrapper Component --- */
function RevealSection({ children, delay = 0, className = "", style }: { children: React.ReactNode, delay?: number, className?: string, style?: React.CSSProperties }) {
  const ref = useScrollReveal()
  return (
    <div ref={ref} className={`scroll-reveal ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  )
}

/* --- Dynamic Particle Network Background --- */
function ParticleNetwork() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  // Generate deterministic but random-looking dots
  const dots = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: `${15 + Math.random() * 10}s`,
    delay: `${-Math.random() * 10}s`,
    color: i % 3 === 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)',
    size: Math.random() * 4 + 1
  }))

  const orbs = [
    { left: '10%', top: '20%', size: 300, color: 'var(--accent-primary-glow)', delay: '0s' },
    { left: '70%', top: '60%', size: 450, color: 'rgba(37, 99, 235, 0.05)', delay: '-4s' },
    { left: '40%', top: '-10%', size: 500, color: 'var(--accent-primary-glow)', delay: '-2s' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -5, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Quantum Rotating Ring Background Element */}
      <div className="quantum-ring" />
      
      {/* Floating Glowing Orbs */}
      {orbs.map((orb, i) => (
        <div key={`orb-${i}`} className="floating-orb" style={{
          left: orb.left, top: orb.top, 
          width: orb.size, height: orb.size,
          '--color': orb.color,
          animationDelay: orb.delay
        } as React.CSSProperties} />
      ))}

      {/* Tiny Animated Neural Dots */}
      {dots.map((dot) => (
        <div key={`dot-${dot.id}`} className="particle-dot" style={{
          left: dot.left, top: dot.top,
          width: dot.size, height: dot.size,
          '--color': dot.color,
          animationDuration: dot.duration,
          animationDelay: dot.delay
        } as React.CSSProperties} />
      ))}
    </div>
  )
}

const features = [
  {
    title: 'Visual Time Blocks',
    body: 'See exactly where your hours go with beautiful, interactive time blocks that reveal your daily patterns at a glance.',
    icon: Network,
  },
  {
    title: 'Daily Reflection Journal',
    body: 'Capture your thoughts, track your mood, and build a powerful record of growth with guided daily reflections.',
    icon: Gauge,
  },
  {
    title: 'Habit Analytics',
    body: 'Discover your productivity rhythms with deep analytics — track streaks, identify peak hours, and optimize your routine.',
    icon: Brain,
  },
]

const healthFacts = [
  { value: '47%', label: 'Cognitive load reduced when tasks are explicitly tracked.' },
  { value: '2.5x', label: 'Faster achievement of Flow State during isolated time-blocks.' },
  { value: '90min', label: 'The biological maximum limit for uninterrupted ultra-focus.' },
]

const wisdom = [
  { quote: "You act like mortals in all that you fear, and like immortals in all that you desire.", author: "Seneca" },
  { quote: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { quote: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" }
]

export default function LandingPage() {
  const { theme, setTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <div className="landing-page page-shell" style={{ paddingTop: '8vh', backgroundImage: `radial-gradient(ellipse at top, ${isLight ? 'rgba(124,58,237,0.05)' : 'rgba(0, 255, 204, 0.05)'}, transparent 60%)` }}>
      
      <ParticleNetwork />

      {/* Navigation (Optional Top Bar) */}
      <nav style={{ position: 'absolute', top: 0, width: '100%', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 900, letterSpacing: '0.08em' }}>
           <img src="/icon-512.svg" alt="The Mirror" width={22} height={22} />
           The Mirror
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="theme-btn" onClick={() => setTheme(isLight ? 'dark' : 'light')} aria-label="Toggle Theme" style={{ width: 36, height: 36 }}>
            {isLight ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Link href="/login" className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Sign In</Link>
          <Link href="/signup" className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', boxShadow: 'none' }}>Get Started<ArrowRight size={14}/></Link>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <RevealSection className="landing-hero" delay={100} style={{ 
        padding: '4rem 1.25rem 3rem', 
        width: '100%', maxWidth: '900px', margin: '0 auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' 
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          border: '1px solid var(--surface-border-hover)', borderRadius: '999px',
          padding: '0.4rem 0.8rem', marginBottom: '1.5rem',
          fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--accent-primary)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)'
        }}>
          <Sparkles size={12} /> <span>Clarity Through Data</span>
        </div>

        <h1 className="landing-title" style={{ maxWidth: '800px', margin: '0 auto 1.25rem' }}>
          A perfect reflection<br />
          <span>of your time.</span>
        </h1>

        <p className="landing-subtitle" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.15rem)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
          Stop guessing where your day went. Mirror tracks your habits, visualizes your deep work, and gives you clarity on how you spend your hours.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap' }}>
          <Link href="/signup" className="btn-primary" style={{ padding: '0.7rem 1.5rem', fontSize: '0.9rem' }}>
            Get Started <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="btn-secondary" style={{ padding: '0.7rem 1.5rem', fontSize: '0.9rem' }}>
            Sign In
          </Link>
        </div>
      </RevealSection>

      {/* --- FEATURES GRID --- */}
      <RevealSection delay={200} style={{ width: '100%', maxWidth: '1200px', margin: '6rem auto 4rem', padding: '0 2rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '3rem', letterSpacing: '-0.03em' }}>How It Works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {features.map((feat, idx) => {
            const Icon = feat.icon
            return (
              <div key={idx} className="glass" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '12px', background: 'rgba(0, 255, 204, 0.1)', borderRadius: '12px', color: 'var(--accent-primary)' }}>
                    <Icon size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{feat.title}</h3>
                </div>
                <p className="text-secondary" style={{ lineHeight: 1.6, flex: 1 }}>{feat.body}</p>
              </div>
            )
          })}
        </div>
      </RevealSection>

      {/* --- PROTOCOL & HEALTH METRICS --- */}
      <section style={{ width: '100%', padding: '6rem 2rem', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent, rgba(0,255,204,0.02) 20%, rgba(0,255,204,0.02) 80%, transparent)', zIndex: -1}} />
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="grid-2" style={{ alignItems: 'center', gap: '4rem' }}>
            
            <RevealSection delay={100}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>Transforming Chaos<br/>Into <span style={{ color: 'var(--accent-primary)' }}>Clarity</span></h2>
              <p className="text-secondary" style={{ fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
                Replace scattered time with structured blocks. Mirror reveals where your energy goes, so you can reclaim lost hours and build the habits that matter.
              </p>
              <ul className="flex-col gap-md" style={{ listStyle: 'none' }}>
                {healthFacts.map((fact, idx) => (
                  <li key={idx} style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'var(--surface)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-secondary)' }}>{fact.value}</div>
                    <div className="text-sm text-secondary">{fact.label}</div>
                  </li>
                ))}
              </ul>
            </RevealSection>

            <RevealSection delay={300} className="glass-glow" style={{ position: 'relative', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
               {/* Decorative Terminal UI */}
               <div style={{ position: 'absolute', top: '15px', left: '20px', display: 'flex', gap: '8px' }}>
                 <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,0,85,0.5)' }}/>
                 <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,208,0,0.5)' }}/>
                 <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(0,255,204,0.5)' }}/>
               </div>
               
               <div style={{ padding: '2rem', fontFamily: 'var(--font-mono)' }}>
                 <div style={{ color: 'var(--accent-secondary)', marginBottom: '1rem' }}><Terminal size={16} style={{ display: 'inline', marginRight: '8px' }}/> SYSTEM LOG: Neural Sync Initiated</div>
                 <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>] Initializing pomodoro_cycle.exe</div>
                 <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>] Memory loaded: 1440 minutes allocated</div>
                 <div style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>] Blocking external distractions... [OK]</div>
                 
                 <div style={{ borderLeft: '2px solid var(--accent-primary)', paddingLeft: '1rem', margin: '2rem 0' }}>
                   <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>25:00</div>
                   <div style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '0.25rem' }}>Deep Execution Mode Active</div>
                 </div>

                 <div style={{ color: 'var(--accent-tertiary)' }}>] Status: FLOW STATE ATTAINED</div>
               </div>
            </RevealSection>

          </div>
        </div>
      </section>

      {/* --- CAROUSEL / WISDOM MODULE --- */}
      <RevealSection delay={200} style={{ width: '100%', maxWidth: '1000px', margin: '4rem auto 8rem', padding: '0 2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '3rem', color: 'var(--text-secondary)' }}>Words We Live By</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {wisdom.map((item, idx) => (
            <div key={idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '2rem', textAlign: 'left', position: 'relative' }}>
              <Quote size={20} color="var(--accent-primary)" style={{ opacity: 0.3, position: 'absolute', top: '1.5rem', right: '1.5rem' }} />
              <p style={{ fontSize: '1rem', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '1.5rem', fontStyle: 'italic' }}>"{item.quote}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 24, height: 2, background: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{item.author}</span>
              </div>
            </div>
          ))}
        </div>
      </RevealSection>

      {/* --- CALL TO ACTION --- */}
      <RevealSection delay={100} style={{ width: '100%', borderTop: '1px solid var(--surface-border)', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '6rem 2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>Start your journey.</h2>
          <p className="text-secondary" style={{ fontSize: '1.2rem', marginBottom: '3rem' }}>
            Your time is your most valuable asset. See it clearly, manage it wisely, and take control of every hour.
          </p>
          <Link href="/signup" className="btn-primary" style={{ padding: '1.2rem 3rem', fontSize: '1.1rem' }}>
            Get Started Free
          </Link>
          <div style={{ marginTop: '2rem', color: 'var(--text-secondary)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
            Free forever. No credit card required.
          </div>
        </div>
      </RevealSection>

      <footer
        style={{
          width: '100%',
          padding: '2rem 1.25rem 2.5rem',
          borderTop: '1px solid var(--surface-border)',
          background: 'linear-gradient(180deg, transparent, rgba(0, 255, 204, 0.03))',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            textAlign: 'center',
            fontSize: '0.78rem',
            letterSpacing: '0.06em',
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
          }}
        >
          <span>Mirror &copy; 2026 | Harshit</span>
          <span aria-hidden="true" style={{ opacity: 0.5 }}>•</span>
          <a
            href="mailto:harshitr523@gmail.com"
            style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
          >
            harshitr523@gmail.com
          </a>
        </div>
      </footer>

    </div>
  )
}
