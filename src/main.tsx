import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Redirect Supabase invitation/recovery callbacks that land on the wrong page
// back to the setup page. Supabase appends tokens to the URL hash; if the
// email link pointed to "/" (the old default), route them to /admin/setup
// before the app mounts so the tokens are preserved and processed there.
if (window.location.hash.includes('type=invite') && !window.location.pathname.startsWith('/admin/setup')) {
  const setupUrl = new URL('/admin/setup', window.location.origin);
  setupUrl.hash = window.location.hash;
  window.history.replaceState(null, '', setupUrl.toString());
}

// Register the service worker for offline shell + public listing caching.
// Failures are non-fatal — the app still works without it.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
