import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Actions to log
const AUDIT_ACTIONS = {
  // Item operations
  'POST /items': 'CREATE_ITEM',
  'PUT /items/:id': 'UPDATE_ITEM',
  'DELETE /items/:id': 'DELETE_ITEM',
  
  // Category operations
  'POST /categories': 'CREATE_CATEGORY',
  'PUT /categories/:id': 'UPDATE_CATEGORY',
  'DELETE /categories/:id': 'DELETE_CATEGORY',
  
  // Lending operations
  'POST /lending/borrow': 'BORROW_ITEM',
  'POST /lending/return': 'RETURN_ITEM',
  'PUT /lending/:id': 'UPDATE_LENDING',
  
  // Reservation operations
  'POST /reservations': 'CREATE_RESERVATION',
  'PUT /reservations/:id': 'UPDATE_RESERVATION',
  'DELETE /reservations/:id': 'CANCEL_RESERVATION',
  
  // Organization operations
  'POST /organizations': 'CREATE_ORGANIZATION',
  'PUT /organizations/:id': 'UPDATE_ORGANIZATION',
  'POST /organizations/:orgId/instances': 'CREATE_INSTANCE',
  'PUT /organizations/:orgId/instances/:instanceId': 'UPDATE_INSTANCE',
  'DELETE /organizations/:orgId/instances/:instanceId': 'DELETE_INSTANCE',
  
  // Configuration operations
  'PUT /organizations/:orgId/configuration': 'UPDATE_CONFIGURATION',
  'POST /configurations/feature-flags': 'UPDATE_FEATURE_FLAGS',
  'POST /configurations/custom-fields': 'UPDATE_CUSTOM_FIELDS',
  
  // CSV operations (already logged in the route)
  'POST /csv/import': 'CSV_IMPORT',
  'GET /csv/export': 'CSV_EXPORT'
};

// Extract entity type from path
function getEntityType(path: string): string {
  if (path.includes('/items')) return 'item';
  if (path.includes('/categories')) return 'category';
  if (path.includes('/lending')) return 'lending';
  if (path.includes('/reservations')) return 'reservation';
  if (path.includes('/organizations')) return 'organization';
  if (path.includes('/instances')) return 'instance';
  if (path.includes('/configuration')) return 'configuration';
  if (path.includes('/csv')) return 'csv';
  return 'unknown';
}

// Extract entity ID from request
function getEntityId(req: Request): string | null {
  // Check params first
  if (req.params.id) return req.params.id;
  if (req.params.itemId) return req.params.itemId;
  if (req.params.categoryId) return req.params.categoryId;
  if (req.params.lendingId) return req.params.lendingId;
  if (req.params.reservationId) return req.params.reservationId;
  if (req.params.orgId) return req.params.orgId;
  if (req.params.instanceId) return req.params.instanceId;
  
  // Check response body for created entities
  if (req.method === 'POST' && (req as any).auditEntityId) {
    return (req as any).auditEntityId;
  }
  
  return null;
}

// Audit logging middleware
export const auditLogger = async (req: Request, res: Response, next: NextFunction) => {
  // Skip if no user (unauthenticated requests)
  if (!req.user) {
    return next();
  }

  // Store original send function
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Override response methods to capture entity ID from response
  res.send = function(data: any) {
    res.locals.responseData = data;
    return originalSend.call(this, data);
  };
  
  res.json = function(data: any) {
    res.locals.responseData = data;
    return originalJson.call(this, data);
  };

  // Continue with request
  next();

  // After response is sent, log the audit
  res.on('finish', async () => {
    try {
      // Only log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const method = req.method;
        const path = req.route?.path || req.path;
        const actionKey = `${method} ${path}`;
        const action = AUDIT_ACTIONS[actionKey as keyof typeof AUDIT_ACTIONS];
        
        if (action) {
          // Extract entity ID from response if it's a creation
          let entityId = getEntityId(req);
          if (!entityId && method === 'POST' && res.locals.responseData) {
            const responseData = res.locals.responseData;
            if (typeof responseData === 'string') {
              try {
                const parsed = JSON.parse(responseData);
                entityId = parsed.id || parsed.itemId || parsed.categoryId || null;
              } catch (e) {
                // Not JSON, ignore
              }
            } else if (responseData && typeof responseData === 'object') {
              entityId = responseData.id || responseData.itemId || responseData.categoryId || null;
            }
          }
          
          // Build metadata
          const metadata: any = {
            method,
            path: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('user-agent')
          };
          
          // Add request body for POST/PUT (excluding sensitive data)
          if ((method === 'POST' || method === 'PUT') && req.body) {
            const sanitizedBody = { ...req.body };
            delete sanitizedBody.password;
            delete sanitizedBody.token;
            metadata.requestData = sanitizedBody;
          }
          
          // Add query params for GET
          if (method === 'GET' && Object.keys(req.query).length > 0) {
            metadata.queryParams = req.query;
          }
          
          // Log to database
          await prisma.userActivityLog.create({
            data: {
              userId: req.user.userId,
              orgId: req.user.orgId,
              instanceId: req.user.instanceId || req.body?.instanceId || undefined,
              action,
              entityType: getEntityType(req.path),
              entityId: entityId?.toString() || null,
              metadata
            }
          });
        }
      }
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't fail the request due to audit logging errors
    }
  });
};

// Special audit function for auth service operations
export async function logAuthActivity(
  userId: string,
  orgId: number,
  action: string,
  metadata?: any,
  instanceId?: number
) {
  try {
    await prisma.userActivityLog.create({
      data: {
        userId,
        orgId,
        instanceId,
        action,
        entityType: 'auth',
        entityId: userId,
        metadata: metadata || {}
      }
    });
  } catch (error) {
    console.error('Auth audit logging error:', error);
  }
}