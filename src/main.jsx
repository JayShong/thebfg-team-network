import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import './styles/index.css'

// Global Diagnostic Utilities
window.bfgCheckBlank = () => {
  const root = document.getElementById('root');
  return !root || root.children.length === 0;
};

window.repairApp = () => {
  console.warn("Manual Repair Triggered");
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = '/';
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
