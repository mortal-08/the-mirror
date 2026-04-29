'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  NotebookPen, ChevronLeft, ChevronRight, Clock, Save,
  Loader2, Trash2, Sparkles, Eye
} from 'lucide-react'
import { getReflections, upsertReflection, deleteReflection } from '@/actions/reflections'
import { getRoutineBlocks } from '@/actions/routines'
import { useToast } from '@/components/ToastProvider'

type RoutineBlock = {
  id: string
  task: string
  startMinutes: number
  endMinutes: number
}

type Reflection = {
  id: string
  timeSlot: number
  content: string
  routineBlockId: string | null
  date: Date | string
}

function normalizeToLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const period = hours >= 12 ? 'PM' : 'AM'
  const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${h12}:${String(minutes).padStart(2, '0')} ${period}`
}

function formatMinutes24(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

// Generate time slots every 30 minutes
function generateTimeSlots(): number[] {
  const slots: number[] = []
  for (let m = 0; m < 24 * 60; m += 30) {
    slots.push(m)
  }
  return slots
}

export default function ReflectionSection() {
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date>(() => normalizeToLocalDay(new Date()))
  const [routineBlocks, setRoutineBlocks] = useState<RoutineBlock[]>([])
  const [reflections, setReflections] = useState<Reflection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingSlots, setSavingSlots] = useState<Set<number>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [editingSlots, setEditingSlots] = useState<Record<number, string>>({})
  const [showTimeline, setShowTimeline] = useState(false)

  const todayDate = useMemo(() => normalizeToLocalDay(new Date()), [])
  const isSelectedToday = dateKey(selectedDate) === dateKey(todayDate)
  const timeSlots = useMemo(() => generateTimeSlots(), [])

  const loadData = useCallback(async (date: Date) => {
    setIsLoading(true)
    const dk = dateKey(date)

    const [blocksResult, reflectionData] = await Promise.all([
      getRoutineBlocks(dk),
      getReflections(dk),
    ])

    if ('error' in blocksResult) {
      setRoutineBlocks([])
    } else {
      setRoutineBlocks(
        blocksResult.data.map((b) => ({
          id: b.id,
          task: b.task,
          startMinutes: b.startMinutes,
          endMinutes: b.endMinutes,
        }))
      )
    }

    setReflections(reflectionData as Reflection[])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadData(selectedDate)
  }, [loadData, selectedDate])

  // Get routine block for a time slot
  const getBlockForSlot = (slotMinutes: number): RoutineBlock | null => {
    return routineBlocks.find(
      (b) => slotMinutes >= b.startMinutes && slotMinutes < b.endMinutes
    ) || null
  }

  // Get reflection for a time slot
  const getReflectionForSlot = (slotMinutes: number): Reflection | null => {
    return reflections.find((r) => r.timeSlot === slotMinutes) || null
  }

  const handleSaveReflection = async (slotMinutes: number) => {
    const content = editingSlots[slotMinutes]
    if (!content?.trim()) {
      toast('Write something about what you did.', 'error')
      return
    }

    setSavingSlots((prev) => new Set(prev).add(slotMinutes))

    const block = getBlockForSlot(slotMinutes)
    const result = await upsertReflection(
      dateKey(selectedDate),
      slotMinutes,
      content,
      block?.id
    )

    if ('error' in result) {
      toast(result.error, 'error')
    } else {
      setReflections((prev) => {
        const filtered = prev.filter((r) => r.timeSlot !== slotMinutes)
        return [...filtered, result.data as Reflection].sort((a, b) => a.timeSlot - b.timeSlot)
      })
      setEditingSlots((prev) => {
        const next = { ...prev }
        delete next[slotMinutes]
        return next
      })
      toast('Reflection saved.', 'success')
    }

    setSavingSlots((prev) => {
      const next = new Set(prev)
      next.delete(slotMinutes)
      return next
    })
  }

  const handleDeleteReflection = async (id: string, slotMinutes: number) => {
    setDeletingIds((prev) => new Set(prev).add(id))
    const result = await deleteReflection(id)

    if ('error' in result) {
      toast(result.error, 'error')
    } else {
      setReflections((prev) => prev.filter((r) => r.id !== id))
      toast('Reflection removed.', 'success')
    }

    setDeletingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const changeDate = (days: number) => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + days)
    setSelectedDate(normalizeToLocalDay(next))
  }

  // Filter to only show relevant time slots (ones with blocks, reflections, or around current time)
  const relevantSlots = useMemo(() => {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    return timeSlots.filter((slot) => {
      // Has a routine block covering this slot
      if (getBlockForSlot(slot)) return true
      // Has a reflection
      if (getReflectionForSlot(slot)) return true
      // Is within 2 hours of current time (for today)
      if (isSelectedToday && Math.abs(slot - currentMinutes) <= 120) return true
      // Show waking hours (6 AM - 11 PM)
      if (slot >= 360 && slot <= 1380) return true
      return false
    })
  }, [timeSlots, routineBlocks, reflections, isSelectedToday])

  // Stats
  const reflectionCount = reflections.length
  const blocksWithReflections = reflections.filter((r) => r.routineBlockId).length
  const totalBlocks = routineBlocks.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header & Date Navigation */}
      <section className="glass p-6 md:p-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <NotebookPen size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-primary)', fontWeight: 700 }}>
              Daily Reflection
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface-active)', padding: '0.3rem', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
            <button onClick={() => changeDate(-1)} style={{ padding: '0.4rem', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }} className="hover-bg-surface"><ChevronLeft size={16} /></button>
            <div style={{ padding: '0 0.75rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: '130px', textAlign: 'center' }}>
              {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {isSelectedToday && <span style={{ marginLeft: '6px', color: 'var(--accent-primary)', fontSize: '0.65rem', textTransform: 'uppercase' }}>(Today)</span>}
            </div>
            <button onClick={() => changeDate(1)} style={{ padding: '0.4rem', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }} className="hover-bg-surface"><ChevronRight size={16} /></button>
            <button
              onClick={() => setSelectedDate(normalizeToLocalDay(new Date()))}
              disabled={isSelectedToday}
              style={{ marginLeft: '4px', padding: '0.4rem 0.8rem', fontSize: '0.7rem', fontWeight: 700, borderRadius: '8px', border: 'none', background: isSelectedToday ? 'transparent' : 'var(--accent-primary)', color: isSelectedToday ? 'var(--text-tertiary)' : 'var(--text-inverse)', cursor: isSelectedToday ? 'default' : 'pointer', transition: 'all 0.2s' }}
            >
              TODAY
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          <div style={{ padding: '0.85rem 1rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{reflectionCount}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Reflections</div>
          </div>
          <div style={{ padding: '0.85rem 1rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}>{blocksWithReflections}/{totalBlocks}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Blocks Reviewed</div>
          </div>
          <div style={{ padding: '0.85rem 1rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--surface-border)', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setShowTimeline(!showTimeline)} className="hover-bg-surface">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Eye size={16} color="var(--accent-tertiary)" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{showTimeline ? 'Hide' : 'Show'} Timeline</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>End-of-day view</div>
          </div>
        </div>
      </section>

      {/* Timeline View */}
      {showTimeline && (
        <section className="glass" style={{ padding: '1.5rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Sparkles size={18} color="var(--accent-primary)" />
            <h4 style={{ margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', fontWeight: 700 }}>Day Timeline</h4>
          </div>

          <div style={{ position: 'relative', paddingLeft: '3rem' }}>
            {/* Timeline line */}
            <div style={{ position: 'absolute', left: '1.1rem', top: 0, bottom: 0, width: '2px', background: 'var(--surface-border)' }} />

            {relevantSlots.map((slot, idx) => {
              const block = getBlockForSlot(slot)
              const reflection = getReflectionForSlot(slot)
              const hasContent = block || reflection

              if (!hasContent) return null

              return (
                <div key={slot} style={{ position: 'relative', marginBottom: '0.75rem', animation: `superReveal 400ms ease-out forwards`, animationDelay: `${idx * 40}ms`, opacity: 0 }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute', left: '-2.2rem', top: '0.6rem', width: '10px', height: '10px',
                    borderRadius: '50%',
                    background: reflection ? 'var(--accent-primary)' : block ? 'var(--accent-secondary)' : 'var(--text-tertiary)',
                    boxShadow: reflection ? '0 0 8px var(--accent-primary-glow)' : 'none',
                    border: '2px solid var(--bg-primary)',
                    zIndex: 2,
                  }} />

                  <div style={{
                    padding: '0.75rem 1rem', borderRadius: '10px',
                    background: reflection ? 'rgba(0, 255, 204, 0.04)' : 'var(--surface)',
                    border: `1px solid ${reflection ? 'rgba(0, 255, 204, 0.15)' : 'var(--surface-border)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                        {formatMinutes(slot)}
                      </span>
                      {block && (
                        <span style={{ fontSize: '0.7rem', padding: '1px 8px', background: 'var(--accent-secondary)', color: 'white', borderRadius: '4px', fontWeight: 600, letterSpacing: '0.03em' }}>
                          Planned: {block.task}
                        </span>
                      )}
                    </div>
                    {reflection && (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        {reflection.content}
                      </p>
                    )}
                    {block && !reflection && (
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        No reflection added
                      </p>
                    )}
                  </div>
                </div>
              )
            })}

            {reflections.length === 0 && routineBlocks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                No activities recorded yet for this day.
              </div>
            )}
          </div>
        </section>
      )}

      {/* Time Slot Reflection Entries */}
      <section className="glass" style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <Clock size={18} color="var(--accent-secondary)" />
          <h4 style={{ margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', fontWeight: 700 }}>What did you do?</h4>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {relevantSlots.map((slot) => {
              const block = getBlockForSlot(slot)
              const reflection = getReflectionForSlot(slot)
              const isEditing = editingSlots[slot] !== undefined
              const isSaving = savingSlots.has(slot)

              return (
                <div key={slot} style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr auto',
                  gap: '0.75rem',
                  alignItems: 'center',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '10px',
                  background: block ? 'rgba(0, 136, 255, 0.04)' : 'var(--surface)',
                  border: `1px solid ${block ? 'rgba(0, 136, 255, 0.12)' : 'var(--surface-border)'}`,
                  transition: 'all 0.2s',
                }}>
                  {/* Time label */}
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {formatMinutes24(slot)}
                    </div>
                    {block && (
                      <div style={{ fontSize: '0.6rem', color: 'var(--accent-secondary)', fontWeight: 600, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>
                        {block.task}
                      </div>
                    )}
                  </div>

                  {/* Content area */}
                  {isEditing || !reflection ? (
                    <input
                      type="text"
                      value={editingSlots[slot] ?? reflection?.content ?? ''}
                      onChange={(e) => setEditingSlots((prev) => ({ ...prev, [slot]: e.target.value }))}
                      onFocus={() => {
                        if (editingSlots[slot] === undefined) {
                          setEditingSlots((prev) => ({ ...prev, [slot]: reflection?.content ?? '' }))
                        }
                      }}
                      placeholder={block ? `What did you do during "${block.task}"?` : 'What were you doing at this time?'}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editingSlots[slot]?.trim()) {
                          handleSaveReflection(slot)
                        }
                      }}
                      style={{
                        width: '100%', background: 'transparent', border: 'none', outline: 'none',
                        padding: '0.4rem 0', fontSize: '0.82rem', color: 'var(--text-primary)',
                        fontFamily: 'var(--font-sans)',
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => setEditingSlots((prev) => ({ ...prev, [slot]: reflection.content }))}
                      style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.4rem 0' }}
                    >
                      {reflection.content}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    {editingSlots[slot] !== undefined && editingSlots[slot]?.trim() && (
                      <button
                        onClick={() => handleSaveReflection(slot)}
                        disabled={isSaving}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', padding: '0.3rem', cursor: 'pointer', opacity: isSaving ? 0.5 : 1 }}
                      >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      </button>
                    )}
                    {reflection && (
                      <button
                        onClick={() => handleDeleteReflection(reflection.id, slot)}
                        disabled={deletingIds.has(reflection.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', padding: '0.3rem', cursor: 'pointer' }}
                        className="hover-text-red"
                      >
                        {deletingIds.has(reflection.id) ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <style dangerouslySetInnerHTML={{__html: `
        .hover-bg-surface:hover { background: var(--surface) !important; color: var(--text-primary) !important; }
        .hover-text-red:hover { color: #ff5577 !important; }
        @media (max-width: 600px) {
          .reflection-grid { grid-template-columns: 60px 1fr auto !important; }
        }
      `}} />
    </div>
  )
}
