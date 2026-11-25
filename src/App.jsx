import { useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ShopProvider } from './contexts/ShopContext.jsx';
import { CartProvider } from './contexts/CartContext.jsx';
import ShopLayout from './layouts/ShopLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import Home from './pages/Home.jsx';
import Catalogue from './pages/Catalogue.jsx';
import Product from './pages/Product.jsx';
import Cart from './pages/Cart.jsx';
import Account from './pages/Account.jsx';
import Notifications from './pages/Notifications.jsx';
import NotFound from './pages/NotFound.jsx';
import ProductsList from './pages/admin/ProductsList.jsx';
import ProductEdit from './pages/admin/ProductEdit.jsx';
import { configured } from './lib/supabase.js';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  if (!configured) {
    return (
      <main className="shop">
        <p className="empty">
          Configuration manquante : définis VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
          (fichier .env en local, variables du dépôt GitHub en production).
        </p>
      </main>
    );
  }
  return (
    <HashRouter>
      <ShopProvider>
        <CartProvider>
          <ScrollTop />
          <Routes>
            <Route element={<ShopLayout />}>
              <Route index element={<Home />} />
              <Route path="catalogue" element={<Catalogue />} />
              <Route path="categories/:slug" element={<Catalogue />} />
              <Route path="produits/:slug" element={<Product />} />
              <Route path="panier" element={<Cart />} />
              <Route path="compte" element={<Account />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<ProductsList />} />
              <Route path="produits/nouveau" element={<ProductEdit />} />
              <Route path="produits/:id" element={<ProductEdit />} />
            </Route>
          </Routes>
        </CartProvider>
      </ShopProvider>
    </HashRouter>
  );
}
