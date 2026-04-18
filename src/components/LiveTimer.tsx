'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createTimeEntry } from '@/actions/timeEntries'
import { useToast } from '@/components/ToastProvider'
import { Play, Square, Pause, Coffee, Zap, Maximize, Minimize, Settings2, X, RotateCcw, Timer } from 'lucide-react'

type Mode = 'focus' | 'pomodoro'
type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'

export default function LiveTimer({ categories }: { categories: any[] }) {
  const { toast } = useToast()
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [selectedCat, setSelectedCat] = useState('')
  const [mode, setMode] = useState<Mode>('focus')
  const [pomPhase, setPomPhase] = useState<PomodoroPhase>('work')
  const [pomCount, setPomCount] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [stoppedDuration, setStoppedDuration] = useState(0)
  const [desc, setDesc] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [modalCat, setModalCat] = useState('')
  const [portalReady, setPortalReady] = useState(false)

  // Pomodoro settings
  const [showSettings, setShowSettings] = useState(false)
  const [workMin, setWorkMin] = useState(25)
  const [shortBreakMin, setShortBreakMin] = useState(5)
  const [longBreakMin, setLongBreakMin] = useState(15)
  const [sessionsBeforeLong, setSessionsBeforeLong] = useState(4)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const pausedElapsedRef = useRef(0)

  // For portal
  useEffect(() => { setPortalReady(true) }, [])

  const pomTimes = { work: workMin * 60, shortBreak: shortBreakMin * 60, longBreak: longBreakMin * 60 }

  useEffect(() => {
    const s = localStorage.getItem('mirror_pom_settings')
    if (s) {
      const d = JSON.parse(s)
      setWorkMin(d.work || 25); setShortBreakMin(d.shortBreak || 5)
      setLongBreakMin(d.longBreak || 15); setSessionsBeforeLong(d.sessions || 4)
    }
  }, [])

  const playSound = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const tone = (f: number, s: number, d: number) => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.frequency.value = f; o.type = 'sine'
        g.gain.setValueAtTime(0.35, ctx.currentTime + s)
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + s + d)
        o.start(ctx.currentTime + s); o.stop(ctx.currentTime + s + d)
      }
      tone(523, 0, 0.25); tone(659, 0.3, 0.25); tone(784, 0.6, 0.4)
    } catch {}
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Mirror', { body: 'Timer done! 🎯' })
    }
  }, [])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
  }, [])

  // Tick
  useEffect(() => {
    if (running && !paused) {
      startTimeRef.current = Date.now()
      intervalRef.current = setInterval(() => {
        const el = pausedElapsedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000)
        setElapsed(el)
      }, 250)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, paused])

  // Pomodoro auto-complete check
  useEffect(() => {
    if (!running || paused || mode !== 'pomodoro') return
    const target = pomTimes[pomPhase]
    if (elapsed >= target) {
      playSound()
      if (pomPhase === 'work') {
        const n = pomCount + 1
        setPomCount(n)
        createTimeEntry({
          description: `Pomodoro #${n}`,
          startTime: new Date(Date.now() - elapsed * 1000),
          endTime: new Date(),
          durationSeconds: elapsed,
          categoryId: selectedCat || undefined,
        })
        toast(`Pomodoro #${n} logged! 🍅`, 'success')
        setPomPhase(n % sessionsBeforeLong === 0 ? 'longBreak' : 'shortBreak')
      } else {
        setPomPhase('work')
        toast('Break over! Focus time. 💪', 'info')
      }
      setElapsed(0); pausedElapsedRef.current = 0; startTimeRef.current = Date.now()
    }
  }, [elapsed, running, paused, mode, pomPhase])

  const savePomSettings = () => {
    localStorage.setItem('mirror_pom_settings', JSON.stringify({ work: workMin, shortBreak: shortBreakMin, longBreak: longBreakMin, sessions: sessionsBeforeLong }))
    setShowSettings(false); toast('Settings saved!', 'success')
  }

  const doStart = () => {
    setRunning(true); setPaused(false); setElapsed(0)
    pausedElapsedRef.current = 0; startTimeRef.current = Date.now()
    if (mode === 'pomodoro') { setPomPhase('work'); setPomCount(0) }
  }

  const doPause = () => { pausedElapsedRef.current = elapsed; setPaused(true) }
  const doResume = () => { startTimeRef.current = Date.now(); setPaused(false) }

  const doStop = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation() }
    if (!running) return
    const dur = elapsed
    playSound()
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false); setPaused(false)
    setStoppedDuration(dur); setModalCat(selectedCat)
    setFullscreen(false); setElapsed(0); pausedElapsedRef.current = 0
    setShowModal(true)
  }

  const doReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false); setPaused(false); setElapsed(0); pausedElapsedRef.current = 0
  }

  const doSave = async () => {
    if (stoppedDuration <= 0) return
    const end = Date.now()
    await createTimeEntry({
      description: desc || undefined,
      startTime: new Date(end - stoppedDuration * 1000),
      endTime: new Date(end),
      durationSeconds: stoppedDuration,
      categoryId: modalCat || undefined,
    })
    toast('Saved!', 'success'); setShowModal(false); setDesc(''); setStoppedDuration(0)
  }

  const fmt = (s: number) => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0')
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const sec = String(s % 60).padStart(2, '0')
    return `${h}:${m}:${sec}`
  }

  // Display
  const displayTime = mode === 'pomodoro'
    ? (running ? fmt(Math.max(pomTimes[pomPhase] - elapsed, 0)) : fmt(pomTimes[pomPhase]))
    : fmt(elapsed)

  const color = running
    ? (mode === 'pomodoro' ? (pomPhase === 'work' ? '#ffbe0b' : '#00cc88') : 'var(--accent-primary)')
    : 'var(--text-tertiary)'

  const progress = mode === 'pomodoro' && running ? Math.min(elapsed / pomTimes[pomPhase], 1) : 0
  const circ = 2 * Math.PI * 140
  const offset = circ - circ * progress
  const phaseLabel = pomPhase === 'work' ? `Focus #${pomCount + 1}` : pomPhase === 'shortBreak' ? 'Short Break' : 'Long Break'

  // ── Button builder (reliable on ALL devices) ──
  const Btn = ({ onClick, children, style, className }: { onClick: (e: any) => void, children: React.ReactNode, style?: React.CSSProperties, className?: string }) => (
    <button
      className={className}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(e) }}
      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onClick(e) }}
      style={{ ...style, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
    </button>
  )

  function renderClock(big: boolean) {
    const sz = big ? 260 : 200
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ position: 'relative', width: sz, height: sz, maxWidth: '65vw' }}>
          <svg style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} viewBox="0 0 300 300" width="100%" height="100%">
            <circle cx="150" cy="150" r="140" fill="none" stroke="var(--surface-border)" strokeWidth="2.5" opacity="0.25" />
            {mode === 'pomodoro' && running && (
              <circle cx="150" cy="150" r="140" fill="none" stroke={color} strokeWidth="4"
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.4s linear', filter: `drop-shadow(0 0 8px ${color})` }} />
            )}
            {mode === 'focus' && running && (
              <circle cx="150" cy="150" r="140" fill="none" stroke={color} strokeWidth="2.5"
                strokeLinecap="round" style={{ animation: 'ringPulse 3s ease-in-out infinite', opacity: 0.4 }} />
            )}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: big ? 'clamp(2rem, 7vw, 3.2rem)' : 'clamp(1.5rem, 5vw, 2.4rem)', fontWeight: 800, color: running ? color : 'var(--text-primary)', lineHeight: 1 }}>
              {displayTime}
            </span>
            {mode === 'pomodoro' && running && <span style={{ marginTop: '0.35rem', fontSize: '0.6rem', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{phaseLabel}</span>}
            {!running && <span style={{ marginTop: '0.35rem', fontSize: '0.6rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{mode === 'pomodoro' ? phaseLabel : 'Ready'}</span>}
            {paused && <span style={{ marginTop: '0.2rem', fontSize: '0.55rem', color: '#ffbe0b', fontWeight: 700, animation: 'gentlePulse 1.5s infinite' }}>PAUSED</span>}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {!running ? (
            <Btn className="btn-primary" onClick={doStart} style={{ padding: '0.7rem 2rem', fontSize: '0.9rem' }}>
              <Play size={18} /> Start
            </Btn>
          ) : (
            <>
              {paused ? (
                <Btn className="btn-primary" onClick={doResume} style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>
                  <Play size={16} /> Resume
                </Btn>
              ) : (
                <Btn className="btn-secondary" onClick={doPause} style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', borderColor: '#ffbe0b44', color: '#ffbe0b' }}>
                  <Pause size={16} /> Pause
                </Btn>
              )}
              <Btn className="btn-secondary" onClick={doStop} style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', borderColor: 'rgba(255,0,85,0.4)', color: '#ff5577' }}>
                <Square size={16} /> Stop
              </Btn>
              <Btn className="btn-secondary" onClick={doReset} style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                <RotateCcw size={16} />
              </Btn>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Fullscreen (renders via portal into document.body) ──
  const fullscreenOverlay = fullscreen && portalReady ? createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', width: '100vw',
    }}>
      <Btn onClick={() => setFullscreen(false)} style={{
        position: 'absolute', top: '1rem', right: '1rem',
        background: 'var(--surface)', border: '1px solid var(--surface-border)',
        color: 'var(--text-secondary)', width: 36, height: 36, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }} className="">
        <Minimize size={16} />
      </Btn>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {mode === 'pomodoro' && <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Pomodoro — {phaseLabel}</div>}
        {renderClock(true)}
      </div>
    </div>,
    document.body
  ) : null

  // ── Save Modal (also portal) ──
  const saveModal = showModal && portalReady ? createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={() => setShowModal(false)}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: '380px', padding: '1.5rem',
        background: 'var(--bg-primary)', border: '1px solid var(--surface-border)',
        borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Session Complete 🎯</h2>
          <Btn onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} className="">
            <X size={16} />
          </Btn>
        </div>
        <div style={{ fontSize: '2rem', fontFamily: 'var(--font-mono)', fontWeight: 900, marginBottom: '1rem', color: 'var(--accent-primary)', textAlign: 'center' }}>
          {fmt(stoppedDuration)}
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.7rem' }}>Category</label>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            <Btn onClick={() => setModalCat('')} className={!modalCat ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}>None</Btn>
            {categories.map((c: any) => (
              <Btn key={c.id} onClick={() => setModalCat(c.id)} className={modalCat === c.id ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.color }} /> {c.name}
              </Btn>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.7rem' }}>Description</label>
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What did you work on?" autoFocus style={{ marginTop: '0.25rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Btn className="btn-primary" style={{ flex: 1, padding: '0.6rem' }} onClick={doSave}>Save</Btn>
          <Btn className="btn-secondary" style={{ flex: 1, padding: '0.6rem' }} onClick={() => setShowModal(false)}>Discard</Btn>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      {fullscreenOverlay}
      {saveModal}

      {/* Page header (hidden when fullscreen) */}
      {!fullscreen && (
        <div className="page-header reveal-up" style={{ '--reveal-delay': '70ms' } as React.CSSProperties}>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Timer size={22} color="var(--accent-primary)" /> Timer
          </h1>
          <p className="page-subtitle">Focus mode & Pomodoro</p>
        </div>
      )}

      {/* Timer card */}
      {!fullscreen && (
        <div className="glass-glow reveal-up" style={{ '--reveal-delay': '150ms', padding: '1.25rem' } as React.CSSProperties}>
          {/* Top controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <Btn className={mode === 'focus' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.3rem 0.7rem', fontSize: '0.7rem' }} onClick={() => { if (!running) setMode('focus') }}>
                <Zap size={12} /> Focus
              </Btn>
              <Btn className={mode === 'pomodoro' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.3rem 0.7rem', fontSize: '0.7rem' }} onClick={() => { if (!running) setMode('pomodoro') }}>
                <Coffee size={12} /> Pomodoro
              </Btn>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {mode === 'pomodoro' && !running && (
                <Btn onClick={() => setShowSettings(!showSettings)} style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} className="">
                  <Settings2 size={12} />
                </Btn>
              )}
              <Btn onClick={() => setFullscreen(true)} style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} className="">
                <Maximize size={12} />
              </Btn>
            </div>
          </div>

          {/* Settings */}
          {showSettings && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                <div><label style={{ fontSize: '0.55rem' }}>Work (min)</label><input type="number" min={1} max={120} value={workMin} onChange={(e) => setWorkMin(+e.target.value)} style={{ width: '100%', padding: '0.3rem', textAlign: 'center', fontWeight: 700 }} /></div>
                <div><label style={{ fontSize: '0.55rem' }}>Break (min)</label><input type="number" min={1} max={60} value={shortBreakMin} onChange={(e) => setShortBreakMin(+e.target.value)} style={{ width: '100%', padding: '0.3rem', textAlign: 'center', fontWeight: 700 }} /></div>
                <div><label style={{ fontSize: '0.55rem' }}>Long break</label><input type="number" min={1} max={60} value={longBreakMin} onChange={(e) => setLongBreakMin(+e.target.value)} style={{ width: '100%', padding: '0.3rem', textAlign: 'center', fontWeight: 700 }} /></div>
                <div><label style={{ fontSize: '0.55rem' }}>Sessions</label><input type="number" min={1} max={10} value={sessionsBeforeLong} onChange={(e) => setSessionsBeforeLong(+e.target.value)} style={{ width: '100%', padding: '0.3rem', textAlign: 'center', fontWeight: 700 }} /></div>
              </div>
              <Btn className="btn-primary" onClick={savePomSettings} style={{ width: '100%', marginTop: '0.5rem', padding: '0.4rem', fontSize: '0.7rem' }}>Save</Btn>
            </div>
          )}

          {/* Category pills */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Btn onClick={() => { if (!running) setSelectedCat('') }} className={!selectedCat ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.25rem 0.5rem', fontSize: '0.6rem', opacity: running ? 0.5 : 1 }}>All</Btn>
            {categories.map((c: any) => (
              <Btn key={c.id} onClick={() => { if (!running) setSelectedCat(c.id) }} className={selectedCat === c.id ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.6rem', opacity: running ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.color }} /> {c.name}
              </Btn>
            ))}
          </div>

          {renderClock(false)}
        </div>
      )}
    </>
  )
}
