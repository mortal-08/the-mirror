'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Database, BookOpen, Target, Clock, Timer, History, Settings, Sparkles, Shuffle, Plus, Trash2, X, BarChart3 } from 'lucide-react'
import { upsertJournal } from '@/actions/journal'
import { useToast } from '@/components/ToastProvider'
import ManualEntryForm from '@/components/ManualEntryForm'
import EntryList from '@/components/EntryList'

const QUOTES = [
  { text: "The key is in not spending time, but in investing it.", author: "Stephen R. Covey" },
  { text: "Time is what we want most, but what we use worst.", author: "William Penn" },
  { text: "Lost time is never found again.", author: "Benjamin Franklin" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { text: "The bad news is time flies. The good news is you're the pilot.", author: "Michael Altshuler" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "You may delay, but time will not.", author: "Benjamin Franklin" },
  { text: "Time is the most valuable thing a man can spend.", author: "Theophrastus" },
  { text: "Arise, awake and stop not till the goal is reached.", author: "Swami Vivekananda" },
  { text: "All power is within you; you can do anything and everything.", author: "Swami Vivekananda" },
  { text: "Take up one idea. Make that one idea your life.", author: "Swami Vivekananda" },
  { text: "In a conflict between the heart and the brain, follow your heart.", author: "Swami Vivekananda" },
  { text: "The great secret of true success is enthusiasm.", author: "Ralph Waldo Emerson" },
  { text: "We are what our thoughts have made us; so take care about what you think.", author: "Swami Vivekananda" },
  { text: "Talk to yourself once in a day, otherwise you may miss meeting an intelligent person.", author: "Swami Vivekananda" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "An unexamined life is not worth living.", author: "Socrates" },
  { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
  { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "You have power over your mind — not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" },
  { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
  { text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.", author: "Buddha" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
  { text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Excellence is not a destination but a continuously moving target.", author: "Aristotle" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
  { text: "No man is free who is not master of himself.", author: "Epictetus" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus" },
  { text: "The soul that is attached to nothing but itself is invincible.", author: "Seneca" },
  { text: "You are not a drop in the ocean. You are the entire ocean in a drop.", author: "Rumi" },
  { text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", author: "Rumi" },
]

const MOODS = ['🔥', '😊', '😐', '😓', '💪', '🧠', '☕', '🌙']

const NAV_ORBS = [
  { href: '/timer', label: 'Timer', icon: Timer, color: '#7c3aed' },
  { href: '/journal', label: 'Journal', icon: BookOpen, color: '#2563eb' },
  { href: '/history', label: 'History', icon: History, color: '#06b6d4' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, color: '#f59e0b' },
  { href: '/settings', label: 'Settings', icon: Settings, color: '#10b981' },
]

const TIME_SLOTS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00']

type PlanBlock = { time: string; task: string; category: string }

export default function DashboardClient({ stats, categories, tags, recentEntries, todayJournal }: {
  stats: any; categories: any[]; tags: any[]; recentEntries: any[]; todayJournal: any
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [now, setNow] = useState(new Date())
  const [journalText, setJournalText] = useState(todayJournal?.content || '')
  const [journalMood, setJournalMood] = useState(todayJournal?.mood || '')
  const [journalSaving, setJournalSaving] = useState(false)
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [hoveredOrb, setHoveredOrb] = useState<string | null>(null)
  const [particles, setParticles] = useState<{x:number;y:number;size:number;dur:number;del:number}[]>([])

  // Tomorrow plan as time blocks
  const [plan, setPlan] = useState<PlanBlock[]>([])
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [planTime, setPlanTime] = useState('09:00')
  const [planTask, setPlanTask] = useState('')
  const [planCat, setPlanCat] = useState('')

  // Load plan from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mirror_plan_blocks')
    if (saved) setPlan(JSON.parse(saved))
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Pick quote based on hour, changes every hour
  useEffect(() => {
    const hourIdx = now.getHours() + (now.getDate() * 31)
    setQuoteIdx(hourIdx % QUOTES.length)
  }, [Math.floor(now.getTime() / 3600000)])

  // Generate particles once
  useEffect(() => {
    setParticles(Array.from({ length: 25 }, () => ({
      x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 5 + 2, dur: Math.random() * 15 + 10, del: Math.random() * 5,
    })))
  }, [])

  const quote = QUOTES[quoteIdx]
  const shuffleQuote = () => setQuoteIdx((quoteIdx + 1 + Math.floor(Math.random() * (QUOTES.length - 1))) % QUOTES.length)

  const todayHours = (stats.todaySeconds / 3600).toFixed(1)
  const weekHours = (stats.weekSeconds / 3600).toFixed(1)
  const dailyGoalHours = (stats.dailyGoal / 3600).toFixed(0)
  const weeklyGoalHours = (stats.weeklyGoal / 3600).toFixed(0)
  const todayPct = Math.min((stats.todaySeconds / stats.dailyGoal) * 100, 100)
  const weekPct = Math.min((stats.weekSeconds / stats.weeklyGoal) * 100, 100)

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const saveJournal = async () => {
    if (!journalText.trim()) return
    setJournalSaving(true)
    try {
      await upsertJournal(new Date().toISOString().split('T')[0], journalText, journalMood || undefined)
      toast('Journal saved!', 'success')
    } catch { toast('Failed to save.', 'error') }
    setJournalSaving(false)
  }

  const addPlanBlock = () => {
    if (!planTask.trim()) return
    const newPlan = [...plan, { time: planTime, task: planTask, category: planCat }].sort((a, b) => a.time.localeCompare(b.time))
    setPlan(newPlan)
    localStorage.setItem('mirror_plan_blocks', JSON.stringify(newPlan))
    setPlanTask('')
    setShowPlanModal(false)
    toast('Block added!', 'success')
  }

  const removePlanBlock = (idx: number) => {
    const newPlan = plan.filter((_, i) => i !== idx)
    setPlan(newPlan)
    localStorage.setItem('mirror_plan_blocks', JSON.stringify(newPlan))
  }

  return (
    <div className="motion-stack">
      {/* ═══ HERO HUB ═══ */}
      <div className="dashboard-hero reveal-up" style={{ '--reveal-delay': '0ms', position: 'relative', overflow: 'hidden', borderRadius: '20px', padding: '2.5rem 1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' } as React.CSSProperties}>
        
        {/* Particles */}
        {particles.map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: '50%', background: 'var(--accent-primary)', opacity: 0.12, animation: `particleFloat ${p.dur}s ease-in-out ${p.del}s infinite alternate`, pointerEvents: 'none' }} />
        ))}

        {/* Rings */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 280, height: 280, borderRadius: '50%', border: '1px solid var(--surface-border)', opacity: 0.25, animation: 'ringPulse 4s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 420, height: 420, borderRadius: '50%', border: '1px solid var(--surface-border)', opacity: 0.12, animation: 'ringPulse 4s ease-in-out 1s infinite' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 560, height: 560, borderRadius: '50%', border: '1px solid var(--surface-border)', opacity: 0.06, animation: 'ringPulse 4s ease-in-out 2s infinite' }} />

        {/* Clock */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(2.2rem, 8vw, 4rem)', fontWeight: 800, letterSpacing: '0.04em', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
            {timeStr}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2.5vw, 1rem)', marginTop: '0.4rem' }}>{dateStr}</p>
        </div>

        {/* Wisdom Quote with Shuffle */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 460, marginTop: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.5rem' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontStyle: 'italic', fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', lineHeight: 1.5, color: 'var(--text-secondary)' }}>"{quote.text}"</p>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>— {quote.author}</span>
          </div>
          <button onClick={shuffleQuote} title="New quote" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s' }}>
            <Shuffle size={12} />
          </button>
        </div>

        {/* Navigation Orbs */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 'clamp(0.75rem, 3vw, 1.5rem)', flexWrap: 'wrap', justifyContent: 'center' }}>
          {NAV_ORBS.map((orb) => {
            const Icon = orb.icon
            const isHovered = hoveredOrb === orb.href
            return (
              <button key={orb.href} onClick={() => router.push(orb.href)}
                onMouseEnter={() => setHoveredOrb(orb.href)} onMouseLeave={() => setHoveredOrb(null)}
                className="nav-orb" style={{
                  width: 'clamp(60px, 15vw, 85px)', height: 'clamp(60px, 15vw, 85px)', borderRadius: '50%',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  background: isHovered ? `${orb.color}18` : 'var(--surface)',
                  border: `2px solid ${isHovered ? orb.color : 'var(--surface-border)'}`,
                  cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isHovered ? 'scale(1.12) translateY(-6px)' : 'scale(1)',
                  boxShadow: isHovered ? `0 12px 40px ${orb.color}30` : 'var(--shadow-sm)',
                  animation: `orbFloat 3s ease-in-out ${NAV_ORBS.indexOf(orb) * 0.4}s infinite alternate`,
                  color: isHovered ? orb.color : 'var(--text-secondary)',
                  fontFamily: 'var(--font-sans)',
                }}>
                <Icon size={20} />
                <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{orb.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══ STAT CARDS ═══ */}
      <div className="grid-2">
        <div className="stat-card glass reveal-up" style={{ '--reveal-delay': '80ms', padding: '2rem' } as React.CSSProperties}>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={16} /> Today</div>
          <div className="stat-value" style={{ margin: '0.6rem 0' }}>{todayHours}h</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span className="text-xs text-secondary">Target: {dailyGoalHours}h</span>
            <span className="text-xs" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{Math.round(todayPct)}%</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${todayPct}%` }} /></div>
        </div>
        <div className="stat-card glass reveal-up" style={{ '--reveal-delay': '140ms', padding: '2rem' } as React.CSSProperties}>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Database size={16} /> This Week</div>
          <div className="stat-value" style={{ margin: '0.6rem 0' }}>{weekHours}h</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span className="text-xs text-secondary">Target: {weeklyGoalHours}h</span>
            <span className="text-xs" style={{ color: 'var(--accent-secondary)', fontWeight: 700 }}>{Math.round(weekPct)}%</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${weekPct}%`, background: 'linear-gradient(90deg, var(--accent-secondary), var(--accent-tertiary))' }} /></div>
        </div>
      </div>

      {/* ═══ TOMORROW'S ROUTINE PLANNER ═══ */}
      <div className="glass reveal-up" style={{ '--reveal-delay': '200ms', padding: '2rem' } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={18} color="var(--accent-secondary)" />
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', margin: 0 }}>Tomorrow's Routine</h3>
          </div>
          <button className="btn-primary" onClick={() => setShowPlanModal(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={14} /> Add Block
          </button>
        </div>

        {plan.length === 0 ? (
          <p className="text-secondary" style={{ textAlign: 'center', padding: '2rem 0' }}>No blocks planned yet. Click "Add Block" to schedule your day.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {plan.map((block, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '12px',
                transition: 'all 0.2s', position: 'relative'
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-primary)', minWidth: 50 }}>{block.time}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{block.task}</span>
                  {block.category && <span className="text-xs text-secondary" style={{ marginLeft: '0.5rem' }}>({block.category})</span>}
                </div>
                <button onClick={() => removePlanBlock(idx)} style={{ background: 'none', border: 'none', color: '#ff5577', cursor: 'pointer', padding: '4px' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan Block Modal */}
      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Add Time Block</h3>
              <button onClick={() => setShowPlanModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Time</label>
                <select value={planTime} onChange={(e) => setPlanTime(e.target.value)}>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label>What will you do?</label>
                <input type="text" value={planTask} onChange={(e) => setPlanTask(e.target.value)} placeholder="e.g., Deep work session, Gym, Study..." />
              </div>
              <div>
                <label>Category</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {categories.map((c: any) => (
                    <button key={c.id} type="button" className={planCat === c.name ? 'btn-primary' : 'btn-secondary'}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => setPlanCat(c.name)}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn-primary w-full" onClick={addPlanBlock} style={{ padding: '0.85rem' }}>Add to Routine</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ JOURNAL ═══ */}
      <div className="glass reveal-up" style={{ '--reveal-delay': '260ms', padding: '2rem' } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <BookOpen size={18} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', margin: 0 }}>Today's Journal</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          {MOODS.map((m) => (
            <button key={m} onClick={() => setJournalMood(m)} style={{ fontSize: '1.15rem', padding: '0.3rem', borderRadius: '8px', cursor: 'pointer', background: journalMood === m ? 'var(--surface-active)' : 'transparent', border: journalMood === m ? '1px solid var(--accent-primary)' : '1px solid transparent', transition: 'all 0.2s' }}>{m}</button>
          ))}
        </div>
        <textarea value={journalText} onChange={(e) => setJournalText(e.target.value)} placeholder="Reflect on your day..."
          style={{ width: '100%', minHeight: 80, background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '12px', padding: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '0.9rem', resize: 'vertical', outline: 'none', transition: 'border-color 0.3s' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)' }} onBlur={(e) => { e.target.style.borderColor = 'var(--surface-border)' }} />
        <button className="btn-primary mt-md" onClick={saveJournal} disabled={journalSaving} style={{ width: '100%', padding: '0.7rem' }}>
          {journalSaving ? 'Saving...' : (todayJournal ? 'Update Journal' : 'Save Journal')}
        </button>
      </div>

      {/* ═══ QUICK LOG ═══ */}
      <div className="reveal-up" style={{ '--reveal-delay': '320ms' } as React.CSSProperties}>
        <ManualEntryForm categories={categories} tags={tags} />
      </div>

      {/* ═══ RECENT ACTIVITY ═══ */}
      <div className="glass reveal-up" style={{ '--reveal-delay': '380ms' } as React.CSSProperties}>
        <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} color="var(--accent-primary)" /> Recent Activity
        </h3>
        <EntryList initialEntries={recentEntries} categories={categories} />
      </div>
    </div>
  )
}
