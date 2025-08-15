import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { UserController } from './users';
import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';

// --- Mocks ---
const mockPrisma = {
  user: {
    findMany: mock(),
    count: mock(),
    findFirst: mock(),
    update: mock(),
    findUnique: mock(),
    create: mock()
  },
  userActivityLog: {
    create: mock()
  },
  $transaction: mock((callback) => callback(mockPrisma))
};

const mockBcrypt = {
  hash: mock(async () => 'hashed_password')
};
// ---

describe('UserController', () => {
  let controller: UserController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let statusSpy: any;
  let jsonSpy: any;

  beforeEach(() => {
    controller = new UserController(mockPrisma as any, mockBcrypt as any);

    statusSpy = mock((_code: number) => mockRes);
    jsonSpy = mock((_body: any) => mockRes);
    mockRes = {
      status: statusSpy,
      json: jsonSpy,
    };

    // Reset mock function history
    Object.values(mockPrisma.user).forEach(fn => fn.mockClear());
    mockBcrypt.hash.mockClear();
  });

  describe('GET /users', () => {
    it('should return a paginated list of users for an admin', async () => {
      const mockUsers = [{ id: 'user-1', email: 'user1@test.com' }];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(1);

      mockReq = {
        user: { userId: 'admin-1', orgId: 1, role: UserRole.ADMIN },
        query: { page: '1', limit: '10' }
      };

      await controller.getAllUsers(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
      expect(jsonSpy).toHaveBeenCalledWith({
        users: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1
        }
      });
    });

    it('should apply role and instanceId filters if provided', async () => {
      mockReq = {
        user: { userId: 'admin-1', orgId: 1, role: UserRole.ADMIN },
        query: { role: UserRole.STAFF, instanceId: '5' }
      };

      await controller.getAllUsers(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          orgId: 1,
          role: UserRole.STAFF,
          instanceId: 5
        }
      }));
    });
  });

  describe('GET /users/:userId', () => {
    it('should allow an admin to get any user', async () => {
      mockReq = {
        user: { userId: 'admin-1', orgId: 1, role: UserRole.ADMIN },
        params: { userId: 'user-123' }
      };
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-123' });

      await controller.getUserById(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({ 
        where: { id: 'user-123', orgId: 1 },
        select: expect.any(Object)
      });
      expect(jsonSpy).toHaveBeenCalledWith({ id: 'user-123' });
    });

    it('should allow a user to get their own profile', async () => {
      mockReq = {
        user: { userId: 'user-123', orgId: 1, role: UserRole.BORROWER },
        params: { userId: 'user-123' }
      };
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-123' });

      await controller.getUserById(mockReq as Request, mockRes as Response);

      expect(jsonSpy).toHaveBeenCalledWith({ id: 'user-123' });
    });

    it('should return 403 if a user tries to get another user\'s profile', async () => {
      mockReq = {
        user: { userId: 'user-456', orgId: 1, role: UserRole.BORROWER },
        params: { userId: 'user-123' }
      };

      await controller.getUserById(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });

    it('should return 404 if user is not found', async () => {
      mockReq = {
        user: { userId: 'admin-1', orgId: 1, role: UserRole.ADMIN },
        params: { userId: 'not-found' }
      };
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await controller.getUserById(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });

  describe('PUT /users/:userId', () => {
    it('should allow an admin to update another user\'s role', async () => {
      mockReq = {
        user: { userId: 'admin-1', orgId: 1, role: UserRole.ADMIN },
        params: { userId: 'user-123' },
        body: { role: UserRole.STAFF }
      };
      // Mock finding the user to update, and mock the email check to return null
      mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'user-123', orgId: 1 });

      await controller.updateUser(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { role: UserRole.STAFF }
      }));
      expect(jsonSpy).toHaveBeenCalledWith({ role: UserRole.STAFF });
    });

    it('should allow a user to update their own first name', async () => {
      mockReq = {
        user: { userId: 'user-123', orgId: 1, role: UserRole.BORROWER },
        params: { userId: 'user-123' },
        body: { firstName: 'New Name' }
      };
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-123', orgId: 1 });

      await controller.updateUser(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { firstName: 'New Name' }
      }));
    });

    it('should prevent a user from updating their own role', async () => {
      mockReq = {
        user: { userId: 'user-123', orgId: 1, role: UserRole.BORROWER },
        params: { userId: 'user-123' },
        body: { role: UserRole.ADMIN } // Attempt to escalate privilege
      };
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-123', orgId: 1 });

      await controller.updateUser(mockReq as Request, mockRes as Response);

      // The data object should be empty as only admins can change roles
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        data: {}
      }));
    });

    it('should return 409 if admin tries to set an email that is already in use', async () => {
      mockReq = {
        user: { userId: 'admin-1', orgId: 1, role: UserRole.ADMIN },
        params: { userId: 'user-123' },
        body: { email: 'taken@email.com' }
      };
      // Mock finding the user to update
      mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'user-123', orgId: 1 });
      // Mock the email check to find an existing user
      mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'user-456' });

      await controller.updateUser(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Email already in use' });
    });
  });

  describe('POST /', () => {
    it('should allow an admin to create a new user', async () => {
      const newUserRequest = {
        email: 'new@example.com',
        password: 'password123',
        role: UserRole.STAFF
      };
      mockReq = {
        user: { userId: 'admin-1', orgId: 1, role: UserRole.ADMIN },
        body: newUserRequest
      };
      mockPrisma.user.findUnique.mockResolvedValue(null); // Email is not taken
      mockPrisma.user.create.mockResolvedValue({ id: 'new-user-123', ...newUserRequest });

      await controller.createUser(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ email: newUserRequest.email })
      }));
      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-user-123' }));
    });

    it('should return 409 if email is already in use', async () => {
      mockReq = {
        user: { userId: 'admin-1', orgId: 1, role: UserRole.ADMIN },
        body: { email: 'existing@example.com', password: 'password123' }
      };
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' }); // Email is taken

      await controller.createUser(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Email already in use' });
    });
  });

  describe('DELETE /users/:userId', () => {
    it('should allow an admin to deactivate a user', async () => {
      mockReq = {
        user: { userId: 'admin-1', orgId: 1, role: UserRole.ADMIN },
        params: { userId: 'user-123' }
      };
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-123', orgId: 1 });

      await controller.deleteUser(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { isActive: false }
      });
      expect(jsonSpy).toHaveBeenCalledWith({ message: 'User deactivated successfully' });
    });

    it('should prevent an admin from deactivating themselves', async () => {
      mockReq = {
        user: { userId: 'admin-1', orgId: 1, role: UserRole.ADMIN },
        params: { userId: 'admin-1' } // Admin's own ID
      };

      await controller.deleteUser(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Cannot delete your own account' });
    });

    it('should return 404 if user to delete is not found', async () => {
      mockReq = {
        user: { userId: 'admin-1', orgId: 1, role: UserRole.ADMIN },
        params: { userId: 'not-found' }
      };
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await controller.deleteUser(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });
});

