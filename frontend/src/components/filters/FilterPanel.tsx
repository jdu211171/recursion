import Button from '../primitives/Button'

interface Props {
  open: boolean
  onClose: () => void
  children?: any
}

export default function FilterPanel({ open, onClose, children }: Props) {
  if (!open) return null
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong>Filters</strong>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
      <div style={{ marginTop: 8 }}>
        {children || <p className="muted">Add filter controls here (status, category, date range).</p>}
      </div>
    </div>
  )
}

