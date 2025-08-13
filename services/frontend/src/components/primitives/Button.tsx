import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type Props = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: 'solid' | 'ghost'
}

export default function Button({ variant = 'solid', children, className = '', ...rest }: Props) {
  const base = variant === 'ghost' ? 'tab-btn' : 'btn'
  return (
    <button {...rest} className={`${base} ${className}`.trim()}>
      {children}
    </button>
  )
}

