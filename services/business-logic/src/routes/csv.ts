import { Router, Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth';
import multer from 'multer';
import { parse } from 'csv-parse';
import { Parser as Json2CsvParser } from 'json2csv';
import { Readable } from 'stream';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// CSV Import endpoint
router.post('/import', 
  authMiddleware, 
  requireRole([UserRole.ADMIN, UserRole.STAFF]), 
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const { type, instanceId } = req.body;
      
      if (!type || !instanceId) {
        res.status(400).json({ error: 'Type and instanceId are required' });
        return;
      }

      // Verify user has access to this instance
      const user = req.user!;
      if (user.instanceId && user.instanceId !== Number(instanceId)) {
        res.status(403).json({ error: 'Access denied to this instance' });
        return;
      }

      // Parse CSV data
      const csvData: any[] = [];
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      parser.on('readable', function() {
        let record;
        while ((record = parser.read()) !== null) {
          csvData.push(record);
        }
      });

      parser.on('error', function(err) {
        console.error('CSV parse error:', err);
        res.status(400).json({ error: 'Invalid CSV format' });
        return;
      });

      // Create readable stream from buffer
      const stream = Readable.from(req.file.buffer);
      stream.pipe(parser);

      await new Promise((resolve) => {
        parser.on('end', resolve);
      });

      // Process based on type
      let importResult = { success: 0, errors: [] as any[] };

      switch (type) {
        case 'items':
          importResult = await importItems(csvData, Number(instanceId), user.orgId);
          break;
        case 'users':
          importResult = await importUsers(csvData, user.orgId, Number(instanceId));
          break;
        case 'borrowings':
          importResult = await importBorrowings(csvData, Number(instanceId), user.userId);
          break;
        default:
          res.status(400).json({ error: 'Invalid import type' });
          return;
      }

      // Log the import activity
      await prisma.userActivityLog.create({
        data: {
          userId: user.userId,
          orgId: user.orgId,
          instanceId: Number(instanceId),
          action: 'CSV_IMPORT',
          entityType: type,
          metadata: {
            fileName: req.file.originalname,
            totalRecords: csvData.length,
            successCount: importResult.success,
            errorCount: importResult.errors.length
          }
        }
      });

      res.json({
        message: 'Import completed',
        total: csvData.length,
        success: importResult.success,
        errors: importResult.errors
      });

    } catch (error) {
      console.error('CSV import error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// CSV Export endpoint
router.get('/export',
  authMiddleware,
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  async (req: Request, res: Response) => {
    try {
      const { type, instanceId } = req.query;
      
      if (!type || !instanceId) {
        res.status(400).json({ error: 'Type and instanceId are required' });
        return;
      }

      // Verify user has access to this instance
      const user = req.user!;
      if (user.instanceId && user.instanceId !== Number(instanceId)) {
        res.status(403).json({ error: 'Access denied to this instance' });
        return;
      }

      let data: any[] = [];
      let fields: string[] = [];

      switch (type) {
        case 'items':
          data = await exportItems(Number(instanceId));
          fields = ['name', 'categoryName', 'totalCount', 'availableCount', 'description'];
          break;
        case 'users':
          data = await exportUsers(user.orgId, Number(instanceId));
          fields = ['email', 'firstName', 'lastName', 'role', 'contactInfo', 'isActive'];
          break;
        case 'borrowings':
          data = await exportBorrowings(Number(instanceId));
          fields = ['itemName', 'borrowerEmail', 'borrowerName', 'borrowedAt', 'dueDate', 'returnedAt', 'status'];
          break;
        case 'categories':
          data = await exportCategories(Number(instanceId));
          fields = ['name', 'description', 'itemCount', 'createdAt'];
          break;
        default:
          res.status(400).json({ error: 'Invalid export type' });
          return;
      }

      // Convert to CSV
      const json2csvParser = new Json2CsvParser({ fields });
      const csv = json2csvParser.parse(data);

      // Log the export activity
      await prisma.userActivityLog.create({
        data: {
          userId: user.userId,
          orgId: user.orgId,
          instanceId: Number(instanceId),
          action: 'CSV_EXPORT',
          entityType: type as string,
          metadata: {
            recordCount: data.length
          }
        }
      });

      // Send CSV response
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);

    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Import helper functions
async function importItems(data: any[], instanceId: number, orgId: number) {
  let success = 0;
  const errors: any[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // Validate required fields
      if (!row.title && !row.name) {
        errors.push({ row: i + 1, error: 'Item name is required' });
        continue;
      }

      // Find or create category
      let categoryId = null;
      if (row.category || row.categoryName) {
        const categoryName = row.category || row.categoryName;
        let category = await prisma.category.findFirst({
          where: { 
            name: categoryName,
            instanceId: instanceId
          }
        });

        if (!category) {
          category = await prisma.category.create({
            data: {
              name: categoryName,
              instanceId: instanceId,
              orgId: orgId
            }
          });
        }
        categoryId = category.id;
      }

      // Create item
      await prisma.item.create({
        data: {
          name: row.title || row.name,
          description: row.description || null,
          categoryId: categoryId,
          totalCount: parseInt(row.totalCount) || 1,
          availableCount: parseInt(row.availableCount || row.totalCount) || 1,
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
          instanceId: instanceId,
          orgId: orgId
        }
      });

      success++;
    } catch (error: any) {
      errors.push({ row: i + 1, error: error.message });
    }
  }

  return { success, errors };
}

async function importUsers(data: any[], orgId: number, instanceId: number) {
  let success = 0;
  const errors: any[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // Validate required fields
      if (!row.email) {
        errors.push({ row: i + 1, error: 'Email is required' });
        continue;
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: row.email }
      });

      if (existingUser) {
        errors.push({ row: i + 1, error: 'User already exists' });
        continue;
      }

      // Create user (password will need to be set separately)
      await prisma.user.create({
        data: {
          email: row.email,
          password: '', // Will need to be set via password reset
          firstName: row.firstName || '',
          lastName: row.lastName || '',
          role: row.role || UserRole.BORROWER,
          contactInfo: row.contactInfo || null,
          orgId: orgId,
          instanceId: instanceId,
          isActive: row.isActive !== 'false'
        }
      });

      success++;
    } catch (error: any) {
      errors.push({ row: i + 1, error: error.message });
    }
  }

  return { success, errors };
}

async function importBorrowings(data: any[], instanceId: number, staffUserId: string) {
  let success = 0;
  const errors: any[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // Find item
      const item = await prisma.item.findFirst({
        where: {
          name: row.itemName || row.item,
          instanceId: instanceId
        }
      });

      if (!item) {
        errors.push({ row: i + 1, error: 'Item not found' });
        continue;
      }

      // Find user
      const user = await prisma.user.findFirst({
        where: {
          email: row.borrowerEmail || row.email,
          instanceId: instanceId
        }
      });

      if (!user) {
        errors.push({ row: i + 1, error: 'User not found' });
        continue;
      }

      // Check availability
      if (item.availableCount <= 0) {
        errors.push({ row: i + 1, error: 'Item not available' });
        continue;
      }

      // Create lending record
      await prisma.$transaction(async (tx) => {
        await tx.lending.create({
          data: {
            itemId: item.id,
            userId: user.id,
            instanceId: instanceId,
            borrowedAt: row.borrowedAt ? new Date(row.borrowedAt) : new Date(),
            dueDate: row.dueDate ? new Date(row.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            lentByUserId: staffUserId
          }
        });

        // Update item availability
        await tx.item.update({
          where: { id: item.id },
          data: {
            availableCount: { decrement: 1 }
          }
        });
      });

      success++;
    } catch (error: any) {
      errors.push({ row: i + 1, error: error.message });
    }
  }

  return { success, errors };
}

// Export helper functions
async function exportItems(instanceId: number) {
  const items = await prisma.item.findMany({
    where: { instanceId: instanceId },
    include: { category: true },
    orderBy: { name: 'asc' }
  });

  return items.map(item => ({
    name: item.name,
    categoryName: item.category?.name || '',
    totalCount: item.totalCount,
    availableCount: item.availableCount,
    description: item.description || ''
  }));
}

async function exportUsers(orgId: number, instanceId: number) {
  const users = await prisma.user.findMany({
    where: { 
      orgId: orgId,
      instanceId: instanceId
    },
    orderBy: { email: 'asc' }
  });

  return users.map(user => ({
    email: user.email,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    role: user.role,
    contactInfo: user.contactInfo || '',
    isActive: user.isActive
  }));
}

async function exportBorrowings(instanceId: number) {
  const lendings = await prisma.lending.findMany({
    where: { instanceId: instanceId },
    include: {
      item: true,
      user: true
    },
    orderBy: { borrowedAt: 'desc' }
  });

  return lendings.map(lending => ({
    itemName: lending.item.name,
    borrowerEmail: lending.user.email,
    borrowerName: `${lending.user.firstName || ''} ${lending.user.lastName || ''}`.trim(),
    borrowedAt: lending.borrowedAt.toISOString(),
    dueDate: lending.dueDate.toISOString(),
    returnedAt: lending.returnedAt?.toISOString() || '',
    status: lending.returnedAt ? 'returned' : (new Date() > lending.dueDate ? 'overdue' : 'active')
  }));
}

async function exportCategories(instanceId: number) {
  const categories = await prisma.category.findMany({
    where: { instanceId: instanceId },
    include: {
      _count: {
        select: { items: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  return categories.map(category => ({
    name: category.name,
    description: category.description || '',
    itemCount: category._count.items,
    createdAt: category.createdAt.toISOString()
  }));
}

export default router;