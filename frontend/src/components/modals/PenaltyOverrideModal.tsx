import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment
} from '@mui/material'
import authService from '../../services/auth'

interface PenaltyOverrideModalProps {
  open: boolean
  onClose: () => void
  penalty: {
    id: number
    type: 'late' | 'lost' | 'damaged'
    amount: number
    blacklistDays: number
    description: string
  }
  onComplete: () => void
}

export default function PenaltyOverrideModal({ 
  open, 
  onClose, 
  penalty, 
  onComplete 
}: PenaltyOverrideModalProps) {
  const [formData, setFormData] = useState({
    type: penalty?.type || 'late',
    amount: penalty?.amount || 0,
    blacklistDays: penalty?.blacklistDays || 0,
    description: penalty?.description || ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (penalty) {
      setFormData({
        type: penalty.type,
        amount: penalty.amount,
        blacklistDays: penalty.blacklistDays,
        description: penalty.description
      })
    }
  }, [penalty])

  const handleOverride = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/penalties/${penalty.id}/override`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getAccessToken()}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onComplete()
        onClose()
      }
    } catch (error) {
      console.error('Failed to override penalty:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDynamicBlacklistDays = (type: string) => {
    switch (type) {
      case 'late': {
        // Scale dynamically based on how late
        const daysLate = parseInt(formData.description.match(/\d+/)?.[0] || '1')
        return Math.min(daysLate * 3, 30)
      }
      case 'lost':
        return 30
      case 'damaged':
        return 14
      default:
        return 0
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Override Penalty
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value as typeof formData.type
                setFormData({ 
                  ...formData, 
                  type: newType,
                  blacklistDays: calculateDynamicBlacklistDays(newType)
                })
              }}
              label="Type"
            >
              <MenuItem value="late">Late Return</MenuItem>
              <MenuItem value="lost">Lost Item</MenuItem>
              <MenuItem value="damaged">Damaged Item</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Amount"
            type="number"
            fullWidth
            value={formData.amount}
            onChange={(e) => setFormData({ 
              ...formData, 
              amount: parseFloat(e.target.value) || 0 
            })}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
            inputProps={{ min: 0, step: 0.01 }}
          />

          <TextField
            label="Blacklist Days"
            type="number"
            fullWidth
            value={formData.blacklistDays}
            onChange={(e) => setFormData({ 
              ...formData, 
              blacklistDays: parseInt(e.target.value) || 0 
            })}
            inputProps={{ min: 0 }}
            helperText="Number of days the user will be blacklisted"
          />

          <Button
            variant="outlined"
            onClick={() => setFormData({ 
              ...formData, 
              blacklistDays: calculateDynamicBlacklistDays(formData.type) 
            })}
          >
            Calculate Dynamic Blacklist Days
          </Button>

          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
          onClick={handleOverride} 
          variant="contained"
          disabled={loading || !formData.description}
        >
          Apply Override
        </Button>
      </DialogActions>
    </Dialog>
  )
}