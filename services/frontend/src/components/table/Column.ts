export type CellRender<T> = (row: T) => any

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: number | string
  sortable?: boolean
  // Whether this column participates in text search
  // Defaults to true; set to false for non-text or sensitive fields
  searchable?: boolean
  render?: CellRender<T>
}
