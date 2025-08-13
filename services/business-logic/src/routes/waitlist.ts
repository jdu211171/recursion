import express from 'express'
import waitlistService from '../services/waitlistService'
import { authMiddleware } from '../middleware/auth'
import { tenantMiddleware } from '../middleware/tenantContext'

const router = express.Router()

// Apply auth and tenant middleware to all routes
router.use(authMiddleware)
router.use(tenantMiddleware)

// POST /api/waitlist - Add user to waitlist for an item
router.post('/', async (req, res) => {
  try {
    const { itemId, priority, notes, notifyWhenAvailable } = req.body
    const userId = req.user.id
    const context = req.tenantContext

    if (!itemId) {
      return res.status(400).json({
        error: 'Item ID is required'
      })
    }

    const waitlistEntry = await waitlistService.addToWaitlist({
      itemId,
      userId,
      priority: priority ? parseInt(priority) : undefined,
      notes,
      notifyWhenAvailable: notifyWhenAvailable !== false
    }, context)

    res.status(201).json(waitlistEntry)
  } catch (error) {
    console.error('Error adding to waitlist:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to add to waitlist'
    })
  }
})

// DELETE /api/waitlist/:itemId - Remove user from waitlist for an item
router.delete('/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params
    const userId = req.user.id
    const context = req.tenantContext

    await waitlistService.removeFromWaitlist(itemId, userId, context)
    res.json({ message: 'Removed from waitlist successfully' })
  } catch (error) {
    console.error('Error removing from waitlist:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to remove from waitlist'
    })
  }
})

// GET /api/waitlist/item/:itemId - Get waitlist entries for a specific item (admin/staff only)
router.get('/item/:itemId', async (req, res) => {
  try {
    const userRole = req.user.role
    
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return res.status(403).json({ error: 'Admin or staff access required' })
    }

    const { itemId } = req.params
    const context = req.tenantContext
    
    const filters = {
      userId: req.query.userId as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    }

    const waitlistEntries = await waitlistService.getItemWaitlist(itemId, context, filters)
    res.json(waitlistEntries)
  } catch (error) {
    console.error('Error fetching item waitlist:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch item waitlist'
    })
  }
})

// GET /api/waitlist/user - Get current user's waitlist entries
router.get('/user', async (req, res) => {
  try {
    const userId = req.user.id
    const context = req.tenantContext
    
    const filters = {
      itemId: req.query.itemId as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    }

    const waitlistEntries = await waitlistService.getUserWaitlist(userId, context, filters)
    res.json(waitlistEntries)
  } catch (error) {
    console.error('Error fetching user waitlist:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch user waitlist'
    })
  }
})

// GET /api/waitlist/user/:userId - Get specific user's waitlist entries (admin/staff only)
router.get('/user/:userId', async (req, res) => {
  try {
    const userRole = req.user.role
    
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return res.status(403).json({ error: 'Admin or staff access required' })
    }

    const { userId } = req.params
    const context = req.tenantContext
    
    const filters = {
      itemId: req.query.itemId as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    }

    const waitlistEntries = await waitlistService.getUserWaitlist(userId, context, filters)
    res.json(waitlistEntries)
  } catch (error) {
    console.error('Error fetching user waitlist:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch user waitlist'
    })
  }
})

// POST /api/waitlist/notify/:itemId - Manually trigger notifications for item waitlist (admin/staff only)
router.post('/notify/:itemId', async (req, res) => {
  try {
    const userRole = req.user.role
    
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return res.status(403).json({ error: 'Admin or staff access required' })
    }

    const { itemId } = req.params
    const context = req.tenantContext

    const notifiedUsers = await waitlistService.notifyWaitlistWhenAvailable(itemId, context)
    
    res.json({
      message: `Notified ${notifiedUsers.length} user(s)`,
      notifiedUsers
    })
  } catch (error) {
    console.error('Error notifying waitlist:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to notify waitlist'
    })
  }
})

// GET /api/waitlist/stats - Get waitlist statistics (admin/staff only)
router.get('/stats', async (req, res) => {
  try {
    const userRole = req.user.role
    
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return res.status(403).json({ error: 'Admin or staff access required' })
    }

    const context = req.tenantContext
    const stats = await waitlistService.getWaitlistStats(context)
    
    res.json(stats)
  } catch (error) {
    console.error('Error fetching waitlist stats:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch waitlist statistics'
    })
  }
})

// PUT /api/waitlist/admin/:itemId/:userId - Admin operations on waitlist entries (admin/staff only)
router.put('/admin/:itemId/:userId', async (req, res) => {
  try {
    const userRole = req.user.role
    
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return res.status(403).json({ error: 'Admin or staff access required' })
    }

    const { itemId, userId } = req.params
    const { action } = req.body
    const context = req.tenantContext

    if (action === 'remove') {
      await waitlistService.removeFromWaitlist(itemId, userId, context)
      res.json({ message: 'User removed from waitlist' })
    } else if (action === 'notify') {
      // This could be expanded to notify specific users
      const notifiedUsers = await waitlistService.notifyWaitlistWhenAvailable(itemId, context)
      res.json({ message: 'Notification triggered', notifiedUsers })
    } else {
      res.status(400).json({ error: 'Invalid action. Must be "remove" or "notify"' })
    }
  } catch (error) {
    console.error('Error performing admin action on waitlist:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to perform admin action'
    })
  }
})

// GET /api/waitlist/check/:itemId - Check if current user is on waitlist for item
router.get('/check/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params
    const userId = req.user.id
    const context = req.tenantContext

    const waitlistEntries = await waitlistService.getUserWaitlist(userId, context, { itemId })
    const isOnWaitlist = waitlistEntries.length > 0
    const entry = isOnWaitlist ? waitlistEntries[0] : null

    res.json({
      isOnWaitlist,
      queuePosition: entry?.queuePosition || null,
      notified: entry?.isNotified || false,
      notificationActive: entry?.notificationActive || false
    })
  } catch (error) {
    console.error('Error checking waitlist status:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check waitlist status'
    })
  }
})

export default router