import type { Column } from './Column'
import Checkbox from '../primitives/Checkbox'
import Select from '../primitives/Select'
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

  // Pagination helpers
  const totalPages = Math.max(1, Math.ceil(state.total / state.pagination.pageSize))
  const goToPage = (page: number) => {
    const clamped = Math.min(totalPages, Math.max(1, page))
    state.setPagination(p => ({ ...p, page: clamped }))
  }

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
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            style={{
              position: 'absolute',
              left: 12,
              width: 18,
              height: 18,
              color: 'var(--text-dim)',
              pointerEvents: 'none'
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            id="table-search"
            className="input"
            placeholder="Search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: 200,
              paddingLeft: 38
            }}
          />
        </div>
      </div>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'center', padding: '8px 10px', width: 44 }}>
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
                <td style={{ padding: '8px 10px', textAlign: 'center', width: 44 }}><span className="skeleton" style={{ display: 'inline-block', width: 16, height: 16 }} /></td>
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
                  <td style={{ padding: '8px 10px', textAlign: 'center', width: 44 }}>
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
          flexWrap: 'wrap',
          gap: 10
        }}>
          <div className="muted">{state.total} results</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 auto', justifyContent: 'flex-end', flexWrap: 'wrap', minWidth: 0 }}>
            <label className="muted" htmlFor="page-size">Rows</label>
            <Select id="page-size" value={state.pagination.pageSize} onChange={(e) => state.setPagination(p => ({ ...p, pageSize: Number(e.target.value), page: 1 }))}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </Select>
            <button className="btn" onClick={() => goToPage(state.pagination.page - 1)} aria-label="Previous page" disabled={state.pagination.page <= 1}>Prev</button>
            <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px' }}>
              <span>Page</span>
              <input
                type="number"
                className="input"
                style={{ width: 64, padding: '6px 8px' }}
                min={1}
                max={totalPages}
                value={state.pagination.page}
                onChange={(e) => goToPage(Number(e.target.value) || 1)}
                aria-label="Page number"
              />
              <span>of&nbsp;{totalPages}</span>
            </div>
            <button className="btn" onClick={() => goToPage(state.pagination.page + 1)} aria-label="Next page" disabled={state.pagination.page >= totalPages}>Next</button>
          </div>
        </div>
      </div>
  )
}
