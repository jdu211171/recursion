import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import DataTable from './DataTable'
import type { EntityKey } from '../layout/Toolbar'
import Modal from '../primitives/Modal'

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
}

export default function ConsoleTable({ entity, onEdit, onDelete, onBorrow, onReturn, selectedIds, onSelectionChange, headerContent, search, onSearchChange }: Props) {
  const [items] = useState(() => ([
    { id: 'i1', name: 'HDMI Cable', category: 'Cables', totalCount: 10, availableCount: 8, attachmentsCount: 1, updatedAt: '2025-08-12' },
    { id: 'i2', name: 'Projector', category: 'AV Equipment', totalCount: 3, availableCount: 1, attachmentsCount: 2, updatedAt: '2025-08-10' },
  ]))

  const [users] = useState(() => ([
    { id: 'u1', name: 'Alice Zhang', externalId: 'S12345', contact: 'alice@example.com', roles: ['Borrower'], blacklistUntil: '' },
    { id: 'u2', name: 'Bob Smith', externalId: 'S67890', contact: 'bob@example.com', roles: ['Staff'], blacklistUntil: '2025-08-30' },
  ]))

  const [borrowings] = useState(() => ([
    { id: 'b1', itemId: 'i2', userId: 'u1', startDate: '2025-08-01', dueDate: '2025-08-10', returnedAt: null as string | null, handledBy: 'staff01', penalty: 0 },
    { id: 'b2', itemId: 'i1', userId: 'u2', startDate: '2025-08-05', dueDate: '2025-08-08', returnedAt: '2025-08-08', handledBy: 'staff02', penalty: 0 },
  ]))

  const itemsById = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items])
  const usersById = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users])

  // "View" drawer state for Users
  const [viewUser, setViewUser] = useState<any | null>(null)
  const viewUserKpis = useMemo(() => {
    if (!viewUser) return { currentLoans: 0, overdue: 0, penalties: 0 }
    const now = new Date().toISOString().slice(0,10)
    const userBorrowings = borrowings.filter(b => b.userId === viewUser.id)
    const currentLoans = userBorrowings.filter(b => !b.returnedAt).length
    const overdue = userBorrowings.filter(b => !b.returnedAt && b.dueDate < now).length
    const penalties = userBorrowings.reduce((sum, b) => sum + (b.penalty || 0), 0)
    return { currentLoans, overdue, penalties }
  }, [viewUser, borrowings])

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
    const filtered = users
    return (
      <>
      <DataTable
        columns={[
          { key: 'name', header: 'Full Name', sortable: true, searchable: true },
          { key: 'externalId', header: 'External ID', searchable: true },
          { key: 'contact', header: 'Contact', searchable: true },
          { key: 'roles', header: 'Roles', render: (r: any) => (Array.isArray(r.roles) ? r.roles.join(', ') : String(r.roles || '')) },
          { key: 'blacklistUntil', header: 'Blacklisted Until', searchable: false, render: (r: any) => (r.blacklistUntil ? (
              <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(255,80,80,0.12)', border: '1px solid rgba(255,80,80,0.35)' }}>{r.blacklistUntil}</span>
            ) : '') },
        ]}
        rows={filtered}
        rowKey={(r) => r.id}
        onRowAction={(a, r) => { if (a === 'view') setViewUser(r); else if (a === 'edit') onEdit(r); else onDelete(r) }}
        rowActions={() => ([{ id: 'view', label: 'View' }, { id: 'edit', label: 'Edit' }, { id: 'delete', label: 'Delete' }])}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        headerContent={headerContentMain}
        headerActions={headerActions}
        search={search}
        onSearchChange={onSearchChange}
      />
      <UserViewModal
        open={!!viewUser}
        onClose={() => setViewUser(null)}
        user={viewUser}
        kpis={viewUserKpis}
        borrowings={borrowings}
        itemsById={itemsById}
      />
      </>
    )
  }

  if (entity === 'borrowings') {
    return (
      <DataTable
        columns={[
          { key: 'itemId', header: 'Item', render: (r: any) => itemsById[r.itemId]?.name || r.itemId },
          { key: 'userId', header: 'User', render: (r: any) => usersById[r.userId]?.name || r.userId },
          { key: 'startDate', header: 'Start Date', sortable: true },
          { key: 'dueDate', header: 'Due Date', sortable: true, render: (r: any) => {
            const overdue = !r.returnedAt && r.dueDate < new Date().toISOString().slice(0,10)
            return <span style={{ color: overdue ? '#ff6b6b' : 'inherit', fontWeight: overdue ? 600 : 400 }}>{r.dueDate}</span>
          } },
          { key: 'returnedAt', header: 'Returned At' },
          { key: 'status', header: 'Status', render: (r: any) => (r.returnedAt ? 'Returned' : (r.dueDate < new Date().toISOString().slice(0,10) ? 'Overdue' : 'Active')) },
          { key: 'penalty', header: 'Penalty (¥)', render: (r: any) => String(r.penalty ?? 0) },
          { key: 'handledBy', header: 'Handled By' },
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

  const filtered = items
  return (
    <DataTable
      columns={[
        { key: 'name', header: 'Name', sortable: true, searchable: true },
        { key: 'category', header: 'Category', searchable: true },
        { key: 'stock', header: 'Available / Total', searchable: false, render: (r: any) => `${r.availableCount} / ${r.totalCount}` },
        { key: 'attachmentsCount', header: 'Attachments (#)', searchable: false },
        { key: 'updatedAt', header: 'Updated At', sortable: true },
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

// Inline modal for "View User" drawer
function UserViewModal({ open, onClose, user, kpis, borrowings, itemsById }: { open: boolean; onClose: () => void; user: any | null; kpis: { currentLoans: number; overdue: number; penalties: number }; borrowings: any[]; itemsById: Record<string, any> }) {
  if (!open || !user) return null
  const recent = borrowings.filter(b => b.userId === user.id).slice(0, 10)
  return (
    <Modal open={open} onClose={onClose} title={`User — ${user.name}`}>
      <div className="grid">
        <div className="col-12">
          <div className="muted">Overview</div>
          <div>Name: {user.name}</div>
          {user.externalId && <div>External ID: {user.externalId}</div>}
          <div>Contact: {user.contact}</div>
          <div>Roles: {Array.isArray(user.roles) ? user.roles.join(', ') : user.roles}</div>
          {user.blacklistUntil && <div>Blacklisted Until: {user.blacklistUntil}</div>}
        </div>
        <div className="col-12" style={{ marginTop: 6 }}>
          <div className="muted">Eligibility</div>
          <div>{user.blacklistUntil ? 'Currently blacklisted' : 'Eligible'}</div>
        </div>
        <div className="col-12" style={{ marginTop: 6 }}>
          <div className="muted">Activity</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div><strong>Current Loans:</strong> {kpis.currentLoans}</div>
            <div><strong>Overdue:</strong> {kpis.overdue}</div>
            <div><strong>Penalties (¥):</strong> {kpis.penalties}</div>
          </div>
        </div>
        <div className="col-12" style={{ marginTop: 6 }}>
          <div className="muted">Borrow history (last 10)</div>
          <table style={{ width: '100%', marginTop: 6 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Out</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Due</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Returned</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Item</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Penalty</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, idx) => {
                const status = r.returnedAt ? 'Returned' : (r.dueDate < new Date().toISOString().slice(0,10) ? 'Overdue' : 'Active')
                return (
                  <tr key={idx}>
                    <td style={{ padding: '6px 8px' }}>{r.startDate}</td>
                    <td style={{ padding: '6px 8px' }}>{r.dueDate}</td>
                    <td style={{ padding: '6px 8px' }}>{r.returnedAt || ''}</td>
                    <td style={{ padding: '6px 8px' }}>{itemsById[r.itemId]?.name || r.itemId}</td>
                    <td style={{ padding: '6px 8px' }}>{status}</td>
                    <td style={{ padding: '6px 8px' }}>{String(r.penalty ?? 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}
