'use client'

import { useState } from 'react'
import { createCategory, updateCategory, deleteCategory } from '@/actions/categories'
import { upsertGoal } from '@/actions/goals'
import { createTag, deleteTag } from '@/actions/tags'
import { useToast } from '@/components/ToastProvider'
import { Plus, Trash2, Target, Tag, Folder, Settings2 } from 'lucide-react'

const COLORS = ['#8f00ff', '#00f0ff', '#ff007f', '#0df046', '#ffd000', '#22c55e', '#ec4899', '#f97316']

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
    toast('System Targets Synchronized!', 'success')
  }

  // Categories
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#8f00ff')

  const handleAddCat = async () => {
    if (!newCatName.trim()) return
    await createCategory(newCatName.trim(), newCatColor)
    setNewCatName('')
    toast('Node Protocol Added', 'success')
  }

  const handleDeleteCat = async (id: string) => {
    if (!confirm('Purge this protocol?')) return
    await deleteCategory(id)
    toast('Protocol Purged.', 'success')
  }

  // Tags
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#00f0ff')

  const handleAddTag = async () => {
    if (!newTagName.trim()) return
    await createTag(newTagName.trim(), newTagColor)
    setNewTagName('')
    toast('Tag Registered', 'success')
  }

  const handleDeleteTag = async (id: string) => {
    await deleteTag(id)
    toast('Tag Unlinked.', 'success')
  }

  return (
    <div className="flex-col gap-xl">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(143, 0, 255, 0.05)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(143, 0, 255, 0.2)' }}>
        <div style={{ padding: '0.5rem', background: 'rgba(143, 0, 255, 0.1)', borderRadius: '12px', color: 'var(--accent-primary)' }}>
          <Settings2 size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>System Control Panel</h3>
          <p className="text-secondary text-xs" style={{ margin: 0, marginTop: '4px' }}>Configure node thresholds and data categories.</p>
        </div>
      </div>

      {/* Goals */}
      <div className="glass-glow reveal-up" style={{ padding: '2rem' }}>
        <div className="flex-row gap-sm" style={{ marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          <Target size={20} style={{ color: 'var(--accent-secondary)' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-secondary)' }}>Throughput Targets</h3>
        </div>

        <div className="grid-2">
          <div>
            <label style={{ color: 'var(--text-secondary)' }}>Daily Bandwidth (hours)</label>
            <input className="input" type="number" min={1} max={24} step={0.5} value={dailyHours}
              onChange={(e) => setDailyHours(parseFloat(e.target.value) || 0)} style={{ fontSize: '1.5rem', fontFamily: 'var(--font-mono)' }} />
          </div>
          <div>
            <label style={{ color: 'var(--text-secondary)' }}>Weekly Bandwidth (hours)</label>
            <input className="input" type="number" min={1} max={168} step={1} value={weeklyHours}
              onChange={(e) => setWeeklyHours(parseFloat(e.target.value) || 0)} style={{ fontSize: '1.5rem', fontFamily: 'var(--font-mono)' }} />
          </div>
        </div>

        <button className="btn-primary mt-lg" onClick={saveGoals} style={{ width: '100%' }}>COMMIT CHANGES</button>
      </div>

      {/* Categories */}
      <div className="glass-glow reveal-up" style={{ padding: '2rem', '--reveal-delay': '100ms' as any }}>
        <div className="flex-row gap-sm" style={{ marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          <Folder size={20} style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-primary)' }}>Data Nodes / Categories</h3>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {initialCategories.map((c: any) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${c.color}50`, borderRadius: '12px', boxShadow: `0 0 15px ${c.color}20` }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, boxShadow: `0 0 10px ${c.color}` }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{c.name}</span>
              <button onClick={() => handleDeleteCat(c.id)} style={{ marginLeft: '12px', color: 'rgba(255,0,85,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <label style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Allocate New Node</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="input" type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Node identifier..." onKeyDown={(e) => e.key === 'Enter' && handleAddCat()} style={{ flex: 1, minWidth: '200px' }} />
            
            <div style={{ display: 'flex', gap: '8px', padding: '0.5rem', background: 'rgba(0,0,0,0.4)', borderRadius: '12px' }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => setNewCatColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c,
                    border: newCatColor === c ? '2px solid white' : '2px solid transparent',
                    boxShadow: newCatColor === c ? `0 0 15px ${c}` : 'none',
                    transition: 'all 0.2s', cursor: 'pointer'
                  }} />
              ))}
            </div>
            
            <button className="btn-primary" onClick={handleAddCat} style={{ padding: '1rem' }}>
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="glass-glow reveal-up" style={{ padding: '2rem', '--reveal-delay': '200ms' as any }}>
        <div className="flex-row gap-sm" style={{ marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          <Tag size={20} style={{ color: 'var(--accent-tertiary)' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-tertiary)' }}>Metadata Tags</h3>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {initialTags.map((t: any) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${t.color}50`, borderRadius: '12px', boxShadow: `0 0 15px ${t.color}20` }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, boxShadow: `0 0 10px ${t.color}` }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.name}</span>
              <button onClick={() => handleDeleteTag(t.id)} style={{ marginLeft: '12px', color: 'rgba(255,0,85,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {initialTags.length === 0 && (
            <span className="text-sm text-secondary" style={{ fontStyle: 'italic' }}>No tags initialized. Create one below.</span>
          )}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <label style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Add Metadata Tag</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="input" type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag signature..." onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} style={{ flex: 1, minWidth: '200px' }} />
            
            <div style={{ display: 'flex', gap: '8px', padding: '0.5rem', background: 'rgba(0,0,0,0.4)', borderRadius: '12px' }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => setNewTagColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c,
                    border: newTagColor === c ? '2px solid white' : '2px solid transparent',
                    boxShadow: newTagColor === c ? `0 0 15px ${c}` : 'none',
                    transition: 'all 0.2s', cursor: 'pointer'
                  }} />
              ))}
            </div>
            
            <button className="btn-primary" onClick={handleAddTag} style={{ padding: '1rem' }}>
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
