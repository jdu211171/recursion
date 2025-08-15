import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement>

export default function Input(props: Props) {
  const { className = '', ...rest } = props
  return <input {...rest} className={`input ${className}`.trim()} />
}

