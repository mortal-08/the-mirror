'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createTimeEntry } from '@/actions/timeEntries'
import { useToast } from '@/components/ToastProvider'
import { Play, Square, Pause, Coffee, Zap, Maximize, Minimize, Settings2, X, RotateCcw, Timer, Tag, CalendarDays, Clock, SkipForward } from 'lucide-react'

type Mode = 'focus' | 'pomodoro'
type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'

// ── Button builder (at module scope for stable reference ── fixes Chrome Mobile touch bug) ──
const Btn = ({
  onClick,
  children,
  style,
  className,
  disabled,
}: {
  onClick: (e: any) => void
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  disabled?: boolean
}) => (
  <button
    className={className}
    disabled={disabled}
    onClick={(e) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
      onClick(e)
    }}
    style={{
      ...style,
      opacity: disabled ? 0.6 : style?.opacity,
      cursor: disabled ? 'not-allowed' : style?.cursor,
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
    }}
  >
    {children}
  </button>
)

export default function LiveTimer({ categories, todayBlocks = [], recentEntries = [] }: { categories: any[], todayBlocks?: any[], recentEntries?: any[] }) {
  const { toast } = useToast()
  const [now, setNow] = useState(new Date())
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [selectedCat, setSelectedCat] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [mode, setMode] = useState<Mode>('focus')
  const [pomPhase, setPomPhase] = useState<PomodoroPhase>('work')
  const [pomCount, setPomCount] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [stoppedDuration, setStoppedDuration] = useState(0)
  const [desc, setDesc] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [modalCat, setModalCat] = useState('')
  const [modalTagIds, setModalTagIds] = useState<string[]>([])
  const [portalReady, setPortalReady] = useState(false)
  const [isSavingSession, setIsSavingSession] = useState(false)
  // Categorization modal shown at end of pomodoro work phase when no category was pre-selected
  const [showCategorizeModal, setShowCategorizeModal] = useState(false)
  const [categorizeDuration, setCategorizeDuration] = useState(0)
  const [categorizeStartTime, setCategorizeStartTime] = useState<Date | null>(null)

  // Track time for active routine block
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const extractBlockDateKey = (planDate: unknown): string => {
    if (typeof planDate === 'string') return planDate.slice(0, 10)
    if (planDate instanceof Date) return planDate.toISOString().slice(0, 10)
    return ''
  }

  const localTodayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const currentDayBlocks = useMemo(
    () => (todayBlocks || []).filter((block) => extractBlockDateKey(block.planDate) === localTodayKey),
    [todayBlocks, localTodayKey]
  )

  const nowMinutes = (now.getHours() * 60) + now.getMinutes() + (now.getSeconds() / 60)

  const sortedTodayBlocks = useMemo(
    () => [...currentDayBlocks].sort((a, b) => a.startMinutes - b.startMinutes),
    [currentDayBlocks]
  )

  const activeBlock = useMemo(
    () => sortedTodayBlocks.find((block) => block.startMinutes <= nowMinutes && nowMinutes < block.endMinutes),
    [sortedTodayBlocks, nowMinutes]
  )

  const nextBlock = useMemo(
    () => sortedTodayBlocks.find((block) => block.startMinutes > nowMinutes),
    [sortedTodayBlocks, nowMinutes]
  )

  const focusBlock = activeBlock || nextBlock || null
  const showingNextBlock = !activeBlock && Boolean(nextBlock)

  const minutesUntilNextBlock = useMemo(() => {
    if (!nextBlock) return null
    return Math.max(nextBlock.startMinutes - nowMinutes, 0)
  }, [nextBlock, nowMinutes])

  // Pomodoro settings
  const [showSettings, setShowSettings] = useState(false)
  const [workMin, setWorkMin] = useState(25)
  const [shortBreakMin, setShortBreakMin] = useState(5)
  const [longBreakMin, setLongBreakMin] = useState(15)
  const [sessionsBeforeLong, setSessionsBeforeLong] = useState(4)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const pausedElapsedRef = useRef(0)
  const saveLockRef = useRef(false)
  // Store the actual start time for accurate time entry logging
  const sessionStartRef = useRef<Date | null>(null)

  // For portal
  useEffect(() => { setPortalReady(true) }, [])

  const pomTimes = { work: workMin * 60, shortBreak: shortBreakMin * 60, longBreak: longBreakMin * 60 }

  const selectedCategory = useMemo(
    () => categories.find((category: any) => category.id === selectedCat),
    [categories, selectedCat]
  )

  const selectedCategoryTags = useMemo(
    () => selectedCategory?.tags || [],
    [selectedCategory]
  )

  const modalCategory = useMemo(
    () => categories.find((category: any) => category.id === modalCat),
    [categories, modalCat]
  )

  const modalCategoryTags = useMemo(
    () => modalCategory?.tags || [],
    [modalCategory]
  )

  const toggleSelectedTag = (tagId: string) => {
    if (running) return
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
  }

  const toggleModalTag = (tagId: string) => {
    setModalTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
  }

  useEffect(() => {
    if (!selectedCat) {
      setSelectedTagIds([])
      return
    }

    const allowedTagIds = new Set(selectedCategoryTags.map((tag: any) => tag.id))
    setSelectedTagIds((prev) => prev.filter((tagId) => allowedTagIds.has(tagId)))
  }, [selectedCat, selectedCategoryTags])

  useEffect(() => {
    if (!modalCat) {
      setModalTagIds([])
      return
    }

    const allowedTagIds = new Set(modalCategoryTags.map((tag: any) => tag.id))
    setModalTagIds((prev) => prev.filter((tagId) => allowedTagIds.has(tagId)))
  }, [modalCat, modalCategoryTags])

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
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        const tone = (f: number, s: number, d: number) => {
          const o = ctx.createOscillator(), g = ctx.createGain()
          o.connect(g); g.connect(ctx.destination)
          o.frequency.value = f; o.type = 'sine'
          g.gain.setValueAtTime(0.35, ctx.currentTime + s)
          g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + s + d)
          o.start(ctx.currentTime + s); o.stop(ctx.currentTime + s + d)
        }
        tone(523, 0, 0.25); tone(659, 0.3, 0.25); tone(784, 0.6, 0.4)
        setTimeout(() => {
          if (ctx.state !== 'closed') ctx.close()
        }, 1500)
      }
    } catch (err) {
      console.warn('Audio playback failed', err)
    }

    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Mirror', { body: 'Timer done! 🎯' })
      }
    } catch (err) {
      console.warn('Notifications are not supported on this browser.')
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
        const sessionStart = sessionStartRef.current || new Date(Date.now() - elapsed * 1000)

        if (selectedCat) {
          // Category was pre-selected: auto-save and continue to break
          createTimeEntry({
            description: `Pomodoro #${n}`,
            startTime: sessionStart,
            endTime: new Date(),
            durationSeconds: elapsed,
            categoryId: selectedCat || undefined,
            tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          })
          toast(`Pomodoro #${n} logged! 🍅`, 'success')
          setPomPhase(n % sessionsBeforeLong === 0 ? 'longBreak' : 'shortBreak')
          setElapsed(0); pausedElapsedRef.current = 0; startTimeRef.current = Date.now()
          sessionStartRef.current = new Date()
        } else {
          // No category selected: pause and show categorization modal
          if (intervalRef.current) clearInterval(intervalRef.current)
          setRunning(false); setPaused(false)
          setCategorizeDuration(elapsed)
          setCategorizeStartTime(sessionStart)
          setModalCat('')
          setModalTagIds([])
          setDesc(`Pomodoro #${n}`)
          setShowCategorizeModal(true)
        }
      } else {
        // Break is over → move to work phase
        setPomPhase('work')
        toast('Break over! Focus time. 💪', 'info')
        setElapsed(0); pausedElapsedRef.current = 0; startTimeRef.current = Date.now()
        sessionStartRef.current = new Date()
      }
    }
  }, [elapsed, running, paused, mode, pomPhase, pomCount, sessionsBeforeLong, selectedCat, selectedTagIds, pomTimes, playSound, toast])

  const savePomSettings = () => {
    localStorage.setItem('mirror_pom_settings', JSON.stringify({ work: workMin, shortBreak: shortBreakMin, longBreak: longBreakMin, sessions: sessionsBeforeLong }))
    setShowSettings(false); toast('Settings saved!', 'success')
  }

  const isBreakPhase = pomPhase === 'shortBreak' || pomPhase === 'longBreak'

  const doStart = () => {
    setRunning(true); setPaused(false); setElapsed(0)
    pausedElapsedRef.current = 0; startTimeRef.current = Date.now()
    sessionStartRef.current = new Date()
    if (mode === 'pomodoro') { setPomPhase('work'); setPomCount(0) }
  }

  const doPause = () => { pausedElapsedRef.current = elapsed; setPaused(true) }
  const doResume = () => { startTimeRef.current = Date.now(); setPaused(false) }

  const doSkipBreak = () => {
    if (!running || !isBreakPhase || mode !== 'pomodoro') return
    setPomPhase('work')
    setElapsed(0); pausedElapsedRef.current = 0; startTimeRef.current = Date.now()
    sessionStartRef.current = new Date()
    toast('Break skipped! Let\'s go! 🚀', 'info')
  }

  const doStop = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation() }
    if (!running) return

    if (intervalRef.current) clearInterval(intervalRef.current)

    if (mode === 'pomodoro' && isBreakPhase) {
      // Stopping during break: don't save, don't reset pomCount, just go back to work phase
      setRunning(false); setPaused(false)
      setPomPhase('work')
      setElapsed(0); pausedElapsedRef.current = 0
      setFullscreen(false)
      toast('Break ended. Ready for next session.', 'info')
      return
    }

    // Stopping during work/focus: show save modal
    const dur = elapsed
    playSound()
    setRunning(false); setPaused(false)
    setStoppedDuration(dur); setModalCat(selectedCat)
    setModalTagIds(selectedTagIds)
    setIsSavingSession(false); saveLockRef.current = false
    setFullscreen(false); setElapsed(0); pausedElapsedRef.current = 0
    setShowModal(true)
    // Note: manual stop mid-session does NOT increment pomCount
  }

  const doReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false); setPaused(false); setElapsed(0); pausedElapsedRef.current = 0
    setIsSavingSession(false); saveLockRef.current = false
    sessionStartRef.current = null
  }

  const doSave = async () => {
    if (stoppedDuration <= 0 || saveLockRef.current) return

    saveLockRef.current = true
    setIsSavingSession(true)

    try {
      const end = Date.now()
      await createTimeEntry({
        description: desc || undefined,
        startTime: new Date(end - stoppedDuration * 1000),
        endTime: new Date(end),
        durationSeconds: stoppedDuration,
        categoryId: modalCat || undefined,
        tagIds: modalTagIds.length > 0 ? modalTagIds : undefined,
      })
      toast('Saved!', 'success')
      setShowModal(false)
      setDesc('')
      setStoppedDuration(0)
      setModalTagIds([])
    } catch {
      toast('Failed to save session.', 'error')
    } finally {
      setIsSavingSession(false)
      saveLockRef.current = false
    }
  }

  // Save from the categorization modal (shown after pomodoro work phase ends without a pre-selected category)
  const doSaveCategorized = async () => {
    if (categorizeDuration <= 0 || saveLockRef.current) return
    saveLockRef.current = true
    setIsSavingSession(true)

    try {
      await createTimeEntry({
        description: desc || `Pomodoro #${pomCount}`,
        startTime: categorizeStartTime || new Date(Date.now() - categorizeDuration * 1000),
        endTime: new Date(),
        durationSeconds: categorizeDuration,
        categoryId: modalCat || undefined,
        tagIds: modalTagIds.length > 0 ? modalTagIds : undefined,
      })
      toast(`Pomodoro #${pomCount} logged! 🍅`, 'success')
      setShowCategorizeModal(false)
      setDesc('')
      setCategorizeDuration(0)
      setCategorizeStartTime(null)
      setModalTagIds([])

      // Continue to break phase
      setPomPhase(pomCount % sessionsBeforeLong === 0 ? 'longBreak' : 'shortBreak')
      setElapsed(0); pausedElapsedRef.current = 0; startTimeRef.current = Date.now()
      sessionStartRef.current = new Date()
      setRunning(true); setPaused(false)
    } catch {
      toast('Failed to save session.', 'error')
    } finally {
      setIsSavingSession(false)
      saveLockRef.current = false
    }
  }

  const fmt = (s: number) => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0')
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const sec = String(s % 60).padStart(2, '0')
    return `${h}:${m}:${sec}`
  }

  const formatBlockMinutes = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  const formatStartsIn = (totalMinutes: number): string => {
    if (totalMinutes <= 0) return 'Starts now'

    if (totalMinutes < 1) return 'Starts in <1m'

    const wholeMinutes = Math.ceil(totalMinutes)
    const hours = Math.floor(wholeMinutes / 60)
    const minutes = wholeMinutes % 60

    if (hours === 0) return `Starts in ${minutes}m`
    if (minutes === 0) return `Starts in ${hours}h`
    return `Starts in ${hours}h ${minutes}m`
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
              {/* Skip Break button - only visible during break phases */}
              {mode === 'pomodoro' && isBreakPhase && (
                <Btn className="btn-secondary" onClick={doSkipBreak} style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', borderColor: 'rgba(0,204,136,0.4)', color: '#00cc88' }}>
                  <SkipForward size={16} /> Skip
                </Btn>
              )}
              <Btn className="btn-secondary" onClick={doReset} style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                <RotateCcw size={16} />
              </Btn>
            </>
          )}
        </div>

        {/* Pomodoro session counter */}
        {mode === 'pomodoro' && (
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', justifyContent: 'center' }}>
            {Array.from({ length: sessionsBeforeLong }).map((_, i) => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: '50%',
                background: i < pomCount ? color : 'var(--surface-border)',
                border: `1.5px solid ${i < pomCount ? color : 'var(--surface-border)'}`,
                boxShadow: i < pomCount ? `0 0 6px ${color}` : 'none',
                transition: 'all 0.3s'
              }} title={`Session ${i + 1}`} />
            ))}
            <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginLeft: '0.3rem', fontFamily: 'var(--font-mono)' }}>
              {pomCount}/{sessionsBeforeLong}
            </span>
          </div>
        )}
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

  // helper to render category/tag picker (shared between save modal and categorize modal)
  function renderCategoryTagPicker() {
    return (
      <>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.7rem' }}>Category</label>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            <Btn onClick={() => { setModalCat(''); setModalTagIds([]) }} className={!modalCat ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}>None</Btn>
            {categories.map((c: any) => (
              <Btn key={c.id} onClick={() => setModalCat(c.id)} className={modalCat === c.id ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.color }} /> {c.name}
              </Btn>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Tag size={12} /> Tags for selected category</label>
          {!modalCat ? (
            <div className="text-xs text-secondary" style={{ marginTop: '0.3rem' }}>Select a category to choose tags.</div>
          ) : modalCategoryTags.length === 0 ? (
            <div className="text-xs text-secondary" style={{ marginTop: '0.3rem' }}>No tags linked to this category in Settings.</div>
          ) : (
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
              {modalCategoryTags.map((tag: any) => {
                const isActive = modalTagIds.includes(tag.id)
                return (
                  <Btn
                    key={tag.id}
                    onClick={() => toggleModalTag(tag.id)}
                    className={isActive ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '3px', borderColor: isActive ? tag.color : undefined }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: tag.color }} />
                    {tag.name}
                  </Btn>
                )
              })}
            </div>
          )}
        </div>
      </>
    )
  }

  // ── Save Modal (for manual stop, focus mode, mid-work stop) ──
  const saveModal = showModal && portalReady ? createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={() => { if (!isSavingSession) setShowModal(false) }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: '380px', padding: '1.5rem',
        background: 'var(--bg-primary)', border: '1px solid var(--surface-border)',
        borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Session Complete 🎯</h2>
          <Btn onClick={() => setShowModal(false)} disabled={isSavingSession} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} className="">
            <X size={16} />
          </Btn>
        </div>
        <div style={{ fontSize: '2rem', fontFamily: 'var(--font-mono)', fontWeight: 900, marginBottom: '1rem', color: 'var(--accent-primary)', textAlign: 'center' }}>
          {fmt(stoppedDuration)}
        </div>
        {renderCategoryTagPicker()}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.7rem' }}>Description</label>
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What did you work on?" autoFocus disabled={isSavingSession} style={{ marginTop: '0.25rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Btn className="btn-primary" style={{ flex: 1, padding: '0.6rem' }} onClick={doSave} disabled={isSavingSession}>{isSavingSession ? 'Saving...' : 'Save'}</Btn>
          <Btn className="btn-secondary" style={{ flex: 1, padding: '0.6rem' }} onClick={() => setShowModal(false)} disabled={isSavingSession}>Discard</Btn>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  // ── Categorize Modal (shown when pomodoro work phase completes without pre-selected category) ──
  const categorizeModal = showCategorizeModal && portalReady ? createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: '380px', padding: '1.5rem',
        background: 'var(--bg-primary)', border: '1px solid var(--surface-border)',
        borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Pomodoro #{pomCount} Complete 🍅</h2>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Categorize this session before continuing to break.</p>
        <div style={{ fontSize: '2rem', fontFamily: 'var(--font-mono)', fontWeight: 900, marginBottom: '1rem', color: '#ffbe0b', textAlign: 'center' }}>
          {fmt(categorizeDuration)}
        </div>
        {renderCategoryTagPicker()}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.7rem' }}>Description</label>
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What did you work on?" autoFocus disabled={isSavingSession} style={{ marginTop: '0.25rem' }} />
        </div>
        <Btn className="btn-primary" style={{ width: '100%', padding: '0.7rem' }} onClick={doSaveCategorized} disabled={isSavingSession}>
          {isSavingSession ? 'Saving...' : 'Save & Start Break'}
        </Btn>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      {fullscreenOverlay}
      {saveModal}
      {categorizeModal}

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
          
          {/* Active Routine Block Banner */}
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              background: 'var(--surface-active)',
              border: `1px solid ${activeBlock ? 'var(--accent-primary)' : (showingNextBlock ? 'var(--accent-secondary)' : 'var(--surface-border)')}`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              animation: 'fadeIn 0.5s ease-out',
            }}
          >
            <div
              style={{
                padding: '0.4rem',
                background: activeBlock ? 'var(--accent-primary)' : (showingNextBlock ? 'var(--accent-secondary)' : 'var(--surface-border)'),
                color: 'white',
                borderRadius: '8px',
              }}
            >
              <CalendarDays size={16} />
            </div>

            {focusBlock ? (
              <div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: activeBlock ? 'var(--accent-primary)' : 'var(--accent-secondary)',
                    fontWeight: 700,
                    marginBottom: '2px',
                  }}
                >
                  {activeBlock ? 'Current Focus Routine' : 'Next Focus Routine'}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{focusBlock.task}</div>
                <div style={{ marginTop: '0.15rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {formatBlockMinutes(focusBlock.startMinutes)} - {formatBlockMinutes(focusBlock.endMinutes)}
                </div>
                {showingNextBlock && minutesUntilNextBlock !== null && (
                  <div style={{ marginTop: '0.2rem', fontSize: '0.72rem', color: 'var(--accent-secondary)', fontWeight: 700 }}>
                    {formatStartsIn(minutesUntilNextBlock)}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: '2px' }}>
                  Focus Routine
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  No active or upcoming routine block for today.
                </div>
              </div>
            )}
          </div>

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

          {selectedCat && (
            <div style={{ marginBottom: '0.9rem', border: '1px solid var(--surface-border)', borderRadius: '10px', padding: '0.5rem', background: 'var(--surface)' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Tag size={11} /> Tags in this category
              </div>

              {selectedCategoryTags.length === 0 ? (
                <div className="text-xs text-secondary">No tags linked to this category in Settings.</div>
              ) : (
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {selectedCategoryTags.map((tag: any) => {
                    const isActive = selectedTagIds.includes(tag.id)
                    return (
                      <Btn
                        key={tag.id}
                        onClick={() => toggleSelectedTag(tag.id)}
                        className={isActive ? 'btn-primary' : 'btn-secondary'}
                        style={{ padding: '0.2rem 0.45rem', fontSize: '0.62rem', opacity: running ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '3px', borderColor: isActive ? tag.color : undefined }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: tag.color }} />
                        {tag.name}
                      </Btn>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {renderClock(false)}
        </div>
      )}

      {/* Today's Log */}
      {!fullscreen && (
        <div className="glass reveal-up" style={{ '--reveal-delay': '200ms', padding: '1.25rem', marginTop: '1.25rem' } as React.CSSProperties}>
          <h3 style={{ margin: 0, marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={16} /> Today's Log
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }} className="no-scrollbar">
            {recentEntries.filter((e: any) => new Date(e.startTime).toDateString() === new Date().toDateString()).length === 0 ? (
               <p className="text-secondary" style={{ fontSize: '0.8rem', textAlign: 'center', margin: '1rem 0' }}>No entries logged today.</p>
            ) : (
               recentEntries.filter((e: any) => new Date(e.startTime).toDateString() === new Date().toDateString()).map((entry: any, i: number) => {
                 const timeStr = new Date(entry.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                 const desc = entry.description || 'Log'
                 const durStr = entry.durationSeconds ? `${Math.floor(entry.durationSeconds / 60)}m ${entry.durationSeconds % 60}s` : '—'
                 const catColor = entry.category?.color || 'var(--text-secondary)'
                 const catName = entry.category?.name || 'Uncategorized'
                 
                 return (
                   <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--surface-border)' }}>
                      <div style={{ flexShrink: 0, marginTop: '2px', width: '55px' }}>
                         <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{timeStr}</span>
                         <span style={{ fontSize: '0.65rem', color: catColor, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px', fontWeight: 600 }}>
                           <div style={{ width: 4, height: 4, borderRadius: '50%', background: catColor }} /> 
                           <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40px' }}>{catName}</span>
                         </span>
                      </div>
                      <div style={{ flex: 1, borderLeft: '1px solid var(--surface-border)', paddingLeft: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-primary)', lineHeight: 1.4 }}>{desc}</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700, flexShrink: 0 }}>
                        +{durStr}
                      </span>
                   </div>
                 )
               })
            )}
          </div>
        </div>
      )}
    </>
  )
}
