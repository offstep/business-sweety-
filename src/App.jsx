import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { SettingsProvider } from './lib/settings';
import Layout from './components/Layout';
import Toasts from './components/Toasts';
import Home from './pages/Home';
import Catalogue from './pages/Catalogue';
import Product from './pages/Product';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Confirmation from './pages/Confirmation';
import Account from './pages/Account';
import Notifications from './pages/Notifications';

// L'administration est chargée à part : les clients ne la téléchargent jamais.
const Admin = lazy(() => import('./pages/admin/Admin'));

// HashRouter : les adresses ressemblent à …/Sweety-/#/catalogue. Indispensable sur GitHub Pages, qui n'a pas de
// redirection vers index.html : un rafraîchissement sur une sous-page ne donnerait sinon qu'une erreur 404.
export default function App() {
  return (
    <HashRouter>
      <SettingsProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="catalogue" element={<Catalogue />} />
            <Route path="produit/:slug" element={<Product />} />
            <Route path="panier" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="confirmation" element={<Confirmation />} />
            <Route path="compte" element={<Account />} />
            <Route path="compte/:mode" element={<Account />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="*" element={<p className="empty">Page introuvable.</p>} />
          </Route>
          <Route path="/admin/*" element={<Suspense fallback={<p className="empty">Chargement…</p>}><Admin /></Suspense>} />
        </Routes>
        <Toasts />
      </SettingsProvider>
    </HashRouter>
  );
}
