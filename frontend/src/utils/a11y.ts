export function trapFocus(container: HTMLElement) {
  const focusable = container.querySelectorAll<HTMLElement>(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Tab') return
    if (!first || !last) return
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault(); last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }
  }
  container.addEventListener('keydown', onKey)
  return () => container.removeEventListener('keydown', onKey)
}

