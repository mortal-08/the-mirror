'use client'

import { useState, useEffect, useCallback } from 'react'
import { createTimeEntry } from '@/actions/timeEntries'
import { useToast } from '@/components/ToastProvider'
import { Play, Square, RotateCcw, Coffee, Zap, Maximize, Minimize, Settings2 } from 'lucide-react'

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

  // Pomodoro settings
  const [showSettings, setShowSettings] = useState(false)
  const [workMin, setWorkMin] = useState(25)
  const [shortBreakMin, setShortBreakMin] = useState(5)
  const [longBreakMin, setLongBreakMin] = useState(15)

  const pomTimes = { work: workMin * 60, shortBreak: shortBreakMin * 60, longBreak: longBreakMin * 60 }

  useEffect(() => {
    const saved = localStorage.getItem('mirror_timer')
    if (saved) {
      const data = JSON.parse(saved)
      setStartTime(data.startTime)
      setSelectedCat(data.categoryId || '')
      setMode(data.mode || 'focus')
    }
    // Load pomodoro settings
    const pomSettings = localStorage.getItem('mirror_pom_settings')
    if (pomSettings) {
      const s = JSON.parse(pomSettings)
      setWorkMin(s.work || 25)
      setShortBreakMin(s.shortBreak || 5)
      setLongBreakMin(s.longBreak || 15)
      setPomRemaining((s.work || 25) * 60)
    }
  }, [])

  const playFinishSound = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.35, ctx.currentTime + start)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + dur)
      }
      // 3-tone chime
      playTone(523.25, 0, 0.3)    // C5
      playTone(659.25, 0.35, 0.3)  // E5
      playTone(783.99, 0.7, 0.5)   // G5
    } catch {}
    // Also try browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Mirror Timer', { body: 'Your session is complete! 🎯', icon: '/favicon.ico' })
    }
  }, [])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

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
  }, [startTime, mode, pomPhase, workMin, shortBreakMin, longBreakMin])

  const handlePomodoroComplete = useCallback(() => {
    playFinishSound()

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
        toast(`Pomodoro #${newCount} logged! 🍅`, 'success')
      }
      if (newCount % 4 === 0) {
        setPomPhase('longBreak')
        setPomRemaining(pomTimes.longBreak)
      } else {
        setPomPhase('shortBreak')
        setPomRemaining(pomTimes.shortBreak)
      }
      setStartTime(Date.now())
      setElapsed(0)
    } else {
      setPomPhase('work')
      setPomRemaining(pomTimes.work)
      setStartTime(Date.now())
      setElapsed(0)
      toast('Break over! Time to focus. 💪', 'info')
    }
  }, [pomPhase, pomCount, startTime, selectedCat, toast, playFinishSound, pomTimes])

  const savePomSettings = () => {
    localStorage.setItem('mirror_pom_settings', JSON.stringify({ work: workMin, shortBreak: shortBreakMin, longBreak: longBreakMin }))
    setPomRemaining(workMin * 60)
    setShowSettings(false)
    toast('Pomodoro settings saved!', 'success')
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
    localStorage.setItem('mirror_timer', JSON.stringify({
      startTime: now, categoryId: selectedCat, mode,
    }))
  }

  const handleStop = () => {
    if (!startTime) return
    const end = Date.now()
    const dur = Math.floor((end - startTime) / 1000)
    playFinishSound()
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

  const pomProgress = mode === 'pomodoro' && startTime
    ? ((pomTimes[pomPhase] - pomRemaining) / pomTimes[pomPhase]) * 100
    : 0
  const circumference = 2 * Math.PI * 150

  // Responsive circle size
  const circleSize = fullscreen ? 340 : 260

  const timerContent = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: fullscreen ? '100vh' : 'auto', padding: fullscreen ? '2rem' : 0, position: 'relative' }}>

      {/* Top right buttons */}
      <div style={{ position: 'absolute', top: fullscreen ? '1.5rem' : '0.5rem', right: fullscreen ? '1.5rem' : '0.5rem', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
        {mode === 'pomodoro' && !startTime && (
          <button onClick={() => setShowSettings(!showSettings)} style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Settings2 size={16} />
          </button>
        )}
        <button onClick={() => setFullscreen(!fullscreen)} style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      </div>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className={mode === 'focus' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.5rem 1.2rem', fontSize: '0.8rem' }} onClick={() => { setMode('focus'); if (!startTime) setPomRemaining(pomTimes.work) }}>
          <Zap size={14} /> Focus
        </button>
        <button className={mode === 'pomodoro' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.5rem 1.2rem', fontSize: '0.8rem' }} onClick={() => { setMode('pomodoro'); if (!startTime) setPomRemaining(pomTimes.work) }}>
          <Coffee size={14} /> Pomodoro
        </button>
      </div>

      {/* Pomodoro Settings Panel */}
      {showSettings && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem', width: '100%', maxWidth: 360 }}>
          <h4 style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Timer Settings</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Work (min)</label>
              <input type="number" min={1} max={120} value={workMin} onChange={(e) => setWorkMin(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Break (min)</label>
              <input type="number" min={1} max={60} value={shortBreakMin} onChange={(e) => setShortBreakMin(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Long (min)</label>
              <input type="number" min={1} max={60} value={longBreakMin} onChange={(e) => setLongBreakMin(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }} />
            </div>
          </div>
          <button className="btn-primary" onClick={savePomSettings} style={{ width: '100%', marginTop: '1rem', padding: '0.6rem' }}>Save Settings</button>
        </div>
      )}

      {/* Category pills */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 420 }}>
        <button onClick={() => setSelectedCat('')} disabled={!!startTime} className={!selectedCat ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', opacity: startTime ? 0.5 : 1 }}>
          All
        </button>
        {categories.map((c: any) => (
          <button key={c.id} onClick={() => setSelectedCat(c.id)} disabled={!!startTime} className={selectedCat === c.id ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', opacity: startTime ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} />
            {c.name}
          </button>
        ))}
      </div>

      {/* Circular Clock */}
      <div style={{ position: 'relative', width: circleSize, height: circleSize, marginBottom: '2rem', maxWidth: '85vw', aspectRatio: '1' }}>
        <svg style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', width: '100%', height: '100%' }} viewBox="0 0 320 320">
          <circle cx="160" cy="160" r="150" fill="none" stroke="var(--surface-border)" strokeWidth="4" />
          {mode === 'pomodoro' && startTime && (
            <circle cx="160" cy="160" r="150" fill="none" stroke={accentColor} strokeWidth="4"
              strokeDasharray={circumference} strokeDashoffset={circumference - (circumference * pomProgress / 100)}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
          )}
        </svg>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
            {['h', 'm', 's'].map((unit, idx) => {
              const val = (timeObj as any)[unit]
              return (
                <div key={unit} style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(2rem, 8vw, 3.5rem)', fontWeight: 800, color: startTime ? accentColor : 'var(--text-primary)', lineHeight: 1, transition: 'color 0.3s' }}>
                    {val}
                  </span>
                  {idx < 2 && <span style={{ fontSize: 'clamp(1.2rem, 5vw, 2rem)', color: accentColor, opacity: 0.4, margin: '0 1px' }}>:</span>}
                </div>
              )
            })}
          </div>

          {mode === 'pomodoro' && startTime && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: accentColor, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {pomPhase === 'work' ? `Focus #${pomCount + 1}` : pomPhase === 'shortBreak' ? 'Short Break' : 'Long Break'}
            </div>
          )}

          {!startTime && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-tertiary)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Ready</div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {!startTime ? (
          <button className="btn-primary" onClick={handleStart} style={{ padding: '0.9rem 2.5rem', fontSize: '1rem' }}>
            <Play size={20} /> Start
          </button>
        ) : (
          <>
            <button className="btn-secondary" onClick={handleStop} style={{ padding: '0.8rem 1.5rem', fontSize: '0.9rem', borderColor: 'rgba(255,0,85,0.4)', color: '#ff5577' }}>
              <Square size={18} /> Stop
            </button>
            {mode === 'focus' && (
              <button className="btn-secondary" onClick={() => { setStartTime(null); setElapsed(0); localStorage.removeItem('mirror_timer') }} style={{ padding: '0.8rem 1.5rem', fontSize: '0.9rem' }}>
                <RotateCcw size={18} /> Reset
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
        <div className="glass-glow" style={{ textAlign: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          {timerContent}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setStoppedData(null) }}>
          <div className="glass-glow" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', padding: '2rem', margin: '1rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Session Complete 🎯</h2>
            <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-mono)', fontWeight: 900, marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>
              {stoppedData && `${formatTime(stoppedData.durationSeconds).h}:${formatTime(stoppedData.durationSeconds).m}:${formatTime(stoppedData.durationSeconds).s}`}
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label>Description (optional)</label>
              <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What did you work on?" autoFocus />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleSaveEntry}>Save</button>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setShowModal(false); setStoppedData(null) }}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
