Stateless Forms → n8n SaaS (MVP)
=================================

This project provides a multi-tenant stateless form builder/runtime that relays submissions to tenant-configured n8n webhooks. It stores only metadata (no answers) and signs forwarded payloads using HMAC.

Quick start
-----------

1) Requirements

- Node.js LTS
- PostgreSQL database (Neon/Supabase/RDS/etc.)

2) Setup

```bash
cd web
cp env.example .env # On Windows: copy env.example .env

# Edit .env to set your DATABASE_URL

npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Open http://localhost:3000

What’s included (MVP)
---------------------

- App Router (Next.js), Tailwind, TypeScript
- Prisma models for Tenant, User, Form, FormVersion, Theme, SubmissionEvent
- Public APIs:
  - GET `/api/forms/:publicId`
  - POST `/api/forms/:publicId/submit` (forwards to n8n with HMAC; logs metadata only)
- Public runtime page: `/f/:publicId` (basic schema renderer for text/email/number/boolean/textarea)
- Middleware: HSTS (prod only) and CORS for public APIs
- Submission limits: payload size and field count

Security & Privacy (hard requirements)
--------------------------------------

- No answers stored in the DB or logs
- HMAC signature headers to n8n: `X-Form-Signature`, `X-Form-Signature-Alg`, `X-Form-Signature-Ts`
- Admin APIs are reserved for future authenticated endpoints

Development notes
-----------------

- Prisma client is generated to `src/generated/prisma`. Import via `@/generated/prisma`.
- Public API responses exclude any sensitive data.
- The relay reads the raw body to enforce size limits before parsing JSON.

Next steps
----------

- Admin CRUD for forms, versions, tenants
- Conditional logic, steps, repeatable sections in renderer
- Anti-bot (hCaptcha/Turnstile), rate limiting
- Usage dashboard based on `SubmissionEvent`

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
