import { useEffect, useMemo, useState } from 'react'
import Modal from '../primitives/Modal'
import Button from '../primitives/Button'
import Combobox, { type ComboOption } from '../primitives/Combobox'
import Input from '../primitives/Input'
import lendingService from '../../services/lending'
import authService from '../../services/auth'
import { useTenant } from '../../contexts/TenantContext'
import { toast } from 'sonner'

interface Props {
  open: boolean
  borrowing: { id: string; itemId: string; userId: string; dueDate?: string } | null
  onClose: () => void
  onSuccess?: () => void
}

type Reason = { id: string; label: string; builtin?: boolean }

export default function ReturnConfirmModal({ open, borrowing, onClose, onSuccess }: Props) {
  const { currentOrg } = useTenant()
  const [loading, setLoading] = useState(false)
  const [applyPenalty, setApplyPenalty] = useState(false)
  const [canChoosePenalty, setCanChoosePenalty] = useState(false)

  const storageKey = useMemo(() => {
    const base = 'penalty.reasons'
    return currentOrg?.id ? `${base}:${currentOrg.id}` : base
  }, [currentOrg])

  const listKey = useMemo(() => {
    const base = 'penalties:list'
    return currentOrg?.id ? `${base}:${currentOrg.id}` : base
  }, [currentOrg])

  const [reasons, setReasons] = useState<Reason[]>([])
  const [query, setQuery] = useState('')
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null)

  // Seed + load reasons on open
  useEffect(() => {
    if (!open) return
    // role check for showing penalty option
    try {
      const u = authService.getUser()
      setCanChoosePenalty(u?.role === 'ADMIN' || u?.role === 'STAFF')
    } catch { setCanChoosePenalty(false) }
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed: Reason[] = JSON.parse(raw)
        setReasons(parsed)
        if (parsed.length > 0) setSelectedReasonId(parsed[0].id)
      } else {
        const seeded: Reason[] = [
          { id: 'late', label: 'Late Return', builtin: true },
          { id: 'damaged', label: 'Damaged Item', builtin: true },
          { id: 'lost', label: 'Lost Item', builtin: true },
        ]
        localStorage.setItem(storageKey, JSON.stringify(seeded))
        setReasons(seeded)
        setSelectedReasonId(seeded[0].id)
      }
    } catch {
      // noop
    }
    setQuery('')
    setApplyPenalty(false)
  }, [open, storageKey])

  const options: Array<ComboOption> = reasons
    .filter(r => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      return r.label.toLowerCase().includes(q)
    })
    .map(r => ({ value: r.id, label: r.label }))

  const canAddNew = useMemo(() => {
    const q = query.trim()
    if (q.length < 2) return false
    return !reasons.some(r => r.label.toLowerCase() === q.toLowerCase())
  }, [query, reasons])

  const addNewReason = () => {
    const q = query.trim()
    if (q.length < 2) return
    const id = `c${Date.now()}`
    const next = [...reasons, { id, label: q }]
    setReasons(next)
    setSelectedReasonId(id)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
  }

  const onConfirmReturn = async () => {
    if (!borrowing) return
    setLoading(true)
    try {
      let notes: string | undefined = undefined
      if (applyPenalty && canChoosePenalty) {
        const reason = reasons.find(r => r.id === selectedReasonId)?.label || query.trim() || 'Penalty'
        notes = `Penalty: ${reason}`
      }
      await lendingService.return(borrowing.id, notes ? { notes } : undefined)

      // Append to local penalties list for UI tracking
      if (applyPenalty && canChoosePenalty) {
        try {
          const reason = reasons.find(r => r.id === selectedReasonId)?.label || query.trim() || 'Penalty'
          const existing: any[] = JSON.parse(localStorage.getItem(listKey) || '[]')
          const record = { id: `p_${Date.now()}`, userId: borrowing.userId, itemId: borrowing.itemId, borrowingId: borrowing.id, reason, createdAt: new Date().toISOString() }
          localStorage.setItem(listKey, JSON.stringify([record, ...existing]))
        } catch { /* ignore */ }
      }

      toast.success('Marked as returned')
      onSuccess?.()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to return')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Confirm Return">
      {!borrowing ? (
        <p className="muted">No borrowing selected.</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="grid">
              <div className="col-6">
                <div className="muted">Borrowing ID</div>
                <div>{borrowing.id}</div>
              </div>
              <div className="col-6">
                <div className="muted">Due Date</div>
                <div>{borrowing.dueDate ? new Date(borrowing.dueDate).toLocaleDateString() : '—'}</div>
              </div>
            </div>
          </div>

          {canChoosePenalty && (
            <div className="field">
              <label className="muted">Action</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant={applyPenalty ? 'ghost' : 'solid'} onClick={() => setApplyPenalty(false)}>Return only</Button>
                <Button variant={applyPenalty ? 'solid' : 'ghost'} onClick={() => setApplyPenalty(true)}>Return + penalty</Button>
              </div>
            </div>
          )}

          {(!canChoosePenalty || applyPenalty) && (
          <div className="field">
            <label className="muted" htmlFor="penalty-reason">Penalty Reason</label>
            <Combobox
              id="penalty-reason"
              ariaLabel="Penalty reason"
              placeholder="Search or type to create"
              options={options}
              value={selectedReasonId}
              onChange={(val) => setSelectedReasonId(val)}
              inputValue={query}
              onInputValueChange={setQuery}
              emptyMessage={canAddNew ? 'Press Enter to add this reason' : 'No matches'}
            />
            {canAddNew && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <Input value={query} onChange={(e) => setQuery(e.target.value)} />
                <Button variant="ghost" onClick={addNewReason}>Add reason</Button>
              </div>
            )}
          </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button onClick={onConfirmReturn} disabled={loading}>{loading ? 'Processing…' : (applyPenalty && canChoosePenalty ? 'Return with penalty' : 'Confirm Return')}</Button>
          </div>
        </>
      )}
    </Modal>
  )
}
