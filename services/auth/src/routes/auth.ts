import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole } from '@prisma/client';
import { verifyToken } from '../middleware/auth';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

interface RegisterBody {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  orgId: number;
  instanceId?: number;
}

interface LoginBody {
  email: string;
  password: string;
}

export class AuthController {
  private prisma: PrismaClient;
  private bcrypt: any;
  private jwt: any;

  constructor(prisma: PrismaClient, bcrypt: any, jwt: any) {
    this.prisma = prisma;
    this.bcrypt = bcrypt;
    this.jwt = jwt;
  }

  private generateTokens = (user: any) => {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      instanceId: user.instanceId
    };
  
    const accessToken = this.jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
  
    const refreshToken = this.jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
  
    return { accessToken, refreshToken };
  };

  register = async (req: Request<{}, {}, RegisterBody>, res: Response) => {
    try {
      const { email, password, firstName, lastName, role, orgId, instanceId } = req.body;
  
      if (!email || !password || !orgId) {
        return res.status(400).json({ error: 'Email, password, and organization ID are required' });
      }
  
      const existingUser = await this.prisma.user.findUnique({
        where: { email }
      });
  
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }
  
      const organization = await this.prisma.organization.findUnique({
        where: { id: orgId }
      });
  
      if (!organization) {
        return res.status(400).json({ error: 'Invalid organization ID' });
      }
  
      if (instanceId) {
        const instance = await this.prisma.instance.findFirst({
          where: { id: instanceId, orgId: orgId }
        });
        if (!instance) {
          return res.status(400).json({ error: 'Invalid instance ID for this organization' });
        }
      }
  
      const hashedPassword = await this.bcrypt.hash(password, SALT_ROUNDS);
  
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: role || UserRole.BORROWER,
          orgId,
          instanceId
        },
        select: {
          id: true, email: true, firstName: true, lastName: true, role: true, orgId: true, instanceId: true
        }
      });
  
      const { accessToken, refreshToken } = this.generateTokens(user);
  
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
  
      await this.prisma.refreshToken.create({
        data: { token: refreshToken, userId: user.id, expiresAt }
      });
  
      res.status(201).json({ user, accessToken, refreshToken });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  login = async (req: Request<{}, {}, LoginBody>, res: Response) => {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
  
      const user = await this.prisma.user.findUnique({
        where: { email }
      });
  
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      const isPasswordValid = await this.bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });
  
      const { accessToken, refreshToken } = this.generateTokens(user);
  
      try {
        await this.prisma.$transaction(async (tx: any) => {
          await tx.refreshToken.deleteMany({
            where: { userId: user.id }
          });
  
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
  
          await tx.refreshToken.create({
            data: { token: refreshToken, userId: user.id, expiresAt }
          });
        });
      } catch (error) {
        console.error('Failed to manage refresh tokens:', error);
        return res.status(500).json({ error: 'Failed to complete login process' });
      }
  
      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          orgId: user.orgId,
          instanceId: user.instanceId
        },
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  refresh = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
  
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }
  
      let decoded: any;
      try {
        decoded = this.jwt.verify(refreshToken, process.env.JWT_SECRET!);
      } catch (error) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }
  
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
      });
  
      if (!storedToken || storedToken.expiresAt < new Date()) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }
  
      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(storedToken.user);
  
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id }
      });
  
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
  
      await this.prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: storedToken.user.id,
          expiresAt
        }
      });
  
      res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  getMe = async (req: Request, res: Response) => {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          orgId: true,
          instanceId: true,
          organization: { select: { id: true, name: true } },
          instance: { select: { id: true, name: true } }
        }
      });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.json(user);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  logout = async (req: Request, res: Response) => {
    try {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: req.user!.userId }
      });
  
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  forgotPassword = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
  
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
  
      const user = await this.prisma.user.findUnique({
        where: { email }
      });
  
      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: 'If the email exists, a password reset link has been sent' });
      }
  
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  
      await this.prisma.$transaction(async (tx: any) => {
        await tx.passwordResetToken.deleteMany({
          where: { userId: user.id }
        });
  
        await tx.passwordResetToken.create({
          data: { userId: user.id, token: hashedToken, expiresAt }
        });
  
        await tx.userActivityLog.create({
          data: {
            userId: user.id,
            orgId: user.orgId,
            action: 'REQUEST_PASSWORD_RESET',
            entityType: 'user',
            entityId: user.id,
            metadata: { email }
          }
        });
  
        if (process.env.NODE_ENV === 'development') {
          console.log(`Password reset token for ${email}: ${resetToken}`);
        }
      });
  
      res.json({ message: 'If the email exists, a password reset link has been sent' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
  
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
      }
  
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
      const resetToken = await this.prisma.passwordResetToken.findFirst({
        where: {
          token: hashedToken,
          expiresAt: { gt: new Date() },
          usedAt: null
        },
        include: { user: true }
      });
  
      if (!resetToken) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }
  
      const hashedPassword = await this.bcrypt.hash(newPassword, SALT_ROUNDS);
  
      await this.prisma.$transaction(async (tx: any) => {
        await tx.user.update({
          where: { id: resetToken.userId },
          data: { password: hashedPassword }
        });
  
        await tx.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() }
        });
  
        await tx.refreshToken.deleteMany({
          where: { userId: resetToken.userId }
        });
  
        await tx.userActivityLog.create({
          data: {
            userId: resetToken.userId,
            orgId: resetToken.user.orgId,
            action: 'RESET_PASSWORD_COMPLETED',
            entityType: 'user',
            entityId: resetToken.userId,
            metadata: { method: 'token' }
          }
        });
      });
  
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  changePassword = async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
  
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new passwords are required' });
      }
  
      const user = await this.prisma.user.findUnique({
        where: { id: req.user!.userId }
      });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const isPasswordValid = await this.bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
  
      const hashedPassword = await this.bcrypt.hash(newPassword, SALT_ROUNDS);
  
      await this.prisma.$transaction(async (tx: any) => {
        await tx.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        });
  
        await tx.userActivityLog.create({
          data: {
            userId: user.id,
            orgId: user.orgId,
            action: 'CHANGE_PASSWORD',
            entityType: 'user',
            entityId: user.id,
            metadata: { method: 'authenticated' }
          }
        });
      });
  
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// In a real app, you would instantiate PrismaClient once and pass it around
const prisma = new PrismaClient();
const authController = new AuthController(prisma, bcrypt, jwt);

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.get('/me', verifyToken, authController.getMe);
router.post('/logout', verifyToken, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', verifyToken, authController.changePassword);

export default router;
