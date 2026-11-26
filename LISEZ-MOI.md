# Sweety Business — React + Vite + Supabase (GitHub Pages)

Next.js est supprimé. Routage : React Router en **HashRouter** (pas de 404 au rechargement sur GitHub Pages).
Backend : Supabase (clé publique `anon`/`publishable` uniquement, jamais `service_role`).

## Variables d'environnement

| Variable | Rôle | Ancien nom (`.env.local`) |
|---|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase | `NEXT_PUBLIC_SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | clé publique anon / publishable | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `VITE_STORAGE_BUCKET` | bucket Storage des photos (admin) — **à vérifier** | (non fourni) |

Local : copie `.env.example` en `.env` et remplis-le.

## Tester en local

```bash
npm install
npm run build      # doit se terminer sans erreur
npm run dev
```

## Publier sur GitHub Pages

1. Crée un dépôt GitHub et envoie tout le contenu de ce dossier (`git push` sur la branche `main`).
2. Dépôt → **Settings → Secrets and variables → Actions → onglet Variables → New repository variable** : crée `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et `VITE_STORAGE_BUCKET`.
3. Dépôt → **Settings → Pages → Build and deployment → Source : GitHub Actions**.
4. Chaque `push` sur `main` lance `.github/workflows/deploy.yml` (onglet **Actions**). Le chemin de base `/<nom-du-dépôt>/` est calculé automatiquement.
5. Le site est publié sur `https://<ton-compte>.github.io/<nom-du-dépôt>/`.

## Supabase à vérifier

- Authentication → Providers → Email : **« Confirm email » désactivé** (l'inscription par téléphone utilise un e-mail technique).
- Les politiques **RLS** doivent autoriser : lecture publique des tables boutique ; écriture sur produits, images, variantes, suppléments pour `profiles.role = 'admin'` ; upload dans le bucket. Avant, ces écritures passaient par des Server Actions avec la session de l'utilisateur : le principe est identique, mais c'est maintenant la RLS qui protège réellement.

## Correspondance avec tes anciens fichiers

| Ancien | Nouveau |
|---|---|
| `app.js`, `data.js`, `whatsapp.js` | `src/lib/supabase.js`, `src/lib/helpers.js`, `src/layouts/ShopLayout.jsx` |
| `home.js`, `HomeSections.js` (version avec liens) | `src/pages/Home.jsx`, `src/components/HomeSections.jsx` |
| `BottomNav.js` (version avec Compte), `layout.js` | `src/components/BottomNav.jsx`, `src/layouts/ShopLayout.jsx` |
| `page.js` (catalogue), `page (3).js` (catégorie) | `src/pages/Catalogue.jsx` |
| `produit.js` | `src/pages/Product.jsx` |
| `panier.js`, `pricing.js` (récent), `CartProvider.js` | `src/pages/Cart.jsx`, `src/lib/pricing.js`, `src/contexts/CartContext.jsx` |
| `compte.js`, `page (1).js`, `page (2).js` | `src/pages/Account.jsx` |
| `actions.js`, `catalog-actions.js`, `ProductForm.js`, `CatalogEditor.js` | `src/pages/admin/*`, `src/components/admin/*` |
| `style.css` (= `globals.css` + `shop.css` + ajouts), `admin.css` | `src/styles/style.css`, `src/styles/admin.css` (isolé sous `.admin`) |

Doublons non repris : `BottomNav (1).js`, `HomeSections (1).js`, `layout (1).js`, `pricing (1).js`, `page (1) (1).js`, `index (1).html`, `globals.css`, `shop.css` (déjà inclus dans `style.css`), `CartFab.js` (masqué par le CSS), `.env.local`.

## Limites connues

- Les fichiers fournis ne contenaient pas : pages admin des sections d'accueil, catégories, promotions, réglages, **commandes**, ni la page notifications. Seule l'admin **produits** (liste, fiche, photos, variantes, suppléments) est portée. Les commandes se font toujours via WhatsApp.
- La page Notifications affiche `title` + `body`/`message`/`content`/`description` + `link_url` (colonnes supposées).
- Fonctions d'aide absentes des fichiers (`uploadImage`, `slugify`, `requireAdmin`) réécrites ; nom du bucket à confirmer.
- Ajout au design : le bouton WhatsApp est maintenant vert (la classe `.wa` n'avait pas de style).
- Le panier garde la même clé `localStorage` (`sb_cart`) : les paniers existants sont conservés.

## Thème OFFSTEP (ajouté)

Le design d'OFFSTEP est appliqué à Sweety Business : en-tête noir arrondi (cloche à gauche, nom au centre, recherche + panier à droite), barre du bas en verre dépoli avec icônes 3D (aqua sur l'onglet actif), boutons graphite, accents bleu aqua, fond à points, effet « lac » sur les cartes produits, police Space Grotesk. Le bouton WhatsApp reste vert, les prix restent noirs.

- Fichiers : `src/styles/theme.css` (thème, chargé après `style.css`), `src/lib/icons3d.js` + `src/components/Icon3D.jsx` (icônes), `src/hooks/useLake.js` (effet lac).
- Pour revenir à l'ancien look : supprimer la ligne `import './styles/theme.css'` dans `src/main.jsx`.
- Non repris : `fx.js`, `logo.png` et les modules d'OFFSTEP n'étaient pas dans l'envoi. L'effet lac est réécrit ; le nom de la boutique (ou `logo_url` des réglages) remplace le logo.
- Vérifié : aperçu du thème rendu dans un navigateur de test (en-tête, barre du bas, cartes, boutons) à 390 px, sans débordement horizontal. Pages complètes non testées (pas de réseau ici).

## Palette : Bleu Royal Premium (choisie)

Réglée dans `src/config.js` (`PALETTE = 'royal'`). Autres palettes prêtes : `aqua`, `orchidee`, `rose`.
Pour comparer sans rien changer : ajoute `?palette=rose` à l'adresse du site (`?palette=reset` pour annuler).
Les couleurs sont des variables (`theme.css`, `palettes.css`) : une palette = une dizaine de lignes.

## Nouveautés

- **Fiche produit** : galerie tactile (glisser), compteur, miniatures, plein écran avec zoom ; la photo suit la couleur choisie.
- **Favoris** : cœur sur chaque produit, page `/favoris` (enregistrés sur l'appareil).
- **Chargement** : emplacements animés au lieu de « Chargement… » ; **plus de page blanche** en cas d'erreur (message + bouton Recharger).
- **Installation** : le site peut s'ajouter à l'écran d'accueil (manifest + service worker, réseau d'abord : toujours à jour).
- **Admin** : `Catégories` (ajout, renommage, ordre, visibilité, image, suppression) et `Réglages` (nom, numéro WhatsApp, seuil de stock, logo).
- **Apparition douce** des blocs au défilement.

## Reste à faire

Voir la liste dans la conversation : admin Promotions, Sections d'accueil, Notifications, Publicités ; commandes (SQL + pages) ; recherche avancée.
