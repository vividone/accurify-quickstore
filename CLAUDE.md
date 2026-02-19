# Accurify Storefront

Public QuickStore customer-facing storefronts. React 19, TypeScript, Vite, Carbon Design.

## Commands

```bash
npm run dev           # Dev server on :5173
npm run build         # tsc + vite build
npm run lint          # ESLint
npm run test          # Vitest
```

## Directory Structure

```
src/
├── pages/             # 3 pages (StoreDirectory, PublicStorefront, ProductDetail)
├── context/           # CartContext (shopping cart state)
├── services/api/      # Public store API client (no auth required)
├── types/             # Store, product, order types
├── components/        # Store UI components
├── assets/            # Images
└── styles/            # SCSS
```

## Routes

```
/                          → StoreDirectoryPage (lists all stores)
/:slug                     → PublicStorefrontPage (individual store)
/:storeSlug/products/:productSlug → ProductDetailPage
```

## Patterns

- No authentication - all endpoints are public
- Cart state managed via React Context (CartContext)
- API calls go to `/api/v1/public/stores/` endpoints
- Carbon Design System for UI components
- SEO/security via react-helmet
