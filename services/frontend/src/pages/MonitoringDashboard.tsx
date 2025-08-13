import { useState, useEffect } from 'react'
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Assessment as AssessmentIcon,
  Flag as FlagIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material'
import { useTenant } from '../contexts/useTenant'
import organizationsService from '../services/organizations'
import configurationsService from '../services/configurations'

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
      id={`monitoring-tabpanel-${index}`}
      aria-labelledby={`monitoring-tab-${index}`}
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

interface OrganizationStats {
  id: string
  name: string
  instanceCount: number
  userCount: number
  itemCount: number
  activeFeatures: string[]
  customFields: number
  lastActivity: string
  themeCustomized: boolean
}

interface FeatureUsageStats {
  featureName: string
  enabledOrgs: number
  totalOrgs: number
  usagePercentage: number
  category: string
}

export default function MonitoringDashboard() {
  const { currentUser } = useTenant()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tabValue, setTabValue] = useState(0)
  const [orgStats, setOrgStats] = useState<OrganizationStats[]>([])
  const [featureStats, setFeatureStats] = useState<FeatureUsageStats[]>([])
  const [systemStats, setSystemStats] = useState({
    totalOrganizations: 0,
    totalInstances: 0,
    totalUsers: 0,
    totalItems: 0,
    customizedOrgs: 0,
    activeFeatures: 0
  })

  useEffect(() => {
    fetchMonitoringData()
  }, [])

  const fetchMonitoringData = async () => {
    setLoading(true)
    setError('')

    try {
      // This would typically come from a dedicated monitoring endpoint
      // For now, we'll simulate the data structure
      
      // Fetch organizations
      const orgs = await organizationsService.getOrganizations()
      
      // Simulate organization statistics
      const mockOrgStats: OrganizationStats[] = orgs.map((org, index) => ({
        id: org.id,
        name: org.name,
        instanceCount: Math.floor(Math.random() * 5) + 1,
        userCount: Math.floor(Math.random() * 100) + 10,
        itemCount: Math.floor(Math.random() * 500) + 50,
        activeFeatures: [
          'AUTOMATED_REMINDERS',
          'BULK_OPERATIONS',
          ...(Math.random() > 0.5 ? ['ADVANCED_SEARCH'] : []),
          ...(Math.random() > 0.7 ? ['CUSTOM_BRANDING'] : []),
          ...(Math.random() > 0.6 ? ['WAITING_LIST'] : [])
        ],
        customFields: Math.floor(Math.random() * 8),
        lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        themeCustomized: Math.random() > 0.5
      }))

      setOrgStats(mockOrgStats)

      // Calculate feature usage statistics
      const featureUsage = new Map<string, { count: number, category: string }>()
      const featureCategories = {
        'AUTOMATED_REMINDERS': 'Notifications',
        'BULK_OPERATIONS': 'Management',
        'ADVANCED_SEARCH': 'Search & Navigation',
        'CUSTOM_BRANDING': 'Appearance',
        'WAITING_LIST': 'Lending',
        'PENALTY_WAIVERS': 'Lending',
        'MOBILE_APP_SUPPORT': 'Mobile',
        'ANALYTICS_EXPORT': 'Analytics',
        'AUTO_CATEGORIZATION': 'AI/ML',
        'INTEGRATION_WEBHOOKS': 'Integrations'
      }

      Object.keys(featureCategories).forEach(feature => {
        featureUsage.set(feature, { count: 0, category: featureCategories[feature as keyof typeof featureCategories] })
      })

      mockOrgStats.forEach(org => {
        org.activeFeatures.forEach(feature => {
          const current = featureUsage.get(feature)
          if (current) {
            featureUsage.set(feature, { ...current, count: current.count + 1 })
          }
        })
      })

      const featureStatsArray: FeatureUsageStats[] = Array.from(featureUsage.entries()).map(([feature, data]) => ({
        featureName: feature,
        enabledOrgs: data.count,
        totalOrgs: mockOrgStats.length,
        usagePercentage: Math.round((data.count / mockOrgStats.length) * 100),
        category: data.category
      }))

      setFeatureStats(featureStatsArray.sort((a, b) => b.usagePercentage - a.usagePercentage))

      // Calculate system statistics
      setSystemStats({
        totalOrganizations: mockOrgStats.length,
        totalInstances: mockOrgStats.reduce((sum, org) => sum + org.instanceCount, 0),
        totalUsers: mockOrgStats.reduce((sum, org) => sum + org.userCount, 0),
        totalItems: mockOrgStats.reduce((sum, org) => sum + org.itemCount, 0),
        customizedOrgs: mockOrgStats.filter(org => org.themeCustomized).length,
        activeFeatures: featureStatsArray.length
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  const getActivityColor = (lastActivity: string) => {
    const date = new Date(lastActivity)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays <= 1) return 'success'
    if (diffInDays <= 7) return 'warning'
    return 'error'
  }

  // Only allow super admins to access this dashboard
  if (currentUser?.role !== 'SUPER_ADMIN') {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">
          Access denied. This monitoring dashboard is only available to super administrators.
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          System Monitoring Dashboard
        </Typography>
        <IconButton onClick={fetchMonitoringData} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* System Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BusinessIcon color="primary" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  {systemStats.totalOrganizations}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Organizations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AssessmentIcon color="secondary" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  {systemStats.totalInstances}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Instances
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="success" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  {systemStats.totalUsers.toLocaleString()}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <FlagIcon color="info" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  {systemStats.totalItems.toLocaleString()}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Items
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" color="primary">
                  {systemStats.customizedOrgs}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Customized Orgs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" color="secondary">
                  {systemStats.activeFeatures}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Active Features
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Organizations" />
            <Tab label="Feature Usage" />
          </Tabs>
        </Box>

        {/* Organizations Tab */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Organization</TableCell>
                  <TableCell align="center">Instances</TableCell>
                  <TableCell align="center">Users</TableCell>
                  <TableCell align="center">Items</TableCell>
                  <TableCell>Active Features</TableCell>
                  <TableCell align="center">Custom Fields</TableCell>
                  <TableCell>Last Activity</TableCell>
                  <TableCell align="center">Customized</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orgStats.map((org) => (
                  <TableRow key={org.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {org.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{org.instanceCount}</TableCell>
                    <TableCell align="center">{org.userCount}</TableCell>
                    <TableCell align="center">{org.itemCount}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {org.activeFeatures.slice(0, 3).map((feature) => (
                          <Chip key={feature} label={feature.replace('_', ' ')} size="small" />
                        ))}
                        {org.activeFeatures.length > 3 && (
                          <Chip label={`+${org.activeFeatures.length - 3}`} size="small" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">{org.customFields}</TableCell>
                    <TableCell>
                      <Chip 
                        label={formatDate(org.lastActivity)} 
                        size="small" 
                        color={getActivityColor(org.lastActivity)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {org.themeCustomized ? (
                        <Chip label="Yes" size="small" color="primary" />
                      ) : (
                        <Chip label="No" size="small" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Feature Usage Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" sx={{ mb: 2 }}>Feature Adoption Across Organizations</Typography>
          <List>
            {featureStats.map((feature) => (
              <ListItem key={feature.featureName}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1">
                        {feature.featureName.replace(/_/g, ' ')}
                      </Typography>
                      <Chip label={feature.category} size="small" variant="outlined" />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          {feature.enabledOrgs} of {feature.totalOrgs} organizations
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {feature.usagePercentage}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={feature.usagePercentage} 
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Feature usage statistics">
                    <IconButton edge="end">
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </TabPanel>
      </Paper>
    </Container>
  )
}