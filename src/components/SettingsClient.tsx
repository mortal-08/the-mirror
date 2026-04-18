'use client'

import { useState } from 'react'
import { createCategory, updateCategory, deleteCategory } from '@/actions/categories'
import { upsertGoal } from '@/actions/goals'
import { createTag, deleteTag } from '@/actions/tags'
import { useToast } from '@/components/ToastProvider'
import { Plus, Trash2, Target, Tag, Folder } from 'lucide-react'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#a78bfa', '#f97316']

export default function SettingsClient({
  initialCategories,
  initialGoals,
  initialTags,
}: {
  initialCategories: any[]
  initialGoals: any[]
  initialTags: any[]
}) {
  const { toast } = useToast()

  // Goals
  const dailyGoal = initialGoals.find((g: any) => g.type === 'DAILY')
  const weeklyGoal = initialGoals.find((g: any) => g.type === 'WEEKLY')
  const [dailyHours, setDailyHours] = useState(dailyGoal ? dailyGoal.targetSeconds / 3600 : 10)
  const [weeklyHours, setWeeklyHours] = useState(weeklyGoal ? weeklyGoal.targetSeconds / 3600 : 70)

  const saveGoals = async () => {
    await upsertGoal('DAILY', Math.round(dailyHours * 3600))
    await upsertGoal('WEEKLY', Math.round(weeklyHours * 3600))
    toast('Goals saved!', 'success')
  }

  // Categories
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#6366f1')

  const handleAddCat = async () => {
    if (!newCatName.trim()) return
    await createCategory(newCatName.trim(), newCatColor)
    setNewCatName('')
    toast('Category added!', 'success')
  }

  const handleDeleteCat = async (id: string) => {
    if (!confirm('Delete this category?')) return
    await deleteCategory(id)
    toast('Category deleted.', 'success')
  }

  // Tags
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#8b5cf6')

  const handleAddTag = async () => {
    if (!newTagName.trim()) return
    await createTag(newTagName.trim(), newTagColor)
    setNewTagName('')
    toast('Tag added!', 'success')
  }

  const handleDeleteTag = async (id: string) => {
    await deleteTag(id)
    toast('Tag deleted.', 'success')
  }

  return (
    <div className="flex-col gap-xl">
      {/* Goals */}
      <div className="glass">
        <div className="flex-row gap-sm" style={{ marginBottom: 'var(--space-lg)' }}>
          <Target size={20} style={{ color: 'var(--accent-primary)' }} />
          <h3>Goal Targets</h3>
        </div>

        <div className="grid-2">
          <label>
            <span>Daily Goal (hours)</span>
            <input type="number" min={1} max={24} step={0.5} value={dailyHours}
              onChange={(e) => setDailyHours(parseFloat(e.target.value) || 0)} />
          </label>
          <label>
            <span>Weekly Goal (hours)</span>
            <input type="number" min={1} max={168} step={1} value={weeklyHours}
              onChange={(e) => setWeeklyHours(parseFloat(e.target.value) || 0)} />
          </label>
        </div>

        <button className="btn-primary mt-md" onClick={saveGoals}>Save Goals</button>
      </div>

      {/* Categories */}
      <div className="glass">
        <div className="flex-row gap-sm" style={{ marginBottom: 'var(--space-lg)' }}>
          <Folder size={20} style={{ color: 'var(--accent-secondary)' }} />
          <h3>Categories</h3>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
          {initialCategories.map((c: any) => (
            <div key={c.id} className="chip" style={{ borderColor: c.color }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
              {c.name}
              <button onClick={() => handleDeleteCat(c.id)} style={{ marginLeft: '4px', color: 'var(--text-tertiary)' }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end' }}>
          <label style={{ flex: 1 }}>
            <span>New Category</span>
            <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Category name..." onKeyDown={(e) => e.key === 'Enter' && handleAddCat()} />
          </label>
          <div style={{ display: 'flex', gap: '4px', paddingBottom: '2px' }}>
            {COLORS.map((c) => (
              <button key={c} onClick={() => setNewCatColor(c)}
                style={{
                  width: 24, height: 24, borderRadius: '50%', background: c,
                  border: newCatColor === c ? '2px solid white' : '2px solid transparent',
                  transition: 'all 0.15s',
                }} />
            ))}
          </div>
          <button className="btn-primary" onClick={handleAddCat} style={{ padding: '0.75rem' }}>
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="glass">
        <div className="flex-row gap-sm" style={{ marginBottom: 'var(--space-lg)' }}>
          <Tag size={20} style={{ color: 'var(--accent-tertiary)' }} />
          <h3>Tags</h3>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
          {initialTags.map((t: any) => (
            <div key={t.id} className="chip" style={{ borderColor: t.color }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
              {t.name}
              <button onClick={() => handleDeleteTag(t.id)} style={{ marginLeft: '4px', color: 'var(--text-tertiary)' }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {initialTags.length === 0 && (
            <span className="text-sm text-secondary">No tags yet. Add one below.</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end' }}>
          <label style={{ flex: 1 }}>
            <span>New Tag</span>
            <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name..." onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} />
          </label>
          <div style={{ display: 'flex', gap: '4px', paddingBottom: '2px' }}>
            {COLORS.map((c) => (
              <button key={c} onClick={() => setNewTagColor(c)}
                style={{
                  width: 24, height: 24, borderRadius: '50%', background: c,
                  border: newTagColor === c ? '2px solid white' : '2px solid transparent',
                  transition: 'all 0.15s',
                }} />
            ))}
          </div>
          <button className="btn-primary" onClick={handleAddTag} style={{ padding: '0.75rem' }}>
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
