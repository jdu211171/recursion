import type { PropsWithChildren } from 'react'
import { useEffect, useRef } from 'react'
import { trapFocus } from '../../utils/a11y'

interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
}

export default function Modal({ open, title, onClose, children }: PropsWithChildren<ModalProps>) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const lastActive = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    let release: (() => void) | undefined
    if (open) {
      window.addEventListener('keydown', onKey)
      lastActive.current = document.activeElement as HTMLElement
      if (panelRef.current) {
        release = trapFocus(panelRef.current)
        const first = panelRef.current.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        first?.focus()
      }
    }
    return () => {
      window.removeEventListener('keydown', onKey)
      release?.()
      lastActive.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay" onClick={onClose}>
      <div ref={panelRef} className="modal" onClick={(e) => e.stopPropagation()}>
        {title && <h3 style={{marginTop:0}}>{title}</h3>}
        {children}
      </div>
    </div>
  )
}
