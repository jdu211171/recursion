import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Stack,
  Grid,
  Paper
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { formatDistanceToNow } from 'date-fns'
import itemHistoryService from '../services/itemHistory'
import type { ItemHistoryEntry, HistoryStats, ActionType } from '../services/itemHistory'

interface OrganizationHistoryProps {
  maxHeight?: number
}

export default function OrganizationHistory({ maxHeight = 600 }: OrganizationHistoryProps) {
  const [history, setHistory] = useState<ItemHistoryEntry[]>([])
  const [stats, setStats] = useState<HistoryStats | null>(null)
  const [actionTypes, setActionTypes] = useState<ActionType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Filters
  const [actionFilter, setActionFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [showStats, setShowStats] = useState(true)

  useEffect(() => {
    fetchHistory()
    fetchStats()
    fetchActionTypes()
  }, [actionFilter, userFilter, startDate, endDate])

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

      const data = await itemHistoryService.getOrganizationHistory(filters)
      setHistory(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organization history')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const timeRange = startDate && endDate ? {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      } : undefined

      const data = await itemHistoryService.getHistoryStats(timeRange)
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch history stats:', err)
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

  const clearFilters = () => {
    setActionFilter('')
    setUserFilter('')
    setStartDate(null)
    setEndDate(null)
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          Organization History
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchHistory}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Statistics */}
      {showStats && stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h6">{stats.totalActions}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Actions
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <InventoryIcon color="success" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h6">{stats.mostActiveItems.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Items
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon color="info" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h6">{stats.mostActiveUsers.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Users
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Top Action
                </Typography>
                {stats.actionBreakdown.length > 0 && (
                  <Chip
                    label={`${itemHistoryService.getActionLabel(stats.actionBreakdown[0].action)} (${stats.actionBreakdown[0]._count.action})`}
                    color={itemHistoryService.getActionColor(stats.actionBreakdown[0].action)}
                    size="small"
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
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
      <Paper sx={{ maxHeight: maxHeight, overflow: 'auto' }}>
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
          <List>
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
                        <Typography variant="body2" fontWeight="bold">
                          {entry.item.name} ({entry.item.uniqueId})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          by {entry.user.firstName} {entry.user.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                        </Typography>
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
                      </Box>
                    }
                  />
                </ListItem>
                {index < history.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </Paper>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {history.length} entr{history.length !== 1 ? 'ies' : 'y'} shown
        </Typography>
      </Box>
    </Box>
  )
}