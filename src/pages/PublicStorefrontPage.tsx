/**
 * Public Storefront Page - Customer-facing QuickStore page.
 * No authentication required.
 */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
    Theme,
    Button,
    TextInput,
    Tile,
    Tag,
    Modal,
    Form,
    InlineNotification,
    Select,
    SelectItem,
    SkeletonText,
    SkeletonPlaceholder,
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
    Time,
    ChevronDown,
    ChevronUp,
    ChatLaunch,
} from '@carbon/icons-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { publicStoreApi } from '@/services/api/public-store.api';
import type { Store } from '@/types/store.types';
import { FulfillmentType } from '@/types/store.types';
import type { Product } from '@/types/product.types';
import { formatCurrency } from '@/utils/currency';
import { useCart } from '@/context/CartContext';
import './PublicStorefrontPage.scss';

type CheckoutStep = 'cart' | 'details' | 'payment' | 'confirmation';
type PaymentMethod = 'ONLINE' | 'BANK_TRANSFER' | 'CASH';
type SortOption = 'default' | 'price-asc' | 'price-desc' | 'newest' | 'name-asc';

const PAGE_SIZE = 24;

// Day names in order for business hours display
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

/**
 * Get the current day name (e.g., "Monday").
 */
function getCurrentDayName(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
}

/**
 * Format time string (e.g., "09:00" -> "9:00 AM", "17:00" -> "5:00 PM").
 */
function formatTime(time: string): string {
    const [hourStr, minuteStr] = time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = minuteStr || '00';
    if (hour === 0) return `12:${minute} AM`;
    if (hour < 12) return `${hour}:${minute} AM`;
    if (hour === 12) return `12:${minute} PM`;
    return `${hour - 12}:${minute} PM`;
}

const checkoutSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string()
        .min(1, 'Phone number is required')
        .refine((val) => {
            const cleaned = val.replace(/[\s()-]/g, '');
            return /^0\d{10}$/.test(cleaned) || /^\+234\d{10}$/.test(cleaned);
        }, 'Enter a valid Nigerian phone number (e.g. 08012345678)'),
    email: z.string().email('Please enter a valid email address'),
    address: z.string().refine((val) => {
        if (!val || val.trim().length === 0) return true;
        return val.trim().length >= 10;
    }, 'Delivery address must be at least 10 characters'),
    deliveryNotes: z.string().max(500, 'Notes must be under 500 characters'),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export function PublicStorefrontPage() {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { cart, addToCart, updateQuantity, removeFromCart, clearCart, getCartItemCount } = useCart();

    // State — kept unchanged
    const [logoError, setLogoError] = useState(false);
    const [cartOpen, setCartOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart');
    const [orderNumber, setOrderNumber] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('default');
    const [hoursExpanded, setHoursExpanded] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

    // New state for category filter and debounced search
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');

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

    // Debounce search for server-side queries
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // Store query
    const {
        data: storeData,
        isLoading: storeLoading,
        isError: storeError,
        refetch: refetchStore,
    } = useQuery({
        queryKey: ['store', slug],
        queryFn: () => publicStoreApi.getStore(slug!),
        enabled: !!slug,
        retry: 2,
    });
    const store: Store | null = storeData?.data ?? null;

    // Products infinite query with server-side search and category
    const productsQuery = useInfiniteQuery({
        queryKey: ['products', slug, debouncedSearch, selectedCategory],
        queryFn: ({ pageParam }) =>
            publicStoreApi.getProducts(
                slug!,
                pageParam as number,
                PAGE_SIZE,
                selectedCategory ?? undefined,
                debouncedSearch || undefined
            ),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) =>
            lastPage.data?.last ? undefined : allPages.length,
        enabled: !!slug && !storeLoading && !storeError,
    });

    // Flatten pages
    const rawProducts = useMemo(
        () => productsQuery.data?.pages.flatMap(p => p.data?.content ?? []) ?? [],
        [productsQuery.data]
    );

    // Category chips derived from loaded products (value = enum key for API, label = display name)
    const availableCategories = useMemo(() => {
        const seen = new Map<string, string>();
        rawProducts.forEach((p: Product) => {
            if (p.category && !seen.has(String(p.category))) {
                seen.set(String(p.category), p.categoryDisplayName || String(p.category));
            }
        });
        return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
    }, [rawProducts]);

    // Filtered and sorted products (search is server-side; only sort client-side)
    const filteredProducts = useMemo(() => {
        const result = [...rawProducts];
        switch (sortOption) {
            case 'price-asc':
                return result.sort((a, b) => (a.unitPrice ?? 0) - (b.unitPrice ?? 0));
            case 'price-desc':
                return result.sort((a, b) => (b.unitPrice ?? 0) - (a.unitPrice ?? 0));
            case 'newest':
                return result.sort((a, b) =>
                    new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
            case 'name-asc':
                return result.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
            default:
                return result;
        }
    }, [rawProducts, sortOption]);

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

    // Helper function to add product to cart
    const handleAddToCart = (product: Product) => {
        addToCart({ productId: product.id, product, quantity: 1 });
    };

    // Generate WhatsApp order message
    const generateWhatsAppMessage = (): string => {
        const lines = [
            `Hi! I'd like to place an order from ${store?.storeName}:`,
            '',
        ];

        cart.forEach((item) => {
            lines.push(`- ${item.product.name} x${item.quantity} @ ${formatCurrency(item.product.unitPrice)} each`);
        });

        lines.push('');
        lines.push(`Subtotal: ${formatCurrency(cartSubtotal / 100)}`);
        if (cartVat > 0) {
            lines.push(`VAT: ${formatCurrency(cartVat / 100)}`);
        }
        lines.push(`Total: ${formatCurrency(cartTotal / 100)}`);
        lines.push('');
        lines.push('Please confirm availability and payment details. Thank you!');

        return lines.join('\n');
    };

    // Open WhatsApp with pre-filled order message
    const handleWhatsAppOrder = () => {
        if (!store?.whatsappNumber) return;
        const message = encodeURIComponent(generateWhatsAppMessage());
        const whatsappUrl = `https://wa.me/${store.whatsappNumber.replace(/[^0-9+]/g, '')}?text=${message}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
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

    // Render loading skeleton
    if (storeLoading) {
        return (
            <Theme theme="white">
                <div className="storefront">
                    {/* Skeleton header */}
                    <header className="storefront__header">
                        <div className="storefront__header-content">
                            <div className="storefront__brand">
                                <SkeletonPlaceholder className="storefront__skeleton-logo" />
                                <div className="storefront__brand-info">
                                    <SkeletonText heading width="180px" />
                                    <SkeletonText width="240px" />
                                </div>
                            </div>
                            <SkeletonPlaceholder className="storefront__skeleton-cart-btn" />
                        </div>
                    </header>

                    {/* Skeleton search */}
                    <div className="storefront__search">
                        <SkeletonPlaceholder className="storefront__skeleton-search" />
                    </div>

                    {/* Skeleton product grid */}
                    <main className="storefront__products">
                        <div className="storefront__grid">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Tile key={i} className="product-card product-card--skeleton">
                                    <SkeletonPlaceholder className="product-card__skeleton-image" />
                                    <div className="product-card__content">
                                        <SkeletonText heading width="70%" />
                                        <SkeletonText lineCount={2} width="100%" />
                                    </div>
                                    <div className="product-card__footer">
                                        <SkeletonText width="60px" />
                                        <SkeletonPlaceholder className="product-card__skeleton-button" />
                                    </div>
                                </Tile>
                            ))}
                        </div>
                    </main>
                </div>
            </Theme>
        );
    }

    // Render error
    if (storeError) {
        return (
            <Theme theme="white">
                <div className="storefront storefront--error">
                    <StoreIcon size={64} />
                    <p>Unable to load store. Please check your connection.</p>
                    <Button onClick={() => refetchStore()}>Try Again</Button>
                </div>
            </Theme>
        );
    }

    // Render store offline
    if (store && !store.isActive) {
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

    // Store not found (loaded but no data)
    if (!store) {
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

                {/* Business Hours */}
                {store.businessHours && Object.keys(store.businessHours).length > 0 && (
                    <div className="storefront__hours">
                        <div className="storefront__hours-content">
                            {(() => {
                                const today = getCurrentDayName();
                                const todayKey = today.toLowerCase();
                                const todayHours = store.businessHours![todayKey] || store.businessHours![today];
                                return (
                                    <>
                                        <div className="storefront__hours-today">
                                            <Time size={16} />
                                            {todayHours ? (
                                                <span>
                                                    <strong>Open today:</strong> {formatTime(todayHours.open)} &ndash; {formatTime(todayHours.close)}
                                                </span>
                                            ) : (
                                                <span><strong>Closed today</strong></span>
                                            )}
                                        </div>
                                        <button
                                            className="storefront__hours-toggle"
                                            onClick={() => setHoursExpanded(!hoursExpanded)}
                                            type="button"
                                            aria-expanded={hoursExpanded}
                                        >
                                            {hoursExpanded ? 'Hide schedule' : 'View full schedule'}
                                            {hoursExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </>
                                );
                            })()}
                        </div>
                        {hoursExpanded && (
                            <div className="storefront__hours-schedule">
                                {DAY_NAMES.map((day) => {
                                    const dayKey = day.toLowerCase();
                                    const hours = store.businessHours![dayKey] || store.businessHours![day];
                                    const isToday = day === getCurrentDayName();
                                    return (
                                        <div
                                            key={day}
                                            className={`storefront__hours-day ${isToday ? 'storefront__hours-day--today' : ''}`}
                                        >
                                            <span className="storefront__hours-day-name">{day}</span>
                                            <span className="storefront__hours-day-time">
                                                {hours ? `${formatTime(hours.open)} - ${formatTime(hours.close)}` : 'Closed'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

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

                {/* Search & Sort */}
                <div className="storefront__search">
                    <div className="storefront__search-row">
                        <TextInput
                            id="product-search"
                            labelText=""
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="storefront__search-input"
                        />
                        <Select
                            id="product-sort"
                            labelText=""
                            hideLabel
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as SortOption)}
                            className="storefront__sort-select"
                        >
                            <SelectItem value="default" text="Default" />
                            <SelectItem value="price-asc" text="Price: Low to High" />
                            <SelectItem value="price-desc" text="Price: High to Low" />
                            <SelectItem value="newest" text="Newest First" />
                            <SelectItem value="name-asc" text="Name: A to Z" />
                        </Select>
                    </div>
                </div>

                {/* Category Filter Chips */}
                {availableCategories.length > 1 && (
                    <div className="public-store__category-filter">
                        <button
                            className={`category-chip${!selectedCategory ? ' category-chip--active' : ''}`}
                            onClick={() => setSelectedCategory(null)}
                        >
                            All
                        </button>
                        {availableCategories.map(({ value, label }) => (
                            <button
                                key={value}
                                className={`category-chip${selectedCategory === value ? ' category-chip--active' : ''}`}
                                onClick={() => setSelectedCategory(value)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

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
                            {productsQuery.hasNextPage && !debouncedSearch && (
                                <div className="storefront__load-more">
                                    <Button
                                        kind="ghost"
                                        onClick={() => productsQuery.fetchNextPage()}
                                        disabled={productsQuery.isFetchingNextPage}
                                    >
                                        {productsQuery.isFetchingNextPage ? 'Loading...' : 'Load More'}
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
                                        {store.whatsappNumber && cart.length > 0 && (
                                            <div className="cart__whatsapp">
                                                <Button
                                                    kind="tertiary"
                                                    size="md"
                                                    renderIcon={ChatLaunch}
                                                    onClick={handleWhatsAppOrder}
                                                    className="cart__whatsapp-button"
                                                >
                                                    Order via WhatsApp
                                                </Button>
                                            </div>
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
