'use client'

import { useState } from 'react'
import { createTimeEntry } from '@/actions/timeEntries'
import { createCategory } from '@/actions/categories'
import { useToast } from '@/components/ToastProvider'
import { Plus, Clock } from 'lucide-react'

export default function ManualEntryForm({ categories, tags }: { categories: any[]; tags: any[] }) {
  const { toast } = useToast()
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let cid = categoryId

      if (newCatName.trim()) {
        const cat = await createCategory(newCatName.trim())
        cid = cat.id
        setNewCatName('')
      }

      const start = new Date(startTime)
      const end = new Date(endTime)
      const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000)

      if (durationSeconds <= 0) {
        toast('End time must be after start time!', 'error')
        setLoading(false)
        return
      }

      await createTimeEntry({
        description: description || undefined,
        startTime: start,
        endTime: end,
        durationSeconds,
        categoryId: cid || undefined,
        tagIds: selectedTags.length > 0 ? selectedTags : undefined,
      })

      toast('Time block logged!', 'success')
      setDescription('')
      setStartTime('')
      setEndTime('')
      setCategoryId('')
      setSelectedTags([])
    } catch (err) {
      toast('Failed to save entry.', 'error')
    }
    setLoading(false)
  }

  return (
    <div className="glass">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <Clock size={20} style={{ color: 'var(--accent-primary)' }} />
        <h3>Manual Entry</h3>
      </div>

      <form onSubmit={handleSubmit} className="flex-col gap-md">
        <div className="grid-2">
          <label>
            <span>Start Time</span>
            <input required type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label>
            <span>End Time</span>
            <input required type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>

        <label>
          <span>Activity</span>
          <input type="text" placeholder="What were you doing?" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="grid-2">
          <label>
            <span>Category</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select category...</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Or create new</span>
            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
              <input type="text" placeholder="New category..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
            </div>
          </label>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <span className="text-xs text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-xs)', display: 'block' }}>Tags</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
              {tags.map((tag: any) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`chip ${selectedTags.includes(tag.id) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag.id)}
                  style={selectedTags.includes(tag.id) ? { borderColor: tag.color, background: `${tag.color}22` } : {}}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: tag.color }} />
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}
          style={{ marginTop: 'var(--space-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)' }}>
          <Plus size={18} />
          {loading ? 'Saving...' : 'Save Entry'}
        </button>
      </form>
    </div>
  )
}
