import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon
} from '@mui/icons-material'
import { useConfig } from '../contexts/ConfigContext'
import { useTenant } from '../contexts/useTenant'

interface FeatureFlag {
  key: string
  name: string
  description: string
  enabled: boolean
  category: string
  orgLevel: boolean
}

// Predefined feature flags that can be enabled/disabled
const SYSTEM_FEATURE_FLAGS: FeatureFlag[] = [
  {
    key: 'ADVANCED_SEARCH',
    name: 'Advanced Search',
    description: 'Enable advanced filtering and search capabilities',
    enabled: false,
    category: 'Search & Navigation', 
    orgLevel: true
  },
  {
    key: 'BULK_OPERATIONS',
    name: 'Bulk Operations',
    description: 'Allow bulk editing and operations on multiple items',
    enabled: false,
    category: 'Management',
    orgLevel: true
  },
  {
    key: 'AUTOMATED_REMINDERS',
    name: 'Automated Reminders',
    description: 'Send automatic email reminders for due dates',
    enabled: true,
    category: 'Notifications',
    orgLevel: true
  },
  {
    key: 'MOBILE_APP_SUPPORT',
    name: 'Mobile App Support',
    description: 'Enable mobile app API endpoints and features',
    enabled: false,
    category: 'Mobile',
    orgLevel: true
  },
  {
    key: 'WAITING_LIST',
    name: 'Waiting List',
    description: 'Enable waiting list for unavailable items',
    enabled: false,
    category: 'Lending',
    orgLevel: true
  },
  {
    key: 'PENALTY_WAIVERS',
    name: 'Penalty Waivers',
    description: 'Allow staff to waive late fees and penalties',
    enabled: true,
    category: 'Lending',
    orgLevel: false
  },
  {
    key: 'CUSTOM_BRANDING',
    name: 'Custom Branding',
    description: 'Enable custom logos, colors, and styling',
    enabled: false,
    category: 'Appearance',
    orgLevel: true
  },
  {
    key: 'ANALYTICS_EXPORT',
    name: 'Analytics Export',
    description: 'Allow exporting analytics data to Excel/PDF',
    enabled: false,
    category: 'Analytics',
    orgLevel: true
  },
  {
    key: 'AUTO_CATEGORIZATION',
    name: 'Auto Categorization',
    description: 'Automatically suggest categories for new items',
    enabled: false,
    category: 'AI/ML',
    orgLevel: true
  },
  {
    key: 'INTEGRATION_WEBHOOKS',
    name: 'Integration Webhooks',
    description: 'Enable webhooks for third-party integrations',
    enabled: false,
    category: 'Integrations',
    orgLevel: true
  }
]

export default function FeatureFlagManagement() {
  const { config, updateConfig, isFeatureEnabled } = useConfig()
  const { currentInstance } = useTenant()
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null)
  const [flagForm, setFlagForm] = useState({
    key: '',
    name: '',
    description: '',
    category: '',
    orgLevel: true
  })

  useEffect(() => {
    // Initialize flags with current config state
    const currentFlags = SYSTEM_FEATURE_FLAGS.map(flag => ({
      ...flag,
      enabled: isFeatureEnabled(flag.key)
    }))
    setFlags(currentFlags)
  }, [config, isFeatureEnabled])

  const handleToggleFlag = async (flagKey: string, enabled: boolean) => {
    try {
      const updatedFlags = { ...config?.feature_flags, [flagKey]: enabled }
      await updateConfig({ feature_flags: updatedFlags })
      
      setFlags(flags.map(flag => 
        flag.key === flagKey ? { ...flag, enabled } : flag
      ))
    } catch (error) {
      console.error('Failed to toggle feature flag:', error)
    }
  }

  const handleAddCustomFlag = async () => {
    if (!flagForm.key || !flagForm.name) return

    const newFlag: FeatureFlag = {
      key: flagForm.key.toUpperCase().replace(/\s+/g, '_'),
      name: flagForm.name,
      description: flagForm.description,
      category: flagForm.category || 'Custom',
      enabled: false,
      orgLevel: flagForm.orgLevel
    }

    // Add to flags list
    setFlags([...flags, newFlag])
    
    // Update config
    try {
      const updatedFlags = { ...config?.feature_flags, [newFlag.key]: false }
      await updateConfig({ feature_flags: updatedFlags })
    } catch (error) {
      console.error('Failed to add custom feature flag:', error)
    }

    // Reset form
    setFlagForm({
      key: '',
      name: '',
      description: '',
      category: '',
      orgLevel: true
    })
    setDialogOpen(false)
  }

  const groupedFlags = flags.reduce((acc, flag) => {
    if (!acc[flag.category]) {
      acc[flag.category] = []
    }
    acc[flag.category].push(flag)
    return acc
  }, {} as Record<string, FeatureFlag[]>)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Feature Flags</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setDialogOpen(true)}
        >
          Add Custom Flag
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Feature flags allow you to enable or disable specific functionality for your organization. 
          {currentInstance ? ' Instance-level flags override organization-level settings.' : ' These settings apply to all instances in your organization.'}
        </Typography>
      </Alert>

      {Object.entries(groupedFlags).map(([category, categoryFlags]) => (
        <Card key={category} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              {category}
              <Chip label={`${categoryFlags.length} flags`} size="small" />
            </Typography>
            
            <List dense>
              {categoryFlags.map((flag) => (
                <ListItem key={flag.key} sx={{ pl: 0 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {flag.name}
                        <Chip 
                          label={flag.orgLevel ? 'Org Level' : 'Instance Level'} 
                          size="small" 
                          variant="outlined"
                          color={flag.orgLevel ? 'primary' : 'secondary'}
                        />
                      </Box>
                    }
                    secondary={flag.description}
                  />
                  <ListItemSecondaryAction>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={flag.enabled}
                          onChange={(e) => handleToggleFlag(flag.key, e.target.checked)}
                          size="small"
                        />
                      }
                      label=""
                      sx={{ m: 0 }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      ))}

      {/* Add Custom Flag Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Custom Feature Flag</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Flag Key"
              value={flagForm.key}
              onChange={(e) => setFlagForm({ ...flagForm, key: e.target.value })}
              placeholder="MY_CUSTOM_FEATURE"
              helperText="Unique identifier (will be converted to UPPER_CASE)"
            />
            <TextField
              fullWidth
              label="Display Name"
              value={flagForm.name}
              onChange={(e) => setFlagForm({ ...flagForm, name: e.target.value })}
              placeholder="My Custom Feature"
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={flagForm.description}
              onChange={(e) => setFlagForm({ ...flagForm, description: e.target.value })}
              placeholder="Describe what this feature flag controls"
            />
            <TextField
              fullWidth
              label="Category"
              value={flagForm.category}
              onChange={(e) => setFlagForm({ ...flagForm, category: e.target.value })}
              placeholder="Custom"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={flagForm.orgLevel}
                  onChange={(e) => setFlagForm({ ...flagForm, orgLevel: e.target.checked })}
                />
              }
              label="Organization Level (applies to all instances)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddCustomFlag} variant="contained">Add Flag</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}