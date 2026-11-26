import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { applyPalette } from './lib/palette.js';
import './styles/style.css';
import './styles/theme.css';    // thème : toujours après style.css
import './styles/palettes.css'; // variantes de couleurs
import './styles/extras.css';   // galerie, favoris, chargement…

applyPalette();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// Installation sur l'écran d'accueil + ouverture plus rapide (le site reste à jour : réseau d'abord)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
