import { useEffect, useMemo, useState } from 'react'
import Modal from '../primitives/Modal'
import Button from '../primitives/Button'
import Input from '../primitives/Input'
import Combobox, { type ComboOption } from '../primitives/Combobox'
import usersService, { type User } from '../../services/users'
import lendingService from '../../services/lending'
import { useTenant } from '../../contexts/TenantContext'
import { toast } from 'sonner'

interface Props {
  open: boolean
  item: { id: string; name: string; availableCount: number } | null
  onClose: () => void
  onSuccess?: () => void
}

type Preset = { id: string; label: string; days: number }

export default function BorrowConfirmModal({ open, item, onClose, onSuccess }: Props) {
  const { currentOrg } = useTenant()
  const [loading, setLoading] = useState(false)

  // Borrower search and selection
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<User[]>([])
  const [selectedBorrowerId, setSelectedBorrowerId] = useState('')
  const [searching, setSearching] = useState(false)

  // Due date handling
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [dueDate, setDueDate] = useState<string>(todayStr)

  // Presets
  const storageKey = useMemo(() => {
    const base = 'borrow.confirm.presets'
    return currentOrg?.id ? `${base}:${currentOrg.id}` : base
  }, [currentOrg])
  const lastUsedKey = useMemo(() => {
    const base = 'borrow.confirm.lastUsed'
    return currentOrg?.id ? `${base}:${currentOrg.id}` : base
  }, [currentOrg])
  const [presets, setPresets] = useState<Preset[]>([])
  const [activePresetId, setActivePresetId] = useState<string>('')
  const [newLabel, setNewLabel] = useState('')
  const [newDays, setNewDays] = useState<number>(7)

  useEffect(() => {
    if (!open) return
    // Load presets from storage or seed defaults
    try {
      const raw = localStorage.getItem(storageKey)
      const lastUsedId = localStorage.getItem(lastUsedKey)
      
      if (raw) {
        const parsed: Preset[] = JSON.parse(raw)
        setPresets(parsed)
        
        // Try to apply last used preset if it exists
        if (lastUsedId && parsed.length > 0) {
          const presetToApply = parsed.find(p => p.id === lastUsedId)
          if (presetToApply) {
            applyPreset(presetToApply)
            setActivePresetId(presetToApply.id)
          }
        }
      } else {
        // Start with no presets
        setPresets([])
        localStorage.setItem(storageKey, JSON.stringify([]))
      }
    } catch {
      // fallback - start with empty presets
      setPresets([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, storageKey, lastUsedKey])

  const savePresets = (next: Preset[]) => {
    setPresets(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
  }
  const applyPreset = (p: Preset) => {
    const d = new Date()
    d.setDate(d.getDate() + p.days)
    setDueDate(d.toISOString().slice(0,10))
    setActivePresetId(p.id)
    // Save as last used
    try { localStorage.setItem(lastUsedKey, p.id) } catch {}
  }
  const addPreset = () => {
    const days = Math.max(1, Math.floor(Number(newDays)))
    if (!days) return
    const label = newLabel?.trim() || `${days} days`
    const id = `c${Date.now()}`
    savePresets([...presets, { id, label, days }])
    setNewLabel('')
    setNewDays(7)
  }
  const removePreset = (id: string) => {
    const preset = presets.find(p => p.id === id)
    if (!preset) return
    
    const confirmDelete = window.confirm(`Delete preset "${preset.label}"?`)
    if (!confirmDelete) return
    
    const next = presets.filter(p => p.id !== id)
    savePresets(next)
    
    // If we deleted the active preset, clear the active state
    if (activePresetId === id) {
      setActivePresetId('')
    }
  }

  // Borrower search
  useEffect(() => {
    let active = true
    const run = async () => {
      const q = query.trim()
      if (q.length < 2) { setOptions([]); setSearching(false); return }
      setSearching(true)
      try {
        const res = await usersService.getUsers({ search: q, role: 'BORROWER', isActive: true, limit: 10 })
        if (active) setOptions(res.users)
      } catch {
        if (active) setOptions([])
      }
      if (active) setSearching(false)
    }
    run()
    return () => { active = false }
  }, [query])

  // Reset selection when item changes/open toggles
  useEffect(() => {
    if (open) {
      setSelectedBorrowerId('')
      setQuery('')
    }
  }, [open, item?.id])

  const canBorrow = !!item && !!selectedBorrowerId && !!dueDate && !loading

  const onBorrow = async () => {
    if (!item || !selectedBorrowerId || !dueDate) return
    setLoading(true)
    try {
      // Convert dueDate (YYYY-MM-DD) to ISO (end of day local)
      const due = new Date(`${dueDate}T23:59:59`)
      await lendingService.checkout({ itemId: item.id, userId: selectedBorrowerId, dueDate: due.toISOString() })
      toast.success('Borrowed successfully')
      onSuccess?.()
      onClose()
    } catch (e: any) {
      const msg = e?.message || 'Failed to borrow'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Confirm Borrow">
      {!item ? (
        <p className="muted">No item selected.</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 10, boxShadow: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                <div className="muted">ID: {item.id}</div>
              </div>
              <div className="muted">Available: {item.availableCount}</div>
            </div>
          </div>

          <div className="grid">
            <div className="col-12 field">
              <label className="muted" htmlFor="borrower-search">Select Borrower</label>
              <Combobox
                id="borrower-search"
                ariaLabel="Select borrower"
                placeholder="Type name or email"
                options={options.map<ComboOption<User>>(u => ({
                  value: u.id,
                  label: `${`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email} • ${u.email}`,
                  data: u,
                }))}
                value={selectedBorrowerId || null}
                onChange={(val, opt) => {
                  setSelectedBorrowerId(val || '')
                  if (opt?.data) {
                    const u = opt.data
                    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim()
                    setQuery(name || u.email)
                  }
                }}
                inputValue={query}
                onInputValueChange={setQuery}
                loading={searching}
                emptyMessage={query.trim().length < 2 ? 'Keep typing to search…' : 'No users found'}
                renderOption={(opt) => {
                  const u = opt.data as User | undefined
                  const name = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : opt.label
                  return (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{name || '—'}</span>
                      <span className="muted" style={{ fontSize: 12 }}>{u?.email}</span>
                    </span>
                  )
                }}
              />
            </div>

            <div className="col-12 field">
              <label className="muted" htmlFor="due-date">Due Date</label>
              <Input id="due-date" type="date" value={dueDate} min={todayStr} onChange={(e) => setDueDate(e.target.value)} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                {presets.map(p => (
                  <div key={p.id} style={{ position: 'relative', display: 'inline-flex' }}>
                    <Button 
                      variant={activePresetId === p.id ? 'solid' : 'ghost'}
                      onClick={() => applyPreset(p)}
                      style={{ 
                        paddingRight: 32
                      }}
                    >
                      {p.label}
                    </Button>
                    <button
                      onClick={() => removePreset(p.id)}
                      style={{
                          position: 'absolute',
                          right: 4,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          fontSize: 16,
                          lineHeight: 1,
                          opacity: 0.7,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                        aria-label={`Remove ${p.label} preset`}
                      >
                        ×
                      </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <Input 
                    placeholder="Days" 
                    type="number"
                    min={1}
                    value={newDays} 
                    onChange={(e) => setNewDays(parseInt(e.target.value || '0', 10))} 
                    style={{ width: 60 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newDays > 0) {
                        addPreset()
                      }
                    }}
                  />
                  <Button 
                    variant="ghost" 
                    onClick={addPreset}
                    disabled={newDays < 1}
                    style={{ padding: '6px 12px' }}
                    title="Add preset"
                  >
                    +
                  </Button>
                </div>
              </div>

            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button onClick={onBorrow} disabled={!canBorrow}>{loading ? 'Processing…' : 'Borrow'}</Button>
          </div>
        </>
      )}
    </Modal>
  )
}
