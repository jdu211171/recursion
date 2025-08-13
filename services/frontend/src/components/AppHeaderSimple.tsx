import { memo, useMemo } from 'react'

interface AppHeaderSimpleProps {
  title?: string
  subtitle?: string
  tabs: { key: string; label: string }[]
  active: string
  onChange: (key: string) => void
}

function AppHeaderSimple({ title = 'Recursion', subtitle = 'Minimal single-page dashboard', tabs, active, onChange }: AppHeaderSimpleProps) {
  const items = useMemo(() => tabs, [tabs])
  return (
    <header className="app-header">
      <div>
        <h1 className="title"><span className="dot" /> {title}</h1>
        <p className="subtitle">{subtitle}</p>
      </div>
      <nav className="nav" aria-label="Primary">
        {items.map(t => (
          <button key={t.key} className={`tab-btn ${active === t.key ? 'is-active' : ''}`} onClick={() => onChange(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  )
}

export default memo(AppHeaderSimple)

