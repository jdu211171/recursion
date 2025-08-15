interface AuthTokens {
  accessToken: string
  refreshToken: string
}

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'ADMIN' | 'STAFF' | 'BORROWER'
  orgId: number
  instanceId?: number
}

class AuthService {
  private baseUrl: string

  constructor() {
    this.baseUrl = '/api'
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    const token = this.getAccessToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Login failed')
    }

    const data = await response.json()
    this.setTokens(data.accessToken, data.refreshToken)
    this.setUser(data.user)

    return {
      user: data.user,
      tokens: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      }
    }
  }

  async register(userData: {
    email: string
    password: string
    firstName?: string
    lastName?: string
    role: string
    orgId: number
  }): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Registration failed')
    }

    const data = await response.json()
    this.setTokens(data.accessToken, data.refreshToken)
    this.setUser(data.user)

    return {
      user: data.user,
      tokens: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      }
    }
  }

  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })

    if (!response.ok) {
      this.logout()
      throw new Error('Token refresh failed')
    }

    const data = await response.json()
    this.setTokens(data.accessToken, data.refreshToken)

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken
    }
  }

  async getProfile(): Promise<User> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      method: 'GET',
      headers: this.getHeaders()
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        await this.refreshToken()
        // Retry the request
        return this.getProfile()
      }
      throw new Error('Failed to fetch profile')
    }

    return response.json()
  }

  logout(): void {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken()
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken')
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken')
  }

  getUser(): User | null {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
  }

  private setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user))
  }
}

export default new AuthService()
export type { User, AuthTokens }