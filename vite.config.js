import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' : le site fonctionne sur GitHub Pages (offstep.github.io/Sweety-/) sans réglage supplémentaire.
export default defineConfig({
  base: './',
  plugins: [react()],
});
