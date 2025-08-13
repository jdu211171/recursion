import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  orgId: number;
  instanceId?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const validateTenantContext = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const requestOrgId = req.params.orgId || req.body.orgId || req.query.orgId;
  const requestInstanceId = req.params.instanceId || req.body.instanceId || req.query.instanceId;

  if (requestOrgId && parseInt(requestOrgId as string) !== req.user.orgId) {
    res.status(403).json({ error: 'Access denied to this organization' });
    return;
  }

  if (requestInstanceId && req.user.instanceId && 
      parseInt(requestInstanceId as string) !== req.user.instanceId) {
    res.status(403).json({ error: 'Access denied to this instance' });
    return;
  }

  next();
};