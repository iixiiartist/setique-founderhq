# Security Remediation Plan

**Generated:** November 25, 2025  
**Based on:** Codex Security Analysis

This document outlines the security issues identified and the remediation steps required. Each section includes severity, implementation priority, and code changes.

---

## Table of Contents

1. [Telemetry Consent Gating](#1-telemetry-consent-gating)
2. [Supabase Client Hardening](#2-supabase-client-hardening)
3. [AI-Search Edge Function Security](#3-ai-search-edge-function-security)
4. [Stripe Webhook Idempotency](#4-stripe-webhook-idempotency)
5. [Products/Services Schema Integrity](#5-productsservices-schema-integrity)
6. [Audit Logging Security](#6-audit-logging-security)

---

## 1. Telemetry Consent Gating

**Severity:** Medium  
**Priority:** P2  
**Status:** 🟢 Implemented

### Issue
Sentry and analytics initialize globally in `main.tsx` before user consent or authentication. Invites/checkout flows lack rate limiting for unauthenticated users.

### Current Behavior
```tsx
// main.tsx - Initializes immediately on app load
import { initializeSentry } from './lib/sentry';
initializeSentry(); // Before any consent check
analytics.initialize(); // Before any consent check
```

### Required Changes

#### 1.1 Create Consent Manager
Create `lib/services/consentManager.ts`:

```typescript
const CONSENT_KEY = 'telemetry_consent';
// ... (implemented)
```

#### 1.2 Modify Sentry Initialization
Update `lib/sentry.tsx`:

```typescript
// ... (implemented)
```

#### 1.3 Modify Analytics Initialization
Update `lib/services/analytics.ts`:

```typescript
// ... (implemented)
```

#### 1.4 Add Consent Banner Component
Create `components/shared/ConsentBanner.tsx` for GDPR/CCPA compliance.

---

## 2. Supabase Client Hardening

**Severity:** High  
**Priority:** P1  
**Status:** 🟢 Implemented

### Issue
- Verbose errors thrown at import time can crash the app
- No environment-based role separation
- No refresh token tuning

### Required Changes

#### 2.1 Build-Time Validation
Create `scripts/validate-env.js`:

```javascript
// ... (implemented)
```

#### 2.2 Update Supabase Client
Update `lib/supabase.ts`:

```typescript
// ... (implemented)
```

#### 2.3 Service Role Client (Edge Functions Only)
For edge functions that need elevated privileges, use:

```typescript
// supabase/functions/_shared/adminClient.ts
// ... (implemented locally in functions)
```

---

## 3. AI-Search Edge Function Security

**Severity:** Critical  
**Priority:** P0  
**Status:** 🟢 Implemented

### Issue
- `Access-Control-Allow-Origin: *` allows any origin
- No authentication or per-user throttling
- Broad error responses could leak information
- Unbounded external API spend

### Required Changes

#### 3.1 Update CORS Headers
```typescript
// ... (implemented)
```

#### 3.2 Add Authentication Check
```typescript
// ... (implemented)
```

#### 3.3 Add Rate Limiting
```typescript
// ... (implemented)
```

#### 3.4 Hardened Error Responses
```typescript
// ... (implemented)
```

---

## 4. Stripe Webhook Idempotency

**Severity:** High  
**Priority:** P1  
**Status:** 🟢 Implemented

### Issue
- Events processed inline without idempotency storage
- Vulnerable to replayed deliveries
- No retry backoff or audit logging

### Required Changes

#### 4.1 Create Webhook Events Table
```sql
-- Migration: 20251125_webhook_events.sql
// ... (created)
```

#### 4.2 Update Webhook Handler
```typescript
// ... (implemented)
```

---

## 5. Products/Services Schema Integrity

**Severity:** Medium  
**Priority:** P2  
**Status:** 🟢 Implemented (Migration Ready)

### Issue
- No workspace-scoped uniqueness constraints
- Deals/revenue can reference products from other workspaces
- Unchecked JSONB fields

### Required Changes

#### 5.1 Add Unique Constraints
```sql
-- Migration: 20251125_products_integrity.sql
// ... (created)
```

#### 5.2 Add Cross-Table Integrity Check Function
```sql
// ... (created)
```

#### 5.3 Add JSONB Validation
```sql
// ... (created)
```

---

## 6. Audit Logging Security

**Severity:** High  
**Priority:** P1  
**Status:** 🟢 Implemented (Migration Ready)

### Issue
- Stores IP/User-Agent without retention limits
- Permissive insert policy without role checks
- Potential PII over-collection

### Required Changes

#### 6.1 Tighten RLS Policies
```sql
-- Migration: 20251125_audit_security.sql
// ... (created)
```

#### 6.2 Redact Sensitive Metadata
```sql
// ... (created)
```

#### 6.3 Add Retention/Purge Job
```sql
// ... (created)
```

---

## Implementation Order

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | AI-Search Auth & Rate Limiting | 2h | Critical - prevents abuse |
| P1 | Stripe Webhook Idempotency | 3h | High - prevents duplicate charges |
| P1 | Audit Log RLS | 1h | High - prevents data leakage |
| P1 | Supabase Client Hardening | 2h | High - prevents crashes |
| P2 | Telemetry Consent | 3h | Medium - compliance |
| P2 | Products Schema Integrity | 2h | Medium - data quality |

---

## Verification Checklist

- [ ] AI-search requires authentication
- [ ] AI-search rate limits per user
- [ ] CORS restricted to known origins
- [ ] Stripe webhooks are idempotent
- [ ] Webhook events table created
- [ ] Audit logs restricted to admins
- [ ] Audit log retention policy active
- [ ] Telemetry respects user consent
- [ ] Products have workspace-scoped uniqueness
- [ ] Build-time env validation passes

---

## Related Files

- `lib/sentry.tsx`
- `lib/services/analytics.ts`
- `lib/supabase.ts`
- `supabase/functions/ai-search/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/migrations/20251115_products_services_core.sql`
- `lib/services/auditLogService.ts`
