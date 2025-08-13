import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Breadcrumbs,
  Link
} from '@mui/material'
import { Add as AddIcon, Logout as LogoutIcon, Feedback as FeedbackIcon, Settings as SettingsIcon } from '@mui/icons-material'
import { useTenant } from '../contexts/useTenant'
import authService from '../services/auth'
import organizationsService from '../services/organizations'
import FeedbackModal from './modals/FeedbackModal'
import UserPreferencesModal from './modals/UserPreferencesModal'

interface CreateOrgDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const CreateOrgDialog = ({ open, onClose, onCreated }: CreateOrgDialogProps) => {
  const [name, setName] = useState('')

  const handleCreate = async () => {
    try {
      await organizationsService.createOrganization({ name })
      setName('')
      onCreated()
      onClose()
    } catch (error: any) {
      console.error('Failed to create organization:', error)
      if (error?.statusCode === 403 || error?.error === 'Insufficient permissions') {
        alert('You do not have permission to create organizations. Only administrators can create new organizations.')
      } else if (error?.statusCode === 401) {
        alert('Your session has expired. Please log in again.')
      } else {
        alert(`Failed to create organization: ${error?.error || 'Unknown error'}`)
      }
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Organization</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Organization Name"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreate} variant="contained" disabled={!name.trim()}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}

interface CreateInstanceDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  orgId: number
}

const CreateInstanceDialog = ({ open, onClose, onCreated, orgId }: CreateInstanceDialogProps) => {
  const [name, setName] = useState('')

  const handleCreate = async () => {
    try {
      await organizationsService.createInstance(orgId, { name })
      setName('')
      onCreated()
      onClose()
    } catch (error: any) {
      console.error('Failed to create instance:', error)
      if (error?.statusCode === 403 || error?.error === 'Insufficient permissions') {
        alert('You do not have permission to create instances. Only administrators can create new instances.')
      } else if (error?.statusCode === 401) {
        alert('Your session has expired. Please log in again.')
      } else {
        alert(`Failed to create instance: ${error?.error || 'Unknown error'}`)
      }
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Instance</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Instance Name (e.g., Books, Sports Items)"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreate} variant="contained" disabled={!name.trim()}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function AppHeader() {
  const navigate = useNavigate()
  const [user, setUser] = useState(authService.getUser())
  const {
    organizations,
    instances,
    currentOrg,
    currentInstance,
    setCurrentOrg,
    setCurrentInstance,
    refreshOrganizations,
    refreshInstances
  } = useTenant()

  const [createOrgOpen, setCreateOrgOpen] = useState(false)
  const [createInstanceOpen, setCreateInstanceOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  // Update user when component mounts
  useEffect(() => {
    setUser(authService.getUser())
  }, [])

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  const handleOrgChange = (orgId: number | string) => {
    if (orgId === 'create') {
      setCreateOrgOpen(true)
    } else {
      const org = organizations.find(o => o.id === orgId)
      if (org) {
        setCurrentOrg(org)
        setCurrentInstance(null)
      }
    }
  }

  const handleInstanceChange = (instanceId: number | string) => {
    if (instanceId === 'create') {
      setCreateInstanceOpen(true)
    } else {
      const instance = instances.find(i => i.id === instanceId)
      if (instance) {
        setCurrentInstance(instance)
      }
    }
  }

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'error'
      case 'STAFF':
        return 'warning'
      case 'BORROWER':
        return 'info'
      default:
        return 'default'
    }
  }

  return (
    <>
      <AppBar position="static" sx={{ bgcolor: 'white', color: 'text.primary' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ mr: 3 }}>
            Borrowing System
          </Typography>

          <FormControl sx={{ minWidth: 200, mr: 2 }} size="small">
            <InputLabel>Organization</InputLabel>
            <Select
              value={currentOrg?.id || ''}
              onChange={(e) => handleOrgChange(e.target.value)}
              label="Organization"
            >
              {organizations.map(org => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
                </MenuItem>
              ))}
              {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
                <MenuItem value="create">
                  <AddIcon sx={{ mr: 1 }} fontSize="small" />
                  Create New
                </MenuItem>
              )}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200, mr: 2 }} size="small" disabled={!currentOrg}>
            <InputLabel>Instance</InputLabel>
            <Select
              value={currentInstance?.id || ''}
              onChange={(e) => handleInstanceChange(e.target.value)}
              label="Instance"
            >
              {instances.map(inst => (
                <MenuItem key={inst.id} value={inst.id}>
                  {inst.name}
                </MenuItem>
              ))}
              {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
                <MenuItem value="create">
                  <AddIcon sx={{ mr: 1 }} fontSize="small" />
                  Create New
                </MenuItem>
              )}
            </Select>
          </FormControl>

          {/*<Box sx={{ flexGrow: 1 }}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ ml: 2 }}>
              <Link color="inherit" href="#" underline="hover">
                Org: {currentOrg?.name || 'None'}
              </Link>
              {currentInstance && (
                <Typography color="text.primary">
                  Instance: {currentInstance.name}
                </Typography>
              )}
            </Breadcrumbs>
          </Box>*/}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
              <>
                <Button color="inherit" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </Button>
                <Button color="inherit" onClick={() => navigate('/analytics')}>
                  Analytics
                </Button>
                <Button color="inherit" onClick={() => navigate('/files')}>
                  Files
                </Button>
                {user?.role === 'ADMIN' && (
                  <Button color="inherit" onClick={() => navigate('/settings')}>
                    Settings
                  </Button>
                )}
                {user?.role === 'SUPER_ADMIN' && (
                  <Button color="inherit" onClick={() => navigate('/monitoring')}>
                    Monitoring
                  </Button>
                )}
              </>
            )}

            {/* Feedback button available to all users */}
            <Button
              color="inherit"
              startIcon={<FeedbackIcon />}
              onClick={() => setFeedbackOpen(true)}
              sx={{ ml: 1 }}
            >
              Feedback
            </Button>

            {/* User Preferences button available to all users */}
            <Button
              color="inherit"
              startIcon={<SettingsIcon />}
              onClick={() => setPreferencesOpen(true)}
            >
              Preferences
            </Button>

            {user && (
              <>
                <Typography variant="body2">
                  {user.email}
                </Typography>
                <Chip
                  label={user.role}
                  color={getRoleColor(user.role)}
                  size="small"
                />
              </>
            )}
            <IconButton onClick={handleLogout} color="inherit">
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <CreateOrgDialog
        open={createOrgOpen}
        onClose={() => setCreateOrgOpen(false)}
        onCreated={refreshOrganizations}
      />

      <CreateInstanceDialog
        open={createInstanceOpen}
        onClose={() => setCreateInstanceOpen(false)}
        onCreated={refreshInstances}
        orgId={currentOrg?.id || 0}
      />

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={() => setFeedbackOpen(false)}
      />

      <UserPreferencesModal
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
    </>
  )
}
