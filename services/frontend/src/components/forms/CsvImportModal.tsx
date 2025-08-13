import { useMemo, useState } from 'react'
import Modal from '../primitives/Modal'
import Button from '../primitives/Button'
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

  return (
    <Modal open={open} onClose={onClose} title={`Import CSV — ${entity}`}>
      <div className="field">
        <label htmlFor="csv-file" className="muted">CSV File</label>
        <input id="csv-file" type="file" accept=".csv,text/csv" onChange={onFileChange} />
        <small className="muted">{columnsHint}</small>
      </div>
      {error && <p className="muted" role="alert">{error}</p>}
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
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (csv) onImport(csv) }} disabled={!csv}>Commit</Button>
      </div>
    </Modal>
  )
}
