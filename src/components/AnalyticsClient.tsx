'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { BarChart3, PieChart, TrendingUp, Calendar, Clock, ChevronDown, X, Tag } from 'lucide-react'
import { createPortal } from 'react-dom'

type EntryData = { description: string; seconds: number; category: string; color: string; time: string }
type DayData = { date: string; totalSeconds: number; productiveSeconds: number; categories: { name: string; color: string; seconds: number }[]; entries: EntryData[] }
type CatTotal = { name: string; color: string; seconds: number }

export default function AnalyticsClient({ data, categories }: {
  data: { dailyData: DayData[]; categoryTotals: CatTotal[]; totalSeconds: number; totalProductiveSeconds: number }
  categories: any[]
}) {
  const searchParams = useSearchParams()
  const initialRange = searchParams?.get('range') || '7'
  
  const [rangeTop, setRangeTop] = useState<string>(initialRange)
  const [rangeDaily, setRangeDaily] = useState<string>(initialRange)
  const [rangeCategory, setRangeCategory] = useState<string>(initialRange)
  const [dayModalData, setDayModalData] = useState<DayData | null>(null)

  const fmtHours = (s: number) => (s / 3600).toFixed(1)
  const fmtDuration = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${sec}s`
    return `${sec}s`
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  }

  // Best Day - Global All Time
  const bestDay = useMemo(() => {
    return data.dailyData.length > 0 
      ? data.dailyData.reduce((best, d) => d.productiveSeconds > best.productiveSeconds ? d : best, data.dailyData[0])
      : null
  }, [data])

  // Top Stats
  const topData = useMemo(() => {
    const sliceCount = rangeTop === 'all' ? data.dailyData.length : parseInt(rangeTop, 10)
    const slice = data.dailyData.slice(-sliceCount)
    const totalProd = slice.reduce((sum, d) => sum + (d.productiveSeconds || 0), 0)
    const activeDays = slice.filter(d => d.productiveSeconds > 0).length
    const avg = totalProd / (activeDays || 1)
    return { totalProd, avg, activeDays }
  }, [data, rangeTop])

  // Daily Graph Data
  const dailyGraphData = useMemo(() => {
    const sliceCount = rangeDaily === 'all' ? data.dailyData.length : parseInt(rangeDaily, 10)
    return data.dailyData.slice(-sliceCount)
  }, [data, rangeDaily])

  const maxDaySeconds = Math.max(...dailyGraphData.map(d => d.totalSeconds), 1)

  // Category Breakdown Data
  const dynamicCategoryTotals = useMemo(() => {
    const sliceCount = rangeCategory === 'all' ? data.dailyData.length : parseInt(rangeCategory, 10)
    const slice = data.dailyData.slice(-sliceCount)
    return slice.reduce((acc, day) => {
      day.categories.forEach(cat => {
         const existing = acc.find(c => c.name === cat.name)
         if (existing) existing.seconds += cat.seconds
         else acc.push({ ...cat })
      })
      return acc
    }, [] as CatTotal[]).sort((a, b) => b.seconds - a.seconds)
  }, [data, rangeCategory])

  const totalCatSeconds = dynamicCategoryTotals.reduce((sum, c) => sum + c.seconds, 0)

  const RangeSelector = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      style={{
        background: 'var(--surface-active)', border: '1px solid var(--surface-border)', 
        color: 'var(--text-primary)', padding: '0.2rem 0.5rem', borderRadius: '6px', 
        fontSize: '0.65rem', outline: 'none', cursor: 'pointer', fontFamily: 'inherit'
      }}>
      <option value="1">Today</option>
      <option value="7">7 Days</option>
      <option value="14">2 Weeks</option>
      <option value="30">1 Month</option>
      <option value="all">All Time</option>
    </select>
  )

  const renderModal = () => {
    if (!dayModalData) return null
    const isToday = dayModalData.date === new Date().toISOString().split('T')[0]
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease' }}
        onClick={() => setDayModalData(null)}>
        <div onClick={(e) => e.stopPropagation()} style={{
          width: '100%', maxWidth: '480px', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          background: 'var(--bg-primary)', border: '1px solid var(--surface-border)',
          borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', overflow: 'hidden'
        }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} color="var(--accent-primary)" /> {formatDate(dayModalData.date)}
                {isToday && <span style={{ fontSize: '0.65rem', background: 'var(--accent-primary)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>TODAY</span>}
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>Total Time: {fmtDuration(dayModalData.totalSeconds)}</p>
            </div>
            <button onClick={() => setDayModalData(null)} style={{ background: 'var(--surface-hover)', border: '1px solid var(--surface-border)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          
          <div style={{ padding: '1.25rem', overflowY: 'auto' }}>
            {dayModalData.categories.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>Category Breakdown</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {dayModalData.categories.map((cat, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: `${cat.color}18`, border: `1px solid ${cat.color}40`, borderRadius: '6px', color: cat.color, fontWeight: 600 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color }} />
                      {cat.name}: {fmtDuration(cat.seconds)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>Time Log</label>
              {dayModalData.entries.length === 0 ? (
                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>No entries logged on this day.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {dayModalData.entries.map((entry, i) => (
                     <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--surface-border)' }}>
                        <div style={{ flexShrink: 0, marginTop: '2px', width: '55px' }}>
                           <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{entry.time}</span>
                           <span style={{ fontSize: '0.65rem', color: entry.color, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px', fontWeight: 600 }}>
                             <div style={{ width: 4, height: 4, borderRadius: '50%', background: entry.color }} /> 
                             <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40px' }}>{entry.category}</span>
                           </span>
                        </div>
                        <div style={{ flex: 1, borderLeft: '1px solid var(--surface-border)', paddingLeft: '0.75rem' }}>
                          <span style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-primary)', lineHeight: 1.4 }}>{entry.description || 'Log'}</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700, flexShrink: 0 }}>
                          +{fmtDuration(entry.seconds)}
                        </span>
                     </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return (
    <div className="motion-stack">
      {renderModal()}
      
      {/* Header */}
      <div className="reveal-up" style={{ '--reveal-delay': '0ms', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' } as React.CSSProperties}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={24} color="var(--accent-primary)" /> Analytics
          </h1>
          <p className="page-subtitle">See where your time goes — filtered however you like.</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid-3 reveal-up" style={{ '--reveal-delay': '60ms' } as React.CSSProperties}>
        <div className="stat-card glass" style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
            <RangeSelector value={rangeTop} onChange={setRangeTop} />
          </div>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} /> Productive Total</div>
          <div className="stat-value" style={{ marginTop: '0.75rem' }}>{fmtHours(topData.totalProd)}h</div>
          <div className="text-xs text-secondary">in {rangeTop === 'all' ? 'All Time' : `${rangeTop} days`}</div>
        </div>
        <div className="stat-card glass" style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
            <RangeSelector value={rangeTop} onChange={setRangeTop} />
          </div>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><TrendingUp size={14} /> Productive Avg</div>
          <div className="stat-value" style={{ marginTop: '0.75rem' }}>{fmtHours(topData.avg)}h</div>
          <div className="text-xs text-secondary">{topData.activeDays} active days</div>
        </div>
        <div className="stat-card glass" style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
             <span style={{ fontSize: '0.65rem', background: 'var(--surface-active)', padding: '0.2rem 0.5rem', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}>All Time</span>
          </div>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={14} /> Best Prod. Day</div>
          <div className="stat-value" style={{ marginTop: '0.75rem' }}>{bestDay ? fmtHours(bestDay.productiveSeconds) : '0'}h</div>
          <div className="text-xs text-secondary">{bestDay && bestDay.productiveSeconds > 0 ? formatDate(bestDay.date) : '-'}</div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="glass reveal-up" style={{ '--reveal-delay': '120ms', padding: '1.5rem' } as React.CSSProperties}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <BarChart3 size={16} /> Daily Hours
          </h3>
          <RangeSelector value={rangeDaily} onChange={setRangeDaily} />
        </div>
        
        <div className="no-scrollbar" style={{ overflowX: 'auto', paddingBottom: '0.5rem', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: 260, minWidth: '100%', width: 'max-content', padding: '0 0.5rem' }}>
            {dailyGraphData.map((day) => {
              const isToday = day.date === new Date().toISOString().split('T')[0]
              return (
                <div key={day.date} onClick={() => setDayModalData(day)} style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '38px', minWidth: '38px', position: 'relative', cursor: 'pointer' }} className="bar-column">
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', opacity: 0, transition: 'opacity 0.2s', position: 'absolute', top: '-18px' }} className="bar-label">
                    {day.totalSeconds > 0 ? fmtHours(day.totalSeconds) : ''}
                  </span>
                  <div style={{
                    width: '100%', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    borderRadius: '4px 4px 2px 2px', overflow: 'hidden',
                    background: day.totalSeconds === 0 ? 'var(--surface)' : 'transparent',
                    opacity: day.totalSeconds === 0 ? 0.3 : 1,
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
                  <span style={{ fontSize: '0.55rem', padding: '0 2px', color: isToday ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: isToday ? 700 : 400, whiteSpace: 'nowrap', marginTop: '4px' }}>
                    {formatDate(day.date).split(' ')[1]} {formatDate(day.date).split(' ')[0]}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <PieChart size={16} /> Category Breakdown
          </h3>
          <RangeSelector value={rangeCategory} onChange={setRangeCategory} />
        </div>
        
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
      <div className="glass reveal-up" style={{ '--reveal-delay': '240ms', padding: '1.5rem', marginTop: '1.5rem' } as React.CSSProperties}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={16} /> Day by Day
          </h3>
        </div>
        <div className="no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {[...data.dailyData].reverse().slice(0, 30).map((day) => {
            const isToday = day.date === new Date().toISOString().split('T')[0]
            return (
              <div key={day.date}>
                <button onClick={() => setDayModalData(day)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 0.75rem', background: isToday ? 'var(--surface-active)' : 'var(--surface)',
                  border: `1px solid ${isToday ? 'var(--accent-primary)' : 'var(--surface-border)'}`,
                  borderRadius: '10px', cursor: 'pointer',
                  transition: 'background 0.2s, border 0.2s', color: 'var(--text-primary)', textAlign: 'left',
                }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, flex: 1 }}>
                    {formatDate(day.date)} {isToday && <span style={{ fontSize: '0.6rem', color: 'var(--accent-primary)', marginLeft: '0.3rem' }}>TODAY</span>}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: day.totalSeconds > 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>
                    {day.totalSeconds > 0 ? fmtDuration(day.totalSeconds) : '—'}
                  </span>
                  <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', transform: 'rotate(-90deg)', transition: 'transform 0.2s' }} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
