import { PrismaClient, UserPreference } from '@prisma/client'
import { TenantContext } from '../middleware/tenantContext'

const prisma = new PrismaClient()

export interface CreateUserPreferenceData {
  emailNotifications?: boolean
  smsNotifications?: boolean
  theme?: string
  language?: string
  timezone?: string
  metadata?: any
}

export interface UpdateUserPreferenceData {
  emailNotifications?: boolean
  smsNotifications?: boolean
  theme?: string
  language?: string
  timezone?: string
  metadata?: any
}

class UserPreferenceService {
  async getUserPreferences(userId: string, context: TenantContext): Promise<UserPreference | null> {
    return await prisma.userPreference.findUnique({
      where: { userId }
    })
  }

  async createOrUpdateUserPreferences(
    userId: string, 
    data: CreateUserPreferenceData, 
    context: TenantContext
  ): Promise<UserPreference> {
    const existingPreferences = await this.getUserPreferences(userId, context)

    if (existingPreferences) {
      return await prisma.userPreference.update({
        where: { userId },
        data: {
          ...data,
          updatedAt: new Date()
        }
      })
    } else {
      return await prisma.userPreference.create({
        data: {
          userId,
          ...data
        }
      })
    }
  }

  async updateUserPreferences(
    userId: string, 
    data: UpdateUserPreferenceData, 
    context: TenantContext
  ): Promise<UserPreference> {
    return await prisma.userPreference.update({
      where: { userId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })
  }

  async deleteUserPreferences(userId: string, context: TenantContext): Promise<void> {
    await prisma.userPreference.delete({
      where: { userId }
    })
  }

  // Helper methods for common preference operations

  async updateNotificationPreferences(
    userId: string,
    emailNotifications: boolean,
    smsNotifications: boolean,
    context: TenantContext
  ): Promise<UserPreference> {
    return await this.createOrUpdateUserPreferences(userId, {
      emailNotifications,
      smsNotifications
    }, context)
  }

  async updateThemePreference(
    userId: string,
    theme: string,
    context: TenantContext
  ): Promise<UserPreference> {
    return await this.createOrUpdateUserPreferences(userId, {
      theme
    }, context)
  }

  async updateLanguagePreference(
    userId: string,
    language: string,
    context: TenantContext
  ): Promise<UserPreference> {
    return await this.createOrUpdateUserPreferences(userId, {
      language
    }, context)
  }

  async updateTimezonePreference(
    userId: string,
    timezone: string,
    context: TenantContext
  ): Promise<UserPreference> {
    return await this.createOrUpdateUserPreferences(userId, {
      timezone
    }, context)
  }

  // Get default preferences for new users
  getDefaultPreferences(): CreateUserPreferenceData {
    return {
      emailNotifications: true,
      smsNotifications: false,
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      metadata: {}
    }
  }

  // Get available theme options
  getAvailableThemes(): Array<{ value: string; label: string }> {
    return [
      { value: 'light', label: 'Light Theme' },
      { value: 'dark', label: 'Dark Theme' },
      { value: 'auto', label: 'Auto (System)' }
    ]
  }

  // Get available language options
  getAvailableLanguages(): Array<{ value: string; label: string }> {
    return [
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Spanish' },
      { value: 'fr', label: 'French' },
      { value: 'de', label: 'German' },
      { value: 'it', label: 'Italian' },
      { value: 'pt', label: 'Portuguese' },
      { value: 'ja', label: 'Japanese' },
      { value: 'ko', label: 'Korean' },
      { value: 'zh', label: 'Chinese' }
    ]
  }

  // Get available timezone options (common ones)
  getAvailableTimezones(): Array<{ value: string; label: string }> {
    return [
      { value: 'UTC', label: 'UTC' },
      { value: 'America/New_York', label: 'Eastern Time (US)' },
      { value: 'America/Chicago', label: 'Central Time (US)' },
      { value: 'America/Denver', label: 'Mountain Time (US)' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
      { value: 'Europe/London', label: 'London' },
      { value: 'Europe/Paris', label: 'Paris' },
      { value: 'Europe/Berlin', label: 'Berlin' },
      { value: 'Europe/Rome', label: 'Rome' },
      { value: 'Asia/Tokyo', label: 'Tokyo' },
      { value: 'Asia/Seoul', label: 'Seoul' },
      { value: 'Asia/Shanghai', label: 'Shanghai' },
      { value: 'Australia/Sydney', label: 'Sydney' },
      { value: 'Australia/Melbourne', label: 'Melbourne' }
    ]
  }

  // Check if user has custom preferences (not defaults)
  async hasCustomPreferences(userId: string, context: TenantContext): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId, context)
    if (!preferences) return false

    const defaults = this.getDefaultPreferences()
    
    return (
      preferences.emailNotifications !== defaults.emailNotifications ||
      preferences.smsNotifications !== defaults.smsNotifications ||
      preferences.theme !== defaults.theme ||
      preferences.language !== defaults.language ||
      preferences.timezone !== defaults.timezone ||
      (preferences.metadata && Object.keys(preferences.metadata).length > 0)
    )
  }
}

export default new UserPreferenceService()