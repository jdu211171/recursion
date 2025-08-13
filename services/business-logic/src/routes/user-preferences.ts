import express, { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import userPreferenceService from '../services/userPreferenceService'
import { authMiddleware } from '../middleware/auth'
import { getTenantContext, TenantContext } from '../middleware/tenantContext'

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authMiddleware)

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string
    email: string
    role: string
    orgId: number
    instanceId?: number
  }
}

// Get current user's preferences
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const tenantContext = getTenantContext(req)
    const preferences = await userPreferenceService.getUserPreferences(
      req.user.userId,
      tenantContext
    )

    // If user has no preferences, return defaults
    if (!preferences) {
      const defaults = userPreferenceService.getDefaultPreferences()
      return res.json({
        ...defaults,
        id: null,
        userId: req.user.userId,
        createdAt: null,
        updatedAt: null
      })
    }

    res.json(preferences)
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    res.status(500).json({ error: 'Failed to fetch preferences' })
  }
})

// Update current user's preferences
router.put('/', [
  body('emailNotifications').optional().isBoolean().withMessage('Email notifications must be boolean'),
  body('smsNotifications').optional().isBoolean().withMessage('SMS notifications must be boolean'),
  body('theme').optional().isIn(['light', 'dark', 'auto']).withMessage('Theme must be light, dark, or auto'),
  body('language').optional().isLength({ min: 2, max: 5 }).withMessage('Language must be 2-5 characters'),
  body('timezone').optional().isLength({ min: 3, max: 50 }).withMessage('Timezone must be 3-50 characters'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const tenantContext = getTenantContext(req)
    const { emailNotifications, smsNotifications, theme, language, timezone, metadata } = req.body

    const preferences = await userPreferenceService.createOrUpdateUserPreferences(
      req.user.userId,
      {
        emailNotifications,
        smsNotifications,
        theme,
        language,
        timezone,
        metadata
      },
      tenantContext
    )

    res.json(preferences)
  } catch (error) {
    console.error('Error updating user preferences:', error)
    res.status(500).json({ error: 'Failed to update preferences' })
  }
})

// Update specific preference types
router.put('/notifications', [
  body('emailNotifications').isBoolean().withMessage('Email notifications must be boolean'),
  body('smsNotifications').isBoolean().withMessage('SMS notifications must be boolean')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const tenantContext = getTenantContext(req)
    const { emailNotifications, smsNotifications } = req.body

    const preferences = await userPreferenceService.updateNotificationPreferences(
      req.user.userId,
      emailNotifications,
      smsNotifications,
      tenantContext
    )

    res.json(preferences)
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    res.status(500).json({ error: 'Failed to update notification preferences' })
  }
})

router.put('/theme', [
  body('theme').isIn(['light', 'dark', 'auto']).withMessage('Theme must be light, dark, or auto')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const tenantContext = getTenantContext(req)
    const { theme } = req.body

    const preferences = await userPreferenceService.updateThemePreference(
      req.user.userId,
      theme,
      tenantContext
    )

    res.json(preferences)
  } catch (error) {
    console.error('Error updating theme preference:', error)
    res.status(500).json({ error: 'Failed to update theme preference' })
  }
})

router.put('/language', [
  body('language').isLength({ min: 2, max: 5 }).withMessage('Language must be 2-5 characters')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const tenantContext = getTenantContext(req)
    const { language } = req.body

    const preferences = await userPreferenceService.updateLanguagePreference(
      req.user.userId,
      language,
      tenantContext
    )

    res.json(preferences)
  } catch (error) {
    console.error('Error updating language preference:', error)
    res.status(500).json({ error: 'Failed to update language preference' })
  }
})

router.put('/timezone', [
  body('timezone').isLength({ min: 3, max: 50 }).withMessage('Timezone must be 3-50 characters')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const tenantContext = getTenantContext(req)
    const { timezone } = req.body

    const preferences = await userPreferenceService.updateTimezonePreference(
      req.user.userId,
      timezone,
      tenantContext
    )

    res.json(preferences)
  } catch (error) {
    console.error('Error updating timezone preference:', error)
    res.status(500).json({ error: 'Failed to update timezone preference' })
  }
})

// Get available options for dropdown menus
router.get('/options', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const options = {
      themes: userPreferenceService.getAvailableThemes(),
      languages: userPreferenceService.getAvailableLanguages(),
      timezones: userPreferenceService.getAvailableTimezones()
    }

    res.json(options)
  } catch (error) {
    console.error('Error fetching preference options:', error)
    res.status(500).json({ error: 'Failed to fetch preference options' })
  }
})

// Reset preferences to defaults
router.delete('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const tenantContext = getTenantContext(req)
    await userPreferenceService.deleteUserPreferences(req.user.userId, tenantContext)
    
    // Return default preferences
    const defaults = userPreferenceService.getDefaultPreferences()
    res.json({
      ...defaults,
      id: null,
      userId: req.user.userId,
      createdAt: null,
      updatedAt: null
    })
  } catch (error) {
    console.error('Error resetting user preferences:', error)
    res.status(500).json({ error: 'Failed to reset preferences' })
  }
})

// Check if user has custom preferences
router.get('/has-custom', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const tenantContext = getTenantContext(req)
    const hasCustom = await userPreferenceService.hasCustomPreferences(
      req.user.userId,
      tenantContext
    )

    res.json({ hasCustomPreferences: hasCustom })
  } catch (error) {
    console.error('Error checking custom preferences:', error)
    res.status(500).json({ error: 'Failed to check custom preferences' })
  }
})

export default router