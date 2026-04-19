'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Circle, ListTodo, Loader2, Plus, Trash2, Check } from 'lucide-react'
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
  title = "Today's Accountability Todos",
  compact = false,
  showDateBadge = false,
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
    <section className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Header Block */}
      <div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <ListTodo size={18} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.03em' }}>{title}</h3>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={13} style={{ opacity: 0.8 }} /> {completedCount} done
            <span style={{ opacity: 0.3 }}>|</span>
            {pendingCount} pending
            <span style={{ opacity: 0.3 }}>|</span>
            {completionPercent}% complete
         </div>
      </div>

      {/* Input Group */}
      <form onSubmit={handleCreateTodo} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
         <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder={`Add a task for ${selectedDateLabel}...`}
            disabled={isCreating}
            style={{
               width: '100%',
               background: 'transparent',
               border: '1px solid var(--surface-border)',
               borderRadius: '12px',
               padding: '0.85rem 1rem',
               fontSize: '0.9rem',
               color: 'var(--text-primary)',
               outline: 'none',
               transition: 'border-color 0.2s'
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--surface-border)' }}
         />
         <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button
               type="submit"
               disabled={isCreating || !newTask.trim()}
               style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'transparent', border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem', fontWeight: 600,
                  cursor: (isCreating || !newTask.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (isCreating || !newTask.trim()) ? 0.4 : 1,
                  padding: '0.4rem 0.2rem', transition: 'color 0.2s'
               }}
               className="hover-text-primary"
            >
               {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
            </button>
         </div>
      </form>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
         {(['ALL', 'OPEN', 'DONE'] as const).map((value) => {
            const isActive = filter === value
            return (
               <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  style={{
                     background: 'transparent', border: 'none',
                     fontSize: '0.75rem', fontWeight: isActive ? 700 : 500,
                     letterSpacing: '0.08em',
                     color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                     cursor: 'pointer',
                     padding: '0.2rem 0',
                     textTransform: 'uppercase',
                     transition: 'all 0.2s'
                  }}
               >
                  {value}
               </button>
            )
         })}
      </div>

      {/* List */}
      <div style={{ minHeight: '150px' }}>
         {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: '1rem 0' }}>
               <Loader2 size={16} className="animate-spin" /> Loading...
            </div>
         ) : sortedTodos.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: '1rem 0' }}>
               No tasks yet. Get started!
            </div>
         ) : filteredTodos.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: '1rem 0' }}>
               No tasks match this filter.
            </div>
         ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
               {filteredTodos.map((todo) => {
                  const isToggling = togglingIds.has(todo.id)
                  const isDeleting = deletingIds.has(todo.id)

                  return (
                     <li
                        key={todo.id}
                        style={{
                           display: 'flex', alignItems: 'center', gap: '12px',
                           padding: '0.2rem 0', opacity: todo.isCompleted ? 0.6 : 1,
                           transition: 'opacity 0.2s'
                        }}
                     >
                        {/* Custom Checkbox */}
                        <button
                           onClick={() => handleToggleTodo(todo.id, !todo.isCompleted)}
                           disabled={isToggling || isDeleting}
                           style={{
                              background: todo.isCompleted ? 'var(--accent-primary)' : 'transparent',
                              border: `2px solid ${todo.isCompleted ? 'var(--accent-primary)' : 'var(--text-tertiary)'}`,
                              borderRadius: '6px',
                              width: '18px', height: '18px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: (isToggling || isDeleting) ? 'not-allowed' : 'pointer',
                              padding: 0,
                              color: 'var(--bg-primary)',
                              transition: 'all 0.2s'
                           }}
                        >
                           {todo.isCompleted && <Check size={12} strokeWidth={3} />}
                        </button>

                        <span style={{
                           flex: 1, fontSize: '0.95rem',
                           color: todo.isCompleted ? 'var(--text-tertiary)' : 'var(--text-primary)',
                           textDecoration: todo.isCompleted ? 'line-through' : 'none'
                        }}>
                           {todo.task}
                        </span>

                        <button
                           type="button"
                           onClick={() => handleDeleteTodo(todo.id)}
                           disabled={isDeleting || isToggling}
                           style={{
                              background: 'transparent', border: 'none',
                              color: 'var(--text-tertiary)', cursor: 'pointer',
                              padding: '4px', display: 'flex', opacity: 0.6
                           }}
                           className="hover-text-red"
                        >
                           {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                     </li>
                  )
               })}
            </ul>
         )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
         .hover-text-primary:hover { color: var(--accent-primary) !important; }
         .hover-text-red:hover { color: #ff5577 !important; opacity: 1 !important; }
      `}} />
    </section>
  )
}
