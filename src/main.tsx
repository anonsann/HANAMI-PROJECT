import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useSettings, applySettingsToDom } from './store/settings';
import { vndb } from './lib/vndb/client';
import './styles/index.css';

// First paint: apply persisted settings synchronously to avoid a theme flash.
applySettingsToDom(useSettings.getState());
vndb.setBaseUrl(useSettings.getState().apiBase);

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found — index.html is misconfigured.');
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
