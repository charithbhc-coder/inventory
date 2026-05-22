import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Catch any dynamic import failures (stale SW serving old chunk hashes after deploy)
// that escape the lazyWithRetry wrapper, and reload to get fresh index.html.
window.addEventListener('unhandledrejection', (event) => {
  const msg = (event.reason as Error)?.message ?? '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('dynamically imported module')
  ) {
    event.preventDefault();
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
