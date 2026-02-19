/**
 * Order Tracking Page - Customers can check their order status.
 * Route: /:storeSlug/orders/:orderNumber
 * No authentication required.
 */
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  Theme,
  Tag,
  Loading,
  Button,
  Tile,
  TextInput,
  FileUploaderDropContainer,
  InlineNotification,
} from '@carbon/react';
import {
  ArrowLeft,
  Checkmark,
  Store as StoreIcon,
  Phone,
  Email,
  Location,
  DeliveryTruck,
  ShoppingBag,
  Time,
  WarningAlt,
  Close,
  Upload,
  DocumentAttachment,
} from '@carbon/icons-react';
import { publicStoreApi } from '@/services/api/public-store.api';
import type { StoreOrder } from '@/types/store.types';
import { OrderStatus, OrderPaymentStatus } from '@/types/store.types';
import { formatCurrency } from '@/utils/currency';
import './OrderTrackingPage.scss';

const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; tagType: string; icon: typeof Checkmark }> = {
  [OrderStatus.PENDING]: { label: 'Pending', tagType: 'gray', icon: Time },
  [OrderStatus.CONFIRMED]: { label: 'Confirmed', tagType: 'blue', icon: Checkmark },
  [OrderStatus.PROCESSING]: { label: 'Processing', tagType: 'cyan', icon: ShoppingBag },
  [OrderStatus.READY]: { label: 'Ready', tagType: 'teal', icon: DeliveryTruck },
  [OrderStatus.COMPLETED]: { label: 'Completed', tagType: 'green', icon: Checkmark },
  [OrderStatus.CANCELLED]: { label: 'Cancelled', tagType: 'red', icon: Close },
};

const PAYMENT_STATUS_CONFIG: Record<OrderPaymentStatus, { label: string; tagType: string }> = {
  [OrderPaymentStatus.UNPAID]: { label: 'Unpaid', tagType: 'red' },
  [OrderPaymentStatus.PARTIAL]: { label: 'Partial', tagType: 'yellow' },
  [OrderPaymentStatus.PAID]: { label: 'Paid', tagType: 'green' },
  [OrderPaymentStatus.REFUNDED]: { label: 'Refunded', tagType: 'purple' },
};

// Ordered steps for the progress tracker
const STATUS_STEPS: OrderStatus[] = [
  OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING,
  OrderStatus.READY, OrderStatus.COMPLETED,
];

function getStepIndex(status: OrderStatus): number {
  if (status === OrderStatus.CANCELLED) return -1;
  return STATUS_STEPS.indexOf(status);
}

export function OrderTrackingPage() {
  const { storeSlug, orderNumber } = useParams<{ storeSlug: string; orderNumber: string }>();
  const [logoError, setLogoError] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofNote, setProofNote] = useState('');
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [proofSuccess, setProofSuccess] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);

  const { data: storeResponse, isLoading: storeLoading } = useQuery({
    queryKey: ['public-store', storeSlug],
    queryFn: () => publicStoreApi.getStore(storeSlug!),
    enabled: !!storeSlug,
  });

  const {
    data: orderResponse,
    isLoading: orderLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['order-tracking', storeSlug, orderNumber],
    queryFn: () => publicStoreApi.trackOrder(storeSlug!, orderNumber!),
    enabled: !!storeSlug && !!orderNumber,
    refetchInterval: 30_000, // Poll every 30s for status updates
  });

  const store = storeResponse?.data;
  const order = orderResponse?.data as StoreOrder | undefined;
  const isLoading = storeLoading || orderLoading;

  const handleProofSubmit = async () => {
    if (!proofFile || !storeSlug || !orderNumber) return;
    try {
      setProofSubmitting(true);
      setProofError(null);
      const res = await publicStoreApi.submitPaymentProof(storeSlug, orderNumber, proofFile, proofNote || undefined);
      if (res.success) {
        setProofSuccess(true);
        setProofFile(null);
        setProofNote('');
        refetch();
      } else {
        setProofError(res.message || 'Failed to submit payment proof');
      }
    } catch {
      setProofError('Failed to submit payment proof. Please try again.');
    } finally {
      setProofSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Theme theme="white">
        <div className="order-tracking order-tracking--loading">
          <Loading withOverlay={false} description="Loading order..." />
        </div>
      </Theme>
    );
  }

  if (isError || !order) {
    return (
      <Theme theme="white">
        <div className="order-tracking order-tracking--error">
          <WarningAlt size={64} />
          <h1>Order Not Found</h1>
          <p>We couldn&apos;t find an order with number <strong>{orderNumber}</strong>.</p>
          <p>Please check the order number and try again.</p>
          <div className="order-tracking__error-actions">
            <Button kind="primary" onClick={() => refetch()}>
              Try Again
            </Button>
            {storeSlug && (
              <Link to={`/${storeSlug}`}>
                <Button kind="secondary">Back to Store</Button>
              </Link>
            )}
          </div>
        </div>
      </Theme>
    );
  }

  const statusConfig = ORDER_STATUS_CONFIG[order.status as OrderStatus] || ORDER_STATUS_CONFIG[OrderStatus.PENDING];
  const paymentConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus as OrderPaymentStatus] || PAYMENT_STATUS_CONFIG[OrderPaymentStatus.UNPAID];
  const currentStepIndex = getStepIndex(order.status as OrderStatus);
  const isCancelled = order.status === OrderStatus.CANCELLED;

  return (
    <Theme theme="white">
      <Helmet>
        <title>Order {orderNumber} - {store?.storeName || 'QuickStore'}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="order-tracking" style={{ '--store-primary': store?.primaryColor || '#0f62fe' } as React.CSSProperties}>
        {/* Header */}
        <header className="order-tracking__header">
          <div className="order-tracking__header-content">
            {store && (
              <Link to={`/${storeSlug}`} className="order-tracking__brand">
                {store.logoUrl && !logoError ? (
                  <img
                    src={store.logoUrl}
                    alt={store.storeName}
                    className="order-tracking__logo"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="order-tracking__logo-placeholder">
                    {store.storeName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="order-tracking__store-name">{store.storeName}</span>
              </Link>
            )}
            <Link to={`/${storeSlug}`} className="order-tracking__back-link">
              <ArrowLeft size={16} />
              Continue Shopping
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="order-tracking__main">
          {/* Order Status Card */}
          <Tile className="order-tracking__status-card">
            <div className="order-tracking__order-header">
              <div>
                <h1 className="order-tracking__order-number">Order {order.orderNumber}</h1>
                <p className="order-tracking__order-date">
                  Placed on {new Date(order.createdAt).toLocaleDateString('en-NG', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="order-tracking__status-tags">
                <Tag type={statusConfig.tagType as 'gray'} size="md">
                  {statusConfig.label}
                </Tag>
                <Tag type={paymentConfig.tagType as 'gray'} size="md">
                  {paymentConfig.label}
                </Tag>
              </div>
            </div>

            {/* Progress Tracker */}
            {!isCancelled && (
              <div className="order-tracking__progress">
                {STATUS_STEPS.map((step, index) => {
                  const stepConfig = ORDER_STATUS_CONFIG[step];
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  return (
                    <div
                      key={step}
                      className={`order-tracking__step ${isCompleted ? 'order-tracking__step--completed' : ''} ${isCurrent ? 'order-tracking__step--current' : ''}`}
                    >
                      <div className="order-tracking__step-dot">
                        {isCompleted && <Checkmark size={12} />}
                      </div>
                      {index < STATUS_STEPS.length - 1 && (
                        <div className={`order-tracking__step-line ${isCompleted && index < currentStepIndex ? 'order-tracking__step-line--completed' : ''}`} />
                      )}
                      <span className="order-tracking__step-label">{stepConfig.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cancelled Banner */}
            {isCancelled && (
              <div className="order-tracking__cancelled">
                <WarningAlt size={20} />
                <div>
                  <strong>This order has been cancelled</strong>
                  {order.cancellationReason && <p>{order.cancellationReason}</p>}
                </div>
              </div>
            )}
          </Tile>

          {/* Order Items */}
          <Tile className="order-tracking__items-card">
            <h2>Order Items</h2>
            <div className="order-tracking__items">
              {order.items.map((item) => (
                <div key={item.id} className="order-tracking__item">
                  <div className="order-tracking__item-info">
                    <span className="order-tracking__item-name">{item.productName}</span>
                    {item.productSku && <span className="order-tracking__item-sku">SKU: {item.productSku}</span>}
                  </div>
                  <div className="order-tracking__item-qty">x{item.quantity}</div>
                  <div className="order-tracking__item-price">
                    {formatCurrency(item.totalKobo / 100)}
                  </div>
                </div>
              ))}
            </div>

            {/* Order Totals */}
            <div className="order-tracking__totals">
              <div className="order-tracking__total-line">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotalKobo / 100)}</span>
              </div>
              {order.taxKobo > 0 && (
                <div className="order-tracking__total-line">
                  <span>VAT</span>
                  <span>{formatCurrency(order.taxKobo / 100)}</span>
                </div>
              )}
              {order.deliveryFeeKobo > 0 && (
                <div className="order-tracking__total-line">
                  <span>Delivery Fee</span>
                  <span>{formatCurrency(order.deliveryFeeKobo / 100)}</span>
                </div>
              )}
              {order.discountKobo > 0 && (
                <div className="order-tracking__total-line order-tracking__total-line--discount">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discountKobo / 100)}</span>
                </div>
              )}
              <div className="order-tracking__total-line order-tracking__total-line--grand">
                <span>Total</span>
                <strong>{formatCurrency(order.totalKobo / 100)}</strong>
              </div>
            </div>
          </Tile>

          {/* Payment Proof Section — show for unpaid non-online orders */}
          {order.paymentStatus !== OrderPaymentStatus.PAID &&
           order.paymentStatus !== OrderPaymentStatus.REFUNDED &&
           !isCancelled && (
            <Tile className="order-tracking__payment-proof-card">
              <h2><Upload size={18} /> Payment Confirmation</h2>

              {/* Already submitted proof */}
              {order.paymentProofUrl && (
                <div className="order-tracking__proof-submitted">
                  <div className="order-tracking__proof-badge">
                    <Checkmark size={16} />
                    <span>Payment proof submitted</span>
                  </div>
                  {order.paymentProofNote && (
                    <p className="order-tracking__proof-note">{order.paymentProofNote}</p>
                  )}
                  {order.paymentProofSubmittedAt && (
                    <p className="order-tracking__proof-date">
                      Submitted on {new Date(order.paymentProofSubmittedAt).toLocaleDateString('en-NG', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  )}
                  <a href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="order-tracking__proof-view">
                    <DocumentAttachment size={16} /> View uploaded proof
                  </a>
                  <InlineNotification
                    kind="info"
                    title="Awaiting confirmation"
                    subtitle="The store owner will verify your payment and update the order status."
                    hideCloseButton
                    lowContrast
                    className="order-tracking__proof-notice"
                  />
                </div>
              )}

              {/* Upload form — show if no proof submitted yet, or allow re-submission */}
              {!order.paymentProofUrl && !proofSuccess && (
                <div className="order-tracking__proof-form">
                  <p className="order-tracking__proof-instruction">
                    Made a bank transfer or cash payment? Upload your payment proof so the store can confirm your order.
                  </p>

                  <div className="order-tracking__proof-upload">
                    <FileUploaderDropContainer
                      accept={['image/jpeg', 'image/png', 'image/webp']}
                      labelText={proofFile ? proofFile.name : 'Drag and drop or click to upload payment proof'}
                      onAddFiles={(_e: unknown, { addedFiles }: { addedFiles: File[] }) => {
                        if (addedFiles.length > 0) {
                          const file = addedFiles[0];
                          if (file.size > 5 * 1024 * 1024) {
                            setProofError('File must be less than 5MB');
                            return;
                          }
                          setProofFile(file);
                          setProofError(null);
                        }
                      }}
                    />
                    <span className="order-tracking__proof-hint">JPG, PNG or WebP. Max 5MB.</span>
                  </div>

                  <TextInput
                    id="proof-note"
                    labelText="Note (optional)"
                    placeholder="e.g., Transferred from GTBank at 2:30 PM"
                    value={proofNote}
                    onChange={(e) => setProofNote(e.target.value)}
                    maxLength={500}
                  />

                  {proofError && (
                    <InlineNotification
                      kind="error"
                      title="Error"
                      subtitle={proofError}
                      onCloseButtonClick={() => setProofError(null)}
                      lowContrast
                    />
                  )}

                  <Button
                    kind="primary"
                    onClick={handleProofSubmit}
                    disabled={!proofFile || proofSubmitting}
                    renderIcon={Upload}
                  >
                    {proofSubmitting ? 'Submitting...' : 'Submit Payment Proof'}
                  </Button>
                </div>
              )}

              {/* Success state */}
              {proofSuccess && !order.paymentProofUrl && (
                <div className="order-tracking__proof-submitted">
                  <div className="order-tracking__proof-badge">
                    <Checkmark size={16} />
                    <span>Payment proof submitted successfully!</span>
                  </div>
                  <InlineNotification
                    kind="success"
                    title="Proof received"
                    subtitle="The store owner will review your payment and update the order status shortly."
                    hideCloseButton
                    lowContrast
                    className="order-tracking__proof-notice"
                  />
                </div>
              )}
            </Tile>
          )}

          {/* Delivery / Customer Details */}
          <div className="order-tracking__details-row">
            <Tile className="order-tracking__detail-card">
              <h3>
                {order.fulfillmentType === 'DELIVERY' ? (
                  <><DeliveryTruck size={18} /> Delivery Details</>
                ) : (
                  <><ShoppingBag size={18} /> Pickup Details</>
                )}
              </h3>
              <div className="order-tracking__detail-content">
                {order.customerName && <p><strong>{order.customerName}</strong></p>}
                {order.customerPhone && <p><Phone size={14} /> {order.customerPhone}</p>}
                {order.customerEmail && <p><Email size={14} /> {order.customerEmail}</p>}
                {order.customerAddress && <p><Location size={14} /> {order.customerAddress}</p>}
                {order.deliveryNotes && (
                  <p className="order-tracking__notes">Notes: {order.deliveryNotes}</p>
                )}
              </div>
            </Tile>

            <Tile className="order-tracking__detail-card">
              <h3><StoreIcon size={18} /> Store Contact</h3>
              <div className="order-tracking__detail-content">
                {store?.storeName && <p><strong>{store.storeName}</strong></p>}
                {store?.phone && (
                  <p>
                    <Phone size={14} />
                    <a href={`tel:${store.phone}`}>{store.phone}</a>
                  </p>
                )}
                {store?.email && (
                  <p>
                    <Email size={14} />
                    <a href={`mailto:${store.email}`}>{store.email}</a>
                  </p>
                )}
                {store?.whatsappNumber && (
                  <p>
                    <a
                      href={`https://wa.me/${store.whatsappNumber.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Chat on WhatsApp
                    </a>
                  </p>
                )}
              </div>
            </Tile>
          </div>
        </main>

        {/* Footer */}
        <footer className="order-tracking__footer">
          <p>Powered by <strong>Accurify QuickStore</strong></p>
        </footer>
      </div>
    </Theme>
  );
}

export default OrderTrackingPage;
