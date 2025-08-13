import { useState, useEffect } from 'react'
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Card,
  CardContent,
  Stack
} from '@mui/material'
import {
  Save as SaveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Flag as FlagIcon,
  Settings as SettingsIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Policy as PolicyIcon,
  TextFields as TextFieldsIcon
} from '@mui/icons-material'
import { useTenant } from '../contexts/useTenant'
import { useConfig } from '../contexts/ConfigContext'
import organizationsService from '../services/organizations'
import configurationsService from '../services/configurations'
import FeatureFlagManagement from '../components/FeatureFlagManagement'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  )
}


interface CustomField {
  id: string
  fieldName: string
  fieldType: string
  entityType: string
  required: boolean
  options?: string[]
}

interface EmailTemplate {
  name: string
  subject: string
  body: string
}

export default function OrganizationSettings() {
  const { currentOrg, currentInstance, refreshOrganizations } = useTenant()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tabValue, setTabValue] = useState(0)

  // Organization info state
  const [orgInfo, setOrgInfo] = useState({
    name: '',
    domain: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    logoUrl: ''
  })

  // Configuration state
  const [config, setConfig] = useState({
    lending_duration_days: 14,
    max_renewals: 2,
    late_fee_per_day: 1.0,
    max_items_per_user: 5,
    reservation_duration_days: 3,
    blacklist_threshold_days: 30,
    auto_blacklist_enabled: true,
    require_approval: false,
    allowed_file_types: ['pdf', 'jpg', 'png'],
    max_file_size_mb: 25,
    email_templates: {} as Record<string, EmailTemplate>,
    theme_primary_color: '#1976d2',
    theme_secondary_color: '#dc004e',
    custom_css: ''
  })


  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [newCustomField, setNewCustomField] = useState({
    fieldName: '',
    fieldType: 'text',
    entityType: 'item',
    required: false,
    options: []
  })
  const [customFieldDialogOpen, setCustomFieldDialogOpen] = useState(false)

  // Email template dialog state
  const [emailTemplateDialogOpen, setEmailTemplateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [templateForm, setTemplateForm] = useState<EmailTemplate>({
    name: '',
    subject: '',
    body: ''
  })

  useEffect(() => {
    if (currentOrg) {
      fetchOrganizationData()
      fetchConfiguration()
    }
  }, [currentOrg, currentInstance])

  const fetchOrganizationData = async () => {
    if (!currentOrg) return

    setLoading(true)
    setError('')

    try {
      // For now, use the data from currentOrg
      setOrgInfo({
        name: currentOrg.name,
        domain: currentOrg.domain || '',
        contactEmail: currentOrg.contactEmail || '',
        contactPhone: currentOrg.contactPhone || '',
        address: currentOrg.address || '',
        logoUrl: currentOrg.logoUrl || ''
      })

      // TODO: Fetch feature flags and custom fields
      // const flags = await configurationsService.getFeatureFlags(currentOrg.id)
      // setFeatureFlags(flags)
      
      // const fields = await configurationsService.getCustomFields(currentOrg.id)
      // setCustomFields(fields)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organization data')
    } finally {
      setLoading(false)
    }
  }

  const fetchConfiguration = async () => {
    if (!currentOrg) return

    try {
      const orgConfig = await configurationsService.getConfiguration(currentOrg.id)
      setConfig({
        lending_duration_days: orgConfig.lending_duration_days || 14,
        max_renewals: orgConfig.max_renewals || 2,
        late_fee_per_day: orgConfig.late_fee_per_day || 1.0,
        max_items_per_user: orgConfig.max_items_per_user || 5,
        reservation_duration_days: orgConfig.reservation_duration_days || 3,
        blacklist_threshold_days: orgConfig.blacklist_threshold_days || 30,
        auto_blacklist_enabled: orgConfig.auto_blacklist_enabled ?? true,
        require_approval: orgConfig.require_approval ?? false,
        allowed_file_types: orgConfig.allowed_file_types || ['pdf', 'jpg', 'png'],
        max_file_size_mb: orgConfig.max_file_size_mb || 25,
        email_templates: orgConfig.email_templates || {},
        theme_primary_color: orgConfig.theme_primary_color || '#1976d2',
        theme_secondary_color: orgConfig.theme_secondary_color || '#dc004e',
        custom_css: orgConfig.custom_css || ''
      })
    } catch (err) {
      console.error('Failed to fetch configuration:', err)
    }
  }

  const saveOrganizationInfo = async () => {
    if (!currentOrg) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await organizationsService.updateOrganization(currentOrg.id, orgInfo)
      setSuccess('Organization information updated successfully')
      refreshOrganizations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update organization')
    } finally {
      setSaving(false)
    }
  }

  const saveConfiguration = async () => {
    if (!currentOrg) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await configurationsService.updateConfiguration(currentOrg.id, config)
      setSuccess('Configuration updated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration')
    } finally {
      setSaving(false)
    }
  }


  const handleAddCustomField = () => {
    // TODO: Implement custom field API
    const newField: CustomField = {
      id: Date.now().toString(),
      ...newCustomField
    }
    setCustomFields([...customFields, newField])
    setNewCustomField({
      fieldName: '',
      fieldType: 'text',
      entityType: 'item',
      required: false,
      options: []
    })
    setCustomFieldDialogOpen(false)
  }

  const handleSaveEmailTemplate = () => {
    if (!editingTemplate) return

    setConfig({
      ...config,
      email_templates: {
        ...config.email_templates,
        [editingTemplate]: templateForm
      }
    })
    setEmailTemplateDialogOpen(false)
    setEditingTemplate(null)
  }

  const emailTemplateTypes = [
    { key: 'due_reminder', label: 'Due Date Reminder' },
    { key: 'overdue_notice', label: 'Overdue Notice' },
    { key: 'reservation_confirmation', label: 'Reservation Confirmation' },
    { key: 'reservation_ready', label: 'Reservation Ready' },
    { key: 'welcome_email', label: 'Welcome Email' }
  ]

  if (!currentOrg) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">Please select an organization to manage settings</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Organization Settings
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchOrganizationData()
            fetchConfiguration()
          }}
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

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab icon={<BusinessIcon />} label="Organization Info" />
            <Tab icon={<SettingsIcon />} label="General Settings" />
            <Tab icon={<PolicyIcon />} label="Lending Policies" />
            <Tab icon={<FlagIcon />} label="Feature Flags" />
            <Tab icon={<TextFieldsIcon />} label="Custom Fields" />
            <Tab icon={<EmailIcon />} label="Email Templates" />
          </Tabs>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Organization Info Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Organization Name"
                    value={orgInfo.name}
                    onChange={(e) => setOrgInfo({ ...orgInfo, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Domain"
                    value={orgInfo.domain}
                    onChange={(e) => setOrgInfo({ ...orgInfo, domain: e.target.value })}
                    placeholder="example.com"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Contact Email"
                    type="email"
                    value={orgInfo.contactEmail}
                    onChange={(e) => setOrgInfo({ ...orgInfo, contactEmail: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Contact Phone"
                    value={orgInfo.contactPhone}
                    onChange={(e) => setOrgInfo({ ...orgInfo, contactPhone: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    multiline
                    rows={2}
                    value={orgInfo.address}
                    onChange={(e) => setOrgInfo({ ...orgInfo, address: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Logo URL"
                    value={orgInfo.logoUrl}
                    onChange={(e) => setOrgInfo({ ...orgInfo, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={saveOrganizationInfo}
                    disabled={saving}
                  >
                    Save Organization Info
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>

            {/* General Settings Tab */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max File Size (MB)"
                    type="number"
                    value={config.max_file_size_mb}
                    onChange={(e) => setConfig({ ...config, max_file_size_mb: parseInt(e.target.value) || 25 })}
                    InputProps={{
                      inputProps: { min: 1, max: 100 }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Allowed File Types"
                    value={config.allowed_file_types.join(', ')}
                    onChange={(e) => setConfig({ 
                      ...config, 
                      allowed_file_types: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    helperText="Comma-separated file extensions (e.g., pdf, jpg, png)"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Primary Theme Color"
                    type="color"
                    value={config.theme_primary_color}
                    onChange={(e) => setConfig({ ...config, theme_primary_color: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Box sx={{ width: 24, height: 24, bgcolor: config.theme_primary_color, borderRadius: 1 }} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Secondary Theme Color"
                    type="color"
                    value={config.theme_secondary_color}
                    onChange={(e) => setConfig({ ...config, theme_secondary_color: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Box sx={{ width: 24, height: 24, bgcolor: config.theme_secondary_color, borderRadius: 1 }} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Custom CSS"
                    multiline
                    rows={4}
                    value={config.custom_css}
                    onChange={(e) => setConfig({ ...config, custom_css: e.target.value })}
                    placeholder="/* Add custom CSS styles here */"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={saveConfiguration}
                    disabled={saving}
                  >
                    Save General Settings
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Lending Policies Tab */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Default Lending Duration (Days)"
                    type="number"
                    value={config.lending_duration_days}
                    onChange={(e) => setConfig({ ...config, lending_duration_days: parseInt(e.target.value) || 14 })}
                    InputProps={{
                      inputProps: { min: 1, max: 365 }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Renewals"
                    type="number"
                    value={config.max_renewals}
                    onChange={(e) => setConfig({ ...config, max_renewals: parseInt(e.target.value) || 0 })}
                    InputProps={{
                      inputProps: { min: 0, max: 10 }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Late Fee Per Day ($)"
                    type="number"
                    value={config.late_fee_per_day}
                    onChange={(e) => setConfig({ ...config, late_fee_per_day: parseFloat(e.target.value) || 0 })}
                    InputProps={{
                      inputProps: { min: 0, max: 100, step: 0.01 }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Items Per User"
                    type="number"
                    value={config.max_items_per_user}
                    onChange={(e) => setConfig({ ...config, max_items_per_user: parseInt(e.target.value) || 5 })}
                    InputProps={{
                      inputProps: { min: 1, max: 100 }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Reservation Duration (Days)"
                    type="number"
                    value={config.reservation_duration_days}
                    onChange={(e) => setConfig({ ...config, reservation_duration_days: parseInt(e.target.value) || 3 })}
                    InputProps={{
                      inputProps: { min: 1, max: 30 }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Auto-Blacklist Threshold (Days)"
                    type="number"
                    value={config.blacklist_threshold_days}
                    onChange={(e) => setConfig({ ...config, blacklist_threshold_days: parseInt(e.target.value) || 30 })}
                    InputProps={{
                      inputProps: { min: 1, max: 365 }
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.auto_blacklist_enabled}
                        onChange={(e) => setConfig({ ...config, auto_blacklist_enabled: e.target.checked })}
                      />
                    }
                    label="Enable Automatic Blacklisting"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.require_approval}
                        onChange={(e) => setConfig({ ...config, require_approval: e.target.checked })}
                      />
                    }
                    label="Require Approval for Borrowing"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={saveConfiguration}
                    disabled={saving}
                  >
                    Save Lending Policies
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Feature Flags Tab */}
            <TabPanel value={tabValue} index={3}>
              <FeatureFlagManagement />
            </TabPanel>

            {/* Custom Fields Tab */}
            <TabPanel value={tabValue} index={4}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Custom Fields</Typography>
                <Button
                  startIcon={<AddIcon />}
                  variant="contained"
                  onClick={() => setCustomFieldDialogOpen(true)}
                >
                  Add Custom Field
                </Button>
              </Box>
              
              {customFields.length === 0 ? (
                <Alert severity="info">No custom fields configured</Alert>
              ) : (
                <Grid container spacing={2}>
                  {customFields.map(field => (
                    <Grid item xs={12} md={6} key={field.id}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6">{field.fieldName}</Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Chip label={field.entityType} size="small" color="primary" />
                            <Chip label={field.fieldType} size="small" />
                            {field.required && <Chip label="Required" size="small" color="secondary" />}
                          </Stack>
                          {field.options && field.options.length > 0 && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              Options: {field.options.join(', ')}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </TabPanel>

            {/* Email Templates Tab */}
            <TabPanel value={tabValue} index={5}>
              <Typography variant="h6" sx={{ mb: 2 }}>Email Templates</Typography>
              <List>
                {emailTemplateTypes.map(template => (
                  <ListItem key={template.key}>
                    <ListItemText
                      primary={template.label}
                      secondary={
                        config.email_templates[template.key] ? 
                        `Subject: ${config.email_templates[template.key].subject}` :
                        'Not configured'
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => {
                          setEditingTemplate(template.key)
                          setTemplateForm(config.email_templates[template.key] || {
                            name: template.label,
                            subject: '',
                            body: ''
                          })
                          setEmailTemplateDialogOpen(true)
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </TabPanel>
          </>
        )}
      </Paper>


      {/* Custom Field Dialog */}
      <Dialog open={customFieldDialogOpen} onClose={() => setCustomFieldDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Custom Field</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Field Name"
              value={newCustomField.fieldName}
              onChange={(e) => setNewCustomField({ ...newCustomField, fieldName: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Field Type</InputLabel>
              <Select
                value={newCustomField.fieldType}
                onChange={(e) => setNewCustomField({ ...newCustomField, fieldType: e.target.value })}
                label="Field Type"
              >
                <MenuItem value="text">Text</MenuItem>
                <MenuItem value="number">Number</MenuItem>
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="boolean">Boolean</MenuItem>
                <MenuItem value="select">Select (Dropdown)</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Entity Type</InputLabel>
              <Select
                value={newCustomField.entityType}
                onChange={(e) => setNewCustomField({ ...newCustomField, entityType: e.target.value })}
                label="Entity Type"
              >
                <MenuItem value="item">Item</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="lending">Lending</MenuItem>
              </Select>
            </FormControl>
            {newCustomField.fieldType === 'select' && (
              <TextField
                fullWidth
                label="Options (comma-separated)"
                onChange={(e) => setNewCustomField({ 
                  ...newCustomField, 
                  options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                helperText="e.g., Option 1, Option 2, Option 3"
              />
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={newCustomField.required}
                  onChange={(e) => setNewCustomField({ ...newCustomField, required: e.target.checked })}
                />
              }
              label="Required Field"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomFieldDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddCustomField} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>

      {/* Email Template Dialog */}
      <Dialog open={emailTemplateDialogOpen} onClose={() => setEmailTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Email Template</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Subject"
              value={templateForm.subject}
              onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
            />
            <TextField
              fullWidth
              label="Email Body"
              multiline
              rows={10}
              value={templateForm.body}
              onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
              helperText="Available variables: {{borrowerName}}, {{itemName}}, {{dueDate}}, {{daysOverdue}}, etc."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailTemplateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEmailTemplate} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}