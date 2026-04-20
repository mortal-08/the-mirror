'use client'

import { useState, useMemo } from 'react'
import { createImportantDate, deleteImportantDate } from '@/actions/importantDates'
import { useToast } from '@/components/ToastProvider'
import { CalendarCheck, Plus, Trash2, Clock, AlertTriangle, Flame } from 'lucide-react'

const COLORS = ['#f59e0b', '#ef4444', '#7c3aed', '#2563eb', '#06b6d4', '#10b981', '#ec4899', '#f97316']

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function extractDateKey(value: string | Date): string {
  if (value instanceof Date) return toLocalDateKey(value)
  return String(value).slice(0, 10)
}

function getDaysUntil(dateStr: string): number {
  const today = new Date()
  const todayKey = toLocalDateKey(today)
  const target = new Date(dateStr + 'T00:00:00')
  const todayDate = new Date(todayKey + 'T00:00:00')
  return Math.ceil((target.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
}

function getUrgencyColor(daysUntil: number): string {
  if (daysUntil <= 0) return '#ef4444'
  if (daysUntil <= 3) return '#f97316'
  if (daysUntil <= 7) return '#f59e0b'
  return '#10b981'
}

function getUrgencyLabel(daysUntil: number): string {
  if (daysUntil < 0) return `${Math.abs(daysUntil)}d overdue`
  if (daysUntil === 0) return 'Today!'
  if (daysUntil === 1) return 'Tomorrow'
  return `${daysUntil} days`
}

export default function ImportantDatesClient({ initialDates }: { initialDates: any[] }) {
  const { toast } = useToast()
  const [dates, setDates] = useState<any[]>(initialDates)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#f59e0b')
  const [isAdding, setIsAdding] = useState(false)

  const sortedDates = useMemo(() => {
    return [...dates].sort((a, b) => {
      const dA = getDaysUntil(extractDateKey(a.date))
      const dB = getDaysUntil(extractDateKey(b.date))
      return dA - dB
    })
  }, [dates])

  const upcomingDates = sortedDates.filter(d => getDaysUntil(extractDateKey(d.date)) >= 0)
  const pastDates = sortedDates.filter(d => getDaysUntil(extractDateKey(d.date)) < 0)

  const handleAdd = async () => {
    if (!title.trim() || !date) {
      toast('Title and date are required.', 'error')
      return
    }
    setIsAdding(true)
    try {
      const created = await createImportantDate({
        title: title.trim(),
        date,
        description: description.trim() || undefined,
        color,
      })
      setDates(prev => [...prev, created])
      setTitle('')
      setDate('')
      setDescription('')
      toast('Important date added! 📅', 'success')
    } catch {
      toast('Failed to add date.', 'error')
    }
    setIsAdding(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this important date?')) return
    try {
      await deleteImportantDate(id)
      setDates(prev => prev.filter(d => d.id !== id))
      toast('Date removed.', 'success')
    } catch {
      toast('Failed to delete.', 'error')
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="motion-stack">
      <div className="reveal-up" style={{ '--reveal-delay': '0ms' } as React.CSSProperties}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarCheck size={24} color="var(--accent-primary)" /> Important Dates
        </h1>
        <p className="page-subtitle">Track exams, deadlines, and key events. Get reminders on your dashboard.</p>
      </div>

      {/* Add New Date */}
      <div className="glass reveal-up" style={{ '--reveal-delay': '80ms', padding: '2rem' } as React.CSSProperties}>
        <h3 style={{ margin: 0, marginBottom: '1.25rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> Add New Date
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title (e.g., Final Exam)" style={{ flex: 2, minWidth: '180px' }} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ flex: 1, minWidth: '140px' }} />
          </div>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description or notes..." />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Color:</span>
            <div style={{ display: 'flex', gap: '5px' }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c,
                  border: color === c ? '2.5px solid var(--text-primary)' : '2.5px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s', transform: color === c ? 'scale(1.15)' : 'scale(1)'
                }} />
              ))}
            </div>
            <button className="btn-primary" onClick={handleAdd} disabled={isAdding} style={{ marginLeft: 'auto', padding: '0.75rem 1.5rem' }}>
              <Plus size={18} /> {isAdding ? 'Adding...' : 'Add Event'}
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Dates */}
      <div className="glass reveal-up" style={{ '--reveal-delay': '160ms', padding: '2rem' } as React.CSSProperties}>
        <h3 style={{ margin: 0, marginBottom: '1.25rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Flame size={16} /> Upcoming Events
        </h3>
        {upcomingDates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
            <CalendarCheck size={40} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
            <p>No upcoming events. Add one above!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {upcomingDates.map((item) => {
              const dateKey = extractDateKey(item.date)
              const daysUntil = getDaysUntil(dateKey)
              const urgencyColor = getUrgencyColor(daysUntil)
              const urgencyLabel = getUrgencyLabel(daysUntil)

              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem',
                  background: 'var(--surface)', borderRadius: '14px',
                  border: `1px solid ${daysUntil <= 3 ? urgencyColor + '40' : 'var(--surface-border)'}`,
                  transition: 'all 0.2s',
                  boxShadow: daysUntil <= 3 ? `0 0 15px ${urgencyColor}15` : 'none',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '12px',
                    background: `${item.color || urgencyColor}18`,
                    border: `1px solid ${item.color || urgencyColor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: item.color || urgencyColor, flexShrink: 0,
                  }}>
                    {daysUntil <= 3 ? <AlertTriangle size={20} /> : <CalendarCheck size={20} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{item.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{formatDate(dateKey)}</div>
                    {item.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>{item.description}</div>}
                  </div>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                    padding: '0.5rem 0.75rem', borderRadius: '10px',
                    background: `${urgencyColor}15`, border: `1px solid ${urgencyColor}30`,
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: urgencyColor, lineHeight: 1 }}>
                      {daysUntil}
                    </span>
                    <span style={{ fontSize: '0.55rem', color: urgencyColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'DAY' : 'DAYS'}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(item.id)} style={{ color: '#ff5577', background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', flexShrink: 0, borderRadius: '8px', transition: 'background 0.2s' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Past Events */}
      {pastDates.length > 0 && (
        <div className="glass reveal-up" style={{ '--reveal-delay': '240ms', padding: '2rem', opacity: 0.7 } as React.CSSProperties}>
          <h3 style={{ margin: 0, marginBottom: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} /> Past Events
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {pastDates.map((item) => {
              const dateKey = extractDateKey(item.date)
              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                  background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--surface-border)',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color || 'var(--text-tertiary)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.title}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{formatDate(dateKey)}</span>
                  <button onClick={() => handleDelete(item.id)} style={{ color: '#ff5577', background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
