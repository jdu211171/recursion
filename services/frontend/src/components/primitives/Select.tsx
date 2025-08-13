import type { SelectHTMLAttributes } from 'react'

type Props = SelectHTMLAttributes<HTMLSelectElement>

export default function Select(props: Props) {
  const { className = '', ...rest } = props
  return <select {...rest} className={`select ${className}`.trim()} />
}

