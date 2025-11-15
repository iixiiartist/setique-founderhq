import React, { useState, useMemo } from 'react';
import { Deal, AnyCrmItem, Contact, AppActions, Priority, ProductService } from '../../types';
import { DollarSign, Plus, TrendingUp, Calendar, User, Target, Filter, X, Edit, Trash2, Package } from 'lucide-react';

interface DealsModuleProps {
  deals: Deal[];
  crmItems: AnyCrmItem[];
  productsServices: ProductService[];
  actions: AppActions;
  workspaceId: string;
  userId?: string;
  workspaceMembers?: Array<{ id: string; name: string }>;
}

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as const;
const CATEGORIES = ['investment', 'customer_deal', 'partnership', 'other'] as const;

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-800 border-gray-400',
  qualified: 'bg-blue-100 text-blue-800 border-blue-400',
  proposal: 'bg-purple-100 text-purple-800 border-purple-400',
  negotiation: 'bg-yellow-100 text-yellow-800 border-yellow-600',
  closed_won: 'bg-green-100 text-green-800 border-green-600',
  closed_lost: 'bg-red-100 text-red-800 border-red-600',
};

const formatCurrency = (value: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

function DealsModule({
  deals,
  crmItems,
  productsServices,
  actions,
  workspaceId,
  userId,
  workspaceMembers = [],
}: DealsModuleProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'value' | 'stage' | 'date'>('date');
  const [formData, setFormData] = useState({
    title: '',
    crmItemId: '',
    contactId: '',
    productServiceId: '',
    quantity: '1',
    unitPrice: '',
    discountPercent: '0',
    value: '',
    currency: 'USD',
    stage: 'lead' as Deal['stage'],
    probability: '0',
    expectedCloseDate: '',
    source: '',
    category: 'customer_deal' as Deal['category'],
    priority: 'Medium' as Priority,
    assignedTo: '',
  });

  // Get contacts for selected CRM item
  const availableContacts = useMemo(() => {
    if (!formData.crmItemId) return [];
    const crmItem = crmItems.find(item => item.id === formData.crmItemId);
    return crmItem?.contacts || [];
  }, [formData.crmItemId, crmItems]);

  // Auto-calculate deal value when product/quantity/discount changes
  const selectedProduct = useMemo(() => {
    if (!formData.productServiceId) return null;
    return productsServices.find(p => p.id === formData.productServiceId);
  }, [formData.productServiceId, productsServices]);

  const calculatedValue = useMemo(() => {
    const quantity = parseFloat(formData.quantity) || 1;
    const unitPrice = parseFloat(formData.unitPrice) || 0;
    const discountPercent = parseFloat(formData.discountPercent) || 0;
    
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discountPercent / 100);
    return subtotal - discountAmount;
  }, [formData.quantity, formData.unitPrice, formData.discountPercent]);

  // Update unit price when product is selected
  const handleProductChange = (productId: string) => {
    const product = productsServices.find(p => p.id === productId);
    if (product) {
      setFormData(prev => ({
        ...prev,
        productServiceId: productId,
        unitPrice: product.basePrice.toString(),
        currency: product.currency,
        title: prev.title || product.name,
        value: (parseFloat(prev.quantity || '1') * product.basePrice).toString(),
      }));
    } else {
      setFormData(prev => ({ ...prev, productServiceId: '', unitPrice: '' }));
    }
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
    const weightedValue = deals.reduce((sum, deal) => 
      sum + (deal.value * (deal.probability / 100)), 0
    );
    const wonDeals = deals.filter(d => d.stage === 'closed_won');
    const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const activeDeals = deals.filter(d => 
      !['closed_won', 'closed_lost'].includes(d.stage)
    ).length;

    return {
      totalValue,
      weightedValue,
      wonValue,
      activeDeals,
      wonCount: wonDeals.length,
    };
  }, [deals]);

  // Filter and sort deals
  const filteredDeals = useMemo(() => {
    let filtered = deals.filter(deal => {
      if (filterStage !== 'all' && deal.stage !== filterStage) return false;
      if (filterCategory !== 'all' && deal.category !== filterCategory) return false;
      return true;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return b.value - a.value;
        case 'stage':
          return STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage);
        case 'date':
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return filtered;
  }, [deals, filterStage, filterCategory, sortBy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workspaceId) {
      alert('Workspace ID not available');
      return;
    }

    const assignedUser = workspaceMembers.find(m => m.id === formData.assignedTo);
    
    const quantity = parseFloat(formData.quantity) || 1;
    const unitPrice = parseFloat(formData.unitPrice) || 0;
    const discountPercent = parseFloat(formData.discountPercent) || 0;
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discountPercent / 100);
    const totalValue = subtotal - discountAmount;

    let result;
    if (editingDeal) {
      // Update existing deal
      result = await actions.updateDeal(editingDeal.id, {
        title: formData.title,
        crmItemId: formData.crmItemId || undefined,
        contactId: formData.contactId || undefined,
        productServiceId: formData.productServiceId || undefined,
        productServiceName: selectedProduct?.name || undefined,
        quantity: formData.productServiceId ? quantity : undefined,
        unitPrice: formData.productServiceId ? unitPrice : undefined,
        discountPercent: formData.productServiceId ? discountPercent : undefined,
        discountAmount: formData.productServiceId ? discountAmount : undefined,
        totalValue: formData.productServiceId ? totalValue : undefined,
        value: parseFloat(formData.value) || totalValue,
        currency: formData.currency,
        stage: formData.stage,
        probability: parseInt(formData.probability),
        expectedCloseDate: formData.expectedCloseDate || undefined,
        source: formData.source || undefined,
        category: formData.category,
        priority: formData.priority as Priority,
        assignedTo: formData.assignedTo || null,
        assignedToName: assignedUser?.name || null,
      });
    } else {
      // Create new deal
      result = await actions.createDeal({
        workspaceId,
        title: formData.title,
        crmItemId: formData.crmItemId || undefined,
        contactId: formData.contactId || undefined,
        productServiceId: formData.productServiceId || undefined,
        productServiceName: selectedProduct?.name || undefined,
        quantity: formData.productServiceId ? quantity : undefined,
        unitPrice: formData.productServiceId ? unitPrice : undefined,
        discountPercent: formData.productServiceId ? discountPercent : undefined,
        discountAmount: formData.productServiceId ? discountAmount : undefined,
        totalValue: formData.productServiceId ? totalValue : undefined,
        value: parseFloat(formData.value) || totalValue,
        currency: formData.currency,
        stage: formData.stage,
        probability: parseInt(formData.probability),
        expectedCloseDate: formData.expectedCloseDate || undefined,
        source: formData.source || undefined,
        category: formData.category,
        priority: formData.priority as Priority,
        assignedTo: formData.assignedTo || null,
        assignedToName: assignedUser?.name || null,
      });
    }

    if (result.success) {
      setShowForm(false);
      setEditingDeal(null);
      setFormData({
        title: '',
        crmItemId: '',
        contactId: '',
        productServiceId: '',
        quantity: '1',
        unitPrice: '',
        discountPercent: '0',
        value: '',
        currency: 'USD',
        stage: 'lead',
        probability: '0',
        expectedCloseDate: '',
        source: '',
        category: 'customer_deal',
        priority: 'Medium',
        assignedTo: '',
      });
    } else {
      alert(result.message);
    }
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setFormData({
      title: deal.title,
      crmItemId: deal.crmItemId || '',
      contactId: deal.contactId || '',
      productServiceId: deal.productServiceId || '',
      quantity: deal.quantity?.toString() || '1',
      unitPrice: deal.unitPrice?.toString() || '',
      discountPercent: deal.discountPercent?.toString() || '0',
      value: deal.value.toString(),
      currency: deal.currency,
      stage: deal.stage,
      probability: deal.probability.toString(),
      expectedCloseDate: deal.expectedCloseDate || '',
      source: deal.source || '',
      category: deal.category,
      priority: deal.priority,
      assignedTo: deal.assignedTo || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;
    
    const result = await actions.deleteDeal(dealId);
    if (!result.success) {
      alert(result.message);
    }
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingDeal(null);
    setFormData({
      title: '',
      crmItemId: '',
      contactId: '',
      value: '',
      currency: 'USD',
      stage: 'lead',
      probability: '0',
      expectedCloseDate: '',
      source: '',
      category: 'customer_deal',
      priority: 'Medium',
      assignedTo: '',
    });
  };

  return (
    <div className="space-y-8">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-black p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Pipeline Value</span>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</div>
          <div className="text-xs text-gray-600 mt-1">
            Weighted: {formatCurrency(metrics.weightedValue)}
          </div>
        </div>
        
        <div className="bg-white border-2 border-black p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Won Value</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.wonValue)}</div>
          <div className="text-xs text-gray-600 mt-1">
            {metrics.wonCount} deals
          </div>
        </div>
        
        <div className="bg-white border-2 border-black p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Active Deals</span>
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold">{metrics.activeDeals}</div>
        </div>
        
        <div className="bg-white border-2 border-black p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Avg Deal Size</span>
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold">
            {deals.length > 0 ? formatCurrency(metrics.totalValue / deals.length) : '$0'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="p-2 border-2 border-black focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Stages</option>
              {STAGES.map(stage => (
                <option key={stage} value={stage}>
                  {stage.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="p-2 border-2 border-black focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'value' | 'stage' | 'date')}
            className="p-2 border-2 border-black focus:outline-none focus:border-blue-500"
          >
            <option value="date">Sort by Date</option>
            <option value="value">Sort by Value</option>
            <option value="stage">Sort by Stage</option>
          </select>
        </div>

        <button
          onClick={() => {
            if (showForm) {
              handleCancelEdit();
            } else {
              setShowForm(true);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white font-bold hover:bg-gray-800"
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showForm ? 'Cancel' : 'New Deal'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border-2 border-black p-6">
          <h3 className="text-xl font-bold mb-4">{editingDeal ? 'Edit Deal' : 'Create New Deal'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Deal Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Acme Corp - Q1 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Deal['category'] })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Link to Company</label>
                <select
                  value={formData.crmItemId}
                  onChange={(e) => setFormData({ ...formData, crmItemId: e.target.value, contactId: '' })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                >
                  <option value="">No company link</option>
                  {crmItems.map(item => (
                    <option key={item.id} value={item.id}>{item.company}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Primary Contact</label>
                <select
                  value={formData.contactId}
                  onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                  disabled={!formData.crmItemId}
                >
                  <option value="">No contact</option>
                  {availableContacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} {contact.email ? `(${contact.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product/Service Selection */}
            <div className="p-4 bg-blue-50 border-2 border-blue-400">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-blue-900">Product/Service (Optional)</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">Select Product/Service</label>
                  <select
                    value={formData.productServiceId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                  >
                    <option value="">No product/service</option>
                    {productsServices.filter(p => p.status === 'active').map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(product.basePrice)}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.productServiceId && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">Unit Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.unitPrice}
                        onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                        className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">Discount %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.discountPercent}
                        onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                        className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">Calculated Total</label>
                      <div className="w-full p-2 border-2 border-green-500 bg-green-50 font-bold text-green-800">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(calculatedValue)}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-600">Select a product/service to auto-fill pricing, or leave blank for custom deal value</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Deal Value *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Currency</label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                  placeholder="USD"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Win Probability %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Stage *</label>
                <select
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value as Deal['stage'] })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                >
                  {STAGES.filter(s => !s.includes('closed')).map(stage => (
                    <option key={stage} value={stage}>
                      {stage.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Expected Close Date</label>
                <input
                  type="date"
                  value={formData.expectedCloseDate}
                  onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Source</label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Referral, Inbound, Outbound"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Assign To</label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                >
                  <option value="">Unassigned</option>
                  {workspaceMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-black text-white font-bold hover:bg-gray-800"
            >
              {editingDeal ? 'Save Changes' : 'Create Deal'}
            </button>
          </form>
        </div>
      )}

      {/* Deals List */}
      <div className="space-y-4">
        {filteredDeals.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300">
            <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 font-semibold">No deals found</p>
            <p className="text-sm text-gray-500 mt-1">Create your first deal to start tracking opportunities</p>
          </div>
        ) : (
          filteredDeals.map(deal => {
            const linkedCompany = crmItems.find(item => item.id === deal.crmItemId);
            
            return (
              <div
                key={deal.id}
                className="bg-white border-2 border-black p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{deal.title}</h3>
                      <span className={`px-2 py-1 text-xs font-bold border ${STAGE_COLORS[deal.stage]}`}>
                        {deal.stage.replace('_', ' ').toUpperCase()}
                      </span>
                      {deal.priority === 'High' && (
                        <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-800 border border-red-400">
                          HIGH PRIORITY
                        </span>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={() => handleEdit(deal)}
                          className="p-1 hover:bg-gray-100 border-2 border-black"
                          title="Edit deal"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(deal.id)}
                          className="p-1 hover:bg-red-50 border-2 border-black text-red-600"
                          title="Delete deal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {linkedCompany && (
                      <p className="text-sm text-gray-600 mb-1">
                        🏢 {linkedCompany.company}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {deal.category.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(deal.value, deal.currency)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {deal.probability}% probability
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Weighted: {formatCurrency(deal.value * (deal.probability / 100))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
                  {deal.expectedCloseDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div className="text-xs">
                        <div className="text-gray-500">Expected Close</div>
                        <div className="font-semibold">{formatDate(deal.expectedCloseDate)}</div>
                      </div>
                    </div>
                  )}
                  
                  {deal.assignedToName && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <div className="text-xs">
                        <div className="text-gray-500">Assigned To</div>
                        <div className="font-semibold">{deal.assignedToName}</div>
                      </div>
                    </div>
                  )}
                  
                  {deal.source && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-500" />
                      <div className="text-xs">
                        <div className="text-gray-500">Source</div>
                        <div className="font-semibold">{deal.source}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs">
                    <div className="text-gray-500">Created</div>
                    <div className="font-semibold">{formatDate(new Date(deal.createdAt).toISOString().split('T')[0])}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default DealsModule;
