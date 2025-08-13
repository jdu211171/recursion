import type { ChangeEvent } from 'react'
import Select from '../primitives/Select'
import ThemeSwitcher from '../primitives/ThemeSwitcher'
import { useTenant } from '../../contexts/TenantContext'

export default function Header() {
  const { organizations, instances, currentOrg, currentInstance, setCurrentOrg, setCurrentInstance } = useTenant()

  const onOrg = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '__create_org__') {
      // TODO: open create organization modal
      return
    }
    const org = organizations.find(o => String(o.id) === val) || null
    setCurrentOrg(org)
    setCurrentInstance(null)
  }
  const onInst = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '__create_inst__') {
      // TODO: open create instance modal
      return
    }
    const inst = instances.find(i => String(i.id) === val) || null
    setCurrentInstance(inst)
  }

  return (
    <div className="app-header">
      <div>
        <h1 className="title"><span className="dot" /> <span style={{ color: '#ffe27d', textShadow: '0 0 12px rgba(var(--glow-strong), 0.65)' }}>Recursion</span></h1>
        <p className="subtitle">One‑Screen Table Console</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <label className="muted" htmlFor="org">Org</label>
          <Select id="org" value={currentOrg?.id ? String(currentOrg.id) : ''} onChange={onOrg}>
            <option value="">Select org</option>
            <option value="__create_org__">+ Create new</option>
            {organizations.map(o => <option key={o.id} value={String(o.id)}>{o.name}</option>)}
          </Select>
          <label className="muted" htmlFor="inst">Instance</label>
          <Select id="inst" value={currentInstance?.id ? String(currentInstance.id) : ''} onChange={onInst} disabled={!currentOrg}>
            <option value="">Select instance</option>
            <option value="__create_inst__">+ Create new</option>
            {instances.map(i => <option key={i.id} value={String(i.id)}>{i.name}</option>)}
          </Select>
        </div>
        <ThemeSwitcher />
      </div>
    </div>
  )
}
