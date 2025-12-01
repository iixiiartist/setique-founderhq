import React, { useMemo, useRef } from 'react';
import { MarketingItem, AppActions, ProductService } from '../../types';

interface MarketingItemCardProps {
  item: MarketingItem;
  actions: AppActions;
  onEdit: (item: MarketingItem, triggerRef: React.RefObject<HTMLButtonElement>) => void;
  productsServices?: ProductService[];
}

export const MarketingItemCard: React.FC<MarketingItemCardProps> = ({
  item,
  actions,
  onEdit,
  productsServices = [],
}) => {
  const editButtonRef = useRef<HTMLButtonElement>(null);

  const lastNote = useMemo(() => {
    if (!item.notes?.length) {
      return null;
    }
    return item.notes.reduce((latest, current) => {
      if (!latest || current.timestamp > latest.timestamp) {
        return current;
      }
      return latest;
    }, item.notes[0]);
  }, [item.notes]);

  const isOverdue = useMemo(() => {
    if (!item.dueDate) {
      return false;
    }
    const parsedDueDate = Date.parse(`${item.dueDate}T23:59:59Z`);
    if (Number.isNaN(parsedDueDate)) {
      return false;
    }
    const isComplete = item.status === 'Published' || item.status === 'Cancelled' || item.status === 'Completed';
    return !isComplete && parsedDueDate < Date.now();
  }, [item.dueDate, item.status]);

  const linkedProducts = useMemo(() => {
    if (!item.productServiceIds?.length || productsServices.length === 0) {
      return [] as ProductService[];
    }
    const productLookup = new Map(productsServices.map(product => [product.id, product] as const));
    return item.productServiceIds
      .map(productId => productLookup.get(productId))
      .filter(Boolean) as ProductService[];
  }, [item.productServiceIds, productsServices]);

  const budgetUtilization = useMemo(() => {
    if (!item.campaignBudget || item.campaignBudget <= 0) {
      return 0;
    }
    return ((item.actualSpend || 0) / item.campaignBudget) * 100;
  }, [item.actualSpend, item.campaignBudget]);

  return (
    <li className={`p-4 bg-white border rounded-lg shadow-sm ${isOverdue ? 'border-red-300' : 'border-gray-200'}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-grow overflow-hidden">
            <h4 className="font-semibold text-lg text-gray-900 truncate">{item.title}</h4>
            <div className="flex flex-wrap gap-2 mt-1 text-xs">
              <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md">{item.type}</span>
              {item.channels && item.channels.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
                  {item.channels.length} channel{item.channels.length !== 1 ? 's' : ''}
                </span>
              )}
              {linkedProducts.length > 0 && (
                <span className="px-2 py-0.5 bg-orange-50 border border-orange-200 rounded-md text-orange-700">
                  {linkedProducts.length} product{linkedProducts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <select
              value={item.status}
              onChange={(e) => actions.updateMarketingItem(item.id, { status: e.target.value as MarketingItem['status'] })}
              className="text-xs font-medium bg-white border border-gray-200 p-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Status for ${item.title}`}
            >
              <option>Planned</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Published</option>
              <option>Cancelled</option>
            </select>
            <div className="flex gap-1">
              <button
                ref={editButtonRef}
                onClick={() => onEdit(item, editButtonRef)}
                className="bg-white border border-gray-200 text-gray-700 cursor-pointer text-xs py-1.5 px-3 rounded-md font-medium transition-colors hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete campaign "${item.title}"?`)) {
                    actions.deleteItem('marketing', item.id);
                  }
                }}
                className="text-lg font-bold text-gray-400 hover:text-red-500 transition-colors px-2"
                aria-label={`Delete marketing item: ${item.title}`}
              >
                &times;
              </button>
            </div>
          </div>
        </div>

        {/* Campaign Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-gray-100">
          {item.dueDate && (
            <div>
              <div className="text-gray-500 uppercase">Launch Date</div>
              <div className="font-medium text-gray-900">
                {new Date(`${item.dueDate}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                {isOverdue && <span className="ml-1 text-xs font-medium text-red-600">⚠</span>}
              </div>
            </div>
          )}
          {item.campaignBudget && item.campaignBudget > 0 && (
            <div>
              <div className="text-gray-500 uppercase">Budget</div>
              <div className="font-medium text-gray-900">${item.campaignBudget.toLocaleString()}</div>
              {budgetUtilization > 0 && (
                <div className={`text-xs ${budgetUtilization > 100 ? 'text-red-600' : 'text-green-600'}`}>
                  {budgetUtilization.toFixed(0)}% used
                </div>
              )}
            </div>
          )}
          {item.targetRevenue && item.targetRevenue > 0 && (
            <div>
              <div className="text-gray-500 uppercase">Revenue Goal</div>
              <div className="font-medium text-green-600">${item.targetRevenue.toLocaleString()}</div>
            </div>
          )}
          {item.targetAudience && (
            <div>
              <div className="text-gray-500 uppercase">Audience</div>
              <div className="font-medium text-gray-900 truncate" title={item.targetAudience}>{item.targetAudience}</div>
            </div>
          )}
        </div>

        {/* Campaign Performance KPIs */}
        {item.kpis && (item.kpis.impressions > 0 || item.kpis.clicks > 0 || item.kpis.conversions > 0) && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500 uppercase mb-1">Performance Metrics</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {item.kpis.impressions > 0 && (
                <div className="bg-blue-50 border border-blue-100 p-2 rounded-lg">
                  <div className="text-gray-600">Impressions</div>
                  <div className="font-semibold text-blue-700">{item.kpis.impressions.toLocaleString()}</div>
                </div>
              )}
              {item.kpis.clicks > 0 && (
                <div className="bg-green-50 border border-green-100 p-2 rounded-lg">
                  <div className="text-gray-600">Clicks</div>
                  <div className="font-semibold text-green-700">{item.kpis.clicks.toLocaleString()}</div>
                  {item.kpis.impressions > 0 && (
                    <div className="text-xs text-gray-500">
                      CTR: {((item.kpis.clicks / item.kpis.impressions) * 100).toFixed(2)}%
                    </div>
                  )}
                </div>
              )}
              {item.kpis.engagements > 0 && (
                <div className="bg-purple-50 border border-purple-100 p-2 rounded-lg">
                  <div className="text-gray-600">Engagements</div>
                  <div className="font-semibold text-purple-700">{item.kpis.engagements.toLocaleString()}</div>
                </div>
              )}
              {item.kpis.conversions > 0 && (
                <div className="bg-orange-50 border border-orange-100 p-2 rounded-lg">
                  <div className="text-gray-600">Conversions</div>
                  <div className="font-semibold text-orange-700">{item.kpis.conversions.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {item.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md text-xs">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Last Note */}
        {lastNote && (
          <p className="text-sm pt-2 border-t border-gray-300 italic opacity-80 truncate" title={lastNote.text}>
            <span className="font-bold not-italic text-gray-600">Note:</span> {lastNote.text}
          </p>
        )}
      </div>
    </li>
  );
};

export default MarketingItemCard;
