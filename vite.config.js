import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BASE = "/nom-du-depot/" sur GitHub Pages (fourni automatiquement par le workflow).
// Par défaut "./" : chemins relatifs, qui fonctionnent partout avec HashRouter.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || './',
});
