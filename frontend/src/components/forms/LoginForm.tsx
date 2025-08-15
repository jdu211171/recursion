import { useState } from 'react'
import authService from '../../services/auth'
import Button from '../primitives/Button'

interface Props {
  onSuccess: () => void
  onError?: (msg: string) => void
}

export default function LoginForm({ onSuccess, onError }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await authService.login(email, password)
      onSuccess()
    } catch (err: any) {
      const msg = err?.message || 'Login failed'
      setError(msg)
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
      <form onSubmit={submit} className="card" style={{ width: 360 }}>
        <h3 style={{ marginTop: 0 }}>Sign in</h3>
        <div className="field">
          <label className="muted" htmlFor="login-email">Username (Email)</label>
          <input
            id="login-email"
            type="text"
            className="input"
            placeholder="Username (Email)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label className="muted" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="muted" role="alert" style={{ color: '#ff6b6b' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <Button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
        </div>
      </form>
    </div>
  )
}

