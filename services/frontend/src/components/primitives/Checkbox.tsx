import type { InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export default function Checkbox(props: Props) {
  const { className = '', ...rest } = props
  return <input type="checkbox" {...rest} className={`checkbox ${className}`.trim()} />
}

