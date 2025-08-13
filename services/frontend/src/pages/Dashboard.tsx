import { Box } from '@mui/material'
import AppHeader from '../components/AppHeader'
import UnifiedDashboard from '../components/UnifiedDashboard'

export default function Dashboard() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />
      <UnifiedDashboard />
    </Box>
  )
}