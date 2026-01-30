/**
 * Portal authentication utilities for end-customer magic link auth.
 * Separate from admin user auth (NextAuth credentials).
 * 
 * This module re-exports from focused sub-modules for backward compatibility.
 * For new code, prefer importing directly from:
 * - @/lib/portal-jwt for JWT session management
 * - @/lib/magic-link for magic link token handling
 */

// Re-export JWT utilities
export {
    type PortalSession,
    createPortalSession,
    verifyPortalSession,
    PORTAL_SESSION_COOKIE,
    getPortalSessionFromCookies,
} from './portal-jwt';

// Re-export magic link utilities
export {
    generateMagicLinkToken,
    createAndSendMagicLink,
    validateMagicLinkToken,
} from './magic-link';
