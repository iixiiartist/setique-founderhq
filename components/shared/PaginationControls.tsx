/**
 * Pagination Controls Component
 * 
 * Provides navigation controls for paginated data with prefetching.
 */

import React from 'react';
import { PaginationInfo } from '../../lib/services/crmQueryService';

interface PaginationControlsProps {
    pagination: PaginationInfo;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
    onPrefetchNext?: () => void;
}

export function PaginationControls({
    pagination,
    onPageChange,
    isLoading = false,
    onPrefetchNext
}: PaginationControlsProps) {
    const { page, totalPages, hasNextPage, hasPrevPage, totalItems } = pagination;

    // Calculate page range to show (e.g., 1 2 3 ... 10)
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show first, last, and pages around current
            pages.push(1);

            if (page > 3) {
                pages.push('...');
            }

            const start = Math.max(2, page - 1);
            const end = Math.min(totalPages - 1, page + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (page < totalPages - 2) {
                pages.push('...');
            }

            pages.push(totalPages);
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="flex items-center justify-between gap-4 p-4 bg-white border-t-2 border-black">
            {/* Left: Total count */}
            <div className="text-sm font-mono text-gray-600">
                {totalItems.toLocaleString()} total items
            </div>

            {/* Center: Page navigation */}
            <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={!hasPrevPage || isLoading}
                    className="font-mono px-3 py-1.5 border-2 border-black rounded-none font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    title="Previous page"
                >
                    ←
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                    {pageNumbers.map((pageNum, index) => {
                        if (pageNum === '...') {
                            return (
                                <span key={`ellipsis-${index}`} className="px-2 text-gray-400 font-mono">
                                    ...
                                </span>
                            );
                        }

                        const isCurrentPage = pageNum === page;

                        return (
                            <button
                                key={pageNum}
                                onClick={() => onPageChange(pageNum as number)}
                                disabled={isLoading}
                                className={`font-mono px-3 py-1.5 border-2 border-black rounded-none font-semibold transition-all ${
                                    isCurrentPage
                                        ? 'bg-black text-white'
                                        : 'bg-white text-black hover:bg-gray-100'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                title={`Go to page ${pageNum}`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                {/* Next Button */}
                <button
                    onClick={() => onPageChange(page + 1)}
                    onMouseEnter={onPrefetchNext} // Prefetch next page on hover
                    disabled={!hasNextPage || isLoading}
                    className="font-mono px-3 py-1.5 border-2 border-black rounded-none font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    title="Next page"
                >
                    →
                </button>
            </div>

            {/* Right: Page info */}
            <div className="text-sm font-mono text-gray-600">
                Page {page} of {totalPages}
            </div>

            {/* Loading indicator */}
            {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center pointer-events-none">
                    <div className="text-sm font-mono text-gray-600">Loading...</div>
                </div>
            )}
        </div>
    );
}

export default PaginationControls;
