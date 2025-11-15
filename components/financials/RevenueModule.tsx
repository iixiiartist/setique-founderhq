import React, { useState, useMemo } from 'react';
import { DashboardData, AppActions, ProductService } from '../../types';
import { Plus, DollarSign, TrendingUp, Calendar, CheckCircle, Clock, XCircle, Package } from 'lucide-react';

interface RevenueModuleProps {
  data: DashboardData;
  actions: AppActions;
  workspaceId: string;
  productsServices: ProductService[];
}

const TRANSACTION_TYPES = ['invoice', 'payment', 'refund', 'recurring'] as const;
const TRANSACTION_STATUSES = ['pending', 'paid', 'overdue', 'cancelled'] as const;
const REVENUE_CATEGORIES = ['product_sale', 'service_fee', 'subscription', 'consulting', 'partnership', 'other'] as const;

const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'paid':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-600" />;
    case 'overdue':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4 text-gray-400" />;
    default:
      return null;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-600';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-600';
    case 'overdue':
      return 'bg-red-100 text-red-800 border-red-600';
    case 'cancelled':
      return 'bg-gray-100 text-gray-600 border-gray-400';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-400';
  }
};

function RevenueModule({
  data,
  actions,
  workspaceId,
  productsServices = [],
}: RevenueModuleProps) {
  const revenueTransactions = data?.revenueTransactions || [];
  const crmItems = [...(data?.investors || []), ...(data?.customers || []), ...(data?.partners || [])];
  const contacts = crmItems.flatMap(item => item.contacts || []);
  
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [formData, setFormData] = useState({
    transactionDate: new Date().toISOString().split('T')[0],
    amount: '',
    currency: 'USD',
    transactionType: 'invoice' as typeof TRANSACTION_TYPES[number],
    status: 'pending' as typeof TRANSACTION_STATUSES[number],
    crmItemId: '',
    contactId: '',
    invoiceNumber: '',
    paymentMethod: '',
    dueDate: '',
    revenueCategory: 'product_sale' as typeof REVENUE_CATEGORIES[number],
    description: '',
    productServiceId: '',
    quantity: '1',
    unitPrice: '',
  });

  // Product selection and auto-fill
  const selectedProduct = useMemo(() => {
    return productsServices.find(p => p.id === formData.productServiceId);
  }, [productsServices, formData.productServiceId]);

  const handleProductChange = (productId: string) => {
    const product = productsServices.find(p => p.id === productId);
    if (product) {
      const quantity = parseFloat(formData.quantity) || 1;
      const calculatedAmount = product.basePrice * quantity;
      setFormData(prev => ({
        ...prev,
        productServiceId: productId,
        unitPrice: product.basePrice.toString(),
        amount: calculatedAmount.toString(),
        currency: product.currency,
        revenueCategory: 'product_sale',
        description: prev.description || `Revenue from ${product.name}`,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        productServiceId: '',
        unitPrice: '',
      }));
    }
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = revenueTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const paid = revenueTransactions
      .filter(tx => tx.status === 'paid')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const pending = revenueTransactions
      .filter(tx => tx.status === 'pending')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const overdue = revenueTransactions
      .filter(tx => tx.status === 'overdue')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Calculate MRR (Monthly Recurring Revenue)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const mrr = revenueTransactions
      .filter(tx => tx.transactionType === 'recurring' && tx.status === 'paid')
      .filter(tx => tx.transactionDate.startsWith(currentMonth))
      .reduce((sum, tx) => sum + tx.amount, 0);

    return { total, paid, pending, overdue, mrr };
  }, [revenueTransactions]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = revenueTransactions;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(tx => tx.status === filterStatus);
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
      } else {
        return b.amount - a.amount;
      }
    });
  }, [revenueTransactions, filterStatus, sortBy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!workspaceId) {
      alert('Workspace ID not available');
      return;
    }

    const quantity = formData.productServiceId ? parseFloat(formData.quantity) || 1 : undefined;
    const unitPrice = formData.productServiceId ? parseFloat(formData.unitPrice) || 0 : undefined;

    await actions.createRevenueTransaction({
      workspaceId: workspaceId,
      userId: '', // Will be set by the action handler
      transactionDate: formData.transactionDate,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      transactionType: formData.transactionType,
      status: formData.status,
      crmItemId: formData.crmItemId || undefined,
      contactId: formData.contactId || undefined,
      invoiceNumber: formData.invoiceNumber || undefined,
      paymentMethod: formData.paymentMethod || undefined,
      dueDate: formData.dueDate || undefined,
      revenueCategory: formData.revenueCategory,
      description: formData.description || undefined,
      productServiceId: formData.productServiceId || undefined,
      quantity: quantity,
      unitPrice: unitPrice,
      notes: [],
    });

    // Reset form
    setFormData({
      transactionDate: new Date().toISOString().split('T')[0],
      amount: '',
      currency: 'USD',
      transactionType: 'invoice',
      status: 'pending',
      crmItemId: '',
      contactId: '',
      invoiceNumber: '',
      paymentMethod: '',
      dueDate: '',
      revenueCategory: 'product_sale',
      description: '',
      productServiceId: '',
      quantity: '1',
      unitPrice: '',
    });
    setShowForm(false);
  };

  const handleStatusUpdate = async (transactionId: string, newStatus: typeof TRANSACTION_STATUSES[number]) => {
    await actions.updateRevenueTransaction(transactionId, {
      status: newStatus,
      paymentDate: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Revenue Tracking</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 border-2 border-black shadow-neo-btn hover:bg-green-700 transition-colors font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 border-2 border-black shadow-neo">
          <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.total)}</div>
        </div>
        <div className="bg-green-50 p-4 border-2 border-green-600 shadow-neo">
          <div className="text-sm text-gray-600 mb-1">Paid</div>
          <div className="text-2xl font-bold text-green-700">{formatCurrency(metrics.paid)}</div>
        </div>
        <div className="bg-yellow-50 p-4 border-2 border-yellow-600 shadow-neo">
          <div className="text-sm text-gray-600 mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-700">{formatCurrency(metrics.pending)}</div>
        </div>
        <div className="bg-red-50 p-4 border-2 border-red-600 shadow-neo">
          <div className="text-sm text-gray-600 mb-1">Overdue</div>
          <div className="text-2xl font-bold text-red-700">{formatCurrency(metrics.overdue)}</div>
        </div>
        <div className="bg-blue-50 p-4 border-2 border-blue-600 shadow-neo">
          <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            MRR
          </div>
          <div className="text-2xl font-bold text-blue-700">{formatCurrency(metrics.mrr)}</div>
        </div>
      </div>

      {/* Add Transaction Form */}
      {showForm && (
        <div className="bg-white p-6 border-2 border-black shadow-neo">
          <h3 className="text-xl font-semibold mb-4">New Revenue Transaction</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="transaction-date" className="block text-sm font-semibold mb-1">Transaction Date *</label>
                <input
                  id="transaction-date"
                  name="transaction-date"
                  type="date"
                  value={formData.transactionDate}
                  onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="transaction-amount" className="block text-sm font-semibold mb-1">Amount *</label>
                <input
                  id="transaction-amount"
                  name="transaction-amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                  placeholder="1000.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Type *</label>
                <select
                  value={formData.transactionType}
                  onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as any })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                >
                  {TRANSACTION_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                >
                  {TRANSACTION_STATUSES.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Category</label>
                <select
                  value={formData.revenueCategory}
                  onChange={(e) => setFormData({ ...formData, revenueCategory: e.target.value as any })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                >
                  {REVENUE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Invoice #</label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                  placeholder="INV-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Link to CRM Deal</label>
                <select
                  value={formData.crmItemId}
                  onChange={(e) => setFormData({ ...formData, crmItemId: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select a deal...</option>
                  {crmItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.company} - {'dealValue' in item && item.dealValue ? formatCurrency(item.dealValue) : 'No value'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Link to Contact</label>
                <select
                  value={formData.contactId}
                  onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                  className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select a contact...</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} {contact.email ? `(${contact.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product/Service Selector */}
            <div className="p-4 bg-purple-50 border-2 border-purple-400">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-purple-700" />
                <h4 className="font-semibold text-purple-900">Product/Service (Optional)</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">Select Product/Service</label>
                  <select
                    value={formData.productServiceId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full p-2 border-2 border-purple-600 focus:outline-none focus:border-purple-700 bg-white"
                  >
                    <option value="">None - Manual entry</option>
                    {productsServices
                      .filter(p => p.status === 'active')
                      .map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {formatCurrency(product.basePrice, product.currency)}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">
                    Link this revenue to a product/service for automatic amount calculation
                  </p>
                </div>

                {formData.productServiceId && selectedProduct && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={formData.quantity}
                        onChange={(e) => {
                          const quantity = parseFloat(e.target.value) || 1;
                          const unitPrice = parseFloat(formData.unitPrice) || 0;
                          setFormData({
                            ...formData,
                            quantity: e.target.value,
                            amount: (quantity * unitPrice).toString(),
                          });
                        }}
                        className="w-full p-2 border-2 border-purple-600 focus:outline-none focus:border-purple-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Unit Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.unitPrice}
                        onChange={(e) => {
                          const quantity = parseFloat(formData.quantity) || 1;
                          const unitPrice = parseFloat(e.target.value) || 0;
                          setFormData({
                            ...formData,
                            unitPrice: e.target.value,
                            amount: (quantity * unitPrice).toString(),
                          });
                        }}
                        className="w-full p-2 border-2 border-purple-600 focus:outline-none focus:border-purple-700"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="p-3 bg-white border-2 border-purple-600 rounded">
                        <div className="text-xs text-gray-600 mb-1">Calculated Amount</div>
                        <div className="text-xl font-bold text-purple-900">
                          {formatCurrency(
                            (parseFloat(formData.quantity) || 1) * (parseFloat(formData.unitPrice) || 0),
                            selectedProduct.currency
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {formData.quantity} × {formatCurrency(parseFloat(formData.unitPrice) || 0, selectedProduct.currency)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2 border-2 border-black focus:outline-none focus:border-blue-500"
                rows={2}
                placeholder="Payment for Q4 services..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border-2 border-black bg-white hover:bg-gray-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border-2 border-black bg-green-600 text-white hover:bg-green-700 font-semibold shadow-neo-btn"
              >
                Create Transaction
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters and Transactions List */}
      <div className="bg-white p-6 border-2 border-black shadow-neo">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Transactions</h3>
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1 border-2 border-black text-sm font-mono focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              {TRANSACTION_STATUSES.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
              className="px-3 py-1 border-2 border-black text-sm font-mono focus:outline-none focus:border-blue-500"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => {
              const linkedCrm = transaction.crmItemId
                ? crmItems.find(item => item.id === transaction.crmItemId)
                : null;
              const linkedContact = transaction.contactId
                ? contacts.find(c => c.id === transaction.contactId)
                : null;

              return (
                <div
                  key={transaction.id}
                  className="p-4 border-2 border-black shadow-neo hover:shadow-neo-hover transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(transaction.status)}
                        <span className={`px-2 py-1 text-xs font-semibold border ${getStatusColor(transaction.status)}`}>
                          {transaction.status.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-400">
                          {transaction.transactionType.toUpperCase()}
                        </span>
                        {transaction.invoiceNumber && (
                          <span className="text-xs text-gray-600 font-mono">
                            {transaction.invoiceNumber}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-baseline gap-3 mb-2">
                        <div className="text-2xl font-bold">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-3 h-3" />
                          {formatDate(transaction.transactionDate)}
                        </div>
                      </div>

                      {transaction.description && (
                        <p className="text-sm text-gray-700 mb-2">{transaction.description}</p>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs">
                        {linkedCrm && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 border border-purple-400">
                            🏢 {linkedCrm.company}
                          </span>
                        )}
                        {linkedContact && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 border border-blue-400">
                            👤 {linkedContact.name}
                          </span>
                        )}
                        {transaction.revenueCategory && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 border border-gray-400">
                            {transaction.revenueCategory.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {transaction.status !== 'paid' && transaction.status !== 'cancelled' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(transaction.id, 'paid')}
                            className="px-3 py-1 bg-green-600 text-white text-xs font-semibold border border-black hover:bg-green-700"
                            title="Mark as Paid"
                          >
                            Mark Paid
                          </button>
                          {transaction.status === 'pending' && (
                            <button
                              onClick={() => handleStatusUpdate(transaction.id, 'overdue')}
                              className="px-3 py-1 bg-red-600 text-white text-xs font-semibold border border-black hover:bg-red-700"
                              title="Mark as Overdue"
                            >
                              Overdue
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => actions.deleteRevenueTransaction(transaction.id)}
                        className="px-3 py-1 bg-white text-red-600 text-xs font-semibold border border-black hover:bg-red-50"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No revenue transactions yet</p>
              <p className="text-xs mt-1">Click "Add Transaction" to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RevenueModule;
