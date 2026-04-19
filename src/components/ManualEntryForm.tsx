'use client'

import { useEffect, useMemo, useState } from 'react'
import { createTimeEntry } from '@/actions/timeEntries'
import { createCategory } from '@/actions/categories'
import { useToast } from '@/components/ToastProvider'
import { Plus, Clock, Calendar, Tag } from 'lucide-react'
import DateTimePicker from '@/components/DateTimePicker'

export default function ManualEntryForm({ categories }: { categories: any[] }) {
  const { toast } = useToast()
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(30)
  const [categoryId, setCategoryId] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedCategory = useMemo(
    () => categories.find((category: any) => category.id === categoryId),
    [categories, categoryId]
  )

  const categoryTags = useMemo(
    () => selectedCategory?.tags || [],
    [selectedCategory]
  )

  useEffect(() => {
    if (!categoryId) {
      setTagIds([])
      return
    }

    const allowedTagIds = new Set(categoryTags.map((tag: any) => tag.id))
    setTagIds((prev) => prev.filter((tagId) => allowedTagIds.has(tagId)))
  }, [categoryId, categoryTags])

  const toggleTag = (id: string) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((tagId) => tagId !== id) : [...prev, id]))
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

      const totalSeconds = (hours * 3600) + (minutes * 60)
      if (totalSeconds <= 0) {
        toast('Duration must be greater than 0!', 'error')
        setLoading(false)
        return
      }

      // Calculate end time from chosen date + current time - duration
      const now = new Date()
      const endTime = new Date(`${date}T${now.toTimeString().split(' ')[0]}`)
      const startTime = new Date(endTime.getTime() - totalSeconds * 1000)

      await createTimeEntry({
        description: description || undefined,
        startTime,
        endTime,
        durationSeconds: totalSeconds,
        categoryId: cid || undefined,
        tagIds: tagIds.length > 0 ? tagIds : undefined,
      })

      toast('Time entry logged!', 'success')
      setDescription('')
      setHours(0)
      setMinutes(30)
      setCategoryId('')
      setTagIds([])
    } catch (err) {
      toast('Failed to save entry.', 'error')
    }
    setLoading(false)
  }

  const quickDurations = [
    { label: '15m', h: 0, m: 15 },
    { label: '30m', h: 0, m: 30 },
    { label: '1h', h: 1, m: 0 },
    { label: '1.5h', h: 1, m: 30 },
    { label: '2h', h: 2, m: 0 },
    { label: '3h', h: 3, m: 0 },
  ]

  return (
    <div className="glass">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Clock size={20} style={{ color: 'var(--accent-primary)' }} />
        <h3 style={{ margin: 0 }}>Quick Log</h3>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* What did you do */}
        <div>
          <label>What did you work on?</label>
          <input type="text" placeholder="e.g., Studied algorithms, Gym workout..." value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {/* Date */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={14} /> Date</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className={date === new Date().toISOString().split('T')[0] ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              onClick={() => setDate(new Date().toISOString().split('T')[0])}>
              Today
            </button>
            <button type="button"
              className={date === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              onClick={() => setDate(new Date(Date.now() - 86400000).toISOString().split('T')[0])}>
              Yesterday
            </button>
            <button type="button" className="btn-secondary" onClick={() => setPickerOpen(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
               {date}
            </button>
          </div>
        </div>

        {/* Duration - Quick picks */}
        <div>
          <label>How long?</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {quickDurations.map((d) => (
              <button key={d.label} type="button"
                className={hours === d.h && minutes === d.m ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                onClick={() => { setHours(d.h); setMinutes(d.m) }}>
                {d.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="number" min={0} max={23} value={hours} onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                style={{ width: '70px', textAlign: 'center', fontSize: '1.2rem', fontFamily: 'var(--font-mono)', padding: '0.75rem' }} />
              <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600 }}>hrs</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="number" min={0} max={59} step={5} value={minutes} onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                style={{ width: '70px', textAlign: 'center', fontSize: '1.2rem', fontFamily: 'var(--font-mono)', padding: '0.75rem' }} />
              <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600 }}>min</span>
            </div>
          </div>
        </div>

        {/* Category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="grid-2">
          <div>
            <label>Category</label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button type="button" className={!categoryId ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                onClick={() => {
                  setCategoryId('')
                  setTagIds([])
                }}>
                None
              </button>
              {categories.map((c: any) => (
                <button key={c.id} type="button"
                  className={categoryId === c.id ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                  onClick={() => setCategoryId(c.id)}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label>Or create new</label>
            <input type="text" placeholder="New category..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
          </div>
        </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Tag size={14} /> Tags in selected category</label>
            {!categoryId ? (
              <div className="text-sm text-secondary" style={{ marginTop: '0.35rem' }}>
                Select a category first to choose relevant tags.
              </div>
            ) : categoryTags.length === 0 ? (
              <div className="text-sm text-secondary" style={{ marginTop: '0.35rem' }}>
                No tags linked to this category yet. Add links in Settings.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                {categoryTags.map((tag: any) => {
                  const isSelected = tagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={isSelected ? 'btn-primary' : 'btn-secondary'}
                      style={{
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        borderColor: isSelected ? tag.color : undefined,
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: tag.color }} />
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}
          style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <Plus size={18} />
          {loading ? 'Saving...' : 'Log Entry'}
        </button>
      </form>

      <DateTimePicker
         isOpen={pickerOpen}
         onClose={() => setPickerOpen(false)}
         onSelect={(d) => setDate(d.toISOString().split('T')[0])}
         initialDate={new Date(date)}
         defaultView="date"
         mode="date"
         title="Select Date"
      />
    </div>
  )
}
