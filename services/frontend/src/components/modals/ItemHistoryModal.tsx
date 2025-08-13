import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Collapse,
  Card,
  CardContent
} from '@mui/material'
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Add as AddIcon
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { formatDistanceToNow } from 'date-fns'
import itemHistoryService from '../../services/itemHistory'
import type { ItemHistoryEntry, ActionType } from '../../services/itemHistory'
import authService from '../../services/auth'

interface ItemHistoryModalProps {
  open: boolean
  onClose: () => void
  itemId: string
  itemName: string
}

export default function ItemHistoryModal({ open, onClose, itemId, itemName }: ItemHistoryModalProps) {
  const [history, setHistory] = useState<ItemHistoryEntry[]>([])
  const [actionTypes, setActionTypes] = useState<ActionType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Filters
  const [actionFilter, setActionFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  
  // Expanded entries
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  
  // Manual entry dialog
  const [addEntryOpen, setAddEntryOpen] = useState(false)
  const [manualEntry, setManualEntry] = useState({
    action: '',
    notes: '',
    metadata: ''
  })

  const user = authService.getUser()
  const canAddManualEntry = user?.role === 'ADMIN' || user?.role === 'STAFF'

  useEffect(() => {
    if (open && itemId) {
      fetchHistory()
      fetchActionTypes()
    }
  }, [open, itemId, actionFilter, userFilter, startDate, endDate])

  const fetchHistory = async () => {
    setLoading(true)
    setError('')

    try {
      const filters = {
        action: actionFilter || undefined,
        userId: userFilter || undefined,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        limit: 100
      }

      const data = await itemHistoryService.getItemHistory(itemId, filters)
      setHistory(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch item history')
    } finally {
      setLoading(false)
    }
  }

  const fetchActionTypes = async () => {
    try {
      const types = await itemHistoryService.getActionTypes()
      setActionTypes(types)
    } catch (err) {
      console.error('Failed to fetch action types:', err)
    }
  }

  const handleAddManualEntry = async () => {
    if (!manualEntry.action) return

    try {
      let metadata: any = {}
      if (manualEntry.metadata) {
        try {
          metadata = JSON.parse(manualEntry.metadata)
        } catch {
          metadata = { notes: manualEntry.metadata }
        }
      }
      if (manualEntry.notes) {
        metadata.notes = manualEntry.notes
      }

      await itemHistoryService.createManualHistoryEntry(itemId, {
        action: manualEntry.action,
        metadata
      })

      setAddEntryOpen(false)
      setManualEntry({ action: '', notes: '', metadata: '' })
      await fetchHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add history entry')
    }
  }

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries)
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId)
    } else {
      newExpanded.add(entryId)
    }
    setExpandedEntries(newExpanded)
  }

  const clearFilters = () => {
    setActionFilter('')
    setUserFilter('')
    setStartDate(null)
    setEndDate(null)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">
            History: {itemName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canAddManualEntry && (
              <IconButton onClick={() => setAddEntryOpen(true)} size="small">
                <AddIcon />
              </IconButton>
            )}
            <IconButton onClick={fetchHistory} size="small" disabled={loading}>
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Filters
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Action</InputLabel>
                <Select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  label="Action"
                >
                  <MenuItem value="">All</MenuItem>
                  {actionTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {itemHistoryService.getActionIcon(type.value)} {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                label="User Email"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                sx={{ minWidth: 200 }}
              />

              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      sx: { minWidth: 150 }
                    }
                  }}
                />
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      sx: { minWidth: 150 }
                    }
                  }}
                />
              </LocalizationProvider>

              <Button variant="outlined" size="small" onClick={clearFilters}>
                Clear
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* History List */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : history.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Typography color="text.secondary">
              No history entries found
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 500, overflow: 'auto' }}>
            {history.map((entry, index) => (
              <Box key={entry.id}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {itemHistoryService.getActionIcon(entry.action)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip
                          label={itemHistoryService.getActionLabel(entry.action)}
                          color={itemHistoryService.getActionColor(entry.action)}
                          size="small"
                        />
                        <Typography variant="body2" color="text.secondary">
                          by {entry.user.firstName} {entry.user.lastName} ({entry.user.email})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                        </Typography>
                        {(entry.changes || entry.metadata) && (
                          <IconButton
                            size="small"
                            onClick={() => toggleExpanded(entry.id)}
                          >
                            {expandedEntries.has(entry.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {entry.changes && (
                          <Typography variant="body2" color="text.secondary">
                            Changes: {itemHistoryService.formatChanges(entry.changes)}
                          </Typography>
                        )}
                        {entry.metadata && (
                          <Typography variant="body2" color="text.secondary">
                            {itemHistoryService.formatMetadata(entry.metadata)}
                          </Typography>
                        )}
                        
                        <Collapse in={expandedEntries.has(entry.id)}>
                          <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Full Details:
                            </Typography>
                            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify({ changes: entry.changes, metadata: entry.metadata }, null, 2)}
                            </Typography>
                          </Box>
                        </Collapse>
                      </Box>
                    }
                  />
                </ListItem>
                {index < history.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
          {history.length} entr{history.length !== 1 ? 'ies' : 'y'}
        </Typography>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Manual Entry Dialog */}
      <Dialog open={addEntryOpen} onClose={() => setAddEntryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Manual History Entry</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Action</InputLabel>
              <Select
                value={manualEntry.action}
                onChange={(e) => setManualEntry({ ...manualEntry, action: e.target.value })}
                label="Action"
              >
                {actionTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {itemHistoryService.getActionIcon(type.value)} {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={manualEntry.notes}
              onChange={(e) => setManualEntry({ ...manualEntry, notes: e.target.value })}
              placeholder="Describe what happened..."
            />

            <TextField
              fullWidth
              label="Additional Metadata (JSON)"
              multiline
              rows={2}
              value={manualEntry.metadata}
              onChange={(e) => setManualEntry({ ...manualEntry, metadata: e.target.value })}
              placeholder='{"key": "value"}'
              helperText="Optional: Add structured data as JSON"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddEntryOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddManualEntry}
            variant="contained"
            disabled={!manualEntry.action}
          >
            Add Entry
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}