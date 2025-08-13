import { useState } from 'react'
import type { ReactNode } from 'react'
import DataTable from './DataTable'
import type { EntityKey } from '../layout/Toolbar'

interface Props {
  entity: EntityKey
  onEdit: (row: any) => void
  onDelete: (row: any) => void
  onBorrow: (row: any) => void
  onReturn: (row: any) => void
  selectedIds: Array<string | number>
  onSelectionChange: (ids: Array<string | number>) => void
  headerContent: React.ReactNode
  search: string
  onSearchChange: (v: string) => void
  statusFilter: string
}

export default function ConsoleTable({ entity, onEdit, onDelete, onBorrow, onReturn, selectedIds, onSelectionChange, headerContent, search, onSearchChange, statusFilter }: Props) {
  const [items] = useState(() => ([
    { id: 'i1', name: 'HDMI Cable', totalCount: 10, availableCount: 8, status: 'AVAILABLE' },
    { id: 'i2', name: 'Projector', totalCount: 3, availableCount: 1, status: 'LOW' },
  ]))

  const [users] = useState(() => ([
    { id: 'u1', name: 'Alice', contact: 'alice@example.com', status: 'ACTIVE' },
    { id: 'u2', name: 'Bob', contact: 'bob@example.com', status: 'ACTIVE' },
  ]))

  const [borrowings] = useState(() => ([
    { id: 'b1', itemId: 'i2', userId: 'u1', startDate: '2025-08-01', dueDate: '2025-08-10', returnedAt: null as string | null },
  ]))

  // Derive header actions (Create / Import CSV / Export CSV) from the last child of headerContent
  let headerContentMain = headerContent
  let headerActions: ReactNode | undefined
  const hcChildren = (headerContent as any)?.props?.children
  if (Array.isArray(hcChildren) && hcChildren.length >= 2) {
    headerActions = hcChildren[hcChildren.length - 1]
    headerContentMain = <>
      {hcChildren.slice(0, hcChildren.length - 1)}
    </>
  }

  if (entity === 'users') {
    const filtered = statusFilter ? users.filter(u => u.status === statusFilter) : users
    return (
      <DataTable
        columns={[
          { key: 'name', header: 'Name', sortable: true },
          { key: 'contact', header: 'Contact' },
          { key: 'status', header: 'Status' },
        ]}
        rows={filtered}
        rowKey={(r) => r.id}
        onRowAction={(a, r) => { if (a === 'edit') onEdit(r); else onDelete(r) }}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        headerContent={headerContentMain}
        headerActions={headerActions}
        search={search}
        onSearchChange={onSearchChange}
      />
    )
  }

  if (entity === 'borrowings') {
    return (
      <DataTable
        columns={[
          { key: 'itemId', header: 'Item' },
          { key: 'userId', header: 'User' },
          { key: 'startDate', header: 'Start', sortable: true },
          { key: 'dueDate', header: 'Due', sortable: true },
          { key: 'returnedAt', header: 'Returned' },
        ]}
        rows={borrowings}
        rowKey={(r) => r.id}
        onRowAction={(a, r) => { if (a === 'return') onReturn(r); else if (a === 'edit') onEdit(r); else onDelete(r) }}
        rowActions={(r) => (r.returnedAt ? [{ id: 'edit', label: 'Edit' }, { id: 'delete', label: 'Delete' }] : [{ id: 'return', label: 'Return' }, { id: 'edit', label: 'Edit' }, { id: 'delete', label: 'Delete' }])}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        headerContent={headerContentMain}
        headerActions={headerActions}
        search={search}
        onSearchChange={onSearchChange}
      />
    )
  }

  const filtered = statusFilter ? items.filter(i => i.status === statusFilter) : items
  return (
    <DataTable
      columns={[
        { key: 'name', header: 'Name', sortable: true },
        { key: 'totalCount', header: 'Total', sortable: true },
        { key: 'availableCount', header: 'Available', sortable: true },
        { key: 'status', header: 'Status' },
      ]}
      rows={filtered}
      rowKey={(r) => r.id}
      onRowAction={(a, r) => { if (a === 'borrow') onBorrow(r); else if (a === 'edit') onEdit(r); else onDelete(r) }}
      rowActions={(r) => (r.availableCount > 0 ? [{ id: 'borrow', label: 'Borrow' }, { id: 'edit', label: 'Edit' }, { id: 'delete', label: 'Delete' }] : [{ id: 'edit', label: 'Edit' }, { id: 'delete', label: 'Delete' }])}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      headerContent={headerContentMain}
      headerActions={headerActions}
      search={search}
      onSearchChange={onSearchChange}
    />
  )
}

