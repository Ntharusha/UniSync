import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Intercept relative fetch calls to prepend backend API URL when configured (e.g. on Vercel)
const originalFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (baseUrl) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      input = baseUrl + input;
    } else if (input instanceof URL && input.pathname.startsWith('/api/')) {
      input = new URL(baseUrl + input.pathname + input.search);
    } else if (input instanceof Request && input.url.startsWith('/api/')) {
      input = new Request(baseUrl + new URL(input.url).pathname + new URL(input.url).search, input);
    }
  }
  return originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
