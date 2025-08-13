import { Router, Request, Response } from 'express';
import multer from 'multer';
import { fileService } from '../services/fileService';
import { verifyToken, getTenantContext, requireRole } from '../middleware/tenantContext';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

// All routes require authentication
router.use(verifyToken);

// POST /api/files/upload - Upload a file
router.post('/upload', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  
  if (!req.file) {
    throw new AppError('No file provided', 400);
  }

  const { itemId } = req.body;

  const fileMetadata = await fileService.uploadFile({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    itemId
  }, context);

  res.status(201).json(fileMetadata);
}));

// GET /api/files - Get files with filters
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  
  const filters = {
    itemId: req.query.itemId === 'undefined' ? undefined : req.query.itemId as string,
    uploadedBy: req.query.uploadedBy === 'undefined' ? undefined : req.query.uploadedBy as string,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20
  };

  const result = await fileService.getFiles(filters, context);
  res.json(result);
}));

// GET /api/files/:id - Get file metadata
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const file = await fileService.getFileById(req.params.id, context);
  res.json(file);
}));

// GET /api/files/:id/download - Get download URL
router.get('/:id/download', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const downloadInfo = await fileService.getDownloadUrl(req.params.id, context);
  res.json(downloadInfo);
}));

// DELETE /api/files/:id - Delete a file
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  const result = await fileService.deleteFileById(req.params.id, context);
  res.json(result);
}));

// POST /api/files/bulk-upload - Upload multiple files (admin/staff only)
router.post('/bulk-upload', requireRole(['ADMIN', 'STAFF']), upload.array('files', 10), asyncHandler(async (req: Request, res: Response) => {
  const context = getTenantContext(req);
  
  if (!req.files || !Array.isArray(req.files)) {
    throw new AppError('No files provided', 400);
  }

  const { itemId } = req.body;
  const uploadPromises = req.files.map(file => 
    fileService.uploadFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      itemId
    }, context)
  );

  const uploadedFiles = await Promise.all(uploadPromises);
  res.status(201).json({ files: uploadedFiles });
}));

export default router;