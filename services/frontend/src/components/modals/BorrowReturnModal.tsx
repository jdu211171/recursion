import { useState, useEffect } from 'react'
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
import authService from '../../services/auth'
import itemsService from '../../services/items'
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
  const [selectedItem, setSelectedItem] = useState<AvailableItem | null>(null)
  const [borrowerName, setBorrowerName] = useState('')
  const [borrowerId, setBorrowerId] = useState('')
  const [dueDate, setDueDate] = useState<Date | null>(addDays(new Date(), 7))
  const [searchQuery, setSearchQuery] = useState('')
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([])
  const [penalty, setPenalty] = useState<Penalty | null>(null)
  const [loading, setLoading] = useState(false)
  const [approvalRequired, setApprovalRequired] = useState(false)

  useEffect(() => {
    if (mode === 'borrow' && item) {
      setSelectedItem(item)
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
      setApprovalRequired(config.require_approval || false)
    }
  }, [mode, config])

  const handleBorrow = async () => {
    if (!selectedItem || !borrowerName || !borrowerId || !dueDate) return

    setLoading(true)
    try {
      if (approvalRequired) {
        // Create approval request instead of direct lending
        await approvalsService.createApprovalRequest({
          itemId: selectedItem.id.toString(),
          type: 'lending',
          requestData: {
            dueDate: dueDate.toISOString(),
            notes: `Borrower: ${borrowerName} (${borrowerId})`
          }
        })
        alert('Approval request submitted successfully! Please wait for staff approval.')
      } else {
        // Direct lending (original flow)
        await lendingService.checkout({
          itemId: selectedItem.id.toString(),
          dueDate: dueDate.toISOString(),
          notes: `Borrower: ${borrowerName} (${borrowerId})`
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

          <TextField
            label="Borrower Name"
            fullWidth
            value={borrowerName}
            onChange={(e) => setBorrowerName(e.target.value)}
            disabled={mode === 'return'}
          />

          <TextField
            label="Borrower ID/Contact"
            fullWidth
            value={borrowerId}
            onChange={(e) => setBorrowerId(e.target.value)}
            disabled={mode === 'return'}
          />

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
            (mode === 'borrow' && (!selectedItem || !borrowerName || !borrowerId || !dueDate))
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