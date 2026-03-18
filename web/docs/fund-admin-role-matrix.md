# Fund Admin Role Matrix

## Current State

### Existing Roles
The Prisma `Role` enum defines three values in [`schema.prisma`](file:///c:/FunctionApp/Formio/web/prisma/schema.prisma):

```
enum Role {
  owner    // First user created on signup — cannot be deleted or demoted
  admin    // Can manage templates, team, settings
  viewer   // Can view and submit — restricted from write operations
}
```

`User.role` defaults to `viewer`. New invited users are assigned `admin` or `viewer` via the Team invite UI.

### How Roles Are Checked Today

| Location | Check | Effect |
|---|---|---|
| [`settings/route.ts`](file:///c:/FunctionApp/Formio/web/src/app/api/admin/settings/route.ts) PUT | `session.role === "viewer"` → 403 | Viewers cannot update settings |
| [`tenant/route.ts`](file:///c:/FunctionApp/Formio/web/src/app/api/admin/tenant/route.ts) PUT/PATCH | `session.role === "viewer"` → 403 | Viewers cannot update tenant |
| [`tenant/regenerate-secret/route.ts`](file:///c:/FunctionApp/Formio/web/src/app/api/admin/tenant/regenerate-secret/route.ts) | `session.role === "viewer"` → 403 | Viewers cannot regenerate secret |
| [`audit/route.ts`](file:///c:/FunctionApp/Formio/web/src/app/api/admin/audit/route.ts) | `session.role === "viewer"` → 403 | Viewers cannot view audit logs |
| [`team/route.ts`](file:///c:/FunctionApp/Formio/web/src/app/api/admin/team/route.ts) POST | `["owner","admin"].includes(role)` | Only owners/admins can invite |
| [`team/[id]/route.ts`](file:///c:/FunctionApp/Formio/web/src/app/api/admin/team/%5Bid%5D/route.ts) DELETE | `["owner","admin"].includes(role)` + owner protected | Only owners/admins can remove; owner cannot be removed |
| **Frontend** | None | No route guards exist — all pages visible to all roles |

### Where Roles Are Defined

| File | What |
|---|---|
| [`schema.prisma`](file:///c:/FunctionApp/Formio/web/prisma/schema.prisma) L37-41 | `Role` enum |
| [`next-auth.d.ts`](file:///c:/FunctionApp/Formio/web/src/types/next-auth.d.ts) | TypeScript type augmentation: `role: "owner" \| "admin" \| "viewer"` |
| [`auth-helpers.ts`](file:///c:/FunctionApp/Formio/web/src/lib/auth-helpers.ts) | `TenantSession.role` type |
| [`auth.ts`](file:///c:/FunctionApp/Formio/web/src/auth.ts) | JWT/session callbacks propagate role |

---

## Proposed Two-Tier Model: Administrator vs User

### Mapping to Existing Roles

The existing `Role` enum already supports this mapping without schema changes:

| Two-Tier Level | Prisma Role(s) | Description |
|---|---|---|
| **Administrator** | `owner`, `admin` | Full operational access |
| **User** | `viewer` | Restricted to read/operational actions |

> [!IMPORTANT]
> No Prisma migration is needed. The distinction between `owner` and `admin` is preserved internally (owner cannot be deleted/demoted), but both map to "Administrator" in the UI.

### Permission Matrix

| Capability | Administrator | User |
|---|---|---|
| **Templates** — View list | FULL ACCESS | FULL ACCESS |
| **Templates** — Create / Edit / Delete | FULL ACCESS | FULL ACCESS |
| **Templates** — Builder / Upload HTML | FULL ACCESS | FULL ACCESS |
| **Assignments** — View all | FULL ACCESS | FULL ACCESS |
| **Assignments** — Create / Manage | FULL ACCESS | FULL ACCESS |
| **Wizard** — Run new wizard | FULL ACCESS | FULL ACCESS |
| **Customers** — View | FULL ACCESS | FULL ACCESS |
| **Customers** — Manage | FULL ACCESS | FULL ACCESS |
| **Usage** — View dashboard | FULL ACCESS | FULL ACCESS |
| **Team** — View members | FULL ACCESS | FULL ACCESS |
| **Team** — Invite / Remove | FULL ACCESS | NO ACCESS |
| **Themes** — View | FULL ACCESS | FULL ACCESS |
| **Themes** — Create / Edit / Delete | FULL ACCESS | FULL ACCESS |
| **Settings** — View & Edit | FULL ACCESS | **NO ACCESS** |
| **Admin section** — View landing | FULL ACCESS | FULL ACCESS (minus Settings link) |
| **Billing** — View & Manage | Platform admin only | Platform admin only |

> [!NOTE]
> All open questions resolved by stakeholder on 2026-03-18. Only Settings and Team invite/remove are restricted for Users.


---

## Implementation Notes

### Helper function for role checks
A helper function should be created in [`auth-helpers.ts`](file:///c:/FunctionApp/Formio/web/src/lib/auth-helpers.ts):

```typescript
export function isAdministrator(role: TenantSession["role"]): boolean {
  return role === "owner" || role === "admin";
}
```

### Frontend route guarding
The admin layout ([`layout.tsx`](file:///c:/FunctionApp/Formio/web/src/app/admin/layout.tsx)) is a server component with access to the session. It can conditionally render nav items and pass role info to children.

For page-level guards (e.g., Settings), a server-side redirect in a layout or page wrapper is the simplest approach — no new library needed.

### Backend API hardening
Each API route that should be admin-only needs an `isAdministrator()` check using the pattern already in use:

```typescript
if (!isAdministrator(session.role)) {
  return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
}
```

### Files that need changes (E2.2–E2.5)

| Task | Files |
|---|---|
| E2.2 | `layout.tsx`, new `admin/manage/page.tsx` |
| E2.3 | `admin/manage/page.tsx`, `admin/settings/page.tsx` (or wrapper), `api/admin/settings/route.ts`, `api/admin/tenant/route.ts` |
| E2.4 | `admin/manage/page.tsx` (conditional link), assignments API routes |
| E2.5 | `admin/team/page.tsx` (role selector UI), `api/admin/team/route.ts` |
