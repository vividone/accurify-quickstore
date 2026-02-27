/**
 * Store Directory Page - Lists all active stores on the platform.
 * Landing page for the storefront application.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Theme,
    Search,
    Tile,
    Button,
    Pagination,
    Tag,
    Select,
    SelectItem,
    SkeletonText,
    SkeletonPlaceholder,
} from '@carbon/react';
import {
    Store as StoreIcon,
    Location,
    ArrowRight,
} from '@carbon/icons-react';
import { useQuery } from '@tanstack/react-query';
import { publicStoreApi } from '@/services/api/public-store.api';
import type { Store } from '@/types/store.types';
import { StoreCategory, StoreCategoryLabels } from '@/types/store.types';
import './StoreDirectoryPage.scss';

export function StoreDirectoryPage() {
    const navigate = useNavigate();

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<StoreCategory | null>(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(12);

    // All available categories
    const categories = Object.values(StoreCategory);

    // React Query — replaces useEffect + stores/loading/error/totalItems state
    const { data: storesData, isLoading, isError, refetch } = useQuery({
        queryKey: ['stores', page, pageSize, searchQuery, selectedCategory],
        queryFn: () =>
            publicStoreApi.listStores(page, pageSize,
                searchQuery || undefined,
                selectedCategory ?? undefined),
    });
    const stores: Store[] = storesData?.data?.content ?? [];
    const totalItems: number = storesData?.data?.totalElements ?? 0;

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

    if (isLoading && stores.length === 0) {
        return (
            <Theme theme="white">
                <div className="directory">
                    {/* Skeleton hero */}
                    <header className="directory__hero">
                        <div className="directory__hero-content">
                            <h1 className="directory__hero-title">
                                <SkeletonPlaceholder className="directory__skeleton-logo" />
                                <SkeletonText heading width="160px" />
                            </h1>
                            <SkeletonText width="280px" />
                        </div>
                    </header>

                    {/* Skeleton search bar */}
                    <section className="directory__search">
                        <div className="directory__search-container">
                            <SkeletonPlaceholder className="directory__skeleton-search" />
                            <SkeletonPlaceholder className="directory__skeleton-category" />
                        </div>
                    </section>

                    {/* Skeleton store cards */}
                    <main className="directory__main">
                        <div className="directory__grid">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Tile key={i} className="directory__store-card directory__store-card--skeleton">
                                    <div className="directory__store-header">
                                        <SkeletonPlaceholder className="directory__skeleton-store-logo" />
                                        <div className="directory__store-info">
                                            <SkeletonText heading width="70%" />
                                            <SkeletonText width="50%" />
                                        </div>
                                    </div>
                                    <SkeletonText width="80px" />
                                    <SkeletonText lineCount={2} width="100%" />
                                    <div className="directory__store-footer">
                                        <SkeletonText width="120px" />
                                        <SkeletonText width="80px" />
                                    </div>
                                </Tile>
                            ))}
                        </div>
                    </main>
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
                        <h1 className="directory__hero-title">
                            <img src="/accurify-logo-white.svg" alt="Accurify" className="directory__hero-logo" />
                            <span>QuickStore</span>
                        </h1>
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
                    {isError ? (
                        <div className="directory__error">
                            <StoreIcon size={48} />
                            <h2>Something went wrong</h2>
                            <p>Failed to load stores. Please try again.</p>
                            <Button onClick={() => refetch()}>
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
                                                    onError={(e) => {
                                                        const img = e.currentTarget;
                                                        img.style.display = 'none';
                                                        const placeholder = img.nextElementSibling as HTMLElement | null;
                                                        if (placeholder) placeholder.style.display = '';
                                                    }}
                                                />
                                            ) : null}
                                            <div
                                                className="directory__store-logo-placeholder"
                                                style={store.logoUrl ? { display: 'none' } : undefined}
                                            >
                                                {store.storeName.charAt(0).toUpperCase()}
                                            </div>
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
                    <p>Powered by <img src="/accurify-logo-main.svg" alt="Accurify" className="directory__footer-logo" /></p>
                </footer>
            </div>
        </Theme>
    );
}

export default StoreDirectoryPage;
