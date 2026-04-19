'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, Clock3, GripVertical, Loader2, Pencil, Plus, Trash2, X, ChevronLeft, ChevronRight, Activity } from 'lucide-react'
import { createRoutineBlock, deleteRoutineBlock, getRoutineBlocks, reorderRoutineBlocks, updateRoutineBlock } from '@/actions/routines'
import { useToast } from '@/components/ToastProvider'
import TodoList from '@/components/TodoList'
import DateTimePicker from '@/components/DateTimePicker'

type RoutineBlock = {
  id: string
  userId: string
  planDate: Date | string
  task: string
  startMinutes: number
  endMinutes: number
  createdAt: Date | string
  updatedAt: Date | string
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
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getCurrentDayMinutes(date: Date): number {
  return (date.getHours() * 60) + date.getMinutes() + (date.getSeconds() / 60)
}

function sortBlocks(blocks: RoutineBlock[]): RoutineBlock[] {
  return [...blocks].sort((a, b) => a.startMinutes - b.startMinutes)
}

function reorderBlocksById(blocks: RoutineBlock[], draggingId: string, targetId: string): RoutineBlock[] {
  const startIdx = blocks.findIndex((block) => block.id === draggingId)
  const endIdx = blocks.findIndex((block) => block.id === targetId)

  if (startIdx < 0 || endIdx < 0 || startIdx === endIdx) return blocks

  const copy = [...blocks]
  const [moved] = copy.splice(startIdx, 1)
  copy.splice(endIdx, 0, moved)
  return copy
}

export default function RoutinePlanner() {
  const { toast } = useToast()
  const [now, setNow] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(() => normalizeToLocalDay(new Date()))

  const [selectedBlocks, setSelectedBlocks] = useState<RoutineBlock[]>([])
  const [isLoadingSelected, setIsLoadingSelected] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [editTask, setEditTask] = useState('')
  const [editStartTime, setEditStartTime] = useState('09:00')
  const [editEndTime, setEditEndTime] = useState('10:00')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const [task, setTask] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:30')

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<'createStart' | 'createEnd' | 'editStart' | 'editEnd' | 'routineDate' | null>(null)
  const [pickerInitialDate, setPickerInitialDate] = useState<Date>(new Date())

  const openPicker = (target: 'createStart' | 'createEnd' | 'editStart' | 'editEnd', currentStr: string) => {
    const [h, m] = currentStr.split(':').map(Number)
    const d = new Date()
    d.setHours(h || 0)
    d.setMinutes(m || 0)
    setPickerInitialDate(d)
    setPickerTarget(target)
    setPickerOpen(true)
  }

  const handleTimeSelect = (date: Date, endDate?: Date) => {
    const toTimeStr = (value: Date) => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
    const timeStr = toTimeStr(date)
    const endTimeStr = endDate ? toTimeStr(endDate) : null

    if (pickerTarget === 'createStart') {
      setStartTime(timeStr)
      if (endTimeStr) setEndTime(endTimeStr)
    } else if (pickerTarget === 'createEnd') {
      setEndTime(endTimeStr || timeStr)
    } else if (pickerTarget === 'editStart') {
      setEditStartTime(timeStr)
      if (endTimeStr) setEditEndTime(endTimeStr)
    } else if (pickerTarget === 'editEnd') {
      setEditEndTime(endTimeStr || timeStr)
    } else if (pickerTarget === 'routineDate') {
      const nextDay = new Date(selectedDate)
      nextDay.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
      setSelectedDate(normalizeToLocalDay(nextDay))
    }
  }

  const selectedDateKey = useMemo(() => dateKey(selectedDate), [selectedDate])
  const todayDate = useMemo(() => normalizeToLocalDay(now), [now.getFullYear(), now.getMonth(), now.getDate()])
  const isSelectedToday = selectedDateKey === dateKey(todayDate)

  // Poller for current time
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadBlocksForDate = useCallback(async (date: Date): Promise<RoutineBlock[]> => {
    const result = await getRoutineBlocks(dateKey(date))
    if ('error' in result) {
      toast(result.error, 'error')
      return []
    }
    return sortBlocks(result.data)
  }, [toast])

  useEffect(() => {
    let active = true
    const loadSelected = async () => {
      setIsLoadingSelected(true)
      const blocks = await loadBlocksForDate(selectedDate)
      if (active) {
        setSelectedBlocks(blocks)
        setIsLoadingSelected(false)
      }
    }
    loadSelected()
    return () => { active = false }
  }, [loadBlocksForDate, selectedDate, selectedDateKey])

  const nowMinutes = getCurrentDayMinutes(now)

  const handleCreateBlock = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isCreating) return

    const trimmedTask = task.trim()
    if (!trimmedTask) {
      toast('Please enter a task for this block.', 'error')
      return
    }

    setIsCreating(true)
    const targetDate = normalizeToLocalDay(selectedDate)
    const result = await createRoutineBlock(trimmedTask, dateKey(targetDate), startTime, endTime)

    if ('error' in result) {
      toast(result.error, 'error')
    } else {
      setSelectedBlocks((prev) => sortBlocks([...prev, result.data]))
      setTask('')
      toast('Routine block added.', 'success')
    }
    setIsCreating(false)
  }

  const handleDeleteBlock = async (id: string) => {
    const previousSelected = selectedBlocks
    setDeletingIds((prev) => new Set(prev).add(id))
    setSelectedBlocks((prev) => prev.filter((block) => block.id !== id))

    const result = await deleteRoutineBlock(id)
    if ('error' in result) {
      setSelectedBlocks(previousSelected)
      toast(result.error, 'error')
    } else {
      toast('Routine block removed.', 'success')
    }
    setDeletingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const startEditBlock = (block: RoutineBlock) => {
    setEditingId(block.id)
    setEditTask(block.task)
    setEditStartTime(formatMinutes(block.startMinutes))
    setEditEndTime(formatMinutes(block.endMinutes))
  }

  const cancelEditBlock = () => {
    setEditingId(null)
  }

  const saveEditBlock = async () => {
    if (!editingId || isSavingEdit) return
    setIsSavingEdit(true)

    const result = await updateRoutineBlock(editingId, {
      task: editTask,
      startTime: editStartTime,
      endTime: editEndTime,
    })

    if ('error' in result) {
      toast(result.error, 'error')
      setIsSavingEdit(false)
      return
    }

    setSelectedBlocks((prev) => sortBlocks(prev.map((block) => (block.id === editingId ? result.data : block))))
    toast('Routine block updated.', 'success')
    setIsSavingEdit(false)
    cancelEditBlock()
  }

  const onDragStart = (id: string) => { if (!editingId) setDraggingId(id) }
  const onDragOver = (e: React.DragEvent<HTMLLIElement>, id: string) => {
    e.preventDefault()
    if (draggingId && draggingId !== id) setDragOverId(id)
  }

  const onDrop = async (e: React.DragEvent<HTMLLIElement>, id: string) => {
    e.preventDefault()
    if (!draggingId || draggingId === id || isReordering) {
      setDraggingId(null); setDragOverId(null); return
    }

    const previousSelected = selectedBlocks
    const reordered = reorderBlocksById(selectedBlocks, draggingId, id)
    if (reordered === selectedBlocks) {
      setDraggingId(null); setDragOverId(null); return
    }

    setSelectedBlocks(reordered)
    setIsReordering(true)

    const result = await reorderRoutineBlocks(dateKey(selectedDate), reordered.map((block) => block.id))
    if ('error' in result) {
      setSelectedBlocks(previousSelected)
      toast(result.error, 'error')
    } else {
      setSelectedBlocks(sortBlocks(result.data))
      toast('Routine reordered.', 'success')
    }

    setIsReordering(false)
    setDraggingId(null)
    setDragOverId(null)
  }

  const changeDate = (days: number) => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + days)
    setSelectedDate(normalizeToLocalDay(next))
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
      
      {/* LEFT COLUMN: Routine Planner */}
      <section className="glass p-6 md:p-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Elite Header & Date Navigation */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CalendarDays size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-primary)', fontWeight: 700 }}>
              Routine blocks
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface-active)', padding: '0.3rem', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
            <button onClick={() => changeDate(-1)} style={{ padding: '0.4rem', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }} className="hover-bg-surface"><ChevronLeft size={16} /></button>
            <div 
              onClick={() => { setPickerTarget('routineDate'); setPickerInitialDate(selectedDate); setPickerOpen(true); }}
              style={{ padding: '0 0.75rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: '130px', textAlign: 'center', cursor: 'pointer' }} 
              className="hover-bg-surface"
            >
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

        {/* Elegant Creation Form */}
        <form onSubmit={handleCreateBlock} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto auto', gap: '0.5rem', background: 'var(--surface)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--surface-border)', alignItems: 'center' }} className="routine-form-grid">
          <input type="text" value={task} onChange={(e) => setTask(e.target.value)} placeholder="Task (e.g. Deep Work)..." style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0.6rem 0.8rem', fontSize: '0.85rem', color: 'var(--text-primary)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0 0.5rem', borderLeft: '1px solid var(--surface-border)' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Start</span>
            <button type="button" onClick={() => openPicker('createStart', startTime)} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.2rem', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>{startTime}</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0 0.5rem', borderLeft: '1px solid var(--surface-border)' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>End</span>
            <button type="button" onClick={() => openPicker('createEnd', endTime)} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.2rem', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>{endTime}</button>
          </div>
          <button type="submit" disabled={isCreating} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', transition: 'all 0.2s', opacity: isCreating ? 0.6 : 1 }}>
             {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
          </button>
        </form>

        {/* Blocks List */}
        <div style={{ minHeight: '300px' }}>
          {isLoadingSelected ? (
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <Loader2 size={24} className="animate-spin" />
             </div>
          ) : selectedBlocks.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)', fontSize: '0.9rem', border: '1px dashed var(--surface-border)', borderRadius: '12px' }}>
                No routine blocks scheduled for this date.
             </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {selectedBlocks.map((block) => {
                const isDeleting = deletingIds.has(block.id)
                const isEditing = editingId === block.id
                const isDropTarget = dragOverId === block.id && draggingId !== block.id
                
                // Active indicators
                const isActiveNow = isSelectedToday && block.startMinutes <= nowMinutes && nowMinutes < block.endMinutes
                const totalMins = block.endMinutes - block.startMinutes
                const passedMins = nowMinutes - block.startMinutes
                const rawProgress = totalMins > 0 ? (passedMins / totalMins) * 100 : 0
                const progressPct = Math.min(Math.max(rawProgress, 0), 100)

                return (
                  <li
                    key={block.id}
                    draggable={!isEditing && !isReordering && !isSavingEdit}
                    onDragStart={() => onDragStart(block.id)}
                    onDragOver={(e) => onDragOver(e, block.id)}
                    onDrop={(e) => onDrop(e, block.id)}
                    onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                    style={{
                      position: 'relative', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem 1rem', borderRadius: '12px',
                      background: isActiveNow ? 'var(--bg-tertiary)' : (isDropTarget ? 'var(--surface-hover)' : 'var(--surface)'),
                      border: `1px solid ${isActiveNow ? 'var(--accent-primary)' : 'var(--surface-border)'}`,
                      boxShadow: isActiveNow ? '0 0 15px rgba(124, 58, 237, 0.15)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Active Background Fill */}
                    {isActiveNow && (
                       <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progressPct}%`, background: 'var(--accent-primary)', opacity: 0.1, zIndex: 0 }} />
                    )}

                    <button title="Drag to reorder" style={{ cursor: 'grab', background: 'none', border: 'none', color: 'var(--text-tertiary)', padding: '0.2rem', zIndex: 1 }}>
                      <GripVertical size={16} />
                    </button>

                    {isEditing ? (
                      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: '0.5rem', alignItems: 'center', zIndex: 1 }}>
                        <input type="text" value={editTask} onChange={(e) => setEditTask(e.target.value)} style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--surface-border)', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem', color: 'white', outline: 'none' }} />
                        <button type="button" onClick={() => openPicker('editStart', editStartTime)} style={{ background: 'var(--bg-primary)', border: '1px solid var(--surface-border)', padding: '0.4rem', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>{editStartTime}</button>
                        <button type="button" onClick={() => openPicker('editEnd', editEndTime)} style={{ background: 'var(--bg-primary)', border: '1px solid var(--surface-border)', padding: '0.4rem', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>{editEndTime}</button>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button onClick={saveEditBlock} disabled={isSavingEdit} style={{ background: 'var(--surface-border)', color: '#10b981', border: 'none', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Check size={14} /></button>
                          <button onClick={cancelEditBlock} style={{ background: 'var(--surface-border)', color: 'var(--text-secondary)', border: 'none', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} /></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: isActiveNow ? 'var(--accent-primary)' : 'var(--text-secondary)', zIndex: 1 }}>
                          {formatMinutes(block.startMinutes)} - {formatMinutes(block.endMinutes)}
                        </div>
                        <div style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: isActiveNow ? 600 : 400, zIndex: 1 }}>
                          {block.task}
                          {isActiveNow && <span style={{ marginLeft: '10px', fontSize: '0.65rem', textTransform: 'uppercase', padding: '2px 6px', background: 'var(--accent-primary)', color: 'white', borderRadius: '4px', letterSpacing: '0.05em' }}>In Progress</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem', zIndex: 1 }}>
                          <button onClick={() => startEditBlock(block)} disabled={isDeleting || Boolean(editingId)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', padding: '0.4rem', cursor: 'pointer', transition: 'color 0.2s' }} className="hover-text-primary">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDeleteBlock(block.id)} disabled={isDeleting || Boolean(editingId)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', padding: '0.4rem', cursor: 'pointer', transition: 'color 0.2s' }} className="hover-text-red">
                            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {/* RIGHT COLUMN: Todos */}
      <section style={{ display: 'flex', flexDirection: 'column' }}>
         <TodoList
            selectedDate={selectedDate}
            title={`Todos for ${isSelectedToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            showDateBadge={false}
         />
      </section>

      <DateTimePicker
         isOpen={pickerOpen}
         onClose={() => setPickerOpen(false)}
         onSelect={handleTimeSelect}
         initialDate={pickerInitialDate}
         mode={pickerTarget === 'routineDate' ? 'date' : 'datetime'}
      />
      
      <style dangerouslySetInnerHTML={{__html: `
        .routine-form-grid { grid-template-columns: minmax(0, 1fr) auto auto auto; }
        @media (max-width: 600px) {
           .routine-form-grid { grid-template-columns: 1fr; }
           .routine-form-grid input[type="text"] { border-bottom: 1px solid var(--surface-border) !important; margin-bottom: 0.25rem; }
           .routine-form-grid > div { border-left: none !important; padding: 0.25rem 0 !important; }
           .routine-form-grid button[type="submit"] { width: 100% !important; margin-top: 0.25rem; }
        }
        .hover-bg-surface:hover { background: var(--surface) !important; color: var(--text-primary) !important; }
        .hover-text-primary:hover { color: var(--accent-primary) !important; }
        .hover-text-red:hover { color: #ff5577 !important; }
        input[type="time"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; filter: invert(0.8); }
      `}} />
    </div>
  )
}
