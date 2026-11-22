// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './lib/palettes'; // sets data-palette before the first paint
import App from './App';
import { hideBoot } from './boot';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Safety net: never leave the boot screen up if the 3D scene fails to start.
setTimeout(hideBoot, 10000);
