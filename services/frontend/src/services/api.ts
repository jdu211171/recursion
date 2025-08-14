import authService from './auth'

export interface ApiError {
  error: string
  message?: string
  statusCode?: number
}

export class ApiService {
  protected baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  protected getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    const token = authService.getAccessToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  protected async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        try {
          await authService.refreshToken()
          // Caller should retry the request
          throw new Error('TOKEN_REFRESHED')
        } catch (error) {
          authService.logout()
          // Notify app to show login gate
          window.dispatchEvent(new Event('app:logout'))
          throw new Error('Authentication failed')
        }
      }

      const error: ApiError = await response.json().catch(() => ({
        error: 'An unexpected error occurred',
        statusCode: response.status
      }))
      
      throw error
    }

    return response.json()
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      })

      return await this.handleResponse<T>(response)
    } catch (error: any) {
      if (error.message === 'TOKEN_REFRESHED') {
        // Retry the request with new token
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.getHeaders(),
            ...options.headers
          }
        })
        return await this.handleResponse<T>(response)
      }
      throw error
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : ''
    
    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET'
    })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE'
    })
  }

  async upload<T>(
    endpoint: string,
    formData: FormData
  ): Promise<T> {
    const headers = this.getHeaders() as Record<string, string>
    delete headers['Content-Type'] // Let browser set multipart boundary
    
    return this.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: formData
    })
  }
}

// Create and export a default API client instance
const apiClient = new ApiService('/api')
export default apiClient
