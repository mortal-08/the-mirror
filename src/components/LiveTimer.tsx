'use client'

import { useState, useEffect, useCallback } from 'react'
import { createTimeEntry } from '@/actions/timeEntries'
import { useToast } from '@/components/ToastProvider'
import { Play, Square, RotateCcw, Coffee, Zap, Activity } from 'lucide-react'

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
  
  // Fake matrix numbers for "crazy features" background sync visual
  const [matrixMatrix, setMatrixMatrix] = useState('00 00 00')

  // Restore timer from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mirror_timer')
    if (saved) {
      const data = JSON.parse(saved)
      setStartTime(data.startTime)
      setSelectedCat(data.categoryId || '')
      setMode(data.mode || 'focus')
    }
  }, [])

  // Tick
  useEffect(() => {
    if (!startTime) return
    const interval = setInterval(() => {
      const el = Math.floor((Date.now() - startTime) / 1000)
      setElapsed(el)
      
      const rHex1 = Math.floor(Math.random() * 255).toString(16).padStart(2, '0')
      const rHex2 = Math.floor(Math.random() * 255).toString(16).padStart(2, '0')
      const rHex3 = Math.floor(Math.random() * 255).toString(16).padStart(2, '0')
      setMatrixMatrix(`${rHex1.toUpperCase()} ${rHex2.toUpperCase()} ${rHex3.toUpperCase()}`)

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
    // Play notification sound
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
  const accentColor = startTime ? (isPomodoro ? (pomPhase === 'work' ? 'var(--accent-warning)' : 'var(--accent-success)') : 'var(--accent-secondary)') : 'var(--text-tertiary)'

  return (
    <>
      <div className="glass-glow flex-col reveal-up" style={{ textAlign: 'center', padding: '3rem 2rem', position: 'relative', overflow: 'hidden' }}>
        
        {/* Fake Matrix Network Background */}
        {startTime && (
          <div style={{ position: 'absolute', top: '10px', right: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: accentColor, opacity: 0.5, letterSpacing: '0.2em' }}>
             SYNC: {matrixMatrix} [{pomCount > 0 ? pomCount : '00'}]
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <Activity size={18} color={accentColor} />
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: accentColor, fontWeight: 700 }}>
            {startTime ? 'Live Feed Protocol' : 'Idle Protocol'}
          </span>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
          <button
            className={mode === 'focus' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.6rem 1.4rem', fontSize: '0.85rem' }}
            onClick={() => { setMode('focus'); if (!startTime) setPomRemaining(POMODORO.work) }}
          >
            <Zap size={16} /> Focus
          </button>
          <button
            className={mode === 'pomodoro' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.6rem 1.4rem', fontSize: '0.85rem' }}
            onClick={() => { setMode('pomodoro'); if (!startTime) setPomRemaining(POMODORO.work) }}
          >
            <Coffee size={16} /> Pomodoro
          </button>
        </div>

        {/* Category Setup */}
        <select
          className="input"
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          disabled={!!startTime}
          style={{ maxWidth: '300px', margin: '0 auto 2.5rem', textAlign: 'center', fontSize: '1.1rem' }}
        >
          <option value="">UNCATEGORIZED NODE</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
          ))}
        </select>

        {/* Futuristic Digital Matrix Clock */}
        <div style={{
          display: 'inline-flex',
          gap: '1rem',
          margin: '0 auto 3rem',
          padding: '2rem 3rem',
          background: 'rgba(0,0,0,0.4)',
          border: `1px solid ${accentColor}`,
          borderRadius: '32px',
          boxShadow: `inset 0 0 40px rgba(0,0,0,0.8), 0 0 30px ${startTime ? accentColor.replace('var(--', 'var(--').replace(')', '-glow)') : 'transparent'}`
        }}>
          {['h', 'm', 's'].map((unit, idx) => {
             const val = (timeObj as any)[unit]
             return (
               <div key={unit} style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                 <div className={`timer-display ${startTime ? 'running' : ''}`} style={{ fontSize: '7rem', lineHeight: 1, color: accentColor }}>
                   {val}
                 </div>
                 {idx < 2 && <div style={{ fontSize: '5rem', color: accentColor, opacity: 0.5, animation: startTime ? 'digitPulse 1s infinite alternate' : 'none' }}>:</div>}
               </div>
             )
          })}
        </div>

        {mode === 'pomodoro' && startTime && (
          <div style={{ marginBottom: '2rem', fontSize: '1rem', color: accentColor, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {pomPhase === 'work' ? '🔥 Work Session Phase' : pomPhase === 'shortBreak' ? '☕ Short Break Refresh' : '🌴 Long Break Rest'}
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
          {!startTime ? (
            <button className="btn-primary" onClick={handleStart} style={{ padding: '1.2rem 3rem', fontSize: '1.2rem', boxShadow: `0 0 30px rgba(143,0,255,0.4)` }}>
              <Play size={24} /> ENGAGE PROTOCOL
            </button>
          ) : (
            <>
              <button className="btn-secondary" onClick={handleStop} style={{ padding: '1.2rem 2.5rem', fontSize: '1.1rem', borderColor: 'rgba(255,0,85,0.5)', color: '#ff0055' }}>
                <Square size={22} /> CAPTURE DATA
              </button>
              {mode === 'focus' && (
                <button className="btn-secondary" onClick={() => { setStartTime(null); setElapsed(0); localStorage.removeItem('mirror_timer') }} style={{ padding: '1.2rem 2.5rem', fontSize: '1.1rem' }}>
                  <RotateCcw size={22} /> PURGE
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ background: 'rgba(5,2,10,0.85)' }} onClick={() => { setShowModal(false); setStoppedData(null) }}>
          <div className="glass-glow" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', padding: '3rem', border: '1px solid var(--accent-secondary)' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent-secondary)' }}>SESSION LOGGED</h2>
            <div style={{ fontSize: '3rem', fontFamily: 'var(--font-mono)', fontWeight: 900, marginBottom: '2rem', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
              {stoppedData && `${formatTime(stoppedData.durationSeconds).h}:${formatTime(stoppedData.durationSeconds).m}:${formatTime(stoppedData.durationSeconds).s}`}
            </div>
            <div style={{ marginBottom: '2rem' }}>
              <label>Node Tag (Optional)</label>
              <input
                className="input"
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What was the primary function?"
                autoFocus
              />
            </div>
            <div className="grid-2">
              <button className="btn-primary w-full" onClick={handleSaveEntry}>APPEND TO DB</button>
              <button className="btn-secondary w-full" onClick={() => { setShowModal(false); setStoppedData(null) }}>DISCARD DATA</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
