import { useEffect } from 'react'

export interface ToastMessage {
  id: string
  text: string
  type?: 'info' | 'success' | 'warning' | 'error'
}

interface Props {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export default function Toast({ toasts, onDismiss }: Props) {
  useEffect(() => {
    const timers = toasts.map(t => setTimeout(() => onDismiss(t.id), 4000))
    return () => { timers.forEach(clearTimeout) }
  }, [toasts, onDismiss])

  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, display: 'grid', gap: 8, zIndex: 60 }} aria-live="polite" aria-atomic="true">
      {toasts.map(t => (
        <div key={t.id} className="card" role="status" style={{ padding: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <strong style={{ textTransform: 'capitalize' }}>{t.type || 'info'}</strong>
          <span>{t.text}</span>
          <button className="btn" onClick={() => onDismiss(t.id)} aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  )
}
