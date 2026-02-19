/**
 * Public Storefront Page - Customer-facing QuickStore page.
 * No authentication required.
 */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
    Theme,
    Loading,
    Button,
    TextInput,
    Tile,
    Tag,
    Modal,
    Form,
    InlineNotification,
} from '@carbon/react';
import {
    ShoppingCart,
    Add,
    Subtract,
    Close,
    Store as StoreIcon,
    Phone,
    Email,
    Location,
    Wallet,
    ArrowRight,
} from '@carbon/icons-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { publicStoreApi } from '@/services/api/public-store.api';
import type { Store } from '@/types/store.types';
import { FulfillmentType } from '@/types/store.types';
import type { Product } from '@/types/product.types';
import { formatCurrency } from '@/utils/currency';
import { useCart } from '@/context/CartContext';
import './PublicStorefrontPage.scss';

type CheckoutStep = 'cart' | 'details' | 'payment' | 'confirmation';
type PaymentMethod = 'ONLINE' | 'BANK_TRANSFER' | 'CASH';

const checkoutSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string()
        .min(10, 'Phone number must be at least 10 digits')
        .max(15, 'Phone number is too long')
        .regex(/^[+]?[\d\s()-]+$/, 'Invalid phone number format'),
    email: z.string().email('Please enter a valid email address'),
    address: z.string(),
    deliveryNotes: z.string().max(500, 'Notes must be under 500 characters'),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export function PublicStorefrontPage() {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { cart, addToCart, updateQuantity, removeFromCart, clearCart, getCartItemCount } = useCart();

    // State
    const [logoError, setLogoError] = useState(false);
    const [store, setStore] = useState<Store | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [cartOpen, setCartOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart');
    const [orderNumber, setOrderNumber] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
    const PAGE_SIZE = 24;

    // Checkout form with Zod validation
    const {
        register,
        handleSubmit: handleFormSubmit,
        watch,
        formState: { errors },
        getValues,
    } = useForm<CheckoutFormData>({
        resolver: zodResolver(checkoutSchema),
        defaultValues: { name: '', phone: '', email: '', address: '', deliveryNotes: '' },
    });
    const watchedEmail = watch('email');
    const watchedAddress = watch('address');

    // Load store and first page of products
    useEffect(() => {
        async function loadStore() {
            if (!slug) return;

            try {
                setLoading(true);
                setError(null);

                const [storeRes, productsRes] = await Promise.all([
                    publicStoreApi.getStore(slug),
                    publicStoreApi.getProducts(slug, 0, PAGE_SIZE),
                ]);

                if (storeRes.success && storeRes.data) {
                    setStore(storeRes.data);
                } else {
                    setError('Store not found');
                }

                if (productsRes.success && productsRes.data) {
                    setProducts(productsRes.data.content);
                    setHasMore(!productsRes.data.last);
                    setCurrentPage(0);
                }
            } catch (err) {
                console.error('Failed to load store:', err);
                setError('Store not found or unavailable');
            } finally {
                setLoading(false);
            }
        }

        loadStore();
    }, [slug]);

    // Load more products
    const handleLoadMore = async () => {
        if (!slug || loadingMore) return;
        try {
            setLoadingMore(true);
            const nextPage = currentPage + 1;
            const res = await publicStoreApi.getProducts(slug, nextPage, PAGE_SIZE);
            if (res.success && res.data) {
                setProducts((prev) => [...prev, ...res.data!.content]);
                setHasMore(!res.data.last);
                setCurrentPage(nextPage);
            }
        } catch (err) {
            console.error('Failed to load more products:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    // Handle payment callback — redirect to order tracking page
    useEffect(() => {
        const reference = searchParams.get('reference');
        const orderNum = searchParams.get('order');

        if (reference && orderNum && slug) {
            publicStoreApi.verifyPayment(slug, orderNum, reference)
                .then((res) => {
                    if (res.success) {
                        clearCart();
                        navigate(`/${slug}/orders/${orderNum}`, { replace: true });
                    }
                })
                .catch((err) => {
                    console.error('Payment verification failed:', err);
                });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, slug]);

    // Filtered products
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const query = searchQuery.toLowerCase();
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query))
        );
    }, [products, searchQuery]);

    // Cart calculations
    const cartSubtotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.product.unitPrice * 100 * item.quantity, 0);
    }, [cart]);

    const cartVat = useMemo(() => {
        return cart.reduce((sum, item) => {
            if (item.product.taxable && item.product.vatRate > 0) {
                return sum + (item.product.unitPrice * 100 * item.quantity * item.product.vatRate / 100);
            }
            return sum;
        }, 0);
    }, [cart]);

    const cartTotal = cartSubtotal + cartVat;

    const cartItemCount = getCartItemCount();

    // Helper function to add product to cart
    const handleAddToCart = (product: Product) => {
        addToCart({ productId: product.id, product, quantity: 1 });
    };

    // Checkout - called after form validation passes
    const handlePlaceOrder = async (formData: CheckoutFormData) => {
        if (!slug || !store) return;

        try {
            setSubmitting(true);

            const orderRes = await publicStoreApi.placeOrder(slug, {
                customerName: formData.name,
                customerPhone: formData.phone,
                customerEmail: formData.email,
                customerAddress: formData.address,
                deliveryNotes: formData.deliveryNotes,
                fulfillmentType: formData.address ? FulfillmentType.DELIVERY : FulfillmentType.PICKUP,
                items: cart.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                })),
            });

            if (orderRes.success && orderRes.data) {
                setOrderNumber(orderRes.data.orderNumber);

                // If online payment, redirect to Paystack
                if (selectedPaymentMethod === 'ONLINE' && formData.email) {
                    const callbackUrl = `${window.location.origin}/${slug}?order=${orderRes.data.orderNumber}`;
                    const paymentRes = await publicStoreApi.initializePayment(
                        slug,
                        orderRes.data.orderNumber,
                        formData.email,
                        callbackUrl
                    );

                    if (paymentRes.success && paymentRes.data) {
                        window.location.href = paymentRes.data.authorizationUrl;
                        return;
                    }
                }

                // Otherwise show confirmation
                setCheckoutStep('confirmation');
                clearCart();
            }
        } catch (err) {
            console.error('Failed to place order:', err);
        } finally {
            setSubmitting(false);
        }
    };

    // Render loading
    if (loading) {
        return (
            <div className="storefront storefront--loading">
                <Loading withOverlay={false} description="Loading store..." />
            </div>
        );
    }

    // Render error
    if (error || !store) {
        return (
            <Theme theme="white">
                <div className="storefront storefront--error">
                    <StoreIcon size={64} />
                    <h1>Store Not Found</h1>
                    <p>The store you're looking for doesn't exist or is currently unavailable.</p>
                </div>
            </Theme>
        );
    }

    // Render store offline
    if (!store.isActive) {
        return (
            <Theme theme="white">
                <div className="storefront storefront--offline">
                    <StoreIcon size={64} />
                    <h1>{store.storeName}</h1>
                    <p>This store is currently offline. Please check back later.</p>
                </div>
            </Theme>
        );
    }

    return (
        <Theme theme="white">
            <div className="storefront" style={{ '--store-primary': store.primaryColor } as React.CSSProperties}>
                {/* Header */}
                <header className="storefront__header">
                    <div className="storefront__header-content">
                        <div className="storefront__brand">
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
                        </div>

                        <Button
                            kind="primary"
                            className="storefront__cart-button"
                            onClick={() => setCartOpen(true)}
                            renderIcon={ShoppingCart}
                        >
                            Cart {cartItemCount > 0 && <Tag size="sm">{cartItemCount}</Tag>}
                        </Button>
                    </div>
                </header>

                {/* Not accepting orders banner */}
                {!store.acceptOrders && (
                    <InlineNotification
                        kind="warning"
                        title="Not accepting orders"
                        subtitle="This store is not currently accepting new orders."
                        hideCloseButton
                        className="storefront__banner"
                    />
                )}

                {/* Search */}
                <div className="storefront__search">
                    <TextInput
                        id="product-search"
                        labelText=""
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Products Grid */}
                <main className="storefront__products">
                    {filteredProducts.length === 0 ? (
                        <div className="storefront__empty">
                            <p>No products found</p>
                        </div>
                    ) : (
                        <>
                            <div className="storefront__grid">
                                {filteredProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        storeSlug={slug!}
                                        onAddToCart={() => handleAddToCart(product)}
                                        inCart={cart.some((item) => item.productId === product.id)}
                                        disabled={!store.acceptOrders || product.outOfStock}
                                    />
                                ))}
                            </div>
                            {hasMore && !searchQuery && (
                                <div className="storefront__load-more">
                                    <Button
                                        kind="tertiary"
                                        onClick={handleLoadMore}
                                        disabled={loadingMore}
                                    >
                                        {loadingMore ? 'Loading...' : 'Load More Products'}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </main>

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

                {/* Cart Modal */}
                <Modal
                    open={cartOpen}
                    onRequestClose={() => {
                        if (checkoutStep === 'confirmation') {
                            setCheckoutStep('cart');
                            clearCart();
                        }
                        setCartOpen(false);
                    }}
                    modalHeading={
                        checkoutStep === 'cart'
                            ? 'Your Cart'
                            : checkoutStep === 'details'
                                ? 'Your Details'
                                : checkoutStep === 'confirmation'
                                    ? 'Order Confirmed!'
                                    : 'Payment'
                    }
                    passiveModal={checkoutStep === 'confirmation'}
                    primaryButtonText={
                        checkoutStep === 'cart'
                            ? 'Continue to Checkout'
                            : checkoutStep === 'details'
                                ? 'Place Order'
                                : undefined
                    }
                    primaryButtonDisabled={
                        (checkoutStep === 'cart' && cart.length === 0) ||
                        (checkoutStep === 'details' && !selectedPaymentMethod) ||
                        submitting
                    }
                    secondaryButtonText={checkoutStep === 'details' ? 'Back' : undefined}
                    onRequestSubmit={
                        checkoutStep === 'cart'
                            ? () => setCheckoutStep('details')
                            : checkoutStep === 'details'
                                ? handleFormSubmit(handlePlaceOrder)
                                : undefined
                    }
                    onSecondarySubmit={checkoutStep === 'details' ? () => setCheckoutStep('cart') : undefined}
                    size="md"
                >
                    {checkoutStep === 'cart' && (
                        <div className="cart">
                            {cart.length === 0 ? (
                                <p className="cart__empty">Your cart is empty</p>
                            ) : (
                                <>
                                    <div className="cart__items">
                                        {cart.map((item) => (
                                            <div key={item.productId} className="cart__item">
                                                <div className="cart__item-info">
                                                    <span className="cart__item-name">{item.product.name}</span>
                                                    <span className="cart__item-price">
                                                        {formatCurrency(item.product.unitPrice)}
                                                        {item.product.taxable && item.product.vatRate > 0 && (
                                                            <span className="cart__item-vat"> +{item.product.vatRate}% VAT</span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="cart__item-controls">
                                                    <Button
                                                        kind="ghost"
                                                        size="sm"
                                                        hasIconOnly
                                                        renderIcon={Subtract}
                                                        iconDescription="Decrease"
                                                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                                    />
                                                    <span className="cart__item-qty">{item.quantity}</span>
                                                    <Button
                                                        kind="ghost"
                                                        size="sm"
                                                        hasIconOnly
                                                        renderIcon={Add}
                                                        iconDescription="Increase"
                                                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                                    />
                                                    <Button
                                                        kind="ghost"
                                                        size="sm"
                                                        hasIconOnly
                                                        renderIcon={Close}
                                                        iconDescription="Remove"
                                                        onClick={() => removeFromCart(item.productId)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="cart__summary">
                                        <div className="cart__line">
                                            <span>Subtotal</span>
                                            <span>{formatCurrency(cartSubtotal / 100)}</span>
                                        </div>
                                        {cartVat > 0 && (
                                            <div className="cart__line cart__line--vat">
                                                <span>VAT</span>
                                                <span>{formatCurrency(cartVat / 100)}</span>
                                            </div>
                                        )}
                                        <div className="cart__total">
                                            <span>Total</span>
                                            <strong>{formatCurrency(cartTotal / 100)}</strong>
                                        </div>
                                        {store.minimumOrderKobo > 0 && cartTotal < store.minimumOrderKobo && (
                                            <InlineNotification
                                                kind="warning"
                                                title={`Minimum order: ${formatCurrency(store.minimumOrderKobo / 100)}`}
                                                hideCloseButton
                                                lowContrast
                                            />
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {checkoutStep === 'details' && (
                        <Form className="checkout-form">
                            <TextInput
                                id="customer-name"
                                labelText="Your Name *"
                                placeholder="John Doe"
                                invalid={!!errors.name}
                                invalidText={errors.name?.message}
                                {...register('name')}
                            />
                            <TextInput
                                id="customer-phone"
                                labelText="Phone Number *"
                                placeholder="08012345678"
                                invalid={!!errors.phone}
                                invalidText={errors.phone?.message}
                                {...register('phone')}
                            />
                            <TextInput
                                id="customer-email"
                                labelText="Email *"
                                placeholder="you@example.com"
                                type="email"
                                invalid={!!errors.email}
                                invalidText={errors.email?.message}
                                {...register('email')}
                            />
                            {!watchedEmail && (
                                <InlineNotification
                                    kind="info"
                                    title="Email required for order confirmation"
                                    subtitle="We'll send your order receipt and updates to this email."
                                    hideCloseButton
                                    lowContrast
                                    style={{ marginTop: '0.5rem', marginBottom: '1rem' }}
                                />
                            )}
                            {store.deliveryAvailable && (
                                <>
                                    <TextInput
                                        id="customer-address"
                                        labelText="Delivery Address"
                                        placeholder="Enter your delivery address"
                                        invalid={!!errors.address}
                                        invalidText={errors.address?.message}
                                        {...register('address')}
                                    />
                                    <TextInput
                                        id="delivery-notes"
                                        labelText="Delivery Notes"
                                        placeholder="Any special instructions"
                                        invalid={!!errors.deliveryNotes}
                                        invalidText={errors.deliveryNotes?.message}
                                        {...register('deliveryNotes')}
                                    />
                                </>
                            )}

                            <div className="checkout-form__payment-methods">
                                <h4>Select Payment Method *</h4>
                                <div className="payment-methods">
                                    {store.acceptOnlinePayment && (
                                        <Button
                                            kind={selectedPaymentMethod === 'ONLINE' ? 'primary' : 'tertiary'}
                                            size="sm"
                                            onClick={() => setSelectedPaymentMethod('ONLINE')}
                                            renderIcon={Wallet}
                                        >
                                            Pay Online (Accurify Pay)
                                        </Button>
                                    )}
                                    {store.acceptBankTransfer && (
                                        <Button
                                            kind={selectedPaymentMethod === 'BANK_TRANSFER' ? 'primary' : 'tertiary'}
                                            size="sm"
                                            onClick={() => setSelectedPaymentMethod('BANK_TRANSFER')}
                                        >
                                            Bank Transfer
                                        </Button>
                                    )}
                                    {store.acceptCash && (
                                        <Button
                                            kind={selectedPaymentMethod === 'CASH' ? 'primary' : 'tertiary'}
                                            size="sm"
                                            onClick={() => setSelectedPaymentMethod('CASH')}
                                        >
                                            Cash on {watchedAddress ? 'Delivery' : 'Pickup'}
                                        </Button>
                                    )}
                                </div>
                                {selectedPaymentMethod === 'ONLINE' && (
                                    <InlineNotification
                                        kind="info"
                                        title="Secure Payment"
                                        subtitle="Pay instantly with card, bank transfer, or USSD via Paystack."
                                        hideCloseButton
                                        lowContrast
                                        className="checkout-form__payment-notice"
                                    />
                                )}
                                {selectedPaymentMethod === 'BANK_TRANSFER' && (
                                    <InlineNotification
                                        kind="info"
                                        title="Bank Transfer"
                                        subtitle="You'll receive bank details and order receipt via email after placing your order."
                                        hideCloseButton
                                        lowContrast
                                        className="checkout-form__payment-notice"
                                    />
                                )}
                                {selectedPaymentMethod === 'CASH' && (
                                    <InlineNotification
                                        kind="info"
                                        title={`Cash on ${watchedAddress ? 'Delivery' : 'Pickup'}`}
                                        subtitle="Order confirmation and receipt will be sent to your email."
                                        hideCloseButton
                                        lowContrast
                                        className="checkout-form__payment-notice"
                                    />
                                )}
                            </div>

                            <div className="checkout-form__summary">
                                <div className="checkout-form__line">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(cartSubtotal / 100)}</span>
                                </div>
                                {cartVat > 0 && (
                                    <div className="checkout-form__line">
                                        <span>VAT</span>
                                        <span>{formatCurrency(cartVat / 100)}</span>
                                    </div>
                                )}
                                {watchedAddress && store.deliveryFeeKobo > 0 && (
                                    <div className="checkout-form__line">
                                        <span>Delivery Fee</span>
                                        <span>{formatCurrency(store.deliveryFeeKobo / 100)}</span>
                                    </div>
                                )}
                                <div className="checkout-form__line checkout-form__line--total">
                                    <span>Total</span>
                                    <strong>
                                        {formatCurrency(
                                            (cartTotal + (watchedAddress ? store.deliveryFeeKobo : 0)) / 100
                                        )}
                                    </strong>
                                </div>
                                {selectedPaymentMethod === 'ONLINE' && (
                                    <div className="checkout-form__processing-fee">
                                        <span>Processing fee ({store.platformFeePercentage || 3}%)</span>
                                        <span>Included in total</span>
                                    </div>
                                )}
                            </div>
                        </Form>
                    )}

                    {checkoutStep === 'confirmation' && orderNumber && (
                        <div className="order-confirmation">
                            <div className="order-confirmation__icon">
                                <ShoppingCart size={48} />
                            </div>
                            <h2>Thank you for your order!</h2>
                            <p>Your order number is:</p>
                            <div className="order-confirmation__number">{orderNumber}</div>
                            <p>
                                We'll contact you at <strong>{getValues('phone')}</strong> to confirm your order.
                            </p>
                            {getValues('email') && (
                                <p>
                                    Order receipt has been sent to <strong>{getValues('email')}</strong>
                                </p>
                            )}
                            {store.phone && (
                                <p>
                                    Questions? Call us at{' '}
                                    <a href={`tel:${store.phone}`}>{store.phone}</a>
                                </p>
                            )}
                            <Link to={`/${slug}/orders/${orderNumber}`} className="order-confirmation__track-link">
                                <Button kind="primary" renderIcon={ArrowRight}>
                                    Track Your Order
                                </Button>
                            </Link>
                        </div>
                    )}
                </Modal>
            </div>
        </Theme>
    );
}

// Product Card Component
interface ProductCardProps {
    product: Product;
    storeSlug: string;
    onAddToCart: () => void;
    inCart: boolean;
    disabled: boolean;
}

function ProductCard({ product, storeSlug, onAddToCart, inCart, disabled }: ProductCardProps) {
    // Use slug if available, otherwise fallback to product ID for legacy products
    const productIdentifier = product.slug || product.id;
    const productDetailUrl = `/${storeSlug}/products/${productIdentifier}`;

    return (
        <Tile className="product-card">
            <Link to={productDetailUrl} className="product-card__link">
                {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="product-card__image" />
                ) : (
                    <div className="product-card__image-placeholder">
                        <StoreIcon size={32} />
                    </div>
                )}
                <div className="product-card__content">
                    <h3 className="product-card__name">{product.name}</h3>
                    {product.description && (
                        <p className="product-card__description">{product.description}</p>
                    )}
                </div>
            </Link>
            <div className="product-card__footer">
                <div className="product-card__price-info">
                    <span className="product-card__price">{formatCurrency(product.unitPrice)}</span>
                    {product.taxable && product.vatRate > 0 && (
                        <span className="product-card__vat">+{product.vatRate}% VAT</span>
                    )}
                </div>
                {product.outOfStock ? (
                    <Tag type="red" size="sm">Out of Stock</Tag>
                ) : (
                    <Button
                        kind={inCart ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={(e) => {
                            e.preventDefault();
                            onAddToCart();
                        }}
                        disabled={disabled}
                        renderIcon={Add}
                        type="button"
                    >
                        {inCart ? 'Add More' : 'Add'}
                    </Button>
                )}
            </div>
        </Tile>
    );
}

export default PublicStorefrontPage;
