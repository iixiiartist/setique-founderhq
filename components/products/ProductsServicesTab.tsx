import React, { useState, useMemo } from 'react';
import { ProductService, ProductPriceHistory, Task, AppActions, ProductServiceCategory, ProductServiceType, ProductServiceStatus, RevenueTransaction, Deal } from '../../types';
import KpiCard from '../shared/KpiCard';
import { ProductServiceCard } from './ProductServiceCard';
import { ProductServiceCreateModal } from './ProductServiceCreateModal';
import { ProductServiceDetailModal } from './ProductServiceDetailModal';
import ProductAnalyticsDashboard from './ProductAnalyticsDashboard';
import { useDeleteConfirm } from '../../hooks';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { getAiResponse } from '../../services/groqService';
import { ModerationError, formatModerationErrorMessage } from '../../lib/services/moderationService';
import { searchWeb } from '../../src/lib/services/youSearchService';
import { MarketResearchPanel } from './MarketResearchPanel';
import { showSuccess, showError } from '../../lib/utils/toast';

interface ProductsServicesTabProps {
    workspaceId: string;
    productsServices: ProductService[];
    productPriceHistory?: ProductPriceHistory[];
    tasks: Task[];
    actions: AppActions;
    revenueTransactions?: RevenueTransaction[];
    deals?: Deal[];
}

export function ProductsServicesTab({ 
    workspaceId,
    productsServices = [],
    productPriceHistory = [],
    tasks,
    actions,
    revenueTransactions = [],
    deals = []
}: ProductsServicesTabProps) {
    const [currentView, setCurrentView] = useState<'catalog' | 'analytics'>('catalog');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<ProductService | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<ProductServiceCategory | 'all'>('all');
    const [typeFilter, setTypeFilter] = useState<ProductServiceType | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<ProductServiceStatus | 'all'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [isSmartSearch, setIsSmartSearch] = useState(false);
    const [smartSearchResults, setSmartSearchResults] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [marketResearchResult, setMarketResearchResult] = useState<string | null>(null);
    const [showMarketResearch, setShowMarketResearch] = useState(false);
    
    const deleteProductConfirm = useDeleteConfirm<ProductService>('product');

    const handleSmartSearch = async () => {
        if (!searchTerm.trim()) return;
        setIsSearching(true);
        try {
            // 1. Internal Semantic Search
            const productList = productsServices.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                category: p.category,
                tags: p.tags
            }));

            const prompt = `
            I have the following products/services:
            ${JSON.stringify(productList)}

            The user is searching for: "${searchTerm}"

            Return a JSON array of IDs for the products that best match the user's intent.
            Example: ["id1", "id2"]
            Return ONLY the JSON array.
            `;

            const history: any[] = [{
                role: 'user',
                parts: [{ text: prompt }]
            }];
            
            const systemPrompt = "You are a smart search assistant.";
            
            const aiResponse = await getAiResponse(history, systemPrompt, false, workspaceId);
            const text = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            
            if (jsonMatch) {
                const ids = JSON.parse(jsonMatch[0]);
                setSmartSearchResults(ids);
            }

            // 2. External Market Research (if requested via specific button or if internal search yields few results)
            // For now, we'll keep this separate to avoid confusion, but we can trigger it here if needed.

        } catch (error) {
            if (error instanceof ModerationError) {
                toast.error(formatModerationErrorMessage(error));
            } else {
                console.error("Smart search failed", error);
            }
        } finally {
            setIsSearching(false);
        }
    };

    const handleMarketResearch = async () => {
        if (!searchTerm.trim()) return;
        setIsSearching(true);
        setShowMarketResearch(true);
        setMarketResearchResult(null);
        
        try {
            // Build a market-focused search query
            const marketQuery = `${searchTerm} current price cost market value pricing wholesale retail 2024 2025`;
            console.log('[MarketResearch] Starting search for:', marketQuery);
            const searchResults = await searchWeb(marketQuery, 'search');
            console.log('[MarketResearch] Full search results:', JSON.stringify(searchResults, null, 2));
            
            // Check for QA response from Groq Compound (preferred path)
            if (searchResults.qa?.answer) {
                console.log('[MarketResearch] Using QA answer from Groq Compound, length:', searchResults.qa.answer.length);
                // Groq Compound returns a synthesized answer with sources
                let response = searchResults.qa.answer;
                
                // Add sources if available
                if (searchResults.hits && searchResults.hits.length > 0) {
                    console.log('[MarketResearch] Adding sources:', searchResults.hits.length);
                    response += '\n\n## Sources\n';
                    searchResults.hits.forEach((hit: any, idx: number) => {
                        if (hit.url && hit.title) {
                            response += `${idx + 1}. [${hit.title}](${hit.url})\n`;
                        }
                    });
                }
                
                setMarketResearchResult(response);
            } else if (searchResults.hits && searchResults.hits.length > 0) {
                console.log('[MarketResearch] Using hits with AI summarization, count:', searchResults.hits.length);
                const context = searchResults.hits.map((h: any) => `[${h.title}](${h.url}): ${h.description}`).join('\n\n');
                
                const prompt = `
                The user is researching: "${searchTerm}"
                
                Here are the top search results:
                ${context}
                
                Please provide a concise summary of the market information, pricing, and key competitors found.
                Format as markdown with clear sections.
                `;
                
                const aiResponse = await getAiResponse(
                    [{ role: 'user', parts: [{ text: prompt }] }],
                    "You are a market research assistant. Provide concise, actionable market insights.",
                    false,
                    workspaceId
                );
                
                setMarketResearchResult(aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis generated.");
            } else {
                console.warn('[MarketResearch] No results returned from search. Full response:', JSON.stringify(searchResults, null, 2));
                const errorDetails = searchResults.metadata?.error || searchResults.error || 'Unknown reason';
                setMarketResearchResult(`No online results found. ${typeof errorDetails === 'string' ? errorDetails : 'Please try again later.'}`);
            }
        } catch (error) {
            console.error("[MarketResearch] Error:", error);
            if (error instanceof ModerationError) {
                setMarketResearchResult(formatModerationErrorMessage(error));
            } else {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error("Market research failed:", errorMessage);
                setMarketResearchResult(`Failed to perform market research: ${errorMessage}`);
            }
        } finally {
            setIsSearching(false);
        }
    };

    // Filter products based on search and filters
    const filteredProducts = useMemo(() => {
        return productsServices.filter(product => {
            // Smart Search Override
            if (isSmartSearch && smartSearchResults.length > 0) {
                return smartSearchResults.includes(product.id);
            }

            // Search filter
            const matchesSearch = searchTerm === '' || 
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.description?.toLowerCase().includes(searchTerm.toLowerCase());
            
            // Category filter
            const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
            
            // Type filter
            const matchesType = typeFilter === 'all' || product.type === typeFilter;
            
            // Status filter
            const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
            
            return matchesSearch && matchesCategory && matchesType && matchesStatus;
        });
    }, [productsServices, searchTerm, categoryFilter, typeFilter, statusFilter]);

    // Calculate KPIs
    const kpis = useMemo(() => {
        const activeProducts = productsServices.filter(p => p.status === 'active');
        const totalRevenue = productsServices.reduce((sum, p) => sum + (p.totalRevenue || 0), 0);
        const totalUnitsSold = productsServices.reduce((sum, p) => sum + (p.totalUnitsSold || 0), 0);
        
        // Calculate average profit margin
        const productsWithMargin = productsServices.filter(p => p.basePrice && p.basePrice > 0);
        const avgMargin = productsWithMargin.length > 0
            ? productsWithMargin.reduce((sum, p) => {
                const totalCost = (p.costOfGoods || 0) + (p.costOfService || 0) + (p.overheadAllocation || 0);
                const margin = ((p.basePrice! - totalCost) / p.basePrice!) * 100;
                return sum + margin;
            }, 0) / productsWithMargin.length
            : 0;

        return {
            totalProducts: productsServices.length,
            activeProducts: activeProducts.length,
            totalRevenue,
            totalUnitsSold,
            avgMargin
        };
    }, [productsServices]);

    const handleCreateProduct = () => {
        setShowCreateModal(true);
    };

    const handleProductClick = (product: ProductService) => {
        setSelectedProduct(product);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Products & Services</h1>
                    <p className="text-gray-600 mt-1">Manage your product catalog and service offerings</p>
                </div>
                <button
                    onClick={handleCreateProduct}
                    className="px-4 py-2 bg-blue-500 text-white font-bold border border-blue-600 rounded-md shadow-sm hover:bg-blue-600 transition-colors"
                >
                    + Add Product/Service
                </button>
            </div>
            
            {/* View Selector */}
            <div className="flex gap-2">
                <button
                    onClick={() => setCurrentView('catalog')}
                    className={`px-4 py-2 border border-gray-300 rounded-md font-semibold transition-all ${
                        currentView === 'catalog'
                            ? 'bg-black text-white'
                            : 'bg-white hover:bg-gray-50'
                    }`}
                >
                    Product Catalog
                </button>
                <button
                    onClick={() => setCurrentView('analytics')}
                    className={`px-4 py-2 border border-gray-300 rounded-md font-semibold transition-all ${
                        currentView === 'analytics'
                            ? 'bg-black text-white'
                            : 'bg-white hover:bg-gray-50'
                    }`}
                >
                    Analytics Dashboard
                </button>
            </div>
            
            {/* Analytics View */}
            {currentView === 'analytics' && (
                <ProductAnalyticsDashboard
                    productsServices={productsServices}
                    revenueTransactions={revenueTransactions}
                    deals={deals}
                />
            )}
            
            {/* Market Research Results */}
            {showMarketResearch && (
                <MarketResearchPanel
                    query={searchTerm || 'Market Research'}
                    rawReport={marketResearchResult}
                    isLoading={isSearching && !marketResearchResult}
                    onClose={() => setShowMarketResearch(false)}
                />
            )}

            {/* Catalog View */}
            {currentView === 'catalog' && (
            <>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <KpiCard
                    title="Total Items"
                    value={kpis.totalProducts.toString()}
                    description="Products & Services"
                />
                <KpiCard
                    title="Active"
                    value={kpis.activeProducts.toString()}
                    description="Currently offered"
                />
                <KpiCard
                    title="Total Revenue"
                    value={`$${kpis.totalRevenue.toLocaleString()}`}
                    description="All-time sales"
                />
                <KpiCard
                    title="Units Sold"
                    value={kpis.totalUnitsSold.toLocaleString()}
                    description="Total units"
                />
                <KpiCard
                    title="Avg Margin"
                    value={`${kpis.avgMargin.toFixed(1)}%`}
                    description="Profit margin"
                />
            </div>

            {/* Filters and Search */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {/* Search */}
                    <div className="md:col-span-2 flex flex-col gap-2">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder={isSmartSearch ? "Describe what you're looking for..." : "Search products/services..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && isSmartSearch) {
                                        handleSmartSearch();
                                    }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                            />
                            <button
                                onClick={() => {
                                    setIsSmartSearch(!isSmartSearch);
                                    if (!isSmartSearch) {
                                        setSmartSearchResults([]);
                                        setShowMarketResearch(false);
                                    }
                                }}
                                className={`px-2 py-1 border border-gray-300 rounded-md font-mono text-xs ${isSmartSearch ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}
                                title="Toggle AI Features"
                            >
                                {isSmartSearch ? '✨ AI' : 'AI'}
                            </button>
                        </div>
                        
                        {isSmartSearch && (
                            <div className="flex gap-2 animate-fadeIn">
                                <button
                                    onClick={handleSmartSearch}
                                    disabled={isSearching}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded-md bg-black text-white font-mono text-xs hover:bg-gray-800 disabled:opacity-50"
                                >
                                    {isSearching ? 'Searching...' : '🔍 Filter My Products'}
                                </button>
                                <button
                                    onClick={handleMarketResearch}
                                    disabled={isSearching}
                                    className="flex-1 px-2 py-1 border border-blue-700 rounded-md bg-blue-600 text-white font-mono text-xs hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isSearching ? 'Researching...' : '🌐 Research Online'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value as ProductServiceCategory | 'all')}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                    >
                        <option value="all">All Categories</option>
                        <option value="product">Products</option>
                        <option value="service">Services</option>
                        <option value="bundle">Bundles</option>
                    </select>

                    {/* Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as ProductServiceType | 'all')}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                    >
                        <option value="all">All Types</option>
                        <option value="digital">Digital</option>
                        <option value="physical">Physical</option>
                        <option value="saas">SaaS</option>
                        <option value="consulting">Consulting</option>
                        <option value="package">Package</option>
                        <option value="subscription">Subscription</option>
                        <option value="booking">Booking</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as ProductServiceStatus | 'all')}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                        <option value="out_of_stock">Out of Stock</option>
                    </select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                        {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1 border border-gray-300 rounded-md font-bold ${
                                viewMode === 'grid' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-white hover:bg-gray-100'
                            }`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 border border-gray-300 rounded-md font-bold ${
                                viewMode === 'list' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-white hover:bg-gray-100'
                            }`}
                        >
                            List
                        </button>
                    </div>
                </div>
            </div>

            {/* Products Grid/List */}
            {filteredProducts.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
                    <div className="text-6xl mb-4">📦</div>
                    <h3 className="text-xl font-bold mb-2">No Products or Services Yet</h3>
                    <p className="text-gray-600 mb-6">
                        {searchTerm || categoryFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all'
                            ? 'No items match your filters. Try adjusting your search criteria.'
                            : 'Start building your catalog by adding your first product or service.'}
                    </p>
                    {!searchTerm && categoryFilter === 'all' && typeFilter === 'all' && statusFilter === 'all' && (
                        <button
                            onClick={handleCreateProduct}
                            className="px-6 py-3 bg-blue-500 text-white font-bold border border-blue-600 rounded-md shadow-sm hover:bg-blue-600 transition-colors"
                        >
                            + Add Your First Item
                        </button>
                    )}
                </div>
            ) : (
                <div className={viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-3'
                }>
                    {filteredProducts.map(product => (
                        <ProductServiceCard
                            key={product.id}
                            product={product}
                            viewMode={viewMode}
                            onClick={() => handleProductClick(product)}
                            onEdit={() => handleProductClick(product)}
                            onDelete={() => {
                                deleteProductConfirm.requestConfirm(product, (p) => {
                                    actions.deleteProductService?.(p.id);
                                });
                            }}
                        />
                    ))}
                </div>
            )}
            </>
            )}

            {/* Modals */}
            {showCreateModal && (
                <ProductServiceCreateModal
                    workspaceId={workspaceId}
                    onClose={() => setShowCreateModal(false)}
                    onCreate={async (product) => {
                        const result = await actions.createProductService?.(product);
                        if (result?.success) {
                            showSuccess('Product/Service created successfully');
                        } else {
                            showError(result?.message || 'Failed to create product/service');
                        }
                        setShowCreateModal(false);
                    }}
                />
            )}

            {selectedProduct && (
                <ProductServiceDetailModal
                    product={selectedProduct}
                    priceHistory={productPriceHistory.filter(h => h.productServiceId === selectedProduct.id)}
                    onClose={() => setSelectedProduct(null)}
                    onUpdate={async (updates) => {
                        const result = await actions.updateProductService?.(selectedProduct.id, updates);
                        if (result?.success) {
                            showSuccess('Product/Service updated successfully');
                        } else {
                            showError(result?.message || 'Failed to update product/service');
                        }
                        setSelectedProduct(null);
                    }}
                    onDelete={() => {
                        deleteProductConfirm.requestConfirm(selectedProduct, async (p) => {
                            const result = await actions.deleteProductService?.(p.id);
                            if (result?.success) {
                                showSuccess('Product/Service deleted successfully');
                            } else {
                                showError(result?.message || 'Failed to delete product/service');
                            }
                            setSelectedProduct(null);
                        });
                    }}
                    onAdjustInventory={async (quantityChange, reason) => {
                        const result = await actions.updateProductInventory?.(selectedProduct.id, quantityChange, reason);
                        return result || { success: false, message: 'Action not available' };
                    }}
                    onReserveInventory={async (quantity) => {
                        const result = await actions.reserveProductInventory?.(selectedProduct.id, quantity);
                        return result || { success: false, message: 'Action not available' };
                    }}
                    onReleaseInventory={async (quantity) => {
                        const result = await actions.releaseProductInventory?.(selectedProduct.id, quantity);
                        return result || { success: false, message: 'Action not available' };
                    }}
                />
            )}

            {/* Delete Product Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteProductConfirm.isOpen}
                onClose={deleteProductConfirm.cancel}
                onConfirm={deleteProductConfirm.confirm}
                title={deleteProductConfirm.title}
                message={deleteProductConfirm.message}
                confirmLabel={deleteProductConfirm.confirmLabel}
                cancelLabel={deleteProductConfirm.cancelLabel}
                variant={deleteProductConfirm.variant}
                isLoading={deleteProductConfirm.isProcessing}
            />
        </div>
    );
}

export default ProductsServicesTab;
