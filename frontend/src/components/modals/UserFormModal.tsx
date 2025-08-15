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
  Alert,
  Chip
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import authService from '../../services/auth'
import usersService from '../../services/users'
import { useTenant } from '../../contexts/useTenant'

interface UserFormModalProps {
  open: boolean
  onClose: () => void
  onSave: () => void
  user?: User | null
  mode: 'create' | 'edit'
}

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  contactInfo?: string
  role: 'ADMIN' | 'STAFF' | 'BORROWER'
  isActive: boolean
  blacklistStatus?: {
    isBlacklisted: boolean
    until?: string
    reason?: string
  }
}

interface UserFormData {
  email: string
  password?: string
  firstName: string
  lastName: string
  contactInfo: string
  role: 'ADMIN' | 'STAFF' | 'BORROWER'
  isActive: boolean
}

export default function UserFormModal({ open, onClose, onSave, user, mode }: UserFormModalProps) {
  const { currentOrg, currentInstance } = useTenant()
  const currentUser = authService.getUser()
  
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    contactInfo: '',
    role: 'BORROWER',
    isActive: true
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (user && mode === 'edit') {
      setFormData({
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        contactInfo: user.contactInfo || '',
        role: user.role,
        isActive: user.isActive
      })
    } else {
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        contactInfo: '',
        role: 'BORROWER',
        isActive: true
      })
    }
    setErrors({})
  }, [user, mode, open])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (mode === 'create' && !formData.password) {
      newErrors.password = 'Password is required'
    }

    if (!formData.firstName) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setLoading(true)
    try {
      const payload = {
        ...formData,
        orgId: currentOrg?.id,
        instanceId: currentInstance?.id
      }

      if (mode === 'create') {
        await usersService.createUser({
          email: formData.email,
          password: formData.password!,
          firstName: formData.firstName,
          lastName: formData.lastName,
          contactInfo: formData.contactInfo,
          role: formData.role,
          orgId: currentOrg?.id || 0,
          instanceId: currentInstance?.id
        })
      } else if (user) {
        await usersService.updateUser(user.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          contactInfo: formData.contactInfo,
          role: formData.role,
          isActive: formData.isActive
        })
      }

      onSave()
      onClose()
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to save user' })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const canEditRole = currentUser?.role === 'ADMIN'
  const canDeactivate = currentUser?.role === 'ADMIN' && mode === 'edit'

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Add New User' : 'Edit User'}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {errors.submit && (
            <Alert severity="error">{errors.submit}</Alert>
          )}

          {user?.blacklistStatus?.isBlacklisted && (
            <Alert severity="warning">
              User is blacklisted until {new Date(user.blacklistStatus.until!).toLocaleDateString()}
              {user.blacklistStatus.reason && ` - Reason: ${user.blacklistStatus.reason}`}
            </Alert>
          )}

          <TextField
            name="email"
            label="Email"
            type="email"
            fullWidth
            value={formData.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email}
            disabled={mode === 'edit'}
          />

          {mode === 'create' && (
            <TextField
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                endAdornment: (
                  <Button size="small" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                )
              }}
            />
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              name="firstName"
              label="First Name"
              fullWidth
              value={formData.firstName}
              onChange={handleChange}
              error={!!errors.firstName}
              helperText={errors.firstName}
            />
            
            <TextField
              name="lastName"
              label="Last Name"
              fullWidth
              value={formData.lastName}
              onChange={handleChange}
              error={!!errors.lastName}
              helperText={errors.lastName}
            />
          </Box>

          <TextField
            name="contactInfo"
            label="Contact Info (Phone/Email)"
            fullWidth
            value={formData.contactInfo}
            onChange={handleChange}
            placeholder="+1-234-567-8900 or contact@example.com"
          />

          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              name="role"
              value={formData.role}
              onChange={handleSelectChange}
              label="Role"
              disabled={!canEditRole}
            >
              <MenuItem value="BORROWER">Borrower</MenuItem>
              <MenuItem value="STAFF">Staff</MenuItem>
              <MenuItem value="ADMIN">Admin</MenuItem>
            </Select>
          </FormControl>

          {canDeactivate && (
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                name="isActive"
                value={formData.isActive.toString()}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  isActive: e.target.value === 'true' 
                }))}
                label="Status"
              >
                <MenuItem value="true">
                  <Chip label="Active" color="success" size="small" />
                </MenuItem>
                <MenuItem value="false">
                  <Chip label="Inactive" color="error" size="small" />
                </MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}