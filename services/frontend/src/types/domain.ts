export interface Item { id: string; name: string; categoryId?: string; totalCount: number; availableCount: number; status?: string }
export interface User { id: string; name: string; contact?: string; status?: string; blacklistUntil?: string | null }
export interface Borrowing { id: string; itemId: string; userId: string; startDate: string; dueDate: string; returnedAt?: string | null }

