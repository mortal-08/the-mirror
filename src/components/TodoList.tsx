'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ListTodo, Loader2, Plus, Trash2 } from 'lucide-react'
import { createTodo, deleteTodo, getTodos, toggleTodo } from '@/actions/todos'
import { useToast } from '@/components/ToastProvider'

type TodoItem = {
  id: string
  userId: string
  task: string
  isCompleted: boolean
  targetDate: Date | string
  createdAt: Date | string
  updatedAt: Date | string
}

type TodoListProps = {
  selectedDate: Date
  title?: string
  compact?: boolean
  showDateBadge?: boolean
}

type TodoFilter = 'ALL' | 'OPEN' | 'DONE'

export default function TodoList({
  selectedDate,
  title = 'Daily Todo',
  compact = false,
  showDateBadge = true,
}: TodoListProps) {
  const { toast } = useToast()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [newTask, setNewTask] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<TodoFilter>('ALL')

  const selectedDateMs = selectedDate.getTime()
  const selectedDateLabel = useMemo(
    () => selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    [selectedDateMs]
  )

  const sortedTodos = useMemo(
    () => [...todos].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [todos]
  )

  const completedCount = useMemo(
    () => sortedTodos.filter((todo) => todo.isCompleted).length,
    [sortedTodos]
  )

  const pendingCount = sortedTodos.length - completedCount

  const completionPercent = useMemo(() => {
    if (sortedTodos.length === 0) return 0
    return Math.round((completedCount / sortedTodos.length) * 100)
  }, [completedCount, sortedTodos.length])

  const filteredTodos = useMemo(() => {
    if (filter === 'OPEN') return sortedTodos.filter((todo) => !todo.isCompleted)
    if (filter === 'DONE') return sortedTodos.filter((todo) => todo.isCompleted)
    return sortedTodos
  }, [filter, sortedTodos])

  useEffect(() => {
    setFilter('ALL')
  }, [selectedDateMs])

  const loadTodos = useCallback(
    async (date: Date) => {
      setIsLoading(true)
      const result = await getTodos(date)

      if ('error' in result) {
        toast(result.error, 'error')
        setTodos([])
      } else {
        setTodos(result.data)
      }

      setIsLoading(false)
    },
    [toast]
  )

  useEffect(() => {
    loadTodos(new Date(selectedDateMs))
  }, [loadTodos, selectedDateMs])

  const handleCreateTodo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const task = newTask.trim()
    if (!task || isCreating) return

    setIsCreating(true)
    const result = await createTodo(task, new Date(selectedDateMs))

    if ('error' in result) {
      toast(result.error, 'error')
    } else {
      setNewTask('')
      setTodos((prev) => [...prev, result.data])
    }

    setIsCreating(false)
  }

  const handleToggleTodo = async (id: string, checked: boolean) => {
    setTogglingIds((prev) => new Set(prev).add(id))

    const previousTodos = todos
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, isCompleted: checked } : todo)))

    const result = await toggleTodo(id, checked)
    if ('error' in result) {
      setTodos(previousTodos)
      toast(result.error, 'error')
    }

    setTogglingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const handleDeleteTodo = async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id))

    const previousTodos = todos
    setTodos((prev) => prev.filter((todo) => todo.id !== id))

    const result = await deleteTodo(id)
    if ('error' in result) {
      setTodos(previousTodos)
      toast(result.error, 'error')
    }

    setDeletingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  return (
    <section
      className={compact ? 'rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-4' : 'glass reveal-up p-6'}
      style={compact ? undefined : ({ '--reveal-delay': '120ms' } as React.CSSProperties)}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListTodo size={18} color="var(--accent-secondary)" />
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{title}</h3>
        </div>

        {showDateBadge && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-tertiary)]">
            <CalendarDays size={12} />
            {selectedDateLabel}
          </span>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-active)] px-2 py-1 font-semibold">
            <CheckCircle2 size={12} /> {completedCount} done
          </span>
          <span className="rounded-full border border-[var(--surface-border)] px-2 py-1">{pendingCount} pending</span>
          <span className="rounded-full border border-[var(--surface-border)] px-2 py-1">{completionPercent}% complete</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
          <div className="h-full rounded-full" style={{ width: `${completionPercent}%`, background: 'var(--accent-gradient)' }} />
        </div>
      </div>

      <form onSubmit={handleCreateTodo} className="mb-4 flex items-center gap-2">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder={`Add a task for ${selectedDateLabel}...`}
          disabled={isCreating}
          className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--surface-border-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isCreating || !newTask.trim()}
          className="inline-flex items-center gap-1 rounded-xl border border-transparent bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-[var(--text-inverse)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Add
        </button>
      </form>

      <div className="mb-3 flex items-center gap-2">
        {(['ALL', 'OPEN', 'DONE'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.08em] transition ${
              filter === value
                ? 'bg-[var(--surface-active)] text-[var(--text-primary)]'
                : 'border border-[var(--surface-border)] text-[var(--text-secondary)] hover:border-[var(--surface-border-hover)]'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-4 text-sm text-[var(--text-secondary)]">
          <Loader2 size={16} className="animate-spin" /> Loading todos...
        </div>
      ) : sortedTodos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--surface-border)] px-3 py-4 text-sm text-[var(--text-secondary)]">
          No tasks for this date yet.
        </div>
      ) : filteredTodos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--surface-border)] px-3 py-4 text-sm text-[var(--text-secondary)]">
          No tasks in this filter.
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredTodos.map((todo) => {
            const isToggling = togglingIds.has(todo.id)
            const isDeleting = deletingIds.has(todo.id)

            return (
              <li
                key={todo.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition ${
                  todo.isCompleted
                    ? 'border-[var(--surface-border)] bg-[var(--surface-active)]'
                    : 'border-[var(--surface-border)] bg-[var(--surface)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={todo.isCompleted}
                  onChange={(e) => handleToggleTodo(todo.id, e.target.checked)}
                  disabled={isToggling || isDeleting}
                  className="h-4 w-4 cursor-pointer accent-[var(--accent-primary)] disabled:cursor-not-allowed"
                />

                <span
                  className={`flex-1 text-sm ${todo.isCompleted ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}`}
                >
                  {todo.task}
                </span>

                <button
                  type="button"
                  onClick={() => handleDeleteTodo(todo.id)}
                  disabled={isDeleting || isToggling}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Delete todo"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
