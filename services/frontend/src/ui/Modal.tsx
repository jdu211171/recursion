import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
}

export default function Modal({ open, title, onClose, children }: PropsWithChildren<ModalProps>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {title && <h3 style={{marginTop:0}}>{title}</h3>}
        {children}
        <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
