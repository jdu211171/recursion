import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Language as LanguageIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material'
import userPreferencesService from '../../services/userPreferences'
import type { UserPreference, PreferenceOptions } from '../../services/userPreferences'

interface UserPreferencesModalProps {
  open: boolean
  onClose: () => void
}

export default function UserPreferencesModal({ open, onClose }: UserPreferencesModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Preference data
  const [preferences, setPreferences] = useState<UserPreference | null>(null)
  const [options, setOptions] = useState<PreferenceOptions | null>(null)
  const [hasCustom, setHasCustom] = useState(false)
  
  // Form state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [theme, setTheme] = useState('light')
  const [language, setLanguage] = useState('en')
  const [timezone, setTimezone] = useState('UTC')

  useEffect(() => {
    if (open) {
      fetchPreferences()
      fetchOptions()
      checkCustomPreferences()
    }
  }, [open])

  const fetchPreferences = async () => {
    try {
      const prefs = await userPreferencesService.getUserPreferences()
      setPreferences(prefs)
      
      // Update form state
      setEmailNotifications(prefs.emailNotifications)
      setSmsNotifications(prefs.smsNotifications)
      setTheme(prefs.theme)
      setLanguage(prefs.language)
      setTimezone(prefs.timezone)
    } catch (err) {
      console.error('Failed to fetch preferences:', err)
      setError('Failed to load preferences')
    }
  }

  const fetchOptions = async () => {
    try {
      const opts = await userPreferencesService.getPreferenceOptions()
      setOptions(opts)
    } catch (err) {
      console.error('Failed to fetch options:', err)
    }
  }

  const checkCustomPreferences = async () => {
    try {
      const custom = await userPreferencesService.hasCustomPreferences()
      setHasCustom(custom)
    } catch (err) {
      console.error('Failed to check custom preferences:', err)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const updatedPrefs = await userPreferencesService.updateUserPreferences({
        emailNotifications,
        smsNotifications,
        theme,
        language,
        timezone
      })

      setPreferences(updatedPrefs)
      setSuccess('Preferences updated successfully!')
      
      // Apply theme immediately
      userPreferencesService.applyTheme(theme)
      
      await checkCustomPreferences()

      setTimeout(() => {
        setSuccess('')
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const defaultPrefs = await userPreferencesService.resetPreferences()
      setPreferences(defaultPrefs)
      
      // Update form state with defaults
      setEmailNotifications(defaultPrefs.emailNotifications)
      setSmsNotifications(defaultPrefs.smsNotifications)
      setTheme(defaultPrefs.theme)
      setLanguage(defaultPrefs.language)
      setTimezone(defaultPrefs.timezone)
      
      // Apply default theme
      userPreferencesService.applyTheme(defaultPrefs.theme)
      
      setSuccess('Preferences reset to defaults!')
      await checkCustomPreferences()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset preferences')
    } finally {
      setLoading(false)
    }
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    // Apply theme immediately for preview
    userPreferencesService.applyTheme(newTheme)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            <Typography variant="h6">User Preferences</Typography>
            {hasCustom && (
              <Chip
                label="Customized"
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

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

        {!preferences || !options ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Notification Preferences */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <NotificationsIcon color="primary" />
                <Typography variant="h6">Notifications</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                    />
                  }
                  label="Email Notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
                  Receive notifications via email for due dates, overdue items, etc.
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={smsNotifications}
                      onChange={(e) => setSmsNotifications(e.target.checked)}
                    />
                  }
                  label="SMS Notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
                  Receive SMS notifications for urgent reminders (if supported)
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Theme Preferences */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PaletteIcon color="primary" />
                <Typography variant="h6">Appearance</Typography>
              </Box>
              
              <FormControl fullWidth sx={{ ml: 4 }}>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={theme}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  label="Theme"
                >
                  {options.themes.map((themeOption) => (
                    <MenuItem key={themeOption.value} value={themeOption.value}>
                      {themeOption.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 1 }}>
                Choose your preferred color scheme. Auto mode uses your system preference.
              </Typography>
            </Box>

            <Divider />

            {/* Language Preferences */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LanguageIcon color="primary" />
                <Typography variant="h6">Language & Region</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ml: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    label="Language"
                  >
                    {options.languages.map((langOption) => (
                      <MenuItem key={langOption.value} value={langOption.value}>
                        {langOption.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    label="Timezone"
                  >
                    {options.timezones.map((tzOption) => (
                      <MenuItem key={tzOption.value} value={tzOption.value}>
                        {tzOption.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 1 }}>
                Language affects UI text (when available). Timezone affects how dates and times are displayed.
              </Typography>
            </Box>

            <Divider />

            {/* Current Settings Display */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ScheduleIcon color="primary" />
                <Typography variant="h6">Current Settings</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, ml: 4 }}>
                <Chip
                  label={`Theme: ${userPreferencesService.getThemeDisplayName(theme)}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`Language: ${userPreferencesService.getLanguageDisplayName(language)}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`Timezone: ${userPreferencesService.getTimezoneDisplayName(timezone)}`}
                  size="small"
                  variant="outlined"
                />
              </Box>
              
              {preferences.updatedAt && (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 1 }}>
                  Last updated: {userPreferencesService.formatTimeInUserTimezone(preferences.updatedAt, timezone)}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        
        {hasCustom && (
          <Tooltip title="Reset to default preferences">
            <Button
              onClick={handleReset}
              color="warning"
              startIcon={<RefreshIcon />}
              disabled={loading}
            >
              Reset
            </Button>
          </Tooltip>
        )}
        
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} /> : 'Save Preferences'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}