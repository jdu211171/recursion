export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
}

export async function parseCsvFile(file: File): Promise<ParsedCsv> {
  const text = await file.text()
  return parseCsv(text)
}

export function parseCsv(text: string): ParsedCsv {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(Boolean)
  if (!lines.length) return { headers: [], rows: [] }
  const headers = splitCsvLine(lines[0])
  const rows = lines.slice(1).map(line => {
    const cells = splitCsvLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = cells[i] ?? '' })
    return obj
  })
  return { headers, rows }
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ } // escaped quote
      else { inQuotes = !inQuotes }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

