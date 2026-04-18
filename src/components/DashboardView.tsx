'use client'

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
    <div className="flex-col gap-lg">
      {/* Stat Cards */}
      <div className="grid-2">
        <div className="stat-card glass-glow" style={{ padding: 'var(--space-2xl)' }}>
          <div className="stat-label">Today</div>
          <div className="stat-value" style={{ fontSize: '3rem', margin: 'var(--space-sm) 0' }}>{todayHours}h</div>
          <div style={{ marginTop: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="text-sm text-secondary">Goal: {dailyGoalHours}h</span>
              <span className="text-sm font-bold" style={{ color: 'var(--accent-primary)' }}>{Math.round(todayPct)}%</span>
            </div>
            <div className="progress-track" style={{ height: '12px' }}>
              <div className="progress-fill" style={{ width: `${todayPct}%` }} />
            </div>
          </div>
        </div>

        <div className="stat-card glass-glow" style={{ padding: 'var(--space-2xl)' }}>
          <div className="stat-label">This Week</div>
          <div className="stat-value" style={{ fontSize: '3rem', margin: 'var(--space-sm) 0' }}>{weekHours}h</div>
          <div style={{ marginTop: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="text-sm text-secondary">Goal: {weeklyGoalHours}h</span>
              <span className="text-sm font-bold" style={{ color: 'var(--accent-primary)' }}>{Math.round(weekPct)}%</span>
            </div>
            <div className="progress-track" style={{ height: '12px' }}>
              <div className="progress-fill" style={{ width: `${weekPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {stats.categoryBreakdown.length > 0 && (
        <div className="glass-glow" style={{ padding: 'var(--space-2xl)' }}>
          <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
            Category Breakdown
          </h3>
          {/* Stacked bar */}
          <div style={{ display: 'flex', height: '12px', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 'var(--space-md)' }}>
            {stats.categoryBreakdown.map((cat, i) => (
              <div
                key={i}
                style={{
                  width: `${(cat.seconds / totalCatSeconds) * 100}%`,
                  background: cat.color,
                  transition: 'width 1s ease',
                }}
                title={`${cat.name}: ${(cat.seconds / 3600).toFixed(1)}h`}
              />
            ))}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            {stats.categoryBreakdown.map((cat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color }} />
                <span className="text-sm">{cat.name}</span>
                <span className="text-xs text-secondary">{(cat.seconds / 3600).toFixed(1)}h</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
