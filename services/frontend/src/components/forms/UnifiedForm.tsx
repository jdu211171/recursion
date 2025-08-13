import { useEffect, useMemo, useState } from 'react'
import Modal from '../primitives/Modal'
import Input from '../primitives/Input'
import Button from '../primitives/Button'
import { validate } from '../../utils/validators'

export type FieldType = 'text' | 'number' | 'date' | 'select'

export interface FieldMeta {
  name: string
  label: string
  type: FieldType
  required?: boolean
  options?: { label: string; value: string }[]
}

interface Props<T> {
  open: boolean
  title: string
  fields: FieldMeta[]
  initial?: Partial<T>
  onClose: () => void
  onSubmit: (values: Record<string, any>) => void
}

export default function UnifiedForm<T>({ open, title, fields, initial = {}, onClose, onSubmit }: Props<T>) {
  const [values, setValues] = useState<Record<string, any>>(initial)
  useEffect(() => { setValues(initial) }, [open])
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  const rules = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const f of fields) {
      const arr: string[] = []
      if (f.required) arr.push('required')
      if (f.type === 'number') arr.push('number')
      if (f.type === 'date') arr.push('date')
      map[f.name] = arr
    }
    return map
  }, [fields])

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={(e: React.FormEvent) => {
        e.preventDefault()
        const next: Record<string, string | null> = {}
        for (const f of fields) {
          next[f.name] = validate(values[f.name], rules[f.name] as any)
        }
        setErrors(next)
        const hasError = Object.values(next).some(Boolean)
        if (!hasError) onSubmit(values)
      }}>
        <div className="grid">
          {fields.map((f) => (
            <div key={f.name} className="col-6 field">
              <label htmlFor={`f_${f.name}`} className="muted">{f.label}{f.required && ' *'}</label>
              {f.type === 'select' ? (
                <select id={`f_${f.name}`} className="select" value={values[f.name] ?? ''}
                        onChange={(e) => setValues(v => ({ ...v, [f.name]: e.target.value }))} required={f.required}>
                  <option value="">Select...</option>
                  {(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <Input id={`f_${f.name}`} required={f.required} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                       value={values[f.name] ?? ''}
                       onChange={(e) => setValues(v => ({ ...v, [f.name]: e.target.value }))} />
              )}
              {errors[f.name] && <small className="muted" role="alert">{errors[f.name]}</small>}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  )
}
