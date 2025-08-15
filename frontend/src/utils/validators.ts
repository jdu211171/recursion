export type Rule = 'required' | 'number' | 'date'

export function validate(value: any, rules: Rule[]): string | null {
  for (const r of rules) {
    if (r === 'required') {
      if (value == null || String(value).trim() === '') return 'Required'
    } else if (r === 'number') {
      if (value !== '' && isNaN(Number(value))) return 'Must be a number'
    } else if (r === 'date') {
      if (value && isNaN(Date.parse(String(value)))) return 'Invalid date'
    }
  }
  return null
}

