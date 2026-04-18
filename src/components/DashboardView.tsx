'use client'

import { Activity, Network, Database } from 'lucide-react'

export default function DashboardView({ stats }: {
  stats: {
    todaySeconds: number
    weekSeconds: number
    dailyGoal: number
    weeklyGoal: number
    categoryBreakdown: { name: string; color: string; seconds: number }[]
  }
}) {
  const todayHours = (stats.todaySeconds / 3600).toFixed(1)
  const weekHours = (stats.weekSeconds / 3600).toFixed(1)
  const dailyGoalHours = (stats.dailyGoal / 3600).toFixed(0)
  const weeklyGoalHours = (stats.weeklyGoal / 3600).toFixed(0)

  const todayPct = Math.min((stats.todaySeconds / stats.dailyGoal) * 100, 100)
  const weekPct = Math.min((stats.weekSeconds / stats.weeklyGoal) * 100, 100)

  const totalCatSeconds = stats.categoryBreakdown.reduce((a, b) => a + b.seconds, 0) || 1

  return (
    <div className="flex-col gap-xl">
      {/* Network Status Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,240,255,0.05)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(0,240,255,0.2)' }}>
        <div style={{ padding: '0.5rem', background: 'rgba(0,240,255,0.1)', borderRadius: '12px', color: 'var(--accent-secondary)' }}>
          <Network size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Quantum Neural Link</h3>
          <p className="text-secondary text-xs" style={{ margin: 0, marginTop: '4px' }}>All data streams stable. Syncing with primary core.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-2">
        <div className="stat-card glass-glow reveal-up" style={{ padding: '3rem 2rem', '--reveal-delay': '100ms' } as React.CSSProperties}>
          <div className="stat-label flex-row" style={{ alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} /> TODAYS THROUGHPUT
          </div>
          <div className="stat-value" style={{ margin: '1rem 0' }}>{todayHours}h</div>
          
          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span className="text-xs text-secondary" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Target: {dailyGoalHours}h</span>
              <span className="text-sm font-bold" style={{ color: 'var(--accent-primary)', textShadow: '0 0 10px var(--accent-primary-glow)' }}>{Math.round(todayPct)}% SYNC</span>
            </div>
            <div className="progress-track" style={{ height: '16px' }}>
              <div className="progress-fill" style={{ width: `${todayPct}%`, background: 'var(--accent-gradient-vivid)' }} />
            </div>
          </div>
        </div>

        <div className="stat-card glass-glow reveal-up" style={{ padding: '3rem 2rem', '--reveal-delay': '200ms' } as React.CSSProperties}>
          <div className="stat-label flex-row" style={{ alignItems: 'center', gap: '0.5rem' }}>
            <Database size={16} /> WEEKLY AGGREGATE
          </div>
          <div className="stat-value" style={{ margin: '1rem 0' }}>{weekHours}h</div>
          
          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span className="text-xs text-secondary" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Target: {weeklyGoalHours}h</span>
              <span className="text-sm font-bold" style={{ color: 'var(--accent-secondary)', textShadow: '0 0 10px rgba(0,240,255,0.4)' }}>{Math.round(weekPct)}% SYNC</span>
            </div>
            <div className="progress-track" style={{ height: '16px' }}>
              <div className="progress-fill" style={{ width: `${weekPct}%`, background: 'linear-gradient(90deg, var(--accent-secondary), #0df046)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown Graphical Interface */}
      {stats.categoryBreakdown.length > 0 && (
        <div className="glass-glow reveal-up" style={{ padding: '3rem 2rem', '--reveal-delay': '300ms' } as React.CSSProperties}>
          <h3 style={{ marginBottom: '2rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 8, height: 8, background: 'var(--accent-secondary)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent-secondary)' }} />
            Algorithmic Breakdown
          </h3>
          
          {/* Enhanced Bar Graph Visuals */}
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '150px', gap: '1rem', marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            {stats.categoryBreakdown.map((cat, i) => {
              const heightPct = Math.max((cat.seconds / totalCatSeconds) * 100, 5)
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', height: '100%', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${heightPct}%`,
                      background: cat.color,
                      borderRadius: '8px 8px 0 0',
                      transition: 'height 1s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: `0 0 20px ${cat.color}80, inset 0 0 10px rgba(255,255,255,0.3)`,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    title={`${cat.name}: ${(cat.seconds / 3600).toFixed(1)}h`}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.8)' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center' }}>
            {stats.categoryBreakdown.map((cat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.4)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: cat.color, boxShadow: `0 0 10px ${cat.color}` }} />
                <span className="text-sm font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{cat.name}</span>
                <span className="text-xs text-secondary" style={{ fontFamily: 'var(--font-mono)' }}>{(cat.seconds / 3600).toFixed(1)}H</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
