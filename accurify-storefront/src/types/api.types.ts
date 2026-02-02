// Generic API response wrapper
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}

// Paginated response
export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

// Error response
export interface ApiError {
    success: false;
    message: string;
    errors?: Record<string, string[]>;
}

// Pagination params
export interface PaginationParams {
    page?: number;
    size?: number;
    sort?: string;
    direction?: 'ASC' | 'DESC';
}
