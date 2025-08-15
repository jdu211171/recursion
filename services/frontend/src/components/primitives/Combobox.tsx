import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'

export type ComboOption<T = unknown> = { value: string; label: string; data?: T }

interface Props<T = unknown> {
  id?: string
  className?: string
  style?: CSSProperties
  disabled?: boolean
  placeholder?: string
  ariaLabel?: string

  options: Array<ComboOption<T>>
  value: string | null
  onChange: (value: string | null, option?: ComboOption<T>) => void

  inputValue: string
  onInputValueChange: (v: string) => void

  loading?: boolean
  emptyMessage?: string
  renderOption?: (opt: ComboOption<T>, active: boolean, selected: boolean) => ReactNode
}

export default function Combobox<T = unknown>({ id, className = '', style, disabled, placeholder = 'Search…', ariaLabel, options, value, onChange, inputValue, onInputValueChange, loading = false, emptyMessage = 'No results', renderOption }: Props<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const selectedIndex = useMemo(() => options.findIndex(o => o.value === value), [options, value])

  // Positioning logic similar to custom Select
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number; placeAbove: boolean } | null>(null)
  useEffect(() => {
    if (!open) { setPanelPos(null); return }
    const compute = () => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const margin = 6
      const estimatedHeight = 280
      const spaceBelow = window.innerHeight - rect.bottom - margin
      const placeAbove = spaceBelow < 160
      const top = placeAbove ? Math.max(8, rect.top - margin - estimatedHeight) : Math.min(window.innerHeight - 8, rect.bottom + margin)
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))
      setPanelPos({ top, left, width: rect.width, placeAbove })
    }
    compute()
    const onScroll = () => compute()
    const onResize = () => compute()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  // Outside click close
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (!containerRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    // Reset activeIndex on options change/open
    setActiveIndex(options.length > 0 ? Math.min(options.length - 1, Math.max(0, selectedIndex)) : -1)
  }, [open, options, selectedIndex])

  const listId = `${id || 'combobox'}-listbox`

  const commit = (idx: number) => {
    if (disabled) return
    const opt = options[idx]
    if (!opt) return
    onChange(opt.value, opt)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative', width: style?.width ?? '100%', ...style }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          id={id}
          className="input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          autoComplete="off"
          placeholder={placeholder}
          disabled={disabled}
          value={inputValue}
          onChange={(e) => { onInputValueChange(e.target.value); if (!open) setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActiveIndex(i => Math.min((i < 0 ? -1 : i) + 1, options.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
            else if (e.key === 'Enter') { if (open && activeIndex >= 0) { e.preventDefault(); commit(activeIndex) } }
            else if (e.key === 'Escape') { setOpen(false) }
          }}
          style={{ paddingRight: 34 }}
        />
        {/* Chevron */}
        <button
          type="button"
          aria-label={open ? 'Close' : 'Open'}
          className="tab-btn"
          onClick={() => setOpen(o => !o)}
          disabled={disabled}
          style={{ position: 'absolute', right: 2, top: 2, height: 'calc(100% - 4px)' }}
        >
          ▾
        </button>
      </div>

      {open && panelPos && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          id={listId}
          style={{
            position: 'fixed',
            zIndex: 10000,
            top: panelPos.top,
            left: panelPos.left,
            width: panelPos.width,
            padding: 6,
            borderRadius: 12,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
            backdropFilter: 'blur(14px) saturate(120%)',
            WebkitBackdropFilter: 'blur(14px) saturate(120%)',
            maxHeight: 280,
            overflowY: 'auto'
          }}
        >
          {loading && (
            <div className="muted" style={{ padding: '10px 12px' }}>Searching…</div>
          )}
          {!loading && options.length === 0 && (
            <div className="muted" style={{ padding: '10px 12px' }}>{emptyMessage}</div>
          )}
          {!loading && options.map((o, idx) => {
            const active = idx === activeIndex
            const selected = o.value === value
            return (
              <div
                key={`${o.value}-${idx}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={() => commit(idx)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  cursor: 'pointer',
                  background: active
                    ? 'linear-gradient(180deg, rgba(255, 235, 160, 0.18), rgba(255, 235, 160, 0.10))'
                    : 'transparent',
                  border: active ? '1px solid rgba(255, 220, 130, 0.50)' : '1px solid transparent',
                  boxShadow: active ? '0 0 0 3px rgba(var(--glow-strong), 0.12) inset' : 'none'
                }}
              >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {renderOption ? renderOption(o, active, selected) : o.label}
                </span>
                {selected && <span style={{ width: 8, height: 8, borderRadius: 999, background: '#ffe27d', boxShadow: '0 0 8px rgba(var(--glow-strong), 0.65)' }} />}
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}

