'use client'

import { useState, useEffect, useCallback } from 'react'
import { createTimeEntry } from '@/actions/timeEntries'
import { useToast } from '@/components/ToastProvider'
import { Play, Square, RotateCcw, Coffee, Zap } from 'lucide-react'

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
      // Auto-log the work session
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
      // Switch to break
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
      // Break over — back to work
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
    return `${h}:${m}:${s}`
  }

  const displayTime = mode === 'pomodoro' && startTime ? formatTime(pomRemaining) : formatTime(elapsed)
  const ringClass = `timer-ring ${startTime ? (mode === 'pomodoro' ? (pomPhase === 'work' ? 'pomodoro' : 'break-time') : 'running') : ''}`

  return (
    <>
      <div className="glass-glow" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        {/* Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
          <button
            className={mode === 'focus' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            onClick={() => { setMode('focus'); if (!startTime) setPomRemaining(POMODORO.work) }}
          >
            <Zap size={16} /> Focus
          </button>
          <button
            className={mode === 'pomodoro' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            onClick={() => { setMode('pomodoro'); if (!startTime) setPomRemaining(POMODORO.work) }}
          >
            <Coffee size={16} /> Pomodoro
          </button>
        </div>

        {/* Category */}
        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          disabled={!!startTime}
          style={{ maxWidth: '200px', margin: '0 auto var(--space-lg)', display: 'block' }}
        >
          <option value="">No Category</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Timer Ring */}
        <div className={ringClass}>
          <div className={`timer-display ${startTime ? 'running' : ''}`} style={{ fontSize: '2.5rem' }}>
            {displayTime}
          </div>
        </div>

        {/* Pomodoro info */}
        {mode === 'pomodoro' && startTime && (
          <div className="text-sm text-secondary" style={{ marginBottom: 'var(--space-md)' }}>
            {pomPhase === 'work' ? '🔥 Work Session' : pomPhase === 'shortBreak' ? '☕ Short Break' : '🌴 Long Break'}
            {' • '}Completed: {pomCount} pomodoros
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)' }}>
          {!startTime ? (
            <button className="btn-primary" onClick={handleStart}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', padding: '1rem 2rem' }}>
              <Play size={22} /> Start {mode === 'pomodoro' ? 'Pomodoro' : 'Focus'}
            </button>
          ) : (
            <>
              <button className="btn-danger" onClick={handleStop}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', padding: '1rem 2rem' }}>
                <Square size={22} /> Stop & Log
              </button>
              {mode === 'focus' && (
                <button className="btn-secondary" onClick={() => { setStartTime(null); setElapsed(0); localStorage.removeItem('mirror_timer') }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <RotateCcw size={18} /> Discard
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setStoppedData(null) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>
              ⏱ Session Complete
            </h2>
            <div className="stat-value" style={{ fontSize: '1.5rem', marginBottom: 'var(--space-md)' }}>
              {stoppedData && formatTime(stoppedData.durationSeconds)}
            </div>
            <label style={{ marginBottom: 'var(--space-lg)' }}>
              <span>Description (optional)</span>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What were you working on?"
                autoFocus
              />
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button className="btn-primary w-full" onClick={handleSaveEntry}>
                Save Entry
              </button>
              <button className="btn-secondary" onClick={() => { setShowModal(false); setStoppedData(null) }}>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
