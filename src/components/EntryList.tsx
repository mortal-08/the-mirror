'use client'

import { memo, useState } from 'react'
import { deleteTimeEntry, updateTimeEntry } from '@/actions/timeEntries'
import { useToast } from '@/components/ToastProvider'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { Pencil, Trash2, Check, X } from 'lucide-react'

function groupByDate(entries: any[]) {
  const groups: Record<string, any[]> = {}
  for (const entry of entries) {
    const date = new Date(entry.startTime)
    let key: string
    if (isToday(date)) key = 'Today'
    else if (isYesterday(date)) key = 'Yesterday'
    else key = format(date, 'EEEE, MMM d')
    if (!groups[key]) groups[key] = []
    groups[key].push(entry)
  }
  return groups
}

const EntryList = ({ initialEntries, categories }: { initialEntries: any[]; categories: any[] }) => {
  const { toast } = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editCatId, setEditCatId] = useState('')

  const startEdit = (entry: any) => {
    setEditingId(entry.id)
    setEditDesc(entry.description || '')
    setEditCatId(entry.categoryId || '')
  }

  const saveEdit = async (id: string) => {
    await updateTimeEntry(id, {
      description: editDesc,
      categoryId: editCatId || undefined,
    })
    setEditingId(null)
    toast('Entry updated.', 'success')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    await deleteTimeEntry(id)
    toast('Entry deleted.', 'success')
  }

  const grouped = groupByDate(initialEntries)

  if (initialEntries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-tertiary)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🪞</div>
        <p>No entries yet. Start tracking to see your reflection.</p>
      </div>
    )
  }

  return (
    <div className="flex-col gap-sm">
      {Object.entries(grouped).map(([dateLabel, entries]) => (
        <div key={dateLabel}>
          <div className="entry-date-header">{dateLabel}</div>
          <div className="flex-col gap-sm" style={{ marginTop: 'var(--space-sm)' }}>
            {entries.map((entry: any) => (
              <div key={entry.id} className="entry-item">
                {editingId === entry.id ? (
                  <div style={{ display: 'flex', flex: 1, gap: 'var(--space-sm)', marginRight: 'var(--space-md)', alignItems: 'center' }}>
                    <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Description..." style={{ flex: 1 }} />
                    <select value={editCatId} onChange={(e) => setEditCatId(e.target.value)} style={{ maxWidth: '150px' }}>
                      <option value="">No Category</option>
                      {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div style={{ flex: 1 }}>
                    <div className="flex-row gap-sm" style={{ marginBottom: '2px' }}>
                      <strong>{entry.description || 'Untitled Block'}</strong>
                      {entry.category && (
                        <span className="badge" style={{ background: `${entry.category.color}33`, color: entry.category.color }}>
                          {entry.category.name}
                        </span>
                      )}
                      {entry.tags?.map((tag: any) => (
                        <span key={tag.id} className="badge" style={{ background: `${tag.color}22`, color: tag.color, fontSize: '0.65rem' }}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                    <div className="text-sm text-secondary">
                      {format(new Date(entry.startTime), 'h:mm a')}
                      {entry.endTime && ` — ${format(new Date(entry.endTime), 'h:mm a')}`}
                      {' • '}
                      {entry.durationSeconds ? `${Math.floor(entry.durationSeconds / 60)}m` : ''}
                      {' • '}
                      {formatDistanceToNow(new Date(entry.startTime), { addSuffix: true })}
                    </div>
                  </div>
                )}

                <div className="flex-row gap-xs">
                  {editingId === entry.id ? (
                    <>
                      <button className="btn-icon" onClick={() => saveEdit(entry.id)} title="Save"><Check size={16} style={{ color: 'var(--success)' }} /></button>
                      <button className="btn-icon" onClick={() => setEditingId(null)} title="Cancel"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <button className="btn-icon" onClick={() => startEdit(entry)} title="Edit"><Pencil size={16} /></button>
                      <button className="btn-icon" onClick={() => handleDelete(entry.id)} title="Delete"><Trash2 size={16} style={{ color: 'var(--danger)' }} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default memo(EntryList)
