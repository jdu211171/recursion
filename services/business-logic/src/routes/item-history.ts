import express from 'express'
import itemHistoryService from '../services/itemHistoryService'
import { authMiddleware } from '../middleware/auth'
import { tenantMiddleware } from '../middleware/tenantContext'

const router = express.Router()

// Apply auth and tenant middleware to all routes
router.use(authMiddleware)
router.use(tenantMiddleware)

// GET /api/item-history/:itemId - Get history for a specific item
router.get('/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params
    const context = req.tenantContext
    
    const filters = {
      action: req.query.action as string,
      userId: req.query.userId as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    }

    const history = await itemHistoryService.getItemHistory(itemId, context, filters)
    res.json(history)
  } catch (error) {
    console.error('Error fetching item history:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch item history'
    })
  }
})

// GET /api/item-history - Get organization-wide history (admin/staff only)
router.get('/', async (req, res) => {
  try {
    const userRole = req.user.role
    
    // Only admins and staff can view organization-wide history
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return res.status(403).json({ error: 'Admin or staff access required' })
    }

    const context = req.tenantContext
    
    const filters = {
      action: req.query.action as string,
      userId: req.query.userId as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    }

    const history = await itemHistoryService.getOrganizationHistory(context, filters)
    res.json(history)
  } catch (error) {
    console.error('Error fetching organization history:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch organization history'
    })
  }
})

// GET /api/item-history/stats/overview - Get history statistics (admin/staff only)
router.get('/stats/overview', async (req, res) => {
  try {
    const userRole = req.user.role
    
    // Only admins and staff can view statistics
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return res.status(403).json({ error: 'Admin or staff access required' })
    }

    const context = req.tenantContext
    
    let timeRange: { start: Date, end: Date } | undefined
    if (req.query.startDate && req.query.endDate) {
      timeRange = {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string)
      }
    }

    const stats = await itemHistoryService.getHistoryStats(context, timeRange)
    res.json(stats)
  } catch (error) {
    console.error('Error fetching history statistics:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch history statistics'
    })
  }
})

// POST /api/item-history/:itemId/manual - Manually add history entry (admin/staff only)
router.post('/:itemId/manual', async (req, res) => {
  try {
    const userRole = req.user.role
    
    // Only admins and staff can manually add history entries
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return res.status(403).json({ error: 'Admin or staff access required' })
    }

    const { itemId } = req.params
    const { action, changes, metadata, notes } = req.body
    const userId = req.user.id
    const context = req.tenantContext

    if (!action) {
      return res.status(400).json({ error: 'Action is required' })
    }

    const validActions = ['created', 'updated', 'borrowed', 'returned', 'deleted', 'reserved', 'cancelled', 'approved', 'rejected', 'availability_changed']
    if (!validActions.includes(action)) {
      return res.status(400).json({ 
        error: `Invalid action. Must be one of: ${validActions.join(', ')}` 
      })
    }

    const historyEntry = await itemHistoryService.createHistoryEntry({
      itemId,
      userId,
      action,
      changes: changes || undefined,
      metadata: {
        ...metadata,
        notes,
        manualEntry: true,
        addedBy: userId
      }
    }, context)

    res.status(201).json(historyEntry)
  } catch (error) {
    console.error('Error creating manual history entry:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create history entry'
    })
  }
})

// GET /api/item-history/actions/types - Get available action types
router.get('/actions/types', async (req, res) => {
  try {
    const actionTypes = [
      { value: 'created', label: 'Created', description: 'Item was created in the system' },
      { value: 'updated', label: 'Updated', description: 'Item details were modified' },
      { value: 'borrowed', label: 'Borrowed', description: 'Item was checked out to a user' },
      { value: 'returned', label: 'Returned', description: 'Item was returned by a user' },
      { value: 'reserved', label: 'Reserved', description: 'Item was reserved for future use' },
      { value: 'cancelled', label: 'Cancelled', description: 'Reservation or borrowing was cancelled' },
      { value: 'approved', label: 'Approved', description: 'Request was approved by staff' },
      { value: 'rejected', label: 'Rejected', description: 'Request was rejected by staff' },
      { value: 'availability_changed', label: 'Availability Changed', description: 'Item availability was modified' },
      { value: 'deleted', label: 'Deleted', description: 'Item was removed from the system' }
    ]

    res.json(actionTypes)
  } catch (error) {
    console.error('Error fetching action types:', error)
    res.status(500).json({
      error: 'Failed to fetch action types'
    })
  }
})

export default router