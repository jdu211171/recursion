import type { ChangeEvent } from 'react'
import Select from '../primitives/Select'
import Button from '../primitives/Button'

export type EntityKey =
  | 'items'
  | 'users'
  | 'borrowings'
  | 'reservations'
  | 'penalties'
  | 'roles'
  | 'categories'
  | 'attachments'

interface Props {
  entity: EntityKey
  onEntityChange: (e: ChangeEvent<HTMLSelectElement>) => void
  onCreate: () => void
  onImportCsv: () => void
  onExportCsv: () => void
  selectedCount?: number
  onBulkDelete?: () => void
  onBulkExport?: () => void
  onToggleFilters?: () => void
}

export default function Toolbar({ entity, onEntityChange, onCreate, onImportCsv, onExportCsv, selectedCount = 0, onBulkDelete, onBulkExport, onToggleFilters }: Props) {
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="muted" htmlFor="entity">Entity</label>
        <Select id="entity" value={entity} onChange={onEntityChange}>
          <option value="items">Items</option>
          <option value="users">Users</option>
          <option value="borrowings">Borrowings</option>
          <option value="reservations">Reservations</option>
          <option value="penalties">Penalties</option>
          <option value="roles">Roles</option>
          <option value="categories">Categories</option>
          <option value="attachments">Attachments</option>
        </Select>
        <Button variant="ghost" onClick={onToggleFilters} aria-label="Toggle filters">Filters</Button>
        <div style={{ flex: 1 }} />
        {selectedCount > 0 && (
          <>
            <Button variant="ghost" onClick={onBulkDelete} aria-label="Delete selected">Delete({selectedCount})</Button>
            <Button variant="ghost" onClick={onBulkExport} aria-label="Export selected">Export({selectedCount})</Button>
          </>
        )}
        <Button onClick={onCreate}>Create</Button>
        <Button variant="ghost" onClick={onImportCsv}>Import CSV</Button>
        <Button variant="ghost" onClick={onExportCsv}>Export CSV</Button>
      </div>
    </div>
  )
}
