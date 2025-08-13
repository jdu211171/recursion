export type CellRender<T> = (row: T) => any

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: number | string
  sortable?: boolean
  render?: CellRender<T>
}

