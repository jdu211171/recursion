import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  TextField,
  Box,
  Typography,
  Grid,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material'
import {
  Business as BusinessIcon,
  Settings as SettingsIcon,
  Palette as PaletteIcon,
  Check as CheckIcon
} from '@mui/icons-material'
import { useConfig } from '../contexts/ConfigContext'
import { useTenant } from '../contexts/useTenant'
import organizationsService from '../services/organizations'
import configurationsService from '../services/configurations'

interface OrganizationOnboardingProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
}

const steps = [
  {
    label: 'Organization Details',
    description: 'Set up your organization profile',
    icon: <BusinessIcon />
  },
  {
    label: 'Basic Configuration',
    description: 'Configure lending policies and rules',
    icon: <SettingsIcon />
  },
  {
    label: 'Appearance & Branding',
    description: 'Customize colors and styling',
    icon: <PaletteIcon />
  }
]

export default function OrganizationOnboarding({ open, onClose, onComplete }: OrganizationOnboardingProps) {
  const { updateConfig } = useConfig()
  const { currentOrg } = useTenant()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Organization Details
  const [orgDetails, setOrgDetails] = useState({
    name: '',
    domain: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    logoUrl: ''
  })

  // Step 2: Basic Configuration
  const [basicConfig, setBasicConfig] = useState({
    lending_duration_days: 14,
    max_renewals: 2,
    late_fee_per_day: 1.0,
    max_items_per_user: 5,
    reservation_duration_days: 3,
    auto_blacklist_enabled: true,
    require_approval: false,
    max_file_size_mb: 25,
    allowed_file_types: ['pdf', 'jpg', 'png']
  })

  // Step 3: Appearance & Branding
  const [appearanceConfig, setAppearanceConfig] = useState({
    theme_primary_color: '#1976d2',
    theme_secondary_color: '#dc004e',
    custom_css: ''
  })

  // Essential feature flags to enable by default
  const essentialFeatures = [
    'AUTOMATED_REMINDERS',
    'PENALTY_WAIVERS',
    'BULK_OPERATIONS'
  ]

  useEffect(() => {
    if (currentOrg) {
      setOrgDetails({
        name: currentOrg.name,
        domain: currentOrg.domain || '',
        contactEmail: currentOrg.contactEmail || '',
        contactPhone: currentOrg.contactPhone || '',
        address: currentOrg.address || '',
        logoUrl: currentOrg.logoUrl || ''
      })
    }
  }, [currentOrg])

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }

  const handleComplete = async () => {
    if (!currentOrg) return

    setLoading(true)
    setError('')

    try {
      // Step 1: Update organization details
      await organizationsService.updateOrganization(currentOrg.id, orgDetails)

      // Step 2: Update configuration
      const fullConfig = {
        ...basicConfig,
        ...appearanceConfig,
        feature_flags: essentialFeatures.reduce((acc, feature) => {
          acc[feature] = true
          return acc
        }, {} as Record<string, boolean>),
        email_templates: {
          due_reminder: {
            name: 'Due Date Reminder',
            subject: 'Item Due Tomorrow - {{itemName}}',
            body: 'Hi {{borrowerName}},\\n\\nThis is a friendly reminder that {{itemName}} is due back tomorrow ({{dueDate}}).\\n\\nPlease return it on time to avoid late fees.\\n\\nThank you!'
          },
          overdue_notice: {
            name: 'Overdue Notice',
            subject: 'Overdue Item - {{itemName}}',
            body: 'Hi {{borrowerName}},\\n\\n{{itemName}} is now {{daysOverdue}} days overdue.\\n\\nPlease return it as soon as possible. Late fees may apply.\\n\\nThank you!'
          }
        }
      }

      await updateConfig(fullConfig)

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  const renderStep = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Tell us about your organization to customize your experience.
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Organization Name"
                  value={orgDetails.name}
                  onChange={(e) => setOrgDetails({ ...orgDetails, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Domain"
                  value={orgDetails.domain}
                  onChange={(e) => setOrgDetails({ ...orgDetails, domain: e.target.value })}
                  placeholder="example.com"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Email"
                  type="email"
                  value={orgDetails.contactEmail}
                  onChange={(e) => setOrgDetails({ ...orgDetails, contactEmail: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  value={orgDetails.contactPhone}
                  onChange={(e) => setOrgDetails({ ...orgDetails, contactPhone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  multiline
                  rows={2}
                  value={orgDetails.address}
                  onChange={(e) => setOrgDetails({ ...orgDetails, address: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Logo URL"
                  value={orgDetails.logoUrl}
                  onChange={(e) => setOrgDetails({ ...orgDetails, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </Grid>
            </Grid>
          </Box>
        )

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure your lending policies and system behavior.
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Default Lending Duration (Days)"
                  type="number"
                  value={basicConfig.lending_duration_days}
                  onChange={(e) => setBasicConfig({ ...basicConfig, lending_duration_days: parseInt(e.target.value) || 14 })}
                  inputProps={{ min: 1, max: 365 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Renewals"
                  type="number"
                  value={basicConfig.max_renewals}
                  onChange={(e) => setBasicConfig({ ...basicConfig, max_renewals: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 0, max: 10 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Late Fee Per Day ($)"
                  type="number"
                  value={basicConfig.late_fee_per_day}
                  onChange={(e) => setBasicConfig({ ...basicConfig, late_fee_per_day: parseFloat(e.target.value) || 0 })}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Items Per User"
                  type="number"
                  value={basicConfig.max_items_per_user}
                  onChange={(e) => setBasicConfig({ ...basicConfig, max_items_per_user: parseInt(e.target.value) || 5 })}
                  inputProps={{ min: 1, max: 100 }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={basicConfig.auto_blacklist_enabled}
                      onChange={(e) => setBasicConfig({ ...basicConfig, auto_blacklist_enabled: e.target.checked })}
                    />
                  }
                  label="Enable Automatic Blacklisting for Overdue Items"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={basicConfig.require_approval}
                      onChange={(e) => setBasicConfig({ ...basicConfig, require_approval: e.target.checked })}
                    />
                  }
                  label="Require Staff Approval for Borrowing"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Essential Features</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These features will be enabled by default to help you get started:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip icon={<CheckIcon />} label="Automated Reminders" color="primary" />
                <Chip icon={<CheckIcon />} label="Penalty Waivers" color="primary" />
                <Chip icon={<CheckIcon />} label="Bulk Operations" color="primary" />
              </Box>
            </Box>
          </Box>
        )

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Customize your organization's appearance and branding.
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Primary Theme Color"
                  type="color"
                  value={appearanceConfig.theme_primary_color}
                  onChange={(e) => setAppearanceConfig({ ...appearanceConfig, theme_primary_color: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Secondary Theme Color"
                  type="color"
                  value={appearanceConfig.theme_secondary_color}
                  onChange={(e) => setAppearanceConfig({ ...appearanceConfig, theme_secondary_color: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Custom CSS (Optional)"
                  multiline
                  rows={4}
                  value={appearanceConfig.custom_css}
                  onChange={(e) => setAppearanceConfig({ ...appearanceConfig, custom_css: e.target.value })}
                  placeholder="/* Add custom CSS styles here */"
                  helperText="Add custom CSS to further customize your organization's appearance"
                />
              </Grid>
              <Grid item xs={12}>
                <Card sx={{ bgcolor: 'action.hover' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Preview: Your organization's interface will use these colors for buttons, links, and accent elements.
                      The custom CSS will be applied globally across your organization's interface.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5">Welcome to Your Organization Setup</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Let's get your organization configured in a few simple steps
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                icon={step.icon}
                optional={
                  <Typography variant="caption">
                    {step.description}
                  </Typography>
                }
              >
                {step.label}
              </StepLabel>
              <StepContent>
                {renderStep(index)}
                <Box sx={{ mb: 2, mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? handleComplete : handleNext}
                    sx={{ mr: 1 }}
                    disabled={loading}
                  >
                    {index === steps.length - 1 ? 'Complete Setup' : 'Continue'}
                  </Button>
                  <Button
                    disabled={index === 0 || loading}
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                  >
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Skip Setup
        </Button>
      </DialogActions>
    </Dialog>
  )
}