import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { PublicStorefrontPage } from '@/pages/PublicStorefrontPage';
import { StoreDirectoryPage } from '@/pages/StoreDirectoryPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { CartProvider } from '@/context/CartContext';
import './App.scss'

// Wrapper component for individual store page
function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <CartProvider storeSlug={slug}>
      <PublicStorefrontPage />
    </CartProvider>
  );
}

// Wrapper component for product detail page
function ProductPage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  return (
    <CartProvider storeSlug={storeSlug}>
      <ProductDetailPage />
    </CartProvider>
  );
}

function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div style={{ padding: '2rem', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h1>Oops! Something went wrong</h1>
          <p style={{ marginTop: '1rem', color: '#666' }}>{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
          <button
            onClick={resetError}
            style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', background: '#1a56db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      )}
      showDialog
    >
      <Routes>
        {/* Landing page - lists all stores */}
        <Route path="/" element={<StoreDirectoryPage />} />
        {/* Product detail pages */}
        <Route path="/:storeSlug/products/:productSlug" element={<ProductPage />} />
        {/* Individual store pages */}
        <Route path="/:slug" element={<StorePage />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Sentry.ErrorBoundary>
  );
}

export default App;
