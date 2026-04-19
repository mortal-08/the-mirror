'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Clock, Calendar, X, Check } from 'lucide-react'

type DateTimePickerProps = {
  isOpen: boolean
  onClose: () => void
  onSelect: (date: Date, endDate?: Date) => void
  initialDate?: Date
  title?: string
  defaultView?: 'time' | 'date'
  mode?: 'datetime' | 'time' | 'date'
}

export default function DateTimePicker({ isOpen, onClose, onSelect, initialDate, title = 'Select Time', defaultView = 'time', mode = 'datetime' }: DateTimePickerProps) {
  const [mounted, setMounted] = useState(false)
  
  const [selectedDate, setSelectedDate] = useState<Date>(() => initialDate || new Date())
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null)
  const [timeMode, setTimeMode] = useState<'single' | 'range'>('single')
  const [rangeTarget, setRangeTarget] = useState<'start' | 'end'>('start')
  const [view, setView] = useState<'time' | 'date'>(mode === 'date' ? 'date' : defaultView)
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = initialDate ? new Date(initialDate) : new Date()
    d.setDate(1)
    return d
  })
  
  const hoursListRef = useRef<HTMLDivElement>(null)
  const minutesListRef = useRef<HTMLDivElement>(null)
  const clockRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (initialDate && isOpen) {
       setSelectedDate(new Date(initialDate))
       setSelectedEndDate(null)
       setTimeMode('single')
       setRangeTarget('start')
       setView(mode === 'date' ? 'date' : defaultView)
    }
  }, [initialDate, isOpen, defaultView, mode])

  const hoursArray = Array.from({ length: 24 }, (_, i) => i)
  const minutesArray = Array.from({ length: 60 }, (_, i) => i)

  const activeDate = timeMode === 'range' && rangeTarget === 'end' ? (selectedEndDate || selectedDate) : selectedDate
  const hr = activeDate.getHours()
  const mn = activeDate.getMinutes()

  useEffect(() => {
    if (isOpen && view === 'time' && hoursListRef.current && minutesListRef.current) {
       const hChild = hoursListRef.current.children[hr] as HTMLElement
       const mChild = minutesListRef.current.children[mn] as HTMLElement
       setTimeout(() => {
          if (hChild) hChild.scrollIntoView({ behavior: 'smooth', block: 'center' })
          if (mChild) mChild.scrollIntoView({ behavior: 'smooth', block: 'center' })
       }, 50)
    }
  }, [hr, mn, isOpen, view])

  if (!isOpen || !mounted) return null

  const handleSelectHour = (h: number) => {
    const target = timeMode === 'range' && rangeTarget === 'end' ? (selectedEndDate ? new Date(selectedEndDate) : new Date(selectedDate)) : new Date(selectedDate)
    target.setHours(h)
    if (timeMode === 'range' && rangeTarget === 'end') setSelectedEndDate(target)
    else setSelectedDate(target)
  }

  const handleSelectMinute = (m: number) => {
    const target = timeMode === 'range' && rangeTarget === 'end' ? (selectedEndDate ? new Date(selectedEndDate) : new Date(selectedDate)) : new Date(selectedDate)
    target.setMinutes(m)
    if (timeMode === 'range' && rangeTarget === 'end') setSelectedEndDate(target)
    else setSelectedDate(target)
  }

  const handleConfirm = () => {
    if (timeMode === 'range' && selectedEndDate) {
       onSelect(selectedDate, selectedEndDate)
    } else {
       onSelect(selectedDate)
    }
    onClose()
  }

  const updateTimeFromPointer = (e: React.PointerEvent | PointerEvent) => {
    if (!clockRef.current) return
    const rect = clockRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    if (angle < 0) angle += 360

    // Map 360 degrees strictly to 60 minutes.
    const newM = Math.round((angle / 360) * 60) % 60
    
    const nextDate = new Date(activeDate)
    nextDate.setMinutes(newM)
    
    if (timeMode === 'range' && rangeTarget === 'end') setSelectedEndDate(nextDate)
    else setSelectedDate(nextDate)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true
    updateTimeFromPointer(e)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging.current) updateTimeFromPointer(e)
  }
  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  // Calendar Logic
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()
  const firstDayOfWeek = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay()
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  const nextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
  const prevMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))

  const handleSelectDate = (day: number) => {
    const nextDate = new Date(selectedDate)
    nextDate.setFullYear(calendarMonth.getFullYear())
    nextDate.setMonth(calendarMonth.getMonth())
    nextDate.setDate(day)
    setSelectedDate(nextDate)
    
    if (mode === 'date') {
      onSelect(nextDate)
      onClose()
    } else {
      setView('time')
    }
  }

  const hourDeg = (hr % 12) * 30 + (mn / 60) * 30
  const minDeg = mn * 6

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
      
      {/* Backdrop overlay */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />

      {/* Main Card */}
      <div className="glass-glow" style={{ position: 'relative', width: '100%', maxWidth: '380px', background: 'var(--bg-primary)', border: '1px solid var(--surface-border)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', zIndex: 1, animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--surface-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Clock size={18} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>

        {/* Time Settings Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
          
          {view === 'time' && mode !== 'date' && (
            <>
              {/* Segmented control */}
              <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: '12px', padding: '0.25rem' }}>
                <button
                   onClick={() => { setTimeMode('single'); setRangeTarget('start') }}
                   style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', border: 'none', background: timeMode === 'single' ? 'var(--bg-primary)' : 'transparent', color: timeMode === 'single' ? 'var(--text-primary)' : 'var(--text-tertiary)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: timeMode === 'single' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {timeMode === 'single' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)' }} />} Single time
                </button>
                <button
                   onClick={() => { setTimeMode('range'); if (!selectedEndDate) setSelectedEndDate(new Date(selectedDate.getTime() + 3600000)); }}
                   style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', border: 'none', background: timeMode === 'range' ? 'var(--bg-primary)' : 'transparent', color: timeMode === 'range' ? 'var(--text-primary)' : 'var(--text-tertiary)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: timeMode === 'range' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {timeMode === 'range' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)' }} />} Time range
                </button>
              </div>
               
              {/* Time Range Targets */}
              {timeMode === 'range' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 1rem' }}>
                  <div onClick={() => setRangeTarget('start')} style={{ cursor: 'pointer', opacity: rangeTarget === 'start' ? 1 : 0.5, borderBottom: rangeTarget === 'start' ? '2px solid var(--accent-primary)' : 'none', paddingBottom: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Start Time</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div onClick={() => setRangeTarget('end')} style={{ cursor: 'pointer', opacity: rangeTarget === 'end' ? 1 : 0.5, borderBottom: rangeTarget === 'end' ? '2px solid var(--accent-primary)' : 'none', paddingBottom: '4px', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>End Time</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{(selectedEndDate || selectedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              )}

              {/* Clock & List Flex */}
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', height: '180px' }}>
                
                {/* Analog Clock */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                   <div 
                      ref={clockRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      style={{ position: 'relative', width: '130px', height: '130px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--surface-border)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)', touchAction: 'none', cursor: isDragging.current ? 'grabbing' : 'grab' }}
                   >
                      {[...Array(12)].map((_, i) => (
                        <div key={i} style={{ position: 'absolute', width: '2px', height: '6px', background: 'var(--text-tertiary)', opacity: i % 3 === 0 ? 0.8 : 0.3, top: 6, left: 'calc(50% - 1px)', transformOrigin: 'calc(50% + 1px) 59px', transform: `rotate(${i * 30}deg)` }} />
                      ))}
                      <div style={{ position: 'absolute', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-primary)', top: 'calc(50% - 3px)', left: 'calc(50% - 3px)', zIndex: 10 }} />
                      <div style={{ position: 'absolute', width: '3px', height: '35px', background: 'var(--text-primary)', top: 'calc(50% - 35px)', left: 'calc(50% - 1.5px)', transformOrigin: 'bottom center', transform: `rotate(${hourDeg}deg)`, borderRadius: '4px', transition: 'transform 0.3s cubic-bezier(0.4, 2.08, 0.55, 0.44)', zIndex: 5 }} />
                      <div style={{ position: 'absolute', width: '2px', height: '48px', background: 'var(--accent-primary)', top: 'calc(50% - 48px)', left: 'calc(50% - 1px)', transformOrigin: 'bottom center', transform: `rotate(${minDeg}deg)`, borderRadius: '4px', transition: 'transform 0.3s cubic-bezier(0.4, 2.08, 0.55, 0.44)', zIndex: 6 }} />
                   </div>
                </div>

                {/* Vertically Scrollable Times List (Dual Column) */}
                <div style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', gap: '0.5rem' }}>
                   
                   {/* Hours Column */}
                   <div style={{ flex: 1, position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to bottom, var(--bg-primary), transparent)', zIndex: 2, pointerEvents: 'none' }} />
                      <div ref={hoursListRef} style={{ height: '100%', overflowY: 'auto', padding: '70px 0', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="no-scrollbar">
                         {hoursArray.map((h) => {
                            const isSelected = hr === h
                            return (
                               <div key={h} onClick={() => handleSelectHour(h)}
                                 style={{ padding: '0.65rem 0', textAlign: 'center', fontSize: isSelected ? '1.1rem' : '0.95rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)', cursor: 'pointer', transition: 'all 0.2s', opacity: isSelected ? 1 : 0.4 }}>
                                  {h.toString().padStart(2, '0')}h
                               </div>
                            )
                         })}
                      </div>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to top, var(--bg-primary), transparent)', zIndex: 2, pointerEvents: 'none' }} />
                   </div>

                   <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)', fontWeight: 700 }}>:</div>

                   {/* Minutes Column */}
                   <div style={{ flex: 1, position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to bottom, var(--bg-primary), transparent)', zIndex: 2, pointerEvents: 'none' }} />
                      <div ref={minutesListRef} style={{ height: '100%', overflowY: 'auto', padding: '70px 0', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="no-scrollbar">
                         {minutesArray.map((m) => {
                            const isSelected = mn === m
                            return (
                               <div key={m} onClick={() => handleSelectMinute(m)}
                                 style={{ padding: '0.65rem 0', textAlign: 'center', fontSize: isSelected ? '1.1rem' : '0.95rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)', cursor: 'pointer', transition: 'all 0.2s', opacity: isSelected ? 1 : 0.4 }}>
                                  {m.toString().padStart(2, '0')}m
                               </div>
                            )
                         })}
                      </div>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to top, var(--bg-primary), transparent)', zIndex: 2, pointerEvents: 'none' }} />
                   </div>
                </div>
              </div>
              
              {/* Native date fallback or nice date selector */}
              <div 
                 onClick={() => setView('date')}
                 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--surface-border)', marginTop: '0.5rem', cursor: 'pointer' }}
                 className="hover-bg-surface-hover"
              >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                     <Calendar size={16} color="var(--text-tertiary)" />
                     <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date</span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                    {selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
              </div>
            </>
          )}

          {view === 'date' && (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <button onClick={() => setView('time')} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Back to Time</button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <button onClick={prevMonth} style={{ background: 'var(--surface)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>&lt;</button>
                     <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', width: '100px', textAlign: 'center' }}>{monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
                     <button onClick={nextMonth} style={{ background: 'var(--surface)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>&gt;</button>
                  </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                  {dayNames.map(d => <div key={d} style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{d}</div>)}
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {[...Array(firstDayOfWeek)].map((_, i) => <div key={`empty-${i}`} />)}
                  {[...Array(daysInMonth)].map((_, i) => {
                     const day = i + 1
                     const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === calendarMonth.getMonth() && selectedDate.getFullYear() === calendarMonth.getFullYear()
                     return (
                        <button
                           key={day}
                           onClick={() => handleSelectDate(day)}
                           style={{
                              aspectRatio: '1',
                              background: isSelected ? 'var(--accent-primary)' : 'transparent',
                              border: 'none',
                              borderRadius: '8px',
                              color: isSelected ? 'white' : 'var(--text-primary)',
                              fontSize: '0.85rem',
                              fontWeight: isSelected ? 700 : 500,
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                           }}
                           className={!isSelected ? 'hover-bg-surface' : ''}
                        >
                           {day}
                        </button>
                     )
                  })}
               </div>
            </div>
          )}

          <button onClick={handleConfirm} style={{ width: '100%', padding: '0.85rem', marginTop: view==='time' ? '0.5rem' : '1.5rem', background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
             <Check size={18} /> Confirm {view === 'time' ? 'Time' : 'Selection'}
          </button>

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .hover-bg-surface:hover { background: var(--surface) !important; color: var(--text-primary) !important; }
        .hover-bg-surface-hover:hover { background: var(--surface-hover) !important; }
      `}} />
    </div>,
    document.body
  )
}
