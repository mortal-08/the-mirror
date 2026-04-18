'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createTimeEntry } from '@/actions/timeEntries'
import { useToast } from '@/components/ToastProvider'
import { Play, Square, RotateCcw, Coffee, Zap, Maximize, Minimize, Settings2, X } from 'lucide-react'

type Mode = 'focus' | 'pomodoro'
type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'

export default function LiveTimer({ categories }: { categories: any[] }) {
  const { toast } = useToast()
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [selectedCat, setSelectedCat] = useState('')
  const [mode, setMode] = useState<Mode>('focus')
  const [pomPhase, setPomPhase] = useState<PomodoroPhase>('work')
  const [pomCount, setPomCount] = useState(0)
  const [pomRemaining, setPomRemaining] = useState(25 * 60)
  const [showModal, setShowModal] = useState(false)
  const [stoppedData, setStoppedData] = useState<any>(null)
  const [desc, setDesc] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [modalCat, setModalCat] = useState('')

  // Pomodoro settings
  const [showSettings, setShowSettings] = useState(false)
  const [workMin, setWorkMin] = useState(25)
  const [shortBreakMin, setShortBreakMin] = useState(5)
  const [longBreakMin, setLongBreakMin] = useState(15)
  const [sessionsBeforeLong, setSessionsBeforeLong] = useState(4)

  const startTimeRef = useRef(startTime)
  const pomPhaseRef = useRef(pomPhase)
  const pomCountRef = useRef(pomCount)
  const selectedCatRef = useRef(selectedCat)

  useEffect(() => { startTimeRef.current = startTime }, [startTime])
  useEffect(() => { pomPhaseRef.current = pomPhase }, [pomPhase])
  useEffect(() => { pomCountRef.current = pomCount }, [pomCount])
  useEffect(() => { selectedCatRef.current = selectedCat }, [selectedCat])

  const pomTimes = { work: workMin * 60, shortBreak: shortBreakMin * 60, longBreak: longBreakMin * 60 }

  useEffect(() => {
    const saved = localStorage.getItem('mirror_timer')
    if (saved) {
      const data = JSON.parse(saved)
      setStartTime(data.startTime)
      setSelectedCat(data.categoryId || '')
      setMode(data.mode || 'focus')
    }
    const pomSettings = localStorage.getItem('mirror_pom_settings')
    if (pomSettings) {
      const s = JSON.parse(pomSettings)
      setWorkMin(s.work || 25)
      setShortBreakMin(s.shortBreak || 5)
      setLongBreakMin(s.longBreak || 15)
      setSessionsBeforeLong(s.sessions || 4)
      setPomRemaining((s.work || 25) * 60)
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

  const handlePomodoroComplete = useCallback(() => {
    playFinishSound()
    const currentPhase = pomPhaseRef.current
    const currentCount = pomCountRef.current
    const currentStart = startTimeRef.current
    const currentCat = selectedCatRef.current

    if (currentPhase === 'work') {
      const newCount = currentCount + 1
      setPomCount(newCount)
      if (currentStart) {
        const end = Date.now()
        const dur = Math.floor((end - currentStart) / 1000)
        createTimeEntry({
          description: `Pomodoro #${newCount}`,
          startTime: new Date(currentStart),
          endTime: new Date(end),
          durationSeconds: dur,
          categoryId: currentCat || undefined,
        })
        toast(`Pomodoro #${newCount} logged! 🍅`, 'success')
      }
      if (newCount % sessionsBeforeLong === 0) {
        setPomPhase('longBreak')
        setPomRemaining(longBreakMin * 60)
      } else {
        setPomPhase('shortBreak')
        setPomRemaining(shortBreakMin * 60)
      }
      setStartTime(Date.now())
      setElapsed(0)
    } else {
      setPomPhase('work')
      setPomRemaining(workMin * 60)
      setStartTime(Date.now())
      setElapsed(0)
      toast('Break over! Focus time. 💪', 'info')
    }
  }, [playFinishSound, sessionsBeforeLong, longBreakMin, shortBreakMin, workMin, toast])

  useEffect(() => {
    if (!startTime) return
    const interval = setInterval(() => {
      const el = Math.floor((Date.now() - startTime) / 1000)
      setElapsed(el)
      if (mode === 'pomodoro') {
        const target = pomTimes[pomPhase]
        const rem = target - el
        setPomRemaining(Math.max(rem, 0))
        if (rem <= 0) handlePomodoroComplete()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime, mode, pomPhase, handlePomodoroComplete])

  const savePomSettings = () => {
    localStorage.setItem('mirror_pom_settings', JSON.stringify({ work: workMin, shortBreak: shortBreakMin, longBreak: longBreakMin, sessions: sessionsBeforeLong }))
    setPomRemaining(workMin * 60)
    setShowSettings(false)
    toast('Settings saved!', 'success')
  }

  const handleStart = () => {
    const now = Date.now()
    setStartTime(now)
    setElapsed(0)
    if (mode === 'pomodoro') {
      setPomPhase('work')
      setPomRemaining(pomTimes.work)
      setPomCount(0)
    }
    localStorage.setItem('mirror_timer', JSON.stringify({ startTime: now, categoryId: selectedCat, mode }))
  }

  const handleStop = () => {
    if (!startTime) return
    const end = Date.now()
    const dur = Math.floor((end - startTime) / 1000)
    playFinishSound()
    const data = { startTime, endTime: end, durationSeconds: dur }
    setStoppedData(data)
    setModalCat(selectedCat)
    setStartTime(null)
    setElapsed(0)
    localStorage.removeItem('mirror_timer')
    // Exit fullscreen when stopping so modal is visible
    setFullscreen(false)
    // Show modal after a tick so state is settled
    setTimeout(() => setShowModal(true), 50)
  }

  const handleSaveEntry = async () => {
    if (!stoppedData) return
    await createTimeEntry({
      description: desc || undefined,
      startTime: new Date(stoppedData.startTime),
      endTime: new Date(stoppedData.endTime),
      durationSeconds: stoppedData.durationSeconds,
      categoryId: modalCat || undefined,
    })
    toast('Time block saved!', 'success')
    setShowModal(false)
    setDesc('')
    setStoppedData(null)
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return { h, m, s }
  }

  const timeObj = mode === 'pomodoro' && startTime ? formatTime(pomRemaining) : formatTime(elapsed)
  const accentColor = startTime
    ? (mode === 'pomodoro' ? (pomPhase === 'work' ? 'var(--accent-warning)' : 'var(--accent-success)') : 'var(--accent-primary)')
    : 'var(--text-tertiary)'

  const pomProgress = mode === 'pomodoro' && startTime
    ? ((pomTimes[pomPhase] - pomRemaining) / pomTimes[pomPhase]) * 100
    : 0
  const circumference = 2 * Math.PI * 140

  return (
    <>
      {/* Timer Card */}
      {fullscreen ? (
        <div className="fullscreen-overlay" style={{ zIndex: 9999 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setFullscreen(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
              <Minimize size={18} />
            </button>
            {renderClock(true)}
          </div>
        </div>
      ) : (
        <div className="glass-glow" style={{ textAlign: 'center', padding: '1.25rem', position: 'relative', overflow: 'visible' }}>
          {/* Top buttons - positioned inside card, not overlapping outside */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginBottom: '0.75rem' }}>
            {mode === 'pomodoro' && !startTime && (
              <button onClick={() => setShowSettings(!showSettings)} style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Settings2 size={14} />
              </button>
            )}
            <button onClick={() => setFullscreen(true)} style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Maximize size={14} />
            </button>
          </div>

          {/* Mode Toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className={mode === 'focus' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }} onClick={() => { setMode('focus'); if (!startTime) { setElapsed(0) } }}>
              <Zap size={14} /> Focus
            </button>
            <button className={mode === 'pomodoro' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }} onClick={() => { setMode('pomodoro'); if (!startTime) setPomRemaining(pomTimes.work) }}>
              <Coffee size={14} /> Pomodoro
            </button>
          </div>

          {/* Pomodoro Settings */}
          {showSettings && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Settings</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.65rem' }}>Work (min)</label>
                  <input type="number" min={1} max={120} value={workMin} onChange={(e) => setWorkMin(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem', textAlign: 'center', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem' }}>Break (min)</label>
                  <input type="number" min={1} max={60} value={shortBreakMin} onChange={(e) => setShortBreakMin(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem', textAlign: 'center', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem' }}>Long break (min)</label>
                  <input type="number" min={1} max={60} value={longBreakMin} onChange={(e) => setLongBreakMin(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem', textAlign: 'center', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem' }}>Sessions before long</label>
                  <input type="number" min={1} max={10} value={sessionsBeforeLong} onChange={(e) => setSessionsBeforeLong(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem', textAlign: 'center', fontWeight: 700 }} />
                </div>
              </div>
              <button className="btn-primary" onClick={savePomSettings} style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem', fontSize: '0.8rem' }}>Save</button>
            </div>
          )}

          {/* Category pills */}
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => setSelectedCat('')} disabled={!!startTime} className={!selectedCat ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.35rem 0.7rem', fontSize: '0.7rem', opacity: startTime ? 0.5 : 1 }}>All</button>
            {categories.map((c: any) => (
              <button key={c.id} onClick={() => setSelectedCat(c.id)} disabled={!!startTime} className={selectedCat === c.id ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.35rem 0.7rem', fontSize: '0.7rem', opacity: startTime ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} /> {c.name}
              </button>
            ))}
          </div>

          {renderClock(false)}
        </div>
      )}

      {/* Save Modal - always outside fullscreen, with solid background */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => { setShowModal(false); setStoppedData(null) }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: '420px', padding: '2rem',
            background: 'var(--bg-primary)', border: '1px solid var(--surface-border)',
            borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Session Complete 🎯</h2>
              <button onClick={() => { setShowModal(false); setStoppedData(null) }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: '2.2rem', fontFamily: 'var(--font-mono)', fontWeight: 900, marginBottom: '1.25rem', color: 'var(--accent-primary)', textAlign: 'center' }}>
              {stoppedData && `${formatTime(stoppedData.durationSeconds).h}:${formatTime(stoppedData.durationSeconds).m}:${formatTime(stoppedData.durationSeconds).s}`}
            </div>

            {/* Category picker in modal */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem' }}>Category</label>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                <button onClick={() => setModalCat('')} className={!modalCat ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.35rem 0.7rem', fontSize: '0.7rem' }}>None</button>
                {categories.map((c: any) => (
                  <button key={c.id} onClick={() => setModalCat(c.id)} className={modalCat === c.id ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '0.35rem 0.7rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} /> {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem' }}>Description (optional)</label>
              <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What did you work on?" autoFocus style={{ marginTop: '0.35rem' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" style={{ flex: 1, padding: '0.75rem' }} onClick={handleSaveEntry}>Save</button>
              <button className="btn-secondary" style={{ flex: 1, padding: '0.75rem' }} onClick={() => { setShowModal(false); setStoppedData(null) }}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  function renderClock(isFull: boolean) {
    const size = isFull ? 300 : 220
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: size, height: size, maxWidth: '75vw', marginBottom: '1.5rem' }}>
          <svg style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', width: '100%', height: '100%' }} viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="140" fill="none" stroke="var(--surface-border)" strokeWidth="3" />
            {mode === 'pomodoro' && startTime && (
              <circle cx="150" cy="150" r="140" fill="none" stroke={accentColor} strokeWidth="3"
                strokeDasharray={circumference} strokeDashoffset={circumference - (circumference * pomProgress / 100)}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
            )}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              {['h', 'm', 's'].map((unit, idx) => (
                <div key={unit} style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: isFull ? 'clamp(2.5rem, 8vw, 4rem)' : 'clamp(1.8rem, 6vw, 2.8rem)', fontWeight: 800, color: startTime ? accentColor : 'var(--text-primary)', lineHeight: 1 }}>
                    {(timeObj as any)[unit]}
                  </span>
                  {idx < 2 && <span style={{ fontSize: isFull ? '2rem' : '1.5rem', color: accentColor, opacity: 0.4 }}>:</span>}
                </div>
              ))}
            </div>
            {mode === 'pomodoro' && startTime && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: accentColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {pomPhase === 'work' ? `Focus #${pomCount + 1}` : pomPhase === 'shortBreak' ? 'Short Break' : 'Long Break'}
              </div>
            )}
            {!startTime && <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Ready</div>}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {!startTime ? (
            <button className="btn-primary" onClick={handleStart} style={{ padding: '0.8rem 2rem', fontSize: '0.95rem' }}>
              <Play size={18} /> Start
            </button>
          ) : (
            <>
              <button className="btn-secondary" onClick={handleStop} style={{ padding: '0.7rem 1.5rem', fontSize: '0.85rem', borderColor: 'rgba(255,0,85,0.4)', color: '#ff5577' }}>
                <Square size={16} /> Stop
              </button>
              {mode === 'focus' && (
                <button className="btn-secondary" onClick={() => { setStartTime(null); setElapsed(0); localStorage.removeItem('mirror_timer') }} style={{ padding: '0.7rem 1.5rem', fontSize: '0.85rem' }}>
                  <RotateCcw size={16} /> Reset
                </button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }
}
