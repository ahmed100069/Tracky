# Tracky Backend

## Setup

1. Copy `.env.example` to `.env`.
2. Update MongoDB and JWT values.
3. Install packages:

```bash
npm install
```

4. Seed demo data:

```bash
npm run seed
```

5. Start the API:

```bash
npm run dev
```

## API Base

`/api`

## Main Routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/dashboard/summary`
- `GET /api/menu`
- `POST /api/orders`
- `GET /api/orders`
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

## Multi-Tenant Rule

Each collection includes `tenantId`. Controllers read tenant context from the JWT and always filter on the same tenant.

## Reliability Notes

- Billing is local-first on the frontend and uses client UUIDs for idempotent sync.
- Split payments are validated server-side so reports stay correct.
- Udhar creation, post-print edits, and cancellations require owner PIN approval.
- Day-close summary includes payment breakdown, edited bills, cancelled bills, and staff-wise totals.
