import * as Minio from 'minio';
import { AppError } from '../middleware/errorHandler';

let minioClient: Minio.Client;

export const initMinioClient = () => {
  minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
  });

  console.log('MinIO client initialized');
};

export const getMinioClient = () => {
  if (!minioClient) {
    throw new AppError('MinIO client not initialized', 500);
  }
  return minioClient;
};

// Create bucket name based on tenant context
export const getBucketName = (orgId: number, instanceId?: number): string => {
  if (instanceId) {
    return `org-${orgId}-instance-${instanceId}`.toLowerCase();
  }
  return `org-${orgId}`.toLowerCase();
};

// Ensure bucket exists for tenant
export const ensureBucket = async (bucketName: string): Promise<void> => {
  const client = getMinioClient();
  
  try {
    const exists = await client.bucketExists(bucketName);
    if (!exists) {
      await client.makeBucket(bucketName, 'us-east-1');
      console.log(`Created bucket: ${bucketName}`);
      
      // Set bucket policy to allow authenticated access
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
            Condition: {
              StringEquals: {
                's3:ExistingObjectTag/public': 'true'
              }
            }
          }
        ]
      };
      
      await client.setBucketPolicy(bucketName, JSON.stringify(policy));
    }
  } catch (error) {
    console.error('Error ensuring bucket:', error);
    throw new AppError('Failed to ensure bucket exists', 500);
  }
};

// Generate unique object name
export const generateObjectName = (filename: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const extension = filename.split('.').pop();
  return `${timestamp}-${random}.${extension}`;
};

// Upload file to MinIO
export const uploadFile = async (
  bucketName: string,
  objectName: string,
  buffer: Buffer,
  metadata: Record<string, string>
): Promise<void> => {
  const client = getMinioClient();
  
  try {
    await client.putObject(bucketName, objectName, buffer, buffer.length, metadata);
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new AppError('Failed to upload file', 500);
  }
};

// Get presigned URL for download
export const getPresignedUrl = async (
  bucketName: string,
  objectName: string,
  expiry: number = 3600 // 1 hour default
): Promise<string> => {
  const client = getMinioClient();
  
  try {
    return await client.presignedGetObject(bucketName, objectName, expiry);
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new AppError('Failed to generate download URL', 500);
  }
};

// Delete file from MinIO
export const deleteFile = async (
  bucketName: string,
  objectName: string
): Promise<void> => {
  const client = getMinioClient();
  
  try {
    await client.removeObject(bucketName, objectName);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new AppError('Failed to delete file', 500);
  }
};