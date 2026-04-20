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
  const [hoveredBar, setHoveredBar] = useState<{ dayIdx: number; catIdx: number; x: number; y: number } | null>(null)
  const [hoveredDonutIdx, setHoveredDonutIdx] = useState<number | null>(null)

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

  const toLocalDateKey = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const todayKey = toLocalDateKey(new Date())

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

  // Compute smart Y-axis max (round up to nearest 2h or 4h increment)
  const maxDaySeconds = Math.max(...dailyGraphData.map(d => d.totalSeconds), 1)
  const yAxisMaxHours = useMemo(() => {
    const rawMaxH = maxDaySeconds / 3600
    if (rawMaxH <= 2) return 2
    if (rawMaxH <= 4) return 4
    if (rawMaxH <= 6) return 6
    if (rawMaxH <= 8) return 8
    if (rawMaxH <= 12) return 12
    if (rawMaxH <= 16) return 16
    return Math.ceil(rawMaxH / 4) * 4
  }, [maxDaySeconds])
  const yAxisMaxSeconds = yAxisMaxHours * 3600
  const yAxisSteps = useMemo(() => {
    const step = yAxisMaxHours <= 4 ? 1 : yAxisMaxHours <= 8 ? 2 : 4
    const steps = []
    for (let i = 0; i <= yAxisMaxHours; i += step) steps.push(i)
    return steps
  }, [yAxisMaxHours])

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
        color: 'var(--text-primary)', padding: '0.25rem 0.6rem', borderRadius: '8px', 
        fontSize: '0.68rem', outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
        fontWeight: 600,
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
    const isToday = dayModalData.date === todayKey
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

      {/* ═══ INTERACTIVE BAR CHART ═══ */}
      <div className="glass reveal-up" style={{ '--reveal-delay': '120ms', padding: '1.5rem' } as React.CSSProperties}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <BarChart3 size={16} /> Daily Hours
          </h3>
          <RangeSelector value={rangeDaily} onChange={setRangeDaily} />
        </div>
        
        <div className="no-scrollbar" style={{ overflowX: 'auto', paddingBottom: '0.5rem', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', minWidth: '100%', width: 'max-content', position: 'relative' }}>
            {/* Y-Axis Labels */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 260, paddingBottom: '26px', paddingRight: '0.5rem', flexShrink: 0 }}>
              {[...yAxisSteps].reverse().map((h) => (
                <span key={h} style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', lineHeight: 1, textAlign: 'right', minWidth: '20px' }}>
                  {h}h
                </span>
              ))}
            </div>

            {/* Bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: 260, flex: 1, position: 'relative' }}>
              {/* Grid lines */}
              <div style={{ position: 'absolute', inset: 0, bottom: '26px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 0 }}>
                {yAxisSteps.map((h) => (
                  <div key={h} style={{ width: '100%', height: '1px', background: 'var(--surface-border)', opacity: 0.4 }} />
                ))}
              </div>

              {dailyGraphData.map((day, dayIdx) => {
                const isToday = day.date === todayKey
                const barHeight = day.totalSeconds > 0 ? Math.max((day.totalSeconds / yAxisMaxSeconds) * 100, 2) : 0
                return (
                  <div key={day.date} onClick={() => setDayModalData(day)} style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '42px', minWidth: '42px', position: 'relative', cursor: 'pointer', zIndex: 1 }} className="analytics-bar-column"
                    onMouseLeave={() => setHoveredBar(null)}>
                    
                    {/* Hover tooltip */}
                    {hoveredBar?.dayIdx === dayIdx && (
                      <div style={{
                        position: 'absolute', bottom: `calc(${barHeight}% + 35px)`, left: '50%', transform: 'translateX(-50%)',
                        background: 'var(--bg-primary)', border: '1px solid var(--surface-border)', borderRadius: '10px',
                        padding: '0.5rem 0.65rem', zIndex: 100, width: 'max-content', maxWidth: '180px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.5)', pointerEvents: 'none',
                        animation: 'fadeIn 0.15s ease',
                      }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{formatDate(day.date)}</div>
                        <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700, marginBottom: '4px' }}>
                          Total: {fmtDuration(day.totalSeconds)}
                        </div>
                        {day.categories.map((cat, ci) => (
                          <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                            <span>{cat.name}:</span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: cat.color, fontWeight: 600 }}>{fmtDuration(cat.seconds)}</span>
                          </div>
                        ))}
                        {/* Tooltip arrow */}
                        <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: 8, height: 8, background: 'var(--bg-primary)', borderRight: '1px solid var(--surface-border)', borderBottom: '1px solid var(--surface-border)' }} />
                      </div>
                    )}

                    <div style={{
                      width: '100%', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                      borderRadius: '6px 6px 2px 2px', overflow: 'hidden',
                      background: day.totalSeconds === 0 ? 'var(--surface)' : 'transparent',
                      opacity: day.totalSeconds === 0 ? 0.3 : 1,
                      transition: 'all 0.2s',
                    }}>
                      {day.categories.map((cat, catIdx) => {
                        const segmentHeight = (cat.seconds / yAxisMaxSeconds) * 100
                        const isHovered = hoveredBar?.dayIdx === dayIdx && hoveredBar?.catIdx === catIdx
                        return (
                          <div key={catIdx}
                            onMouseEnter={(e) => setHoveredBar({ dayIdx, catIdx, x: e.clientX, y: e.clientY })}
                            style={{
                              width: '100%',
                              height: `${segmentHeight}%`,
                              background: cat.color,
                              minHeight: cat.seconds > 0 ? '3px' : '0',
                              transition: 'height 0.8s ease, opacity 0.2s, filter 0.2s',
                              opacity: isHovered ? 1 : 0.85,
                              filter: isHovered ? `brightness(1.2) drop-shadow(0 0 6px ${cat.color})` : 'none',
                            }}
                          />
                        )
                      })}
                    </div>
                    <span style={{
                      fontSize: '0.52rem',
                      color: isToday ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                      fontWeight: isToday ? 700 : 400, whiteSpace: 'nowrap', marginTop: '2px',
                      background: isToday ? 'var(--surface-active)' : 'transparent',
                      borderRadius: '4px', padding: isToday ? '1px 4px' : '0 2px',
                    }}>
                      {formatDate(day.date).split(' ')[1]} {formatDate(day.date).split(' ')[0]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ INTERACTIVE CATEGORY BREAKDOWN ═══ */}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {/* Interactive Donut Chart */}
              <div style={{ position: 'relative', width: 160, height: 160 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  {(() => {
                    let offset = 0
                    return dynamicCategoryTotals.map((cat, i) => {
                      const pct = totalCatSeconds > 0 ? (cat.seconds / totalCatSeconds) * 100 : 0
                      const dash = `${pct} ${100 - pct}`
                      const isHovered = hoveredDonutIdx === i
                      const el = (
                        <circle key={i} cx="18" cy="18" r="15.9" fill="none"
                          stroke={cat.color}
                          strokeWidth={isHovered ? '4.2' : '3.2'}
                          strokeDasharray={dash} strokeDashoffset={-offset} strokeLinecap="round"
                          style={{
                            transition: 'all 0.3s ease-out',
                            filter: isHovered ? `drop-shadow(0 0 8px ${cat.color})` : 'none',
                            opacity: hoveredDonutIdx !== null && !isHovered ? 0.35 : 1,
                            cursor: 'pointer',
                          }}
                          onMouseEnter={() => setHoveredDonutIdx(i)}
                          onMouseLeave={() => setHoveredDonutIdx(null)}
                        />
                      )
                      offset += pct
                      return el
                    })
                  })()}
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                  {hoveredDonutIdx !== null ? (
                    <>
                      <span style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: dynamicCategoryTotals[hoveredDonutIdx]?.color }}>
                        {fmtHours(dynamicCategoryTotals[hoveredDonutIdx]?.seconds || 0)}h
                      </span>
                      <span style={{ fontSize: '0.55rem', color: dynamicCategoryTotals[hoveredDonutIdx]?.color, textTransform: 'uppercase', fontWeight: 700, maxWidth: '60px', textAlign: 'center', lineHeight: 1.2 }}>
                        {dynamicCategoryTotals[hoveredDonutIdx]?.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{fmtHours(totalCatSeconds)}</span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>hours</span>
                    </>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {dynamicCategoryTotals.map((cat, i) => {
                  const isHovered = hoveredDonutIdx === i
                  const pct = totalCatSeconds > 0 ? Math.round((cat.seconds / totalCatSeconds) * 100) : 0
                  return (
                    <div key={i}
                      onMouseEnter={() => setHoveredDonutIdx(i)}
                      onMouseLeave={() => setHoveredDonutIdx(null)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                        padding: '0.35rem 0.55rem', borderRadius: '8px',
                        background: isHovered ? `${cat.color}12` : 'transparent',
                        border: `1px solid ${isHovered ? cat.color + '30' : 'transparent'}`,
                        transition: 'all 0.2s',
                        transform: isHovered ? 'translateX(4px)' : 'none',
                      }}>
                      <div style={{ width: 10, height: 10, borderRadius: '3px', background: cat.color, flexShrink: 0, boxShadow: isHovered ? `0 0 8px ${cat.color}` : 'none', transition: 'box-shadow 0.2s' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: isHovered ? 700 : 600, minWidth: 60, color: isHovered ? cat.color : 'var(--text-primary)', transition: 'color 0.2s' }}>{cat.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{fmtDuration(cat.seconds)}</span>
                      <span style={{ fontSize: '0.65rem', color: isHovered ? cat.color : 'var(--text-tertiary)', fontWeight: isHovered ? 700 : 400, transition: 'all 0.2s' }}>({pct}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Horizontal Bar Chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {dynamicCategoryTotals.map((cat, i) => {
                const pct = totalCatSeconds > 0 ? (cat.seconds / totalCatSeconds) * 100 : 0
                const isHovered = hoveredDonutIdx === i
                return (
                  <div key={i}
                    onMouseEnter={() => setHoveredDonutIdx(i)}
                    onMouseLeave={() => setHoveredDonutIdx(null)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'transform 0.2s', transform: isHovered ? 'translateX(2px)' : 'none' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0, boxShadow: isHovered ? `0 0 8px ${cat.color}` : 'none' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: 70, color: isHovered ? cat.color : 'var(--text-primary)', transition: 'color 0.2s' }}>{cat.name}</span>
                    <div style={{ flex: 1, height: isHovered ? 10 : 8, background: 'var(--surface-hover)', borderRadius: '4px', overflow: 'hidden', transition: 'height 0.2s' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, background: isHovered ? `linear-gradient(90deg, ${cat.color}, ${cat.color}cc)` : cat.color,
                        borderRadius: '4px', transition: 'width 0.8s ease, background 0.3s',
                        boxShadow: isHovered ? `0 0 10px ${cat.color}40` : 'none',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: isHovered ? cat.color : 'var(--text-secondary)', minWidth: 45, textAlign: 'right', fontWeight: isHovered ? 700 : 400, transition: 'all 0.2s' }}>{fmtDuration(cat.seconds)}</span>
                  </div>
                )
              })}
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
            const isToday = day.date === todayKey
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
                  {/* Mini category indicators */}
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {day.categories.slice(0, 4).map((cat, ci) => (
                      <div key={ci} style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color }} title={cat.name} />
                    ))}
                  </div>
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
