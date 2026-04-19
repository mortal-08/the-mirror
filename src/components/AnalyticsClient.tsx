'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { BarChart3, PieChart, TrendingUp, Calendar, Clock, ChevronDown } from 'lucide-react'

type EntryData = { description: string; seconds: number; category: string; color: string; time: string }
type DayData = { date: string; totalSeconds: number; categories: { name: string; color: string; seconds: number }[]; entries: EntryData[] }
type CatTotal = { name: string; color: string; seconds: number }

export default function AnalyticsClient({ data7, data30, categories }: {
  data7: { dailyData: DayData[]; categoryTotals: CatTotal[]; totalSeconds: number; totalProductiveSeconds: number }
  data30: { dailyData: DayData[]; categoryTotals: CatTotal[]; totalSeconds: number; totalProductiveSeconds: number }
  categories: any[]
}) {
  const searchParams = useSearchParams()
  const initialRange = searchParams?.get('range') || '7'
  
  const [range, setRange] = useState<'1' | '7' | '14' | '30'>(['1','7','14','30'].includes(initialRange) ? initialRange as any : '7')
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const data = ['1','7'].includes(range) ? data7 : data30
  const sliceCount = parseInt(range, 10)
  
  const filteredDailyData = useMemo(() => {
    return data.dailyData.slice(-sliceCount)
  }, [data, sliceCount])

  const maxDaySeconds = Math.max(...filteredDailyData.map(d => d.totalSeconds), 1)

  const fmtHours = (s: number) => (s / 3600).toFixed(1)
  const fmtDuration = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${sec}s`
    return `${sec}s`
  }

  const avgSeconds = data.totalProductiveSeconds / data.dailyData.length || 0
  const bestDay = data.dailyData.reduce((best, d) => (d as any).productiveSeconds > (best as any).productiveSeconds ? d : best, data.dailyData[0])
  const activeDays = data.dailyData.filter(d => (d as any).productiveSeconds > 0).length

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  }

  // Dynamically compute category totals for the selected window
  const dynamicCategoryTotals = useMemo(() => {
     return filteredDailyData.reduce((acc, day) => {
        day.categories.forEach(cat => {
           const existing = acc.find(c => c.name === cat.name)
           if (existing) existing.seconds += cat.seconds
           else acc.push({ ...cat })
        })
        return acc
     }, [] as CatTotal[]).sort((a, b) => b.seconds - a.seconds)
  }, [filteredDailyData])

  const totalCatSeconds = dynamicCategoryTotals.reduce((sum, c) => sum + c.seconds, 0)

  return (
    <div className="motion-stack">
      {/* Header */}
      <div className="reveal-up" style={{ '--reveal-delay': '0ms', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' } as React.CSSProperties}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={24} color="var(--accent-primary)" /> Analytics
          </h1>
          <p className="page-subtitle">See where your time goes — daily, weekly, and by category.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          <button className={range === '1' ? 'btn-primary' : 'btn-secondary'} onClick={() => setRange('1')} style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}>Today</button>
          <button className={range === '7' ? 'btn-primary' : 'btn-secondary'} onClick={() => setRange('7')} style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}>7 Days</button>
          <button className={range === '14' ? 'btn-primary' : 'btn-secondary'} onClick={() => setRange('14')} style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}>14 Days</button>
          <button className={range === '30' ? 'btn-primary' : 'btn-secondary'} onClick={() => setRange('30')} style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}>30 Days</button>
        </div>
      </div>

      {/* Summary Stats (Productive Only) */}
      <div className="grid-3 reveal-up" style={{ '--reveal-delay': '60ms' } as React.CSSProperties}>
        <div className="stat-card glass">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} /> Productive Total</div>
          <div className="stat-value">{fmtHours(data.totalProductiveSeconds)}h</div>
          <div className="text-xs text-secondary">in {range} days</div>
        </div>
        <div className="stat-card glass">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><TrendingUp size={14} /> Productive Avg</div>
          <div className="stat-value">{fmtHours(avgSeconds)}h</div>
          <div className="text-xs text-secondary">{activeDays} active days</div>
        </div>
        <div className="stat-card glass">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={14} /> Best Prod. Day</div>
          <div className="stat-value">{bestDay ? fmtHours((bestDay as any).productiveSeconds) : '0'}h</div>
          <div className="text-xs text-secondary">{bestDay && (bestDay as any).productiveSeconds > 0 ? formatDate(bestDay.date) : '-'}</div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="glass reveal-up" style={{ '--reveal-delay': '120ms', padding: '1.5rem' } as React.CSSProperties}>
        <h3 style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <BarChart3 size={16} /> Daily Hours
        </h3>
        <div className="no-scrollbar" style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: range === '30' ? '4px' : '8px', height: 240, minWidth: range === '30' ? '700px' : 'auto', padding: '0 0.25rem' }}>
            {filteredDailyData.map((day) => {
              const isToday = day.date === new Date().toISOString().split('T')[0]
              return (
                <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '22px', position: 'relative', cursor: 'pointer' }} className="bar-column">
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', opacity: 0, transition: 'opacity 0.2s', position: 'absolute', top: '-20px' }} className="bar-label">
                    {day.totalSeconds > 0 ? fmtHours(day.totalSeconds) : ''}
                  </span>
                  <div style={{
                    width: '100%', minHeight: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    borderRadius: '4px 4px 2px 2px', overflow: 'hidden',
                    background: day.totalSeconds === 0 ? 'var(--surface)' : 'transparent',
                    opacity: day.totalSeconds === 0 ? 0.3 : 1, // Bar opacity base
                    boxShadow: isToday && day.totalSeconds > 0 ? '0 0 12px rgba(255,255,255,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }} className="bar-bars">
                    {day.categories.map((cat, idx) => (
                      <div key={idx} style={{
                        width: '100%',
                        height: `${(cat.seconds / maxDaySeconds) * 100}%`,
                        background: cat.color,
                        minHeight: cat.seconds > 0 ? '3px' : '0',
                        transition: 'height 0.8s ease'
                      }} title={`${cat.name}: ${Math.floor(cat.seconds/3600)}h ${Math.floor((cat.seconds%3600)/60)}m`} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.6rem', color: isToday ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: isToday ? 700 : 400, whiteSpace: 'nowrap', marginTop: 'auto' }}>
                    {range === '1' ? 'Today' : range === '7' ? formatDay(day.date) : formatDate(day.date).split(' ')[1]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          .bar-column:hover .bar-label { opacity: 1 !important; transform: translateY(-2px); }
          .bar-column:hover .bar-bars { opacity: 0.8; transform: scaleY(1.02); transform-origin: bottom; }
        `}} />
      </div>

      {/* Category Breakdown */}
      <div className="glass reveal-up" style={{ '--reveal-delay': '180ms', padding: '1.5rem' } as React.CSSProperties}>
        <h3 style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <PieChart size={16} /> Category Breakdown
        </h3>
        {dynamicCategoryTotals.length === 0 ? (
          <p className="text-secondary" style={{ textAlign: 'center', padding: '2rem 0' }}>No data yet for this time range.</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: 140, height: 140 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  {(() => {
                    let offset = 0
                    return dynamicCategoryTotals.map((cat, i) => {
                      const pct = totalCatSeconds > 0 ? (cat.seconds / totalCatSeconds) * 100 : 0
                      const dash = `${pct} ${100 - pct}`
                      const el = <circle key={i} cx="18" cy="18" r="15.9" fill="none" stroke={cat.color} strokeWidth="3.2"
                        strokeDasharray={dash} strokeDashoffset={-offset} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease-out, stroke-dashoffset 0.8s ease-out' }} />
                      offset += pct
                      return el
                    })
                  })()}
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{fmtHours(totalCatSeconds)}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>hours</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dynamicCategoryTotals.map((cat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '3px', background: cat.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: 60 }}>{cat.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{fmtDuration(cat.seconds)}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>({totalCatSeconds > 0 ? Math.round((cat.seconds / totalCatSeconds) * 100) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {dynamicCategoryTotals.map((cat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: 70 }}>{cat.name}</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${totalCatSeconds > 0 ? (cat.seconds / totalCatSeconds) * 100 : 0}%`, background: cat.color, borderRadius: '4px', transition: 'width 0.8s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', minWidth: 45, textAlign: 'right' }}>{fmtDuration(cat.seconds)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Day-by-Day Detail */}
      <div className="glass reveal-up" style={{ '--reveal-delay': '240ms', padding: '1.5rem' } as React.CSSProperties}>
        <h3 style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calendar size={16} /> Day by Day
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {[...data.dailyData].reverse().map((day) => {
            const isExpanded = expandedDay === day.date
            const isToday = day.date === new Date().toISOString().split('T')[0]
            return (
              <div key={day.date}>
                <button onClick={() => setExpandedDay(isExpanded ? null : day.date)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 0.75rem', background: isToday ? 'var(--surface-active)' : 'var(--surface)',
                  border: `1px solid ${isToday ? 'var(--accent-primary)' : 'var(--surface-border)'}`,
                  borderRadius: isExpanded ? '10px 10px 0 0' : '10px', cursor: 'pointer',
                  transition: 'all 0.2s', color: 'var(--text-primary)', textAlign: 'left',
                }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, flex: 1 }}>
                    {formatDate(day.date)} {isToday && <span style={{ fontSize: '0.6rem', color: 'var(--accent-primary)', marginLeft: '0.3rem' }}>TODAY</span>}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: day.totalSeconds > 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>
                    {day.totalSeconds > 0 ? fmtDuration(day.totalSeconds) : '—'}
                  </span>
                  <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {isExpanded && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '0.75rem' }}>
                    {day.entries.length === 0 ? (
                      <p className="text-secondary" style={{ fontSize: '0.8rem', textAlign: 'center', padding: '0.5rem 0' }}>No entries this day.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* Category summary */}
                        {day.categories.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                            {day.categories.map((cat, i) => (
                              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: `${cat.color}18`, border: `1px solid ${cat.color}40`, borderRadius: '6px', color: cat.color, fontWeight: 600 }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: cat.color }} />
                                {cat.name}: {fmtDuration(cat.seconds)}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Individual entries */}
                        {day.entries.map((entry, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-tertiary)', minWidth: 38 }}>{entry.time}</span>
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.description}</span>
                            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600, flexShrink: 0 }}>{fmtDuration(entry.seconds)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

