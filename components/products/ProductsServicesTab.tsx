import React, { useState, useMemo } from 'react';
import { ProductService, ProductPriceHistory, Task, AppActions, ProductServiceCategory, ProductServiceType, ProductServiceStatus, RevenueTransaction, Deal } from '../../types';
import TaskManagement from '../shared/TaskManagement';
import KpiCard from '../shared/KpiCard';
import { ProductServiceCard } from './ProductServiceCard';
import { ProductServiceCreateModal } from './ProductServiceCreateModal';
import { ProductServiceDetailModal } from './ProductServiceDetailModal';
import ProductAnalyticsDashboard from './ProductAnalyticsDashboard';

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

    // Filter products based on search and filters
    const filteredProducts = useMemo(() => {
        return productsServices.filter(product => {
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
                    className="px-4 py-2 bg-blue-500 text-white font-bold border-2 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                >
                    + Add Product/Service
                </button>
            </div>
            
            {/* View Selector */}
            <div className="flex gap-2">
                <button
                    onClick={() => setCurrentView('catalog')}
                    className={`px-4 py-2 border-2 border-black font-semibold transition-all ${
                        currentView === 'catalog'
                            ? 'bg-black text-white'
                            : 'bg-white hover:bg-gray-50'
                    }`}
                >
                    Product Catalog
                </button>
                <button
                    onClick={() => setCurrentView('analytics')}
                    className={`px-4 py-2 border-2 border-black font-semibold transition-all ${
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
            <div className="bg-white border-2 border-black shadow-neo p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <input
                            type="text"
                            placeholder="Search products/services..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value as ProductServiceCategory | 'all')}
                        className="px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                        <option value="out_of_stock">Out of Stock</option>
                    </select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-black">
                    <p className="text-sm text-gray-600">
                        {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1 border-2 border-black font-bold ${
                                viewMode === 'grid' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-white hover:bg-gray-100'
                            }`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 border-2 border-black font-bold ${
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
                <div className="bg-white border-2 border-black shadow-neo p-12 text-center">
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
                            className="px-6 py-3 bg-blue-500 text-white font-bold border-2 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
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
                                if (window.confirm(`Delete ${product.name}?`)) {
                                    actions.deleteProductService?.(product.id);
                                }
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Tasks Section */}
            <div className="mt-8">
                <TaskManagement
                    tasks={tasks}
                    actions={actions}
                    taskCollectionName="productsServicesTasks"
                    tag="Products"
                    title="Products & Services Tasks"
                    placeholder="e.g., 'Update pricing for Premium Plan'"
                />
            </div>
            </>
            )}

            {/* Modals */}
            {showCreateModal && (
                <ProductServiceCreateModal
                    workspaceId={workspaceId}
                    onClose={() => setShowCreateModal(false)}
                    onCreate={(product) => {
                        actions.createProductService?.(product);
                        setShowCreateModal(false);
                    }}
                />
            )}

            {selectedProduct && (
                <ProductServiceDetailModal
                    product={selectedProduct}
                    priceHistory={productPriceHistory.filter(h => h.productServiceId === selectedProduct.id)}
                    onClose={() => setSelectedProduct(null)}
                    onUpdate={(updates) => {
                        actions.updateProductService?.(selectedProduct.id, updates);
                        setSelectedProduct(null);
                    }}
                    onDelete={() => {
                        if (window.confirm(`Delete ${selectedProduct.name}?`)) {
                            actions.deleteProductService?.(selectedProduct.id);
                            setSelectedProduct(null);
                        }
                    }}
                />
            )}
        </div>
    );
}

export default ProductsServicesTab;
