// supabase/functions/api-v1-products/index.ts
// Premium API - Products & Services endpoint
// GET /api/v1/products - List products/services
// POST /api/v1/products - Create product/service
// GET /api/v1/products/:id - Get single product/service
// PATCH /api/v1/products/:id - Update product/service
// DELETE /api/v1/products/:id - Delete product/service

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import {
  createApiHandler,
  successResponse,
  errorResponse,
  corsHeaders,
  type ApiRequestContext,
  type ApiScope,
} from '../_shared/apiAuth.ts';
import { triggerWebhook } from '../_shared/webhookTrigger.ts';

// ============================================
// TYPES
// ============================================

type ProductCategory = 'product' | 'service' | 'bundle';
type ProductType = 'digital' | 'physical' | 'saas' | 'consulting' | 'package' | 'subscription' | 'booking';
type ProductStatus = 'draft' | 'active' | 'inactive' | 'discontinued' | 'archived' | 'out_of_stock';
type PricingModel = 'flat_rate' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'annual' | 'tiered' | 'usage_based' | 'custom';
type BillingPeriod = 'one_time' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';

// Database row type for products_services table
interface ProductRow {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  sku?: string;
  category: ProductCategory;
  type: ProductType;
  status: ProductStatus;
  pricing_model?: PricingModel;
  base_price?: number;
  currency?: string;
  billing_period?: BillingPeriod;
  cost_of_goods?: number;
  cost_of_service?: number;
  profit_margin_percent?: number;
  inventory_tracked?: boolean;
  quantity_on_hand?: number;
  quantity_reserved?: number;
  quantity_available?: number;
  reorder_point?: number;
  capacity_tracked?: boolean;
  capacity_unit?: string;
  capacity_total?: number;
  capacity_booked?: number;
  capacity_available?: number;
  capacity_period?: string;
  is_taxable?: boolean;
  tax_rate?: number;
  tags?: string[];
  image_url?: string;
  external_url?: string;
  total_revenue?: number;
  total_units_sold?: number;
  last_sold_date?: string;
  created_at: string;
  updated_at: string;
}

interface ListProductsParams {
  limit?: number;
  offset?: number;
  category?: ProductCategory;
  type?: ProductType;
  status?: ProductStatus;
  search?: string;
  min_price?: number;
  max_price?: number;
}

interface CreateProductInput {
  name: string;
  description?: string;
  sku?: string;
  category?: ProductCategory;
  type?: ProductType;
  status?: ProductStatus;
  pricing_model?: PricingModel;
  base_price?: number;
  currency?: string;
  billing_period?: BillingPeriod;
  cost_of_goods?: number;
  cost_of_service?: number;
  inventory_tracked?: boolean;
  quantity_on_hand?: number;
  reorder_point?: number;
  capacity_tracked?: boolean;
  capacity_unit?: 'hours' | 'days' | 'projects' | 'seats';
  capacity_total?: number;
  capacity_period?: 'weekly' | 'monthly' | 'quarterly';
  is_taxable?: boolean;
  tax_rate?: number;
  tags?: string[];
  image_url?: string;
  external_url?: string;
}

interface UpdateProductInput {
  name?: string;
  description?: string;
  sku?: string;
  category?: ProductCategory;
  type?: ProductType;
  status?: ProductStatus;
  pricing_model?: PricingModel;
  base_price?: number;
  currency?: string;
  billing_period?: BillingPeriod;
  cost_of_goods?: number;
  cost_of_service?: number;
  inventory_tracked?: boolean;
  quantity_on_hand?: number;
  quantity_reserved?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  capacity_tracked?: boolean;
  capacity_unit?: 'hours' | 'days' | 'projects' | 'seats';
  capacity_total?: number;
  capacity_booked?: number;
  capacity_period?: 'weekly' | 'monthly' | 'quarterly';
  is_taxable?: boolean;
  tax_rate?: number;
  tags?: string[];
  image_url?: string;
  external_url?: string;
}

// ============================================
// HANDLERS
// ============================================

async function listProducts(
  ctx: ApiRequestContext,
  params: ListProductsParams
): Promise<Response> {
  const { supabase, workspaceId } = ctx;
  const limit = Math.min(params.limit || 50, 100);
  const offset = params.offset || 0;

  let query = supabase
    .from('products_services')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filters
  if (params.category) {
    query = query.eq('category', params.category);
  }
  if (params.type) {
    query = query.eq('type', params.type);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }
  if (params.min_price !== undefined) {
    query = query.gte('base_price', params.min_price);
  }
  if (params.max_price !== undefined) {
    query = query.lte('base_price', params.max_price);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[api-v1-products] List error:', error);
    return errorResponse('Failed to fetch products', 500, 'database_error');
  }

  // Transform for API response
  const products = ((data || []) as ProductRow[]).map((item: ProductRow) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    sku: item.sku,
    category: item.category,
    type: item.type,
    status: item.status,
    pricing_model: item.pricing_model,
    base_price: item.base_price,
    currency: item.currency,
    billing_period: item.billing_period,
    cost_of_goods: item.cost_of_goods,
    cost_of_service: item.cost_of_service,
    profit_margin_percent: item.profit_margin_percent,
    inventory_tracked: item.inventory_tracked,
    quantity_on_hand: item.quantity_on_hand,
    quantity_reserved: item.quantity_reserved,
    quantity_available: item.quantity_available,
    reorder_point: item.reorder_point,
    capacity_tracked: item.capacity_tracked,
    capacity_unit: item.capacity_unit,
    capacity_total: item.capacity_total,
    capacity_booked: item.capacity_booked,
    capacity_available: item.capacity_available,
    capacity_period: item.capacity_period,
    is_taxable: item.is_taxable,
    tax_rate: item.tax_rate,
    tags: item.tags,
    image_url: item.image_url,
    external_url: item.external_url,
    total_revenue: item.total_revenue,
    total_units_sold: item.total_units_sold,
    last_sold_date: item.last_sold_date,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));

  return successResponse({
    products,
    pagination: {
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    },
  });
}

async function getProduct(
  ctx: ApiRequestContext,
  id: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  const { data, error } = await supabase
    .from('products_services')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !data) {
    return errorResponse('Product not found', 404, 'not_found');
  }

  return successResponse({ product: data });
}

async function createProduct(
  ctx: ApiRequestContext,
  input: CreateProductInput
): Promise<Response> {
  const { supabase, workspaceId, keyId } = ctx;

  // Validate required fields
  if (!input.name || input.name.trim() === '') {
    return errorResponse('Name is required', 400, 'validation_error');
  }

  const { data, error } = await supabase
    .from('products_services')
    .insert({
      workspace_id: workspaceId,
      created_by: keyId, // Use API key ID as creator reference
      name: input.name.trim(),
      description: input.description || null,
      sku: input.sku || null,
      category: input.category || 'product',
      type: input.type || 'digital',
      status: input.status || 'draft',
      pricing_model: input.pricing_model || 'flat_rate',
      base_price: input.base_price || null,
      currency: input.currency || 'USD',
      billing_period: input.billing_period || 'one_time',
      cost_of_goods: input.cost_of_goods || null,
      cost_of_service: input.cost_of_service || null,
      inventory_tracked: input.inventory_tracked || false,
      quantity_on_hand: input.quantity_on_hand || 0,
      reorder_point: input.reorder_point || null,
      capacity_tracked: input.capacity_tracked || false,
      capacity_unit: input.capacity_unit || null,
      capacity_total: input.capacity_total || null,
      capacity_period: input.capacity_period || null,
      is_taxable: input.is_taxable !== false,
      tax_rate: input.tax_rate || null,
      tags: input.tags || [],
      image_url: input.image_url || null,
      external_url: input.external_url || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[api-v1-products] Create error:', error);
    return errorResponse('Failed to create product', 500, 'database_error');
  }

  // Trigger webhook
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'product.created',
    entityId: data.id,
    payload: { product: data },
  }).catch(err => console.error('[api-v1-products] Webhook error:', err));

  return successResponse({ product: data }, 201);
}

async function updateProduct(
  ctx: ApiRequestContext,
  id: string,
  input: UpdateProductInput
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // Get current product for status change detection
  const { data: currentProduct } = await supabase
    .from('products_services')
    .select('status')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.description !== undefined) updates.description = input.description;
  if (input.sku !== undefined) updates.sku = input.sku;
  if (input.category !== undefined) updates.category = input.category;
  if (input.type !== undefined) updates.type = input.type;
  if (input.status !== undefined) updates.status = input.status;
  if (input.pricing_model !== undefined) updates.pricing_model = input.pricing_model;
  if (input.base_price !== undefined) updates.base_price = input.base_price;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.billing_period !== undefined) updates.billing_period = input.billing_period;
  if (input.cost_of_goods !== undefined) updates.cost_of_goods = input.cost_of_goods;
  if (input.cost_of_service !== undefined) updates.cost_of_service = input.cost_of_service;
  if (input.inventory_tracked !== undefined) updates.inventory_tracked = input.inventory_tracked;
  if (input.quantity_on_hand !== undefined) updates.quantity_on_hand = input.quantity_on_hand;
  if (input.quantity_reserved !== undefined) updates.quantity_reserved = input.quantity_reserved;
  if (input.reorder_point !== undefined) updates.reorder_point = input.reorder_point;
  if (input.reorder_quantity !== undefined) updates.reorder_quantity = input.reorder_quantity;
  if (input.capacity_tracked !== undefined) updates.capacity_tracked = input.capacity_tracked;
  if (input.capacity_unit !== undefined) updates.capacity_unit = input.capacity_unit;
  if (input.capacity_total !== undefined) updates.capacity_total = input.capacity_total;
  if (input.capacity_booked !== undefined) updates.capacity_booked = input.capacity_booked;
  if (input.capacity_period !== undefined) updates.capacity_period = input.capacity_period;
  if (input.is_taxable !== undefined) updates.is_taxable = input.is_taxable;
  if (input.tax_rate !== undefined) updates.tax_rate = input.tax_rate;
  if (input.tags !== undefined) updates.tags = input.tags;
  if (input.image_url !== undefined) updates.image_url = input.image_url;
  if (input.external_url !== undefined) updates.external_url = input.external_url;

  if (Object.keys(updates).length === 0) {
    return errorResponse('No fields to update', 400, 'validation_error');
  }

  const { data, error } = await supabase
    .from('products_services')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      return errorResponse('Product not found', 404, 'not_found');
    }
    console.error('[api-v1-products] Update error:', error);
    return errorResponse('Failed to update product', 500, 'database_error');
  }

  // Trigger webhooks - always use product.updated for updates
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'product.updated',
    entityId: data.id,
    payload: { 
      product: data,
      previous_status: currentProduct?.status,
      new_status: data.status,
    },
  }).catch(err => console.error('[api-v1-products] Webhook error:', err));

  return successResponse({ product: data });
}

async function deleteProduct(
  ctx: ApiRequestContext,
  id: string
): Promise<Response> {
  const { supabase, workspaceId } = ctx;

  // Check if exists
  const { data: existing } = await supabase
    .from('products_services')
    .select('id, name')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  if (!existing) {
    return errorResponse('Product not found', 404, 'not_found');
  }

  const { error } = await supabase
    .from('products_services')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[api-v1-products] Delete error:', error);
    return errorResponse('Failed to delete product', 500, 'database_error');
  }

  // Trigger webhook
  triggerWebhook(supabase, {
    workspaceId,
    eventType: 'product.deleted',
    entityId: id,
    payload: { id, name: existing.name },
  }).catch(err => console.error('[api-v1-products] Webhook error:', err));

  return successResponse({ deleted: true, id });
}

// ============================================
// ROUTER
// ============================================

async function handleRequest(ctx: ApiRequestContext, req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  const productId = pathParts[1];

  // GET /products - List
  if (method === 'GET' && !productId) {
    const params: ListProductsParams = {
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
      category: url.searchParams.get('category') as ProductCategory || undefined,
      type: url.searchParams.get('type') as ProductType || undefined,
      status: url.searchParams.get('status') as ProductStatus || undefined,
      search: url.searchParams.get('search') || undefined,
      min_price: url.searchParams.get('min_price') ? parseFloat(url.searchParams.get('min_price')!) : undefined,
      max_price: url.searchParams.get('max_price') ? parseFloat(url.searchParams.get('max_price')!) : undefined,
    };
    return listProducts(ctx, params);
  }

  // GET /products/:id
  if (method === 'GET' && productId) {
    return getProduct(ctx, productId);
  }

  // POST /products
  if (method === 'POST' && !productId) {
    try {
      const input = await req.json() as CreateProductInput;
      return createProduct(ctx, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // PATCH /products/:id
  if (method === 'PATCH' && productId) {
    try {
      const input = await req.json() as UpdateProductInput;
      return updateProduct(ctx, productId, input);
    } catch {
      return errorResponse('Invalid JSON body', 400, 'invalid_request');
    }
  }

  // DELETE /products/:id
  if (method === 'DELETE' && productId) {
    return deleteProduct(ctx, productId);
  }

  return errorResponse('Not found', 404, 'not_found');
}

// ============================================
// MAIN
// ============================================

function getRequiredScopes(req: Request): ApiScope[] {
  const method = req.method;
  if (method === 'GET') {
    return ['products:read'];
  }
  return ['products:write'];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requiredScopes = getRequiredScopes(req);

  const handler = createApiHandler(handleRequest, {
    requiredScopes,
    allowedMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });

  return handler(req);
});
