'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Database, Quote, BookOpen, Target, Clock, Timer, History, Settings, Sparkles } from 'lucide-react'
import { upsertJournal } from '@/actions/journal'
import { useToast } from '@/components/ToastProvider'
import ManualEntryForm from '@/components/ManualEntryForm'
import EntryList from '@/components/EntryList'

const WISDOM_QUOTES = [
  { text: "The key is in not spending time, but in investing it.", author: "Stephen R. Covey" },
  { text: "Time is what we want most, but what we use worst.", author: "William Penn" },
  { text: "Lost time is never found again.", author: "Benjamin Franklin" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { text: "The bad news is time flies. The good news is you're the pilot.", author: "Michael Altshuler" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "You may delay, but time will not.", author: "Benjamin Franklin" },
  { text: "Time is the most valuable thing a man can spend.", author: "Theophrastus" },
  { text: "An inch of time is an inch of gold.", author: "Chinese Proverb" },
  { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" },
]

const MOODS = ['🔥', '😊', '😐', '😓', '💪', '🧠', '☕', '🌙']

const NAV_ORBS = [
  { href: '/timer', label: 'Timer', icon: Timer, color: '#7c3aed', delay: 0 },
  { href: '/journal', label: 'Journal', icon: BookOpen, color: '#2563eb', delay: 0.15 },
  { href: '/history', label: 'History', icon: History, color: '#06b6d4', delay: 0.3 },
  { href: '/settings', label: 'Settings', icon: Settings, color: '#10b981', delay: 0.45 },
]

export default function DashboardClient({ stats, categories, tags, recentEntries, todayJournal }: {
  stats: any; categories: any[]; tags: any[]; recentEntries: any[]; todayJournal: any
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [now, setNow] = useState(new Date())
  const [journalText, setJournalText] = useState(todayJournal?.content || '')
  const [journalMood, setJournalMood] = useState(todayJournal?.mood || '')
  const [journalSaving, setJournalSaving] = useState(false)
  const [tomorrowPlan, setTomorrowPlan] = useState('')
  const [hoveredOrb, setHoveredOrb] = useState<string | null>(null)
  const [particles, setParticles] = useState<{x: number; y: number; size: number; duration: number; delay: number}[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('mirror_tomorrow_plan')
    if (saved) setTomorrowPlan(saved)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Generate floating particles
  useEffect(() => {
    const p = Array.from({ length: 20 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
    }))
    setParticles(p)
  }, [])

  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const todayQuote = WISDOM_QUOTES[dayOfYear % WISDOM_QUOTES.length]

  const todayHours = (stats.todaySeconds / 3600).toFixed(1)
  const weekHours = (stats.weekSeconds / 3600).toFixed(1)
  const dailyGoalHours = (stats.dailyGoal / 3600).toFixed(0)
  const weeklyGoalHours = (stats.weeklyGoal / 3600).toFixed(0)
  const todayPct = Math.min((stats.todaySeconds / stats.dailyGoal) * 100, 100)
  const weekPct = Math.min((stats.weekSeconds / stats.weeklyGoal) * 100, 100)

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const saveJournal = async () => {
    if (!journalText.trim()) return
    setJournalSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      await upsertJournal(today, journalText, journalMood || undefined)
      toast('Journal saved!', 'success')
    } catch { toast('Failed to save.', 'error') }
    setJournalSaving(false)
  }

  const saveTomorrowPlan = () => {
    localStorage.setItem('mirror_tomorrow_plan', tomorrowPlan)
    toast('Plan saved!', 'success')
  }

  return (
    <div className="motion-stack">
      {/* === HERO HUB SECTION with floating particles === */}
      <div className="dashboard-hero reveal-up" style={{ '--reveal-delay': '0ms', position: 'relative', overflow: 'hidden', borderRadius: '24px', padding: '3rem 2rem', minHeight: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'var(--hero-bg)', border: '1px solid var(--surface-border)' } as React.CSSProperties}>
        
        {/* Animated floating particles */}
        {particles.map((p, i) => (
          <div key={i} className="floating-particle" style={{
            position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, borderRadius: '50%',
            background: 'var(--accent-primary)', opacity: 0.15,
            animation: `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
            pointerEvents: 'none'
          }} />
        ))}

        {/* Animated gradient rings behind clock */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 300, height: 300, borderRadius: '50%', border: '1px solid var(--surface-border)', opacity: 0.3, animation: 'ringPulse 4s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, height: 400, borderRadius: '50%', border: '1px solid var(--surface-border)', opacity: 0.15, animation: 'ringPulse 4s ease-in-out 1s infinite' }} />

        {/* Live Clock */}
        <div style={{ position: 'relative', zIndex: 2, marginBottom: '0.5rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '4rem', fontWeight: 800, letterSpacing: '0.05em', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>
            {timeStr}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.5rem' }}>{dateStr}</p>
        </div>

        {/* Wisdom Quote */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 500, marginTop: '1rem', marginBottom: '2rem' }}>
          <p style={{ fontStyle: 'italic', fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-secondary)', opacity: 0.9 }}>"{todayQuote.text}"</p>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>— {todayQuote.author}</span>
        </div>

        {/* === NAVIGATION ORBS === */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {NAV_ORBS.map((orb) => {
            const Icon = orb.icon
            const isHovered = hoveredOrb === orb.href
            return (
              <button
                key={orb.href}
                onClick={() => router.push(orb.href)}
                onMouseEnter={() => setHoveredOrb(orb.href)}
                onMouseLeave={() => setHoveredOrb(null)}
                className="nav-orb"
                style={{
                  width: 90, height: 90, borderRadius: '50%',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  background: isHovered ? `${orb.color}20` : 'var(--surface)',
                  border: `2px solid ${isHovered ? orb.color : 'var(--surface-border)'}`,
                  cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isHovered ? 'scale(1.15) translateY(-8px)' : 'scale(1)',
                  boxShadow: isHovered ? `0 12px 40px ${orb.color}40, 0 0 20px ${orb.color}20` : 'var(--shadow-sm)',
                  animation: `orbFloat 3s ease-in-out ${orb.delay}s infinite alternate`,
                  color: isHovered ? orb.color : 'var(--text-secondary)',
                }}
              >
                <Icon size={24} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{orb.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-2">
        <div className="stat-card glass reveal-up" style={{ '--reveal-delay': '100ms', padding: '2rem' } as React.CSSProperties}>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} /> Today
          </div>
          <div className="stat-value" style={{ margin: '0.75rem 0' }}>{todayHours}h</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-xs text-secondary">Target: {dailyGoalHours}h</span>
            <span className="text-xs" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{Math.round(todayPct)}%</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${todayPct}%` }} /></div>
        </div>
        <div className="stat-card glass reveal-up" style={{ '--reveal-delay': '160ms', padding: '2rem' } as React.CSSProperties}>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={16} /> This Week
          </div>
          <div className="stat-value" style={{ margin: '0.75rem 0' }}>{weekHours}h</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-xs text-secondary">Target: {weeklyGoalHours}h</span>
            <span className="text-xs" style={{ color: 'var(--accent-secondary)', fontWeight: 700 }}>{Math.round(weekPct)}%</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${weekPct}%`, background: 'linear-gradient(90deg, var(--accent-secondary), var(--accent-tertiary))' }} /></div>
        </div>
      </div>

      {/* Tomorrow Planner + Journal */}
      <div className="grid-2">
        <div className="glass reveal-up" style={{ '--reveal-delay': '220ms', padding: '2rem' } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Target size={18} color="var(--accent-secondary)" />
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', margin: 0 }}>Tomorrow's Plan</h3>
          </div>
          <textarea value={tomorrowPlan} onChange={(e) => setTomorrowPlan(e.target.value)} placeholder="Plan your priorities..."
            style={{ width: '100%', minHeight: 90, background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '12px', padding: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '0.9rem', resize: 'vertical', outline: 'none', transition: 'border-color 0.3s' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-secondary)' }} onBlur={(e) => { e.target.style.borderColor = 'var(--surface-border)' }} />
          <button className="btn-primary mt-md" onClick={saveTomorrowPlan} style={{ width: '100%', padding: '0.7rem' }}>Save Plan</button>
        </div>
        <div className="glass reveal-up" style={{ '--reveal-delay': '280ms', padding: '2rem' } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BookOpen size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', margin: 0 }}>Today's Journal</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {MOODS.map((m) => (
              <button key={m} onClick={() => setJournalMood(m)} style={{ fontSize: '1.2rem', padding: '0.35rem', borderRadius: '8px', cursor: 'pointer', background: journalMood === m ? 'var(--surface-active)' : 'transparent', border: journalMood === m ? '1px solid var(--accent-primary)' : '1px solid transparent', transition: 'all 0.2s' }}>{m}</button>
            ))}
          </div>
          <textarea value={journalText} onChange={(e) => setJournalText(e.target.value)} placeholder="How was your day?"
            style={{ width: '100%', minHeight: 65, background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '12px', padding: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '0.9rem', resize: 'vertical', outline: 'none', transition: 'border-color 0.3s' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)' }} onBlur={(e) => { e.target.style.borderColor = 'var(--surface-border)' }} />
          <button className="btn-primary mt-md" onClick={saveJournal} disabled={journalSaving} style={{ width: '100%', padding: '0.7rem' }}>
            {journalSaving ? 'Saving...' : (todayJournal ? 'Update' : 'Save')}
          </button>
        </div>
      </div>

      {/* Manual Entry */}
      <div className="reveal-up" style={{ '--reveal-delay': '340ms' } as React.CSSProperties}>
        <ManualEntryForm categories={categories} tags={tags} />
      </div>

      {/* Recent Activity */}
      <div className="glass reveal-up" style={{ '--reveal-delay': '400ms' } as React.CSSProperties}>
        <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} color="var(--accent-primary)" /> Recent Activity
        </h3>
        <EntryList initialEntries={recentEntries} categories={categories} />
      </div>
    </div>
  )
}
