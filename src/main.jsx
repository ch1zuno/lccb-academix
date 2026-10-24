import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

/* Last line of defence: a render crash must never show a blank white screen
 * during a demo. The fallback keeps the house style and offers a reload. */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('Workspace crashed:', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f4ecdc', color: '#0f2942', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 520, width: '100%', border: '2px solid #0f2942', background: '#fff9ee', padding: 28, boxShadow: '6px 6px 0 #0f2942' }}>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Something tore</p>
          <h1 style={{ margin: '10px 0 6px', fontSize: 26, lineHeight: 1.1 }}>The ledger hit a snag.</h1>
          <p style={{ margin: '0 0 20px', fontSize: 14, opacity: 0.75 }}>
            Reload to return to the last saved state — your session stays signed in.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ border: '2px solid #0f2942', background: '#d4ac0d', color: '#0f2942', padding: '10px 16px', fontWeight: 700, cursor: 'pointer', boxShadow: '3px 3px 0 #0f2942' }}
          >
            Reload workspace
          </button>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
)
