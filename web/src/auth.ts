import type { NextAuthOptions } from "next-auth";
import type { User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";

// Simple in-memory rate limiter for login attempts
// In production with multiple instances, use Redis via @upstash/ratelimit
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 60_000; // 1 minute

function checkLoginRateLimit(email: string): { allowed: boolean; retryAfter?: number } {
	const now = Date.now();
	const key = email.toLowerCase().trim();
	const record = loginAttempts.get(key);

	if (!record || now > record.resetAt) {
		loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
		return { allowed: true };
	}

	if (record.count >= LOGIN_LIMIT) {
		return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
	}

	record.count++;
	return { allowed: true };
}

// Clean up old entries periodically
setInterval(() => {
	const now = Date.now();
	for (const [key, record] of loginAttempts.entries()) {
		if (now > record.resetAt) {
			loginAttempts.delete(key);
		}
	}
}, 60_000);

// Impersonation expiry: 1 hour
const IMPERSONATION_MAX_DURATION_MS = 60 * 60 * 1000;

export const authOptions: NextAuthOptions = {
	secret: process.env.NEXTAUTH_SECRET,
	session: { strategy: "jwt" },
	pages: {
		signIn: "/signin",
	},
	providers: [
		Credentials({
			name: "Credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials): Promise<User | null> {
				if (!credentials?.email || !credentials?.password) {
					return null;
				}

				// Rate limit by email to prevent brute force
				const rateCheck = checkLoginRateLimit(credentials.email);
				if (!rateCheck.allowed) {
					// Return null to indicate auth failure
					// NextAuth will show generic error
					console.warn(`[Auth] Rate limited login attempt for: ${credentials.email.substring(0, 3)}***`);
					return null;
				}

				const emailRaw = credentials.email;
				const email = emailRaw.trim().toLowerCase();

				const user = await prisma.user.findFirst({
					where: {
						OR: [{ email: emailRaw }, { email }],
					},
				});

				if (!user?.passwordHash) return null;

				const isValid = await compare(credentials.password, user.passwordHash);
				if (!isValid) return null;

				return {
					id: user.id,
					email: user.email,
					tenantId: user.tenantId,
					role: user.role as "owner" | "admin" | "viewer",
				};
			},
		}),
	],
	callbacks: {
		async jwt({ token, user, trigger, session: sessionData }) {
			if (user) {
				token.id = user.id;
				token.tenantId = user.tenantId;
				token.role = user.role;
			}

			// Check impersonation expiry
			if ((token as any).isImpersonating && (token as any).impersonationStartedAt) {
				const startedAt = (token as any).impersonationStartedAt as number;
				if (Date.now() - startedAt > IMPERSONATION_MAX_DURATION_MS) {
					// Auto-restore original admin session
					console.info(`[Auth] Impersonation expired, restoring original admin session`);
					if (token.originalAdminId) {
						token.id = token.originalAdminId as string;
						token.email = token.originalAdminEmail as string;
						token.tenantId = token.originalAdminTenantId as string;
						token.role = token.originalAdminRole as "owner" | "admin" | "viewer";
						// Clear impersonation fields
						delete (token as any).impersonatingFrom;
						delete (token as any).isImpersonating;
						delete (token as any).impersonationStartedAt;
						delete (token as any).originalAdminId;
						delete (token as any).originalAdminEmail;
						delete (token as any).originalAdminTenantId;
						delete (token as any).originalAdminRole;
					}
				}
			}

			// Handle impersonation update from client
			if (trigger === "update" && sessionData) {
				if (sessionData.impersonate) {
					const { userId, tenantId, role, email, impersonatingFrom, originalAdmin } = sessionData.impersonate as any;
					// Store original admin info for restoration
					if (originalAdmin) {
						(token as any).originalAdminId = originalAdmin.userId;
						(token as any).originalAdminEmail = originalAdmin.email;
						(token as any).originalAdminTenantId = originalAdmin.tenantId;
						(token as any).originalAdminRole = originalAdmin.role;
					}
					// Set impersonated user
					token.id = userId;
					token.tenantId = tenantId;
					token.role = role;
					token.email = email;
					(token as any).impersonatingFrom = impersonatingFrom;
					(token as any).isImpersonating = true;
					(token as any).impersonationStartedAt = Date.now(); // Track start time for expiry
				} else if (sessionData.impersonate === null) {
					// Restore original admin session
					if (token.originalAdminId) {
						token.id = token.originalAdminId as string;
						token.email = token.originalAdminEmail as string;
						token.tenantId = token.originalAdminTenantId as string;
						token.role = token.originalAdminRole as "owner" | "admin" | "viewer";
						// Clear impersonation fields
						delete (token as any).impersonatingFrom;
						delete (token as any).isImpersonating;
						delete (token as any).impersonationStartedAt;
						delete (token as any).originalAdminId;
						delete (token as any).originalAdminEmail;
						delete (token as any).originalAdminTenantId;
						delete (token as any).originalAdminRole;
					}
				}
			}

			return token;
		},
		async session({ session, token }) {
			session.user = {
				id: token.id as string,
				email: (token.email as string) ?? "",
				tenantId: token.tenantId as string,
				role: token.role as "owner" | "admin" | "viewer",
			};

			// Add impersonation info to session
			if ((token as any).isImpersonating && (token as any).impersonatingFrom) {
				const startedAt = (token as any).impersonationStartedAt as number;
				const expiresAt = startedAt + IMPERSONATION_MAX_DURATION_MS;
				(session as any).impersonating = {
					from: (token as any).impersonatingFrom,
					isImpersonating: true,
					expiresAt: new Date(expiresAt).toISOString(),
				};
			}

			return session;
		},
	},
};
