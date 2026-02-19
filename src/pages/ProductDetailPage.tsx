import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Theme, Button, Tag } from '@carbon/react';
import { publicStoreApi } from '../services/api/public-store.api';
import {
  ArrowLeft,
  ShoppingCart,
  Share,
  Checkmark,
  Copy,
  Store as StoreIcon,
  Phone,
  Email,
  Location,
} from '@carbon/icons-react';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import './PublicStorefrontPage.scss';
import './ProductDetailPage.scss';

export function ProductDetailPage() {
  const { storeSlug, productSlug } = useParams<{ storeSlug: string; productSlug: string }>();
  const { addToCart, getCartItemCount } = useCart();
  const [copied, setCopied] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const cartItemCount = getCartItemCount();

  // Fetch store details
  const { data: storeResponse, isLoading: storeLoading } = useQuery({
    queryKey: ['public-store', storeSlug],
    queryFn: async () => publicStoreApi.getStore(storeSlug!),
    enabled: !!storeSlug,
  });

  // Fetch product details
  const { data: productResponse, isLoading: productLoading } = useQuery({
    queryKey: ['product', productSlug],
    queryFn: async () => publicStoreApi.getProductBySlug(storeSlug!, productSlug!),
    enabled: !!storeSlug && !!productSlug,
  });

  const isLoading = storeLoading || productLoading;
  const store = storeResponse?.data;
  const product = productResponse?.data;

  const handleAddToCart = () => {
    if (product) {
      addToCart({ productId: product.id, product, quantity: 1 });
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  const shareUrl = `${window.location.origin}/${storeSlug}/products/${productSlug}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: product?.description || '',
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Check out ${product?.name} at ${store?.storeName}!\n\n${shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (isLoading) {
    return (
      <Theme theme="white">
        <div className="product-detail-page">
          <div className="product-detail-loading">
            <div className="loading-spinner">
              <div className="spinner-icon"></div>
              <p>Loading product details...</p>
            </div>
          </div>
        </div>
      </Theme>
    );
  }

  if (!product || !store) {
    return (
      <Theme theme="white">
        <div className="product-detail-page">
          <div className="product-detail-not-found">
            <div className="not-found-icon">
              <StoreIcon size={64} />
            </div>
            <h1>Product Not Found</h1>
            <p>Sorry, we couldn't find the product you're looking for.</p>
            <p className="not-found-hint">
              The product may have been removed, is out of stock.
            </p>
            <div className="not-found-actions">
              <Link to={`/${storeSlug}`} className="back-to-store-btn">
                <ArrowLeft size={20} />
                Back to Store
              </Link>
            </div>
          </div>
        </div>
      </Theme>
    );
  }

  const inStock = (product.stockQuantity || 0) > 0;
  const price = product.unitPrice || 0;

  return (
    <Theme theme="white">
      <Helmet>
        <title>{product.name} - {store.storeName}</title>
        <meta name="description" content={product.description || `${product.name} available at ${store.storeName}`} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="product" />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:title" content={`${product.name} - ${store.storeName}`} />
        <meta property="og:description" content={product.description || ''} />
        {product.imageUrl && <meta property="og:image" content={product.imageUrl} />}
        <meta property="og:site_name" content="Accurify Storefront" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={shareUrl} />
        <meta name="twitter:title" content={`${product.name} - ${store.storeName}`} />
        <meta name="twitter:description" content={product.description || ''} />
        {product.imageUrl && <meta name="twitter:image" content={product.imageUrl} />}

        {/* Product Schema.org markup */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": product.name,
            "image": product.imageUrl || '',
            "description": product.description || '',
            "sku": product.sku || '',
            "offers": {
              "@type": "Offer",
              "url": shareUrl,
              "priceCurrency": "NGN",
              "price": price,
              "availability": inStock
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
          })}
        </script>
      </Helmet>

      <div className="storefront" style={{ '--store-primary': store.primaryColor } as React.CSSProperties}>
        {/* Header */}
        <header className="storefront__header">
          <div className="storefront__header-content">
            <Link to={`/${storeSlug}`} className="storefront__brand" style={{ textDecoration: 'none', color: 'inherit' }}>
              {store.logoUrl && !logoError ? (
                <img
                  src={store.logoUrl}
                  alt={store.storeName}
                  className="storefront__logo"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="storefront__logo-placeholder">
                  {store.storeName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="storefront__brand-info">
                <h1>{store.storeName}</h1>
                {store.description && <p>{store.description}</p>}
              </div>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link to={`/${storeSlug}`} className="back-to-store-link">
                <ArrowLeft size={20} />
                Back to Store
              </Link>
              {cartItemCount > 0 && (
                <Link to={`/${storeSlug}`} style={{ textDecoration: 'none' }}>
                  <Button
                    kind="primary"
                    size="sm"
                    renderIcon={ShoppingCart}
                  >
                    Cart <Tag size="sm">{cartItemCount}</Tag>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </header>

        <div className="product-detail-page">
        <div className="product-detail-container">
          {/* Product Image */}
          <div className="product-image-section">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="product-image"
              />
            ) : (
              <div className="product-image-placeholder">
                <StoreIcon size={120} />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="product-info-section">
            <h1 className="product-name">{product.name}</h1>

            {product.category && (
              <div className="product-category">{product.categoryDisplayName || product.category}</div>
            )}

            <div className="product-price">
              ₦{price.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              {product.taxable && product.vatRate && (
                <span className="vat-info">
                  (includes {product.vatRate}% VAT)
                </span>
              )}
            </div>

            {/* Stock Status */}
            <div className={`stock-status ${inStock ? 'in-stock' : 'out-of-stock'}`}>
              {inStock ? (
                <>
                  <Checkmark size={16} />
                  In Stock ({product.stockQuantity} available)
                </>
              ) : (
                'Out of Stock'
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="product-description">
                <h3>Description</h3>
                <p>{product.description}</p>
              </div>
            )}

            {/* Product Details */}
            <div className="product-details">
              <h3>Product Details</h3>
              <ul>
                {product.sku && <li><strong>SKU:</strong> {product.sku}</li>}
                {product.unit && <li><strong>Unit:</strong> {product.unit}</li>}
                {product.barcode && <li><strong>Barcode:</strong> {product.barcode}</li>}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="product-actions">
              <Button
                kind="primary"
                size="lg"
                onClick={handleAddToCart}
                disabled={!inStock}
                renderIcon={addedToCart ? Checkmark : ShoppingCart}
              >
                {addedToCart ? 'Added to Cart!' : 'Add to Cart'}
              </Button>

              <Button
                kind="secondary"
                size="lg"
                onClick={handleShare}
                renderIcon={Share}
              >
                Share
              </Button>
            </div>

            {/* Share Options */}
            <div className="share-options">
              <Button
                kind="tertiary"
                size="sm"
                onClick={handleWhatsAppShare}
              >
                Share on WhatsApp
              </Button>
              <Button
                kind="tertiary"
                size="sm"
                onClick={handleCopyLink}
                renderIcon={copied ? Checkmark : Copy}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
          </div>
        </div>
        </div>

        {/* Footer */}
        <footer className="storefront__footer">
          <div className="storefront__contact">
            {store.phone && (
              <a href={`tel:${store.phone}`}>
                <Phone size={16} /> {store.phone}
              </a>
            )}
            {store.email && (
              <a href={`mailto:${store.email}`}>
                <Email size={16} /> {store.email}
              </a>
            )}
            {store.address && (
              <span>
                <Location size={16} /> {store.address}
              </span>
            )}
          </div>
          <p className="storefront__powered">
            Powered by <strong>Accurify QuickStore</strong>
          </p>
        </footer>
      </div>
    </Theme>
  );
}

export default ProductDetailPage;
