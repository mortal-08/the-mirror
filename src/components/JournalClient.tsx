'use client'

import { useState } from 'react'
import { BookOpen, Calendar, ChevronDown, ChevronUp, Save } from 'lucide-react'
import { upsertJournal } from '@/actions/journal'
import { useToast } from '@/components/ToastProvider'

const MOODS = ['🔥', '😊', '😐', '😓', '💪', '🧠', '☕', '🌙']

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function extractDateKey(value: string | Date): string {
  if (value instanceof Date) {
    return toLocalDateKey(value)
  }
  return String(value).slice(0, 10)
}

export default function JournalClient({ journals }: { journals: any[] }) {
  const { toast } = useToast()
  const today = toLocalDateKey(new Date())
  const todayEntry = journals.find((j) => extractDateKey(j.date) === today)

  const [content, setContent] = useState(todayEntry?.content || '')
  const [mood, setMood] = useState(todayEntry?.mood || '')
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const pastEntries = journals.filter((j) => extractDateKey(j.date) !== today)

  const handleSave = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      await upsertJournal(today, content, mood || undefined)
      toast('Journal saved!', 'success')
    } catch {
      toast('Failed to save.', 'error')
    }
    setSaving(false)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(`${extractDateKey(dateStr)}T12:00:00`)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="motion-stack">
      <div className="reveal-up" style={{ '--reveal-delay': '0ms' } as React.CSSProperties}>
        <h1 className="page-title">Journal</h1>
        <p className="page-subtitle">Reflect, record, and grow every day.</p>
      </div>

      {/* Today's Entry */}
      <div className="glass reveal-up" style={{ '--reveal-delay': '80ms', padding: '2.5rem' } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <BookOpen size={20} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Today — {formatDate(today)}</h2>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', alignSelf: 'center', marginRight: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Mood:</span>
          {MOODS.map((m) => (
            <button key={m} onClick={() => setMood(m)} style={{
              fontSize: '1.4rem', padding: '0.5rem', borderRadius: '12px', cursor: 'pointer',
              background: mood === m ? 'var(--surface-active)' : 'transparent',
              border: mood === m ? '2px solid var(--accent-primary)' : '2px solid transparent',
              transition: 'all 0.2s', transform: mood === m ? 'scale(1.15)' : 'scale(1)'
            }}>
              {m}
            </button>
          ))}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What happened today? What did you learn? How do you feel about your progress?"
          style={{
            width: '100%', minHeight: 180, background: 'var(--surface)', border: '1px solid var(--surface-border)',
            borderRadius: '16px', padding: '1.5rem', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
            fontSize: '1rem', lineHeight: 1.7, resize: 'vertical', outline: 'none', transition: 'border-color 0.3s',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)' }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--surface-border)' }}
        />

        <button className="btn-primary mt-lg" onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Save size={18} />
          {saving ? 'Saving...' : (todayEntry ? 'Update Entry' : 'Save Entry')}
        </button>
      </div>

      {/* Past Entries */}
      {pastEntries.length > 0 && (
        <div className="reveal-up" style={{ '--reveal-delay': '160ms' } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Calendar size={18} color="var(--text-secondary)" />
            <h2 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Previous Entries</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pastEntries.map((entry) => {
              const isExpanded = expandedId === entry.id
              return (
                <div key={entry.id} className="glass" style={{ padding: 0, overflow: 'hidden', transition: 'all 0.3s ease' }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    style={{
                      width: '100%', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {entry.mood && <span style={{ fontSize: '1.3rem' }}>{entry.mood}</span>}
                      <span style={{ fontWeight: 600 }}>{formatDate(entry.date)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="text-xs text-secondary" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {!isExpanded && entry.content.substring(0, 60)}
                      </span>
                      {isExpanded ? <ChevronUp size={18} color="var(--text-tertiary)" /> : <ChevronDown size={18} color="var(--text-tertiary)" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid var(--surface-border)', animation: 'superReveal 300ms ease-out forwards' }}>
                      <p style={{ marginTop: '1.25rem', lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                        {entry.content}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pastEntries.length === 0 && (
        <div className="glass reveal-up" style={{ '--reveal-delay': '160ms', padding: '3rem', textAlign: 'center' } as React.CSSProperties}>
          <BookOpen size={40} color="var(--text-tertiary)" style={{ margin: '0 auto 1rem' }} />
          <p className="text-secondary">No previous journal entries yet. Start writing today!</p>
        </div>
      )}
    </div>
  )
}
