import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './ErrorBoundary';
import './styles.css';

// Faults nobody caught go to the console, which main writes into the run log.
window.addEventListener('error', (e) => console.error(`[renderer] uncaught: ${e.message}${e.error instanceof Error && e.error.stack ? `\n${e.error.stack}` : ''}`));
window.addEventListener('unhandledrejection', (e) => {
  const r: unknown = e.reason;
  console.error(`[renderer] unhandled rejection: ${r instanceof Error ? `${r.message}\n${r.stack ?? ''}` : String(r)}`);
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary what="Hiltwright"><App /></ErrorBoundary>
  </React.StrictMode>,
);
