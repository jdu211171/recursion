import { useCallback, useMemo, useState } from 'react'
import Header from './components/layout/Header'
import type { EntityKey } from './components/layout/Toolbar'
import ConsoleTable from './components/table/ConsoleTable'
import Overview from './pages/Overview'
import UnifiedForm, { type FieldMeta } from './components/forms/UnifiedForm'
import CsvImportModal from './components/forms/CsvImportModal'
import ConfirmDialog from './components/forms/ConfirmDialog'
import Select from './components/primitives/Select'
import { Toaster, toast } from 'sonner'
import { TenantProvider } from './contexts/TenantContext'
import { ConfigProvider } from './contexts/ConfigContext'
// Note: Context providers will be reintroduced after MUI removal

function AppShell() {
  // Single-screen console; overview/settings may be added later in-page
  const [entity, setEntity] = useState<EntityKey>('items')
  const [showForm, setShowForm] = useState(false)
  const [editRow, setEditRow] = useState<any | null>(null)
  const [showCsv, setShowCsv] = useState(false)
  // Sonner handles toast state internally via <Toaster />
  const [selectedIds, setSelectedIds] = useState<Array<string | number>>([])
  const [confirm, setConfirm] = useState<{ open: boolean; action: 'borrow'|'return'|null; row?: any }>({ open: false, action: null })
  const [search, setSearch] = useState('')

  const addToast = useCallback((text: string, type: 'info'|'success'|'warning'|'error' = 'info') => {
    if (type === 'success') toast.success(text)
    else if (type === 'error') toast.error(text)
    else if (type === 'warning') toast.warning(text)
    else toast.info(text)
  }, [])

  const fields: FieldMeta[] = useMemo(() => {
    if (entity === 'users') return [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'contact', label: 'Contact', type: 'text' },
      { name: 'blacklistUntil', label: 'Blacklist Until', type: 'date' },
    ]
    if (entity === 'borrowings') return [
      { name: 'itemId', label: 'Item', type: 'text', required: true },
      { name: 'userId', label: 'User', type: 'text', required: true },
      { name: 'startDate', label: 'Start', type: 'date', required: true },
      { name: 'dueDate', label: 'Due', type: 'date', required: true },
    ]
    return [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'totalCount', label: 'Total Count', type: 'number', required: true },
      { name: 'availableCount', label: 'Available Now', type: 'number', required: true },
    ]
  }, [entity])

  return (
    <div className="app-shell">
      <Header />

      <main className="content">
        <Overview />
        <section aria-label="Console">
          <ConsoleTable
            entity={entity}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onEdit={(row) => { setEditRow(row); setShowForm(true) }}
            onDelete={() => addToast('Deleted', 'success')}
            onBorrow={(row) => setConfirm({ open: true, action: 'borrow', row })}
            onReturn={(row) => setConfirm({ open: true, action: 'return', row })}
            headerContent={
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label className="muted" htmlFor="entity">Entity</label>
                    <Select id="entity" value={entity} onChange={(e) => setEntity(e.target.value as EntityKey)}>
                      <option value="items">Items</option>
                      <option value="users">Users</option>
                      <option value="borrowings">Borrowings</option>
                      <option value="reservations">Reservations</option>
                      <option value="penalties">Penalties</option>
                      <option value="roles">Roles</option>
                      <option value="categories">Categories</option>
                      <option value="attachments">Attachments</option>
                    </Select>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {selectedIds.length > 0 && (
                    <>
                      <button className="btn" onClick={() => { addToast(`Deleted ${selectedIds.length} rows`, 'success'); setSelectedIds([]) }}>Delete({selectedIds.length})</button>
                      <button className="btn" onClick={() => addToast(`Exported ${selectedIds.length} rows`, 'success')}>Export({selectedIds.length})</button>
                    </>
                  )}
                  <button className="btn" onClick={() => { setEditRow(null); setShowForm(true) }}>Create</button>
                  <button className="btn" onClick={() => setShowCsv(true)}>Import CSV</button>
                  <button className="btn" onClick={() => addToast('Exported CSV', 'success')}>Export CSV</button>
                </div>
              </>
            }
            search={search}
            onSearchChange={setSearch}

          />
        </section>
      </main>
      <UnifiedForm
        open={showForm}
        title={editRow ? `Edit ${entity}` : `Create ${entity}`}
        fields={fields}
        initial={editRow ?? {}}
        onClose={() => setShowForm(false)}
        onSubmit={() => { setShowForm(false); addToast('Saved', 'success') }}
      />
      {(['items','users','borrowings'] as const).includes(entity as any) && (
        <CsvImportModal
          open={showCsv}
          entity={entity as 'items' | 'users' | 'borrowings'}
          onClose={() => setShowCsv(false)}
          onImport={(data) => { setShowCsv(false); addToast(`Imported ${data.rows.length} rows`, 'success') }}
        />
      )}
      <Toaster richColors position="bottom-right" />
      <ConfirmDialog
        open={confirm.open}
        title={confirm.action === 'borrow' ? 'Confirm Borrow' : 'Confirm Return'}
        message={confirm.action === 'borrow' ? 'Proceed with borrowing this item?' : 'Mark this borrowing as returned?'}
        confirmText={confirm.action === 'borrow' ? 'Borrow' : 'Return'}
        onCancel={() => setConfirm({ open: false, action: null })}
        onConfirm={() => { setConfirm({ open: false, action: null }); addToast('Updated', 'success') }}
      />
    </div>
  )
}

export default function App() {
  return (
    <TenantProvider>
      <ConfigProvider>
        <AppShell />
      </ConfigProvider>
    </TenantProvider>
  )
}

// ConsoleTable now lives in components/table/ConsoleTable.tsx
