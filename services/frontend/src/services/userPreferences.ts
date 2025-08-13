import apiClient from './api'

// User preference types and interfaces
export interface UserPreference {
  id: string | null
  userId: string
  emailNotifications: boolean
  smsNotifications: boolean
  theme: string
  language: string
  timezone: string
  metadata?: any
  createdAt: string | null
  updatedAt: string | null
}

export interface UpdateUserPreferenceData {
  emailNotifications?: boolean
  smsNotifications?: boolean
  theme?: string
  language?: string
  timezone?: string
  metadata?: any
}

export interface PreferenceOptions {
  themes: Array<{ value: string; label: string }>
  languages: Array<{ value: string; label: string }>
  timezones: Array<{ value: string; label: string }>
}

class UserPreferencesService {
  // Get current user's preferences
  async getUserPreferences(): Promise<UserPreference> {
    const response = await apiClient.get('/api/user-preferences')
    return response.data
  }

  // Update user preferences (full update)
  async updateUserPreferences(data: UpdateUserPreferenceData): Promise<UserPreference> {
    const response = await apiClient.put('/api/user-preferences', data)
    return response.data
  }

  // Update notification preferences specifically
  async updateNotificationPreferences(
    emailNotifications: boolean,
    smsNotifications: boolean
  ): Promise<UserPreference> {
    const response = await apiClient.put('/api/user-preferences/notifications', {
      emailNotifications,
      smsNotifications
    })
    return response.data
  }

  // Update theme preference
  async updateTheme(theme: string): Promise<UserPreference> {
    const response = await apiClient.put('/api/user-preferences/theme', { theme })
    return response.data
  }

  // Update language preference
  async updateLanguage(language: string): Promise<UserPreference> {
    const response = await apiClient.put('/api/user-preferences/language', { language })
    return response.data
  }

  // Update timezone preference
  async updateTimezone(timezone: string): Promise<UserPreference> {
    const response = await apiClient.put('/api/user-preferences/timezone', { timezone })
    return response.data
  }

  // Get available options for dropdowns
  async getPreferenceOptions(): Promise<PreferenceOptions> {
    const response = await apiClient.get('/api/user-preferences/options')
    return response.data
  }

  // Reset preferences to defaults
  async resetPreferences(): Promise<UserPreference> {
    const response = await apiClient.delete('/api/user-preferences')
    return response.data
  }

  // Check if user has custom preferences
  async hasCustomPreferences(): Promise<boolean> {
    const response = await apiClient.get('/api/user-preferences/has-custom')
    return response.data.hasCustomPreferences
  }

  // Helper methods for UI
  getThemeDisplayName(theme: string): string {
    switch (theme) {
      case 'light':
        return 'Light Theme'
      case 'dark':
        return 'Dark Theme'
      case 'auto':
        return 'Auto (System)'
      default:
        return theme
    }
  }

  getLanguageDisplayName(language: string): string {
    const languages: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese'
    }
    return languages[language] || language
  }

  getTimezoneDisplayName(timezone: string): string {
    const timezones: Record<string, string> = {
      'UTC': 'UTC',
      'America/New_York': 'Eastern Time (US)',
      'America/Chicago': 'Central Time (US)',
      'America/Denver': 'Mountain Time (US)',
      'America/Los_Angeles': 'Pacific Time (US)',
      'Europe/London': 'London',
      'Europe/Paris': 'Paris',
      'Europe/Berlin': 'Berlin',
      'Europe/Rome': 'Rome',
      'Asia/Tokyo': 'Tokyo',
      'Asia/Seoul': 'Seoul',
      'Asia/Shanghai': 'Shanghai',
      'Australia/Sydney': 'Sydney',
      'Australia/Melbourne': 'Melbourne'
    }
    return timezones[timezone] || timezone
  }

  // Apply theme to the application
  applyTheme(theme: string): void {
    if (theme === 'auto') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }

    // Store for CSS access
    document.documentElement.style.setProperty('--user-theme', theme)
  }

  // Format time according to user's timezone
  formatTimeInUserTimezone(date: Date | string, timezone: string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj)
    } catch (error) {
      // Fallback to local time if timezone is invalid
      console.warn(`Invalid timezone: ${timezone}`)
      return dateObj.toLocaleString()
    }
  }

  // Get user's local timezone as a best guess
  getUserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch (error) {
      return 'UTC'
    }
  }

  // Check if notification preferences allow email notifications
  shouldSendEmailNotification(preferences: UserPreference): boolean {
    return preferences.emailNotifications
  }

  // Check if notification preferences allow SMS notifications
  shouldSendSMSNotification(preferences: UserPreference): boolean {
    return preferences.smsNotifications
  }
}

export default new UserPreferencesService()