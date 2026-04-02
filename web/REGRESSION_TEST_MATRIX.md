# E5.1 Regression Test Matrix

**Environment:** Vercel (production) + Supabase (PostgreSQL via Prisma)
**No local dev server** — all tests execute against the deployed Vercel URL.

---

## Roles Under Test

| Role | Auth Method | Description |
|------|-------------|-------------|
| **Owner** | NextAuth credentials (email/password) | Highest admin privilege |
| **Admin** | NextAuth credentials (email/password) | Full admin except cannot delete owner |
| **Viewer** | NextAuth credentials (email/password) | Read-only admin access |
| **End Customer (Portal)** | Magic link JWT (`portal-session` cookie) | Assigned form completion only |
| **Platform Admin** | NextAuth + `PLATFORM_ADMIN_EMAILS` env var | Cross-tenant management |
| **Unauthenticated** | None | Public form access |

---

## 1. Navigation & Route Access

### 1.1 Admin Nav Bar Visibility

| # | Test Case | Owner | Admin | Viewer | How to Verify |
|---|-----------|-------|-------|--------|---------------|
| N1 | "Templates" link visible at `/admin` | Yes | Yes | Yes | Inspect nav bar |
| N2 | "Usage" link visible | Yes | Yes | Yes | Inspect nav bar |
| N3 | "Fund Coordinators" link visible | Yes | Yes | Yes | Inspect nav bar |
| N4 | "Admin" link visible | Yes | Yes | Yes | Inspect nav bar |
| N5 | "Team" link visible | Yes | Yes | Yes | Inspect nav bar |
| N6 | "Themes" link visible | Yes | Yes | Yes | Inspect nav bar |
| N7 | "Billing" link visible | Only if in PLATFORM_ADMIN_EMAILS | Same | Same | Check env var match |
| N8 | Settings card visible on `/admin/manage` | Yes | Yes | **No** | Load page, verify card absent |
| N9 | Assignments card visible on `/admin/manage` | Yes | Yes | Yes | Load page |

### 1.2 Admin Route Access (Direct URL)

| # | Route | Owner | Admin | Viewer | Unauth | Expected Viewer Behaviour |
|---|-------|-------|-------|--------|--------|--------------------------|
| R1 | `/admin` | 200 | 200 | 200 | Redirect `/signin` | Templates list (read-only) |
| R2 | `/admin/usage` | 200 | 200 | 200 | Redirect `/signin` | Usage stats |
| R3 | `/admin/customers` | 200 | 200 | 200 | Redirect `/signin` | Customer list |
| R4 | `/admin/customers/new` | 200 | 200 | 200 | Redirect `/signin` | Form renders but POST blocked |
| R5 | `/admin/customers/import` | 200 | 200 | 200 | Redirect `/signin` | Form renders but POST blocked |
| R6 | `/admin/customers/analytics` | 200 | 200 | 200 | Redirect `/signin` | Analytics view |
| R7 | `/admin/customers/[id]` | 200 | 200 | 200 | Redirect `/signin` | Customer detail |
| R8 | `/admin/manage` | 200 | 200 | 200 | Redirect `/signin` | Hub page (settings card hidden for viewer) |
| R9 | `/admin/manage/settings` | 200 | 200 | **Redirect `/admin/manage`** | Redirect `/signin` | Viewer cannot access settings |
| R10 | `/admin/manage/assignments` | 200 | 200 | 200 | Redirect `/signin` | Assignment list |
| R11 | `/admin/settings` | 200 | 200 | 200 | Redirect `/signin` | Settings page (check API guards) |
| R12 | `/admin/settings/branding` | 200 | 200 | 200 | Redirect `/signin` | Branding page |
| R13 | `/admin/team` | 200 | 200 | 200 | Redirect `/signin` | Team list |
| R14 | `/admin/themes` | 200 | 200 | 200 | Redirect `/signin` | Theme editor |
| R15 | `/admin/billing` | 200 | 200 | 200 | Redirect `/signin` | Billing (nav hidden but page accessible) |
| R16 | `/admin/audit` | 200 | 200 | 200 | Redirect `/signin` | Audit log (API rejects viewer) |
| R17 | `/admin/wizard` | 200 | 200 | 200 | Redirect `/signin` | Wizard list |
| R18 | `/admin/wizard/new` | 200 | 200 | 200 | Redirect `/signin` | New wizard (API rejects viewer) |
| R19 | `/admin/assignments` | 200 | 200 | 200 | Redirect `/signin` | Standalone assignments page |
| R20 | `/admin/forms/new` | 200 | 200 | 200 | Redirect `/signin` | New form |
| R21 | `/admin/forms/new/upload-html` | 200 | 200 | 200 | Redirect `/signin` | HTML upload |
| R22 | `/admin/forms/new/templates` | 200 | 200 | 200 | Redirect `/signin` | Template picker |
| R23 | `/admin/forms/[id]` | 200 | 200 | 200 | Redirect `/signin` | Form detail |
| R24 | `/admin/forms/[id]/settings` | 200 | 200 | 200 | Redirect `/signin` | Form settings |
| R25 | `/admin/forms/[id]/analytics` | 200 | 200 | 200 | Redirect `/signin` | Form analytics |
| R26 | `/admin/forms/builder` | 200 | 200 | 200 | Redirect `/signin` | Form builder |
| R27 | `/admin/docs/webhook-verification` | 200 | 200 | 200 | Redirect `/signin` | Docs page |

---

## 2. API Permission Checks (Role Enforcement)

### 2.1 Tenant & Settings APIs

| # | Method | Endpoint | Owner | Admin | Viewer | Unauth |
|---|--------|----------|-------|-------|--------|--------|
| A1 | GET | `/api/admin/tenant` | 200 (full) | 200 (full) | 200 (limited: no secrets) | 401 |
| A2 | PUT | `/api/admin/tenant` | 200 | 200 | **403** | 401 |
| A3 | POST | `/api/admin/tenant/regenerate-secret` | 200 | 200 | **403** | 401 |
| A4 | GET | `/api/admin/settings` | 200 | 200 | **403** | 401 |
| A5 | PUT | `/api/admin/settings` | 200 | 200 | **403** | 401 |

### 2.2 Team APIs

| # | Method | Endpoint | Owner | Admin | Viewer | Unauth |
|---|--------|----------|-------|-------|--------|--------|
| A6 | GET | `/api/admin/team` | 200 | 200 | 200 | 401 |
| A7 | POST | `/api/admin/team` | 201 | 201 | **403** | 401 |
| A8 | DELETE | `/api/admin/team/[id]` | 200 | 200 | **403** | 401 |
| A9 | DELETE | `/api/admin/team/[self]` | **Blocked** | **Blocked** | 403 | 401 |
| A10 | DELETE | `/api/admin/team/[owner]` | **Blocked** | **Blocked** | 403 | 401 |

### 2.3 Customer APIs

| # | Method | Endpoint | Owner | Admin | Viewer | Unauth |
|---|--------|----------|-------|-------|--------|--------|
| A11 | GET | `/api/admin/customers` | 200 | 200 | 200 | 401 |
| A12 | POST | `/api/admin/customers` | 201 | 201 | **403** | 401 |
| A13 | POST | `/api/admin/customers/import` | 200 | 200 | **403** | 401 |
| A14 | GET | `/api/admin/customers/[id]` | 200 | 200 | 200 | 401 |
| A15 | POST | `/api/admin/customers/[id]/invite` | 200 | 200 | **403** | 401 |

### 2.4 Assignment APIs

| # | Method | Endpoint | Owner | Admin | Viewer | Unauth |
|---|--------|----------|-------|-------|--------|--------|
| A16 | GET | `/api/admin/assignments` | 200 | 200 | 200 | 401 |
| A17 | POST | `/api/admin/assignments` | 201 | 201 | **403** | 401 |
| A18 | PUT | `/api/admin/assignments/[id]` | 200 | 200 | **403** | 401 |
| A19 | DELETE | `/api/admin/assignments/[id]` | 200 | 200 | **403** | 401 |
| A20 | POST | `/api/admin/assignments/[id]/remind` | 200 | 200 | **403** | 401 |

### 2.5 Wizard APIs

| # | Method | Endpoint | Owner | Admin | Viewer | Unauth |
|---|--------|----------|-------|-------|--------|--------|
| A21 | GET | `/api/admin/wizard` | 200 | 200 | **403** | 401 |
| A22 | POST | `/api/admin/wizard/wip-lookup` | 200 | 200 | **403** | 401 |
| A23 | GET | `/api/admin/wizard/[id]` | 200 | 200 | **403** | 401 |
| A24 | PATCH | `/api/admin/wizard/[id]` | 200 | 200 | **403** | 401 |
| A25 | DELETE | `/api/admin/wizard/[id]` | 200 | 200 | **403** | 401 |
| A26 | POST | `/api/admin/wizard/[id]/prefill` | 200 | 200 | **403** | 401 |
| A27 | POST | `/api/admin/wizard/[id]/assign` | 201 | 201 | **403** | 401 |

### 2.6 Form APIs

| # | Method | Endpoint | Owner | Admin | Viewer | Unauth |
|---|--------|----------|-------|-------|--------|--------|
| A28 | GET | `/api/admin/forms` | 200 | 200 | 200 | 401 |
| A29 | POST | `/api/admin/forms` | 201 | 201 | 201 | 401 |
| A30 | GET | `/api/admin/forms/[id]` | 200 | 200 | 200 | 401 |
| A31 | PUT | `/api/admin/forms/[id]` | 200 | 200 | 200 | 401 |
| A32 | DELETE | `/api/admin/forms/[id]` | 200 | 200 | 200 | 401 |
| A33 | POST | `/api/admin/forms/[id]/test-webhook` | 200 | 200 | 200 | 401 |
| A34 | POST | `/api/admin/forms/[id]/duplicate` | 201 | 201 | 201 | 401 |

### 2.7 Audit API

| # | Method | Endpoint | Owner | Admin | Viewer | Unauth |
|---|--------|----------|-------|-------|--------|--------|
| A35 | GET | `/api/admin/audit` | 200 | 200 | **403** | 401 |

### 2.8 Billing APIs

| # | Method | Endpoint | Owner | Admin | Viewer | Unauth |
|---|--------|----------|-------|-------|--------|--------|
| A36 | GET | `/api/admin/billing/plans` | 200 | 200 | 200 | 401 |
| A37 | POST | `/api/admin/billing/checkout` | 200 | 200 | 200 | 401 |
| A38 | POST | `/api/admin/billing/portal` | 200 | 200 | 200 | 401 |
| A39 | GET | `/api/admin/billing/usage` | 200 | 200 | 200 | 401 |

### 2.9 Branding API

| # | Method | Endpoint | Owner | Admin | Viewer | Unauth |
|---|--------|----------|-------|-------|--------|--------|
| A40 | GET | `/api/admin/branding` | 200 | 200 | 200 | 401 |
| A41 | PUT | `/api/admin/branding` | 200 | 200 | 200 | 401 |

---

## 3. Tenant Isolation

| # | Test Case | Expected |
|---|-----------|----------|
| T1 | Admin in Tenant A queries forms — sees only Tenant A forms | No cross-tenant data |
| T2 | Admin in Tenant A accesses `/api/admin/forms/[tenantB_formId]` | 404 (not found, not 403) |
| T3 | Admin in Tenant A accesses `/api/admin/wizard/[tenantB_wizardId]` | 404 |
| T4 | Admin in Tenant A accesses `/api/admin/customers/[tenantB_customerId]` | 404 |
| T5 | Admin in Tenant A accesses `/api/admin/assignments/[tenantB_assignmentId]` | 404 |
| T6 | Portal user for Tenant A accesses form assigned by Tenant B | 403 |

---

## 4. Public Form Access & Send Flow

### 4.1 Form Load (GET `/api/forms/[publicId]`)

| # | Test Case | Expected |
|---|-----------|----------|
| F1 | Load public live form (no auth) | 200 — schema, theme, version returned |
| F2 | Load draft form | 403/404 — "Form not available" |
| F3 | Load archived form | 403/404 — "Form not available" |
| F4 | Load private form without token | 401 — "Authentication required" |
| F5 | Load private form with valid `ctx` token | 200 — prefill data included |
| F6 | Load private form with expired `ctx` token | 403 — "Invalid or expired form link" |
| F7 | Load private form with `ctx` token from wrong tenant | 403 |
| F8 | Load private form with valid form access token (`?token=`) | 200 |
| F9 | Load private form with portal session (assigned) | 200 |
| F10 | Load private form with portal session (not assigned) | 403 |

### 4.2 Form Submission (POST `/api/forms/[publicId]/submit`)

| # | Test Case | Expected |
|---|-----------|----------|
| S1 | Submit valid answers to public form | 200 `{status:"ok", submissionId}` |
| S2 | Submit with payload > 256 KiB | 413 |
| S3 | Submit with > 500 fields | 400 |
| S4 | Submit invalid JSON | 400 |
| S5 | Submit with missing formId or answers | 400 |
| S6 | Submit to form with no webhook configured | 500 |
| S7 | Submit when monthly quota exceeded | 429 |
| S8 | Submit from blocked IP (form IP allowlist) | 403 |
| S9 | Submit to private form without token or session | 401 |
| S10 | Submit to private form with valid tenant token | 200 |
| S11 | Submit to private form with valid portal session | 200 |
| S12 | Submit with failing CAPTCHA (Turnstile) | 403 |
| S13 | Rapid submissions from same IP | 429 after limit |
| S14 | Schema validation fails (wrong field types) | 400 with error details |
| S15 | Primary webhook fails, backup succeeds | 200 (submission logged) |
| S16 | Both webhooks fail | 502 |
| S17 | Submit wizard-assigned form — assignment marked "completed" | Check DB |

### 4.3 Enriched Payload (E4.4 — WIP Context)

| # | Test Case | Expected |
|---|-----------|----------|
| E1 | Submit wizard-assigned form — `meta.wipContext` present in webhook payload | `{ companyName, wipNumber, metadata }` |
| E2 | Submit wizard-assigned form — `meta.customerEmail`, `meta.customerName`, `meta.wipNumber` present | Flat fields from customer context |
| E3 | Submit non-wizard form — no `wipContext` in payload | Field absent |
| E4 | Submit non-wizard form — no `customerEmail`/`customerName` | Fields absent |
| E5 | Wizard with large wipContext (>2048 bytes metadata) — token still works | `wipContext` may be absent but form loads and submits |

### 4.4 Prefill on Load (n8n Webhook Fetch)

| # | Test Case | Expected |
|---|-----------|----------|
| P1 | Load form via `ctx` token — prefill webhook called with `_wipNumber` | Network tab shows POST to `/api/forms/[id]/prefill` |
| P2 | Token-provided values override webhook values | Token values win for shared fields |
| P3 | Webhook provides values for fields not in token | Those fields populated |
| P4 | Prefill webhook fails — form still loads with token values | Silent failure, form works |
| P5 | Load form without `ctx` token — standard prefill webhook called | If `prefillWebhookUrl` configured |
| P6 | Portal user loads form — Path 1 prefill (WizardRun lookup) | Uses `wipPrefillWebhookUrl` |

---

## 5. Portal (End Customer) Journeys

### 5.1 Authentication

| # | Test Case | Expected |
|---|-----------|----------|
| PO1 | Request magic link with valid email | 200 (always, even if email not found — no enumeration) |
| PO2 | Request magic link — rate limit exceeded | 429 |
| PO3 | Verify valid magic link token | 200 + `portal-session` cookie set |
| PO4 | Verify expired magic link token | 401 |
| PO5 | Check session with valid cookie | 200 `{authenticated: true}` |
| PO6 | Check session with no/invalid cookie | 401 |
| PO7 | Logout (DELETE session) | Cookie cleared, 200 |

### 5.2 Portal Form Journeys

| # | Test Case | Expected |
|---|-----------|----------|
| PO8 | List assigned forms | Only forms assigned to this customer |
| PO9 | View form — status moves pending -> in_progress | DB updated |
| PO10 | Submit form — status moves to completed | DB updated |
| PO11 | Access form not assigned to this customer | 403 |
| PO12 | Access form from different tenant | 403 |

---

## 6. Wizard (WIP) Flow

| # | Test Case | Role | Expected |
|---|-----------|------|----------|
| W1 | Stage 1: WIP lookup with valid number | Admin | 200 — WizardRun created, wipContext returned |
| W2 | Stage 1: WIP lookup "1111" (dev bypass) | Admin | 200 — Mock data, no n8n call |
| W3 | Stage 1: WIP number not found in Quickbase | Admin | 404 |
| W4 | Stage 1: n8n webhook unreachable | Admin | 502 |
| W5 | Stage 2: Select template | Admin | 200 — State -> template_selected |
| W6 | Stage 2: Select template for wrong tenant | Admin | 404 |
| W7 | Stage 3: Prefill from n8n | Admin | 200 — Prefill values returned |
| W8 | Stage 3: Override prefill values manually | Admin | Overrides persisted |
| W9 | Stage 4: Assign to new customer | Admin | 201 — EndCustomer + FormAssignment + prefill token |
| W10 | Stage 4: Assign to existing customer | Admin | 201 — Reuses EndCustomer |
| W11 | Stage 4: Duplicate assignment (same customer+form) | Admin | 409 Conflict |
| W12 | Stage 4: Send invite email | Admin | Email sent, `inviteSent: true` |
| W13 | Cancel wizard run from `prefilled` state | Admin | State -> cancelled |
| W14 | Cancel already-assigned wizard | Admin | 400 (terminal state) |
| W15 | All wizard endpoints as **Viewer** | Viewer | **403 on every endpoint** |

---

## 7. Settings & Configuration

| # | Test Case | Role | Expected |
|---|-----------|------|----------|
| ST1 | View tenant settings (name, webhooks) | Admin | Full config visible |
| ST2 | View tenant settings | Viewer | Limited info (no sharedSecret) |
| ST3 | Update tenant name | Admin | 200 |
| ST4 | Update webhook URLs | Admin | 200 |
| ST5 | Update webhook URLs | Viewer | **403** |
| ST6 | Regenerate shared secret | Admin | 200 — New secret returned |
| ST7 | Regenerate shared secret | Viewer | **403** |
| ST8 | Update branding (portal title, logo, color) | Admin | 200 |
| ST9 | Update theme | Admin | 200 |

---

## 8. Legacy Bookmark / Removed Route Checks

These routes may exist as bookmarks from prior versions. Verify they either still work or fail gracefully.

| # | Bookmarked URL | Expected Behaviour |
|---|----------------|-------------------|
| L1 | `/admin/settings` | Page loads (standalone settings) |
| L2 | `/admin/settings/branding` | Page loads |
| L3 | `/admin/manage/settings` | Page loads for admin, redirects viewer to `/admin/manage` |
| L4 | `/admin/manage/assignments` | Page loads (assignments hub) |
| L5 | `/admin/assignments` | Page loads (standalone assignments page) |
| L6 | `/admin/new` | Page loads (create form) |
| L7 | `/admin/forms/new` | Page loads (create form — alternate path) |
| L8 | `/admin/forms/builder` | Page loads (form builder) |
| L9 | `/admin/wizard` | Page loads (wizard list) |
| L10 | `/admin/wizard/new` | Page loads (new wizard) |
| L11 | `/f/nonexistent-form` | 404 — "Form not available" |
| L12 | `/portal` | Shows login if no session, dashboard if authenticated |
| L13 | `/platform` | Redirects non-platform-admins |
| L14 | `/api/forms/nonexistent/submit` | 404 |

---

## 9. Platform Admin

| # | Test Case | Expected |
|---|-----------|----------|
| PA1 | Platform admin sees all tenants | List with submission counts |
| PA2 | Non-platform-admin accesses `/platform` | Redirect to signin |
| PA3 | Impersonate tenant user | Session updated, 1-hour expiry |
| PA4 | Impersonation auto-expires after 1 hour | Original session restored |
| PA5 | Stop impersonation manually | Original session restored |
| PA6 | Impersonation logged in audit | Start/stop events recorded |

---

## 10. Webhook Security (Non-Regression)

| # | Test Case | Expected |
|---|-----------|----------|
| WH1 | Submission payload includes HMAC headers | `X-Form-Signature`, `X-Form-Signature-Alg`, `X-Form-Signature-Ts` |
| WH2 | Webhook response without HMAC headers | Logged as error, backup tried |
| WH3 | SSRF: webhook URL pointing to private IP | 500 — blocked |
| WH4 | SSRF: webhook URL pointing to metadata endpoint | 500 — blocked |
| WH5 | Webhook timeout (>10s) | Backup tried, 502 if both fail |

---

## Ownership

| Area | Owner | Priority |
|------|-------|----------|
| Navigation visibility (Section 1) | QA | High |
| API role enforcement (Section 2) | QA | **Critical** |
| Tenant isolation (Section 3) | QA | **Critical** |
| Send flow & payload (Section 4) | QA + Dev | **Critical** |
| Portal journeys (Section 5) | QA | High |
| Wizard WIP flow (Section 6) | QA + Dev | High |
| Settings (Section 7) | QA | Medium |
| Legacy bookmarks (Section 8) | QA | Medium |
| Platform admin (Section 9) | QA | Medium |
| Webhook security (Section 10) | Dev | High |

---

## Execution Notes

- **No local dev server** — test against Vercel preview/production deployment
- **Supabase** — database state can be inspected via Supabase dashboard for DB-level assertions (assignment status, submission events, audit logs)
- **Webhook payloads** — use [webhook.site](https://webhook.site) or n8n test webhook to capture and inspect payloads
- **Rate limit tests** — may need to clear Upstash Redis state between runs or use distinct IPs
- **CAPTCHA tests** — Turnstile bypass may be needed for automated testing (disable in staging via env var)
- **Magic link tests** — check email delivery via configured email provider or use test email addresses
