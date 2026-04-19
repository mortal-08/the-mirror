'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Clock, Calendar, X, Check } from 'lucide-react'

type DateTimePickerProps = {
  isOpen: boolean
  onClose: () => void
  onSelect: (date: Date) => void
  initialDate?: Date
  title?: string
  defaultView?: 'time' | 'date'
}

export default function DateTimePicker({ isOpen, onClose, onSelect, initialDate, title = 'Select Time', defaultView = 'time' }: DateTimePickerProps) {
  const [mounted, setMounted] = useState(false)
  
  const [selectedDate, setSelectedDate] = useState<Date>(() => initialDate || new Date())
  const [timeMode, setTimeMode] = useState<'single' | 'range'>('single')
  const [view, setView] = useState<'time' | 'date'>(defaultView)
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = initialDate ? new Date(initialDate) : new Date()
    d.setDate(1)
    return d
  })
  
  const timesListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (initialDate && isOpen) {
       setSelectedDate(new Date(initialDate))
       setView(defaultView)
    }
  }, [initialDate, isOpen, defaultView])

  // Generate times (every 30 mins)
  const times: Array<{ hours: number; minutes: number; label: string }> = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const isPM = h >= 12
      const displayH = h % 12 === 0 ? 12 : h % 12
      const displayM = m === 0 ? '00' : m
      times.push({
        hours: h,
        minutes: m,
        label: `${displayH}:${displayM} ${isPM ? 'pm' : 'am'}`,
      })
    }
  }

  // Scroll to active time automatically
  useEffect(() => {
    if (isOpen && timesListRef.current) {
      const hr = selectedDate.getHours()
      const mn = selectedDate.getMinutes()
      const nearestIdx = times.findIndex((t) => t.hours === hr && (Math.abs(t.minutes - mn) < 30 || t.minutes === 0))
      
      if (nearestIdx !== -1) {
        const item = timesListRef.current.children[nearestIdx] as HTMLElement
        if (item) {
           setTimeout(() => {
             item.scrollIntoView({ behavior: 'smooth', block: 'center' })
           }, 100)
        }
      }
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const handleSelectTime = (h: number, m: number) => {
    const nextDate = new Date(selectedDate)
    nextDate.setHours(h)
    nextDate.setMinutes(m)
    setSelectedDate(nextDate)
  }

  const handleConfirm = () => {
    onSelect(selectedDate)
    onClose()
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
    setView('time')
  }

  // Analog Clock Math
  const hr = selectedDate.getHours()
  const mn = selectedDate.getMinutes()
  
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
          
          {view === 'time' && (
            <>
              {/* Segmented control */}
              <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: '12px', padding: '0.25rem' }}>
                <button
                   onClick={() => setTimeMode('single')}
                   style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', border: 'none', background: timeMode === 'single' ? 'var(--bg-primary)' : 'transparent', color: timeMode === 'single' ? 'var(--text-primary)' : 'var(--text-tertiary)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: timeMode === 'single' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {timeMode === 'single' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)' }} />} Single time
                </button>
                <button
                   onClick={() => setTimeMode('range')}
                   style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', border: 'none', background: timeMode === 'range' ? 'var(--bg-primary)' : 'transparent', color: timeMode === 'range' ? 'var(--text-primary)' : 'var(--text-tertiary)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: timeMode === 'range' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}
                >
                  Time range
                </button>
              </div>

              {/* Clock & List Flex */}
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', height: '180px' }}>
                
                {/* Analog Clock */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                   <div style={{ position: 'relative', width: '130px', height: '130px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--surface-border)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)' }}>
                      {[...Array(12)].map((_, i) => (
                        <div key={i} style={{ position: 'absolute', width: '2px', height: '6px', background: 'var(--text-tertiary)', opacity: i % 3 === 0 ? 0.8 : 0.3, top: 6, left: 'calc(50% - 1px)', transformOrigin: 'calc(50% + 1px) 59px', transform: `rotate(${i * 30}deg)` }} />
                      ))}
                      <div style={{ position: 'absolute', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-primary)', top: 'calc(50% - 3px)', left: 'calc(50% - 3px)', zIndex: 10 }} />
                      <div style={{ position: 'absolute', width: '3px', height: '35px', background: 'var(--text-primary)', top: 'calc(50% - 35px)', left: 'calc(50% - 1.5px)', transformOrigin: 'bottom center', transform: `rotate(${hourDeg}deg)`, borderRadius: '4px', transition: 'transform 0.3s cubic-bezier(0.4, 2.08, 0.55, 0.44)', zIndex: 5 }} />
                      <div style={{ position: 'absolute', width: '2px', height: '48px', background: 'var(--accent-primary)', top: 'calc(50% - 48px)', left: 'calc(50% - 1px)', transformOrigin: 'bottom center', transform: `rotate(${minDeg}deg)`, borderRadius: '4px', transition: 'transform 0.3s cubic-bezier(0.4, 2.08, 0.55, 0.44)', zIndex: 6 }} />
                   </div>
                </div>

                {/* Vertically Scrollable Times List */}
                <div style={{ flex: 1, height: '100%', position: 'relative' }}>
                   <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to bottom, var(--bg-primary), transparent)', zIndex: 2, pointerEvents: 'none' }} />
                   <div ref={timesListRef} style={{ height: '100%', overflowY: 'auto', padding: '40px 0', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="no-scrollbar">
                      {times.map((t, idx) => {
                         const isSelected = hr === t.hours && mn === t.minutes
                         return (
                            <div
                              key={idx}
                              onClick={() => handleSelectTime(t.hours, t.minutes)}
                              style={{
                                 padding: '0.65rem 0',
                                 textAlign: 'center',
                                 fontSize: isSelected ? '1.1rem' : '0.95rem',
                                 fontWeight: isSelected ? 700 : 500,
                                 color: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                 cursor: 'pointer',
                                 transition: 'all 0.2s',
                                 opacity: isSelected ? 1 : 0.6
                              }}
                            >
                               {t.label}
                            </div>
                         )
                      })}
                   </div>
                   <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to top, var(--bg-primary), transparent)', zIndex: 2, pointerEvents: 'none' }} />
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
