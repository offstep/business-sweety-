import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initPwa } from './lib/pwa';
import './styles/style.css';

createRoot(document.getElementById('root')).render(<App />);
initPwa();
