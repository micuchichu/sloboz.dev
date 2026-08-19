import React, { Suspense, Component } from 'react';
import SpatialScene from './components/SpatialScene';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', padding: '2rem', background: '#000', height: '100vh', fontFamily: 'monospace' }}>
          <h2>SYSTEM FAILURE</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <ErrorBoundary>
        <Suspense fallback={<div style={{ color: '#fff', padding: '2rem' }}>INITIALIZING 3D ENVIRONMENT...</div>}>
          <SpatialScene />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export default App;
