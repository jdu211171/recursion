import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Autocomplete,
  Chip
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { addDays } from 'date-fns'
import { useTenant } from '../../contexts/TenantContext'
import configurationsService from '../../services/configurations'
import authService from '../../services/auth'
import itemsService from '../../services/items'
import usersService, { User } from '../../services/users'
import lendingService from '../../services/lending'
import approvalsService from '../../services/approvals'
import { useConfig } from '../../contexts/ConfigContext'

interface BorrowReturnModalProps {
  open: boolean
  onClose: () => void
  mode: 'borrow' | 'return'
  item?: {
    id: number
    title: string
    availableCount: number
  }
  borrowing?: {
    id: number
    itemTitle: string
    borrowerName: string
    borrowerId: string
    dueDate: string
  }
  onComplete: () => void
}

interface Penalty {
  type: 'late' | 'lost' | 'damaged'
  amount: number
  blacklistDays: number
  description: string
}

interface AvailableItem {
  id: number
  title: string
  availableCount: number
}

export default function BorrowReturnModal({ 
  open, 
  onClose, 
  mode, 
  item, 
  borrowing,
  onComplete 
}: BorrowReturnModalProps) {
  const { config } = useConfig()
  const { currentOrg } = useTenant()
  const [selectedItem, setSelectedItem] = useState<AvailableItem | null>(null)
  const [selectedBorrower, setSelectedBorrower] = useState<User | null>(null)
  const [borrowerName, setBorrowerName] = useState('')
  const [borrowerId, setBorrowerId] = useState('')
  const [dueDate, setDueDate] = useState<Date | null>(addDays(new Date(), 7))
  const [searchQuery, setSearchQuery] = useState('')
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([])
  const [borrowerSearch, setBorrowerSearch] = useState('')
  const [borrowerOptions, setBorrowerOptions] = useState<User[]>([])
  const [penalty, setPenalty] = useState<Penalty | null>(null)
  const [loading, setLoading] = useState(false)
  const [approvalRequired, setApprovalRequired] = useState(false)

  // Flexible presets for due date
  type DueDatePreset = { id: string; label: string; days: number; isDefault?: boolean; builtin?: boolean }
  const [presets, setPresets] = useState<DueDatePreset[]>([])
  const [showManagePresets, setShowManagePresets] = useState(false)
  const [newPresetLabel, setNewPresetLabel] = useState('')
  const [newPresetDays, setNewPresetDays] = useState<number>(7)

  const storageKey = useMemo(() => {
    const base = 'borrow.dueDatePresets'
    return currentOrg?.id ? `${base}:${currentOrg.id}` : base
  }, [currentOrg])

  const seedPresets = (orgDays?: number): DueDatePreset[] => {
    const d = orgDays && orgDays > 0 ? orgDays : 14
    return [
      { id: 'p7', label: '+7d', days: 7, builtin: true },
      { id: `pd`, label: `+${d}d (Default)`, days: d, isDefault: true, builtin: true },
      { id: 'p30', label: '+30d', days: 30, builtin: true },
    ]
  }

  // Load presets (with optional org default) and apply default selection
  useEffect(() => {
    if (!open) return
    let cancelled = false

    const load = async () => {
      try {
        // Try load from storage first
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const parsed: DueDatePreset[] = JSON.parse(raw)
          if (!cancelled) setPresets(parsed)
          const def = parsed.find(p => p.isDefault) ?? parsed[0]
          if (!cancelled && def) setDueDate(addDays(new Date(), def.days))
          return
        }

        // Else, fetch org config for a sensible default
        let orgDays: number | undefined
        try {
          if (currentOrg?.id) {
            const cfg = await configurationsService.getConfiguration(parseInt(currentOrg.id as any))
            // Prefer maxLendingDays if present
            if (cfg && typeof cfg.maxLendingDays === 'number' && cfg.maxLendingDays > 0) {
              orgDays = cfg.maxLendingDays
            }
          }
        } catch {
          // ignore config fetch errors, we’ll fall back to 14
        }

        const seeded = seedPresets(orgDays)
        if (!cancelled) {
          setPresets(seeded)
          localStorage.setItem(storageKey, JSON.stringify(seeded))
          const def = seeded.find(p => p.isDefault) ?? seeded[0]
          if (def) setDueDate(addDays(new Date(), def.days))
        }
      } catch {
        // On any error, fall back to 14 days
        if (!cancelled) {
          const fallback = seedPresets(14)
          setPresets(fallback)
          const def = fallback.find(p => p.isDefault) ?? fallback[0]
          if (def) setDueDate(addDays(new Date(), def.days))
        }
      }
    }
    load()

    return () => { cancelled = true }
  }, [open, storageKey, currentOrg])

  const savePresets = (next: DueDatePreset[]) => {
    setPresets(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
  }

  const applyPreset = (p: DueDatePreset) => {
    setDueDate(addDays(new Date(), p.days))
  }

  const addPreset = () => {
    const days = Math.max(1, Math.floor(Number(newPresetDays)))
    const label = newPresetLabel?.trim() || `+${days}d`
    const id = `c${Date.now()}`
    const next = [...presets, { id, label, days }]
    savePresets(next)
    setNewPresetDays(7)
    setNewPresetLabel('')
  }

  const removePreset = (id: string) => {
    const next = presets.filter(p => p.id !== id)
    // Ensure at least one preset remains
    if (next.length === 0) return
    // If default removed, set first as default
    if (!next.some(p => p.isDefault)) next[0].isDefault = true
    savePresets(next)
  }

  const setDefaultPreset = (id: string) => {
    const next = presets.map(p => ({ ...p, isDefault: p.id === id }))
    savePresets(next)
  }

  useEffect(() => {
    if (mode === 'borrow' && item) {
      setSelectedItem(item)
      // Reset borrower selection when opening for a specific item
      setSelectedBorrower(null)
      setBorrowerName('')
      setBorrowerId('')
    } else if (mode === 'return' && borrowing) {
      setBorrowerName(borrowing.borrowerName)
      setBorrowerId(borrowing.borrowerId)
    }
  }, [mode, item, borrowing])

  useEffect(() => {
    if (mode === 'borrow' && !item && searchQuery) {
      searchItems()
    }
  }, [searchQuery, mode, item])

  const searchItems = async () => {
    try {
      const data = await itemsService.getItems({
        search: searchQuery,
        isAvailable: true,
        limit: 10
      })
      setAvailableItems(data.items.map(item => ({
        id: parseInt(item.id),
        title: item.name,
        availableCount: item.availableCount
      })))
    } catch (error) {
      console.error('Failed to search items:', error)
    }
  }

  // Search borrowers (users) by input
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (mode !== 'borrow') return
      if (!borrowerSearch || borrowerSearch.trim().length < 2) {
        setBorrowerOptions([])
        return
      }
      try {
        const res = await usersService.getUsers({ search: borrowerSearch.trim(), role: 'BORROWER', isActive: true, limit: 10 })
        if (!cancelled) setBorrowerOptions(res.users)
      } catch {
        if (!cancelled) setBorrowerOptions([])
      }
    }
    run()
    return () => { cancelled = true }
  }, [borrowerSearch, mode])

  const calculatePenalty = async () => {
    if (mode !== 'return' || !borrowing) return

    try {
      const penaltyCalc = await lendingService.calculatePenalty(borrowing.id.toString())
      if (penaltyCalc.amount > 0) {
        const now = new Date()
        const due = new Date(borrowing.dueDate)
        const daysLate = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
        const blacklistDays = Math.min(daysLate * 3, 30) // 3 days ban per day late, max 30

        setPenalty({
          type: 'late',
          amount: penaltyCalc.amount,
          blacklistDays,
          description: penaltyCalc.reason
        })
      }
    } catch (error) {
      console.error('Failed to calculate penalty:', error)
    }
  }

  useEffect(() => {
    if (mode === 'return' && borrowing && open) {
      calculatePenalty()
    }
  }, [mode, borrowing, open])

  useEffect(() => {
    if (mode === 'borrow' && config) {
      setApprovalRequired(Boolean((config as any)?.require_approval))
    }
  }, [mode, config])

  const handleBorrow = async () => {
    if (!selectedItem || !dueDate) return
    // Require borrower selection for clarity
    if (!selectedBorrower) return

    setLoading(true)
    try {
      if (approvalRequired) {
        // Create approval request instead of direct lending
        await approvalsService.createApprovalRequest({
          itemId: selectedItem.id.toString(),
          type: 'lending',
          requestData: {
            dueDate: dueDate.toISOString(),
            // Include borrower details in notes until backend supports explicit target user in approvals
            notes: `Borrower: ${selectedBorrower.firstName || ''} ${selectedBorrower.lastName || ''}`.trim() + ` <${selectedBorrower.email}> (id:${selectedBorrower.id})`
          }
        })
        alert('Approval request submitted successfully! Please wait for staff approval.')
      } else {
        // Direct lending (original flow)
        await lendingService.checkout({
          itemId: selectedItem.id.toString(),
          userId: selectedBorrower.id,
          dueDate: dueDate.toISOString(),
          notes: `Borrower: ${selectedBorrower.firstName || ''} ${selectedBorrower.lastName || ''}`.trim() + ` <${selectedBorrower.email}>`
        })
      }
      onComplete()
      onClose()
    } catch (error) {
      console.error('Failed to process request:', error)
      alert(approvalRequired ? 'Failed to submit approval request. Please try again.' : 'Failed to borrow item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReturn = async () => {
    if (!borrowing) return

    setLoading(true)
    try {
      await lendingService.return(borrowing.id.toString(), {
        notes: penalty ? `Penalty applied: ${penalty.description}` : undefined
      })

      // If penalty exists, create blacklist entry
      if (penalty && penalty.blacklistDays > 0) {
        const user = authService.getUser()
        if (user) {
          await lendingService.createBlacklist({
            userId: borrowing.borrowerId,
            reason: penalty.description,
            blockedUntil: new Date(Date.now() + penalty.blacklistDays * 24 * 60 * 60 * 1000).toISOString()
          })
        }
      }

      onComplete()
      onClose()
    } catch (error) {
      console.error('Failed to return item:', error)
      alert('Failed to return item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'borrow' ? `Borrow Item${item ? `: ${item.title}` : ''}` : `Return Item: ${borrowing?.itemTitle}`}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {mode === 'borrow' && !item && (
            <Autocomplete
              options={availableItems}
              getOptionLabel={(option) => option.title}
              value={selectedItem}
              onChange={(_, newValue) => setSelectedItem(newValue)}
              onInputChange={(_, newInputValue) => setSearchQuery(newInputValue)}
              renderInput={(params) => (
                <TextField {...params} label="Search Item" fullWidth />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <Typography>{option.title}</Typography>
                    <Chip 
                      label={`${option.availableCount} available`}
                      size="small"
                      color={option.availableCount > 0 ? 'success' : 'error'}
                    />
                  </Box>
                </Box>
              )}
            />
          )}

          {selectedItem && mode === 'borrow' && (
            <Alert severity="info">
              Available: {selectedItem.availableCount} items
            </Alert>
          )}

          {mode === 'borrow' && approvalRequired && (
            <Alert severity="warning">
              <Typography variant="subtitle2" gutterBottom>
                Approval Required
              </Typography>
              <Typography variant="body2">
                This organization requires staff approval for borrowing. Your request will be reviewed before the item is checked out.
              </Typography>
            </Alert>
          )}

          {mode === 'borrow' && (
            <Autocomplete
              options={borrowerOptions}
              getOptionLabel={(u) => {
                const name = `${u.firstName || ''} ${u.lastName || ''}`.trim()
                return name ? `${name} • ${u.email}` : u.email
              }}
              value={selectedBorrower}
              onChange={(_, u) => {
                setSelectedBorrower(u)
                if (u) {
                  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim()
                  setBorrowerName(name || u.email)
                  setBorrowerId(u.id)
                } else {
                  setBorrowerName('')
                  setBorrowerId('')
                }
              }}
              onInputChange={(_, v) => setBorrowerSearch(v)}
              renderInput={(params) => (
                <TextField {...params} label="Select Borrower" fullWidth placeholder="Type name or email" />
              )}
            />
          )}

          {mode === 'borrow' && (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Due Date"
                value={dueDate}
                onChange={(newValue) => setDueDate(newValue)}
                minDate={new Date()}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
          )}

          {mode === 'borrow' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {presets.map(p => (
                  <Button
                    key={p.id}
                    size="small"
                    variant={p.isDefault ? 'contained' : 'outlined'}
                    onClick={() => applyPreset(p)}
                  >
                    {p.label}
                  </Button>
                ))}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button size="small" onClick={() => setShowManagePresets(v => !v)}>
                  {showManagePresets ? 'Hide Presets' : 'Manage Presets'}
                </Button>
              </Box>
              {showManagePresets && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
                  <Typography variant="subtitle2">Presets</Typography>
                  {presets.map(p => (
                    <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <input
                        type="radio"
                        name="defaultPreset"
                        checked={!!p.isDefault}
                        onChange={() => setDefaultPreset(p.id)}
                        aria-label={`Set ${p.label} as default`}
                      />
                      <Chip size="small" label={`${p.label}`} />
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>({p.days} days)</Typography>
                      <Box sx={{ flex: 1 }} />
                      {!p.builtin && (
                        <Button size="small" color="error" onClick={() => removePreset(p.id)}>Delete</Button>
                      )}
                    </Box>
                  ))}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      label="Label"
                      size="small"
                      value={newPresetLabel}
                      onChange={(e) => setNewPresetLabel(e.target.value)}
                      sx={{ width: 160 }}
                    />
                    <TextField
                      label="Days"
                      size="small"
                      type="number"
                      inputProps={{ min: 1 }}
                      value={newPresetDays}
                      onChange={(e) => setNewPresetDays(parseInt(e.target.value || '0', 10))}
                      sx={{ width: 120 }}
                    />
                    <Button size="small" variant="outlined" onClick={addPreset}>Add</Button>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {mode === 'return' && penalty && (
            <Alert severity="warning">
              <Typography variant="subtitle2" gutterBottom>
                Penalty Applied:
              </Typography>
              <Typography variant="body2">
                Type: {penalty.type}
              </Typography>
              <Typography variant="body2">
                Amount: ${penalty.amount}
              </Typography>
              <Typography variant="body2">
                Blacklist Duration: {penalty.blacklistDays} days
              </Typography>
              <Typography variant="body2">
                Reason: {penalty.description}
              </Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
          onClick={mode === 'borrow' ? handleBorrow : handleReturn} 
          variant="contained"
          disabled={
            loading ||
            (mode === 'borrow' && (!selectedItem || !selectedBorrower || !dueDate))
          }
        >
          {mode === 'borrow' 
            ? (approvalRequired ? 'Request Approval' : 'Borrow') 
            : 'Return'
          }
        </Button>
      </DialogActions>
    </Dialog>
  )
}
