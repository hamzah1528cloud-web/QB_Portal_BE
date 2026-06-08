# QB Portal — Backend Architecture & Plan

## What This Is

A B2B customer ordering portal on top of QuickBooks Online. QB is the single source of truth for all financial data. Every order placed through the portal creates a QB Estimate, which the business owner can review and convert to an invoice inside QuickBooks. The platform is intended for listing on the QuickBooks App Marketplace.

---

## Two Auth Systems

| Type | Guard | JWT Payload |
|------|-------|-------------|
| Business owner | `JwtAuthGuard` | `{ sub, businessId }` |
| Portal customer | `PortalJwtAuthGuard` | `{ sub, portalUserId, businessId, qbCustomerId, role: 'PORTAL' }` |
| Either | `CombinedAuthGuard` | sets `req.businessId` regardless of type |

Business owners register/login via `/v1/auth`. Portal users are created by business owners (auto-generated credentials) and login via `/v1/portal-auth/login`.

---

## Module Map

| Module | Responsibility |
|--------|---------------|
| `auth` | Business owner register/login + QB OAuth (connect, callback, status, disconnect) |
| `portal-auth` | Portal user login, creation by business owner, password reset, activate/deactivate |
| `business` | Business document, QB token storage, QB token update helpers |
| `order` | Full order lifecycle — create, status transitions, QB estimate creation |
| `qb-customer` | QB customers synced from QuickBooks |
| `qb-product` | QB products synced from QuickBooks, ordering units management |
| `qb-invoice` | QB invoices synced from QuickBooks |
| `qb-payment` | QB payments synced from QuickBooks |
| `qb-credit-memo` | QB credit memos synced from QuickBooks |
| `qb-tax-code` | QB tax codes synced from QuickBooks |
| `sync` | Bull-backed full and targeted sync, webhook handler, estimate/invoice status jobs |
| `external/quickbooks` | QB API client (OAuth, CRUD, estimates, invoices) |

---

## Order Lifecycle

```
Customer places order
        │
        ▼
   PENDING  ─────────────────────────────► QB Estimate created immediately
        │                                  (fire-and-forget, never blocks response)
        │
   ┌────┴───────────────────────────────┐
   │  QB webhook: Estimate → Accepted    │  automatic
   │  OR dashboard: "Confirm order"      │  manual
   └────────────────────────────────────┘
        │
        ▼
   CONFIRMED
        │
   Dashboard: "Mark processing"
        │
        ▼
   PROCESSING
        │
   Dashboard: "Mark shipped"
        │
        ▼
   SHIPPED
        │
   Dashboard: "Mark delivered"
        │
        ▼
   DELIVERED

CANCELLED ← dashboard (PENDING/CONFIRMED/PROCESSING) OR QB webhook (Estimate → Rejected)
```

When status becomes `CANCELLED`: best-effort QB API call to set the estimate to `Rejected`. If estimate was already converted to an invoice in QB, `estimateConvertedBeforeCancel: true` is flagged on the order so the dashboard can warn the business owner.

---

## QB Estimate Creation

### When
Immediately when the order is placed (PENDING). Creates a QB Estimate (not Invoice) — non-committing, business owner reviews it in QB.

### QB Estimate Line Item Description Format
```
{product description from QB}
**{quantity} {unit}**
```
Example:
```
Premium White Sugar, fine granulated
**2 box**
```
If product has no description: just `**2 box**`. Max 4000 chars (QB limit — product description is truncated, unit line is always preserved).

### Failure Handling
Estimate creation never blocks the order. On failure:
- `qbEstimateFailed: true` → dashboard shows retry button
- `qbSkipped: true` → QB was not connected at order time

QB token refresh happens automatically before every QB API call. If the refresh token is expired (100 days), the business is marked as disconnected and `qbEstimateFailed: true` is set.

### QB Estimate → Order Status Sync (Webhooks)

| QB Estimate Status | Our Order Status | Condition |
|-------------------|-----------------|-----------|
| `Accepted` | `CONFIRMED` | Only if order is `PENDING` |
| `Closed` | `CONFIRMED` + `qbInvoiceId` set | Only if order is `PENDING` |
| `Rejected` | `CANCELLED` | Only if order is `PENDING/CONFIRMED/PROCESSING` |

Rules:
- Webhooks never push status backwards (if order is already at PROCESSING, an `Accepted` webhook is a no-op)
- All updates are idempotent (same status → no-op)
- When a new QB Invoice is created from the estimate, `qbInvoiceId` is stored on the order

---

## Order Schema Fields

```ts
businessId:                  ObjectId (ref Business)
portalUserId:                ObjectId (ref PortalUser) — optional
qbCustomerId:                string    — QB customer Id
customerName:                string    — denormalized for display
lineItems: [{
  qbItemId:    string
  productName: string
  quantity:    number
  unitPrice:   number
  amount:      number
  unit?:       string  // 'kg', 'box', 'each' etc — from portal unit selector
}]
totalAmount:                 number
status:                      OrderStatus
qbInvoiceId?:                string    — legacy (old flow) or set when estimate converted
qbEstimateId?:               string    — QB estimate Id
qbEstimateNumber?:           string    — QB DocNumber e.g. "1001"
qbEstimateFailed:            boolean   — true = creation failed, retry available
qbSkipped:                   boolean   — true = QB not connected at order time
estimateConvertedBeforeCancel?: boolean — set when cancelled after estimate was converted to invoice
notes?:                      string
```

---

## Product Ordering Units

### How Units Are Detected (on QB sync)

Priority order for each QB item:

1. **`UnitOfMeasureSetRef`** (QB Plus/Advanced) — fetch the UOM set, extract all unit names. UOM sets are batch-fetched (one API call per unique set ID, not per product).
2. **Sub-item name suffix** — e.g. "Sugar - KG" with parent "Sugar" → `['kg']`
3. **SKU token scan** — word-boundary match against known token list
4. **Item name token scan** — same scan on the item name
5. **Default** — `['each']`

Token list: `kg, kgs, g, gm, gr, lb, lbs, oz, box, bx, case, cs, each, ea, pc, pcs, doz, dz, pack, pkt, bag, litre, ltr, ml, unit, kilogram, gram, pound, ounce, dozen, litre, liter`

Matching is case-insensitive with word-boundary enforcement (prevents "PACKAGING" matching "KG").

### Re-sync Behaviour

- `unitsCustomized: false` → sync overwrites `orderingUnits` with fresh detection
- `unitsCustomized: true` → sync leaves `orderingUnits` untouched (business owner edited them)

### Business Owner Override

`PATCH /v1/qb-products/:id/units` — set custom units, sets `unitsCustomized: true`
`DELETE /v1/qb-products/:id/units` — reset to QB-detected defaults, sets `unitsCustomized: false`

---

## Webhook Flow

1. QB sends CloudEvent to `POST /v1/webhooks/quickbooks`
2. Controller responds 200 immediately
3. Signature is verified (HMAC-SHA256 with `QB_WEBHOOK_VERIFIER_TOKEN`)
4. Jobs pushed to Bull queue for async processing:
   - Entity type changes (Customer, Item, Invoice, etc.) → targeted sync jobs
   - Estimate entity → `estimate-status-sync` job per estimate ID
   - Invoice entity → `invoice-linked-estimate` job per invoice ID + targeted invoice sync

Bull retries failed jobs 3 times with exponential backoff. Job IDs are set to prevent duplicate jobs for the same entity.

---

## Environment Variables

```
QB_CLIENT_ID=
QB_CLIENT_SECRET=
QB_REDIRECT_URI=https://yourapp.com/v1/auth/quickbooks/callback
QB_ENVIRONMENT=sandbox          # or production
QB_WEBHOOK_VERIFIER_TOKEN=      # from Intuit developer console
JWT_SECRET=
MONGO_URI=
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
FRONTEND_URL=
```

---

## Phase Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | QB OAuth + initial data sync | ✅ Done |
| 2 | Customer portal, product browsing, order placement | ✅ Done |
| 3 | Business dashboard, manual order entry | ✅ Done |
| 4 | QB Estimates (replaces invoices), unit selector, webhook status sync | ✅ Done |
| 5 | Invoice reminders via email, advanced webhook improvements | ⬜ Pending |
| 6 | QB App Marketplace submission | ⬜ Pending |

---

## Edge Cases Handled

| Edge Case | Where | How |
|-----------|-------|-----|
| QB not connected at order time | `order.service.ts` | `qbSkipped: true`, no order block |
| Estimate creation fails | `order.service.ts` | `qbEstimateFailed: true`, fire-and-forget never throws |
| Refresh token expired | `order.service.ts` | Business marked disconnected, `qbEstimateFailed: true` |
| QB customer deleted since sync | `order.service.ts` → QB API | Estimate fails → failure flow |
| QB item deleted since sync | `order.service.ts` → QB API | Estimate fails → failure flow |
| Webhook backwards status | `order.service.ts` `applyQbEstimateStatus` | Only apply if order is at PENDING |
| Duplicate webhooks (at-least-once delivery) | `order.service.ts` | Same status = no-op; same qbInvoiceId = no-op |
| Cancel after estimate converted to invoice | `order.service.ts` `updateStatus` | `estimateConvertedBeforeCancel: true`, warn on dashboard |
| Cancel → close QB estimate | `order.service.ts` `updateStatus` | Best-effort `updateEstimateStatus('Rejected')` |
| UOM sets available only on QB Plus/Advanced | `qb-products-sync.service.ts` | Silent fallback to SKU/name parsing |
| UOM set API batching | `qb-products-sync.service.ts` | Deduplicate IDs, one fetch per unique set |
| Re-sync overwrites custom units | `qb-product.dao.ts` `upsertByQbIdConditionalUnits` | Conditional update: only when `unitsCustomized != true` |
| SKU false-positive token match | `unit-detection.ts` | Word-boundary regex (`(?<![a-z])token(?![a-z])`) |
| Category items (not orderable) | `qb-products-sync.service.ts` query | Only syncs `Inventory`, `Service`, `NonInventory` |
| Portal user has no linked qbCustomerId | `order.controller.ts` | 400 with clear message |
| Description over 4000 chars | `quickbooks.client.ts` `buildEstimateDescription` | `.slice(0, 4000)` — unit line always fits |
| Old orders with `qbInvoiceId` | Schema + FE | Both fields kept; FE shows whichever is present |
| Price divergence | `quickbooks.client.ts` `createEstimate` | Always passes `UnitPrice` explicitly |
