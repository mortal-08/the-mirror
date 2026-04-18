'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createTimeEntry } from '@/actions/timeEntries'
import { useToast } from '@/components/ToastProvider'
import { Play, Square, Pause, Coffee, Zap, Maximize, Minimize, Settings2, X, RotateCcw } from 'lucide-react'

type Mode = 'focus' | 'pomodoro'
type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'

export default function LiveTimer({ categories }: { categories: any[] }) {
  const { toast } = useToast()
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0) // seconds elapsed
  const [selectedCat, setSelectedCat] = useState('')
  const [mode, setMode] = useState<Mode>('focus')
  const [pomPhase, setPomPhase] = useState<PomodoroPhase>('work')
  const [pomCount, setPomCount] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [stoppedDuration, setStoppedDuration] = useState(0)
  const [stoppedStart, setStoppedStart] = useState<number>(0)
  const [desc, setDesc] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [modalCat, setModalCat] = useState('')

  // Pomodoro settings
  const [showSettings, setShowSettings] = useState(false)
  const [workMin, setWorkMin] = useState(25)
  const [shortBreakMin, setShortBreakMin] = useState(5)
  const [longBreakMin, setLongBreakMin] = useState(15)
  const [sessionsBeforeLong, setSessionsBeforeLong] = useState(4)

  // Refs for interval
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef(0)
  const elapsedBeforePauseRef = useRef(0)

  const pomTimes = { work: workMin * 60, shortBreak: shortBreakMin * 60, longBreak: longBreakMin * 60 }

  // Load settings
  useEffect(() => {
    const pomSettings = localStorage.getItem('mirror_pom_settings')
    if (pomSettings) {
      const s = JSON.parse(pomSettings)
      setWorkMin(s.work || 25)
      setShortBreakMin(s.shortBreak || 5)
      setLongBreakMin(s.longBreak || 15)
      setSessionsBeforeLong(s.sessions || 4)
    }
  }, [])

  const playFinishSound = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq; osc.type = 'sine'
        gain.gain.setValueAtTime(0.4, ctx.currentTime + start)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + dur)
      }
      playTone(523.25, 0, 0.3)
      playTone(659.25, 0.35, 0.3)
      playTone(783.99, 0.7, 0.5)
    } catch {}
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Mirror Timer', { body: 'Session complete! 🎯' })
    }
  }, [])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Timer tick
  useEffect(() => {
    if (running && !paused) {
      startTimeRef.current = Date.now()
      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const newElapsed = elapsedBeforePauseRef.current + Math.floor((now - startTimeRef.current) / 1000)
        setElapsed(newElapsed)

        // Pomodoro auto-complete
        if (mode === 'pomodoro') {
          const target = pomTimes[pomPhase]
          if (newElapsed >= target) {
            handlePomodoroComplete()
          }
        }
      }, 200)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, paused, mode, pomPhase, workMin, shortBreakMin, longBreakMin])

  const handlePomodoroComplete = () => {
    playFinishSound()
    if (pomPhase === 'work') {
      const newCount = pomCount + 1
      setPomCount(newCount)
      createTimeEntry({
        description: `Pomodoro #${newCount}`,
        startTime: new Date(Date.now() - elapsed * 1000),
        endTime: new Date(),
        durationSeconds: elapsed,
        categoryId: selectedCat || undefined,
      })
      toast(`Pomodoro #${newCount} logged! 🍅`, 'success')
      if (newCount % sessionsBeforeLong === 0) {
        setPomPhase('longBreak')
      } else {
        setPomPhase('shortBreak')
      }
    } else {
      setPomPhase('work')
      toast('Break over! Focus time. 💪', 'info')
    }
    setElapsed(0)
    elapsedBeforePauseRef.current = 0
    startTimeRef.current = Date.now()
  }

  const savePomSettings = () => {
    localStorage.setItem('mirror_pom_settings', JSON.stringify({ work: workMin, shortBreak: shortBreakMin, longBreak: longBreakMin, sessions: sessionsBeforeLong }))
    setShowSettings(false)
    toast('Settings saved!', 'success')
  }

  const handleStart = () => {
    setRunning(true)
    setPaused(false)
    setElapsed(0)
    elapsedBeforePauseRef.current = 0
    startTimeRef.current = Date.now()
    setStoppedStart(Date.now())
    if (mode === 'pomodoro') {
      setPomPhase('work')
      setPomCount(0)
    }
  }

  const handlePause = () => {
    elapsedBeforePauseRef.current = elapsed
    setPaused(true)
  }

  const handleResume = () => {
    startTimeRef.current = Date.now()
    setPaused(false)
  }

  const handleStop = () => {
    const dur = elapsed
    playFinishSound()
    setRunning(false)
    setPaused(false)
    setStoppedDuration(dur)
    setModalCat(selectedCat)
    setFullscreen(false)
    setElapsed(0)
    elapsedBeforePauseRef.current = 0
    setTimeout(() => setShowModal(true), 100)
  }

  const handleReset = () => {
    setRunning(false)
    setPaused(false)
    setElapsed(0)
    elapsedBeforePauseRef.current = 0
  }

  const handleSaveEntry = async () => {
    if (stoppedDuration <= 0) return
    const endTime = Date.now()
    await createTimeEntry({
      description: desc || undefined,
      startTime: new Date(endTime - stoppedDuration * 1000),
      endTime: new Date(endTime),
      durationSeconds: stoppedDuration,
      categoryId: modalCat || undefined,
    })
    toast('Time block saved!', 'success')
    setShowModal(false)
    setDesc('')
    setStoppedDuration(0)
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  // Display time
  const displayTime = (() => {
    if (mode === 'pomodoro') {
      if (!running) {
        // Show configured time
        const target = pomTimes[pomPhase]
        return formatTime(target)
      }
      const remaining = Math.max(pomTimes[pomPhase] - elapsed, 0)
      return formatTime(remaining)
    }
    return formatTime(elapsed)
  })()

  const accentColor = running
    ? (mode === 'pomodoro' ? (pomPhase === 'work' ? '#ffbe0b' : '#00cc88') : 'var(--accent-primary)')
    : 'var(--text-tertiary)'

  // Progress for ring (0-1)
  const progress = (() => {
    if (mode === 'pomodoro' && running) {
      const target = pomTimes[pomPhase]
      return Math.min(elapsed / target, 1)
    }
    return 0
  })()

  const circumference = 2 * Math.PI * 140
  const dashOffset = circumference - (circumference * progress)

  // Pomodoro phase label
  const phaseLabel = pomPhase === 'work' ? `Focus #${pomCount + 1}` : pomPhase === 'shortBreak' ? 'Short Break' : 'Long Break'

  function renderTimer(isFull: boolean) {
    const size = isFull ? 280 : 200
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
        {/* Clock ring */}
        <div style={{ position: 'relative', width: size, height: size, maxWidth: '70vw' }}>
          <svg style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', width: '100%', height: '100%' }} viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="140" fill="none" stroke="var(--surface-border)" strokeWidth="3" opacity="0.3" />
            {mode === 'pomodoro' && running && (
              <circle cx="150" cy="150" r="140" fill="none" stroke={accentColor} strokeWidth="4"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.3s linear', filter: `drop-shadow(0 0 6px ${accentColor})` }} />
            )}
            {mode === 'focus' && running && (
              <circle cx="150" cy="150" r="140" fill="none" stroke={accentColor} strokeWidth="3"
                strokeLinecap="round" style={{ animation: 'ringPulse 3s ease-in-out infinite', opacity: 0.5 }} />
            )}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: isFull ? 'clamp(2.2rem, 7vw, 3.5rem)' : 'clamp(1.6rem, 5vw, 2.5rem)', fontWeight: 800, color: running ? accentColor : 'var(--text-primary)', lineHeight: 1, letterSpacing: '0.02em' }}>
              {displayTime}
            </span>
            {mode === 'pomodoro' && running && (
              <span style={{ marginTop: '0.4rem', fontSize: '0.65rem', color: accentColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{phaseLabel}</span>
            )}
            {!running && (
              <span style={{ marginTop: '0.4rem', fontSize: '0.65rem', color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {mode === 'pomodoro' ? phaseLabel : 'Ready'}
              </span>
            )}
            {paused && <span style={{ marginTop: '0.25rem', fontSize: '0.6rem', color: '#ffbe0b', fontWeight: 700, animation: 'gentlePulse 1.5s infinite' }}>PAUSED</span>}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {!running ? (
            <button className="btn-primary" onPointerDown={handleStart} style={{ padding: '0.7rem 2rem', fontSize: '0.9rem', touchAction: 'manipulation' }}>
              <Play size={18} /> Start
            </button>
          ) : (
            <>
              {paused ? (
                <button className="btn-primary" onPointerDown={handleResume} style={{ padding: '0.6rem 1.3rem', fontSize: '0.85rem', touchAction: 'manipulation' }}>
                  <Play size={16} /> Resume
                </button>
              ) : (
                <button className="btn-secondary" onPointerDown={handlePause} style={{ padding: '0.6rem 1.3rem', fontSize: '0.85rem', borderColor: '#ffbe0b44', color: '#ffbe0b', touchAction: 'manipulation' }}>
                  <Pause size={16} /> Pause
                </button>
              )}
              <button className="btn-secondary" onPointerDown={handleStop} style={{ padding: '0.6rem 1.3rem', fontSize: '0.85rem', borderColor: 'rgba(255,0,85,0.4)', color: '#ff5577', touchAction: 'manipulation' }}>
                <Square size={16} /> Stop
              </button>
              <button className="btn-secondary" onPointerDown={handleReset} style={{ padding: '0.6rem 1.3rem', fontSize: '0.85rem', touchAction: 'manipulation' }}>
                <RotateCcw size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Fullscreen overlay - covers EVERYTHING including sidebar/hamburger */}
      {fullscreen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <button onPointerDown={() => setFullscreen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, touchAction: 'manipulation' }}>
            <Minimize size={16} />
          </button>
          {mode === 'pomodoro' && <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Pomodoro — {phaseLabel}</div>}
          {renderTimer(true)}
        </div>
      )}

      {/* Normal card */}
      {!fullscreen && (
        <div className="glass-glow" style={{ padding: '1.25rem', position: 'relative' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className={mode === 'focus' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }} onPointerDown={() => { if (!running) setMode('focus') }}>
                <Zap size={12} /> Focus
              </button>
              <button className={mode === 'pomodoro' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }} onPointerDown={() => { if (!running) setMode('pomodoro') }}>
                <Coffee size={12} /> Pomodoro
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {mode === 'pomodoro' && !running && (
                <button onPointerDown={() => setShowSettings(!showSettings)} style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation' }}>
                  <Settings2 size={13} />
                </button>
              )}
              <button onPointerDown={() => setFullscreen(true)} style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation' }}>
                <Maximize size={13} />
              </button>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                <div><label style={{ fontSize: '0.6rem' }}>Work (min)</label><input type="number" min={1} max={120} value={workMin} onChange={(e) => setWorkMin(Number(e.target.value))} style={{ width: '100%', padding: '0.35rem', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }} /></div>
                <div><label style={{ fontSize: '0.6rem' }}>Break (min)</label><input type="number" min={1} max={60} value={shortBreakMin} onChange={(e) => setShortBreakMin(Number(e.target.value))} style={{ width: '100%', padding: '0.35rem', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }} /></div>
                <div><label style={{ fontSize: '0.6rem' }}>Long break</label><input type="number" min={1} max={60} value={longBreakMin} onChange={(e) => setLongBreakMin(Number(e.target.value))} style={{ width: '100%', padding: '0.35rem', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }} /></div>
                <div><label style={{ fontSize: '0.6rem' }}>Sessions</label><input type="number" min={1} max={10} value={sessionsBeforeLong} onChange={(e) => setSessionsBeforeLong(Number(e.target.value))} style={{ width: '100%', padding: '0.35rem', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }} /></div>
              </div>
              <button className="btn-primary" onPointerDown={savePomSettings} style={{ width: '100%', marginTop: '0.5rem', padding: '0.4rem', fontSize: '0.75rem' }}>Save</button>
            </div>
          )}

          {/* Category pills */}
          <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onPointerDown={() => { if (!running) setSelectedCat('') }} className={!selectedCat ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem', opacity: running ? 0.5 : 1, touchAction: 'manipulation' }}>All</button>
            {categories.map((c: any) => (
              <button key={c.id} onPointerDown={() => { if (!running) setSelectedCat(c.id) }} className={selectedCat === c.id ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem', opacity: running ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '3px', touchAction: 'manipulation' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.color }} /> {c.name}
              </button>
            ))}
          </div>

          {renderTimer(false)}
        </div>
      )}

      {/* Save Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onPointerDown={() => { setShowModal(false) }}>
          <div onPointerDown={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: '400px', padding: '1.5rem',
            background: 'var(--bg-primary)', border: '1px solid var(--surface-border)',
            borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem' }}>Session Complete 🎯</h2>
              <button onPointerDown={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', touchAction: 'manipulation' }}><X size={16} /></button>
            </div>
            <div style={{ fontSize: '2rem', fontFamily: 'var(--font-mono)', fontWeight: 900, marginBottom: '1rem', color: 'var(--accent-primary)', textAlign: 'center' }}>
              {formatTime(stoppedDuration)}
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.7rem' }}>Category</label>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                <button onPointerDown={() => setModalCat('')} className={!modalCat ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', touchAction: 'manipulation' }}>None</button>
                {categories.map((c: any) => (
                  <button key={c.id} onPointerDown={() => setModalCat(c.id)} className={modalCat === c.id ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '3px', touchAction: 'manipulation' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.color }} /> {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.7rem' }}>Description</label>
              <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What did you work on?" autoFocus style={{ marginTop: '0.25rem' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-primary" style={{ flex: 1, padding: '0.6rem' }} onPointerDown={handleSaveEntry}>Save</button>
              <button className="btn-secondary" style={{ flex: 1, padding: '0.6rem' }} onPointerDown={() => setShowModal(false)}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
