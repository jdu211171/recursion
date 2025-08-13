import { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
  Button,
  TextField
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Download as DownloadIcon
} from '@mui/icons-material'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { useTenant } from '../contexts/useTenant'
import lendingService from '../services/lending'
import itemsService from '../services/items'
import type { Lending } from '../services/lending'
import type { Item } from '../services/items'

interface LendingStats {
  totalLendings: number
  activeLendings: number
  overdueLendings: number
  returnedOnTime: number
  avgLendingDuration: number
}

interface PopularItem {
  itemId: string
  itemName: string
  borrowCount: number
  category: string
}

interface TimeSeriesData {
  date: string
  borrowed: number
  returned: number
  overdue: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function Analytics() {
  const { currentInstance } = useTenant()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [startDate, setStartDate] = useState<Date | null>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  const [endDate, setEndDate] = useState<Date | null>(new Date())
  
  // Data states
  const [stats, setStats] = useState<LendingStats>({
    totalLendings: 0,
    activeLendings: 0,
    overdueLendings: 0,
    returnedOnTime: 0,
    avgLendingDuration: 0
  })
  const [popularItems, setPopularItems] = useState<PopularItem[]>([])
  const [overdueItems, setOverdueItems] = useState<Lending[]>([])
  const [categoryDistribution, setCategoryDistribution] = useState<any[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])

  useEffect(() => {
    if (currentInstance) {
      fetchAnalytics()
    }
  }, [currentInstance, dateRange, startDate, endDate])

  const fetchAnalytics = async () => {
    if (!currentInstance) return

    setLoading(true)
    setError(null)

    try {
      // Fetch all lendings for the date range
      const lendingsResponse = await lendingService.getLendings({
        page: 1,
        limit: 1000 // Get all for analytics
      })
      
      const allLendings = lendingsResponse.lendings
      
      // Calculate statistics
      const now = new Date()
      const activeLendings = allLendings.filter(l => !l.returnedAt)
      const overdueLendings = activeLendings.filter(l => new Date(l.dueDate) < now)
      const completedLendings = allLendings.filter(l => l.returnedAt)
      const onTimeLendings = completedLendings.filter(l => 
        l.returnedAt && new Date(l.returnedAt) <= new Date(l.dueDate)
      )

      // Calculate average lending duration
      const durations = completedLendings.map(l => {
        if (l.returnedAt) {
          return (new Date(l.returnedAt).getTime() - new Date(l.borrowedAt).getTime()) / (1000 * 60 * 60 * 24)
        }
        return 0
      }).filter(d => d > 0)
      
      const avgDuration = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0

      setStats({
        totalLendings: allLendings.length,
        activeLendings: activeLendings.length,
        overdueLendings: overdueLendings.length,
        returnedOnTime: onTimeLendings.length,
        avgLendingDuration: Math.round(avgDuration * 10) / 10
      })

      setOverdueItems(overdueLendings.slice(0, 10)) // Top 10 overdue

      // Calculate popular items
      const itemBorrowCounts: Record<string, { count: number; name: string; category: string }> = {}
      allLendings.forEach(lending => {
        const itemId = lending.item?.id || 'unknown'
        if (!itemBorrowCounts[itemId]) {
          itemBorrowCounts[itemId] = {
            count: 0,
            name: lending.item?.name || 'Unknown',
            category: lending.item?.category?.name || 'Uncategorized'
          }
        }
        itemBorrowCounts[itemId].count++
      })

      const popularItemsData = Object.entries(itemBorrowCounts)
        .map(([itemId, data]) => ({
          itemId,
          itemName: data.name,
          borrowCount: data.count,
          category: data.category
        }))
        .sort((a, b) => b.borrowCount - a.borrowCount)
        .slice(0, 10)

      setPopularItems(popularItemsData)

      // Calculate category distribution
      const categoryStats: Record<string, number> = {}
      allLendings.forEach(lending => {
        const category = lending.item?.category?.name || 'Uncategorized'
        categoryStats[category] = (categoryStats[category] || 0) + 1
      })

      const categoryData = Object.entries(categoryStats)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

      setCategoryDistribution(categoryData)

      // Generate time series data
      generateTimeSeriesData(allLendings)

    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics data')
    } finally {
      setLoading(false)
    }
  }

  const generateTimeSeriesData = (lendings: Lending[]) => {
    const now = new Date()
    const dataPoints: Record<string, TimeSeriesData> = {}
    
    // Initialize data points for the last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      dataPoints[dateStr] = {
        date: dateStr,
        borrowed: 0,
        returned: 0,
        overdue: 0
      }
    }

    // Count lendings by date
    lendings.forEach(lending => {
      const borrowedDate = new Date(lending.borrowedAt).toISOString().split('T')[0]
      if (dataPoints[borrowedDate]) {
        dataPoints[borrowedDate].borrowed++
      }

      if (lending.returnedAt) {
        const returnedDate = new Date(lending.returnedAt).toISOString().split('T')[0]
        if (dataPoints[returnedDate]) {
          dataPoints[returnedDate].returned++
        }
      }

      // Count overdue on each day
      const dueDate = new Date(lending.dueDate)
      if (!lending.returnedAt && dueDate < now) {
        const overdueSince = new Date(dueDate)
        while (overdueSince <= now) {
          const dateStr = overdueSince.toISOString().split('T')[0]
          if (dataPoints[dateStr]) {
            dataPoints[dateStr].overdue++
          }
          overdueSince.setDate(overdueSince.getDate() + 1)
        }
      }
    })

    setTimeSeriesData(Object.values(dataPoints))
  }

  const handleExportReport = async () => {
    // TODO: Implement export functionality
    console.log('Export report')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'overdue': return 'error'
      case 'returned': return 'default'
      default: return 'default'
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Analytics Dashboard
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportReport}
        >
          Export Report
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Date Range Selector */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            label="Period"
          >
            <MenuItem value="week">Last Week</MenuItem>
            <MenuItem value="month">Last Month</MenuItem>
            <MenuItem value="quarter">Last Quarter</MenuItem>
            <MenuItem value="year">Last Year</MenuItem>
          </Select>
        </FormControl>
        
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(newValue) => setStartDate(newValue)}
            slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
            slotProps={{ textField: { size: 'small' } }}
          />
        </LocalizationProvider>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Total Lendings
                      </Typography>
                      <Typography variant="h4">
                        {stats.totalLendings}
                      </Typography>
                    </Box>
                    <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Active Loans
                      </Typography>
                      <Typography variant="h4" color="warning.main">
                        {stats.activeLendings}
                      </Typography>
                    </Box>
                    <ScheduleIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Overdue
                      </Typography>
                      <Typography variant="h4" color="error.main">
                        {stats.overdueLendings}
                      </Typography>
                    </Box>
                    <WarningIcon sx={{ fontSize: 40, color: 'error.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Avg Duration
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {stats.avgLendingDuration}d
                      </Typography>
                    </Box>
                    <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts Row */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Lending Trends */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Lending Trends
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="borrowed" stroke="#8884d8" name="Borrowed" />
                    <Line type="monotone" dataKey="returned" stroke="#82ca9d" name="Returned" />
                    <Line type="monotone" dataKey="overdue" stroke="#ff7300" name="Overdue" />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Category Distribution */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Category Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* Tables Row */}
          <Grid container spacing={3}>
            {/* Popular Items */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Most Popular Items
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell align="right">Times Borrowed</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {popularItems.map((item, index) => (
                        <TableRow key={item.itemId}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {index < 3 && (
                                <Chip
                                  label={`#${index + 1}`}
                                  size="small"
                                  color={index === 0 ? 'primary' : 'default'}
                                />
                              )}
                              {item.itemName}
                            </Box>
                          </TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              {item.borrowCount}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Overdue Items */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Overdue Items
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Borrower</TableCell>
                        <TableCell>Days Overdue</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {overdueItems.map((lending) => {
                        const daysOverdue = Math.floor(
                          (new Date().getTime() - new Date(lending.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                        )
                        return (
                          <TableRow key={lending.id}>
                            <TableCell>{lending.item?.name || 'Unknown'}</TableCell>
                            <TableCell>
                              {lending.user?.email || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${daysOverdue} days`}
                                size="small"
                                color="error"
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {overdueItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            <Typography color="text.secondary">
                              No overdue items
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  )
}