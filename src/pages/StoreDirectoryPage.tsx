/**
 * Store Directory Page - Lists all active stores on the platform.
 * Landing page for the storefront application.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Theme,
    Loading,
    Search,
    Tile,
    Button,
    Pagination,
    Tag,
    Select,
    SelectItem,
} from '@carbon/react';
import {
    Store as StoreIcon,
    Location,
    ArrowRight,
} from '@carbon/icons-react';
import { publicStoreApi } from '@/services/api/public-store.api';
import type { Store } from '@/types/store.types';
import { StoreCategory, StoreCategoryLabels } from '@/types/store.types';
import './StoreDirectoryPage.scss';

export function StoreDirectoryPage() {
    const navigate = useNavigate();

    // State
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<StoreCategory | null>(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(12);
    const [totalItems, setTotalItems] = useState(0);

    // All available categories
    const categories = Object.values(StoreCategory);

    // Load stores
    useEffect(() => {
        async function loadStores() {
            try {
                setLoading(true);
                setError(null);

                const response = await publicStoreApi.listStores(
                    page,
                    pageSize,
                    searchQuery || undefined,
                    selectedCategory || undefined
                );

                if (response.success && response.data) {
                    setStores(response.data.content);
                    setTotalItems(response.data.totalElements);
                } else {
                    setError('Failed to load stores');
                }
            } catch (err) {
                console.error('Failed to load stores:', err);
                setError('Failed to load stores. Please try again.');
            } finally {
                setLoading(false);
            }
        }

        loadStores();
    }, [page, pageSize, searchQuery, selectedCategory]);

    // Handle search with debounce
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setPage(0); // Reset to first page on search
    };

    // Handle category selection
    const handleCategoryChange = (category: StoreCategory | string) => {
        setSelectedCategory(category ? (category as StoreCategory) : null);
        setPage(0); // Reset to first page
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategory(null);
        setPage(0);
    };

    // Handle pagination
    const handlePageChange = ({ page: newPage, pageSize: newPageSize }: { page: number; pageSize: number }) => {
        setPage(newPage - 1); // Carbon pagination is 1-indexed
        setPageSize(newPageSize);
    };

    // Navigate to store
    const handleStoreClick = (slug: string) => {
        navigate(`/${slug}`);
    };

    if (loading && stores.length === 0) {
        return (
            <Theme theme="white">
                <div className="directory directory--loading">
                    <Loading description="Loading stores..." withOverlay={false} />
                </div>
            </Theme>
        );
    }

    return (
        <Theme theme="white">
            <div className="directory">
                {/* Hero Section */}
                <header className="directory__hero">
                    <div className="directory__hero-content">
                        <h1>Accurify QuickStore</h1>
                        <p>Discover and shop from local businesses</p>
                    </div>
                </header>

                {/* Search & Filter Section */}
                <section className="directory__search">
                    <div className="directory__search-container">
                        <Search
                            size="lg"
                            placeholder="Search stores by name..."
                            labelText="Search stores"
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="directory__search-input"
                        />
                        <Select
                            id="category-filter"
                            labelText="Category"
                            hideLabel
                            size="lg"
                            value={selectedCategory || ''}
                            onChange={(e) => handleCategoryChange(e.target.value)}
                            className="directory__category-select"
                        >
                            <SelectItem value="" text="All Categories" />
                            {categories.map((category) => (
                                <SelectItem
                                    key={category}
                                    value={category}
                                    text={StoreCategoryLabels[category]}
                                />
                            ))}
                        </Select>
                    </div>
                </section>

                {/* Main Content */}
                <main className="directory__main">
                    {error ? (
                        <div className="directory__error">
                            <StoreIcon size={48} />
                            <h2>Something went wrong</h2>
                            <p>{error}</p>
                            <Button onClick={() => window.location.reload()}>
                                Try Again
                            </Button>
                        </div>
                    ) : stores.length === 0 ? (
                        <div className="directory__empty">
                            <StoreIcon size={48} />
                            <h2>No stores found</h2>
                            <p>
                                {searchQuery || selectedCategory
                                    ? `No stores match your filters. Try a different search or category.`
                                    : 'There are no active stores at the moment.'}
                            </p>
                            {(searchQuery || selectedCategory) && (
                                <Button kind="tertiary" onClick={clearFilters}>
                                    Clear filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="directory__grid">
                                {stores.map((store) => (
                                    <Tile
                                        key={store.id}
                                        className="directory__store-card"
                                        onClick={() => handleStoreClick(store.storeSlug)}
                                    >
                                        <div className="directory__store-header">
                                            {store.logoUrl ? (
                                                <img
                                                    src={store.logoUrl}
                                                    alt={store.storeName}
                                                    className="directory__store-logo"
                                                />
                                            ) : (
                                                <div className="directory__store-logo-placeholder">
                                                    {store.storeName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="directory__store-info">
                                                <h3>{store.storeName}</h3>
                                                {store.city && store.state && (
                                                    <span className="directory__store-location">
                                                        <Location size={14} />
                                                        {store.city}, {store.state}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {store.category && (
                                            <Tag type="cool-gray" size="sm" className="directory__store-category">
                                                {StoreCategoryLabels[store.category]}
                                            </Tag>
                                        )}

                                        {store.description && (
                                            <p className="directory__store-description">
                                                {store.description}
                                            </p>
                                        )}

                                        <div className="directory__store-footer">
                                            <span className={`directory__store-status ${store.acceptOrders ? 'directory__store-status--open' : 'directory__store-status--closed'}`}>
                                                {store.acceptOrders ? 'Open for Orders' : 'Not Accepting Orders'}
                                            </span>
                                            <Button
                                                kind="ghost"
                                                size="sm"
                                                renderIcon={ArrowRight}
                                                onClick={(e: React.MouseEvent) => {
                                                    e.stopPropagation();
                                                    handleStoreClick(store.storeSlug);
                                                }}
                                            >
                                                Visit Store
                                            </Button>
                                        </div>
                                    </Tile>
                                ))}
                            </div>

                            {totalItems > pageSize && (
                                <div className="directory__pagination">
                                    <Pagination
                                        page={page + 1}
                                        pageSize={pageSize}
                                        pageSizes={[12, 24, 48]}
                                        totalItems={totalItems}
                                        onChange={handlePageChange}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </main>

                {/* Footer */}
                <footer className="directory__footer">
                    <p>Powered by <strong>Accurify</strong></p>
                </footer>
            </div>
        </Theme>
    );
}

export default StoreDirectoryPage;
