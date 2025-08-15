import type { PropsWithChildren, HTMLAttributes } from 'react'

type Props = PropsWithChildren<HTMLAttributes<HTMLDivElement>>

export default function Card({ className = '', children, ...rest }: Props) {
  return (
    <div {...rest} className={`card ${className}`.trim()}>
      {children}
    </div>
  )
}

