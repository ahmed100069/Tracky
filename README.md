n# Tracky

Tracky is a browser-based SaaS platform for dhabas and local restaurants in India. It is designed for peak-hour resilience: local-first billing, idempotent order sync, owner approval controls, split payments, and fast operator flows on low-end Android browsers and desktop counters.

## Product Modules

- Smart billing with button-first item selection
- Offline-first billing with local order persistence and background sync
- Split payments, undo, repeat-last-order, and owner approval gates
- AI voice suggestions with manual confirmation only
- Udhar tracking with overdue visibility
- Inventory auto-estimation from sold items
- Owner dashboard with revenue, profit and alerts
- Staff-aware billing logs and day-close reporting

## Monorepo Structure

```text
tracky/
  backend/
    src/
      config/         Mongo connection
      controllers/    Route handlers
      middleware/     Auth, validation, error handling
      models/         MongoDB collections
      routes/         REST endpoints
      seeds/          Demo tenant bootstrap
      services/       AI parsing and insight helpers
      utils/          Shared helpers
  frontend/
    src/
      components/     Reusable UI blocks
      lib/            API client
      pages/          Route pages
      store/          Zustand stores
      utils/          Currency and PDF helpers
```

## REST API Routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/dashboard/summary`
- `GET /api/menu`
- `POST /api/menu`
- `GET /api/orders`
- `POST /api/orders`
- `PATCH /api/orders/:id`
- `POST /api/orders/:id/cancel`
- `GET /api/orders/day-close`
- `GET /api/customers`
- `POST /api/customers`
- `POST /api/customers/:id/payment`
- `GET /api/inventory`
- `POST /api/inventory`
- `GET /api/expenses`
- `POST /api/expenses`
- `POST /api/ai/parse-order`
- `GET /api/ai/insights`
- `GET /api/settings/bootstrap`

## MongoDB Collections

- `tenants`: dhaba identity, plan, city, phone, branding
- `users`: owner/staff login accounts with `tenantId`
- `menu_items`: billable items, price, cost, ingredient mapping
- `orders`: idempotent client UUID, split payments, revisions, approvals, sync metadata
- `customers`: udhar ledger and overdue tracking
- `inventory`: stock levels, reorder threshold, unit cost
- `expenses`: daily operating expenses
- `audit_logs`: edit, cancel and approval trail

Every collection is tenant-scoped using `tenantId`.

## Environment Variables

Backend:

- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `CLIENT_URL`

## Quick Start

1. Create a MongoDB database.
2. Add environment variables in `backend/.env`.
3. Install dependencies in both `backend` and `frontend`.
4. Seed demo data from the backend.
5. Start backend and frontend servers.

Demo seed:

- Owner login: `owner@tracky.demo`
- Staff login: `staff@tracky.demo`
- Password: `password123`
- Owner PIN: `1234`

Detailed instructions are in [backend/README.md](/e:/Hotel%20Mang/backend/README.md) and [frontend/README.md](/e:/Hotel%20Mang/frontend/README.md).
