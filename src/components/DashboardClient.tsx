'use client'

import { useState, useEffect } from 'react'
import { Activity, Network, Database, Calendar, Quote, Sparkles, BookOpen, ArrowRight, Target, Clock } from 'lucide-react'
import { upsertJournal } from '@/actions/journal'
import { createTimeEntry } from '@/actions/timeEntries'
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

export default function DashboardClient({ stats, categories, tags, recentEntries, todayJournal }: {
  stats: any
  categories: any[]
  tags: any[]
  recentEntries: any[]
  todayJournal: any
}) {
  const { toast } = useToast()
  const [now, setNow] = useState(new Date())
  const [journalText, setJournalText] = useState(todayJournal?.content || '')
  const [journalMood, setJournalMood] = useState(todayJournal?.mood || '')
  const [journalSaving, setJournalSaving] = useState(false)
  const [tomorrowPlan, setTomorrowPlan] = useState('')

  // Load tomorrow plan from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mirror_tomorrow_plan')
    if (saved) setTomorrowPlan(saved)
  }, [])

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Daily wisdom (changes daily based on day-of-year)
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const todayQuote = WISDOM_QUOTES[dayOfYear % WISDOM_QUOTES.length]

  const todayHours = (stats.todaySeconds / 3600).toFixed(1)
  const weekHours = (stats.weekSeconds / 3600).toFixed(1)
  const dailyGoalHours = (stats.dailyGoal / 3600).toFixed(0)
  const weeklyGoalHours = (stats.weeklyGoal / 3600).toFixed(0)
  const todayPct = Math.min((stats.todaySeconds / stats.dailyGoal) * 100, 100)
  const weekPct = Math.min((stats.weekSeconds / stats.weeklyGoal) * 100, 100)
  const totalCatSeconds = stats.categoryBreakdown.reduce((a: number, b: any) => a + b.seconds, 0) || 1

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const saveJournal = async () => {
    if (!journalText.trim()) return
    setJournalSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      await upsertJournal(today, journalText, journalMood || undefined)
      toast('Journal saved!', 'success')
    } catch {
      toast('Failed to save journal.', 'error')
    }
    setJournalSaving(false)
  }

  const saveTomorrowPlan = () => {
    localStorage.setItem('mirror_tomorrow_plan', tomorrowPlan)
    toast('Tomorrow plan saved!', 'success')
  }

  return (
    <div className="motion-stack">
      {/* Header with Live Clock */}
      <div className="reveal-up" style={{ '--reveal-delay': '0ms', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' } as React.CSSProperties}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Command Center</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{dateStr}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--accent-primary)' }}>
            {timeStr}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Live System Clock</div>
        </div>
      </div>

      {/* Daily Wisdom Quote */}
      <div className="glass reveal-up" style={{ '--reveal-delay': '60ms', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' } as React.CSSProperties}>
        <div style={{ padding: '0.75rem', background: 'var(--surface-hover)', borderRadius: '14px', color: 'var(--accent-primary)', flexShrink: 0 }}>
          <Quote size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '1.05rem', fontStyle: 'italic', lineHeight: 1.5, marginBottom: '0.5rem' }}>"{todayQuote.text}"</p>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>— {todayQuote.author}</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-2">
        <div className="stat-card glass reveal-up" style={{ '--reveal-delay': '120ms', padding: '2rem' } as React.CSSProperties}>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} /> Today
          </div>
          <div className="stat-value" style={{ margin: '0.75rem 0' }}>{todayHours}h</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-xs text-secondary">Target: {dailyGoalHours}h</span>
            <span className="text-xs" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{Math.round(todayPct)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${todayPct}%` }} />
          </div>
        </div>

        <div className="stat-card glass reveal-up" style={{ '--reveal-delay': '180ms', padding: '2rem' } as React.CSSProperties}>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={16} /> This Week
          </div>
          <div className="stat-value" style={{ margin: '0.75rem 0' }}>{weekHours}h</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-xs text-secondary">Target: {weeklyGoalHours}h</span>
            <span className="text-xs" style={{ color: 'var(--accent-secondary)', fontWeight: 700 }}>{Math.round(weekPct)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${weekPct}%`, background: 'linear-gradient(90deg, var(--accent-secondary), var(--accent-tertiary))' }} />
          </div>
        </div>
      </div>

      {/* Category Breakdown Graph */}
      {stats.categoryBreakdown.length > 0 && (
        <div className="glass reveal-up" style={{ '--reveal-delay': '240ms', padding: '2rem' } as React.CSSProperties}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-secondary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Network size={16} color="var(--accent-secondary)" /> Weekly Breakdown
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 120, gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem' }}>
            {stats.categoryBreakdown.map((cat: any, i: number) => {
              const heightPct = Math.max((cat.seconds / totalCatSeconds) * 100, 8)
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{
                    width: '100%', height: `${heightPct}%`, background: `linear-gradient(180deg, ${cat.color}, ${cat.color}88)`,
                    borderRadius: '6px 6px 0 0', transition: 'height 1s cubic-bezier(0.16, 1, 0.3, 1)', position: 'relative'
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'rgba(255,255,255,0.5)', borderRadius: '6px 6px 0 0' }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            {stats.categoryBreakdown.map((cat: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color }} />
                <span style={{ fontWeight: 600 }}>{cat.name}</span>
                <span className="text-secondary" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{(cat.seconds / 3600).toFixed(1)}h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column: Tomorrow Planner + Journal */}
      <div className="grid-2">
        {/* Tomorrow Planner */}
        <div className="glass reveal-up" style={{ '--reveal-delay': '300ms', padding: '2rem' } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Target size={18} color="var(--accent-secondary)" />
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-secondary)', margin: 0 }}>Tomorrow's Blueprint</h3>
          </div>
          <textarea
            value={tomorrowPlan}
            onChange={(e) => setTomorrowPlan(e.target.value)}
            placeholder="Plan your priorities for tomorrow..."
            style={{
              width: '100%', minHeight: 100, background: 'var(--surface)', border: '1px solid var(--surface-border)',
              borderRadius: '12px', padding: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
              fontSize: '0.9rem', resize: 'vertical', outline: 'none', transition: 'border-color 0.3s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-secondary)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--surface-border)' }}
          />
          <button className="btn-primary mt-md" onClick={saveTomorrowPlan} style={{ width: '100%', padding: '0.75rem' }}>
            Save Blueprint
          </button>
        </div>

        {/* Quick Journal */}
        <div className="glass reveal-up" style={{ '--reveal-delay': '360ms', padding: '2rem' } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BookOpen size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-secondary)', margin: 0 }}>Today's Journal</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {MOODS.map((m) => (
              <button key={m} onClick={() => setJournalMood(m)} style={{
                fontSize: '1.3rem', padding: '0.4rem', borderRadius: '10px', cursor: 'pointer',
                background: journalMood === m ? 'var(--surface-active)' : 'transparent',
                border: journalMood === m ? '1px solid var(--accent-primary)' : '1px solid transparent',
                transition: 'all 0.2s'
              }}>
                {m}
              </button>
            ))}
          </div>
          <textarea
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            placeholder="How was your day? What did you accomplish?"
            style={{
              width: '100%', minHeight: 80, background: 'var(--surface)', border: '1px solid var(--surface-border)',
              borderRadius: '12px', padding: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
              fontSize: '0.9rem', resize: 'vertical', outline: 'none', transition: 'border-color 0.3s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--surface-border)' }}
          />
          <button className="btn-primary mt-md" onClick={saveJournal} disabled={journalSaving} style={{ width: '100%', padding: '0.75rem' }}>
            {journalSaving ? 'Saving...' : (todayJournal ? 'Update Journal' : 'Save Journal')}
          </button>
        </div>
      </div>

      {/* Manual Entry */}
      <div className="reveal-up" style={{ '--reveal-delay': '420ms' } as React.CSSProperties}>
        <ManualEntryForm categories={categories} tags={tags} />
      </div>

      {/* Recent Activity */}
      <div className="glass reveal-up" style={{ '--reveal-delay': '480ms' } as React.CSSProperties}>
        <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} color="var(--accent-primary)" /> Recent Activity
        </h3>
        <EntryList initialEntries={recentEntries} categories={categories} />
      </div>
    </div>
  )
}
