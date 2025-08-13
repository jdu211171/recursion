import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Collapse,
  Typography,
  Grid,
  Card,
  CardContent,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material'
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  CalendarMonth as CalendarIcon,
  Assignment as AssignmentIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  History as HistoryIcon,
  Queue as QueueIcon
} from '@mui/icons-material'
import { useTenant } from '../contexts/useTenant'
import authService from '../services/auth'
import itemsService from '../services/items'
import type { Item } from '../services/items'
import lendingService from '../services/lending'
import type { Lending } from '../services/lending'
import reservationsService from '../services/reservations'
import type { Reservation } from '../services/reservations'
import ItemFormModal from './modals/ItemFormModal'
import BorrowReturnModal from './modals/BorrowReturnModal'
import ReserveModal from './modals/ReserveModal'
import PenaltyOverrideModal from './modals/PenaltyOverrideModal'
import CSVModal from './modals/CSVModal'
import SettingsModal from './modals/SettingsModal'
import UserFormModal from './modals/UserFormModal'
import BlacklistModal from './modals/BlacklistModal'
import usersService from '../services/users'
import type { User } from '../services/users'
import ApprovalManagement from './ApprovalManagement'
import ItemHistoryModal from './modals/ItemHistoryModal'
import OrganizationHistory from './OrganizationHistory'
import WaitlistModal from './modals/WaitlistModal'

type FilterType = 'items' | 'borrowings' | 'reservations' | 'penalties' | 'users' | 'approvals' | 'history'

interface Penalty {
  id: number
  borrowingId: number
  borrowerName: string
  type: 'late' | 'lost' | 'damaged'
  amount: number
  blacklistDays: number
  description: string
  appliedDate: string
}

export default function UnifiedDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(authService.getUser())
  const { currentInstance } = useTenant()
  
  // Update user when component mounts
  useEffect(() => {
    setUser(authService.getUser())
  }, [])
  const [filterType, setFilterType] = useState<FilterType>('items')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Data states
  const [items, setItems] = useState<Item[]>([])
  const [lendings, setLendings] = useState<Lending[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [penalties, setPenalties] = useState<Penalty[]>([])
  const [users, setUsers] = useState<User[]>([])
  
  // Loading and error states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [borrowModalOpen, setBorrowModalOpen] = useState(false)
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [reserveModalOpen, setReserveModalOpen] = useState(false)
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false)
  const [waitlistMode, setWaitlistMode] = useState<'join' | 'manage'>('join')
  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [csvExportOpen, setCsvExportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create')
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false)

  // Selected items for modals
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [selectedLending, setSelectedLending] = useState<Lending | null>(null)
  const [selectedPenalty, setSelectedPenalty] = useState<Penalty | null>(null)

  // Fetch data on mount and when filters change
  useEffect(() => {
    if (currentInstance) {
      fetchData()
    }
  }, [currentInstance, filterType, searchQuery])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      switch (filterType) {
        case 'items':
          const itemsResponse = await itemsService.getItems({
            search: searchQuery,
            page: 1,
            limit: 100
          })
          setItems(itemsResponse.items)
          break

        case 'borrowings':
          const lendingsResponse = await lendingService.getLendings({
            status: 'active',
            page: 1,
            limit: 100
          })
          setLendings(lendingsResponse.lendings)
          break

        case 'reservations':
          const reservationsResponse = await reservationsService.getReservations({
            status: 'ACTIVE',
            page: 1,
            limit: 100
          })
          setReservations(reservationsResponse.reservations)
          break

        case 'penalties':
          // For now, extract penalties from lendings with penalties
          const allLendings = await lendingService.getLendings({
            page: 1,
            limit: 100
          })
          const lendingsWithPenalties = allLendings.lendings.filter(l => l.penalty && l.penalty > 0)
          setPenalties(lendingsWithPenalties.map((l, index) => ({
            id: index + 1,
            borrowingId: parseInt(l.id),
            borrowerName: `${l.user?.firstName || ''} ${l.user?.lastName || ''}`.trim() || l.user?.email || 'Unknown',
            type: 'late' as const,
            amount: l.penalty || 0,
            blacklistDays: 0, // Calculate based on penalty amount
            description: l.penaltyReason || 'Late return',
            appliedDate: l.updatedAt
          })))
          break
        
        case 'users':
          const usersResponse = await usersService.getUsers({
            search: searchQuery,
            page: 1,
            limit: 100
          })
          setUsers(usersResponse.users)
          break
      }
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.error || err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const toggleRowExpanded = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const refreshData = () => {
    fetchData()
  }

  const handleBorrowClick = (item: Item) => {
    setSelectedItem(item)
    setBorrowModalOpen(true)
  }

  const handleReturnClick = (lending: Lending) => {
    setSelectedLending(lending)
    setReturnModalOpen(true)
  }

  const handleReserveClick = (item: Item) => {
    setSelectedItem(item)
    setReserveModalOpen(true)
  }

  const handleEditClick = (item: Item) => {
    setSelectedItem(item)
    setItemModalOpen(true)
  }

  const handleHistoryClick = (item: Item) => {
    setSelectedItem(item)
    setHistoryModalOpen(true)
  }

  const handleWaitlistClick = (item: Item, mode: 'join' | 'manage' = 'join') => {
    setSelectedItem(item)
    setWaitlistMode(mode)
    setWaitlistModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
      case 'active':
      case 'returned':
        return 'success'
      case 'reserved':
      case 'pending':
        return 'warning'
      case 'borrowed':
      case 'overdue':
      case 'expired':
        return 'error'
      default:
        return 'default'
    }
  }

  const filteredData = () => {
    let data: (Item | Lending | Reservation | Penalty | User)[] = []
    switch (filterType) {
      case 'items':
        data = items
        break
      case 'borrowings':
        data = lendings
        break
      case 'reservations':
        data = reservations
        break
      case 'penalties':
        data = penalties
        break
      case 'users':
        data = users
        break
    }

    if (searchQuery) {
      return data.filter(item =>
        JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return data
  }

  const renderItemsTable = () => {
    const itemsData = filteredData() as Item[]
    return (
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Available</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {itemsData.map((item) => (
            <>
              <TableRow key={item.id} hover>
                <TableCell>
                  <IconButton size="small" onClick={() => toggleRowExpanded(item.id)}>
                    {expandedRows.has(item.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.category?.name || 'Uncategorized'}</TableCell>
                <TableCell>
                  <Chip
                    label={`${item.availableCount}/${item.totalCount}`}
                    color={item.availableCount > 0 ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.availableCount > 0 ? 'available' : 'unavailable'}
                    color={getStatusColor(item.availableCount > 0 ? 'available' : 'unavailable')}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Borrow">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleBorrowClick(item)}
                        disabled={item.availableCount === 0}
                      >
                        <AssignmentIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reserve">
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => handleReserveClick(item)}
                      >
                        <CalendarIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {item.availableCount === 0 && (
                      <Tooltip title="Join Waitlist">
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => handleWaitlistClick(item, 'join')}
                        >
                          <QueueIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
                      <Tooltip title="Manage Waitlist">
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => handleWaitlistClick(item, 'manage')}
                        >
                          <QueueIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="View History">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => handleHistoryClick(item)}
                      >
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditClick(item)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                  <Collapse in={expandedRows.has(item.id)} timeout="auto" unmountOnExit>
                    <Box sx={{ margin: 2 }}>
                      <Typography variant="h6" gutterBottom component="div">
                        Item Details
                      </Typography>
                      {item.description && (
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          <strong>Description:</strong> {item.description}
                        </Typography>
                      )}
                      {item.metadata && Object.keys(item.metadata).length > 0 && (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                            Additional Information:
                          </Typography>
                          {Object.entries(item.metadata).map(([key, value]) => (
                            <Typography key={key} variant="body2" sx={{ ml: 2 }}>
                              <strong>{key}:</strong> {String(value)}
                            </Typography>
                          ))}
                        </Box>
                      )}
                      {!item.description && !item.metadata && (
                        <Typography variant="body2" color="text.secondary">
                          No additional details available.
                        </Typography>
                      )}
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    )
  }

  const renderBorrowingsTable = () => {
    const lendingsData = filteredData() as Lending[]
    return (
    <TableContainer component={Paper} elevation={1}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Item</TableCell>
            <TableCell>Borrower</TableCell>
            <TableCell>Contact</TableCell>
            <TableCell>Borrowed</TableCell>
            <TableCell>Due</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lendingsData.map((lending) => (
            <>
              <TableRow key={lending.id} hover>
                <TableCell>
                  <IconButton size="small" onClick={() => toggleRowExpanded(lending.id)}>
                    {expandedRows.has(lending.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </TableCell>
                <TableCell>{lending.item?.name || 'Unknown Item'}</TableCell>
                <TableCell>{`${lending.user?.firstName || ''} ${lending.user?.lastName || ''}`.trim() || lending.user?.email || 'Unknown'}</TableCell>
                <TableCell>{lending.user?.email || 'No contact'}</TableCell>
                <TableCell>{new Date(lending.borrowedAt).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(lending.dueDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Chip
                    label={lending.returnedAt ? 'returned' : (new Date(lending.dueDate) < new Date() ? 'overdue' : 'active')}
                    color={getStatusColor(lending.returnedAt ? 'returned' : (new Date(lending.dueDate) < new Date() ? 'overdue' : 'active'))}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={() => handleReturnClick(lending)}
                  >
                    Return
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                  <Collapse in={expandedRows.has(lending.id)} timeout="auto" unmountOnExit>
                    <Box sx={{ margin: 2 }}>
                      <Typography variant="h6" gutterBottom component="div">
                        Borrowing Details
                      </Typography>
                      <Typography variant="body2">
                        ID: {lending.userId}
                      </Typography>
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    )
  }

  const renderUsersTable = () => {
    const usersData = filteredData() as User[]
    return (
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Instance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usersData.map((user) => (
              <>
                <TableRow key={user.id} hover>
                  <TableCell>
                    <IconButton size="small" onClick={() => toggleRowExpanded(user.id)}>
                      {expandedRows.has(user.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role} 
                      color={user.role === 'ADMIN' ? 'error' : user.role === 'STAFF' ? 'warning' : 'default'}
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>{user.organization?.name || 'N/A'}</TableCell>
                  <TableCell>{user.instance?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'error'}
                        size="small"
                      />
                      {user.blacklistStatus?.isBlacklisted && (
                        <Chip
                          label="Blacklisted"
                          color="error"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit User">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedUser(user)
                          setUserModalMode('edit')
                          setUserModalOpen(true)
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                    <Collapse in={expandedRows.has(user.id)} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 2 }}>
                        <Typography variant="h6" gutterBottom component="div">
                          User Details
                        </Typography>
                        {user.contactInfo && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Contact:</strong> {user.contactInfo}
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Created:</strong> {new Date(user.createdAt).toLocaleString()}
                        </Typography>
                        {user.lastLoginAt && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Last Login:</strong> {new Date(user.lastLoginAt).toLocaleString()}
                          </Typography>
                        )}
                        {user.blacklistStatus?.isBlacklisted && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            Blacklisted until {new Date(user.blacklistStatus.until!).toLocaleDateString()}
                            {user.blacklistStatus.reason && ` - Reason: ${user.blacklistStatus.reason}`}
                          </Alert>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  const renderContent = () => {
    switch (filterType) {
      case 'items':
        return renderItemsTable()
      case 'borrowings':
        return renderBorrowingsTable()
      case 'reservations':
        return <Typography>No reservations found</Typography>
      case 'penalties':
        return <Typography>No penalties found</Typography>
      case 'users':
        return renderUsersTable()
      case 'approvals':
        return <ApprovalManagement showTitle={false} maxHeight={600} />
      case 'history':
        return <OrganizationHistory maxHeight={600} />
      default:
        return null
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Items
              </Typography>
              <Typography variant="h4" color="primary">
                {items.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Reservations
              </Typography>
              <Typography variant="h4" color="success.main">
                {reservations.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Loans
              </Typography>
              <Typography variant="h4" color="warning.main">
                {lendings.filter(l => !l.returnedAt).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Overdue
              </Typography>
              <Typography variant="h4" color="error.main">
                {lendings.filter(l => !l.returnedAt && new Date(l.dueDate) < new Date()).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search across all data..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, minWidth: 300 }}
        />

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter</InputLabel>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            label="Filter"
          >
            <MenuItem value="items">Items</MenuItem>
            <MenuItem value="borrowings">Borrowings</MenuItem>
            <MenuItem value="reservations">Reservations</MenuItem>
            {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
              <MenuItem value="penalties">Penalties</MenuItem>
            )}
            {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
              <MenuItem value="users">Users</MenuItem>
            )}
            {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
              <MenuItem value="approvals">Approvals</MenuItem>
            )}
            {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
              <MenuItem value="history">History</MenuItem>
            )}
          </Select>
        </FormControl>

        {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
          <>
            {filterType === 'items' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedItem(null)
                  setItemModalOpen(true)
                }}
              >
                Add Item
              </Button>
            )}
            {filterType === 'users' && user?.role === 'ADMIN' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedUser(null)
                  setUserModalMode('create')
                  setUserModalOpen(true)
                }}
              >
                Add User
              </Button>
            )}
            {filterType === 'users' && (user?.role === 'ADMIN' || user?.role === 'STAFF') && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => setBlacklistModalOpen(true)}
              >
                Manage Blacklist
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setCsvImportOpen(true)}
            >
              Import CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => setCsvExportOpen(true)}
            >
              Export CSV
            </Button>
          </>
        )}

        {user?.role === 'ADMIN' && (
          <IconButton color="primary" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </IconButton>
        )}
      </Box>

      {/* Content Table */}
      {renderContent()}

      {/* Modals */}
      <ItemFormModal
        open={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false)
          setSelectedItem(null)
        }}
        item={selectedItem ? {
          id: parseInt(selectedItem.id),
          title: selectedItem.name,
          categoryId: selectedItem.categoryId ? parseInt(selectedItem.categoryId) : 1,
          categoryName: selectedItem.category?.name,
          totalCount: selectedItem.totalCount,
          availableCount: selectedItem.availableCount
        } : undefined}
        onSave={refreshData}
      />

      <BorrowReturnModal
        open={borrowModalOpen}
        onClose={() => {
          setBorrowModalOpen(false)
          setSelectedItem(null)
        }}
        mode="borrow"
        item={selectedItem ? {
          id: parseInt(selectedItem.id),
          title: selectedItem.name,
          availableCount: selectedItem.availableCount
        } : undefined}
        onComplete={refreshData}
      />

      <BorrowReturnModal
        open={returnModalOpen}
        onClose={() => {
          setReturnModalOpen(false)
          setSelectedLending(null)
        }}
        mode="return"
        borrowing={selectedLending ? {
          id: parseInt(selectedLending.id),
          itemTitle: selectedLending.item?.name || 'Unknown Item',
          borrowerName: `${selectedLending.user?.firstName || ''} ${selectedLending.user?.lastName || ''}`.trim() || selectedLending.user?.email || 'Unknown',
          borrowerId: selectedLending.userId,
          dueDate: selectedLending.dueDate
        } : undefined}
        onComplete={refreshData}
      />

      {selectedItem && (
        <ReserveModal
          open={reserveModalOpen}
          onClose={() => {
            setReserveModalOpen(false)
            setSelectedItem(null)
          }}
          item={{
            id: parseInt(selectedItem.id),
            title: selectedItem.name,
            availableCount: selectedItem.availableCount
          }}
          onComplete={refreshData}
        />
      )}

      {selectedPenalty && (
        <PenaltyOverrideModal
          open={penaltyModalOpen}
          onClose={() => {
            setPenaltyModalOpen(false)
            setSelectedPenalty(null)
          }}
          penalty={selectedPenalty}
          onComplete={refreshData}
        />
      )}

      <CSVModal
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        mode="import"
        onComplete={refreshData}
      />

      <CSVModal
        open={csvExportOpen}
        onClose={() => setCsvExportOpen(false)}
        mode="export"
        onComplete={refreshData}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <UserFormModal
        open={userModalOpen}
        onClose={() => {
          setUserModalOpen(false)
          setSelectedUser(null)
        }}
        user={selectedUser}
        mode={userModalMode}
        onSave={refreshData}
      />

      <BlacklistModal
        open={blacklistModalOpen}
        onClose={() => setBlacklistModalOpen(false)}
      />

      {selectedItem && (
        <ItemHistoryModal
          open={historyModalOpen}
          onClose={() => {
            setHistoryModalOpen(false)
            setSelectedItem(null)
          }}
          itemId={selectedItem.id}
          itemName={selectedItem.name}
        />
      )}

      {selectedItem && (
        <WaitlistModal
          open={waitlistModalOpen}
          onClose={() => {
            setWaitlistModalOpen(false)
            setSelectedItem(null)
          }}
          itemId={selectedItem.id}
          itemName={selectedItem.name}
          availableCount={selectedItem.availableCount}
          mode={waitlistMode}
        />
      )}
    </Box>
  )
}
