import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  TextField,
  Alert,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Tab,
  Tabs
} from '@mui/material'
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import usersService from '../../services/users'
import type { User } from '../../services/users'

interface BlacklistModalProps {
  open: boolean
  onClose: () => void
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  )
}

export default function BlacklistModal({ open, onClose }: BlacklistModalProps) {
  const [tabValue, setTabValue] = useState(0)
  const [blacklistedUsers, setBlacklistedUsers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Add to blacklist form
  const [selectedUserId, setSelectedUserId] = useState('')
  const [blacklistReason, setBlacklistReason] = useState('')
  const [blacklistDuration, setBlacklistDuration] = useState(7)
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, tabValue])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      if (tabValue === 0) {
        // Fetch blacklisted users
        const response = await usersService.getUsers({
          isBlacklisted: true,
          limit: 100
        })
        setBlacklistedUsers(response.users)
      } else {
        // Fetch all active users for adding to blacklist
        const response = await usersService.getUsers({
          isActive: true,
          isBlacklisted: false,
          search: searchQuery,
          limit: 100
        })
        setAllUsers(response.users)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFromBlacklist = async (userId: string) => {
    try {
      await usersService.removeFromBlacklist(userId)
      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to remove from blacklist')
    }
  }

  const handleAddToBlacklist = async () => {
    if (!selectedUserId || !blacklistReason) {
      setAddError('Please select a user and provide a reason')
      return
    }

    setAddLoading(true)
    setAddError(null)

    try {
      await usersService.blacklistUser(selectedUserId, blacklistReason, blacklistDuration)
      
      // Reset form
      setSelectedUserId('')
      setBlacklistReason('')
      setBlacklistDuration(7)
      
      // Switch to blacklisted tab and refresh
      setTabValue(0)
      await fetchData()
    } catch (err: any) {
      setAddError(err.message || 'Failed to add to blacklist')
    } finally {
      setAddLoading(false)
    }
  }

  const filteredUsers = allUsers.filter(user => 
    !searchQuery || 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Blacklist Management
          <IconButton onClick={fetchData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Blacklisted Users" />
          <Tab label="Add to Blacklist" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : blacklistedUsers.length === 0 ? (
            <Typography variant="body1" sx={{ textAlign: 'center', p: 3 }}>
              No blacklisted users found
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Until</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {blacklistedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.blacklistStatus?.reason || 'No reason provided'}</TableCell>
                      <TableCell>
                        {user.blacklistStatus?.until 
                          ? new Date(user.blacklistStatus.until).toLocaleDateString()
                          : 'Permanent'
                        }
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Remove from blacklist">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleRemoveFromBlacklist(user.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {addError && (
              <Alert severity="error" onClose={() => setAddError(null)}>
                {addError}
              </Alert>
            )}

            <TextField
              placeholder="Search users by name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Select User</InputLabel>
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                label="Select User"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {filteredUsers.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'}</span>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                        {user.email}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Reason for Blacklist"
              value={blacklistReason}
              onChange={(e) => setBlacklistReason(e.target.value)}
              multiline
              rows={3}
              fullWidth
              required
              placeholder="e.g., Repeated late returns, damaged items, policy violations..."
            />

            <FormControl fullWidth>
              <InputLabel>Duration</InputLabel>
              <Select
                value={blacklistDuration}
                onChange={(e) => setBlacklistDuration(Number(e.target.value))}
                label="Duration"
              >
                <MenuItem value={1}>1 day</MenuItem>
                <MenuItem value={3}>3 days</MenuItem>
                <MenuItem value={7}>7 days</MenuItem>
                <MenuItem value={14}>14 days</MenuItem>
                <MenuItem value={30}>30 days</MenuItem>
                <MenuItem value={90}>90 days</MenuItem>
                <MenuItem value={365}>1 year</MenuItem>
              </Select>
            </FormControl>

            {selectedUserId && (
              <Alert severity="info">
                Selected user will be blacklisted until{' '}
                {new Date(Date.now() + blacklistDuration * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </Alert>
            )}

            <Button
              variant="contained"
              color="error"
              startIcon={<AddIcon />}
              onClick={handleAddToBlacklist}
              disabled={addLoading || !selectedUserId || !blacklistReason}
              fullWidth
            >
              {addLoading ? 'Adding to Blacklist...' : 'Add to Blacklist'}
            </Button>
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}