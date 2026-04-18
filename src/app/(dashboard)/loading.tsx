export default function DashboardLoading() {
  return (
    <div className="motion-stack" style={{ opacity: 0.6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div className="skeleton" style={{ width: 220, height: 36, borderRadius: 12, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: 160, height: 18, borderRadius: 8 }} />
        </div>
        <div className="skeleton" style={{ width: 180, height: 44, borderRadius: 22 }} />
      </div>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>

      <div className="skeleton-card" style={{ height: 200 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="skeleton-card" style={{ height: 160 }} />
        <div className="skeleton-card" style={{ height: 160 }} />
      </div>
    </div>
  )
}
