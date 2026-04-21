'use client'

import { useState, useRef, useEffect } from 'react'
import { createCategory, deleteCategory, updateCategory } from '@/actions/categories'
import { upsertGoal } from '@/actions/goals'
import { createTag, deleteTag } from '@/actions/tags'
import { changePassword } from '@/actions/auth'
import { useToast } from '@/components/ToastProvider'
import {
  getNotificationPermissionState,
  getReminderNotificationsEnabled,
  requestNotificationPermission,
  setReminderNotificationsEnabled,
  showReminderNotification,
  getRoutineReminderLeadMins,
  setRoutineReminderLeadMins,
  getKeyDateReminderHour,
  setKeyDateReminderHour,
  getRoutineStartEnabled,
  setRoutineStartEnabled,
  getRoutinePreEnabled,
  setRoutinePreEnabled,
  getKeyDateSummaryEnabled,
  setKeyDateSummaryEnabled,
  getKeyDateIndividualEnabled,
  setKeyDateIndividualEnabled,
  getKeyDateIndividualLeadMins,
  setKeyDateIndividualLeadMins,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
} from '@/lib/notifications'
import { Plus, Trash2, Target, Tag, Folder, Lock, Eye, EyeOff, Shield, Bell, BellRing, Send, Clock, CalendarDays } from 'lucide-react'

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

  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() => getReminderNotificationsEnabled())
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => getNotificationPermissionState())
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  
  const [routineLeadMins, setRoutineLeadMins] = useState<number>(() => getRoutineReminderLeadMins())
  const [keyDateHour, setKeyDateHour] = useState<number>(() => getKeyDateReminderHour())

  // Granular toggles
  const [routineStartOn, setRoutineStartOn] = useState<boolean>(() => getRoutineStartEnabled())
  const [routinePreOn, setRoutinePreOn] = useState<boolean>(() => getRoutinePreEnabled())
  const [keyDateSummaryOn, setKeyDateSummaryOn] = useState<boolean>(() => getKeyDateSummaryEnabled())
  const [keyDateIndividualOn, setKeyDateIndividualOn] = useState<boolean>(() => getKeyDateIndividualEnabled())
  const [keyDateIndividualLeadMins, setKeyDateIndividualLeadMinsState] = useState<number>(() => getKeyDateIndividualLeadMins())

  const handleToggleReminders = async () => {
    const nextValue = !remindersEnabled
    setRemindersEnabled(nextValue)
    setReminderNotificationsEnabled(nextValue)

    if (!nextValue) {
      // Unsubscribe from server push
      await unsubscribeFromPush()
      toast('Reminder notifications disabled.', 'info')
      return
    }

    const permission = getNotificationPermissionState()
    setNotificationPermission(permission)

    if (permission === 'unsupported') {
      toast('Notifications are not supported on this browser.', 'error')
      return
    }

    if (permission === 'denied') {
      toast('Notifications are blocked. Enable them in browser settings.', 'error')
      return
    }

    if (permission === 'default') {
      setIsRequestingPermission(true)
      const nextPermission = await requestNotificationPermission()
      setNotificationPermission(nextPermission)
      setIsRequestingPermission(false)

      if (nextPermission === 'granted') {
        // Subscribe to server push
        await subscribeToPush()
        toast('Notifications enabled — works even when app is closed!', 'success')
      } else {
        toast('Please allow notifications to receive reminders.', 'error')
      }
      return
    }

    // Permission already granted — subscribe to push
    if (!isPushSubscribed()) {
      await subscribeToPush()
    }
    toast('Notifications enabled — works even when app is closed!', 'success')
  }

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true)
    const permission = await requestNotificationPermission()
    setNotificationPermission(permission)
    setIsRequestingPermission(false)

    if (permission === 'granted') {
      toast('Notifications enabled.', 'success')
    } else if (permission === 'denied') {
      toast('Notifications are blocked. Enable them in browser settings.', 'error')
    }
  }

  const handleTestNotification = async () => {
    if (!remindersEnabled) {
      toast('Enable reminder notifications first.', 'error')
      return
    }

    const permission = getNotificationPermissionState()
    setNotificationPermission(permission)

    if (permission !== 'granted') {
      toast('Please allow notifications first.', 'error')
      return
    }

    const sent = await showReminderNotification(
      'Mirror reminder test',
      'Routine and key-date reminders are working on this device.',
      'mirror-reminder-test'
    )

    if (sent) {
      toast('Test notification sent.', 'success')
    } else {
      toast('Could not send test notification.', 'error')
    }
  }

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
  
  // Debounce refs for tag updates
  const tagDebounceTimers = useRef<Record<string, NodeJS.Timeout>>({})
  const pendingTagUpdates = useRef<Record<string, string[]>>({})

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(tagDebounceTimers.current).forEach(clearTimeout)
    }
  }, [])

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

  const handleToggleCategoryTag = (categoryId: string, tagId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    if (!category) return

    const currentTagIds: string[] = (category.tags || []).map((tag: any) => tag.id)
    const nextTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter((id) => id !== tagId)
      : [...currentTagIds, tagId]

    // 1. Optimistic Update (Immediate UI response)
    setCategories((prev) => prev.map((c) => {
      if (c.id !== categoryId) return c
      return {
        ...c,
        tags: tags.filter((tag) => nextTagIds.includes(tag.id)),
      }
    }))

    // 2. Debounced save to server
    pendingTagUpdates.current[categoryId] = nextTagIds

    if (tagDebounceTimers.current[categoryId]) {
      clearTimeout(tagDebounceTimers.current[categoryId])
    }

    tagDebounceTimers.current[categoryId] = setTimeout(async () => {
      const finalTagIds = pendingTagUpdates.current[categoryId]
      if (!finalTagIds) return

      setUpdatingCategoryTagIds((prev) => new Set(prev).add(categoryId))
      try {
        const updated = await updateCategory(categoryId, { tagIds: finalTagIds })
        // Re-sync with server response in case of other changes
        setCategories((prev) => prev.map((c) => (c.id === categoryId ? updated : c)))
      } catch (err) {
        console.error('Failed to update tags:', err)
        toast('Failed to save tag changes to the server.', 'error')
      } finally {
        setUpdatingCategoryTagIds((prev) => {
          const next = new Set(prev)
          next.delete(categoryId)
          return next
        })
        delete tagDebounceTimers.current[categoryId]
        delete pendingTagUpdates.current[categoryId]
      }
    }, 1000) // 1 second debounce
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
                            onClick={() => handleToggleCategoryTag(c.id, tag.id)}
                            className={isSelected ? 'btn-primary' : 'btn-secondary'}
                            style={{
                              padding: '0.25rem 0.55rem',
                              fontSize: '0.65rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              borderColor: isSelected ? tag.color : undefined,
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

                <div 
                  onClick={() => !isUpdatingProductive && handleToggleProductive(c.id, !c.isProductive)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.6rem', 
                    cursor: isUpdatingProductive ? 'not-allowed' : 'pointer',
                    opacity: isUpdatingProductive ? 0.6 : 1,
                    padding: '0.4rem 0.75rem',
                    borderRadius: '20px',
                    background: c.isProductive ? 'var(--accent-primary)15' : 'var(--surface-hover)',
                    border: `1px solid ${c.isProductive ? 'var(--accent-primary)30' : 'var(--surface-border)'}`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    userSelect: 'none'
                  }}
                >
                   <div style={{ 
                     width: '30px', height: '16px', 
                     background: c.isProductive ? 'var(--accent-primary)' : 'var(--text-tertiary)', 
                     borderRadius: '10px', 
                     position: 'relative', 
                     transition: 'all 0.3s' 
                   }}>
                      <div style={{ 
                        position: 'absolute', 
                        top: '2px', 
                        left: c.isProductive ? '16px' : '2px', 
                        width: '12px', height: '12px', 
                        borderRadius: '50%', 
                        background: '#fff', 
                        transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                      }} />
                   </div>
                   <span style={{ fontSize: '0.65rem', color: c.isProductive ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.02em' }}>
                     {isUpdatingProductive ? 'Updating...' : 'Productive'}
                   </span>
                </div>

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

          <div
            onClick={() => setNewCatIsProductive(!newCatIsProductive)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              cursor: 'pointer',
              padding: '0.5rem 0.75rem',
              borderRadius: '20px',
              background: newCatIsProductive ? 'var(--accent-primary)15' : 'var(--surface)',
              border: `1px solid ${newCatIsProductive ? 'var(--accent-primary)30' : 'var(--surface-border)'}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              userSelect: 'none',
            }}
          >
            <div style={{
              width: '34px', height: '18px',
              background: newCatIsProductive ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              borderRadius: '10px',
              position: 'relative',
              transition: 'all 0.3s',
              flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute',
                top: '2px',
                left: newCatIsProductive ? '18px' : '2px',
                width: '14px', height: '14px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }} />
            </div>
            <span style={{
              fontSize: '0.75rem',
              color: newCatIsProductive ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}>
              Counts as Productive Time
            </span>
          </div>
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

      {/* Reminder Notifications */}
      <div className="glass" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-border)' }}>
          <BellRing size={20} style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Reminder Notifications</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p className="text-sm text-secondary" style={{ margin: 0, lineHeight: 1.5 }}>
            Customize when you receive alerts for your daily schedule and important events.
          </p>

          {/* Master toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', padding: '0.85rem 1rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Bell size={16} style={{ color: remindersEnabled ? 'var(--accent-primary)' : 'var(--text-tertiary)' }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Device reminders
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggleReminders}
              disabled={isRequestingPermission}
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '0.45rem 0.9rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: isRequestingPermission ? 'not-allowed' : 'pointer',
                background: remindersEnabled ? 'var(--accent-primary)' : 'var(--surface-hover)',
                color: remindersEnabled ? 'var(--text-inverse)' : 'var(--text-secondary)',
                opacity: isRequestingPermission ? 0.7 : 1,
              }}
            >
              {isRequestingPermission ? 'Working...' : remindersEnabled ? 'Enabled' : 'Enable'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="text-sm text-secondary">
              Permission: {notificationPermission === 'unsupported' ? 'Not supported' : notificationPermission}
            </span>

            {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
              <button className="btn-secondary" type="button" onClick={handleRequestPermission} disabled={isRequestingPermission}>
                {isRequestingPermission ? 'Requesting...' : 'Allow Notifications'}
              </button>
            )}

            <button className="btn-primary" type="button" onClick={handleTestNotification} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Send size={15} /> Test Notification
            </button>
          </div>

          {remindersEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>

              {/* ─── Routine Notifications ─── */}
              <div style={{ background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
                <div style={{ padding: '0.9rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid var(--surface-border)', background: 'linear-gradient(135deg, rgba(124,58,237,0.06), transparent)' }}>
                  <Clock size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Routine Notifications</span>
                </div>

                <div style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* At Start toggle */}
                  <div
                    onClick={() => {
                      const next = !routineStartOn
                      setRoutineStartOn(next)
                      setRoutineStartEnabled(next)
                      toast(next ? 'Notify at routine start enabled.' : 'Notify at routine start disabled.', 'info')
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                      padding: '0.65rem 0.85rem', borderRadius: '10px', cursor: 'pointer', userSelect: 'none',
                      background: routineStartOn ? 'rgba(124,58,237,0.08)' : 'var(--surface)',
                      border: `1px solid ${routineStartOn ? 'rgba(124,58,237,0.25)' : 'var(--surface-border)'}`,
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>At start of event</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>Get notified when a routine block begins</div>
                    </div>
                    <div style={{ width: '36px', height: '20px', background: routineStartOn ? 'var(--accent-primary)' : 'var(--text-tertiary)', borderRadius: '10px', position: 'relative', transition: 'all 0.3s', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: '2px', left: routineStartOn ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>

                  {/* Before start toggle */}
                  <div
                    onClick={() => {
                      const next = !routinePreOn
                      setRoutinePreOn(next)
                      setRoutinePreEnabled(next)
                      toast(next ? 'Early routine reminder enabled.' : 'Early routine reminder disabled.', 'info')
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                      padding: '0.65rem 0.85rem', borderRadius: '10px', cursor: 'pointer', userSelect: 'none',
                      background: routinePreOn ? 'rgba(124,58,237,0.08)' : 'var(--surface)',
                      border: `1px solid ${routinePreOn ? 'rgba(124,58,237,0.25)' : 'var(--surface-border)'}`,
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>Before event starts</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>Heads-up alert before each block</div>
                    </div>
                    <div style={{ width: '36px', height: '20px', background: routinePreOn ? 'var(--accent-primary)' : 'var(--text-tertiary)', borderRadius: '10px', position: 'relative', transition: 'all 0.3s', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: '2px', left: routinePreOn ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>

                  {/* Lead time selector — only visible when pre is enabled */}
                  {routinePreOn && (
                    <div style={{ paddingLeft: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '0.35rem' }}>How early?</label>
                      <select
                        value={routineLeadMins}
                        onChange={(e) => {
                          const val = parseInt(e.target.value)
                          setRoutineLeadMins(val)
                          setRoutineReminderLeadMins(val)
                          toast(`Routine lead time set to ${val} minutes.`, 'info')
                        }}
                        style={{ width: '100%', maxWidth: '220px', padding: '0.55rem 0.7rem', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                      >
                        <option value={5}>5 minutes before</option>
                        <option value={10}>10 minutes before</option>
                        <option value={15}>15 minutes before</option>
                        <option value={30}>30 minutes before</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Key Date Notifications ─── */}
              <div style={{ background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
                <div style={{ padding: '0.9rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid var(--surface-border)', background: 'linear-gradient(135deg, rgba(245,158,11,0.06), transparent)' }}>
                  <CalendarDays size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Key Date Notifications</span>
                </div>

                <div style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Daily summary toggle */}
                  <div
                    onClick={() => {
                      const next = !keyDateSummaryOn
                      setKeyDateSummaryOn(next)
                      setKeyDateSummaryEnabled(next)
                      toast(next ? 'Daily key date summary enabled.' : 'Daily key date summary disabled.', 'info')
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                      padding: '0.65rem 0.85rem', borderRadius: '10px', cursor: 'pointer', userSelect: 'none',
                      background: keyDateSummaryOn ? 'rgba(245,158,11,0.08)' : 'var(--surface)',
                      border: `1px solid ${keyDateSummaryOn ? 'rgba(245,158,11,0.25)' : 'var(--surface-border)'}`,
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>Daily summary</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>One morning alert listing all key dates for the day</div>
                    </div>
                    <div style={{ width: '36px', height: '20px', background: keyDateSummaryOn ? '#f59e0b' : 'var(--text-tertiary)', borderRadius: '10px', position: 'relative', transition: 'all 0.3s', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: '2px', left: keyDateSummaryOn ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>

                  {/* Summary hour selector */}
                  {keyDateSummaryOn && (
                    <div style={{ paddingLeft: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '0.35rem' }}>Summary time</label>
                      <select
                        value={keyDateHour}
                        onChange={(e) => {
                          const val = parseInt(e.target.value)
                          setKeyDateHour(val)
                          setKeyDateReminderHour(val)
                          toast(`Key date summary set to ${val}:00.`, 'info')
                        }}
                        style={{ width: '100%', maxWidth: '220px', padding: '0.55rem 0.7rem', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                      >
                        {[...Array(13)].map((_, i) => (
                          <option key={i} value={i}>{i === 0 ? 'Midnight' : `${i}:00 AM`}</option>
                        ))}
                        {[...Array(11)].map((_, i) => (
                          <option key={i + 13} value={i + 13}>{`${i + 1}:00 PM`}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Individual event reminder toggle */}
                  <div
                    onClick={() => {
                      const next = !keyDateIndividualOn
                      setKeyDateIndividualOn(next)
                      setKeyDateIndividualEnabled(next)
                      toast(next ? 'Individual key date reminders enabled.' : 'Individual key date reminders disabled.', 'info')
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                      padding: '0.65rem 0.85rem', borderRadius: '10px', cursor: 'pointer', userSelect: 'none',
                      background: keyDateIndividualOn ? 'rgba(245,158,11,0.08)' : 'var(--surface)',
                      border: `1px solid ${keyDateIndividualOn ? 'rgba(245,158,11,0.25)' : 'var(--surface-border)'}`,
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>Before event starts</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>Reminder before key dates that have a specific time</div>
                    </div>
                    <div style={{ width: '36px', height: '20px', background: keyDateIndividualOn ? '#f59e0b' : 'var(--text-tertiary)', borderRadius: '10px', position: 'relative', transition: 'all 0.3s', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: '2px', left: keyDateIndividualOn ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>

                  {/* Individual lead time selector */}
                  {keyDateIndividualOn && (
                    <div style={{ paddingLeft: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '0.35rem' }}>How early?</label>
                      <select
                        value={keyDateIndividualLeadMins}
                        onChange={(e) => {
                          const val = parseInt(e.target.value)
                          setKeyDateIndividualLeadMinsState(val)
                          setKeyDateIndividualLeadMins(val)
                          toast(`Key date lead time set to ${val} minutes.`, 'info')
                        }}
                        style={{ width: '100%', maxWidth: '220px', padding: '0.55rem 0.7rem', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                      >
                        <option value={5}>5 minutes before</option>
                        <option value={10}>10 minutes before</option>
                        <option value={15}>15 minutes before</option>
                        <option value={30}>30 minutes before</option>
                        <option value={60}>1 hour before</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
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
