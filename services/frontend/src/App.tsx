import { CssBaseline } from '@mui/material'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import FileManagement from './pages/FileManagement'
import OrganizationSettings from './pages/OrganizationSettings'
import MonitoringDashboard from './pages/MonitoringDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import { TenantProvider } from './contexts/TenantContext'
import { ConfigProvider } from './contexts/ConfigContext'
import { CustomThemeProvider } from './contexts/ThemeContext'

function App() {
  return (
    <BrowserRouter>
      <TenantProvider>
        <ConfigProvider>
          <CustomThemeProvider>
            <CssBaseline />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/files"
                element={
                  <ProtectedRoute>
                    <FileManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <OrganizationSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/monitoring"
                element={
                  <ProtectedRoute>
                    <MonitoringDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </CustomThemeProvider>
        </ConfigProvider>
      </TenantProvider>
    </BrowserRouter>
  )
}

export default App
