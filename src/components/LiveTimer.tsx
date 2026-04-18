'use client'

import { useState, useEffect, useCallback } from 'react'
import { createTimeEntry } from '@/actions/timeEntries'
import { useToast } from '@/components/ToastProvider'
import { Play, Square, RotateCcw, Coffee, Zap, Maximize, Minimize, X } from 'lucide-react'

type Mode = 'focus' | 'pomodoro'
type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'

const POMODORO = { work: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 }

export default function LiveTimer({ categories }: { categories: any[] }) {
  const { toast } = useToast()
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [selectedCat, setSelectedCat] = useState('')
  const [mode, setMode] = useState<Mode>('focus')
  const [pomPhase, setPomPhase] = useState<PomodoroPhase>('work')
  const [pomCount, setPomCount] = useState(0)
  const [pomRemaining, setPomRemaining] = useState(POMODORO.work)
  const [showModal, setShowModal] = useState(false)
  const [stoppedData, setStoppedData] = useState<any>(null)
  const [desc, setDesc] = useState('')
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('mirror_timer')
    if (saved) {
      const data = JSON.parse(saved)
      setStartTime(data.startTime)
      setSelectedCat(data.categoryId || '')
      setMode(data.mode || 'focus')
    }
  }, [])

  useEffect(() => {
    if (!startTime) return
    const interval = setInterval(() => {
      const el = Math.floor((Date.now() - startTime) / 1000)
      setElapsed(el)
      if (mode === 'pomodoro') {
        const target = POMODORO[pomPhase]
        const rem = target - el
        setPomRemaining(Math.max(rem, 0))
        if (rem <= 0) handlePomodoroComplete()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime, mode, pomPhase])

  const handlePomodoroComplete = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 800
      gain.gain.value = 0.3
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    } catch {}

    if (pomPhase === 'work') {
      const newCount = pomCount + 1
      setPomCount(newCount)
      if (startTime) {
        const end = Date.now()
        const dur = Math.floor((end - startTime) / 1000)
        createTimeEntry({
          description: `Pomodoro #${newCount}`,
          startTime: new Date(startTime),
          endTime: new Date(end),
          durationSeconds: dur,
          categoryId: selectedCat || undefined,
        })
        toast(`Pomodoro #${newCount} logged!`, 'success')
      }
      if (newCount % 4 === 0) {
        setPomPhase('longBreak')
        setPomRemaining(POMODORO.longBreak)
      } else {
        setPomPhase('shortBreak')
        setPomRemaining(POMODORO.shortBreak)
      }
      setStartTime(Date.now())
      setElapsed(0)
    } else {
      setPomPhase('work')
      setPomRemaining(POMODORO.work)
      setStartTime(Date.now())
      setElapsed(0)
      toast('Break over! Time to focus.', 'info')
    }
  }, [pomPhase, pomCount, startTime, selectedCat, toast])

  const handleStart = () => {
    const now = Date.now()
    setStartTime(now)
    setElapsed(0)
    if (mode === 'pomodoro') {
      setPomPhase('work')
      setPomRemaining(POMODORO.work)
      setPomCount(0)
    }
    localStorage.setItem('mirror_timer', JSON.stringify({
      startTime: now, categoryId: selectedCat, mode,
    }))
  }

  const handleStop = () => {
    if (!startTime) return
    const end = Date.now()
    const dur = Math.floor((end - startTime) / 1000)
    setStoppedData({ startTime, endTime: end, durationSeconds: dur })
    setShowModal(true)
    setStartTime(null)
    localStorage.removeItem('mirror_timer')
  }

  const handleSaveEntry = async () => {
    if (!stoppedData) return
    await createTimeEntry({
      description: desc || undefined,
      startTime: new Date(stoppedData.startTime),
      endTime: new Date(stoppedData.endTime),
      durationSeconds: stoppedData.durationSeconds,
      categoryId: selectedCat || undefined,
    })
    toast('Time block saved!', 'success')
    setShowModal(false)
    setDesc('')
    setStoppedData(null)
    setElapsed(0)
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return { h, m, s }
  }

  const timeObj = mode === 'pomodoro' && startTime ? formatTime(pomRemaining) : formatTime(elapsed)
  const isPomodoro = mode === 'pomodoro'
  const accentColor = startTime
    ? (isPomodoro ? (pomPhase === 'work' ? 'var(--accent-warning)' : 'var(--accent-success)') : 'var(--accent-primary)')
    : 'var(--text-tertiary)'

  // Pomodoro progress for circular ring
  const pomProgress = mode === 'pomodoro' && startTime
    ? ((POMODORO[pomPhase] - pomRemaining) / POMODORO[pomPhase]) * 100
    : 0
  const circumference = 2 * Math.PI * 150

  const timerContent = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: fullscreen ? '100vh' : 'auto', padding: fullscreen ? '2rem' : 0, position: 'relative' }}>

      {/* Fullscreen toggle */}
      <button
        onClick={() => setFullscreen(!fullscreen)}
        style={{ position: 'absolute', top: fullscreen ? '2rem' : '1rem', right: fullscreen ? '2rem' : '1rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
      >
        {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
      </button>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem' }}>
        <button className={mode === 'focus' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.6rem 1.4rem', fontSize: '0.85rem' }} onClick={() => { setMode('focus'); if (!startTime) setPomRemaining(POMODORO.work) }}>
          <Zap size={16} /> Focus
        </button>
        <button className={mode === 'pomodoro' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.6rem 1.4rem', fontSize: '0.85rem' }} onClick={() => { setMode('pomodoro'); if (!startTime) setPomRemaining(POMODORO.work) }}>
          <Coffee size={16} /> Pomodoro
        </button>
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 500 }}>
        <button onClick={() => setSelectedCat('')} disabled={!!startTime} className={!selectedCat ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', opacity: startTime ? 0.5 : 1 }}>
          All
        </button>
        {categories.map((c: any) => (
          <button key={c.id} onClick={() => setSelectedCat(c.id)} disabled={!!startTime} className={selectedCat === c.id ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', opacity: startTime ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
            {c.name}
          </button>
        ))}
      </div>

      {/* Circular Clock */}
      <div style={{ position: 'relative', width: fullscreen ? 380 : 320, height: fullscreen ? 380 : 320, marginBottom: '2.5rem' }}>
        {/* SVG Ring */}
        <svg style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} viewBox="0 0 320 320">
          <circle cx="160" cy="160" r="150" fill="none" stroke="var(--surface-border)" strokeWidth="4" />
          {mode === 'pomodoro' && startTime && (
            <circle cx="160" cy="160" r="150" fill="none" stroke={accentColor} strokeWidth="4"
              strokeDasharray={circumference} strokeDashoffset={circumference - (circumference * pomProgress / 100)}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
          )}
        </svg>

        {/* Time Display */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            {['h', 'm', 's'].map((unit, idx) => {
              const val = (timeObj as any)[unit]
              return (
                <div key={unit} style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: fullscreen ? '5rem' : '4rem', fontWeight: 800, color: startTime ? accentColor : 'var(--text-primary)', lineHeight: 1, transition: 'color 0.3s' }}>
                    {val}
                  </span>
                  {idx < 2 && <span style={{ fontSize: fullscreen ? '3rem' : '2.5rem', color: accentColor, opacity: 0.4, margin: '0 2px' }}>:</span>}
                </div>
              )
            })}
          </div>

          {mode === 'pomodoro' && startTime && (
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: accentColor, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {pomPhase === 'work' ? `Focus #${pomCount + 1}` : pomPhase === 'shortBreak' ? 'Short Break' : 'Long Break'}
            </div>
          )}

          {!startTime && (
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Ready</div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        {!startTime ? (
          <button className="btn-primary" onClick={handleStart} style={{ padding: '1.2rem 3rem', fontSize: '1.1rem' }}>
            <Play size={22} /> Start Session
          </button>
        ) : (
          <>
            <button className="btn-secondary" onClick={handleStop} style={{ padding: '1rem 2rem', fontSize: '1rem', borderColor: 'rgba(255,0,85,0.4)', color: '#ff5577' }}>
              <Square size={20} /> Stop
            </button>
            {mode === 'focus' && (
              <button className="btn-secondary" onClick={() => { setStartTime(null); setElapsed(0); localStorage.removeItem('mirror_timer') }} style={{ padding: '1rem 2rem', fontSize: '1rem' }}>
                <RotateCcw size={20} /> Reset
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      {fullscreen ? (
        <div className="fullscreen-overlay">
          {timerContent}
        </div>
      ) : (
        <div className="glass-glow" style={{ textAlign: 'center', padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
          {timerContent}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setStoppedData(null) }}>
          <div className="glass-glow" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', padding: '2.5rem' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Session Complete</h2>
            <div style={{ fontSize: '3rem', fontFamily: 'var(--font-mono)', fontWeight: 900, marginBottom: '2rem', color: 'var(--accent-primary)' }}>
              {stoppedData && `${formatTime(stoppedData.durationSeconds).h}:${formatTime(stoppedData.durationSeconds).m}:${formatTime(stoppedData.durationSeconds).s}`}
            </div>
            <div style={{ marginBottom: '2rem' }}>
              <label>Description (optional)</label>
              <input className="input" type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What did you work on?" autoFocus />
            </div>
            <div className="grid-2">
              <button className="btn-primary w-full" onClick={handleSaveEntry}>Save Entry</button>
              <button className="btn-secondary w-full" onClick={() => { setShowModal(false); setStoppedData(null) }}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
