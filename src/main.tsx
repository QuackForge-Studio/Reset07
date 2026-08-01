import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './styles/index.css';
import './play/ui/ui.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// PWA: register the offline service worker (production only).
// A version query busts any stale CDN/browser cache of sw.js (e.g. a wrong
// MIME response from an earlier deploy) so registration always fetches fresh.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const swVersion = import.meta.env.VITE_SW_VERSION || __APP_VERSION__;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`./sw.js?v=${swVersion}`).catch(() => undefined);
  });
}
