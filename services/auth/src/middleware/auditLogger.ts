import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Authentication actions to log
const AUTH_ACTIONS = {
  'POST /auth/login': 'USER_LOGIN',
  'POST /auth/logout': 'USER_LOGOUT',
  'POST /auth/refresh': 'TOKEN_REFRESH',
  'POST /auth/register': 'USER_REGISTER',
  'POST /users': 'CREATE_USER',
  'PUT /users/:id': 'UPDATE_USER',
  'DELETE /users/:id': 'DELETE_USER',
  'POST /users/:userId/reset-password': 'PASSWORD_RESET',
  'POST /users/:userId/blacklist': 'BLACKLIST_ACTION',
  'GET /users/:userId/activity': 'VIEW_USER_ACTIVITY',
  'DELETE /users/:userId/sessions/:sessionId': 'TERMINATE_SESSION'
};

// Extract entity type from path
function getEntityType(path: string): string {
  if (path.includes('/auth')) return 'auth';
  if (path.includes('/users')) return 'user';
  if (path.includes('/sessions')) return 'session';
  return 'unknown';
}

// Audit logging middleware for auth service
export const authAuditLogger = async (req: Request, res: Response, next: NextFunction) => {
  // Store original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Override response methods to capture response data
  res.send = function(data: any) {
    res.locals.responseData = data;
    res.locals.statusCode = res.statusCode;
    return originalSend.call(this, data);
  };
  
  res.json = function(data: any) {
    res.locals.responseData = data;
    res.locals.statusCode = res.statusCode;
    return originalJson.call(this, data);
  };

  // Continue with request
  next();

  // After response is sent, log the audit
  res.on('finish', async () => {
    try {
      const method = req.method;
      const path = req.route?.path || req.path;
      const actionKey = `${method} ${path}`;
      const action = AUTH_ACTIONS[actionKey as keyof typeof AUTH_ACTIONS];
      
      // Only log defined actions and successful operations
      if (action && res.statusCode >= 200 && res.statusCode < 300) {
        // Determine user ID and org ID
        let userId: string | undefined;
        let orgId: number | undefined;
        let instanceId: number | undefined;
        
        // For authenticated requests
        if (req.user) {
          userId = req.user.userId;
          orgId = req.user.orgId;
          instanceId = req.user.instanceId;
        } 
        // For login/register, extract from response
        else if (action === 'USER_LOGIN' || action === 'USER_REGISTER') {
          const responseData = res.locals.responseData;
          if (responseData) {
            const data = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
            if (data.user) {
              userId = data.user.id;
              orgId = data.user.orgId;
              instanceId = data.user.instanceId;
            }
          }
        }
        
        // Skip if we don't have user info (except for failed login attempts)
        if (!userId && action !== 'USER_LOGIN') {
          return;
        }

        // Build metadata
        const metadata: any = {
          method,
          path: req.originalUrl,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        };
        
        // Add relevant request data (excluding sensitive info)
        if (req.body) {
          const sanitizedBody = { ...req.body };
          delete sanitizedBody.password;
          delete sanitizedBody.newPassword;
          delete sanitizedBody.currentPassword;
          delete sanitizedBody.token;
          delete sanitizedBody.refreshToken;
          
          if (Object.keys(sanitizedBody).length > 0) {
            metadata.requestData = sanitizedBody;
          }
        }
        
        // Special handling for login failures
        if (action === 'USER_LOGIN' && res.statusCode === 401) {
          metadata.failed = true;
          metadata.email = req.body?.email;
        }
        
        // Extract entity ID
        let entityId: string | null = null;
        if (req.params.id) entityId = req.params.id;
        else if (req.params.userId) entityId = req.params.userId;
        else if (action === 'USER_LOGIN' || action === 'USER_REGISTER') entityId = userId || null;
        
        // Log to database
        await prisma.userActivityLog.create({
          data: {
            userId: userId || 'anonymous',
            orgId: orgId || 0, // Default org for anonymous actions
            instanceId,
            action,
            entityType: getEntityType(req.path),
            entityId,
            metadata
          }
        });
      }
      
      // Also log failed login attempts
      if (action === 'USER_LOGIN' && res.statusCode === 401) {
        await prisma.userActivityLog.create({
          data: {
            userId: 'anonymous',
            orgId: 0,
            action: 'FAILED_LOGIN',
            entityType: 'auth',
            entityId: req.body?.email || 'unknown',
            metadata: {
              email: req.body?.email,
              ip: req.ip || req.connection.remoteAddress,
              userAgent: req.get('user-agent'),
              reason: 'Invalid credentials'
            }
          }
        });
      }
    } catch (error) {
      console.error('Auth audit logging error:', error);
      // Don't fail the request due to audit logging errors
    }
  });
};

// Helper function to manually log auth activities
export async function logAuthActivity(
  userId: string,
  orgId: number,
  action: string,
  metadata?: any,
  entityId?: string,
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
        entityId: entityId || userId,
        metadata: metadata || {}
      }
    });
  } catch (error) {
    console.error('Manual auth audit logging error:', error);
  }
}