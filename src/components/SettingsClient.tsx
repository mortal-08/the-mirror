'use client'

import { useState } from 'react'
import { createCategory, deleteCategory, updateCategory } from '@/actions/categories'
import { upsertGoal } from '@/actions/goals'
import { createTag, deleteTag } from '@/actions/tags'
import { changePassword } from '@/actions/auth'
import { useToast } from '@/components/ToastProvider'
import { Plus, Trash2, Target, Tag, Folder, Lock, Eye, EyeOff, Shield } from 'lucide-react'

const COLORS = ['#7c3aed', '#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f97316']

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
    toast('Goals updated!', 'success')
  }

  // Categories
  const [categories, setCategories] = useState<any[]>(initialCategories)
  const [tags, setTags] = useState<any[]>(initialTags)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#7c3aed')
  const [newCatIsProductive, setNewCatIsProductive] = useState(false)
  const [newCatTagIds, setNewCatTagIds] = useState<string[]>([])
  const [updatingProductiveIds, setUpdatingProductiveIds] = useState<Set<string>>(new Set())
  const [updatingCategoryTagIds, setUpdatingCategoryTagIds] = useState<Set<string>>(new Set())

  const handleAddCat = async () => {
    if (!newCatName.trim()) return
    const category = await createCategory(newCatName.trim(), newCatColor, undefined, newCatIsProductive, newCatTagIds)
    setCategories((prev) => [...prev, category])
    setNewCatName('')
    setNewCatIsProductive(false)
    setNewCatTagIds([])
    toast('Category added!', 'success')
  }

  const handleDeleteCat = async (id: string) => {
    if (!confirm('Delete this category?')) return
    await deleteCategory(id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
    toast('Category deleted.', 'success')
  }

  const handleToggleProductive = async (id: string, isProductive: boolean) => {
    const previous = categories
    setUpdatingProductiveIds((prev) => new Set(prev).add(id))
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, isProductive } : c)))

    try {
      await updateCategory(id, { isProductive })
      toast('Category updated!', 'success')
    } catch {
      setCategories(previous)
      toast('Failed to update category.', 'error')
    }

    setUpdatingProductiveIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const toggleNewCategoryTag = (tagId: string) => {
    setNewCatTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
  }

  const handleToggleCategoryTag = async (categoryId: string, tagId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    if (!category) return

    const currentTagIds: string[] = (category.tags || []).map((tag: any) => tag.id)
    const nextTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter((id) => id !== tagId)
      : [...currentTagIds, tagId]

    const previous = categories
    setUpdatingCategoryTagIds((prev) => new Set(prev).add(categoryId))
    setCategories((prev) => prev.map((c) => {
      if (c.id !== categoryId) return c
      return {
        ...c,
        tags: tags.filter((tag) => nextTagIds.includes(tag.id)),
      }
    }))

    try {
      const updated = await updateCategory(categoryId, { tagIds: nextTagIds })
      setCategories((prev) => prev.map((c) => (c.id === categoryId ? updated : c)))
      toast('Category tags updated!', 'success')
    } catch {
      setCategories(previous)
      toast('Failed to update category tags.', 'error')
    }

    setUpdatingCategoryTagIds((prev) => {
      const next = new Set(prev)
      next.delete(categoryId)
      return next
    })
  }

  // Tags
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#2563eb')

  const handleAddTag = async () => {
    if (!newTagName.trim()) return
    const createdTag = await createTag(newTagName.trim(), newTagColor)
    setTags((prev) => [...prev, createdTag])
    setNewTagName('')
    toast('Tag added!', 'success')
  }

  const handleDeleteTag = async (id: string) => {
    await deleteTag(id)
    setTags((prev) => prev.filter((tag) => tag.id !== id))
    setNewCatTagIds((prev) => prev.filter((tagId) => tagId !== id))
    setCategories((prev) => prev.map((category) => ({
      ...category,
      tags: (category.tags || []).filter((tag: any) => tag.id !== id),
    })))
    toast('Tag deleted.', 'success')
  }

  // Change Password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      toast('New passwords do not match.', 'error')
      return
    }
    if (newPw.length < 6) {
      toast('New password must be at least 6 characters.', 'error')
      return
    }
    setPwLoading(true)
    const result = await changePassword(currentPw, newPw)
    if (result.error) {
      toast(result.error, 'error')
    } else {
      toast('Password changed successfully!', 'success')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    }
    setPwLoading(false)
  }

  return (
    <div className="flex-col" style={{ gap: '1.5rem' }}>

      {/* Goals */}
      <div className="glass" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-border)' }}>
          <Target size={20} style={{ color: 'var(--accent-secondary)' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Daily & Weekly Goals</h3>
        </div>
        <div className="grid-2">
          <div>
            <label>Daily Target (hours)</label>
            <input type="number" min={1} max={24} step={0.5} value={dailyHours}
              onChange={(e) => setDailyHours(parseFloat(e.target.value) || 0)}
              style={{ fontSize: '1.3rem', fontFamily: 'var(--font-mono)' }} />
          </div>
          <div>
            <label>Weekly Target (hours)</label>
            <input type="number" min={1} max={168} step={1} value={weeklyHours}
              onChange={(e) => setWeeklyHours(parseFloat(e.target.value) || 0)}
              style={{ fontSize: '1.3rem', fontFamily: 'var(--font-mono)' }} />
          </div>
        </div>
        <button className="btn-primary mt-lg" onClick={saveGoals} style={{ width: '100%' }}>Save Goals</button>
      </div>

      {/* Categories */}
      <div className="glass" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-border)' }}>
          <Folder size={20} style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Categories</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {categories.map((c: any) => {
            const isUpdatingProductive = updatingProductiveIds.has(c.id)
            const isUpdatingTags = updatingCategoryTagIds.has(c.id)

            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.name}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {tags.length === 0 ? (
                      <span className="text-xs text-secondary">Create tags first to link them.</span>
                    ) : (
                      tags.map((tag: any) => {
                        const isSelected = (c.tags || []).some((linkedTag: any) => linkedTag.id === tag.id)
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            disabled={isUpdatingTags}
                            onClick={() => handleToggleCategoryTag(c.id, tag.id)}
                            className={isSelected ? 'btn-primary' : 'btn-secondary'}
                            style={{
                              padding: '0.25rem 0.55rem',
                              fontSize: '0.65rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              borderColor: isSelected ? tag.color : undefined,
                              opacity: isUpdatingTags ? 0.7 : 1,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: tag.color }} />
                            {tag.name}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={Boolean(c.isProductive)}
                    disabled={isUpdatingProductive}
                    onChange={(e) => handleToggleProductive(c.id, e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border border-[var(--surface-border)] bg-[var(--surface)] accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  Counts as Productive Time
                </label>

                <button onClick={() => handleDeleteCat(c.id)} style={{ marginLeft: '4px', color: '#ff5577', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
              placeholder="New category..." onKeyDown={(e) => e.key === 'Enter' && handleAddCat()} style={{ flex: 1, minWidth: '160px' }} />
            <div style={{ display: 'flex', gap: '5px' }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => setNewCatColor(c)} style={{
                  width: 26, height: 26, borderRadius: '50%', background: c, border: newCatColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s'
                }} />
              ))}
            </div>
            <button className="btn-primary" onClick={handleAddCat} style={{ padding: '0.75rem 1rem' }}><Plus size={18} /></button>
          </div>

          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Linked Tags For New Category</div>
            {tags.length === 0 ? (
              <p className="text-sm text-secondary">No tags available yet. Create some below to link them.</p>
            ) : (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {tags.map((tag: any) => {
                  const isSelected = newCatTagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleNewCategoryTag(tag.id)}
                      className={isSelected ? 'btn-primary' : 'btn-secondary'}
                      style={{
                        padding: '0.35rem 0.7rem',
                        fontSize: '0.72rem',
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

          <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={newCatIsProductive}
              onChange={(e) => setNewCatIsProductive(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border border-[var(--surface-border)] bg-[var(--surface)] accent-emerald-500"
            />
            Counts as Productive Time
          </label>
        </div>
      </div>

      {/* Tags */}
      <div className="glass" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-border)' }}>
          <Tag size={20} style={{ color: 'var(--accent-tertiary)' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Tags</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {tags.map((t: any) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.7rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '10px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t.name}</span>
              <button onClick={() => handleDeleteTag(t.id)} style={{ color: '#ff5577', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {tags.length === 0 && <span className="text-sm text-secondary">No tags yet.</span>}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
            placeholder="New tag..." onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} style={{ flex: 1, minWidth: '160px' }} />
          <div style={{ display: 'flex', gap: '5px' }}>
            {COLORS.map((c) => (
              <button key={c} onClick={() => setNewTagColor(c)} style={{
                width: 26, height: 26, borderRadius: '50%', background: c, border: newTagColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s'
              }} />
            ))}
          </div>
          <button className="btn-primary" onClick={handleAddTag} style={{ padding: '0.75rem 1rem' }}><Plus size={18} /></button>
        </div>
      </div>

      {/* Change Password */}
      <div className="glass" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-border)' }}>
          <Shield size={20} style={{ color: '#ff5577' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Change Password</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
          <div style={{ position: 'relative' }}>
            <label>Current Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type={showPw ? 'text' : 'password'} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••" style={{ paddingLeft: '42px', paddingRight: '42px' }} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label>New Password</label>
            <input type={showPw ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div>
            <label>Confirm New Password</label>
            <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Confirm password" />
          </div>
          <button className="btn-primary" onClick={handleChangePassword} disabled={pwLoading} style={{ padding: '0.85rem' }}>
            {pwLoading ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  )
}
