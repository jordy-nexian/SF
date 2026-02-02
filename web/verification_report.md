# Verification Report: Stateless Forms

## A. System Map

### Components
1.  **Next.js Portal (This Repo)**:
    - **Roles**: Admin Dashboard, Customer Portal, Form Renderer, Submission Handler.
    - **State**: Ephemeral (Redis for rate limits, Postgres for configuration/assignments only). **No submission payloads stored.**
2.  **Postgres Database**:
    - Stores: Tenants, Users (Admins), EndCustomers, Forms (Schema/HTML), Assignments, MagicLinkTokens, SubmissionEvents (Metadata only).
3.  **Redis (Upstash)**:
    - Usage: Rate limiting (Login, Submission), temporary session data.
4.  **n8n (External Automation)**:
    - Role: Receiver of form submissions. Business Logic Engine.
    - Flows:
        - `Portal -> n8n -> Quickbase` (Data writes).
        - `Portal -> n8n -> SharePoint` (File streaming).
        - `n8n -> Portal` (Create Assignments, Trigger Emails - *Assumed*).
5.  **Quickbase (External DB)**:
    - Role: System of Record for Deal/Fund data.
6.  **SharePoint (External Storage)**:
    - Role: Document storage.

### Data Flows
1.  **Auth**: User Request -> `MagicLinkToken` (DB) -> Email. User Click -> Verify Token -> Session (JWT).
2.  **Render**: `GET /f/[id]` -> Fetch Form Schema/HTML -> Fetch Prefill (Webhook) -> Render.
3.  **Submission**:
    - `POST /api/submit` -> Validate Schema + HMAC Sign -> **Push to n8n Webhook**.
    - **On Success**: Log Metadata (DB) -> Mark Assignment Complete (DB).
    - **On Fail**: Try Backup Webhook -> Return Error to User (No local retry queue).

### Trust Boundaries
- **Portal <-> Client**: HTTPS, NextAuth Session / Magic Link, Turnstile CAPTCHA.
- **Portal <-> n8n**: HMAC Signature (Shared Secret), HTTPS.
- **Portal <-> DB**: Prisma Connect (Secure Env).

---

## B. Requirements Traceability Matrix

| ID | Requirement | Status | Evidence | Notes/Gaps |
|----|-------------|--------|----------|------------|
| R1 | Portfolio-company portal dashboard | **MET** | `src/app/portal/dashboard/page.tsx`<br>Lists forms by status (Pending, In Progress, Completed). | |
| R2 | Magic link authentication | **MET** | `src/lib/magic-link.ts` (15 min expiry).<br>`src/app/portal/page.tsx` (Request flow).<br>`src/app/portal/auth/verify` (Verification). | |
| R3 | Stateless design (No DB persistence) | **MET** | `schema.prisma`: `SubmissionEvent` has no payload fields.<br>`src/app/api/.../submit/route.ts`: Payload sent to webhook, not DB. | Validated "No submission answers stored". |
| R4 | Secure submission + anti-tamper | **MET** | `src/lib/hmac.ts`<br>`api/.../submit/route.ts`: Signs payload with `tenant.sharedSecret`. | Relies on n8n verifying the signature. |
| R5 | Prefill support | **MET** | `src/app/f/[publicId]/page.tsx`: Handles `?data=` param and `/api/prefill` endpoint.<br>Mapped to `prefillData`. | |
| R6 | Signature capture | **MET** | `src/app/f/[publicId]/page.tsx`: Uses `signature_pad`.<br>Captures as base64 JPEG in `answers`. | |
| R7 | Quickbase write-back | **MET** | `api/.../submit/route.ts`: Sends full payload + meta to n8n.<br>`transformPayload` supports custom mapping. | Actual write-back logic lives in n8n (External). |
| R8 | SharePoint output | **MET** | `api/.../submit/route.ts`: Streams full payload. Payload limit 256KB enforced. | Naming conventions must be implemented in n8n. |
| R9 | Fund admin operating model | **MET** | `src/app/admin/customers/page.tsx`: Lists customers and their assigned forms.<br>Allows managing other customers. | |
| R10 | Multiple forms via one comms | **MET** | Dashboard (R1) aggregates all assignments.<br>Single Magic Link accesses the dashboard. | |
| R11 | Branding/theming | **MET** | `src/app/portal/layout.tsx`: Applies `branding.portalPrimaryColor`, Logo, Title from API. | |
| R12 | Multi-approver workflow | **PARTIAL** | `FormAssignment` supports status.<br>Repo supports individual steps.<br>**Gap**: Orchestration logic (triggering next approver) is absent in repo. | **Proposed Solution**: n8n handles the "Next Step" logic by creating a *new* Assignment for the next user upon receipt of first submission. |
| R13 | Generated Word docs (No regress) | **MET/SAFE** | No code found touching document generation.<br>Repo is decoupled from this workflow. | |

---

## C. Top Risks

### Security Risks (Ranked)
1.  **HMAC Secret Rotation**: `tenant.sharedSecret` is stored in DB. No UI found to rotate/regenerate it if leaked.
    - *Mitigation*: Add "Regenerate Secret" button in Admin > Settings.
2.  **No "Dead Letter Queue"**: If n8n is down (and backup fails), the submission is lost (User sees error, data not saved). "Stateless" means no local buffer.
    - *Mitigation*: Accept the risk (User must retry) OR implement a very short-lived Redis buffer for retries (violates strict statelessness but improves UX).
3.  **Magic Link Phishing**: Standard risk. 15-min expiry is good.
    - *Mitigation*: Ensure `NEXTAUTH_URL` is strict.

### Delivery Risks
1.  **n8n Implementation Complexity**: The Portal is "dumb". All smarts (approvals, file naming, Quickbase mapping) are in n8n. If n8n flows are not ready, the system does not work.
2.  **E2E Testing Difficulty**: Testing the full "Submit -> Quickbase -> Next Approver" flow requires a live n8n instance or complex mocking.

---

## D. Test Plan

### Existing Tests
- `src/lib/__tests__`: Good unit coverage for Auth, HMAC, Validation.
- `vitest` is set up.

### Recommended New Tests
1.  **E2E Submission Flow (Critical)**:
    - **Tool**: Playwright or keep Vitest with Mocks.
    - **Scenario**:
        1. User clicks Magic Link (Simulated).
        2. Dashboard loads.
        3. User opens Form.
        4. User fills fields + Signature.
        5. Submit.
        6. **Verify**: Endpoint receives POST with valid HMAC. Response is 200. DB has `SubmissionEvent` (metadata only). Assignment marked `completed`.
2.  **Security Regression**:
    - **Scenario**: Attempt submission with *invalid* HMAC or *without* Tenant Token (if required). Verify 403.
    - **Scenario**: Attempt access to `/f/[id]` without session. Verify redirect/login prompt.
3.  **n8n Integration Contract**:
    - Create a test script that validates the *JSON Payload Structure* matches exactly what n8n expects (including `meta`, `answers`, `prefillData`).

### Wave 1 "MVP" Patch Plan (For R12 Multi-approver)
Since R12 is PARTIAL:
- **No Code Changes Needed in Portal**: The current `FormAssignment` model is sufficient.
- **Action**: Build n8n workflow to:
    1. Receive Webhook (Inv Lead).
    2. Write to Quickbase.
    3. Use Quickbase/n8n logic to "Select Next Approver".
    4. Call Portal API (or DB Write) to **Create new Assignment** for VCT User.
    5. Send Email to VCT User.
- **Verification**: Test this loop manually once n8n is connected.
