'use client'

import { useState } from 'react'
import { createCategory, deleteCategory } from '@/actions/categories'
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
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#7c3aed')

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
  const [newTagColor, setNewTagColor] = useState('#2563eb')

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
          {initialCategories.map((c: any) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '10px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.name}</span>
              <button onClick={() => handleDeleteCat(c.id)} style={{ marginLeft: '4px', color: '#ff5577', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
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
      </div>

      {/* Tags */}
      <div className="glass" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-border)' }}>
          <Tag size={20} style={{ color: 'var(--accent-tertiary)' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Tags</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {initialTags.map((t: any) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.7rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '10px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t.name}</span>
              <button onClick={() => handleDeleteTag(t.id)} style={{ color: '#ff5577', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {initialTags.length === 0 && <span className="text-sm text-secondary">No tags yet.</span>}
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
