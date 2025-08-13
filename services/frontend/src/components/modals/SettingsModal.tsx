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
  Divider,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material'
import { useTenant } from '../../contexts/useTenant'
import configurationsService from '../../services/configurations'
import type { OrgConfiguration } from '../../services/configurations'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

interface Settings {
  maxLendingDays: number
  latePenaltyPerDay: number
  blacklistThresholds: {
    firstOffense: number
    secondOffense: number
    thirdOffense: number
  }
  maxItemsPerUser: number
  autoBlacklist: boolean
  requireApproval: boolean
  allowExtensions: boolean
  maxExtensions: number
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { currentInstance, currentOrg } = useTenant()
  const [settings, setSettings] = useState<Settings>({
    maxLendingDays: 7,
    latePenaltyPerDay: 1,
    blacklistThresholds: {
      firstOffense: 3,
      secondOffense: 7,
      thirdOffense: 30
    },
    maxItemsPerUser: 5,
    autoBlacklist: true,
    requireApproval: false,
    allowExtensions: true,
    maxExtensions: 2
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && currentOrg) {
      fetchSettings()
    }
  }, [open, currentOrg, currentInstance])

  const fetchSettings = async () => {
    if (!currentOrg) return

    setLoading(true)
    setError(null)
    
    try {
      const config = await configurationsService.getConfiguration(
        currentOrg.id,
        currentInstance?.id
      )
      
      // Map API response to settings format
      setSettings({
        maxLendingDays: config.maxLendingDays || 7,
        latePenaltyPerDay: config.latePenaltyPerDay || 1,
        blacklistThresholds: {
          firstOffense: config.blacklistThresholdFirst || 3,
          secondOffense: config.blacklistThresholdSecond || 7,
          thirdOffense: config.blacklistThresholdThird || 30
        },
        maxItemsPerUser: config.maxItemsPerUser || 5,
        autoBlacklist: config.autoBlacklist ?? true,
        requireApproval: config.requireApproval ?? false,
        allowExtensions: config.allowExtensions ?? true,
        maxExtensions: config.maxExtensions || 2
      })
    } catch (error: any) {
      console.error('Failed to fetch settings:', error)
      setError(error.message || 'Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!currentOrg) return

    setLoading(true)
    setSaved(false)
    setError(null)
    
    try {
      // Map settings to API format
      const configData = {
        maxLendingDays: settings.maxLendingDays,
        latePenaltyPerDay: settings.latePenaltyPerDay,
        maxItemsPerUser: settings.maxItemsPerUser,
        requireApproval: settings.requireApproval,
        allowExtensions: settings.allowExtensions,
        maxExtensions: settings.maxExtensions,
        autoBlacklist: settings.autoBlacklist,
        blacklistThresholdFirst: settings.blacklistThresholds.firstOffense,
        blacklistThresholdSecond: settings.blacklistThresholds.secondOffense,
        blacklistThresholdThird: settings.blacklistThresholds.thirdOffense,
        instanceId: currentInstance?.id
      }
      
      await configurationsService.updateConfiguration(currentOrg.id, configData)
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error: any) {
      console.error('Failed to save settings:', error)
      setError(error.message || 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Tenant Settings
        <Typography variant="body2" color="text.secondary">
          {currentOrg?.name} {currentInstance && `> ${currentInstance.name}`}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {saved && (
            <Alert severity="success">
              Settings saved successfully!
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            Lending Rules
          </Typography>
          
          <TextField
            label="Max Lending Days"
            type="number"
            fullWidth
            value={settings.maxLendingDays}
            onChange={(e) => setSettings({ 
              ...settings, 
              maxLendingDays: parseInt(e.target.value) || 7 
            })}
            inputProps={{ min: 1 }}
            helperText="Maximum number of days an item can be borrowed"
          />

          <TextField
            label="Late Penalty per Day ($)"
            type="number"
            fullWidth
            value={settings.latePenaltyPerDay}
            onChange={(e) => setSettings({ 
              ...settings, 
              latePenaltyPerDay: parseFloat(e.target.value) || 0 
            })}
            inputProps={{ min: 0, step: 0.5 }}
          />

          <TextField
            label="Max Items per User"
            type="number"
            fullWidth
            value={settings.maxItemsPerUser}
            onChange={(e) => setSettings({ 
              ...settings, 
              maxItemsPerUser: parseInt(e.target.value) || 5 
            })}
            inputProps={{ min: 1 }}
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2">
            Blacklist Thresholds (days)
          </Typography>

          <Box sx={{ ml: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="1st Offense"
              type="number"
              size="small"
              value={settings.blacklistThresholds.firstOffense}
              onChange={(e) => setSettings({ 
                ...settings, 
                blacklistThresholds: {
                  ...settings.blacklistThresholds,
                  firstOffense: parseInt(e.target.value) || 3
                }
              })}
              inputProps={{ min: 0 }}
            />

            <TextField
              label="2nd Offense"
              type="number"
              size="small"
              value={settings.blacklistThresholds.secondOffense}
              onChange={(e) => setSettings({ 
                ...settings, 
                blacklistThresholds: {
                  ...settings.blacklistThresholds,
                  secondOffense: parseInt(e.target.value) || 7
                }
              })}
              inputProps={{ min: 0 }}
            />

            <TextField
              label="3rd+ Offense"
              type="number"
              size="small"
              value={settings.blacklistThresholds.thirdOffense}
              onChange={(e) => setSettings({ 
                ...settings, 
                blacklistThresholds: {
                  ...settings.blacklistThresholds,
                  thirdOffense: parseInt(e.target.value) || 30
                }
              })}
              inputProps={{ min: 0 }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2">
            Other Settings
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={settings.autoBlacklist}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  autoBlacklist: e.target.checked 
                })}
              />
            }
            label="Auto-blacklist for late returns"
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.requireApproval}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  requireApproval: e.target.checked 
                })}
              />
            }
            label="Require approval for borrowing"
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.allowExtensions}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  allowExtensions: e.target.checked 
                })}
              />
            }
            label="Allow lending extensions"
          />

          {settings.allowExtensions && (
            <TextField
              label="Max Extensions"
              type="number"
              fullWidth
              size="small"
              value={settings.maxExtensions}
              onChange={(e) => setSettings({ 
                ...settings, 
                maxExtensions: parseInt(e.target.value) || 2 
              })}
              inputProps={{ min: 0 }}
              sx={{ ml: 4 }}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={loading || !currentOrg}
        >
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  )
}