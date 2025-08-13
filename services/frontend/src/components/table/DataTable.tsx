import type { Column } from './Column'
import Checkbox from '../primitives/Checkbox'
import useTableState from './useTableState'
import type { ReactNode } from 'react'

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  onRowAction?: (action: string, row: T) => void
  selectedIds?: Array<string | number>
  onSelectionChange?: (ids: Array<string | number>) => void
  rowActions?: (row: T) => { id: string; label: string }[]
  loading?: boolean
  headerContent?: ReactNode
  search?: string
  onSearchChange?: (v: string) => void
}

export default function DataTable<T>({ columns, rows, rowKey, onRowAction, selectedIds, onSelectionChange, rowActions, loading, headerContent, search, onSearchChange }: Props<T>) {
  const state = useTableState(rows, { externalSearch: typeof search === 'string' ? search : undefined })
  const selectedSet = new Set(selectedIds ?? Array.from(state.selected))
  const allSelected = state.pageRows.every(r => selectedSet.has(rowKey(r))) && state.pageRows.length > 0

  const toggleAll = () => {
    const next = new Set(selectedSet)
    if (allSelected) {
      state.pageRows.forEach(r => next.delete(rowKey(r)))
    } else {
      state.pageRows.forEach(r => next.add(rowKey(r)))
    }
    if (onSelectionChange) onSelectionChange(Array.from(next))
    else state.setSelected(next)
  }

  const toggleOne = (id: string | number) => {
    const next = new Set(selectedSet)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    if (onSelectionChange) onSelectionChange(Array.from(next))
    else state.setSelected(next)
  }

  // Search: allow controlled value via props
  const query = typeof search === 'string' ? search : state.search
  const setQuery = (v: string) => { if (onSearchChange) onSearchChange(v); else state.setSearch(v) }

  return (
    <div className="card" role="region" aria-label="Data table">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        
        gap: 12
      }}>
        {headerContent}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            id="table-search"
            className="input"
            placeholder="Search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: 200 }}
          />
        </div>
      </div>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px 16px' }}>
                <Checkbox aria-label="Select all" checked={allSelected} onChange={toggleAll as any} />
              </th>
              {columns.map((c) => (
                <th key={String(c.key)} scope="col" style={{ textAlign: 'left', padding: '12px 16px', cursor: c.sortable ? 'pointer' : 'default', userSelect: 'none' }}
                    onClick={() => c.sortable && state.setSort(s => ({ key: String(c.key), dir: s.key === String(c.key) && s.dir === 'asc' ? 'desc' : 'asc' }))}>
                  {c.header}{c.sortable && state.sort.key === String(c.key) && (state.sort.dir === 'asc' ? ' ▲' : ' ▼')}
                </th>
              ))}
              <th style={{ width: 1 }} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: Math.min(10, state.pagination.pageSize) }).map((_, i) => (
              <tr key={`s-${i}`}>
                <td style={{ padding: '12px 16px' }}><span className="skeleton" style={{ display: 'inline-block', width: 16, height: 16 }} /></td>
                {columns.map((_, idx) => (
                  <td key={idx} style={{ padding: '12px 16px' }}>
                    <span className="skeleton" style={{ display: 'inline-block', width: '70%', height: 10 }} />
                  </td>
                ))}
                <td style={{ padding: '12px 16px' }} />
              </tr>
            ))}
            {!loading && state.pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} style={{ padding: '14px 16px' }} className="muted">No rows</td>
              </tr>
            )}
            {!loading && state.pageRows.map((r) => {
              const id = rowKey(r)
              return (
                <tr key={String(id)}>
                  <td style={{ padding: '12px 16px' }}>
                    <Checkbox aria-label={`Select row ${id}`} checked={selectedSet.has(id)} onChange={() => toggleOne(id)} />
                  </td>
                  {columns.map((c) => (
                    <td key={String(c.key)} style={{ padding: '12px 16px' }}>
                      {c.render ? c.render(r) : String((r as any)[c.key as any] ?? '')}
                    </td>
                  ))}
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    {onRowAction && (
                      <>
                        {(rowActions ? rowActions(r) : [{ id: 'edit', label: 'Edit' }, { id: 'delete', label: 'Delete' }]).map(a => (
                          <button key={a.id} className="btn" onClick={() => onRowAction(a.id, r)} style={{ marginRight: 6 }}>{a.label}</button>
                        ))}
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          
        }}>
          <div className="muted">{state.total} results</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="muted" htmlFor="page-size">Rows</label>
            <select id="page-size" className="select" value={state.pagination.pageSize} onChange={(e) => state.setPagination(p => ({ ...p, pageSize: Number(e.target.value), page: 1 }))}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <button className="btn" onClick={() => state.setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))} aria-label="Previous page">Prev</button>
            <div className="muted" style={{ padding: '0 10px' }}>Page {state.pagination.page}</div>
            <button className="btn" onClick={() => state.setPagination(p => ({ ...p, page: p.page + 1 }))} aria-label="Next page">Next</button>
          </div>
        </div>
      </div>
  )
}
