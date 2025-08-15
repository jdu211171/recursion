import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Lending Management System</h1>
        <div className="header-controls">
          <span>Organization: Demo Org</span>
          <span>Instance: Default</span>
        </div>
      </header>
      
      <main className="app-main">
        <div className="toolbar">
          <h2>Items</h2>
          <div className="toolbar-actions">
            <button>Create New</button>
            <button>Import CSV</button>
            <button>Export CSV</button>
          </div>
        </div>
        
        <div className="content">
          <div className="table-container">
            <p>Welcome to the Lending Management System</p>
            <p>This is a single-page application for managing lending operations.</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App