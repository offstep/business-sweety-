# Sweety Business — version React

Boutique en ligne (React + Vite + Supabase), convertie depuis les fichiers statiques de `apport_sweety_6.zip`.
Les classes CSS sont **identiques** à l'ancien site : l'apparence ne change pas.

## Lancer

```bash
npm install
npm run dev      # test en local
npm run build    # génère le dossier dist/
```

## Mettre en ligne sur GitHub Pages

1. Envoie tout ce dossier sur GitHub (branche `main`).
2. Sur GitHub : **Settings → Pages → Source : GitHub Actions**.
3. Chaque envoi sur `main` reconstruit et publie le site (fichier `.github/workflows/deploy.yml`).

Les adresses ressemblent à `…/Sweety-/#/catalogue` : c'est voulu (GitHub Pages n'a pas de redirection, sans ça un
rafraîchissement sur une sous-page donnerait une erreur 404).

## Supabase

L'URL et la clé publique (`sb_publishable_…`) sont dans `src/lib/supabase.js` ; tu peux les remplacer via un fichier
`.env` (voir `.env.example`). Cette clé est faite pour être visible : la sécurité repose sur les règles RLS.

## Les SQL (dossier `sql/`)

À exécuter dans **Supabase → SQL Editor**, dans cet ordre (ou en une fois avec `00_TOUT_EN_UN.sql`) :

| Fichier | Rôle |
|---|---|
| `03_migration_3.sql` | statistiques des publicités (`record_ad_event`) |
| `04_migration_4.sql` | commandes sécurisées (`create_order`, `get_order`, `admin_set_order_status`) |
| `05_migration_5.sql` + `05b_seed_effects.sql` | sections d'accueil avec effets + exemples |
| `06_migration_6.sql` + `06b_seed_pubs.sql` | « Faire sa publicité » + emplacements pubs |
| `07_migration_7.sql` + `07b_seed_popup.sql` | popups gérés depuis l'admin + popup de bienvenue |
| `08_migration_8.sql` + `08b_seed_notifications.sql` | types de notifications + premières notifications |

Tout est relançable sans danger. Prérequis : le schéma de base et les migrations 1 et 2 (absents du zip) doivent déjà être passés.

## Ancien site → React

| Ancien fichier | Maintenant |
|---|---|
| `home.js` | `src/pages/Home.jsx` |
| `catalogue.js` / `produit.js` | `Catalogue.jsx` / `Product.jsx` |
| `panier.js`, (checkout) | `Cart.jsx`, `Checkout.jsx` |
| `confirmation.js` / `compte.js` / `notifications.js` | `Confirmation.jsx` / `Account.jsx` / `Notifications.jsx` |
| `admin.js` | `src/pages/admin/` (accès : `#/admin`) |
| `app.js`, `toast.js`, `popup.js`, `pwa.js` | `src/lib/` et `src/components/` |
| `sw.js`, `manifest.json`, `offline.html`, icônes | `public/` |

## À savoir

- Le zip contenait plusieurs copies de certains fichiers : j'ai pris la plus récente de chacun
  (`admin (5)`, `app (2)`, `home (2)`, `panier (1)`, `produit (1)`, `style (2)`, `index (1)`).
- **`pricing.js` et `checkout.js` n'étaient pas dans le zip** (le panier les utilisait). Je les ai reconstruits :
  `src/lib/pricing.js` reproduit les règles de `create_order`, et `src/pages/Checkout.jsx` appelle cette fonction.
  Le prix final reste toujours recalculé côté base de données.
- Petit ajout : l'admin des notifications propose maintenant le type (info, promo, nouveauté, livraison), qui existe grâce à la migration 8.
- Les liens saisis dans l'admin (`catalogue.html`, `/categories/x`…) sont convertis automatiquement en pages React.
