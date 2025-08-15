import { useState } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'

interface Props {
  open: boolean
  onClose: () => void
}

export default function FeedbackModalNew({ open, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const submit = () => {
    // Placeholder: will wire to backend later
    console.log('Feedback submit', { email, message })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Send Feedback">
      <div className="field">
        <label htmlFor="fb-email" className="muted">Email (optional)</label>
        <Input id="fb-email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="spacer" />
      <div className="field">
        <label htmlFor="fb-msg" className="muted">Message</label>
        <textarea id="fb-msg" className="input" rows={5} placeholder="Tell us what’s on your mind" value={message} onChange={e => setMessage(e.target.value)} />
      </div>
      <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
        <Button onClick={onClose} variant="ghost">Cancel</Button>
        <Button onClick={submit} disabled={!message.trim()}>Submit</Button>
      </div>
    </Modal>
  )
}

