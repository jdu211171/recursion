import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { TenantContext } from '../middleware/tenantContext';
import {
  getBucketName,
  ensureBucket,
  generateObjectName,
  uploadFile,
  getPresignedUrl,
  deleteFile
} from './minioService';

const prisma = new PrismaClient();

interface FileUploadData {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
  itemId?: string;
}

interface FileFilters {
  itemId?: string;
  uploadedBy?: string;
  page: number;
  limit: number;
}

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export class FileService {
  async uploadFile(data: FileUploadData, context: TenantContext) {
    const { buffer, originalName, mimeType, size, itemId } = data;

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new AppError('File type not allowed', 400);
    }

    // Validate file size
    if (size > MAX_FILE_SIZE) {
      throw new AppError('File size exceeds 25MB limit', 400);
    }

    // Verify item belongs to tenant if provided
    if (itemId) {
      const item = await prisma.item.findFirst({
        where: {
          id: itemId,
          orgId: context.orgId,
          ...(context.instanceId && { instanceId: context.instanceId })
        }
      });

      if (!item) {
        throw new AppError('Item not found', 404);
      }
    }

    // Get bucket name and ensure it exists
    const bucketName = getBucketName(context.orgId, context.instanceId);
    await ensureBucket(bucketName);

    // Generate unique object name
    const objectName = generateObjectName(originalName);

    // Upload to MinIO
    const metadata = {
      'x-amz-meta-original-name': originalName,
      'x-amz-meta-uploaded-by': context.userId,
      'x-amz-meta-org-id': context.orgId.toString(),
      ...(context.instanceId && { 'x-amz-meta-instance-id': context.instanceId.toString() })
    };

    await uploadFile(bucketName, objectName, buffer, metadata);

    // Save metadata to database
    const fileMetadata = await prisma.fileMetadata.create({
      data: {
        filename: objectName,
        originalName,
        mimeType,
        size,
        bucket: bucketName,
        objectName,
        uploadedBy: context.userId,
        itemId,
        orgId: context.orgId,
        instanceId: context.instanceId
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        item: {
          select: {
            id: true,
            uniqueId: true,
            name: true
          }
        }
      }
    });

    return fileMetadata;
  }

  async getFiles(filters: FileFilters, context: TenantContext) {
    const { itemId, uploadedBy, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where = {
      orgId: context.orgId,
      ...(context.instanceId && { instanceId: context.instanceId }),
      ...(itemId && { itemId }),
      ...(uploadedBy && { uploadedBy })
    };

    const [files, total] = await Promise.all([
      prisma.fileMetadata.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          item: {
            select: {
              id: true,
              uniqueId: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.fileMetadata.count({ where })
    ]);

    return {
      files,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getFileById(fileId: string, context: TenantContext) {
    const file = await prisma.fileMetadata.findFirst({
      where: {
        id: fileId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        item: {
          select: {
            id: true,
            uniqueId: true,
            name: true
          }
        }
      }
    });

    if (!file) {
      throw new AppError('File not found', 404);
    }

    return file;
  }

  async getDownloadUrl(fileId: string, context: TenantContext) {
    const file = await this.getFileById(fileId, context);
    
    // Generate presigned URL
    const url = await getPresignedUrl(file.bucket, file.objectName);
    
    return {
      url,
      filename: file.originalName,
      mimeType: file.mimeType,
      size: file.size
    };
  }

  async deleteFileById(fileId: string, context: TenantContext) {
    const file = await prisma.fileMetadata.findFirst({
      where: {
        id: fileId,
        orgId: context.orgId,
        ...(context.instanceId && { instanceId: context.instanceId })
      }
    });

    if (!file) {
      throw new AppError('File not found', 404);
    }

    // Only admin or the uploader can delete files
    if (context.role !== 'ADMIN' && file.uploadedBy !== context.userId) {
      throw new AppError('Insufficient permissions to delete this file', 403);
    }

    // Delete from MinIO
    await deleteFile(file.bucket, file.objectName);

    // Delete from database
    await prisma.fileMetadata.delete({
      where: { id: fileId }
    });

    return { message: 'File deleted successfully' };
  }
}

export const fileService = new FileService();