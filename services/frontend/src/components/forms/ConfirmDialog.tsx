import Modal from '../primitives/Modal'
import Button from '../primitives/Button'

interface Props {
  open: boolean
  title?: string
  message: string
  confirmText?: string
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmDialog({ open, title = 'Confirm', message, confirmText = 'Confirm', onCancel, onConfirm }: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="muted" style={{ marginTop: 0 }}>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm}>{confirmText}</Button>
      </div>
    </Modal>
  )
}

