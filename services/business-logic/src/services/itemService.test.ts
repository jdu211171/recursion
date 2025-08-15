
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { ItemService } from './itemService';
import { AppError } from '../middleware/errorHandler';
import itemHistoryService from './itemHistoryService';

// --- Mocks ---
const mockPrisma = {
  category: {
    findFirst: mock(async () => ({ id: '123e4567-e89b-12d3-a456-426614174000', name: 'Books', orgId: 1 }))
  },
  item: {
    create: mock(async (args) => ({ ...args.data, id: 'item-123', category: { name: 'Books' } })),
    findFirst: mock(async () => null),
    findMany: mock(async () => []),
    update: mock(async ({ where, data }) => ({ id: where.id, ...data })),
    delete: mock(async () => ({})),
    count: mock(async () => 0),
  }
};

const mockHistoryService = {
  logItemCreation: mock(async () => {}),
  logItemUpdate: mock(async () => {}),
  createHistoryEntry: mock(async () => {})
};
// ---

describe('ItemService', () => {
  let itemService: ItemService;
  const context = { orgId: 1, instanceId: 1, userId: 'user-123', role: 'ADMIN' };
  const categoryId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    itemService = new ItemService(mockPrisma as any, mockHistoryService as any);

    // Reset all mock function call counters before each test
    Object.values(mockPrisma.item).forEach(mockFn => mockFn.mockClear());
    mockPrisma.category.findFirst.mockClear();
    Object.values(mockHistoryService).forEach(mockFn => mockFn.mockClear());
  });

  // --- Test Suites ---

  describe('createItem', () => {
    const itemData = { name: 'The Great Gatsby', totalCount: 5, categoryId: categoryId };

    it('should create an item successfully', async () => {
      const result = await itemService.createItem(itemData, context);

      expect(mockPrisma.item.create).toHaveBeenCalledTimes(1);
      const createArgs = mockPrisma.item.create.mock.calls[0][0].data;
      expect(createArgs.name).toBe(itemData.name);
      expect(createArgs.availableCount).toBe(itemData.totalCount);

      expect(result.id).toBe('item-123');
      expect(mockHistoryService.logItemCreation).toHaveBeenCalledTimes(1);
    });

    it('should throw 400 if name is missing', async () => {
      await expect(itemService.createItem({ ...itemData, name: '' }, context))
        .rejects.toThrow(new AppError('Item name is required', 400));
    });

    it('should throw 400 if category is invalid', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);
      await expect(itemService.createItem(itemData, context))
        .rejects.toThrow(new AppError('Invalid category', 400));
    });
  });

  describe('getItemById', () => {
    it('should return an item if found', async () => {
      const mockItem = { id: 'item-123', name: 'Test Item', totalCount: 1, availableCount: 1, _count: { reservations: 0 } };
      mockPrisma.item.findFirst.mockResolvedValue(mockItem);

      const result = await itemService.getItemById('item-123', context);

      expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
        where: { id: 'item-123', orgId: context.orgId, instanceId: context.instanceId },
        include: {
          category: true,
          _count: {
            select: {
              lendings: { where: { returnedAt: null } },
              reservations: { where: { status: 'ACTIVE' } },
            },
          },
        },
      });
      expect(result.id).toBe('item-123');
      expect(result.borrowedCount).toBe(0);
    });

    it('should throw 404 if item not found', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(null);
      await expect(itemService.getItemById('item-nonexistent', context))
        .rejects.toThrow(new AppError('Item not found', 404));
    });
  });

  describe('getItems', () => {
    it('should return a paginated list of items', async () => {
      const mockItems = [{ id: 'item-1', name: 'Item 1', totalCount: 2, availableCount: 1, _count: { reservations: 1 } }];
      mockPrisma.item.findMany.mockResolvedValue(mockItems);
      mockPrisma.item.count.mockResolvedValue(1);

      const result = await itemService.getItems({ page: 1, limit: 10 }, context);

      expect(mockPrisma.item.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.item.count).toHaveBeenCalledTimes(1);
      expect(result.items.length).toBe(1);
      expect(result.items[0].borrowedCount).toBe(1);
      expect(result.items[0].activeReservations).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });
  });

  describe('updateItem', () => {
    const updateData = { name: 'Updated Name' };

    it('should update an item successfully', async () => {
      const existingItem = { id: 'item-123', name: 'Old Name', totalCount: 5, availableCount: 5 };
      mockPrisma.item.findFirst.mockResolvedValue(existingItem);

      const result = await itemService.updateItem('item-123', updateData, context);

      expect(mockPrisma.item.update).toHaveBeenCalledWith({ where: { id: 'item-123' }, data: updateData, include: { category: true } });
      expect(mockHistoryService.logItemUpdate).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('Updated Name');
    });

    it('should throw 404 if item to update is not found', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(null);
      await expect(itemService.updateItem('item-nonexistent', updateData, context))
        .rejects.toThrow(new AppError('Item not found', 404));
    });

    it('should throw 400 if availableCount exceeds totalCount', async () => {
        const existingItem = { id: 'item-123', name: 'Old Name', totalCount: 5, availableCount: 5 };
        mockPrisma.item.findFirst.mockResolvedValue(existingItem);

        await expect(itemService.updateItem('item-123', { availableCount: 6 }, context))
            .rejects.toThrow(new AppError('Available count cannot exceed total count', 400));
    });
  });

  describe('deleteItem', () => {
    it('should delete an item successfully', async () => {
      const mockItem = { id: 'item-123', name: 'Deletable Item', _count: { lendings: 0, reservations: 0 } };
      mockPrisma.item.findFirst.mockResolvedValue(mockItem);

      await itemService.deleteItem('item-123', context);

      expect(mockPrisma.item.delete).toHaveBeenCalledWith({ where: { id: 'item-123' } });
      expect(mockHistoryService.createHistoryEntry).toHaveBeenCalledTimes(1);
    });

    it('should throw 400 if item has active lendings', async () => {
      const mockItem = { id: 'item-123', name: 'Non-deletable Item', _count: { lendings: 1, reservations: 0 } };
      mockPrisma.item.findFirst.mockResolvedValue(mockItem);

      await expect(itemService.deleteItem('item-123', context))
        .rejects.toThrow(new AppError('Cannot delete item with active lendings', 400));
    });

    it('should throw 400 if item has active reservations', async () => {
        const mockItem = { id: 'item-123', name: 'Non-deletable Item', _count: { lendings: 0, reservations: 1 } };
        mockPrisma.item.findFirst.mockResolvedValue(mockItem);
  
        await expect(itemService.deleteItem('item-123', context))
          .rejects.toThrow(new AppError('Cannot delete item with active reservations', 400));
      });

    it('should throw 404 if item to delete is not found', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(null);
      await expect(itemService.deleteItem('item-nonexistent', context))
        .rejects.toThrow(new AppError('Item not found', 404));
    });
  });
});

