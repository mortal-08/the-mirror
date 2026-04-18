'use client'

import { Download } from 'lucide-react'
import { format } from 'date-fns'

export default function ExportButton({ entries }: { entries: any[] }) {
  const handleExport = () => {
    const headers = ['Date', 'Start', 'End', 'Duration (min)', 'Category', 'Tags', 'Description']
    const rows = entries.map((e: any) => [
      format(new Date(e.startTime), 'yyyy-MM-dd'),
      format(new Date(e.startTime), 'HH:mm'),
      e.endTime ? format(new Date(e.endTime), 'HH:mm') : '',
      e.durationSeconds ? Math.round(e.durationSeconds / 60) : '',
      e.category?.name || '',
      e.tags?.map((t: any) => t.name).join('; ') || '',
      e.description || '',
    ])

    const csv = [headers, ...rows].map((r) => r.map((v: any) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mirror-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button className="btn-secondary" onClick={handleExport}
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
      <Download size={16} /> Export CSV
    </button>
  )
}
