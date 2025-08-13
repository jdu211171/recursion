import express from 'express'
import approvalWorkflowService from '../services/approvalWorkflowService'
import { authMiddleware } from '../middleware/auth'
import { tenantMiddleware } from '../middleware/tenantContext'

const router = express.Router()

// Apply auth and tenant middleware to all routes
router.use(authMiddleware)
router.use(tenantMiddleware)

// POST /api/approvals - Create new approval request
router.post('/', async (req, res) => {
  try {
    const { itemId, type, requestData } = req.body
    const userId = req.user.id
    const context = req.tenantContext

    if (!itemId || !type) {
      return res.status(400).json({
        error: 'Item ID and type are required'
      })
    }

    if (!['lending', 'extension', 'reservation'].includes(type)) {
      return res.status(400).json({
        error: 'Invalid approval type. Must be lending, extension, or reservation'
      })
    }

    const approval = await approvalWorkflowService.createApprovalRequest(userId, {
      itemId,
      type,
      requestData: requestData || {}
    }, context)

    res.status(201).json(approval)
  } catch (error) {
    console.error('Error creating approval request:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create approval request'
    })
  }
})

// GET /api/approvals - Get approval requests (with filtering)
router.get('/', async (req, res) => {
  try {
    const context = req.tenantContext
    const userRole = req.user.role
    const userId = req.user.id

    // Regular users can only see their own approval requests
    if (userRole === 'BORROWER') {
      const approvals = await approvalWorkflowService.getUserApprovalRequests(userId, context)
      return res.json(approvals)
    }

    // Admins and staff can see all approval requests with filtering
    const filters = {
      status: req.query.status as any,
      type: req.query.type as string,
      userId: req.query.userId as string,
      approverId: req.query.approverId as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    }

    const approvals = await approvalWorkflowService.getApprovalRequests(context, filters)
    res.json(approvals)
  } catch (error) {
    console.error('Error fetching approval requests:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch approval requests'
    })
  }
})

// GET /api/approvals/stats - Get approval statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    const userRole = req.user.role
    
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const context = req.tenantContext
    const stats = await approvalWorkflowService.getApprovalStats(context)
    
    res.json(stats)
  } catch (error) {
    console.error('Error fetching approval stats:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch approval statistics'
    })
  }
})

// GET /api/approvals/pending - Get only pending approvals for staff/admin
router.get('/pending', async (req, res) => {
  try {
    const userRole = req.user.role
    
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return res.status(403).json({ error: 'Staff access required' })
    }

    const context = req.tenantContext
    const pendingApprovals = await approvalWorkflowService.getApprovalRequests(context, {
      status: 'PENDING'
    })
    
    res.json(pendingApprovals)
  } catch (error) {
    console.error('Error fetching pending approvals:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch pending approvals'
    })
  }
})

// GET /api/approvals/:id - Get specific approval request
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const context = req.tenantContext
    const userId = req.user.id
    const userRole = req.user.role

    const approval = await approvalWorkflowService.getApprovalRequestById(id, context)

    // Regular users can only view their own approval requests
    if (userRole === 'BORROWER' && approval.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json(approval)
  } catch (error) {
    console.error('Error fetching approval request:', error)
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Approval request not found'
    })
  }
})

// PUT /api/approvals/:id/decision - Process approval decision (staff/admin only)
router.put('/:id/decision', async (req, res) => {
  try {
    const { id } = req.params
    const { status, approverNotes } = req.body
    const context = req.tenantContext
    const approverId = req.user.id
    const userRole = req.user.role

    // Only staff and admins can approve/reject requests
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return res.status(403).json({ error: 'Staff access required' })
    }

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        error: 'Status must be APPROVED or REJECTED'
      })
    }

    const approval = await approvalWorkflowService.processApprovalDecision(
      id,
      approverId,
      { status, approverNotes },
      context
    )

    res.json(approval)
  } catch (error) {
    console.error('Error processing approval decision:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process approval decision'
    })
  }
})

// PUT /api/approvals/:id/cancel - Cancel approval request
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params
    const context = req.tenantContext
    const userId = req.user.id
    const userRole = req.user.role
    const isAdmin = userRole === 'ADMIN' || userRole === 'STAFF'

    const approval = await approvalWorkflowService.cancelApprovalRequest(id, userId, context, isAdmin)
    
    res.json(approval)
  } catch (error) {
    console.error('Error cancelling approval request:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to cancel approval request'
    })
  }
})

// GET /api/approvals/check-required/:orgId - Check if approval is required for organization
router.get('/check-required/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params
    const context = {
      orgId: parseInt(orgId),
      instanceId: req.query.instanceId ? parseInt(req.query.instanceId as string) : undefined
    }

    const isRequired = await approvalWorkflowService.isApprovalRequired(context)
    
    res.json({ approvalRequired: isRequired })
  } catch (error) {
    console.error('Error checking approval requirement:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check approval requirement'
    })
  }
})

// GET /api/approvals/can-approve - Check if current user can approve requests
router.get('/can-approve', async (req, res) => {
  try {
    const context = req.tenantContext
    const userId = req.user.id

    const canApprove = await approvalWorkflowService.canUserApprove(userId, context)
    
    res.json({ canApprove })
  } catch (error) {
    console.error('Error checking approval permissions:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check approval permissions'
    })
  }
})

export default router