# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant SaaS stateless form builder/runtime. Forms relay submissions to tenant-configured n8n webhooks with HMAC-SHA256 signatures — **no form answers are stored**, only submission metadata. Supports both JSON-schema forms and uploaded HTML template forms.

## Commands

All commands run from the `web/` directory:

```bash
npm run dev          # Start dev server (Next.js + Turbopack)
npm run build        # Generate Prisma client + Next.js build
npm run lint         # ESLint
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single run (CI)
```

Run a single test file:
```bash
npx vitest run src/lib/__tests__/hmac.test.ts
```

Database commands:
```bash
npx prisma generate                    # Regenerate Prisma client after schema changes
npx prisma migrate dev --name <name>   # Create and apply a migration
```

## Architecture

**Stack:** Next.js 16 (App Router) / TypeScript / Tailwind CSS 4 / Prisma (PostgreSQL) / NextAuth / Stripe / Vitest

### Key directories (under `web/src/`)

- `app/admin/` — Authenticated tenant dashboard (forms, assignments, billing, wizard, team, settings)
- `app/api/admin/` — Protected admin API routes (session-authenticated, same-origin only)
- `app/api/forms/[publicId]/` — Public form API (CORS `*`): GET fetches form, POST relays submission to n8n webhook
- `app/api/portal/` — End-customer portal API (magic link / JWT auth)
- `app/f/[publicId]/` — Public form rendering page (JSON-schema or HTML template)
- `app/portal/` — End-customer portal UI (view and complete assigned forms)
- `components/` — React components (`FormRenderer`, `HtmlTemplateEditor`, `SignaturePad`, etc.)
- `lib/` — ~30 utility modules (auth, HMAC, rate limiting, billing, email, webhook routing, etc.)
- `types/` — TypeScript type definitions (form schema, theme, NextAuth extensions)

### Data flow

1. Admin creates a form (JSON schema or HTML template with `[Token]` placeholders)
2. End user loads `/f/[publicId]` — optionally prefilled via webhook or query params
3. Submission POST hits `/api/forms/[publicId]` → payload signed with HMAC-SHA256 → forwarded to tenant's n8n webhook
4. Only metadata (`SubmissionEvent`) is stored; answers are never persisted

### Multi-tenancy & auth

- **Admin users**: NextAuth credentials provider (email/password), JWT sessions. Roles: `owner | admin | viewer`.
- **Portal customers**: Magic link authentication with JWT tokens.
- **Forms**: Public access with optional Cloudflare Turnstile CAPTCHA, IP allowlisting, and form access tokens.

### Wizard workflow (`app/admin/wizard/`)

4-stage form assignment process: WIP lookup (via n8n) → Template selection → Prefill mapping & preview → User assignment. Tracked in `WizardRun` model.

### HTML template system

Upload HTML → system extracts `[Token Name]` or `<span class="fe-token">` placeholders → admin maps each token to Prefill (read-only), Manual Input, or Signature mode → rendered dynamically at form load.

### Security middleware (`middleware.ts`)

Applies HSTS, CSP, X-Frame-Options (ALLOWALL for embeds, SAMEORIGIN otherwise), CORS policies per route type, and rate limiting via Upstash Redis.

## Database

Schema at `web/prisma/schema.prisma`. Key models: `Tenant`, `User`, `Form`, `FormVersion`, `HtmlTemplate`, `TemplateMapping`, `FormAssignment`, `WizardRun`, `EndCustomer`, `SubmissionEvent`, `AuditLog`.

## Style Guide

Dark-themed design using Tailwind. Primary: Indigo 500 (`#6366f1`) / Purple 500 (`#8b5cf6`). Backgrounds: Slate 900/800/700. See `web/STYLE_GUIDE.md` for full palette and gradient specs.

## Path alias

`@/*` maps to `web/src/*` (configured in tsconfig and vitest).
