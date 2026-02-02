/**
 * Public Storefront Page - Customer-facing QuickStore page.
 * No authentication required.
 */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
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
} from '@carbon/icons-react';
import { publicStoreApi } from '@/services/api/public-store.api';
import type { Store } from '@/types/store.types';
import { FulfillmentType } from '@/types/store.types';
import type { Product } from '@/types/product.types';
import { formatCurrency } from '@/utils/currency';
import { useCart } from '@/context/CartContext';
import './PublicStorefrontPage.scss';

type CheckoutStep = 'cart' | 'details' | 'payment' | 'confirmation';
type PaymentMethod = 'ONLINE' | 'BANK_TRANSFER' | 'CASH';

interface CustomerDetails {
    name: string;
    phone: string;
    email: string;
    address: string;
    deliveryNotes: string;
}

export function PublicStorefrontPage() {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const { cart, addToCart, updateQuantity, removeFromCart, clearCart, getCartItemCount } = useCart();

    // State
    const [store, setStore] = useState<Store | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cartOpen, setCartOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart');
    const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
        name: '',
        phone: '',
        email: '',
        address: '',
        deliveryNotes: '',
    });
    const [orderNumber, setOrderNumber] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

    // Load store and products
    useEffect(() => {
        async function loadStore() {
            if (!slug) return;

            try {
                setLoading(true);
                setError(null);

                const [storeRes, productsRes] = await Promise.all([
                    publicStoreApi.getStore(slug),
                    publicStoreApi.getProducts(slug, 0, 100),
                ]);

                if (storeRes.success && storeRes.data) {
                    setStore(storeRes.data);
                } else {
                    setError('Store not found');
                }

                if (productsRes.success && productsRes.data) {
                    setProducts(productsRes.data.content);
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

    // Handle payment callback
    useEffect(() => {
        const reference = searchParams.get('reference');
        const orderNum = searchParams.get('order');

        if (reference && orderNum && slug) {
            // Verify payment
            publicStoreApi.verifyPayment(slug, orderNum, reference).then((res) => {
                if (res.success) {
                    setOrderNumber(orderNum);
                    setCheckoutStep('confirmation');
                    setCartOpen(true);
                }
            });
        }
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

    // Checkout
    const handlePlaceOrder = async () => {
        if (!slug || !store) return;

        try {
            setSubmitting(true);

            const orderRes = await publicStoreApi.placeOrder(slug, {
                customerName: customerDetails.name,
                customerPhone: customerDetails.phone,
                customerEmail: customerDetails.email,
                customerAddress: customerDetails.address,
                deliveryNotes: customerDetails.deliveryNotes,
                fulfillmentType: customerDetails.address ? FulfillmentType.DELIVERY : FulfillmentType.PICKUP,
                items: cart.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                })),
            });

            if (orderRes.success && orderRes.data) {
                setOrderNumber(orderRes.data.orderNumber);

                // If online payment is selected and customer provided email, redirect to payment
                if (selectedPaymentMethod === 'ONLINE' && customerDetails.email) {
                    const callbackUrl = `${window.location.origin}/${slug}?order=${orderRes.data.orderNumber}`;
                    const paymentRes = await publicStoreApi.initializePayment(
                        slug,
                        orderRes.data.orderNumber,
                        customerDetails.email,
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
                            {store.logoUrl ? (
                                <img src={store.logoUrl} alt={store.storeName} className="storefront__logo" />
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
                        (checkoutStep === 'details' && (
                            !customerDetails.name ||
                            !customerDetails.phone ||
                            !customerDetails.email ||
                            !selectedPaymentMethod
                        )) ||
                        submitting
                    }
                    secondaryButtonText={checkoutStep === 'details' ? 'Back' : undefined}
                    onRequestSubmit={
                        checkoutStep === 'cart'
                            ? () => setCheckoutStep('details')
                            : checkoutStep === 'details'
                                ? handlePlaceOrder
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
                                value={customerDetails.name}
                                onChange={(e) =>
                                    setCustomerDetails((prev) => ({ ...prev, name: e.target.value }))
                                }
                                required
                            />
                            <TextInput
                                id="customer-phone"
                                labelText="Phone Number *"
                                placeholder="+234 800 000 0000"
                                value={customerDetails.phone}
                                onChange={(e) =>
                                    setCustomerDetails((prev) => ({ ...prev, phone: e.target.value }))
                                }
                                required
                            />
                            <TextInput
                                id="customer-email"
                                labelText="Email *"
                                placeholder="you@example.com"
                                type="email"
                                value={customerDetails.email}
                                onChange={(e) =>
                                    setCustomerDetails((prev) => ({ ...prev, email: e.target.value }))
                                }
                                required
                            />
                            {!customerDetails.email && (
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
                                        value={customerDetails.address}
                                        onChange={(e) =>
                                            setCustomerDetails((prev) => ({ ...prev, address: e.target.value }))
                                        }
                                    />
                                    <TextInput
                                        id="delivery-notes"
                                        labelText="Delivery Notes"
                                        placeholder="Any special instructions"
                                        value={customerDetails.deliveryNotes}
                                        onChange={(e) =>
                                            setCustomerDetails((prev) => ({ ...prev, deliveryNotes: e.target.value }))
                                        }
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
                                            Cash on {customerDetails.address ? 'Delivery' : 'Pickup'}
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
                                        title={`Cash on ${customerDetails.address ? 'Delivery' : 'Pickup'}`}
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
                                {customerDetails.address && store.deliveryFeeKobo > 0 && (
                                    <div className="checkout-form__line">
                                        <span>Delivery Fee</span>
                                        <span>{formatCurrency(store.deliveryFeeKobo / 100)}</span>
                                    </div>
                                )}
                                <div className="checkout-form__line checkout-form__line--total">
                                    <span>Total</span>
                                    <strong>
                                        {formatCurrency(
                                            (cartTotal + (customerDetails.address ? store.deliveryFeeKobo : 0)) / 100
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
                                We'll contact you at <strong>{customerDetails.phone}</strong> to confirm your order.
                            </p>
                            {customerDetails.email && (
                                <p>
                                    Order receipt has been sent to <strong>{customerDetails.email}</strong>
                                </p>
                            )}
                            {store.phone && (
                                <p>
                                    Questions? Call us at{' '}
                                    <a href={`tel:${store.phone}`}>{store.phone}</a>
                                </p>
                            )}
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
