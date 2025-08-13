import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Grid
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import reservationsService from '../../services/reservations'

interface ReserveModalProps {
  open: boolean
  onClose: () => void
  item: {
    id: number
    title: string
    availableCount: number
  }
  onComplete: () => void
}

export default function ReserveModal({ open, onClose, item, onComplete }: ReserveModalProps) {
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [availability, setAvailability] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  const checkAvailability = async () => {
    if (!startDate || !endDate) return

    try {
      const data = await reservationsService.checkItemAvailability(
        item.id.toString(),
        startDate.toISOString()
      )
      // Check if available count is greater than 0
      setAvailability(data.availableCount > 0)
    } catch (error) {
      console.error('Failed to check availability:', error)
    }
  }

  const handleReserve = async () => {
    if (!startDate || !endDate) return

    setLoading(true)
    try {
      await reservationsService.createReservation({
        itemId: item.id.toString(),
        reservedFor: startDate.toISOString(),
        expiresAt: endDate.toISOString()
      })
      onComplete()
      onClose()
    } catch (error) {
      console.error('Failed to create reservation:', error)
      alert('Failed to create reservation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Reserve Item: {item.title}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Alert severity="info">
            Current availability: {item.availableCount} items
          </Alert>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => {
                    setStartDate(newValue)
                    setAvailability(null)
                  }}
                  minDate={new Date()}
                  slotProps={{
                    textField: {
                      fullWidth: true
                    }
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => {
                    setEndDate(newValue)
                    setAvailability(null)
                  }}
                  minDate={startDate || new Date()}
                  slotProps={{
                    textField: {
                      fullWidth: true
                    }
                  }}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>

          {startDate && endDate && (
            <Button onClick={checkAvailability} variant="outlined">
              Check Availability
            </Button>
          )}

          {availability !== null && (
            <Alert severity={availability ? 'success' : 'error'}>
              {availability 
                ? 'Item is available for the selected dates'
                : 'Item is not available for the selected dates'
              }
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary">
            * Reservations will expire if not claimed within 24 hours of the start date
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
          onClick={handleReserve} 
          variant="contained"
          disabled={
            loading ||
            !startDate || 
            !endDate || 
            availability === false ||
            availability === null
          }
        >
          Reserve
        </Button>
      </DialogActions>
    </Dialog>
  )
}