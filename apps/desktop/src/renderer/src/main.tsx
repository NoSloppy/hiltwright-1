import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './ErrorBoundary';
// The app's typefaces ship inside it (all SIL Open Font License), so it looks the same on every PC.
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
// Faces only some themes use: slanted headings (Crait), a mincho serif (Ronin), a geometric sans (Coruscant).
import '@fontsource/barlow-condensed/600-italic.css';
import '@fontsource/shippori-mincho/latin-700.css';
import '@fontsource/josefin-sans/latin-600.css';
import './styles.css';
import './themes.css';
import { applyTheme } from './theme';

// Before anything is drawn: the theme the window opened in.
applyTheme(window.hiltwright?.theme.initial);
// Dev aid: hiltwrightTheme('hull') shows a theme without saving it, for screenshots.
if (import.meta.env.DEV) (window as unknown as { hiltwrightTheme?: (id: string) => string }).hiltwrightTheme = (id) => applyTheme(id).id;

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
