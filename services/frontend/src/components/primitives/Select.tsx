import { Children, isValidElement, useEffect, useMemo, useRef, useState, type ReactNode, type SelectHTMLAttributes } from 'react'

type Props = SelectHTMLAttributes<HTMLSelectElement>

type OptionDef = {
  value: string
  label: ReactNode
  disabled?: boolean
}

function getOptions(children: ReactNode): OptionDef[] {
  const opts: OptionDef[] = []
  Children.forEach(children, (child: unknown) => {
    if (isValidElement(child) && (child.type as any) === 'option') {
      const el = child as React.ReactElement<any>
      const { value, disabled } = (el.props as any)
      const label = (el.props as any).children as ReactNode
      opts.push({ value: value != null ? String(value) : '', label, disabled })
    }
  })
  return opts
}

export default function Select(props: Props) {
  const { className = '', style, children, disabled, onChange, value, defaultValue, id, name, ...rest } = props

  const opts = useMemo(() => getOptions(children), [children])

  const [internalValue, setInternalValue] = useState<string>(() => {
    if (value != null) return String(value)
    if (defaultValue != null) return String(defaultValue)
    return ''
  })
  // Sync when controlled
  useEffect(() => {
    if (value != null) setInternalValue(String(value))
  }, [value])

  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hiddenRef = useRef<HTMLSelectElement>(null)

  const currentValue = value != null ? String(value) : internalValue
  const currentLabel = useMemo(() => {
    const m = opts.find(o => String(o.value) === currentValue)
    return m?.label ?? (opts.length > 0 ? opts.find(o => String(o.value) === '')?.label : null)
  }, [opts, currentValue])

  // Close when clicking outside
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const commitChange = (next: string) => {
    if (disabled) return
    // Update hidden native select for form submission
    if (hiddenRef.current) {
      hiddenRef.current.value = next
    }
    // Uncontrolled update
    if (value == null) setInternalValue(next)
    // Notify consumer
    if (onChange && hiddenRef.current) {
      const evt = { target: hiddenRef.current } as unknown as React.ChangeEvent<HTMLSelectElement>
      onChange(evt)
    }
    setOpen(false)
  }

  const listId = `${id || name || 'select'}-listbox`

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', minWidth: 'min(160px, 100%)', width: style?.width }}>

      {/* Visible custom control */}
      <div
        ref={wrapperRef}
        id={id ? `${id}__display` : undefined}
        role="combobox"
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) }
          if (e.key === 'Escape') setOpen(false)
        }}
        className={`select ${className}`.trim()}
        style={{
          ...style,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          paddingRight: 36, // room for chevron from CSS
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentLabel ?? <span className="muted">Select…</span>}
        </span>
      </div>

      {/* Dropdown menu */}
      {open && !disabled && (
        <div
          role="listbox"
          id={listId}
          aria-activedescendant={undefined}
          style={{
            position: 'absolute',
            zIndex: 1000,
            left: 0,
            right: 0,
            marginTop: 6,
            padding: 6,
            borderRadius: 12,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
            backdropFilter: 'blur(14px) saturate(120%)',
            maxHeight: 280,
            overflowY: 'auto'
          }}
        >
          {opts.map((o, idx) => {
            const selected = String(o.value) === currentValue
            return (
              <div
                key={`${String(o.value)}-${idx}`}
                role="option"
                aria-selected={selected}
                onClick={() => !o.disabled && commitChange(String(o.value))}
                onMouseDown={(e) => e.preventDefault()} // prevent focus loss flicker
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  cursor: o.disabled ? 'not-allowed' : 'pointer',
                  color: o.disabled ? 'var(--text-dim)' : 'var(--text)',
                  background: selected
                    ? 'linear-gradient(180deg, rgba(255, 235, 160, 0.18), rgba(255, 235, 160, 0.10))'
                    : 'transparent',
                  border: selected ? '1px solid rgba(255, 220, 130, 0.50)' : '1px solid transparent',
                  boxShadow: selected ? '0 0 0 3px rgba(var(--glow-strong), 0.12) inset' : 'none'
                }}
              >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span>
                {selected && <span style={{ width: 8, height: 8, borderRadius: 999, background: '#ffe27d', boxShadow: '0 0 8px rgba(var(--glow-strong), 0.65)' }} />}
              </div>
            )
          })}
        </div>
      )}

      {/* Hidden native select for forms and accessibility; keep original id/name */}
      <select
        {...rest}
        id={id}
        name={name}
        ref={hiddenRef}
        value={currentValue}
        onChange={(e) => {
          // Keep parity if someone changes it programmatically
          if (value == null) setInternalValue(e.target.value)
          onChange?.(e)
        }}
        disabled={disabled}
        aria-hidden
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, margin: 0, padding: 0, border: 0 }}
      >
        {children}
      </select>
    </div>
  )
}
