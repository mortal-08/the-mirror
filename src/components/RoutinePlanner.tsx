'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, Clock3, GripVertical, Loader2, Pencil, Plus, Timer, Trash2, X } from 'lucide-react'
import { createRoutineBlock, deleteRoutineBlock, getRoutineBlocks, reorderRoutineBlocks, updateRoutineBlock } from '@/actions/routines'
import { useToast } from '@/components/ToastProvider'
import TodoList from '@/components/TodoList'

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

function toDateInputValue(date: Date): string {
  return dateKey(date)
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getCurrentDayMinutes(date: Date): number {
  return (date.getHours() * 60) + date.getMinutes()
}

function sortBlocks(blocks: RoutineBlock[]): RoutineBlock[] {
  return [...blocks].sort((a, b) => a.startMinutes - b.startMinutes)
}

function reorderBlocksById(blocks: RoutineBlock[], draggingId: string, targetId: string): RoutineBlock[] {
  const startIdx = blocks.findIndex((block) => block.id === draggingId)
  const endIdx = blocks.findIndex((block) => block.id === targetId)

  if (startIdx < 0 || endIdx < 0 || startIdx === endIdx) {
    return blocks
  }

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
  const [todayBlocks, setTodayBlocks] = useState<RoutineBlock[]>([])

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

  const selectedDateKey = useMemo(() => dateKey(selectedDate), [selectedDate])
  const todayDate = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    [now.getFullYear(), now.getMonth(), now.getDate()]
  )
  const todayDateKey = useMemo(() => dateKey(todayDate), [todayDate])
  const isSelectedToday = selectedDateKey === todayDateKey

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadBlocksForDate = useCallback(
    async (date: Date): Promise<RoutineBlock[]> => {
      const result = await getRoutineBlocks(date)
      if ('error' in result) {
        toast(result.error, 'error')
        return []
      }

      return sortBlocks(result.data)
    },
    [toast]
  )

  useEffect(() => {
    const loadSelected = async () => {
      setIsLoadingSelected(true)
      const blocks = await loadBlocksForDate(selectedDate)
      setSelectedBlocks(blocks)
      setIsLoadingSelected(false)

      if (selectedDateKey === todayDateKey) {
        setTodayBlocks(blocks)
      }
    }

    loadSelected()
  }, [loadBlocksForDate, selectedDate, selectedDateKey, todayDateKey])

  useEffect(() => {
    const loadToday = async () => {
      const blocks = await loadBlocksForDate(todayDate)
      setTodayBlocks(blocks)
    }

    if (selectedDateKey !== todayDateKey) {
      loadToday()
    }
  }, [loadBlocksForDate, selectedDateKey, todayDate, todayDateKey])

  const nowMinutes = getCurrentDayMinutes(now)

  const activeBlock = useMemo(
    () => todayBlocks.find((block) => block.startMinutes <= nowMinutes && nowMinutes < block.endMinutes),
    [todayBlocks, nowMinutes]
  )

  const nextBlock = useMemo(
    () => todayBlocks.find((block) => block.startMinutes > nowMinutes),
    [todayBlocks, nowMinutes]
  )

  const activeProgress = useMemo(() => {
    if (!activeBlock) return 0

    const total = activeBlock.endMinutes - activeBlock.startMinutes
    if (total <= 0) return 0

    const elapsed = nowMinutes - activeBlock.startMinutes
    const raw = (elapsed / total) * 100
    return Math.min(Math.max(raw, 0), 100)
  }, [activeBlock, nowMinutes])

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
    const result = await createRoutineBlock(trimmedTask, targetDate, startTime, endTime)

    if ('error' in result) {
      toast(result.error, 'error')
    } else {
      const created = result.data
      setSelectedBlocks((prev) => sortBlocks([...prev, created]))

      if (selectedDateKey === todayDateKey) {
        setTodayBlocks((prev) => sortBlocks([...prev, created]))
      }

      setTask('')
      toast('Routine block added.', 'success')
    }

    setIsCreating(false)
  }

  const handleDeleteBlock = async (id: string) => {
    const previousSelected = selectedBlocks
    const previousToday = todayBlocks

    setDeletingIds((prev) => new Set(prev).add(id))
    setSelectedBlocks((prev) => prev.filter((block) => block.id !== id))
    setTodayBlocks((prev) => prev.filter((block) => block.id !== id))

    const result = await deleteRoutineBlock(id)
    if ('error' in result) {
      setSelectedBlocks(previousSelected)
      setTodayBlocks(previousToday)
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
    setEditTask('')
    setEditStartTime('09:00')
    setEditEndTime('10:00')
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

    if (selectedDateKey === todayDateKey) {
      setTodayBlocks((prev) => sortBlocks(prev.map((block) => (block.id === editingId ? result.data : block))))
    }

    toast('Routine block updated.', 'success')
    setIsSavingEdit(false)
    cancelEditBlock()
  }

  const onDragStart = (id: string) => {
    if (editingId) return
    setDraggingId(id)
  }

  const onDragOver = (e: React.DragEvent<HTMLLIElement>, id: string) => {
    e.preventDefault()
    if (!draggingId || draggingId === id) return
    setDragOverId(id)
  }

  const onDrop = async (e: React.DragEvent<HTMLLIElement>, id: string) => {
    e.preventDefault()

    if (!draggingId || draggingId === id || isReordering) {
      setDraggingId(null)
      setDragOverId(null)
      return
    }

    const previousSelected = selectedBlocks
    const reordered = reorderBlocksById(selectedBlocks, draggingId, id)

    if (reordered === selectedBlocks) {
      setDraggingId(null)
      setDragOverId(null)
      return
    }

    setSelectedBlocks(reordered)
    setIsReordering(true)

    const result = await reorderRoutineBlocks(selectedDate, reordered.map((block) => block.id))

    if ('error' in result) {
      setSelectedBlocks(previousSelected)
      toast(result.error, 'error')
    } else {
      const sorted = sortBlocks(result.data)
      setSelectedBlocks(sorted)
      if (selectedDateKey === todayDateKey) {
        setTodayBlocks(sorted)
      }
      toast('Routine reordered.', 'success')
    }

    setIsReordering(false)
    setDraggingId(null)
    setDragOverId(null)
  }

  return (
    <section className="glass reveal-up" style={{ '--reveal-delay': '180ms', padding: '2rem' } as React.CSSProperties}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} color="var(--accent-secondary)" />
          <h3 style={{ margin: 0, fontSize: '0.9rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Routine Planning
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={toDateInputValue(selectedDate)}
            onChange={(e) => setSelectedDate(normalizeToLocalDay(new Date(`${e.target.value}T00:00:00`)))}
            className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--surface-border-hover)]"
          />
          <button
            type="button"
            onClick={() => setSelectedDate(normalizeToLocalDay(new Date()))}
            className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] transition hover:border-[var(--surface-border-hover)]"
          >
            Today
          </button>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
          <Timer size={14} /> Accountability
        </div>

        {activeBlock ? (
          <div>
            <p className="text-sm text-[var(--text-secondary)]">You should be doing:</p>
            <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">{activeBlock.task}</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              {formatMinutes(activeBlock.startMinutes)} - {formatMinutes(activeBlock.endMinutes)}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${activeProgress}%`, background: 'var(--accent-gradient)' }}
              />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[var(--text-secondary)]">No active routine block right now.</p>
            {nextBlock ? (
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                Next: {nextBlock.task} at {formatMinutes(nextBlock.startMinutes)}
              </p>
            ) : (
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">No more blocks scheduled for today.</p>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleCreateBlock} className="grid gap-3 md:grid-cols-[1fr_130px_130px_auto] md:items-end">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Task</label>
          <input
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Deep Work, Review, Exercise..."
            className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--surface-border-hover)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Start</label>
          <input
            type="time"
            step={60}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--surface-border-hover)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-[var(--text-tertiary)]">End</label>
          <input
            type="time"
            step={60}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--surface-border-hover)]"
          />
        </div>

        <button
          type="submit"
          disabled={isCreating}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-inverse)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Add Block
        </button>
      </form>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
            <Clock3 size={14} />
            Blocks for {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </h4>

          {isLoadingSelected ? (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-4 text-sm text-[var(--text-secondary)]">
              <Loader2 size={16} className="animate-spin" /> Loading blocks...
            </div>
          ) : selectedBlocks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--surface-border)] px-3 py-4 text-sm text-[var(--text-secondary)]">
              No routine blocks for this date yet.
            </div>
          ) : (
            <>
              <div className="mb-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                Drag a block row to quickly reassign task order across your existing time slots.
              </div>

              <ul className="space-y-2">
              {selectedBlocks.map((block) => {
                const isDeleting = deletingIds.has(block.id)
                const isActiveNow = selectedDateKey === todayDateKey
                  && block.startMinutes <= nowMinutes
                  && nowMinutes < block.endMinutes
                const isEditing = editingId === block.id
                const isDropTarget = dragOverId === block.id && draggingId !== block.id

                return (
                  <li
                    key={block.id}
                    draggable={!isEditing && !isReordering && !isSavingEdit}
                    onDragStart={() => onDragStart(block.id)}
                    onDragOver={(e) => onDragOver(e, block.id)}
                    onDrop={(e) => onDrop(e, block.id)}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setDragOverId(null)
                    }}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                      isDropTarget
                        ? 'border-[var(--accent-secondary)] bg-[var(--surface-hover)]'
                        : isActiveNow
                        ? 'border-[var(--accent-primary)] bg-[var(--surface-active)]'
                        : 'border-[var(--surface-border)] bg-[var(--surface)]'
                    }`}
                  >
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)]"
                      title="Drag to reorder"
                    >
                      <GripVertical size={15} />
                    </button>

                    {isEditing ? (
                      <>
                        <div className="grid flex-1 gap-2 md:grid-cols-[1fr_120px_120px]">
                          <input
                            type="text"
                            value={editTask}
                            onChange={(e) => setEditTask(e.target.value)}
                            className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
                            placeholder="Task"
                          />
                          <input
                            type="time"
                            step={60}
                            value={editStartTime}
                            onChange={(e) => setEditStartTime(e.target.value)}
                            className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
                          />
                          <input
                            type="time"
                            step={60}
                            value={editEndTime}
                            onChange={(e) => setEditEndTime(e.target.value)}
                            className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={saveEditBlock}
                            disabled={isSavingEdit}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Save routine block"
                          >
                            {isSavingEdit ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
                          </button>

                          <button
                            type="button"
                            onClick={cancelEditBlock}
                            disabled={isSavingEdit}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Cancel editing routine block"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="min-w-[88px] text-sm font-semibold text-[var(--text-secondary)]">
                          {formatMinutes(block.startMinutes)} - {formatMinutes(block.endMinutes)}
                        </div>

                        <div className="flex-1 text-sm text-[var(--text-primary)]">{block.task}</div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditBlock(block)}
                            disabled={isDeleting || Boolean(editingId)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Edit routine block"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(block.id)}
                            disabled={isDeleting || Boolean(editingId)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Delete routine block"
                          >
                            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                )
              })}
              </ul>
            </>
          )}
        </div>

        {isSelectedToday ? (
          <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-4">
            <h4 className="mb-2 text-sm font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
              Todos for Planned Date
            </h4>
            <p className="text-sm text-[var(--text-secondary)]">
              You are planning for today. Use the "Today's Accountability Todos" panel above to manage current-day tasks.
            </p>
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">
              Pick another date to plan a future todo list alongside routine blocks.
            </p>
          </div>
        ) : (
          <TodoList
            selectedDate={selectedDate}
            title="Todos for Planned Date"
            compact
            showDateBadge={false}
          />
        )}
      </div>
    </section>
  )
}
