'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
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
}

export default function TodoList({ selectedDate }: TodoListProps) {
  const { toast } = useToast()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [newTask, setNewTask] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const selectedDateMs = selectedDate.getTime()

  const sortedTodos = useMemo(
    () => [...todos].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [todos]
  )

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
    <section className="glass reveal-up p-6" style={{ '--reveal-delay': '120ms' } as React.CSSProperties}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Daily Todo</h3>
        <span className="text-xs text-[var(--text-tertiary)]">
          {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </div>

      <form onSubmit={handleCreateTodo} className="mb-4 flex items-center gap-2">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a task for this day..."
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

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-4 text-sm text-[var(--text-secondary)]">
          <Loader2 size={16} className="animate-spin" /> Loading todos...
        </div>
      ) : sortedTodos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--surface-border)] px-3 py-4 text-sm text-[var(--text-secondary)]">
          No tasks for this date yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {sortedTodos.map((todo) => {
            const isToggling = togglingIds.has(todo.id)
            const isDeleting = deletingIds.has(todo.id)

            return (
              <li
                key={todo.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2"
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
