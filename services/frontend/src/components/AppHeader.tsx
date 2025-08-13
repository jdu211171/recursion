import { useState } from 'react'
import { useTenant } from '../contexts-lite/TenantLite'

export default function AppHeader() {
  const { organizations, instances, currentOrg, currentInstance, setCurrentOrg, setCurrentInstance } = useTenant()
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showCreateInstance, setShowCreateInstance] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [instanceName, setInstanceName] = useState('')

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '__create__') {
      setShowCreateOrg(true)
      return
    }
    const org = organizations.find(o => String(o.id) === val) || null
    setCurrentOrg(org)
    setCurrentInstance(null)
  }

  const handleInstanceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '__create__') {
      setShowCreateInstance(true)
      return
    }
    const inst = instances.find(i => String(i.id) === val) || null
    setCurrentInstance(inst)
  }

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 220 }}>
        <span className="dot" />
        <strong>Header</strong>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="muted" htmlFor="org-select">Organization</label>
        <select id="org-select" className="select" onChange={handleOrgChange} value={currentOrg?.id ? String(currentOrg.id) : ''}>
          <option value="" disabled>Select org</option>
          {organizations.map(o => (
            <option key={o.id} value={String(o.id)}>{o.name}</option>
          ))}
          <option value="__create__">+ Create</option>
        </select>

        <label className="muted" htmlFor="inst-select">Instance</label>
        <select id="inst-select" className="select" onChange={handleInstanceChange} value={currentInstance?.id ? String(currentInstance.id) : ''} disabled={!currentOrg}>
          <option value="" disabled>Select instance</option>
          {instances.map(i => (
            <option key={i.id} value={String(i.id)}>{i.name}</option>
          ))}
          <option value="__create__">+ Create</option>
        </select>

        {/* Simple inline create controls (placeholder) */}
        {showCreateOrg && (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input className="input" placeholder="New org name" value={orgName} onChange={e => setOrgName(e.target.value)} />
            <button className="btn" onClick={() => { setShowCreateOrg(false); setOrgName(''); }}>Save</button>
            <button className="btn" onClick={() => { setShowCreateOrg(false); }}>Cancel</button>
          </span>
        )}
        {showCreateInstance && (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input className="input" placeholder="New instance name" value={instanceName} onChange={e => setInstanceName(e.target.value)} />
            <button className="btn" onClick={() => { setShowCreateInstance(false); setInstanceName(''); }}>Save</button>
            <button className="btn" onClick={() => { setShowCreateInstance(false); }}>Cancel</button>
          </span>
        )}
      </div>
    </div>
  )
}
