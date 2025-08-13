import { ApiService } from './api'

export interface FileMetadata {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  bucket: string
  objectName: string
  uploadedBy?: string
  itemId?: string
  orgId: number
  instanceId?: number
  createdAt: string
  updatedAt: string
}

export interface FileFilters {
  itemId?: string
  uploadedBy?: string
  page?: number
  limit?: number
}

export interface FilesResponse {
  files: FileMetadata[]
  total: number
  page: number
  limit: number
}

export interface DownloadUrlResponse {
  url: string
  expiresIn: number
}

class FilesService extends ApiService {
  constructor() {
    super('/api')
  }

  async uploadFile(file: File, itemId?: string): Promise<FileMetadata> {
    const formData = new FormData()
    formData.append('file', file)
    if (itemId) {
      formData.append('itemId', itemId)
    }

    return this.upload<FileMetadata>('/files/upload', formData)
  }

  async uploadMultipleFiles(files: File[], itemId?: string): Promise<FileMetadata[]> {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    if (itemId) {
      formData.append('itemId', itemId)
    }

    return this.upload<FileMetadata[]>('/files/bulk-upload', formData)
  }

  async getFiles(filters?: FileFilters): Promise<FilesResponse> {
    return this.get<FilesResponse>('/files', filters)
  }

  async getFileMetadata(id: string): Promise<FileMetadata> {
    return this.get<FileMetadata>(`/files/${id}`)
  }

  async getDownloadUrl(id: string): Promise<string> {
    const response = await this.get<DownloadUrlResponse>(`/files/${id}/download`)
    return response.url
  }

  async deleteFile(id: string): Promise<void> {
    return this.delete<void>(`/files/${id}`)
  }
}

export default new FilesService()