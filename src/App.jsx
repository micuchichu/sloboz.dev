import React, { Component } from 'react';
import SpatialScene from './components/SpatialScene';
import { hideBoot } from './boot';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch() {
    hideBoot();
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#ff5577', padding: '2rem', background: '#030204', height: '100%', fontFamily: 'var(--font-mono)' }}>
          <h2>SYSTEM FAILURE</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.75rem 0 1.25rem' }}>
            The 3D scene couldn't start. Your browser may not support WebGL.
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <SpatialScene />
    </ErrorBoundary>
  );
}

export default App;
