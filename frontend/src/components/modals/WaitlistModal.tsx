import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  IconButton
} from '@mui/material'
import {
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  NotificationImportant as NotificationImportantIcon,
  Remove as RemoveIcon
} from '@mui/icons-material'
import waitlistService from '../../services/waitlist'
import type { WaitlistEntry, WaitlistStatus } from '../../services/waitlist'
import authService from '../../services/auth'

interface WaitlistModalProps {
  open: boolean
  onClose: () => void
  itemId: string
  itemName: string
  availableCount: number
  mode?: 'join' | 'manage' // join = user joining waitlist, manage = staff managing waitlist
}

export default function WaitlistModal({ 
  open, 
  onClose, 
  itemId, 
  itemName, 
  availableCount, 
  mode = 'join' 
}: WaitlistModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Join waitlist form data
  const [priority, setPriority] = useState(0)
  const [notes, setNotes] = useState('')
  const [notifyWhenAvailable, setNotifyWhenAvailable] = useState(true)
  
  // Status data
  const [waitlistStatus, setWaitlistStatus] = useState<WaitlistStatus | null>(null)
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([])

  const user = authService.getUser()
  const isStaff = user?.role === 'ADMIN' || user?.role === 'STAFF'

  useEffect(() => {
    if (open) {
      fetchWaitlistStatus()
      if (mode === 'manage' && isStaff) {
        fetchWaitlistEntries()
      }
    }
  }, [open, itemId, mode, isStaff])

  const fetchWaitlistStatus = async () => {
    try {
      const status = await waitlistService.checkWaitlistStatus(itemId)
      setWaitlistStatus(status)
    } catch (err) {
      console.error('Failed to fetch waitlist status:', err)
    }
  }

  const fetchWaitlistEntries = async () => {
    if (!isStaff) return
    
    try {
      const entries = await waitlistService.getItemWaitlist(itemId)
      setWaitlistEntries(entries)
    } catch (err) {
      console.error('Failed to fetch waitlist entries:', err)
    }
  }

  const handleJoinWaitlist = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await waitlistService.addToWaitlist({
        itemId,
        priority: priority > 0 ? priority : undefined,
        notes: notes.trim() || undefined,
        notifyWhenAvailable
      })

      setSuccess('Successfully joined the waitlist!')
      await fetchWaitlistStatus()
      
      setTimeout(() => {
        setSuccess('')
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join waitlist')
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveWaitlist = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await waitlistService.removeFromWaitlist(itemId)
      setSuccess('Successfully left the waitlist!')
      await fetchWaitlistStatus()
      
      setTimeout(() => {
        setSuccess('')
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave waitlist')
    } finally {
      setLoading(false)
    }
  }

  const handleNotifyWaitlist = async () => {
    if (!isStaff) return
    
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await waitlistService.notifyWaitlist(itemId)
      setSuccess(result.message)
      await fetchWaitlistEntries()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to notify waitlist')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFromWaitlist = async (userId: string) => {
    if (!isStaff) return
    
    try {
      await waitlistService.adminAction(itemId, userId, 'remove')
      setSuccess('User removed from waitlist')
      await fetchWaitlistEntries()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user from waitlist')
    }
  }

  const renderJoinMode = () => (
    <>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Typography variant="body1" sx={{ mb: 2 }}>
          <strong>{itemName}</strong> is currently unavailable ({availableCount} available).
          Would you like to join the waitlist to be notified when it becomes available?
        </Typography>

        {waitlistStatus?.isOnWaitlist ? (
          <Box sx={{ mb: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              You are already on the waitlist for this item.
            </Alert>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Chip
                icon={<ScheduleIcon />}
                label={`Position: ${waitlistStatus.queuePosition}`}
                color={waitlistService.getQueuePositionColor(waitlistStatus.queuePosition || 0)}
              />
              
              {waitlistStatus.notified && (
                <Chip
                  icon={<NotificationsIcon />}
                  label={waitlistStatus.notificationActive ? 'Notified - Respond Soon!' : 'Notified'}
                  color={waitlistStatus.notificationActive ? 'warning' : 'default'}
                />
              )}
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You'll be notified when this item becomes available. 
              {waitlistStatus.notificationActive && ' You have been notified - please respond within 24 hours!'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {isStaff && (
              <FormControl size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as number)}
                  label="Priority"
                >
                  <MenuItem value={0}>Normal</MenuItem>
                  <MenuItem value={1}>High</MenuItem>
                  <MenuItem value={2}>Very High</MenuItem>
                  <MenuItem value={3}>Critical</MenuItem>
                </Select>
              </FormControl>
            )}

            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific requirements or notes..."
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={notifyWhenAvailable}
                  onChange={(e) => setNotifyWhenAvailable(e.target.checked)}
                />
              }
              label="Notify me when available"
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        {waitlistStatus?.isOnWaitlist ? (
          <Button
            onClick={handleLeaveWaitlist}
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Leave Waitlist'}
          </Button>
        ) : (
          <Button
            onClick={handleJoinWaitlist}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Join Waitlist'}
          </Button>
        )}
      </DialogActions>
    </>
  )

  const renderManageMode = () => (
    <>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Typography variant="body1" sx={{ mb: 2 }}>
          Managing waitlist for <strong>{itemName}</strong>
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Chip
            label={`${waitlistEntries.length} waiting`}
            color="info"
          />
          <Chip
            label={`${availableCount} available`}
            color={availableCount > 0 ? 'success' : 'error'}
          />
        </Box>

        {availableCount > 0 && waitlistEntries.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Item is available! You can notify waitlisted users.
          </Alert>
        )}

        {waitlistEntries.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No users on waitlist
          </Typography>
        ) : (
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {waitlistEntries.map((entry, index) => (
              <div key={entry.id}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">
                          {entry.user.firstName} {entry.user.lastName}
                        </Typography>
                        <Chip
                          label={`#${entry.queuePosition}`}
                          size="small"
                          color={waitlistService.getQueuePositionColor(entry.queuePosition)}
                        />
                        {entry.priority > 0 && (
                          <Chip
                            label={waitlistService.getPriorityLabel(entry.priority)}
                            size="small"
                            color={waitlistService.getPriorityColor(entry.priority)}
                          />
                        )}
                        {entry.isNotified && (
                          <Chip
                            icon={<NotificationsIcon />}
                            label={entry.notificationActive ? 'Active' : 'Notified'}
                            size="small"
                            color={entry.notificationActive ? 'warning' : 'default'}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {entry.user.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Waiting: {waitlistService.formatWaitTime(entry.createdAt)}
                          {entry.notificationActive && (
                            <span style={{ color: 'orange', marginLeft: 8 }}>
                              Expires: {waitlistService.getTimeUntilExpiration(entry)}
                            </span>
                          )}
                        </Typography>
                        {entry.notes && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Notes: {entry.notes}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveFromWaitlist(entry.userId)}
                    size="small"
                    color="error"
                  >
                    <RemoveIcon />
                  </IconButton>
                </ListItem>
                {index < waitlistEntries.length - 1 && <Divider />}
              </div>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {availableCount > 0 && waitlistEntries.length > 0 && (
          <Button
            onClick={handleNotifyWaitlist}
            variant="contained"
            startIcon={<NotificationImportantIcon />}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Notify Waitlist'}
          </Button>
        )}
      </DialogActions>
    </>
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {mode === 'join' ? 'Join Waitlist' : 'Manage Waitlist'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {mode === 'join' ? renderJoinMode() : renderManageMode()}
    </Dialog>
  )
}