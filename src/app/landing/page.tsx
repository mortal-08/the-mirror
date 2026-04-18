'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, Orbit, Gauge, Trophy, Brain, Network, Hexagon, Terminal, Activity, ChevronRight, Quote } from 'lucide-react'

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
    color: i % 3 === 0 ? 'rgba(0,255,204,0.8)' : 'rgba(255,255,255,0.4)',
    size: Math.random() * 4 + 1
  }))

  const orbs = [
    { left: '10%', top: '20%', size: 300, color: 'rgba(0,255,204,0.03)', delay: '0s' },
    { left: '70%', top: '60%', size: 450, color: 'rgba(0,136,255,0.03)', delay: '-4s' },
    { left: '40%', top: '-10%', size: 500, color: 'rgba(0,255,204,0.02)', delay: '-2s' },
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
    title: 'Open Protocol Sync',
    body: 'Your temporal data belongs to you. Transparent pipelines ensure complete tracking logic.',
    icon: Network,
  },
  {
    title: 'Neural Velocity Tracking',
    body: 'Convert unstructured working hours into a structured, measurable database of cognitive velocity.',
    icon: Gauge,
  },
  {
    title: 'Deep Execution Modes',
    body: 'Algorithmic 25/5 focus cycles engineered to trigger and sustain extreme flow states.',
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
  return (
    <div className="landing-page page-shell" style={{ paddingTop: '8vh', backgroundImage: 'radial-gradient(ellipse at top, rgba(0, 255, 204, 0.05), transparent 60%)' }}>
      
      <ParticleNetwork />

      {/* Navigation (Optional Top Bar) */}
      <nav style={{ position: 'absolute', top: 0, width: '100%', padding: '1.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 900, color: '#fff', letterSpacing: '0.1em' }}>
           <Orbit size={24} color="var(--accent-primary)" />
           Q-MIRROR
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/login" className="btn-secondary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}>Access Data</Link>
          <Link href="/signup" className="btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem', boxShadow: 'none' }}>Get Started <ArrowRight size={16}/></Link>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <RevealSection className="landing-hero" delay={100} style={{ 
        padding: '6rem 2rem 4rem', 
        width: '100%', maxWidth: '1000px', margin: '0 auto', /* FIX: Forces center alignment */
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' 
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          border: '1px solid rgba(0, 255, 204, 0.3)',
          borderRadius: '999px',
          padding: '0.5rem 1rem',
          marginBottom: '2rem',
          fontSize: '0.75rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--accent-primary)',
          background: 'rgba(0, 255, 204, 0.05)',
          boxShadow: '0 0 20px rgba(0, 255, 204, 0.1)'
        }}>
          <Sparkles size={14} />
          <span>The Elite Time Database Protocol</span>
        </div>

        <h1 className="landing-title" style={{ maxWidth: '900px', margin: '0 auto 2rem' }}>
          True Decentralized<br />
          <span>Intelligence</span>
        </h1>

        <p className="landing-subtitle" style={{ fontSize: '1.25rem', maxWidth: '800px', margin: '0 auto' }}>
          Mirror is a next-generation time architecture delivering instant analytics, rigid execution protocols, and pure cognitive momentum.
        </p>

        <div className="flex-row" style={{ justifyContent: 'center', gap: '1.5rem', marginTop: '3rem' }}>
          <Link href="/signup" className="btn-primary" style={{ minWidth: '180px' }}>
            Initialize Core <ArrowRight size={18} />
          </Link>
          <Link href="/login" className="btn-secondary" style={{ minWidth: '160px' }}>
            Join Us
          </Link>
        </div>
      </RevealSection>

      {/* --- FEATURES GRID --- */}
      <RevealSection delay={200} style={{ width: '100%', maxWidth: '1200px', margin: '6rem auto 4rem', padding: '0 2rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '3rem', letterSpacing: '-0.03em' }}>Node Infrastructure</h2>
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
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>Transforming Chaos<br/>Into <span style={{ color: 'var(--accent-primary)' }}>Intelligence</span></h2>
              <p className="text-secondary" style={{ fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
                Forget unstructured work. Use the Mirror's rigid block protocols to synthesize raw time into trackable nodes. Visualizing energy flows creates an immediate neurological feedback loop.
              </p>
              <ul className="flex-col gap-md" style={{ listStyle: 'none' }}>
                {healthFacts.map((fact, idx) => (
                  <li key={idx} style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}>
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
        <h2 style={{ fontSize: '2rem', marginBottom: '3rem', color: 'var(--text-secondary)' }}>Operating Philosophy</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {wisdom.map((item, idx) => (
            <div key={idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '2rem', textAlign: 'left', position: 'relative' }}>
              <Quote size={20} color="var(--accent-primary)" style={{ opacity: 0.3, position: 'absolute', top: '1.5rem', right: '1.5rem' }} />
              <p style={{ fontSize: '1rem', lineHeight: 1.6, color: '#e2e8f0', marginBottom: '1.5rem', fontStyle: 'italic' }}>"{item.quote}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 24, height: 2, background: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{item.author}</span>
              </div>
            </div>
          ))}
        </div>
      </RevealSection>

      {/* --- CALL TO ACTION --- */}
      <RevealSection delay={100} style={{ width: '100%', borderTop: '1px solid rgba(0,255,204,0.1)', background: '#000806' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '6rem 2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>Begin the Sequence.</h2>
          <p className="text-secondary" style={{ fontSize: '1.2rem', marginBottom: '3rem' }}>
            Data doesn't lie. Stop guessing where your hours go and start managing them like a tactical asset.
          </p>
          <Link href="/signup" className="btn-primary" style={{ padding: '1.2rem 3rem', fontSize: '1.1rem' }}>
            Initialize Your Node
          </Link>
          <div style={{ marginTop: '2rem', color: 'var(--text-secondary)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
            Powered by next-gen Layer 1 architecture.
          </div>
        </div>
      </RevealSection>

    </div>
  )
}
