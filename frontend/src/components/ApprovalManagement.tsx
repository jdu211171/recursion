import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Stack,
  Divider,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Schedule as PendingIcon,
  Done as DoneIcon,
  Error as ErrorIcon
} from '@mui/icons-material'
import approvalsService from '../services/approvals'
import type { ApprovalWorkflow, ApprovalDecision } from '../services/approvals'
import authService from '../services/auth'
import { formatDistanceToNow } from 'date-fns'

interface ApprovalManagementProps {
  showTitle?: boolean
  maxHeight?: number
}

export default function ApprovalManagement({ showTitle = true, maxHeight }: ApprovalManagementProps) {
  const [approvals, setApprovals] = useState<ApprovalWorkflow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedApproval, setSelectedApproval] = useState<ApprovalWorkflow | null>(null)
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [decisionNotes, setDecisionNotes] = useState('')
  const [decisionType, setDecisionType] = useState<'APPROVED' | 'REJECTED'>('APPROVED')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [processing, setProcessing] = useState(false)

  const user = authService.getUser()
  const canApprove = user?.role === 'ADMIN' || user?.role === 'STAFF'

  useEffect(() => {
    if (canApprove) {
      fetchApprovals()
    }
  }, [canApprove, statusFilter])

  const fetchApprovals = async () => {
    setLoading(true)
    setError('')

    try {
      const filters = statusFilter === 'ALL' ? {} : { status: statusFilter as any }
      const data = await approvalsService.getApprovalRequests(filters)
      setApprovals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch approvals')
    } finally {
      setLoading(false)
    }
  }

  const handleProcessDecision = async () => {
    if (!selectedApproval) return

    setProcessing(true)
    try {
      await approvalsService.processApprovalDecision(selectedApproval.id, {
        status: decisionType,
        approverNotes: decisionNotes.trim() || undefined
      })
      
      setDecisionDialogOpen(false)
      setSelectedApproval(null)
      setDecisionNotes('')
      await fetchApprovals()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process decision')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusColor = (status: string) => {
    return approvalsService.getStatusColor(status)
  }

  const getTypeIcon = (type: string) => {
    return approvalsService.getTypeIcon(type)
  }

  const getTypeLabel = (type: string) => {
    return approvalsService.getTypeLabel(type)
  }

  const formatRequestData = (type: string, requestData: any) => {
    return approvalsService.formatRequestData(type, requestData)
  }

  if (!canApprove) {
    return (
      <Alert severity="warning">
        You do not have permission to manage approvals.
      </Alert>
    )
  }

  const pendingCount = approvals.filter(a => a.status === 'PENDING').length

  return (
    <Box>
      {showTitle && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h2">
            Approval Management
            {pendingCount > 0 && (
              <Chip 
                label={`${pendingCount} pending`} 
                color="warning" 
                size="small" 
                sx={{ ml: 2 }} 
              />
            )}
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchApprovals}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status Filter</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            label="Status Filter"
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="APPROVED">Approved</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
          </Select>
        </FormControl>
        
        <Typography variant="body2" color="text.secondary">
          {approvals.length} request{approvals.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      <Paper sx={{ maxHeight: maxHeight || 600, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography>Loading approvals...</Typography>
          </Box>
        ) : approvals.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No approval requests found
            </Typography>
          </Box>
        ) : (
          <List>
            {approvals.map((approval, index) => (
              <Box key={approval.id}>
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="subtitle1">
                          {getTypeIcon(approval.type)} {approval.item.name}
                        </Typography>
                        <Chip
                          label={approval.status}
                          color={getStatusColor(approval.status)}
                          size="small"
                        />
                        <Chip
                          label={getTypeLabel(approval.type)}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                          Requested by: {approval.user.firstName} {approval.user.lastName} ({approval.user.email})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Item ID: {approval.item.uniqueId} • Available: {approval.item.availableCount}
                        </Typography>
                        {formatRequestData(approval.type, approval.requestData) && (
                          <Typography variant="body2" color="text.secondary">
                            Details: {formatRequestData(approval.type, approval.requestData)}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true })}
                        </Typography>
                        {approval.approver && (
                          <Typography variant="caption" color="text.secondary">
                            {approval.status === 'APPROVED' ? 'Approved' : 'Rejected'} by: {approval.approver.firstName} {approval.approver.lastName}
                            {approval.approverNotes && (
                              <Typography component="span" sx={{ ml: 1, fontStyle: 'italic' }}>
                                "{approval.approverNotes}"
                              </Typography>
                            )}
                          </Typography>
                        )}
                      </Stack>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        edge="end"
                        onClick={() => {
                          setSelectedApproval(approval)
                          setViewDialogOpen(true)
                        }}
                        size="small"
                      >
                        <ViewIcon />
                      </IconButton>
                      {approval.status === 'PENDING' && (
                        <>
                          <IconButton
                            edge="end"
                            color="success"
                            onClick={() => {
                              setSelectedApproval(approval)
                              setDecisionType('APPROVED')
                              setDecisionDialogOpen(true)
                            }}
                            size="small"
                          >
                            <ApproveIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            color="error"
                            onClick={() => {
                              setSelectedApproval(approval)
                              setDecisionType('REJECTED')
                              setDecisionDialogOpen(true)
                            }}
                            size="small"
                          >
                            <RejectIcon />
                          </IconButton>
                        </>
                      )}
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < approvals.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </Paper>

      {/* Decision Dialog */}
      <Dialog open={decisionDialogOpen} onClose={() => setDecisionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {decisionType === 'APPROVED' ? 'Approve Request' : 'Reject Request'}
        </DialogTitle>
        <DialogContent>
          {selectedApproval && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {getTypeLabel(selectedApproval.type)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Item: {selectedApproval.item.name} ({selectedApproval.item.uniqueId})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Requested by: {selectedApproval.user.firstName} {selectedApproval.user.lastName}
              </Typography>
              {formatRequestData(selectedApproval.type, selectedApproval.requestData) && (
                <Typography variant="body2" color="text.secondary">
                  Details: {formatRequestData(selectedApproval.type, selectedApproval.requestData)}
                </Typography>
              )}
            </Box>
          )}
          <TextField
            fullWidth
            label={`${decisionType === 'APPROVED' ? 'Approval' : 'Rejection'} Notes (Optional)`}
            multiline
            rows={3}
            value={decisionNotes}
            onChange={(e) => setDecisionNotes(e.target.value)}
            placeholder={
              decisionType === 'APPROVED' 
                ? 'Add any notes about the approval...'
                : 'Please provide a reason for rejection...'
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecisionDialogOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleProcessDecision}
            variant="contained"
            color={decisionType === 'APPROVED' ? 'success' : 'error'}
            disabled={processing}
          >
            {processing ? 'Processing...' : `${decisionType === 'APPROVED' ? 'Approve' : 'Reject'}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Approval Request Details</DialogTitle>
        <DialogContent>
          {selectedApproval && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Request Information
                    </Typography>
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Type:</Typography>
                        <Typography variant="body1">{getTypeLabel(selectedApproval.type)}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Status:</Typography>
                        <Chip label={selectedApproval.status} color={getStatusColor(selectedApproval.status)} size="small" />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Created:</Typography>
                        <Typography variant="body1">
                          {new Date(selectedApproval.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                      {formatRequestData(selectedApproval.type, selectedApproval.requestData) && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">Details:</Typography>
                          <Typography variant="body1">
                            {formatRequestData(selectedApproval.type, selectedApproval.requestData)}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Item & User Information
                    </Typography>
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Item:</Typography>
                        <Typography variant="body1">{selectedApproval.item.name}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Item ID:</Typography>
                        <Typography variant="body1">{selectedApproval.item.uniqueId}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Available Count:</Typography>
                        <Typography variant="body1">{selectedApproval.item.availableCount}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Requested by:</Typography>
                        <Typography variant="body1">
                          {selectedApproval.user.firstName} {selectedApproval.user.lastName}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Email:</Typography>
                        <Typography variant="body1">{selectedApproval.user.email}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {selectedApproval.approver && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Decision Information
                      </Typography>
                      <Stack spacing={1}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {selectedApproval.status === 'APPROVED' ? 'Approved' : 'Rejected'} by:
                          </Typography>
                          <Typography variant="body1">
                            {selectedApproval.approver.firstName} {selectedApproval.approver.lastName} ({selectedApproval.approver.email})
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Decision Date:</Typography>
                          <Typography variant="body1">
                            {new Date(selectedApproval.updatedAt).toLocaleString()}
                          </Typography>
                        </Box>
                        {selectedApproval.approverNotes && (
                          <Box>
                            <Typography variant="body2" color="text.secondary">Notes:</Typography>
                            <Typography variant="body1">{selectedApproval.approverNotes}</Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}