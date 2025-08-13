import { useState, type ChangeEvent } from 'react'
import Select from '../primitives/Select'
import ThemeSwitcher from '../primitives/ThemeSwitcher'
import { useTenant } from '../../contexts/TenantContext'

export default function Header() {
  const { organizations, instances, currentOrg, currentInstance, setCurrentOrg, setCurrentInstance } = useTenant()

  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showCreateInst, setShowCreateInst] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newInstName, setNewInstName] = useState('')


  const onOrg = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '__create_org__') {
      setShowCreateOrg(true)
      return
    }
    const org = organizations.find(o => String(o.id) === val) || null
    setCurrentOrg(org)
    setCurrentInstance(null)
  }
  const onInst = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '__create_inst__') {
      setShowCreateInst(true)
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
        <button 
          className="btn" 
          onClick={() => {
            // TODO: Implement logout logic
            console.log('Logout clicked')
          }}
          aria-label="Logout"
          title="Logout"
          style={{ 
            padding: '6px 10px', 
            marginLeft: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={1.5} 
            stroke="currentColor" 
            style={{ width: 18, height: 18, display: 'block' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
          </svg>
        </button>
      </div>

      {showCreateOrg && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowCreateOrg(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Create organization</h3>
            <div className="field">
              <label className="muted" htmlFor="new-org">Name</label>
              <input id="new-org" className="input" placeholder="Organization name" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={() => { setShowCreateOrg(false); setNewOrgName('') }}>Cancel</button>
              <button className="btn" onClick={() => { setShowCreateOrg(false); setNewOrgName('') }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showCreateInst && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowCreateInst(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Create instance</h3>
            <div className="field">
              <label className="muted" htmlFor="new-inst">Name</label>
              <input id="new-inst" className="input" placeholder="Instance name" value={newInstName} onChange={(e) => setNewInstName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={() => { setShowCreateInst(false); setNewInstName('') }}>Cancel</button>
              <button className="btn" onClick={() => { setShowCreateInst(false); setNewInstName('') }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
