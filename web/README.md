# Stateless Forms → n8n SaaS

This project provides a multi-tenant stateless form builder/runtime that relays submissions to tenant-configured n8n webhooks. It stores only metadata (no answers) and signs forwarded payloads using HMAC.

## 🌟 Key Features

### 📄 HTML Template Forms
Upload existing HTML documents (contracts, intake forms) and turn them into dynamic forms.
- **Token Support**: Use `[Token Name]` or `<span class="fe-token">` placeholders in your HTML.
- **Smart Mapping**: Map tokens to **Prefill** (read-only text), **Manual Input** (user entry), or **Signature** (interactive pad).
- **No-Code Builder**: Admin interface to upload HTML, preview parsing, and configure token modes visually.

### ✍️ Signature Integration
Native support for capturing signatures on documents.
- **Interactive Pad**: Smooth, canvas-based signature drawing.
- **Validation**: Ensures signatures are captured before submission.
- **Optimized Rendering**: Uses vanilla DOM injection for maximum performance and compatibility.
- **Mobile Friendly**: Touch-enabled signature canvas.

### 🔌 Webhook Prefill
Dynamically populate forms with data from external systems.
- **Prefill Webhook**: Configure a webhook URL to fetch data when the form loads.
- **Field Mapping**: Map JSON response fields to form tokens.
  - Example: Map `data.client_name` → `[Client Name]`.
- **Secure**: Server-side fetching with SSRF protection.
- **Fallback**: Supports URL query parameters for simple prefill needs.

### 🛡️ Security & Reliability
- **Stateless Architecture**: Zero data persistence for sensitive form answers.
- **HMAC Signatures**: Verifiable payloads using `X-Form-Signature` headers.
- **Anti-Abuse**: Integrated Rate Limiting and Cloudflare Turnstile support.
- **Middleware**: HSTS (prod) and CORS protection.
- **Submission Limits**: Enforced payload size and field count limits.

### 🔐 Webhook Signature Verification

Submissions are forwarded to your n8n webhook with HMAC signatures for authenticity verification.

#### Headers Sent
| Header | Description |
|--------|-------------|
| `X-Form-Signature` | HMAC-SHA256 hex digest |
| `X-Form-Signature-Alg` | Always `sha256` |
| `X-Form-Signature-Ts` | **ISO 8601** timestamp (e.g., `2026-02-03T12:00:00.000Z`) |

#### Verification Steps
1. Extract the `X-Form-Signature-Ts` header (ISO 8601 string).
2. **Replay Protection**: Reject if timestamp is older than 5 minutes.
3. Compute: `HMAC-SHA256(timestamp + '.' + request_body, sharedSecret)`.
4. Compare the result to `X-Form-Signature`.

#### Example (Node.js)
```javascript
const crypto = require('crypto');

function verifySignature(body, headers, sharedSecret) {
  const timestamp = headers['x-form-signature-ts'];
  const signature = headers['x-form-signature'];
  
  // Replay protection (5 minute window)
  const ts = new Date(timestamp).getTime();
  if (Date.now() - ts > 5 * 60 * 1000) {
    return { valid: false, error: 'Timestamp too old' };
  }
  
  // Verify signature
  const expected = crypto
    .createHmac('sha256', sharedSecret)
    .update(timestamp + '.' + body, 'utf8')
    .digest('hex');
  
  const valid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
  
  return { valid };
}
```

## 🚀 Quick Start

### 1. Requirements
- Node.js LTS
- PostgreSQL database (Neon/Supabase/RDS/etc.)

### 2. Setup

```bash
cd web
cp env.example .env # On Windows: copy env.example .env

npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Open http://localhost:3000

## 📚 Documentation

### Public Runtime (`/f/:publicId`)
- Renders **JSON-schema** based forms OR **HTML Template** forms.
- Auto-detects `[Token]` placeholders in HTML content.
- Handles form validation and submission forwarding.
- **Signature Handling**: Dynamically injects signature pads for mapped tokens of type `signature`.

### Admin API
- `GET /api/forms/:publicId`: Fetch form metadata and HTML content.
- `POST /api/forms/:publicId/submit`: Forward submission to n8n.
  - **Dynamic Validation**: Skips rigid schema validation for HTML template forms to support dynamic token fields (like `[Signature]`).

### Token Modes
When using the Form Builder (`/admin/forms/builder`), you can set tokens to:
1. **Prefill**: Shows value from URL params or Prefill Webhook.
2. **Manual**: Renders an input field `required`.
3. **Signature**: Renders the interactive signature pad.

## 🛠️ Development Details

- **Stack**: Next.js 16 (Turbopack), Tailwind CSS, Prisma, TypeScript.
- **Database**: PostgreSQL.
- **Deployment**: Vercel-ready.

### Recent Updates
- **Signature Fix**: Replaced React Portals with direct DOM rendering to resolve mounting issues.
- **Token Parser**: Added support for generic `[Bracket]` tokens in HTML templates (`html-template-parser.ts`).
- **Validation**: Updated submission handler to support dynamic token fields without schema errors.
- **Settings UI**: Added "Prefill Webhook" configuration to Form Settings.

---
This is a [Next.js](https://nextjs.org) project.
