import express from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import feedbackService from '../services/feedbackService'
import { authMiddleware } from '../middleware/auth'
import { tenantMiddleware } from '../middleware/tenantContext'

const router = express.Router()

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/feedback-images/')
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for feedback images
    files: 3 // Max 3 images per feedback
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files are allowed for feedback attachments'))
    }
  }
})

// Apply auth and tenant middleware to all routes
router.use(authMiddleware)
router.use(tenantMiddleware)

// POST /api/feedback - Create new feedback
router.post('/', upload.array('images', 3), async (req, res) => {
  try {
    const { title, description, category, priority } = req.body
    const userId = req.user.id
    const context = req.tenantContext

    if (!title || !description) {
      return res.status(400).json({
        error: 'Title and description are required'
      })
    }

    // Process uploaded images
    const imageUrls: string[] = []
    if (req.files && Array.isArray(req.files)) {
      imageUrls.push(...req.files.map(file => `/uploads/feedback-images/${file.filename}`))
    }

    const feedback = await feedbackService.createFeedback(userId, {
      title,
      description,
      category,
      priority,
      imageUrls
    }, context)

    res.status(201).json(feedback)
  } catch (error) {
    console.error('Error creating feedback:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create feedback'
    })
  }
})

// GET /api/feedback - Get feedback (with filtering for admins)
router.get('/', async (req, res) => {
  try {
    const context = req.tenantContext
    const userRole = req.user.role
    const userId = req.user.id

    // Regular users can only see their own feedback
    if (userRole === 'BORROWER') {
      const feedback = await feedbackService.getUserFeedback(userId, context)
      return res.json(feedback)
    }

    // Admins and staff can see all feedback with filtering
    const filters = {
      status: req.query.status as any,
      category: req.query.category as string,
      priority: req.query.priority as string,
      userId: req.query.userId as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    }

    const feedback = await feedbackService.getFeedback(context, filters)
    res.json(feedback)
  } catch (error) {
    console.error('Error fetching feedback:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch feedback'
    })
  }
})

// GET /api/feedback/stats - Get feedback statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    const userRole = req.user.role
    
    if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const context = req.tenantContext
    const stats = await feedbackService.getFeedbackStats(context)
    
    res.json(stats)
  } catch (error) {
    console.error('Error fetching feedback stats:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch feedback statistics'
    })
  }
})

// GET /api/feedback/:id - Get specific feedback
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const context = req.tenantContext
    const userId = req.user.id
    const userRole = req.user.role

    const feedback = await feedbackService.getFeedbackById(id, context)

    // Regular users can only view their own feedback
    if (userRole === 'BORROWER' && feedback.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json(feedback)
  } catch (error) {
    console.error('Error fetching feedback:', error)
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Feedback not found'
    })
  }
})

// PUT /api/feedback/:id - Update feedback
router.put('/:id', upload.array('images', 3), async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, category, priority, status, devResponse } = req.body
    const context = req.tenantContext
    const userId = req.user.id
    const userRole = req.user.role

    const feedback = await feedbackService.getFeedbackById(id, context)

    // Regular users can only update their own feedback and only basic fields
    if (userRole === 'BORROWER' && feedback.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Process uploaded images
    const imageUrls: string[] = []
    if (req.files && Array.isArray(req.files)) {
      imageUrls.push(...req.files.map(file => `/uploads/feedback-images/${file.filename}`))
    }

    const updateData: any = {
      title,
      description,
      category,
      priority
    }

    if (imageUrls.length > 0) {
      updateData.imageUrls = imageUrls
    }

    // Only admins can update status and dev response
    if (userRole === 'ADMIN' || userRole === 'STAFF') {
      if (status) updateData.status = status
      if (devResponse !== undefined) updateData.devResponse = devResponse
    }

    const updatedFeedback = await feedbackService.updateFeedback(
      id,
      updateData,
      context,
      userRole === 'ADMIN' || userRole === 'STAFF'
    )

    res.json(updatedFeedback)
  } catch (error) {
    console.error('Error updating feedback:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update feedback'
    })
  }
})

// DELETE /api/feedback/:id - Delete feedback
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const context = req.tenantContext
    const userId = req.user.id
    const userRole = req.user.role

    const feedback = await feedbackService.getFeedbackById(id, context)

    // Only the feedback creator or admins can delete feedback
    if (userRole === 'BORROWER' && feedback.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    await feedbackService.deleteFeedback(id, context)
    
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting feedback:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete feedback'
    })
  }
})

// DEV-ONLY ROUTE: GET /api/feedback/dev/all - Get all feedback across all orgs (secret access)
router.get('/dev/all', async (req, res) => {
  try {
    // Check for dev secret in header or environment
    const devSecret = req.headers['x-dev-secret'] || process.env.DEV_SECRET
    const expectedSecret = process.env.DEV_ACCESS_SECRET

    if (!expectedSecret || devSecret !== expectedSecret) {
      return res.status(404).json({ error: 'Not found' })
    }

    // This bypasses tenant context to get all feedback for development review
    const allFeedback = await feedbackService.getAllFeedbackForDev()
    
    res.json(allFeedback)
  } catch (error) {
    console.error('Error fetching dev feedback:', error)
    res.status(500).json({
      error: 'Failed to fetch feedback'
    })
  }
})

export default router