import { useMemo, useState } from 'react'

export interface Pagination {
  page: number
  pageSize: number
}

export interface SortState {
  key: string | null
  dir: 'asc' | 'desc'
}

export default function useTableState<T>(rows: T[], opts?: { externalSearch?: string }) {
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 10 })
  const [sort, setSort] = useState<SortState>({ key: null, dir: 'asc' })
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const activeQuery = (opts?.externalSearch ?? search).trim()
    if (!activeQuery) return rows
    const q = activeQuery.toLowerCase()
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [rows, search, opts?.externalSearch])

  const sorted = useMemo(() => {
    if (!sort.key) return filtered
    const k = sort.key
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...filtered].sort((a: any, b: any) => {
      const av = a[k as any]
      const bv = b[k as any]
      if (av == null && bv == null) return 0
      if (av == null) return -1 * dir
      if (bv == null) return 1 * dir
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }, [filtered, sort])

  const total = sorted.length
  const start = (pagination.page - 1) * pagination.pageSize
  const pageRows = sorted.slice(start, start + pagination.pageSize)

  return {
    pagination,
    setPagination,
    sort,
    setSort,
    selected,
    setSelected,
    search,
    setSearch,
    total,
    pageRows,
  }
}
