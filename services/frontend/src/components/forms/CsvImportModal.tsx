import { useMemo, useState } from 'react'
import Modal from '../primitives/Modal'
import Button from '../primitives/Button'
import Radio from '../primitives/Radio'
import { parseCsvFile, type ParsedCsv } from '../../utils/csv'

interface Props {
  open: boolean
  entity: 'items' | 'users' | 'borrowings'
  onClose: () => void
  onImport: (data: ParsedCsv) => void
}

export default function CsvImportModal({ open, entity, onClose, onImport }: Props) {
  const [csv, setCsv] = useState<ParsedCsv | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importMode, setImportMode] = useState<'create' | 'update'>('create')

  const columnsHint = useMemo(() => {
    if (entity === 'users') return 'Expected columns: id,name,contact,status'
    if (entity === 'borrowings') return 'Expected columns: id,itemId,userId,startDate,dueDate,returnedAt'
    return 'Expected columns: id,name,totalCount,availableCount,status'
  }, [entity])

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const parsed = await parseCsvFile(file)
      setCsv(parsed)
      setError(null)
    } catch (err) {
      setError('Failed to parse CSV.')
    }
  }

  const targetFields = useMemo(() => {
    if (entity === 'users') return ['id','name','contact','status','blacklistUntil']
    if (entity === 'borrowings') return ['id','itemId','userId','startDate','dueDate','returnedAt']
    return ['id','name','totalCount','availableCount','status']
  }, [entity])

  const previewRows = (csv?.rows || []).slice(0, 5)

  const dryRun = useMemo(() => {
    if (!csv) return null as null | { adds: number; updates: number; errors: { row: number; message: string }[] }
    const errors: { row: number; message: string }[] = []
    let adds = 0
    let updates = 0
    const seenIds = new Set<string>()

    for (let i = 0; i < csv.rows.length; i++) {
      const raw = csv.rows[i]
      const mapped: Record<string, string> = {}
      for (const [from, to] of Object.entries(mapping)) {
        if (!to) continue
        mapped[to] = String(raw[from] ?? '').trim()
      }
      const rowNum = i + 2 // account for header row

      if (importMode === 'update') {
        const id = mapped['id']
        if (!id) {
          errors.push({ row: rowNum, message: 'Missing id for update' })
          continue
        }
        if (seenIds.has(id)) {
          errors.push({ row: rowNum, message: `Duplicate id in file: ${id}` })
          continue
        }
        seenIds.add(id)
        updates++
      } else {
        // create mode: count row as add if it has any non-empty mapped value besides id
        const hasData = targetFields.some(tf => tf !== 'id' && (mapped[tf]?.length ?? 0) > 0)
        if (hasData) adds++
      }
    }
    return { adds, updates, errors }
  }, [csv, mapping, importMode, targetFields])

  return (
    <Modal open={open} onClose={onClose} title={`Import CSV — ${entity}`}>
      <div className="field">
        <label htmlFor="csv-file" className="muted">CSV File</label>
        <input id="csv-file" type="file" accept=".csv,text/csv" onChange={onFileChange} />
        <small className="muted">{columnsHint}</small>
      </div>
      {error && <p className="muted" role="alert">{error}</p>}
      <div className="field" style={{ marginTop: 16 }}>
        <label className="muted">Import Mode</label>
        <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Radio
              name="importMode"
              value="create"
              checked={importMode === 'create'}
              onChange={() => setImportMode('create')}
            />
            <span>Create (insert new records)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Radio
              name="importMode"
              value="update"
              checked={importMode === 'update'}
              onChange={() => setImportMode('update')}
            />
            <span>Update (match existing by id)</span>
          </label>
        </div>
      </div>
      {csv && (
        <div style={{ marginTop: 10 }}>
          <div className="muted">Detected {csv.rows.length} rows, {csv.headers.length} columns</div>
          <div className="grid" style={{ marginTop: 8 }}>
            <div className="col-12 card">
              <h4 style={{marginTop:0}}>Map Columns</h4>
              <div className="grid">
                {csv.headers.map((h) => (
                  <div key={h} className="col-6 field">
                    <label className="muted">CSV: {h}</label>
                    <select className="select" value={mapping[h] || ''} onChange={(e) => setMapping(m => ({ ...m, [h]: e.target.value }))}>
                      <option value="">Ignore</option>
                      {targetFields.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-12 card">
              <h4 style={{marginTop:0}}>Preview</h4>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    {targetFields.map(tf => <th key={tf} style={{ textAlign: 'left', padding: '6px 8px' }}>{tf}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i}>
                      {targetFields.map(tf => {
                        const from = Object.keys(mapping).find(k => mapping[k] === tf)
                        return <td key={tf} style={{ padding: '6px 8px' }}>{from ? r[from] : ''}</td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dry-run summary */}
          {dryRun && (
            <div className="card" style={{ marginTop: 10 }}>
              <h4 style={{ marginTop: 0 }}>Dry-run summary</h4>
              <div className="grid">
                <div className="col-4"><strong>Adds:</strong> {dryRun.adds}</div>
                <div className="col-4"><strong>Updates:</strong> {dryRun.updates}</div>
                <div className="col-4"><strong>Errors:</strong> {dryRun.errors.length}</div>
              </div>
              {dryRun.errors.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div className="muted">First few errors:</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {dryRun.errors.slice(0, 5).map((e, idx) => (
                      <li key={idx}>Row {e.row}: {e.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

      </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            if (csv) {
              const payload = Object.assign({}, csv, { importMode } as any)
              onImport(payload as any)
            }
          }}
          disabled={!csv || (importMode === 'update' && (dryRun?.errors.length ?? 0) > 0)}
        >
          Commit
        </Button>
      </div>
    </Modal>
  )
}
